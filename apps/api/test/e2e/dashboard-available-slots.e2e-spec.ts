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

// ─── Stable IDs — hex-only prefix e2e14000 ────────────────────────────────────

const SLOTS_BIZ_ID = 'e2e14000-0000-4000-8000-000000000001';
const SLOTS_OWNER_USER_ID = 'e2e14000-0000-4000-8000-000000000002';
const SLOTS_MBR_USER_ID = 'e2e14000-0000-4000-8000-000000000003';
const SLOTS_OUT_USER_ID = 'e2e14000-0000-4000-8000-000000000004';
const SLOTS_SP_USER_ID = 'e2e14000-0000-4000-8000-000000000005';

const SLOTS_SVC_ID = 'e2e14000-0000-4000-8000-000000000010';

const SLOTS_SP_ID = 'e2e14000-0000-4000-8000-000000000020';

const SLOTS_CP_ID = 'e2e14000-0000-4000-8000-000000000030';
const SLOTS_BC_ID = 'e2e14000-0000-4000-8000-000000000031';

const SLOTS_APT_SCHEDULED_ID = 'e2e14000-0000-4000-8000-000000000040';
const SLOTS_APT_CANCELLED_ID = 'e2e14000-0000-4000-8000-000000000041';

const SLOTS_OTHER_BIZ_ID = 'e2e14000-0000-4000-8000-000000000050';
const SLOTS_OTHER_USER_ID = 'e2e14000-0000-4000-8000-000000000051';
const SLOTS_OTHER_SP_ID = 'e2e14000-0000-4000-8000-000000000052';

// Test date: 2030-07-01 is a Monday (dayOfWeek = 1)
// Business timezone: Asia/Jerusalem (default, UTC+3 in July)
// Window: 08:00-17:00 Jerusalem = 05:00-14:00 UTC
const TEST_DATE = '2030-07-01';
const SERVICE_DURATION = 60; // minutes

// Scheduled appointment: 09:00-10:00 Jerusalem = 06:00-07:00 UTC — blocks 09:00 slot
const APT_SCHEDULED_STARTS = new Date('2030-07-01T06:00:00.000Z');
const APT_SCHEDULED_ENDS = new Date('2030-07-01T07:00:00.000Z');

