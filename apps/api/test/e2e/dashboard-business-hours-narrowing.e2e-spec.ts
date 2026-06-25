/**
 * E2E tests for the business-hours narrowing flow:
 *  - POST /dashboard/businesses/:businessId/working-hours/preview
 *  - PUT  /dashboard/businesses/:businessId/working-hours (atomic clamping)
 *
 * Covers:
 *  - Preview generation with provider clamps + appointment count
 *  - No mutation before confirmation (preview is read-only)
 *  - Confirmed atomic business/provider update
 *  - Business day closure cascades to provider (CLOSED reason)
 *  - Business hours narrowing clamps provider times (CLAMPED reason)
 *  - Preserves unaffected provider hours exactly
 *  - Existing future appointments remain unchanged and visible after PUT
 *  - RBAC guards (member 403, outsider 403, missing auth 401)
 */

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClerkAuthGuard } from '../../src/auth/guards/clerk-auth.guard';
import { DashboardModule } from '../../src/dashboard/dashboard.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { User } from '../../src/generated/prisma/client';
import {
  AppointmentStatus,
  BusinessUserRole,
  BusinessUserStatus,
} from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable deterministic IDs ────────────────────────────────────────────────

const BIZ_ID = 'e2e50000-0000-4000-8000-000000000001';
const OWNER_ID = 'e2e50000-0000-4000-8000-000000000002';
const MGR_ID = 'e2e50000-0000-4000-8000-000000000003';
const MBR_ID = 'e2e50000-0000-4000-8000-000000000004';
const OUT_ID = 'e2e50000-0000-4000-8000-000000000005';

// Two service providers, each with their own BusinessUser
const SP_A_USER_ID = 'e2e50000-0000-4000-8000-000000000010';
const SP_A_BU_ID = 'e2e50000-0000-4000-8000-000000000011';
const SP_A_ID = 'e2e50000-0000-4000-8000-000000000012';

const SP_B_USER_ID = 'e2e50000-0000-4000-8000-000000000020';
const SP_B_BU_ID = 'e2e50000-0000-4000-8000-000000000021';
const SP_B_ID = 'e2e50000-0000-4000-8000-000000000022';

// Service + customer + appointment
const SVC_ID = 'e2e50000-0000-4000-8000-000000000030';
const CP_ID = 'e2e50000-0000-4000-8000-000000000031';
const BC_ID = 'e2e50000-0000-4000-8000-000000000032';
const APT_ID = 'e2e50000-0000-4000-8000-000000000040';

// 2030-07-01 = Monday (dayOfWeek=1) in Asia/Jerusalem (UTC+3 summer)
// Appointment: Mon 18:00-19:00 Jerusalem = Mon 15:00-16:00 UTC
// This falls OUTSIDE new business hours of Mon 09:00-17:00
const APT_STARTS_AT = '2030-07-01T15:00:00.000Z'; // Mon 18:00 Jerusalem
const APT_ENDS_AT = '2030-07-01T16:00:00.000Z'; // Mon 19:00 Jerusalem

type WH = {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
};

// ─── Module-level setup ───────────────────────────────────────────────────────

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
let memberUser: User;
let outsiderUser: User;

