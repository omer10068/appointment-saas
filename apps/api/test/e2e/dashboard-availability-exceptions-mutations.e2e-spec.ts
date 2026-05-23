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

// ─── Stable IDs — hex-only prefix e2e30000 ────────────────────────────────────
const E2E_AE_MUT_BIZ_ID = 'e2e30000-0000-4000-8000-000000000001';
const E2E_AE_MUT_OWNER_USER_ID = 'e2e30000-0000-4000-8000-000000000002';
const E2E_AE_MUT_MGR_USER_ID = 'e2e30000-0000-4000-8000-000000000003';
const E2E_AE_MUT_MBR_USER_ID = 'e2e30000-0000-4000-8000-000000000004';
const E2E_AE_MUT_OUT_USER_ID = 'e2e30000-0000-4000-8000-000000000005';
const E2E_AE_MUT_SP_ID = 'e2e30000-0000-4000-8000-000000000010';
// Pre-seeded exceptions: PATCH tests + DELETE failure tests use EXCEPTION_ID
const E2E_AE_MUT_EXCEPTION_ID = 'e2e30000-0000-4000-8000-000000000011';
const E2E_AE_MUT_DELETE_OWNER_ID = 'e2e30000-0000-4000-8000-000000000012';
const E2E_AE_MUT_DELETE_MGR_ID = 'e2e30000-0000-4000-8000-000000000013';
// Conflict check fixtures — service / customer / appointments
const E2E_AE_MUT_SERVICE_ID = 'e2e30000-0000-4000-8000-000000000040';
const E2E_AE_MUT_CUST_PROFILE_ID = 'e2e30000-0000-4000-8000-000000000041';
const E2E_AE_MUT_BIZ_CUST_ID = 'e2e30000-0000-4000-8000-000000000042';
// 2099-08-05 (Wed/3): POST conflict tests
const E2E_AE_MUT_APT_ID = 'e2e30000-0000-4000-8000-000000000050';
// 2099-09-10 (Thu/4): DELETE 409 — no biz WH for that day
const E2E_AE_MUT_APT_DEL_CONFLICT_ID = 'e2e30000-0000-4000-8000-000000000051';
// 2099-09-11 (Fri/5): DELETE 204 — SP WH covers
const E2E_AE_MUT_APT_DEL_OK_ID = 'e2e30000-0000-4000-8000-000000000052';
// 2099-08-08 (Sat/6): PATCH conflict test
const E2E_AE_MUT_APT_PATCH_ID = 'e2e30000-0000-4000-8000-000000000053';
// Pre-seeded exceptions for conflict check tests
const E2E_AE_MUT_EXCEPTION_OPEN_ID = 'e2e30000-0000-4000-8000-000000000060'; // 2099-08-08 open
const E2E_AE_MUT_DEL_CONFLICT_EXCEPTION_ID =
  'e2e30000-0000-4000-8000-000000000061'; // 2099-09-10
const E2E_AE_MUT_DEL_OK_EXCEPTION_ID = 'e2e30000-0000-4000-8000-000000000062'; // 2099-09-11 SP-level

// Cross-tenant fixture
const E2E_AE_MUT_OTHER_BIZ_ID = 'e2e30000-0000-4000-8000-000000000020';
const E2E_AE_MUT_OTHER_USER_ID = 'e2e30000-0000-4000-8000-000000000021';
const E2E_AE_MUT_OTHER_SP_ID = 'e2e30000-0000-4000-8000-000000000030';
const E2E_AE_MUT_OTHER_EXCEPTION_ID = 'e2e30000-0000-4000-8000-000000000031';

// User phones
const OWNER_PHONE = '+19990003001';
const MGR_PHONE = '+19990003002';
const MBR_PHONE = '+19990003003';
const OUT_PHONE = '+19990003004';
const OTHER_USER_PHONE = '+19990003010';

