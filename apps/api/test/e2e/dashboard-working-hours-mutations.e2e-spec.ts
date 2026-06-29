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

// ─── Stable IDs — hex-only prefix e2e40000 ────────────────────────────────────
const E2E_WH_MUT_BIZ_ID = 'e2e40000-0000-4000-8000-000000000001';
const E2E_WH_MUT_OWNER_USER_ID = 'e2e40000-0000-4000-8000-000000000002';
const E2E_WH_MUT_MGR_USER_ID = 'e2e40000-0000-4000-8000-000000000003';
const E2E_WH_MUT_MBR_USER_ID = 'e2e40000-0000-4000-8000-000000000004';
const E2E_WH_MUT_OUT_USER_ID = 'e2e40000-0000-4000-8000-000000000005';
const E2E_WH_MUT_SP_ID = 'e2e40000-0000-4000-8000-000000000010';
// Cross-tenant fixture
const E2E_WH_MUT_OTHER_BIZ_ID = 'e2e40000-0000-4000-8000-000000000020';
const E2E_WH_MUT_OTHER_USER_ID = 'e2e40000-0000-4000-8000-000000000021';
const E2E_WH_MUT_OTHER_SP_ID = 'e2e40000-0000-4000-8000-000000000030';

// Conflict-check fixtures (Phase 3A — business working hours)
const E2E_WH_MUT_CP_ID = 'e2e40000-0000-4000-8000-000000000040';
const E2E_WH_MUT_BC_ID = 'e2e40000-0000-4000-8000-000000000041';
const E2E_WH_MUT_SVC_ID = 'e2e40000-0000-4000-8000-000000000050';
const E2E_WH_MUT_APT_CONFLICT_ID = 'e2e40000-0000-4000-8000-000000000060';
const E2E_WH_MUT_APT_CANCELLED_ID = 'e2e40000-0000-4000-8000-000000000061';

// Conflict-check fixtures (Phase 3B — SP working hours)
const E2E_WH_MUT_SP2_USER_ID = 'e2e40000-0000-4000-8000-000000000072';
const E2E_WH_MUT_SP2_ID = 'e2e40000-0000-4000-8000-000000000070';
const E2E_WH_MUT_APT_SP2_ID = 'e2e40000-0000-4000-8000-000000000071';

// Conflict-check appointment times (business tz = Asia/Jerusalem = UTC+3 in summer)
// 2030-07-01 = Monday (day 1), 2030-07-02 = Tuesday (day 2), 2030-07-03 = Wednesday (day 3)
const WH_MON_APT_STARTS_AT = '2030-07-01T07:00:00.000Z'; // Mon 10:00 Jerusalem
const WH_MON_APT_ENDS_AT = '2030-07-01T08:00:00.000Z'; // Mon 11:00 Jerusalem
const WH_TUE_SP2_APT_STARTS_AT = '2030-07-02T07:00:00.000Z'; // Tue 10:00 Jerusalem
const WH_TUE_SP2_APT_ENDS_AT = '2030-07-02T08:00:00.000Z'; // Tue 11:00 Jerusalem
const WH_WED_APT_STARTS_AT = '2030-07-03T07:00:00.000Z'; // Wed 10:00 Jerusalem
const WH_WED_APT_ENDS_AT = '2030-07-03T08:00:00.000Z'; // Wed 11:00 Jerusalem

// User phones
const OWNER_PHONE = '+19990004001';
const MGR_PHONE = '+19990004002';
const MBR_PHONE = '+19990004003';
const OUT_PHONE = '+19990004004';
const OTHER_USER_PHONE = '+19990004010';
const SP2_USER_PHONE = '+19990004030';

type WorkingHourDto = {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
};

// ─── Valid payload helpers ────────────────────────────────────────────────────
const VALID_PAYLOAD = {
  hours: [
    { dayOfWeek: 1, isClosed: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, isClosed: false, startTime: '09:00', endTime: '17:00' },
  ],
};