async function cleanAll() {
  await prisma.appointment.deleteMany({ where: { businessId: BIZ_ID } });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: BIZ_ID },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: BIZ_ID },
  });
  await prisma.serviceProviderService.deleteMany({
    where: { serviceProviderId: { in: [SP_A_ID, SP_B_ID] } },
  });
  await prisma.businessCustomer.deleteMany({ where: { businessId: BIZ_ID } });
  await prisma.service.deleteMany({ where: { businessId: BIZ_ID } });
  await prisma.customerProfile.deleteMany({ where: { id: CP_ID } });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [SP_A_ID, SP_B_ID] } },
  });
  await prisma.businessUser.deleteMany({ where: { businessId: BIZ_ID } });
  await prisma.business.deleteMany({ where: { id: BIZ_ID } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [OWNER_ID, MGR_ID, MBR_ID, OUT_ID, SP_A_USER_ID, SP_B_USER_ID],
      },
    },
  });
}

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
      PrismaModule,
      DashboardModule,
    ],
  })
    .overrideGuard(ClerkAuthGuard)
    .useClass(MockClerkAuthGuard)
    .compile();

  app = await createTestApp(module);
  prisma = module.get(PrismaService);

  await cleanAll();

  // Business
  await prisma.business.create({
    data: {
      id: BIZ_ID,
      name: 'Narrowing Test Business',
      slug: 'narrowing-test-biz',
      status: 'ACTIVE',
      timezone: 'Asia/Jerusalem',
    },
  });

  // Users
  ownerUser = await prisma.user.create({
    data: {
      id: OWNER_ID,
      phoneNormalized: '+19990005001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      id: 'e2e50000-0000-4000-8000-000000000060',
      businessId: BIZ_ID,
      userId: OWNER_ID,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  const mgrUser = await prisma.user.create({
    data: {
      id: MGR_ID,
      phoneNormalized: '+19990005002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      id: 'e2e50000-0000-4000-8000-000000000061',
      businessId: BIZ_ID,
      userId: mgrUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: MBR_ID,
      phoneNormalized: '+19990005003',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      id: 'e2e50000-0000-4000-8000-000000000062',
      businessId: BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: OUT_ID,
      phoneNormalized: '+19990005004',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // Provider A (linked to OWNER)
  const spABU = await prisma.businessUser.findFirst({
    where: { businessId: BIZ_ID, userId: OWNER_ID },
  });
  const spAUser = await prisma.user.create({
    data: {
      id: SP_A_USER_ID,
      phoneNormalized: '+19990005010',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const spABuRow = await prisma.businessUser.create({
    data: {
      id: SP_A_BU_ID,
      businessId: BIZ_ID,
      userId: spAUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: SP_A_ID,
      businessId: BIZ_ID,
      businessUserId: spABuRow.id,
      displayName: 'Provider A',
      isActive: true,
    },
  });
  void spABU; // suppress unused warning

  // Provider B
  const spBUser = await prisma.user.create({
    data: {
      id: SP_B_USER_ID,
      phoneNormalized: '+19990005020',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const spBBuRow = await prisma.businessUser.create({
    data: {
      id: SP_B_BU_ID,
      businessId: BIZ_ID,
      userId: spBUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: SP_B_ID,
      businessId: BIZ_ID,
      businessUserId: spBBuRow.id,
      displayName: 'Provider B',
      isActive: true,
    },
  });

  // Service + customer + appointment (Mon 18:00-19:00 Jerusalem)
  await prisma.service.create({
    data: {
      id: SVC_ID,
      businessId: BIZ_ID,
      name: 'Test Service',
      durationMinutes: 60,
      isActive: true,
    },
  });
  await prisma.customerProfile.create({
    data: {
      id: CP_ID,
      fullName: 'Test Customer',
      phoneNormalized: '+19990005099',
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: BC_ID,
      businessId: BIZ_ID,
      customerProfileId: CP_ID,
      status: 'ACTIVE',
    },
  });
  await prisma.appointment.create({
    data: {
      id: APT_ID,
      businessId: BIZ_ID,
      businessCustomerId: BC_ID,
      serviceId: SVC_ID,
      serviceProviderId: SP_A_ID,
      startsAt: new Date(APT_STARTS_AT),
      endsAt: new Date(APT_ENDS_AT),
      status: AppointmentStatus.SCHEDULED,
    },
  });
});

afterAll(async () => {
  await cleanAll();
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── Helper paths ─────────────────────────────────────────────────────────────

const BIZ_WH_URL = `/dashboard/businesses/${BIZ_ID}/working-hours`;
const PREVIEW_URL = `/dashboard/businesses/${BIZ_ID}/working-hours/preview`;
const SP_A_WH_URL = `/dashboard/businesses/${BIZ_ID}/service-providers/${SP_A_ID}/working-hours`;
const SP_B_WH_URL = `/dashboard/businesses/${BIZ_ID}/service-providers/${SP_B_ID}/working-hours`;

// Seed helper: set business hours + both providers' hours so each test starts fresh
async function seedHours() {
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: BIZ_ID },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: BIZ_ID },
  });
  // Business: Mon–Fri 09:00–21:00
  await prisma.businessWorkingHour.createMany({
    data: [1, 2, 3, 4, 5].map((d) => ({
      businessId: BIZ_ID,
      dayOfWeek: d,
      isClosed: false,
      startTime: '09:00',
      endTime: '21:00',
    })),
  });
  // Provider A: Mon 09:00–21:00, Tue 09:00–17:00
  await prisma.serviceProviderWorkingHour.createMany({
    data: [
      {
        businessId: BIZ_ID,
        serviceProviderId: SP_A_ID,
        dayOfWeek: 1,
        isClosed: false,
        startTime: '09:00',
        endTime: '21:00',
      },
      {
        businessId: BIZ_ID,
        serviceProviderId: SP_A_ID,
        dayOfWeek: 2,
        isClosed: false,
        startTime: '09:00',
        endTime: '17:00',
      },
    ],
  });
  // Provider B: Mon 12:00–21:00, Tue 10:00–18:00
  await prisma.serviceProviderWorkingHour.createMany({
    data: [
      {
        businessId: BIZ_ID,
        serviceProviderId: SP_B_ID,
        dayOfWeek: 1,
        isClosed: false,
        startTime: '12:00',
        endTime: '21:00',
      },
      {
        businessId: BIZ_ID,
        serviceProviderId: SP_B_ID,
        dayOfWeek: 2,
        isClosed: false,
        startTime: '10:00',
        endTime: '18:00',
      },
    ],
  });
}

// ─── POST /working-hours/preview ─────────────────────────────────────────────

describe('POST /dashboard/businesses/:businessId/working-hours/preview', () => {
  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null;
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(401);
  });

  it('returns empty affectedProviders when no providers exist', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: BIZ_ID },
    });
    const res = await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(200);
    const body = res.body as { affectedProviders: unknown[] };
    expect(body.affectedProviders).toEqual([]);
  });

  it('returns preview with affected providers when business hours are narrowed', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await seedHours();

    // Narrow Monday to 09:00–17:00 (was 09:00–21:00)
    const res = await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as {
      affectedProviders: Array<{
        id: string;
        displayName: string;
        changes: Array<{ dayOfWeek: number; reason: string }>;
      }>;
      futureAppointmentsOutsideNewHoursCount: number;
    };

    // Provider A and B are both affected (both open until 21:00 on Mon)
    expect(body.affectedProviders.length).toBe(2);
    const spA = body.affectedProviders.find((p) => p.id === SP_A_ID);
    expect(spA).toBeDefined();
    expect(spA!.changes[0].dayOfWeek).toBe(1);
    expect(spA!.changes[0].reason).toBe('CLAMPED');
  });

  it('CLOSED reason when business day becomes closed', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await seedHours();

    // Close Monday entirely
    const res = await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({
        hours: [
          { dayOfWeek: 1, isClosed: true },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as {
      affectedProviders: Array<{
        id: string;
        changes: Array<{
          dayOfWeek: number;
          reason: string;
          after: { isClosed: boolean };
        }>;
      }>;
    };
    const spA = body.affectedProviders.find((p) => p.id === SP_A_ID);
    expect(spA).toBeDefined();
    const monChange = spA!.changes.find((c) => c.dayOfWeek === 1);
    expect(monChange!.reason).toBe('CLOSED');
    expect(monChange!.after.isClosed).toBe(true);
  });

  it('counts future SCHEDULED appointments outside new hours', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await seedHours();

    // Narrow Monday to 09:00–17:00; appointment is Mon 18:00–19:00 → outside
    const res = await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as { futureAppointmentsOutsideNewHoursCount: number };
    expect(body.futureAppointmentsOutsideNewHoursCount).toBe(1);
  });

  it('does not mutate business hours (preview is read-only)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await seedHours();

    // Call preview with hours that would close Monday
    await request(app.getHttpServer())
      .post(PREVIEW_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(200);

    // Business hours must remain unchanged
    const getRes = await request(app.getHttpServer())
      .get(BIZ_WH_URL)
      .expect(200);
    const hours = getRes.body as WH[];
    const monday = hours.find((h) => h.dayOfWeek === 1);
    expect(monday?.isClosed).toBe(false);
    expect(monday?.startTime).toBe('09:00');
    expect(monday?.endTime).toBe('21:00');
  });
});

// ─── PUT /working-hours — atomic provider clamping ────────────────────────────

describe('PUT /working-hours — atomic provider clamping and appointment non-blocking', () => {
  beforeEach(async () => {
    MockClerkAuthGuard.currentUser = null;
    await seedHours();
  });

  it('atomically clamps provider hours when business hours are narrowed', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Narrow Monday to 09:00–17:00; providers A and B open until 21:00 → get clamped
    await request(app.getHttpServer())
      .put(BIZ_WH_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    // Provider A Monday should be clamped to 09:00–17:00
    const resA = await request(app.getHttpServer())
      .get(SP_A_WH_URL)
      .expect(200);
    const aHours = resA.body as WH[];
    const aMon = aHours.find((h) => h.dayOfWeek === 1);
    expect(aMon?.endTime).toBe('17:00');

    // Provider B Monday should be clamped to 12:00–17:00 (start preserved, end clamped)
    const resB = await request(app.getHttpServer())
      .get(SP_B_WH_URL)
      .expect(200);
    const bHours = resB.body as WH[];
    const bMon = bHours.find((h) => h.dayOfWeek === 1);
    expect(bMon?.startTime).toBe('12:00');
    expect(bMon?.endTime).toBe('17:00');
  });

  it('closing a business day sets provider hours to closed on that day', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Close Monday; both providers open on Monday → both should become closed
    await request(app.getHttpServer())
      .put(BIZ_WH_URL)
      .send({
        hours: [
          { dayOfWeek: 1, isClosed: true },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    const resA = await request(app.getHttpServer())
      .get(SP_A_WH_URL)
      .expect(200);
    const aMon = (resA.body as WH[]).find((h) => h.dayOfWeek === 1);
    expect(aMon?.isClosed).toBe(true);

    const resB = await request(app.getHttpServer())
      .get(SP_B_WH_URL)
      .expect(200);
    const bMon = (resB.body as WH[]).find((h) => h.dayOfWeek === 1);
    expect(bMon?.isClosed).toBe(true);
  });

  it('preserves unaffected provider hours exactly', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Narrow Monday; Tuesday business hours unchanged (09:00–21:00)
    await request(app.getHttpServer())
      .put(BIZ_WH_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    // Provider A Tuesday: was 09:00–17:00, business still open 09:00–21:00 → no clamp
    const resA = await request(app.getHttpServer())
      .get(SP_A_WH_URL)
      .expect(200);
    const aTue = (resA.body as WH[]).find((h) => h.dayOfWeek === 2);
    expect(aTue?.startTime).toBe('09:00');
    expect(aTue?.endTime).toBe('17:00');

    // Provider B Tuesday: was 10:00–18:00, business still 09:00–21:00 → no clamp
    const resB = await request(app.getHttpServer())
      .get(SP_B_WH_URL)
      .expect(200);
    const bTue = (resB.body as WH[]).find((h) => h.dayOfWeek === 2);
    expect(bTue?.startTime).toBe('10:00');
    expect(bTue?.endTime).toBe('18:00');
  });

  it('existing future appointment remains unchanged and visible after PUT', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // APT is Mon 18:00–19:00 Jerusalem; narrowing Mon to 09:00–17:00 would put it
    // outside new hours. The PUT must succeed (appointment is NOT a blocker).
    await request(app.getHttpServer())
      .put(BIZ_WH_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);

    // Appointment must still exist and be unchanged
    const apt = await prisma.appointment.findUnique({ where: { id: APT_ID } });
    expect(apt).not.toBeNull();
    expect(apt!.status).toBe(AppointmentStatus.SCHEDULED);
    expect(apt!.startsAt.toISOString()).toBe(
      new Date(APT_STARTS_AT).toISOString(),
    );
    expect(apt!.endsAt.toISOString()).toBe(new Date(APT_ENDS_AT).toISOString());
  });

  it('PUT succeeds when future appointment falls outside new hours (no 409)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Previously the endpoint returned 409 for appointment conflicts. Now it must succeed.
    await request(app.getHttpServer())
      .put(BIZ_WH_URL)
      .send({
        hours: [
          // Monday closed — appointment on Monday (18:00–19:00) is now outside
          { dayOfWeek: 1, isClosed: true },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '09:00',
            endTime: '21:00',
          },
        ],
      })
      .expect(200);
  });
});
