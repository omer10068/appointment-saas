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

// Fail immediately if TEST_DATABASE_URL is not configured — this test writes
// real rows and must never run against the development database.
requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2e90000 ────────────────────────────────────
const E2E_SR_BIZ_ID = 'e2e90000-0000-4000-8000-000000000001';
const E2E_SR_OWNER_USER_ID = 'e2e90000-0000-4000-8000-000000000002';
const E2E_SR_MGR_USER_ID = 'e2e90000-0000-4000-8000-000000000003';
const E2E_SR_MBR_USER_ID = 'e2e90000-0000-4000-8000-000000000004';
const E2E_SR_OUT_USER_ID = 'e2e90000-0000-4000-8000-000000000005';
const E2E_SR_SVC_ACTIVE_ID = 'e2e90000-0000-4000-8000-000000000010';
const E2E_SR_SVC_INACT_ID = 'e2e90000-0000-4000-8000-000000000011';
const E2E_SR_PROFILE_1_ID = 'e2e90000-0000-4000-8000-000000000020';
const E2E_SR_PROFILE_2_ID = 'e2e90000-0000-4000-8000-000000000021';

// Response shapes
type SummaryDto = {
  servicesCount: number;
  activeServicesCount: number;
  customersCount: number;
  activeCustomersCount: number;
};

type BusinessReadinessChecks = {
  hasActiveOwner: boolean;
  hasActiveService: boolean;
  hasActiveServiceProvider: boolean;
  hasBusinessWorkingHours: boolean;
  allActiveProvidersHaveWorkingHours: boolean;
  allActiveProvidersHaveActiveServiceAssignment: boolean;
  allActiveServicesHaveActiveProviderAssignment: boolean;
};

type BusinessReadinessDto = {
  hasActiveServiceProviders: boolean;
  hasActiveService: boolean;
  isReady: boolean;
  checks: BusinessReadinessChecks;
  blockingReasons: string[];
};

// ─── Shared module-level setup ────────────────────────────────────────────────
// Both describe blocks (summary + readiness) share one app instance and one
// set of seed data so the module is only compiled and torn down once.

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
let managerUser: User;
let memberUser: User;
let outsiderUser: User;

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      // ignoreEnvFile: env vars are already loaded by jest-e2e.setup.ts
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
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.serviceProvider.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.service.deleteMany({ where: { businessId: E2E_SR_BIZ_ID } });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: { in: [E2E_SR_PROFILE_1_ID, E2E_SR_PROFILE_2_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.business.deleteMany({ where: { id: E2E_SR_BIZ_ID } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_SR_OWNER_USER_ID,
          E2E_SR_MGR_USER_ID,
          E2E_SR_MBR_USER_ID,
          E2E_SR_OUT_USER_ID,
        ],
      },
    },
  });

  // ── Seed ──────────────────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_SR_BIZ_ID,
      name: 'E2E Summary Readiness Business',
      slug: 'e2e-summary-readiness-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_SR_OWNER_USER_ID,
      phoneNormalized: '+19990005001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const ownerBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      userId: ownerUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_SR_MGR_USER_ID,
      phoneNormalized: '+19990005002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      userId: managerUser.id,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_SR_MBR_USER_ID,
      phoneNormalized: '+19990005003',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      userId: memberUser.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_SR_OUT_USER_ID,
      phoneNormalized: '+19990005004',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // Services: 1 active + 1 inactive → servicesCount=2, activeServicesCount=1
  await prisma.service.create({
    data: {
      id: E2E_SR_SVC_ACTIVE_ID,
      businessId: E2E_SR_BIZ_ID,
      name: 'Active Service',
      durationMinutes: 30,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

  await prisma.service.create({
    data: {
      id: E2E_SR_SVC_INACT_ID,
      businessId: E2E_SR_BIZ_ID,
      name: 'Inactive Service',
      durationMinutes: 60,
      isActive: false,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

  // Customers: 1 ACTIVE + 1 BLOCKED → customersCount=2, activeCustomersCount=1
  await prisma.customerProfile.create({
    data: {
      id: E2E_SR_PROFILE_1_ID,
      fullName: 'Active Customer',
      phoneNormalized: '+19990005010',
    },
  });

  await prisma.businessCustomer.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      customerProfileId: E2E_SR_PROFILE_1_ID,
      status: 'ACTIVE',
    },
  });

  await prisma.customerProfile.create({
    data: {
      id: E2E_SR_PROFILE_2_ID,
      fullName: 'Blocked Customer',
      phoneNormalized: '+19990005011',
    },
  });

  await prisma.businessCustomer.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      customerProfileId: E2E_SR_PROFILE_2_ID,
      status: 'BLOCKED',
    },
  });

  // One active ServiceProvider linked to the active service.
  // Business working hours + SP working hours added so all 7 readiness checks pass.
  const sp = await prisma.serviceProvider.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      businessUserId: ownerBU.id,
      displayName: 'E2E Provider',
      isActive: true,
      services: {
        create: [{ serviceId: E2E_SR_SVC_ACTIVE_ID }],
      },
    },
  });

  await prisma.businessWorkingHour.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '18:00',
      isClosed: false,
    },
  });

  await prisma.serviceProviderWorkingHour.create({
    data: {
      businessId: E2E_SR_BIZ_ID,
      serviceProviderId: sp.id,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '18:00',
      isClosed: false,
    },
  });
});

