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

// ─── Stable IDs — hex-only prefix e2e91XXX ───────────────────────────────────
// Test 1: No active owner → hasActiveOwner=false
const T1_BIZ = 'e2e91001-0000-4000-8000-000000000001';
const T1_MGR_USER = 'e2e91001-0000-4000-8000-000000000002';
const T1_OWN_USER = 'e2e91001-0000-4000-8000-000000000003';
const T1_MGR_PHONE = '+19990091011';
const T1_OWN_PHONE = '+19990091012';

// Test 2: No active services → hasActiveService=false
const T2_BIZ = 'e2e91002-0000-4000-8000-000000000001';
const T2_OWN_USER = 'e2e91002-0000-4000-8000-000000000002';
const T2_OWN_PHONE = '+19990091021';

// Test 3: No active service providers → hasActiveServiceProvider=false
const T3_BIZ = 'e2e91003-0000-4000-8000-000000000001';
const T3_OWN_USER = 'e2e91003-0000-4000-8000-000000000002';
const T3_SVC = 'e2e91003-0000-4000-8000-000000000010';
const T3_OWN_PHONE = '+19990091031';

// Test 4: No business working hours → hasBusinessWorkingHours=false
const T4_BIZ = 'e2e91004-0000-4000-8000-000000000001';
const T4_OWN_USER = 'e2e91004-0000-4000-8000-000000000002';
const T4_OWN_PHONE = '+19990091041';

// Test 5: Active SP with no SP working hours → allActiveProvidersHaveWorkingHours=false
const T5_BIZ = 'e2e91005-0000-4000-8000-000000000001';
const T5_OWN_USER = 'e2e91005-0000-4000-8000-000000000002';
const T5_SVC = 'e2e91005-0000-4000-8000-000000000010';
const T5_OWN_PHONE = '+19990091051';

// Test 6: Active SP with no active service assignment → allActiveProvidersHaveActiveServiceAssignment=false
const T6_BIZ = 'e2e91006-0000-4000-8000-000000000001';
const T6_OWN_USER = 'e2e91006-0000-4000-8000-000000000002';
const T6_OWN_PHONE = '+19990091061';

// Test 7: Active service with no active SP assignment → allActiveServicesHaveActiveProviderAssignment=false
const T7_BIZ = 'e2e91007-0000-4000-8000-000000000001';
const T7_OWN_USER = 'e2e91007-0000-4000-8000-000000000002';
const T7_SVC = 'e2e91007-0000-4000-8000-000000000010';
const T7_OWN_PHONE = '+19990091071';

// Test 8: Fully configured, single provider → isReady=true
const T8_BIZ = 'e2e91008-0000-4000-8000-000000000001';
const T8_OWN_USER = 'e2e91008-0000-4000-8000-000000000002';
const T8_SVC = 'e2e91008-0000-4000-8000-000000000010';
const T8_OWN_PHONE = '+19990091081';

// Test 9: Fully configured, multi-provider → isReady=true
const T9_BIZ = 'e2e91009-0000-4000-8000-000000000001';
const T9_OWN_USER = 'e2e91009-0000-4000-8000-000000000002';
const T9_MBR_USER = 'e2e91009-0000-4000-8000-000000000003';
const T9_SVC1 = 'e2e91009-0000-4000-8000-000000000010';
const T9_SVC2 = 'e2e91009-0000-4000-8000-000000000011';
const T9_OWN_PHONE = '+19990091091';
const T9_MBR_PHONE = '+19990091092';

// Test 10: Multi-provider, one SP has no working hours → allActiveProvidersHaveWorkingHours=false
const T10_BIZ = 'e2e9100a-0000-4000-8000-000000000001';
const T10_OWN_USER = 'e2e9100a-0000-4000-8000-000000000002';
const T10_MBR_USER = 'e2e9100a-0000-4000-8000-000000000003';
const T10_SVC = 'e2e9100a-0000-4000-8000-000000000010';
const T10_OWN_PHONE = '+19990091101';
const T10_MBR_PHONE = '+19990091102';

// ─── Shared module-level setup ────────────────────────────────────────────────