type AvailabilityExceptionDto = {
  id: string;
  businessId: string;
  serviceProviderId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
  reason: string | null;
  createdAt: string;
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
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: {
      serviceProviderId: { in: [E2E_AE_MUT_SP_ID, E2E_AE_MUT_OTHER_SP_ID] },
    },
  });
  await prisma.availabilityException.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [E2E_AE_MUT_SP_ID, E2E_AE_MUT_OTHER_SP_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: E2E_AE_MUT_CUST_PROFILE_ID },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_AE_MUT_OWNER_USER_ID,
          E2E_AE_MUT_MGR_USER_ID,
          E2E_AE_MUT_MBR_USER_ID,
          E2E_AE_MUT_OUT_USER_ID,
          E2E_AE_MUT_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_AE_MUT_BIZ_ID,
      name: 'E2E Availability Exceptions Mutations Business',
      slug: 'e2e-availability-exceptions-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_AE_MUT_OWNER_USER_ID,
      phoneNormalized: OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const ownerBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_AE_MUT_BIZ_ID,
      userId: ownerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_AE_MUT_MGR_USER_ID,
      phoneNormalized: MGR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_AE_MUT_BIZ_ID,
      userId: managerUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_AE_MUT_MBR_USER_ID,
      phoneNormalized: MBR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_AE_MUT_BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_AE_MUT_OUT_USER_ID,
      phoneNormalized: OUT_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // ServiceProvider for main business — used in serviceProviderId exception tests
  await prisma.serviceProvider.create({
    data: {
      id: E2E_AE_MUT_SP_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      businessUserId: ownerBU.id,
      displayName: 'E2E Provider',
      isActive: true,
    },
  });

  // Pre-seeded exceptions used by PATCH tests and DELETE failure tests
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_EXCEPTION_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      date: new Date('2099-11-01'),
      isClosed: true,
    },
  });
  // Separate exceptions consumed by DELETE success tests
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_DELETE_OWNER_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      date: new Date('2099-11-02'),
      isClosed: true,
    },
  });
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_DELETE_MGR_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      date: new Date('2099-11-03'),
      isClosed: true,
    },
  });

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_AE_MUT_OTHER_BIZ_ID,
      name: 'E2E Availability Exceptions Mutations Other Business',
      slug: 'e2e-availability-exceptions-mutations-other-business',
      status: 'ACTIVE',
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      id: E2E_AE_MUT_OTHER_USER_ID,
      phoneNormalized: OTHER_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const otherBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_AE_MUT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: E2E_AE_MUT_OTHER_SP_ID,
      businessId: E2E_AE_MUT_OTHER_BIZ_ID,
      businessUserId: otherBU.id,
      displayName: 'E2E Other Provider',
      isActive: true,
    },
  });
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_OTHER_EXCEPTION_ID,
      businessId: E2E_AE_MUT_OTHER_BIZ_ID,
      date: new Date('2099-11-04'),
      isClosed: true,
    },
  });

  // ── Conflict check fixtures ────────────────────────────────────────────────
  await prisma.service.create({
    data: {
      id: E2E_AE_MUT_SERVICE_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      name: 'E2E AE Conflict Service',
      durationMinutes: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      isActive: true,
    },
  });
  await prisma.customerProfile.create({
    data: {
      id: E2E_AE_MUT_CUST_PROFILE_ID,
      fullName: 'E2E AE Conflict Customer',
      phoneNormalized: '+19990003099',
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: E2E_AE_MUT_BIZ_CUST_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      customerProfileId: E2E_AE_MUT_CUST_PROFILE_ID,
      status: 'ACTIVE',
    },
  });
  // 2099-08-05T10:00Z = 13:00 Jerusalem — used by POST conflict tests
  await prisma.appointment.create({
    data: {
      id: E2E_AE_MUT_APT_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceId: E2E_AE_MUT_SERVICE_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      businessCustomerId: E2E_AE_MUT_BIZ_CUST_ID,
      startsAt: new Date('2099-08-05T10:00:00.000Z'),
      endsAt: new Date('2099-08-05T11:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
    },
  });
  // 2099-08-08T10:00Z = 13:00 Jerusalem — used by PATCH conflict test
  await prisma.appointment.create({
    data: {
      id: E2E_AE_MUT_APT_PATCH_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceId: E2E_AE_MUT_SERVICE_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      businessCustomerId: E2E_AE_MUT_BIZ_CUST_ID,
      startsAt: new Date('2099-08-08T10:00:00.000Z'),
      endsAt: new Date('2099-08-08T11:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
    },
  });
  // 2099-09-10T10:00Z = 13:00 Jerusalem — DELETE 409; no biz WH for Thursday (dayOfWeek 4)
  await prisma.appointment.create({
    data: {
      id: E2E_AE_MUT_APT_DEL_CONFLICT_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceId: E2E_AE_MUT_SERVICE_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      businessCustomerId: E2E_AE_MUT_BIZ_CUST_ID,
      startsAt: new Date('2099-09-10T10:00:00.000Z'),
      endsAt: new Date('2099-09-10T11:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
    },
  });
  // 2099-09-11T10:00Z = 13:00 Jerusalem — DELETE 204; SP has WH for Friday (dayOfWeek 5)
  await prisma.appointment.create({
    data: {
      id: E2E_AE_MUT_APT_DEL_OK_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceId: E2E_AE_MUT_SERVICE_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      businessCustomerId: E2E_AE_MUT_BIZ_CUST_ID,
      startsAt: new Date('2099-09-11T10:00:00.000Z'),
      endsAt: new Date('2099-09-11T11:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
    },
  });
  // SP WH Friday (5): covers 08:00-17:00 — used by DELETE 204 fallback check
  await prisma.serviceProviderWorkingHour.create({
    data: {
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      dayOfWeek: 5,
      isClosed: false,
      startTime: '08:00',
      endTime: '17:00',
    },
  });
  // Pre-seeded exception for PATCH conflict test: 2099-08-08, open 12:00-17:00
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_EXCEPTION_OPEN_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      date: new Date('2099-08-08'),
      isClosed: false,
      startTime: '12:00',
      endTime: '17:00',
    },
  });
  // Pre-seeded exception for DELETE 409: 2099-09-10, open (biz-level, no biz WH)
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_DEL_CONFLICT_EXCEPTION_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      date: new Date('2099-09-10'),
      isClosed: false,
      startTime: '12:00',
      endTime: '17:00',
    },
  });
  // Pre-seeded exception for DELETE 204: 2099-09-11, SP-level (SP WH covers fallback)
  await prisma.availabilityException.create({
    data: {
      id: E2E_AE_MUT_DEL_OK_EXCEPTION_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      date: new Date('2099-09-11'),
      isClosed: false,
      startTime: '12:00',
      endTime: '17:00',
    },
  });
});

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: {
      serviceProviderId: { in: [E2E_AE_MUT_SP_ID, E2E_AE_MUT_OTHER_SP_ID] },
    },
  });
  await prisma.availabilityException.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [E2E_AE_MUT_SP_ID, E2E_AE_MUT_OTHER_SP_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: { businessId: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_AE_MUT_BIZ_ID, E2E_AE_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: E2E_AE_MUT_CUST_PROFILE_ID },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_AE_MUT_OWNER_USER_ID,
          E2E_AE_MUT_MGR_USER_ID,
          E2E_AE_MUT_MBR_USER_ID,
          E2E_AE_MUT_OUT_USER_ID,
          E2E_AE_MUT_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── POST /dashboard/businesses/:businessId/availability-exceptions ────────────

describe('POST /dashboard/businesses/:businessId/availability-exceptions', () => {
  it('owner → 201 with correct AvailabilityExceptionDto shape (closed, no SP)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-15', isClosed: true, reason: 'Holiday' })
      .expect(201);

    expect(res.body).toMatchObject<AvailabilityExceptionDto>({
      id: expect.any(String) as string,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceProviderId: null,
      date: expect.any(String) as string,
      startTime: null,
      endTime: null,
      isClosed: true,
      reason: 'Holiday',
      createdAt: expect.any(String) as string,
    });
  });

  it('owner → 201 with serviceProviderId and open times', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({
        date: '2099-06-16',
        isClosed: false,
        startTime: '10:00',
        endTime: '14:00',
        serviceProviderId: E2E_AE_MUT_SP_ID,
      })
      .expect(201);

    expect(res.body).toMatchObject<AvailabilityExceptionDto>({
      id: expect.any(String) as string,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceProviderId: E2E_AE_MUT_SP_ID,
      date: expect.any(String) as string,
      startTime: '10:00',
      endTime: '14:00',
      isClosed: false,
      reason: null,
      createdAt: expect.any(String) as string,
    });
  });

  it('manager → 201', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-17', isClosed: true })
      .expect(201);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-18', isClosed: true })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-19', isClosed: true })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-20', isClosed: true })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/availability-exceptions',
      )
      .send({ date: '2099-06-21', isClosed: true })
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_OTHER_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-22', isClosed: true })
      .expect(403);
  });

  it('missing date → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ isClosed: true })
      .expect(400);
  });

  it('invalid date format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: 'not-a-date', isClosed: true })
      .expect(400);
  });

  it('missing isClosed → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-23' })
      .expect(400);
  });

  it('isClosed=false without startTime → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-06-24', isClosed: false, endTime: '17:00' })
      .expect(400);
  });

  it('invalid time format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({
        date: '2099-06-25',
        isClosed: false,
        startTime: '9:00',
        endTime: '17:00',
      })
      .expect(400);
  });

  it('endTime not after startTime → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({
        date: '2099-06-26',
        isClosed: false,
        startTime: '17:00',
        endTime: '09:00',
      })
      .expect(400);
  });

  it('serviceProviderId from another business → 404 (Pattern B)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({
        date: '2099-06-27',
        isClosed: true,
        serviceProviderId: E2E_AE_MUT_OTHER_SP_ID,
      })
      .expect(404);
  });

  it('non-existent serviceProviderId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({
        date: '2099-06-28',
        isClosed: true,
        serviceProviderId: '00000000-0000-4000-8000-000000000000',
      })
      .expect(404);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/availability-exceptions/:exceptionId ─