// Cancelled appointment: 11:00-12:00 Jerusalem = 08:00-09:00 UTC — must NOT block 11:00 slot
const APT_CANCELLED_STARTS = new Date('2030-07-01T08:00:00.000Z');
const APT_CANCELLED_ENDS = new Date('2030-07-01T09:00:00.000Z');

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
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
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderService.deleteMany({
    where: { serviceProviderId: { in: [SLOTS_SP_ID, SLOTS_OTHER_SP_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [SLOTS_SP_ID, SLOTS_OTHER_SP_ID] } },
  });
  await prisma.businessCustomer.deleteMany({
    where: { id: { in: [SLOTS_BC_ID] } },
  });
  await prisma.service.deleteMany({
    where: { id: { in: [SLOTS_SVC_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: { in: [SLOTS_CP_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          SLOTS_OWNER_USER_ID,
          SLOTS_MBR_USER_ID,
          SLOTS_OUT_USER_ID,
          SLOTS_SP_USER_ID,
          SLOTS_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business (default timezone = Asia/Jerusalem) ─────────────────
  await prisma.business.create({
    data: {
      id: SLOTS_BIZ_ID,
      name: 'E2E Available Slots Business',
      slug: 'e2e-available-slots-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: SLOTS_OWNER_USER_ID,
      phoneNormalized: '+19990041001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: SLOTS_BIZ_ID,
      userId: ownerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: SLOTS_MBR_USER_ID,
      phoneNormalized: '+19990041002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: SLOTS_BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: SLOTS_OUT_USER_ID,
      phoneNormalized: '+19990041003',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // SP-backing user
  const spUser = await prisma.user.create({
    data: {
      id: SLOTS_SP_USER_ID,
      phoneNormalized: '+19990041004',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const spBU = await prisma.businessUser.create({
    data: {
      businessId: SLOTS_BIZ_ID,
      userId: spUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  // Service
  await prisma.service.create({
    data: {
      id: SLOTS_SVC_ID,
      businessId: SLOTS_BIZ_ID,
      name: 'E2E Slots Service',
      durationMinutes: SERVICE_DURATION,
      isActive: true,
    },
  });

  // ServiceProvider
  await prisma.serviceProvider.create({
    data: {
      id: SLOTS_SP_ID,
      businessId: SLOTS_BIZ_ID,
      businessUserId: spBU.id,
      displayName: 'E2E Slots Provider',
      isActive: true,
    },
  });

  await prisma.serviceProviderService.create({
    data: { serviceProviderId: SLOTS_SP_ID, serviceId: SLOTS_SVC_ID },
  });

  // Business working hours: Monday (1) 08:00-17:00
  await prisma.businessWorkingHour.create({
    data: {
      businessId: SLOTS_BIZ_ID,
      dayOfWeek: 1,
      isClosed: false,
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  // SP working hours: Monday (1) 08:00-17:00
  await prisma.serviceProviderWorkingHour.create({
    data: {
      businessId: SLOTS_BIZ_ID,
      serviceProviderId: SLOTS_SP_ID,
      dayOfWeek: 1,
      isClosed: false,
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  // Customer (needed for appointment FK)
  await prisma.customerProfile.create({
    data: {
      id: SLOTS_CP_ID,
      fullName: 'E2E Slots Customer',
      phoneNormalized: '+19990041099',
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: SLOTS_BC_ID,
      businessId: SLOTS_BIZ_ID,
      customerProfileId: SLOTS_CP_ID,
      status: 'ACTIVE',
    },
  });

  // Scheduled appointment: 09:00-10:00 Jerusalem → blocks the 09:00 slot
  await prisma.appointment.create({
    data: {
      id: SLOTS_APT_SCHEDULED_ID,
      businessId: SLOTS_BIZ_ID,
      businessCustomerId: SLOTS_BC_ID,
      serviceId: SLOTS_SVC_ID,
      serviceProviderId: SLOTS_SP_ID,
      startsAt: APT_SCHEDULED_STARTS,
      endsAt: APT_SCHEDULED_ENDS,
      status: AppointmentStatus.SCHEDULED,
    },
  });

  // Cancelled appointment: 11:00-12:00 Jerusalem → must NOT block the 11:00 slot
  await prisma.appointment.create({
    data: {
      id: SLOTS_APT_CANCELLED_ID,
      businessId: SLOTS_BIZ_ID,
      businessCustomerId: SLOTS_BC_ID,
      serviceId: SLOTS_SVC_ID,
      serviceProviderId: SLOTS_SP_ID,
      startsAt: APT_CANCELLED_STARTS,
      endsAt: APT_CANCELLED_ENDS,
      status: AppointmentStatus.CANCELLED_BY_BUSINESS,
    },
  });

  // ── Cross-tenant fixture — foreign SP for Pattern B isolation ──────────────
  await prisma.business.create({
    data: {
      id: SLOTS_OTHER_BIZ_ID,
      name: 'E2E Available Slots Other Business',
      slug: 'e2e-available-slots-other-business',
      status: 'ACTIVE',
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      id: SLOTS_OTHER_USER_ID,
      phoneNormalized: '+19990041005',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const otherBU = await prisma.businessUser.create({
    data: {
      businessId: SLOTS_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: SLOTS_OTHER_SP_ID,
      businessId: SLOTS_OTHER_BIZ_ID,
      businessUserId: otherBU.id,
      displayName: 'Other Business Provider',
      isActive: true,
    },
  });
});

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderService.deleteMany({
    where: { serviceProviderId: { in: [SLOTS_SP_ID, SLOTS_OTHER_SP_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [SLOTS_SP_ID, SLOTS_OTHER_SP_ID] } },
  });
  await prisma.businessCustomer.deleteMany({
    where: { id: { in: [SLOTS_BC_ID] } },
  });
  await prisma.service.deleteMany({
    where: { id: { in: [SLOTS_SVC_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [SLOTS_BIZ_ID, SLOTS_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: { in: [SLOTS_CP_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          SLOTS_OWNER_USER_ID,
          SLOTS_MBR_USER_ID,
          SLOTS_OUT_USER_ID,
          SLOTS_SP_USER_ID,
          SLOTS_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// Shared query params for tests against the seeded Monday date
function slotsQuery(intervalMinutes = 60) {
  return {
    serviceId: SLOTS_SVC_ID,
    serviceProviderId: SLOTS_SP_ID,
    date: TEST_DATE,
    intervalMinutes: String(intervalMinutes),
  };
}

function slotsUrl() {
  return `/dashboard/businesses/${SLOTS_BIZ_ID}/available-slots`;
}

describe('GET /dashboard/businesses/:businessId/available-slots', () => {
  it('OWNER gets 200 with correct response shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;

    const res = await request(app.getHttpServer())
      .get(slotsUrl())
      .query(slotsQuery());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      date: TEST_DATE,
      timezone: 'Asia/Jerusalem',
      serviceId: SLOTS_SVC_ID,
      serviceProviderId: SLOTS_SP_ID,
      durationMinutes: SERVICE_DURATION,
      intervalMinutes: 60,
    });
    const body = res.body as {
      slots: {
        startsAt: string;
        endsAt: string;
        localStartTime: string;
        localEndTime: string;
      }[];
    };
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body.slots.length).toBeGreaterThan(0);
    const slot = body.slots[0];
    expect(slot).toHaveProperty('startsAt');
    expect(slot).toHaveProperty('endsAt');
    expect(slot).toHaveProperty('localStartTime');
    expect(slot).toHaveProperty('localEndTime');
  });

  it('MEMBER can read available slots → 200', async () => {
    MockClerkAuthGuard.currentUser = memberUser;

    const res = await request(app.getHttpServer())
      .get(slotsUrl())
      .query(slotsQuery());

    expect(res.status).toBe(200);
  });

  it('missing auth → 401', async () => {
    const res = await request(app.getHttpServer())
      .get(slotsUrl())
      .query(slotsQuery());

    expect(res.status).toBe(401);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;

    const res = await request(app.getHttpServer())
      .get(slotsUrl())
      .query(slotsQuery());

    expect(res.status).toBe(403);
  });

  it('foreign serviceProviderId (from another business) → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;

    const res = await request(app.getHttpServer()).get(slotsUrl()).query({
      serviceId: SLOTS_SVC_ID,
      serviceProviderId: SLOTS_OTHER_SP_ID,
      date: TEST_DATE,
      intervalMinutes: '60',
    });

    expect(res.status).toBe(404);
  });

  it('active appointment removes overlapping slot', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;

    const res = await request(app.getHttpServer())
      .get(slotsUrl())
      .query(slotsQuery());

    expect(res.status).toBe(200);

    const slots = (res.body as { slots: { localStartTime: string }[] }).slots;
    const startTimes = slots.map((s) => s.localStartTime);

    // Scheduled appointment at 09:00-10:00 Jerusalem must block the 09:00 slot
    expect(startTimes).not.toContain('09:00');
  });

  it('cancelled appointment does not remove overlapping slot', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;

    const res = await request(app.getHttpServer())
      .get(slotsUrl())
      .query(slotsQuery());

    expect(res.status).toBe(200);

    const slots = (res.body as { slots: { localStartTime: string }[] }).slots;
    const startTimes = slots.map((s) => s.localStartTime);

    // Cancelled appointment at 11:00-12:00 Jerusalem must NOT block the 11:00 slot
    expect(startTimes).toContain('11:00');
  });
});