// ─── Shared module-level setup ────────────────────────────────────────────────

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
let managerUser: User;
let memberUser: User;
let outsiderUser: User;

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

  // ── Idempotent pre-cleanup (FK-safe order) ─────────────────────────────────
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: E2E_WH_MUT_CP_ID },
  });
  await prisma.serviceProvider.deleteMany({
    where: {
      id: {
        in: [E2E_WH_MUT_SP_ID, E2E_WH_MUT_SP2_ID, E2E_WH_MUT_OTHER_SP_ID],
      },
    },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_WH_MUT_OWNER_USER_ID,
          E2E_WH_MUT_MGR_USER_ID,
          E2E_WH_MUT_MBR_USER_ID,
          E2E_WH_MUT_OUT_USER_ID,
          E2E_WH_MUT_OTHER_USER_ID,
          E2E_WH_MUT_SP2_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_WH_MUT_BIZ_ID,
      name: 'E2E Working Hours Mutations Business',
      slug: 'e2e-working-hours-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_OWNER_USER_ID,
      phoneNormalized: OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const ownerBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: ownerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_MGR_USER_ID,
      phoneNormalized: MGR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: managerUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_MBR_USER_ID,
      phoneNormalized: MBR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_OUT_USER_ID,
      phoneNormalized: OUT_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // ServiceProvider for main business — linked to owner's BusinessUser
  await prisma.serviceProvider.create({
    data: {
      id: E2E_WH_MUT_SP_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      businessUserId: ownerBU.id,
      displayName: 'E2E Provider',
      isActive: true,
    },
  });

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_WH_MUT_OTHER_BIZ_ID,
      name: 'E2E Working Hours Mutations Other Business',
      slug: 'e2e-working-hours-mutations-other-business',
      status: 'ACTIVE',
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_OTHER_USER_ID,
      phoneNormalized: OTHER_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const otherBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: E2E_WH_MUT_OTHER_SP_ID,
      businessId: E2E_WH_MUT_OTHER_BIZ_ID,
      businessUserId: otherBU.id,
      displayName: 'E2E Other Provider',
      isActive: true,
    },
  });

  // ── Conflict-check fixtures ────────────────────────────────────────────────
  await prisma.service.create({
    data: {
      id: E2E_WH_MUT_SVC_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      name: 'WH Test Service',
      durationMinutes: 60,
      isActive: true,
    },
  });
  await prisma.customerProfile.create({
    data: {
      id: E2E_WH_MUT_CP_ID,
      fullName: 'WH Test Customer',
      phoneNormalized: '+19990004020',
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: E2E_WH_MUT_BC_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      customerProfileId: E2E_WH_MUT_CP_ID,
      status: 'ACTIVE',
    },
  });
  // Active future appointment: Monday Jul 1 2030 10:00-11:00 Jerusalem
  await prisma.appointment.create({
    data: {
      id: E2E_WH_MUT_APT_CONFLICT_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      businessCustomerId: E2E_WH_MUT_BC_ID,
      serviceId: E2E_WH_MUT_SVC_ID,
      serviceProviderId: E2E_WH_MUT_SP_ID,
      startsAt: new Date(WH_MON_APT_STARTS_AT),
      endsAt: new Date(WH_MON_APT_ENDS_AT),
      status: AppointmentStatus.SCHEDULED,
    },
  });
  // Cancelled future appointment: Wednesday Jul 3 2030 10:00-11:00 Jerusalem
  await prisma.appointment.create({
    data: {
      id: E2E_WH_MUT_APT_CANCELLED_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      businessCustomerId: E2E_WH_MUT_BC_ID,
      serviceId: E2E_WH_MUT_SVC_ID,
      serviceProviderId: E2E_WH_MUT_SP_ID,
      startsAt: new Date(WH_WED_APT_STARTS_AT),
      endsAt: new Date(WH_WED_APT_ENDS_AT),
      status: AppointmentStatus.CANCELLED_BY_BUSINESS,
    },
  });

  // ── SP2 fixtures (Phase 3B) ────────────────────────────────────────────────
  // SP2 needs its own User+BusinessUser because businessUserId is @unique on ServiceProvider
  const sp2User = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_SP2_USER_ID,
      phoneNormalized: SP2_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const sp2BU = await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: sp2User.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: E2E_WH_MUT_SP2_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      businessUserId: sp2BU.id,
      displayName: 'E2E Provider 2',
      isActive: true,
    },
  });
  // Active future appointment for SP2: Tuesday Jul 2 2030 10:00-11:00 Jerusalem
  await prisma.appointment.create({
    data: {
      id: E2E_WH_MUT_APT_SP2_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      businessCustomerId: E2E_WH_MUT_BC_ID,
      serviceId: E2E_WH_MUT_SVC_ID,
      serviceProviderId: E2E_WH_MUT_SP2_ID,
      startsAt: new Date(WH_TUE_SP2_APT_STARTS_AT),
      endsAt: new Date(WH_TUE_SP2_APT_ENDS_AT),
      status: AppointmentStatus.SCHEDULED,
    },
  });
});

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: E2E_WH_MUT_CP_ID },
  });
  await prisma.serviceProvider.deleteMany({
    where: {
      id: {
        in: [E2E_WH_MUT_SP_ID, E2E_WH_MUT_SP2_ID, E2E_WH_MUT_OTHER_SP_ID],
      },
    },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_WH_MUT_OWNER_USER_ID,
          E2E_WH_MUT_MGR_USER_ID,
          E2E_WH_MUT_MBR_USER_ID,
          E2E_WH_MUT_OUT_USER_ID,
          E2E_WH_MUT_OTHER_USER_ID,
          E2E_WH_MUT_SP2_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── PUT /dashboard/businesses/:businessId/working-hours ──────────────────────

describe('PUT /dashboard/businesses/:businessId/working-hours', () => {
  it('owner → 200 with correct WorkingHourDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
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
            endTime: '17:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as WorkingHourDto[];
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isClosed: false,
    });
  });

  it('isClosed=true → startTime and endTime are null in response', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          { dayOfWeek: 0, isClosed: true },
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(200);

    const sunday = (res.body as WorkingHourDto[]).find(
      (h) => h.dayOfWeek === 0,
    );
    expect(sunday).toMatchObject({
      dayOfWeek: 0,
      isClosed: true,
      startTime: null,
      endTime: null,
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/working-hours',
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_OTHER_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('empty hours array → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [] })
      .expect(400);
  });

  it('more than 7 hours items → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const hours = Array.from({ length: 8 }, (_, i) => ({
      dayOfWeek: i,
      isClosed: true,
    }));
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours })
      .expect(400);
  });

  it('invalid dayOfWeek (> 6) → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [{ dayOfWeek: 7, isClosed: true }] })
      .expect(400);
  });

  it('open entry missing startTime → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [{ dayOfWeek: 1, isClosed: false, endTime: '17:00' }] })
      .expect(400);
  });

  it('invalid time format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '9:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(400);
  });

  it('endTime not after startTime → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '17:00',
            endTime: '09:00',
          },
        ],
      })
      .expect(400);
  });

  it('duplicate dayOfWeek → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          { dayOfWeek: 1, isClosed: true },
          { dayOfWeek: 1, isClosed: true },
        ],
      })
      .expect(400);
  });
});