describe('PATCH /dashboard/businesses/:businessId/availability-exceptions/:exceptionId', () => {
  it('owner → 200 with correct AvailabilityExceptionDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ reason: 'Updated reason' })
      .expect(200);

    expect(res.body).toMatchObject<AvailabilityExceptionDto>({
      id: E2E_AE_MUT_EXCEPTION_ID,
      businessId: E2E_AE_MUT_BIZ_ID,
      serviceProviderId: null,
      date: expect.any(String) as string,
      startTime: null,
      endTime: null,
      isClosed: true,
      reason: 'Updated reason',
      createdAt: expect.any(String) as string,
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ reason: 'Manager reason' })
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ reason: 'No access' })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ reason: 'No access' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ reason: 'No auth' })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ reason: 'x' })
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_OTHER_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_OTHER_EXCEPTION_ID}`,
      )
      .send({ reason: 'x' })
      .expect(403);
  });

  it('exceptionId from another business under main businessId → 404 (Pattern B)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_OTHER_EXCEPTION_ID}`,
      )
      .send({ reason: 'x' })
      .expect(404);
  });

  it('non-existent exceptionId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/00000000-0000-4000-8000-000000000000`,
      )
      .send({ reason: 'x' })
      .expect(404);
  });

  it('invalid time format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ startTime: '9:00' })
      .expect(400);
  });

  it('setting isClosed=false when no times are set → 400', async () => {
    // Seeded exception has isClosed=true and no startTime/endTime.
    // Merging isClosed=false with null times triggers validateTimeRange → 400.
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ isClosed: false })
      .expect(400);
  });

  it('serviceProviderId from another business → 404 (Pattern B on related SP)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .send({ serviceProviderId: E2E_AE_MUT_OTHER_SP_ID })
      .expect(404);
  });
});