let app: INestApplication<App>;
let prisma: PrismaService;

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
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── Test 1: No active owner ──────────────────────────────────────────────────

describe('readiness: no active owner', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: T1_BIZ } });
    await prisma.business.deleteMany({ where: { id: T1_BIZ } });
    await prisma.user.deleteMany({
      where: { id: { in: [T1_MGR_USER, T1_OWN_USER] } },
    });

    await prisma.business.create({
      data: {
        id: T1_BIZ,
        name: 'T1 No Owner',
        slug: 'e2e-rdn-t1',
        status: 'TRIAL',
      },
    });

    callerUser = await prisma.user.create({
      data: {
        id: T1_MGR_USER,
        phoneNormalized: T1_MGR_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: T1_BIZ,
        userId: T1_MGR_USER,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: T1_OWN_USER,
        phoneNormalized: T1_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: T1_BIZ,
        userId: T1_OWN_USER,
        role: 'OWNER',
        status: 'INVITED',
      },
    });
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: T1_BIZ } });
    await prisma.business.deleteMany({ where: { id: T1_BIZ } });
    await prisma.user.deleteMany({
      where: { id: { in: [T1_MGR_USER, T1_OWN_USER] } },
    });
  });

  it('hasActiveOwner is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T1_BIZ}/readiness`)
      .expect(200);

    expect(
      (res.body as { checks: { hasActiveOwner: boolean } }).checks
        .hasActiveOwner,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 2: No active services ──────────────────────────────────────────────

describe('readiness: no active services', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: T2_BIZ } });
    await prisma.business.deleteMany({ where: { id: T2_BIZ } });
    await prisma.user.deleteMany({ where: { id: T2_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T2_BIZ,
        name: 'T2 No Services',
        slug: 'e2e-rdn-t2',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T2_OWN_USER,
        phoneNormalized: T2_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: T2_BIZ,
        userId: T2_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: T2_BIZ } });
    await prisma.business.deleteMany({ where: { id: T2_BIZ } });
    await prisma.user.deleteMany({ where: { id: T2_OWN_USER } });
  });

  it('hasActiveService is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T2_BIZ}/readiness`)
      .expect(200);

    expect(
      (res.body as { checks: { hasActiveService: boolean } }).checks
        .hasActiveService,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 3: No active service providers ─────────────────────────────────────

describe('readiness: no active service providers', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.service.deleteMany({ where: { id: T3_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T3_BIZ } });
    await prisma.business.deleteMany({ where: { id: T3_BIZ } });
    await prisma.user.deleteMany({ where: { id: T3_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T3_BIZ,
        name: 'T3 No SPs',
        slug: 'e2e-rdn-t3',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T3_OWN_USER,
        phoneNormalized: T3_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: T3_BIZ,
        userId: T3_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    await prisma.service.create({
      data: {
        id: T3_SVC,
        businessId: T3_BIZ,
        name: 'Active Svc',
        durationMinutes: 30,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { id: T3_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T3_BIZ } });
    await prisma.business.deleteMany({ where: { id: T3_BIZ } });
    await prisma.user.deleteMany({ where: { id: T3_OWN_USER } });
  });

  it('hasActiveServiceProvider is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T3_BIZ}/readiness`)
      .expect(200);

    expect(
      (res.body as { checks: { hasActiveServiceProvider: boolean } }).checks
        .hasActiveServiceProvider,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 4: No business working hours ───────────────────────────────────────

describe('readiness: no business working hours', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: T4_BIZ } });
    await prisma.business.deleteMany({ where: { id: T4_BIZ } });
    await prisma.user.deleteMany({ where: { id: T4_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T4_BIZ,
        name: 'T4 No Hours',
        slug: 'e2e-rdn-t4',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T4_OWN_USER,
        phoneNormalized: T4_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: T4_BIZ,
        userId: T4_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    // Intentionally no BusinessWorkingHour records
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: T4_BIZ } });
    await prisma.business.deleteMany({ where: { id: T4_BIZ } });
    await prisma.user.deleteMany({ where: { id: T4_OWN_USER } });
  });

  it('hasBusinessWorkingHours is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T4_BIZ}/readiness`)
      .expect(200);

    expect(
      (res.body as { checks: { hasBusinessWorkingHours: boolean } }).checks
        .hasBusinessWorkingHours,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 5: Active SP with no SP working hours ───────────────────────────────

describe('readiness: active SP has no working hours', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T5_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T5_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T5_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T5_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T5_BIZ } });
    await prisma.business.deleteMany({ where: { id: T5_BIZ } });
    await prisma.user.deleteMany({ where: { id: T5_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T5_BIZ,
        name: 'T5 SP No Hours',
        slug: 'e2e-rdn-t5',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T5_OWN_USER,
        phoneNormalized: T5_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: T5_BIZ,
        userId: T5_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    await prisma.service.create({
      data: {
        id: T5_SVC,
        businessId: T5_BIZ,
        name: 'Active Svc',
        durationMinutes: 30,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: T5_BIZ,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
    // Active SP linked to service but NO SP working hours
    await prisma.serviceProvider.create({
      data: {
        businessId: T5_BIZ,
        businessUserId: ownerBU.id,
        displayName: 'T5 Provider',
        isActive: true,
        services: { create: [{ serviceId: T5_SVC }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T5_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T5_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T5_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T5_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T5_BIZ } });
    await prisma.business.deleteMany({ where: { id: T5_BIZ } });
    await prisma.user.deleteMany({ where: { id: T5_OWN_USER } });
  });

  it('allActiveProvidersHaveWorkingHours is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T5_BIZ}/readiness`)
      .expect(200);

    expect(
      (res.body as { checks: { allActiveProvidersHaveWorkingHours: boolean } })
        .checks.allActiveProvidersHaveWorkingHours,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 6: Active SP has no active service assignment ───────────────────────

describe('readiness: active SP has no active service assignment', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T6_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T6_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T6_BIZ },
    });
    await prisma.businessUser.deleteMany({ where: { businessId: T6_BIZ } });
    await prisma.business.deleteMany({ where: { id: T6_BIZ } });
    await prisma.user.deleteMany({ where: { id: T6_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T6_BIZ,
        name: 'T6 SP No Svc',
        slug: 'e2e-rdn-t6',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T6_OWN_USER,
        phoneNormalized: T6_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: T6_BIZ,
        userId: T6_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: T6_BIZ,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
    // Active SP with SP working hours but NO service links
    const sp = await prisma.serviceProvider.create({
      data: {
        businessId: T6_BIZ,
        businessUserId: ownerBU.id,
        displayName: 'T6 Provider',
        isActive: true,
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: T6_BIZ,
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
      where: { businessId: T6_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T6_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T6_BIZ },
    });
    await prisma.businessUser.deleteMany({ where: { businessId: T6_BIZ } });
    await prisma.business.deleteMany({ where: { id: T6_BIZ } });
    await prisma.user.deleteMany({ where: { id: T6_OWN_USER } });
  });

  it('allActiveProvidersHaveActiveServiceAssignment is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T6_BIZ}/readiness`)
      .expect(200);

    expect(
      (
        res.body as {
          checks: { allActiveProvidersHaveActiveServiceAssignment: boolean };
        }
      ).checks.allActiveProvidersHaveActiveServiceAssignment,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 7: Active service has no active SP assignment ───────────────────────

describe('readiness: active service has no active SP assignment', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T7_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T7_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T7_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T7_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T7_BIZ } });
    await prisma.business.deleteMany({ where: { id: T7_BIZ } });
    await prisma.user.deleteMany({ where: { id: T7_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T7_BIZ,
        name: 'T7 Svc No SP',
        slug: 'e2e-rdn-t7',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T7_OWN_USER,
        phoneNormalized: T7_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: T7_BIZ,
        userId: T7_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: T7_BIZ,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
    // Active service with NO active SP assigned to it
    await prisma.service.create({
      data: {
        id: T7_SVC,
        businessId: T7_BIZ,
        name: 'Unassigned Svc',
        durationMinutes: 30,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T7_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T7_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T7_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T7_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T7_BIZ } });
    await prisma.business.deleteMany({ where: { id: T7_BIZ } });
    await prisma.user.deleteMany({ where: { id: T7_OWN_USER } });
  });

  it('allActiveServicesHaveActiveProviderAssignment is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T7_BIZ}/readiness`)
      .expect(200);

    expect(
      (
        res.body as {
          checks: { allActiveServicesHaveActiveProviderAssignment: boolean };
        }
      ).checks.allActiveServicesHaveActiveProviderAssignment,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── Test 8: Fully configured single-provider → isReady=true ─────────────────

describe('readiness: fully configured single-provider business', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T8_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T8_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T8_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T8_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T8_BIZ } });
    await prisma.business.deleteMany({ where: { id: T8_BIZ } });
    await prisma.user.deleteMany({ where: { id: T8_OWN_USER } });

    await prisma.business.create({
      data: {
        id: T8_BIZ,
        name: 'T8 Fully Config',
        slug: 'e2e-rdn-t8',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T8_OWN_USER,
        phoneNormalized: T8_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: T8_BIZ,
        userId: T8_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    await prisma.service.create({
      data: {
        id: T8_SVC,
        businessId: T8_BIZ,
        name: 'Active Svc',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: T8_BIZ,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
    const sp = await prisma.serviceProvider.create({
      data: {
        businessId: T8_BIZ,
        businessUserId: ownerBU.id,
        displayName: 'T8 Provider',
        isActive: true,
        services: { create: [{ serviceId: T8_SVC }] },
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: T8_BIZ,
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
      where: { businessId: T8_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T8_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T8_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T8_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T8_BIZ } });
    await prisma.business.deleteMany({ where: { id: T8_BIZ } });
    await prisma.user.deleteMany({ where: { id: T8_OWN_USER } });
  });

  it('all checks pass and isReady is true', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T8_BIZ}/readiness`)
      .expect(200);

    const body = res.body as {
      isReady: boolean;
      blockingReasons: string[];
      checks: Record<string, boolean>;
    };
    expect(body.isReady).toBe(true);
    expect(body.blockingReasons).toHaveLength(0);
    expect(body.checks.hasActiveOwner).toBe(true);
    expect(body.checks.hasActiveService).toBe(true);
    expect(body.checks.hasActiveServiceProvider).toBe(true);
    expect(body.checks.hasBusinessWorkingHours).toBe(true);
    expect(body.checks.allActiveProvidersHaveWorkingHours).toBe(true);
    expect(body.checks.allActiveProvidersHaveActiveServiceAssignment).toBe(
      true,
    );
    expect(body.checks.allActiveServicesHaveActiveProviderAssignment).toBe(
      true,
    );
  });
});

// ─── Test 9: Fully configured multi-provider → isReady=true ──────────────────

describe('readiness: fully configured multi-provider business', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T9_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T9_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T9_BIZ },
    });
    await prisma.service.deleteMany({
      where: { id: { in: [T9_SVC1, T9_SVC2] } },
    });
    await prisma.businessUser.deleteMany({ where: { businessId: T9_BIZ } });
    await prisma.business.deleteMany({ where: { id: T9_BIZ } });
    await prisma.user.deleteMany({
      where: { id: { in: [T9_OWN_USER, T9_MBR_USER] } },
    });

    await prisma.business.create({
      data: {
        id: T9_BIZ,
        name: 'T9 Multi Provider',
        slug: 'e2e-rdn-t9',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T9_OWN_USER,
        phoneNormalized: T9_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: T9_BIZ,
        userId: T9_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    const mbrUser = await prisma.user.create({
      data: {
        id: T9_MBR_USER,
        phoneNormalized: T9_MBR_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const mbrBU = await prisma.businessUser.create({
      data: {
        businessId: T9_BIZ,
        userId: mbrUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    await prisma.service.create({
      data: {
        id: T9_SVC1,
        businessId: T9_BIZ,
        name: 'Svc 1',
        durationMinutes: 30,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.service.create({
      data: {
        id: T9_SVC2,
        businessId: T9_BIZ,
        name: 'Svc 2',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: T9_BIZ,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    const sp1 = await prisma.serviceProvider.create({
      data: {
        businessId: T9_BIZ,
        businessUserId: ownerBU.id,
        displayName: 'T9 Provider 1',
        isActive: true,
        services: { create: [{ serviceId: T9_SVC1 }] },
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: T9_BIZ,
        serviceProviderId: sp1.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    const sp2 = await prisma.serviceProvider.create({
      data: {
        businessId: T9_BIZ,
        businessUserId: mbrBU.id,
        displayName: 'T9 Provider 2',
        isActive: true,
        services: { create: [{ serviceId: T9_SVC2 }] },
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: T9_BIZ,
        serviceProviderId: sp2.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T9_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T9_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T9_BIZ },
    });
    await prisma.service.deleteMany({
      where: { id: { in: [T9_SVC1, T9_SVC2] } },
    });
    await prisma.businessUser.deleteMany({ where: { businessId: T9_BIZ } });
    await prisma.business.deleteMany({ where: { id: T9_BIZ } });
    await prisma.user.deleteMany({
      where: { id: { in: [T9_OWN_USER, T9_MBR_USER] } },
    });
  });

  it('all checks pass and isReady is true', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T9_BIZ}/readiness`)
      .expect(200);

    expect((res.body as { isReady: boolean }).isReady).toBe(true);
    expect(
      (res.body as { blockingReasons: string[] }).blockingReasons,
    ).toHaveLength(0);
  });
});

// ─── Test 10: Multi-provider, one SP has no working hours → isReady=false ────

describe('readiness: multi-provider with one SP missing working hours', () => {
  let callerUser: User;

  beforeAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T10_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T10_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T10_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T10_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T10_BIZ } });
    await prisma.business.deleteMany({ where: { id: T10_BIZ } });
    await prisma.user.deleteMany({
      where: { id: { in: [T10_OWN_USER, T10_MBR_USER] } },
    });

    await prisma.business.create({
      data: {
        id: T10_BIZ,
        name: 'T10 Partial SP Hours',
        slug: 'e2e-rdn-t10',
        status: 'TRIAL',
      },
    });
    callerUser = await prisma.user.create({
      data: {
        id: T10_OWN_USER,
        phoneNormalized: T10_OWN_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: T10_BIZ,
        userId: T10_OWN_USER,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    const mbrUser = await prisma.user.create({
      data: {
        id: T10_MBR_USER,
        phoneNormalized: T10_MBR_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const mbrBU = await prisma.businessUser.create({
      data: {
        businessId: T10_BIZ,
        userId: mbrUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    await prisma.service.create({
      data: {
        id: T10_SVC,
        businessId: T10_BIZ,
        name: 'Shared Svc',
        durationMinutes: 45,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: T10_BIZ,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    // SP1: has working hours (complete)
    const sp1 = await prisma.serviceProvider.create({
      data: {
        businessId: T10_BIZ,
        businessUserId: ownerBU.id,
        displayName: 'T10 SP1 (complete)',
        isActive: true,
        services: { create: [{ serviceId: T10_SVC }] },
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: T10_BIZ,
        serviceProviderId: sp1.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    // SP2: NO working hours (incomplete)
    await prisma.serviceProvider.create({
      data: {
        businessId: T10_BIZ,
        businessUserId: mbrBU.id,
        displayName: 'T10 SP2 (no hours)',
        isActive: true,
        services: { create: [{ serviceId: T10_SVC }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: T10_BIZ },
    });
    await prisma.serviceProvider.deleteMany({ where: { businessId: T10_BIZ } });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: T10_BIZ },
    });
    await prisma.service.deleteMany({ where: { id: T10_SVC } });
    await prisma.businessUser.deleteMany({ where: { businessId: T10_BIZ } });
    await prisma.business.deleteMany({ where: { id: T10_BIZ } });
    await prisma.user.deleteMany({
      where: { id: { in: [T10_OWN_USER, T10_MBR_USER] } },
    });
  });

  it('allActiveProvidersHaveWorkingHours is false and isReady is false', async () => {
    MockClerkAuthGuard.currentUser = callerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${T10_BIZ}/readiness`)
      .expect(200);

    expect(
      (res.body as { checks: { allActiveProvidersHaveWorkingHours: boolean } })
        .checks.allActiveProvidersHaveWorkingHours,
    ).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});