// ─── PUT /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours ───

describe('PUT /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours', () => {
  beforeAll(async () => {
    // Seed wide business working hours (Mon+Tue 08:00–22:00) so the SP hours
    // containment validation passes for all success tests in this describe.
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: E2E_WH_MUT_BIZ_ID },
    });
    await prisma.businessWorkingHour.createMany({
      data: [1, 2].map((day) => ({
        businessId: E2E_WH_MUT_BIZ_ID,
        dayOfWeek: day,
        isClosed: false,
        startTime: '08:00',
        endTime: '22:00',
      })),
    });
  });

  it('owner → 200 with correct WorkingHourDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '10:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as WorkingHourDto[];
    expect(Array.isArray(body)).toBe(true);
    const tuesday = body.find((h) => h.dayOfWeek === 2);
    expect(tuesday).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 2,
      startTime: '10:00',
      endTime: '18:00',
      isClosed: false,
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    // ownerUser belongs to E2E_WH_MUT_BIZ_ID, not E2E_WH_MUT_OTHER_BIZ_ID
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_OTHER_BIZ_ID}/service-providers/${E2E_WH_MUT_OTHER_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('serviceProviderId from another business under main businessId → 404 (Pattern B)', async () => {
    // Access check passes (ownerUser is OWNER of main biz), but SP belongs to other biz
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_OTHER_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(404);
  });

  it('non-existent serviceProviderId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/00000000-0000-4000-8000-000000000000/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(404);
  });

  it('invalid DTO → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send({ hours: [] })
      .expect(400);
  });
});