// ─── DELETE /dashboard/businesses/:businessId/availability-exceptions/:exceptionId ─

describe('DELETE /dashboard/businesses/:businessId/availability-exceptions/:exceptionId', () => {
  it('owner → 204', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_DELETE_OWNER_ID}`,
      )
      .expect(204);
  });

  it('manager → 204', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_DELETE_MGR_ID}`,
      )
      .expect(204);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/availability-exceptions/${E2E_AE_MUT_EXCEPTION_ID}`,
      )
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_OTHER_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_OTHER_EXCEPTION_ID}`,
      )
      .expect(403);
  });

  it('exceptionId from another business under main businessId → 404 (Pattern B)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_OTHER_EXCEPTION_ID}`,
      )
      .expect(404);
  });

  it('non-existent exceptionId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/00000000-0000-4000-8000-000000000000`,
      )
      .expect(404);
  });
});

// ─── Conflict check — POST / PATCH / DELETE ───────────────────────────────────
//
// Business timezone: Asia/Jerusalem (UTC+3 in summer).
// All test appointments run 10:00-11:00 UTC = 13:00-14:00 Jerusalem local.
// Proposed exception times are expressed in Jerusalem local.

describe('Conflict checks for availability exception mutations', () => {
  it('POST closed exception on date with future appointment → 409', async () => {
    // Appointment E2E_AE_MUT_APT_ID is on 2099-08-05T10:00Z (13:00 Jerusalem).
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({ date: '2099-08-05', isClosed: true })
      .expect(409);

    const body = res.body as unknown as {
      message: string;
      conflicts: Array<{ appointmentId: string }>;
    };
    expect(body.message).toMatch(/invalidate/i);
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0].appointmentId).toBe(E2E_AE_MUT_APT_ID);
  });

  it('POST open exception whose window covers future appointment → 201', async () => {
    // Window 12:00-17:00 Jerusalem covers appointment at 13:00-14:00.
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions`,
      )
      .send({
        date: '2099-08-05',
        isClosed: false,
        startTime: '12:00',
        endTime: '17:00',
      })
      .expect(201);
  });

  it('PATCH exception to narrow window that excludes future appointment → 409', async () => {
    // E2E_AE_MUT_EXCEPTION_OPEN_ID is 2099-08-08 open 12:00-17:00.
    // Appointment E2E_AE_MUT_APT_PATCH_ID is 13:00-14:00 Jerusalem.
    // Narrowing startTime to 14:00 → window 14:00-17:00 excludes 13:00-14:00.
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_EXCEPTION_OPEN_ID}`,
      )
      .send({ startTime: '14:00' })
      .expect(409);

    const body = res.body as unknown as {
      message: string;
      conflicts: Array<{ appointmentId: string }>;
    };
    expect(body.message).toMatch(/invalidate/i);
    expect(body.conflicts[0].appointmentId).toBe(E2E_AE_MUT_APT_PATCH_ID);
  });

  it('DELETE exception that is the only coverage for a future appointment → 409', async () => {
    // E2E_AE_MUT_DEL_CONFLICT_EXCEPTION_ID is 2099-09-10 open (biz-level).
    // Appointment E2E_AE_MUT_APT_DEL_CONFLICT_ID is on that date.
    // No businessWorkingHour for Thursday (dayOfWeek 4) → fallback = closed → 409.
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_DEL_CONFLICT_EXCEPTION_ID}`,
      )
      .expect(409);

    const body = res.body as unknown as {
      message: string;
      conflicts: Array<{ appointmentId: string }>;
    };
    expect(body.message).toMatch(/invalidate/i);
    expect(body.conflicts[0].appointmentId).toBe(
      E2E_AE_MUT_APT_DEL_CONFLICT_ID,
    );
  });

  it('DELETE exception when SP regular working hours still cover appointment → 204', async () => {
    // E2E_AE_MUT_DEL_OK_EXCEPTION_ID is 2099-09-11 SP-level.
    // Appointment E2E_AE_MUT_APT_DEL_OK_ID is on that date, same SP.
    // SP has WH for Friday (dayOfWeek 5): 08:00-17:00 → covers 13:00-14:00 → 204.
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .delete(
        `/dashboard/businesses/${E2E_AE_MUT_BIZ_ID}/availability-exceptions/${E2E_AE_MUT_DEL_OK_EXCEPTION_ID}`,
      )
      .expect(204);
  });
});
