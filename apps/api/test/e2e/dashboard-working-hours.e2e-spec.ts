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
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2ea0000 ────────────────────────────────────
const E2E_WH_BIZ_ID = 'e2ea0000-0000-4000-8000-000000000001';
const E2E_WH_OWNER_USER_ID = 'e2ea0000-0000-4000-8000-000000000002';
const E2E_WH_MGR_USER_ID = 'e2ea0000-0000-4000-8000-000000000003';
const E2E_WH_MBR_USER_ID = 'e2ea0000-0000-4000-8000-000000000004';
const E2E_WH_OUT_USER_ID = 'e2ea0000-0000-4000-8000-000000000005';

// Response shapes
type WorkingHourDto = {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
};

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
// All three describe blocks share one app instance and one set of seed data.

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
let managerUser: User;
let memberUser: User;
let outsiderUser: User;
let serviceProviderId: string;

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

  // ── Idempotent pre-cleanup ─────────────────────────────────────────────────
  // FK-safe order: AvailabilityException → ServiceProviderWorkingHour
  // → BusinessWorkingHour → ServiceProvider (cascades ServiceProviderService)
  // → BusinessUser → Business → User
  await prisma.availabilityException.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.serviceProvider.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.business.deleteMany({ where: { id: E2E_WH_BIZ_ID } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_WH_OWNER_USER_ID,
          E2E_WH_MGR_USER_ID,
          E2E_WH_MBR_USER_ID,
          E2E_WH_OUT_USER_ID,
        ],
      },
    },
  });

  // ── Seed ──────────────────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_WH_BIZ_ID,
      name: 'E2E Working Hours Business',
      slug: 'e2e-working-hours-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_WH_OWNER_USER_ID,
      phoneNormalized: '+19990006001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const ownerBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_BIZ_ID,
      userId: ownerUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_WH_MGR_USER_ID,
      phoneNormalized: '+19990006002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_BIZ_ID,
      userId: managerUser.id,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_WH_MBR_USER_ID,
      phoneNormalized: '+19990006003',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_BIZ_ID,
      userId: memberUser.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_WH_OUT_USER_ID,
      phoneNormalized: '+19990006004',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // Business working hours: Monday open, Sunday closed
  await prisma.businessWorkingHour.createMany({
    data: [
      {
        businessId: E2E_WH_BIZ_ID,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isClosed: false,
      },
      {
        businessId: E2E_WH_BIZ_ID,
        dayOfWeek: 0,
        startTime: null,
        endTime: null,
        isClosed: true,
      },
    ],
  });

  // Service provider linked to owner's BusinessUser
  const sp = await prisma.serviceProvider.create({
    data: {
      businessId: E2E_WH_BIZ_ID,
      businessUserId: ownerBU.id,
      displayName: 'E2E Provider',
      isActive: true,
    },
  });
  serviceProviderId = sp.id;

  // Service provider working hours: Monday open
  await prisma.serviceProviderWorkingHour.create({
    data: {
      businessId: E2E_WH_BIZ_ID,
      serviceProviderId: sp.id,
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '16:00',
      isClosed: false,
    },
  });

  // Availability exception: business-level closed day
  await prisma.availabilityException.create({
    data: {
      businessId: E2E_WH_BIZ_ID,
      serviceProviderId: null,
      date: new Date('2026-12-25'),
      isClosed: true,
      reason: 'Christmas',
    },
  });
});

afterAll(async () => {
  await prisma.availabilityException.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.serviceProvider.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: E2E_WH_BIZ_ID },
  });
  await prisma.business.deleteMany({ where: { id: E2E_WH_BIZ_ID } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_WH_OWNER_USER_ID,
          E2E_WH_MGR_USER_ID,
          E2E_WH_MBR_USER_ID,
          E2E_WH_OUT_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── GET /dashboard/businesses/:businessId/working-hours ──────────────────────

describe('GET /dashboard/businesses/:businessId/working-hours', () => {
  it('owner returns 200 with correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/working-hours`)
      .expect(200);

    const body = res.body as WorkingHourDto[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    // Ordered by dayOfWeek asc: Sunday (0) first, Monday (1) second
    expect(body[0]).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 0,
      startTime: null,
      endTime: null,
      isClosed: true,
    });
    expect(body[1]).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isClosed: false,
    });
  });

  it('manager returns 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/working-hours`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('member returns 200', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/working-hours`)
      .expect(200);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/working-hours`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/working-hours`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get('/dashboard/businesses/00000000-0000-4000-8000-000000000000/working-hours')
      .expect(403);
  });
});

// ─── GET /dashboard/businesses/:businessId/service-providers/:id/working-hours ─

describe('GET /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours', () => {
  it('owner returns 200 with correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/${E2E_WH_BIZ_ID}/service-providers/${serviceProviderId}/working-hours`,
      )
      .expect(200);

    const body = res.body as WorkingHourDto[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '16:00',
      isClosed: false,
    });
  });

  it('manager returns 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/${E2E_WH_BIZ_ID}/service-providers/${serviceProviderId}/working-hours`,
      )
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('member returns 200', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/${E2E_WH_BIZ_ID}/service-providers/${serviceProviderId}/working-hours`,
      )
      .expect(200);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/${E2E_WH_BIZ_ID}/service-providers/${serviceProviderId}/working-hours`,
      )
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/${E2E_WH_BIZ_ID}/service-providers/${serviceProviderId}/working-hours`,
      )
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/service-providers/${serviceProviderId}/working-hours`,
      )
      .expect(403);
  });
});

// ─── GET /dashboard/businesses/:businessId/availability-exceptions ─────────────

describe('GET /dashboard/businesses/:businessId/availability-exceptions', () => {
  it('owner returns 200 with correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/availability-exceptions`)
      .expect(200);

    const body = res.body as AvailabilityExceptionDto[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject<AvailabilityExceptionDto>({
      id: expect.any(String) as string,
      businessId: E2E_WH_BIZ_ID,
      serviceProviderId: null,
      date: expect.any(String) as string,
      startTime: null,
      endTime: null,
      isClosed: true,
      reason: 'Christmas',
      createdAt: expect.any(String) as string,
    });
  });

  it('manager returns 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/availability-exceptions`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('member returns 200', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/availability-exceptions`)
      .expect(200);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/availability-exceptions`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_WH_BIZ_ID}/availability-exceptions`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/availability-exceptions',
      )
      .expect(403);
  });
});