// ─── PUT business working hours — appointment conflict checks ─────────────────

describe('PUT business working hours — appointment conflict checks', () => {
  it('succeeds when proposed hours cover the existing future appointment → 200', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Monday open 08:00-17:00: SP1 active appointment at 10:00-11:00 fits
    // Tuesday open: covers SP2 active Tuesday appointment
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(200);
  });

  it('succeeds even when proposed hours would put a future active appointment outside them → 200', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Monday closed; active appointment at 10:00-11:00 on Monday → no longer blocked.
    // Business hours PUT is now always allowed; the preview endpoint returns the
    // warning count and the frontend must confirm before calling PUT.
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [{ dayOfWeek: 1, isClosed: true }],
      })
      .expect(200);
  });

  it('appointment remains unchanged after hours are narrowed past its time', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Previous test closed Monday. The appointment on Monday 10:00-11:00 must still exist.
    const apt = await prisma.appointment.findUnique({
      where: { id: E2E_WH_MUT_APT_CONFLICT_ID },
    });
    expect(apt).not.toBeNull();
    expect(apt!.status).toBe(AppointmentStatus.SCHEDULED);
    expect(apt!.startsAt.toISOString()).toBe(
      new Date(WH_MON_APT_STARTS_AT).toISOString(),
    );
  });

  it('succeeds when only cancelled future appointments exist on the affected day → 200', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Wednesday closed; only a CANCELLED appointment on Wednesday → fine either way.
    // Restore Monday open so it is predictable for later tests in this suite.
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          { dayOfWeek: 3, isClosed: true },
        ],
      })
      .expect(200);
  });
});

// ─── PUT SP working hours — appointment conflict checks ───────────────────────

describe('PUT service-provider working hours — appointment conflict checks', () => {
  const SP_URL = `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`;

  it('succeeds when proposed hours cover the existing future SP appointment → 200', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // SP1 has active Monday appointment at 10:00-11:00; open 08:00-17:00 covers it
    await request(app.getHttpServer())
      .put(SP_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(200);
  });

  it('returns 409 when proposed hours would invalidate a future SP appointment', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // SP1 Monday closed → conflicts with active Monday appointment
    const res = await request(app.getHttpServer())
      .put(SP_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(409);

    const body409 = res.body as unknown as {
      message: string;
      conflicts: Array<{ appointmentId: string }>;
    };
    expect(body409.message).toContain('invalidate');
    expect(body409.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ appointmentId: E2E_WH_MUT_APT_CONFLICT_ID }),
      ]),
    );
  });

  it('does not persist SP working hours when 409 is returned', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // SP1 Monday closed → 409; hours should remain Monday 08:00-17:00 from first test
    await request(app.getHttpServer())
      .put(SP_URL)
      .send({ hours: [{ dayOfWeek: 1, isClosed: true }] })
      .expect(409);

    const getRes = await request(app.getHttpServer()).get(SP_URL).expect(200);

    const hours = getRes.body as unknown as WorkingHourDto[];
    const monday = hours.find((h) => h.dayOfWeek === 1);
    expect(monday).toBeDefined();
    expect(monday!.isClosed).toBe(false);
  });

  it('succeeds when only cancelled future SP appointments exist on the affected day → 200', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Wednesday closed; SP1's only Wednesday appointment is CANCELLED_BY_BUSINESS → no conflict
    // Monday must be open to cover the active Monday appointment
    await request(app.getHttpServer())
      .put(SP_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          { dayOfWeek: 3, isClosed: true },
        ],
      })
      .expect(200);
  });

  it('succeeds when another SP has a conflicting future appointment on the same day → 200', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // SP2 has an active Tuesday appointment; closing Tuesday for SP1 must not trigger a conflict
    // Monday must be open to cover SP1's active Monday appointment
    await request(app.getHttpServer())
      .put(SP_URL)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '08:00',
            endTime: '17:00',
          },
          { dayOfWeek: 2, isClosed: true },
        ],
      })
      .expect(200);
  });
});