afterAll(async () => {
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.serviceProvider.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.service.deleteMany({ where: { businessId: E2E_SR_BIZ_ID } });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: { in: [E2E_SR_PROFILE_1_ID, E2E_SR_PROFILE_2_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: E2E_SR_BIZ_ID },
  });
  await prisma.business.deleteMany({ where: { id: E2E_SR_BIZ_ID } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_SR_OWNER_USER_ID,
          E2E_SR_MGR_USER_ID,
          E2E_SR_MBR_USER_ID,
          E2E_SR_OUT_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── GET /dashboard/businesses/:businessId/summary ────────────────────────────

describe('GET /dashboard/businesses/:businessId/summary', () => {
  it('owner returns 200 with correct counts', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/summary`)
      .expect(200);

    expect(res.body).toMatchObject<SummaryDto>({
      servicesCount: 2,
      activeServicesCount: 1,
      customersCount: 2,
      activeCustomersCount: 1,
    });
  });

  it('manager returns 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/summary`)
      .expect(200);

    const body = res.body as SummaryDto;
    expect(body.servicesCount).toBe(2);
    expect(body.activeServicesCount).toBe(1);
  });

  it('member returns 200', async () => {
    // assertAccess allows any BusinessUser regardless of role
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/summary`)
      .expect(200);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/summary`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/summary`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get('/dashboard/businesses/00000000-0000-4000-8000-000000000000/summary')
      .expect(403);
  });
});

// ─── GET /dashboard/businesses/:businessId/readiness ─────────────────────────

describe('GET /dashboard/businesses/:businessId/readiness', () => {
  it('owner returns 200 with correct readiness shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/readiness`)
      .expect(200);

    expect(res.body).toMatchObject<BusinessReadinessDto>({
      hasActiveServiceProviders: true,
      hasActiveService: true,
      isReady: true,
      checks: {
        hasActiveOwner: true,
        hasActiveService: true,
        hasActiveServiceProvider: true,
        hasBusinessWorkingHours: true,
        allActiveProvidersHaveWorkingHours: true,
        allActiveProvidersHaveActiveServiceAssignment: true,
        allActiveServicesHaveActiveProviderAssignment: true,
      },
      blockingReasons: [],
    });
  });

  it('manager returns 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/readiness`)
      .expect(200);

    const body = res.body as BusinessReadinessDto;
    expect(body.isReady).toBe(true);
    expect(body.blockingReasons).toHaveLength(0);
    expect(body.checks.hasActiveOwner).toBe(true);
    expect(body.checks.hasActiveServiceProvider).toBe(true);
  });

  it('member returns 200', async () => {
    // assertAccess allows any BusinessUser regardless of role
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/readiness`)
      .expect(200);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/readiness`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SR_BIZ_ID}/readiness`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/readiness',
      )
      .expect(403);
  });
});
