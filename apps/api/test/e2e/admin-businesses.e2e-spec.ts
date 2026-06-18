import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClerkAuthGuard } from '../../src/auth/guards/clerk-auth.guard';
import { AdminModule } from '../../src/admin/admin.module';
import { DashboardModule } from '../../src/dashboard/dashboard.module';
import { PublicModule } from '../../src/public/public.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { User } from '../../src/generated/prisma/client';
import {
  BusinessStatus,
  BusinessUserRole,
  BusinessUserStatus,
} from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2e20000 ────────────────────────────────────
const E2E_ADMIN_BIZ_ID = 'e2e20000-0000-4000-8000-000000000001';
const E2E_ADMIN_OWNED_BIZ_ID = 'e2e20000-0000-4000-8000-000000000002';
const E2E_ADMIN_USER_ID = 'e2e20000-0000-4000-8000-000000000003';
const E2E_ADMIN_REG_USER_ID = 'e2e20000-0000-4000-8000-000000000004';
const E2E_ADMIN_EXISTING_OWNER_USER_ID = 'e2e20000-0000-4000-8000-000000000005';
// Regression: owner ACTIVE + dashboard access
const E2E_ADMIN_REGRESSION_BIZ_ID = 'e2e20000-0000-4000-8000-000000000006';
// DRAFT → TRIAL status transition tests
const E2E_ADMIN_DRAFT_BIZ_ID = 'e2e20000-0000-4000-8000-000000000007';
const E2E_ADMIN_DRAFT_BIZ_SLUG = 'e2e-admin-draft-trial-biz';
const E2E_ADMIN_DRAFT_OWNER_ID = 'e2e20000-0000-4000-8000-000000000008';
// Admin ServiceProvider creation tests
const E2E_ADMIN_SP_BIZ_ID = 'e2e20000-0000-4000-8000-000000000009';
const E2E_ADMIN_SP_OWNER_USER_ID = 'e2e20000-0000-4000-8000-000000000010';
const E2E_ADMIN_SP_MEMBER_USER_ID = 'e2e20000-0000-4000-8000-000000000011';
const E2E_ADMIN_SP_DUP_USER_ID = 'e2e20000-0000-4000-8000-000000000012';
const E2E_ADMIN_SP_INACT_SVC_USER_ID = 'e2e20000-0000-4000-8000-000000000013';
const E2E_ADMIN_SP_ACTIVE_SVC_ID = 'e2e20000-0000-4000-8000-000000000014';
const E2E_ADMIN_SP_INACTIVE_SVC_ID = 'e2e20000-0000-4000-8000-000000000015';

// Admin readiness tests
const E2E_ADMIN_RDN_BIZ_ID = 'e2e20000-0000-4000-8000-000000000016';
const E2E_ADMIN_RDN_OWN_USER_ID = 'e2e20000-0000-4000-8000-000000000017';
// Admin TRIAL → ACTIVE activation tests (fully configured business)
const E2E_ADMIN_ACTIVE_BIZ_ID = 'e2e20000-0000-4000-8000-000000000018';
const E2E_ADMIN_ACTIVE_BIZ_SLUG = 'e2e-admin-activation-biz';
const E2E_ADMIN_ACTIVE_OWN_USER_ID = 'e2e20000-0000-4000-8000-000000000019';
const E2E_ADMIN_ACTIVE_SVC_ID = 'e2e20000-0000-4000-8000-000000000020';
// Admin create service tests
const E2E_ADMIN_CSVC_BIZ_ID = 'e2e20000-0000-4000-8000-000000000029'; // DRAFT biz A
const E2E_ADMIN_CSVC_BIZ_B_ID = 'e2e20000-0000-4000-8000-000000000030'; // TRIAL biz B (isolation)
const E2E_ADMIN_CSVC_OWNER_ID = 'e2e20000-0000-4000-8000-000000000031';
const E2E_ADMIN_CSVC_OWNER_B_ID = 'e2e20000-0000-4000-8000-000000000032';
// Admin set SP working hours tests (B.4)
const E2E_ADMIN_SPWH_BIZ_ID = 'e2e20000-0000-4000-8000-000000000041';
const E2E_ADMIN_SPWH_BIZ_B_ID = 'e2e20000-0000-4000-8000-000000000042';
const E2E_ADMIN_SPWH_OWNER_ID = 'e2e20000-0000-4000-8000-000000000043';
const E2E_ADMIN_SPWH_OWNER_B_ID = 'e2e20000-0000-4000-8000-000000000044';
const E2E_ADMIN_SPWH_SVC_ID = 'e2e20000-0000-4000-8000-000000000045';
const E2E_ADMIN_SPWH_SVC_B_ID = 'e2e20000-0000-4000-8000-000000000046';
// Admin set business working hours tests (B.3)
const E2E_ADMIN_BWH_BIZ_ID = 'e2e20000-0000-4000-8000-000000000037';
const E2E_ADMIN_BWH_BIZ_B_ID = 'e2e20000-0000-4000-8000-000000000038';
const E2E_ADMIN_BWH_OWNER_ID = 'e2e20000-0000-4000-8000-000000000039';
const E2E_ADMIN_BWH_OWNER_B_ID = 'e2e20000-0000-4000-8000-000000000040';
// Admin add business user tests (B.2)
const E2E_ADMIN_ABU_BIZ_ID = 'e2e20000-0000-4000-8000-000000000033';
const E2E_ADMIN_ABU_BIZ_B_ID = 'e2e20000-0000-4000-8000-000000000034';
const E2E_ADMIN_ABU_OWNER_ID = 'e2e20000-0000-4000-8000-000000000035';
const E2E_ADMIN_ABU_OWNER_B_ID = 'e2e20000-0000-4000-8000-000000000036';
// Admin publicBookingEnabled toggle tests
const E2E_ADMIN_PB_TRIAL_BIZ_ID = 'e2e20000-0000-4000-8000-000000000021';
const E2E_ADMIN_PB_TRIAL_SLUG = 'e2e-admin-pb-trial-biz';
const E2E_ADMIN_PB_ACTIVE_BIZ_ID = 'e2e20000-0000-4000-8000-000000000022';
const E2E_ADMIN_PB_ACTIVE_SLUG = 'e2e-admin-pb-active-biz';
const E2E_ADMIN_PB_DRAFT_BIZ_ID = 'e2e20000-0000-4000-8000-000000000023';
const E2E_ADMIN_PB_NOREADY_TRIAL_BIZ_ID =
  'e2e20000-0000-4000-8000-000000000024';
const E2E_ADMIN_PB_NOREADY_ACTIVE_BIZ_ID =
  'e2e20000-0000-4000-8000-000000000025';
const E2E_ADMIN_PB_OWNER_USER_ID = 'e2e20000-0000-4000-8000-000000000026';
const E2E_ADMIN_PB_TRIAL_SVC_ID = 'e2e20000-0000-4000-8000-000000000027';
const E2E_ADMIN_PB_ACTIVE_SVC_ID = 'e2e20000-0000-4000-8000-000000000028';

const ADMIN_PHONE = '+19990002001';
const REG_PHONE = '+19990002002';
const EXISTING_OWNER_PHONE = '+19990002003';
const DRAFT_OWNER_PHONE = '+19990002004';
const ADMIN_SP_OWNER_PHONE = '+19990002030';
const ADMIN_SP_MEMBER_PHONE = '+19990002031';
const ADMIN_SP_DUP_PHONE = '+19990002032';
const ADMIN_SP_INACT_SVC_PHONE = '+19990002033';
const ADMIN_CSVC_OWNER_PHONE = '+19990002060';
const ADMIN_CSVC_OWNER_B_PHONE = '+19990002061';
const ADMIN_BWH_OWNER_PHONE = '+19990002080';
const ADMIN_BWH_OWNER_B_PHONE = '+19990002081';
const ADMIN_SPWH_OWNER_PHONE = '+19990002082';
const ADMIN_SPWH_OWNER_B_PHONE = '+19990002083';
const ADMIN_ABU_OWNER_PHONE = '+19990002070';
const ADMIN_ABU_OWNER_B_PHONE = '+19990002071';
const ADMIN_ABU_MANAGER_PHONE = '+19990002072';
const ADMIN_ABU_MEMBER_PHONE = '+19990002073';
const ADMIN_ABU_DUP_PHONE = '+19990002074';
const ADMIN_ABU_CROSS_BIZ_PHONE = '+19990002075';
const ADMIN_ABU_T11_PHONE = '+19990002076';
const ADMIN_ABU_T12_PHONE = '+19990002077';
const ADMIN_ABU_T13_PHONE = '+19990002078';
const ALL_ABU_TEST_PHONES = [
  ADMIN_ABU_MANAGER_PHONE,
  ADMIN_ABU_MEMBER_PHONE,
  ADMIN_ABU_DUP_PHONE,
  ADMIN_ABU_CROSS_BIZ_PHONE,
  ADMIN_ABU_T11_PHONE,
  ADMIN_ABU_T12_PHONE,
  ADMIN_ABU_T13_PHONE,
];
const ADMIN_RDN_OWNER_PHONE = '+19990002041';
const ADMIN_ACTIVE_OWNER_PHONE = '+19990002042';
const ADMIN_PB_OWNER_PHONE = '+19990002050';
// Created by POST success test — must be cleaned up
const CREATED_OWNER_PHONE = '+19990002010';
// Created by regression test — must be cleaned up
const REGRESSION_OWNER_PHONE = '+19990002011';

// ─── Shared module-level setup ────────────────────────────────────────────────

let app: INestApplication<App>;
let prisma: PrismaService;
let adminUser: User;
let regularUser: User;

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
      PrismaModule,
      AdminModule,
      DashboardModule,
      PublicModule,
    ],
  })
    .overrideGuard(ClerkAuthGuard)
    .useClass(MockClerkAuthGuard)
    .compile();

  app = await createTestApp(module);
  prisma = module.get(PrismaService);

  // ── Idempotent pre-cleanup ─────────────────────────────────────────────────
  await prisma.businessUser.deleteMany({
    where: {
      businessId: {
        in: [
          E2E_ADMIN_BIZ_ID,
          E2E_ADMIN_OWNED_BIZ_ID,
          E2E_ADMIN_REGRESSION_BIZ_ID,
          E2E_ADMIN_DRAFT_BIZ_ID,
        ],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      phoneNormalized: { in: [CREATED_OWNER_PHONE, REGRESSION_OWNER_PHONE] },
    },
  });
  await prisma.business.deleteMany({
    where: {
      id: {
        in: [
          E2E_ADMIN_BIZ_ID,
          E2E_ADMIN_OWNED_BIZ_ID,
          E2E_ADMIN_REGRESSION_BIZ_ID,
          E2E_ADMIN_DRAFT_BIZ_ID,
        ],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_ADMIN_USER_ID,
          E2E_ADMIN_REG_USER_ID,
          E2E_ADMIN_EXISTING_OWNER_USER_ID,
          E2E_ADMIN_DRAFT_OWNER_ID,
        ],
      },
    },
  });

  // ── Seed users ─────────────────────────────────────────────────────────────
  adminUser = await prisma.user.create({
    data: {
      id: E2E_ADMIN_USER_ID,
      phoneNormalized: ADMIN_PHONE,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
    },
  });

  regularUser = await prisma.user.create({
    data: {
      id: E2E_ADMIN_REG_USER_ID,
      phoneNormalized: REG_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const existingOwnerUser = await prisma.user.create({
    data: {
      id: E2E_ADMIN_EXISTING_OWNER_USER_ID,
      phoneNormalized: EXISTING_OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // ── Seed businesses ────────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_ADMIN_BIZ_ID,
      name: 'E2E Admin Business (no owner)',
      slug: 'e2e-admin-business-no-owner',
      status: 'TRIAL',
    },
  });

  await prisma.business.create({
    data: {
      id: E2E_ADMIN_OWNED_BIZ_ID,
      name: 'E2E Admin Business (already owned)',
      slug: 'e2e-admin-business-owned',
      status: 'TRIAL',
    },
  });

  // Regression: TRIAL so assertAccess allows dashboard reads once owner has ACTIVE status
  await prisma.business.create({
    data: {
      id: E2E_ADMIN_REGRESSION_BIZ_ID,
      name: 'E2E Admin Regression Business',
      slug: 'e2e-admin-regression-business',
      status: 'TRIAL',
    },
  });

  // DRAFT → TRIAL status transition tests
  await prisma.business.create({
    data: {
      id: E2E_ADMIN_DRAFT_BIZ_ID,
      name: 'E2E Admin Draft Business',
      slug: E2E_ADMIN_DRAFT_BIZ_SLUG,
      status: 'DRAFT',
    },
  });

  const draftOwnerUser = await prisma.user.create({
    data: {
      id: E2E_ADMIN_DRAFT_OWNER_ID,
      phoneNormalized: DRAFT_OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_ADMIN_DRAFT_BIZ_ID,
      userId: draftOwnerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_ADMIN_OWNED_BIZ_ID,
      userId: existingOwnerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
});

afterAll(async () => {
  await prisma.businessUser.deleteMany({
    where: {
      businessId: {
        in: [
          E2E_ADMIN_BIZ_ID,
          E2E_ADMIN_OWNED_BIZ_ID,
          E2E_ADMIN_REGRESSION_BIZ_ID,
          E2E_ADMIN_DRAFT_BIZ_ID,
        ],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      phoneNormalized: { in: [CREATED_OWNER_PHONE, REGRESSION_OWNER_PHONE] },
    },
  });
  await prisma.business.deleteMany({
    where: {
      id: {
        in: [
          E2E_ADMIN_BIZ_ID,
          E2E_ADMIN_OWNED_BIZ_ID,
          E2E_ADMIN_REGRESSION_BIZ_ID,
          E2E_ADMIN_DRAFT_BIZ_ID,
        ],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_ADMIN_USER_ID,
          E2E_ADMIN_REG_USER_ID,
          E2E_ADMIN_EXISTING_OWNER_USER_ID,
          E2E_ADMIN_DRAFT_OWNER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── POST /admin/businesses/:businessId/owner ─────────────────────────────────

describe('POST /admin/businesses/:businessId/owner', () => {
  it('admin + valid dto → 201 with BusinessUser shape', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_BIZ_ID}/owner`)
      .send({ phone: CREATED_OWNER_PHONE, email: 'newowner@example.com' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String) as string,
      businessId: E2E_ADMIN_BIZ_ID,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    });
  });

  it('non-admin user → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_BIZ_ID}/owner`)
      .send({ phone: '+19990002020', email: 'x@example.com' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_BIZ_ID}/owner`)
      .send({ phone: '+19990002021', email: 'x@example.com' })
      .expect(401);
  });

  it('missing phone → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_BIZ_ID}/owner`)
      .send({ email: 'x@example.com' })
      .expect(400);
  });

  it('invalid email format → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_BIZ_ID}/owner`)
      .send({ phone: '+19990002022', email: 'not-an-email' })
      .expect(400);
  });

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post('/admin/businesses/00000000-0000-4000-8000-000000000000/owner')
      .send({ phone: '+19990002023', email: 'x@example.com' })
      .expect(404);
  });

  it('business already has an owner → 409', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_OWNED_BIZ_ID}/owner`)
      .send({ phone: '+19990002024', email: 'x@example.com' })
      .expect(409);
  });
});

// ─── POST /admin/businesses ───────────────────────────────────────────────────

describe('POST /admin/businesses', () => {
  const CREATE_SLUG = 'e2e-admin-biz-create-test';

  beforeEach(async () => {
    await prisma.business.deleteMany({ where: { slug: CREATE_SLUG } });
  });

  afterEach(async () => {
    await prisma.business.deleteMany({ where: { slug: CREATE_SLUG } });
  });

  it('admin + valid body with timezone → 201, status DRAFT, publicBookingEnabled false, timezone persisted', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post('/admin/businesses')
      .send({
        name: 'Test Create Business',
        slug: CREATE_SLUG,
        timezone: 'Asia/Jerusalem',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'Test Create Business',
      slug: CREATE_SLUG,
      timezone: 'Asia/Jerusalem',
      status: BusinessStatus.DRAFT,
      publicBookingEnabled: false,
    });
  });

  it('missing timezone → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post('/admin/businesses')
      .send({ name: 'Test Create Business', slug: CREATE_SLUG })
      .expect(400);
  });

  it('empty timezone → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post('/admin/businesses')
      .send({ name: 'Test Create Business', slug: CREATE_SLUG, timezone: '' })
      .expect(400);
  });

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .post('/admin/businesses')
      .send({
        name: 'Test Create Business',
        slug: CREATE_SLUG,
        timezone: 'Asia/Jerusalem',
      })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/businesses')
      .send({
        name: 'Test Create Business',
        slug: CREATE_SLUG,
        timezone: 'Asia/Jerusalem',
      })
      .expect(401);
  });
});

// ─── PATCH /admin/businesses/:businessId/status ───────────────────────────────

describe('PATCH /admin/businesses/:businessId/status', () => {
  beforeEach(async () => {
    // Reset DRAFT business to DRAFT before each test so tests are independent
    await prisma.business.update({
      where: { id: E2E_ADMIN_DRAFT_BIZ_ID },
      data: { status: 'DRAFT', publicBookingEnabled: false },
    });
  });

  it('admin moves DRAFT business to TRIAL → 200, status is TRIAL', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: E2E_ADMIN_DRAFT_BIZ_ID,
      status: BusinessStatus.TRIAL,
    });
  });

  it('publicBookingEnabled remains false after DRAFT → TRIAL', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(false);
  });

  it('owner can access dashboard after DRAFT → TRIAL → 200', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    const ownerUser = await prisma.user.findUnique({
      where: { id: E2E_ADMIN_DRAFT_OWNER_ID },
    });
    MockClerkAuthGuard.currentUser = ownerUser!;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/services`)
      .expect(200);
  });

  it('public booking still returns 404 after DRAFT → TRIAL (publicBookingEnabled is false)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/public/businesses/${E2E_ADMIN_DRAFT_BIZ_SLUG}`)
      .expect(404);
  });

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(403);
  });

  it('unauthenticated → 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(401);
  });

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch('/admin/businesses/00000000-0000-4000-8000-000000000000/status')
      .send({ status: 'TRIAL' })
      .expect(404);
  });

  it('invalid status value (SUSPENDED) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'SUSPENDED' })
      .expect(400);
  });

  it('DRAFT → ACTIVE is forbidden → 409', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(409);
  });

  it('TRIAL → ACTIVE with failing readiness → 400', async () => {
    // E2E_ADMIN_BIZ_ID is already TRIAL in the seed and has no services — readiness fails
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(400);
  });

  it('business already in TRIAL → 409', async () => {
    // Move to TRIAL first
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    // Attempt again — must be 409
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(409);
  });
});

// ─── Regression: admin-created owner can access dashboard ─────────────────────

describe('admin-created owner status and dashboard access', () => {
  beforeEach(async () => {
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_REGRESSION_BIZ_ID },
    });
    await prisma.user.deleteMany({
      where: { phoneNormalized: REGRESSION_OWNER_PHONE },
    });
  });

  afterEach(async () => {
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_REGRESSION_BIZ_ID },
    });
    await prisma.user.deleteMany({
      where: { phoneNormalized: REGRESSION_OWNER_PHONE },
    });
  });

  it('admin-created owner has role OWNER and status ACTIVE', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_REGRESSION_BIZ_ID}/owner`)
      .send({
        phone: REGRESSION_OWNER_PHONE,
        email: 'regression-owner@example.com',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      businessId: E2E_ADMIN_REGRESSION_BIZ_ID,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    });
  });

  it('admin-created owner can access dashboard → 200', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_REGRESSION_BIZ_ID}/owner`)
      .send({
        phone: REGRESSION_OWNER_PHONE,
        email: 'regression-owner@example.com',
      })
      .expect(201);

    const ownerUser = await prisma.user.findUnique({
      where: { phoneNormalized: REGRESSION_OWNER_PHONE },
    });
    expect(ownerUser).not.toBeNull();

    MockClerkAuthGuard.currentUser = ownerUser!;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_REGRESSION_BIZ_ID}/services`)
      .expect(200);
  });
});

// ─── POST /admin/businesses/:businessId/service-providers ─────────────────────

describe('POST /admin/businesses/:businessId/service-providers', () => {
  let spOwnerBUId: string;
  let spMemberBUId: string;
  let spDupBUId: string;
  let spInactSvcBUId: string;

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.serviceProvider.deleteMany({
      where: { businessId: E2E_ADMIN_SP_BIZ_ID },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SP_ACTIVE_SVC_ID, E2E_ADMIN_SP_INACTIVE_SVC_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_SP_BIZ_ID },
    });
    await prisma.business.deleteMany({
      where: { id: E2E_ADMIN_SP_BIZ_ID },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            E2E_ADMIN_SP_OWNER_USER_ID,
            E2E_ADMIN_SP_MEMBER_USER_ID,
            E2E_ADMIN_SP_DUP_USER_ID,
            E2E_ADMIN_SP_INACT_SVC_USER_ID,
          ],
        },
      },
    });

    await prisma.business.create({
      data: {
        id: E2E_ADMIN_SP_BIZ_ID,
        name: 'E2E Admin SP Business',
        slug: 'e2e-admin-sp-business',
        status: 'TRIAL',
      },
    });

    const spOwnerUser = await prisma.user.create({
      data: {
        id: E2E_ADMIN_SP_OWNER_USER_ID,
        phoneNormalized: ADMIN_SP_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_SP_BIZ_ID,
        userId: spOwnerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    spOwnerBUId = ownerBU.id;

    const spMemberUser = await prisma.user.create({
      data: {
        id: E2E_ADMIN_SP_MEMBER_USER_ID,
        phoneNormalized: ADMIN_SP_MEMBER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const memberBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_SP_BIZ_ID,
        userId: spMemberUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    spMemberBUId = memberBU.id;

    const spDupUser = await prisma.user.create({
      data: {
        id: E2E_ADMIN_SP_DUP_USER_ID,
        phoneNormalized: ADMIN_SP_DUP_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const dupBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_SP_BIZ_ID,
        userId: spDupUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    spDupBUId = dupBU.id;

    const spInactSvcUser = await prisma.user.create({
      data: {
        id: E2E_ADMIN_SP_INACT_SVC_USER_ID,
        phoneNormalized: ADMIN_SP_INACT_SVC_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const inactSvcBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_SP_BIZ_ID,
        userId: spInactSvcUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    spInactSvcBUId = inactSvcBU.id;

    await prisma.service.create({
      data: {
        id: E2E_ADMIN_SP_ACTIVE_SVC_ID,
        businessId: E2E_ADMIN_SP_BIZ_ID,
        name: 'Active Service',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.service.create({
      data: {
        id: E2E_ADMIN_SP_INACTIVE_SVC_ID,
        businessId: E2E_ADMIN_SP_BIZ_ID,
        name: 'Inactive Service',
        durationMinutes: 30,
        isActive: false,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });

    // Pre-seed SP for duplicate test
    await prisma.serviceProvider.create({
      data: {
        businessId: E2E_ADMIN_SP_BIZ_ID,
        businessUserId: spDupBUId,
        displayName: 'Pre-seeded Duplicate SP',
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProvider.deleteMany({
      where: { businessId: E2E_ADMIN_SP_BIZ_ID },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SP_ACTIVE_SVC_ID, E2E_ADMIN_SP_INACTIVE_SVC_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_SP_BIZ_ID },
    });
    await prisma.business.deleteMany({
      where: { id: E2E_ADMIN_SP_BIZ_ID },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            E2E_ADMIN_SP_OWNER_USER_ID,
            E2E_ADMIN_SP_MEMBER_USER_ID,
            E2E_ADMIN_SP_DUP_USER_ID,
            E2E_ADMIN_SP_INACT_SVC_USER_ID,
          ],
        },
      },
    });
  });

  it('admin + valid body → 201 with correct ServiceProviderDto shape', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Admin Provider',
        businessUserId: spOwnerBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
        isActive: true,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String) as string,
      displayName: 'Admin Provider',
      isActive: true,
      businessUserId: spOwnerBUId,
      serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
  });

  it('admin + isActive: false → 201 with isActive false', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Inactive Admin Provider',
        businessUserId: spMemberBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
        isActive: false,
      })
      .expect(201);

    expect((res.body as { isActive: boolean }).isActive).toBe(false);
  });

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Provider',
        businessUserId: spInactSvcBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Provider',
        businessUserId: spInactSvcBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      })
      .expect(401);
  });

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(
        '/admin/businesses/00000000-0000-4000-8000-000000000000/service-providers',
      )
      .send({
        displayName: 'Provider',
        businessUserId: spInactSvcBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      })
      .expect(404);
  });

  it('missing displayName → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        businessUserId: spInactSvcBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      })
      .expect(400);
  });

  it('businessUserId not in this business → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Provider',
        businessUserId: '00000000-0000-4000-8000-000000000099',
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      })
      .expect(400);
  });

  it('duplicate businessUserId → 409', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Duplicate Provider',
        businessUserId: spDupBUId,
        serviceIds: [E2E_ADMIN_SP_ACTIVE_SVC_ID],
      })
      .expect(409);
  });

  it('linking inactive service to active ServiceProvider → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_SP_BIZ_ID}/service-providers`)
      .send({
        displayName: 'Provider',
        businessUserId: spInactSvcBUId,
        serviceIds: [E2E_ADMIN_SP_INACTIVE_SVC_ID],
        isActive: true,
      })
      .expect(400);
  });
});

// ─── GET /admin/businesses/:businessId/readiness ──────────────────────────────

describe('GET /admin/businesses/:businessId/readiness', () => {
  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_RDN_BIZ_ID },
    });
    await prisma.business.deleteMany({ where: { id: E2E_ADMIN_RDN_BIZ_ID } });
    await prisma.user.deleteMany({ where: { id: E2E_ADMIN_RDN_OWN_USER_ID } });

    await prisma.business.create({
      data: {
        id: E2E_ADMIN_RDN_BIZ_ID,
        name: 'E2E Admin Readiness Business',
        slug: 'e2e-admin-readiness-business',
        status: 'TRIAL',
      },
    });
    await prisma.user.create({
      data: {
        id: E2E_ADMIN_RDN_OWN_USER_ID,
        phoneNormalized: ADMIN_RDN_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_RDN_BIZ_ID,
        userId: E2E_ADMIN_RDN_OWN_USER_ID,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
    // No services seeded — hasActiveService will be false
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_RDN_BIZ_ID },
    });
    await prisma.business.deleteMany({ where: { id: E2E_ADMIN_RDN_BIZ_ID } });
    await prisma.user.deleteMany({ where: { id: E2E_ADMIN_RDN_OWN_USER_ID } });
  });

  it('admin → 200 with correct readiness shape', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_RDN_BIZ_ID}/readiness`)
      .expect(200);

    const body = res.body as Record<string, unknown>;
    expect(typeof body.isReady).toBe('boolean');
    expect(Array.isArray(body.blockingReasons)).toBe(true);
    expect(body.checks).toBeDefined();
    expect(typeof (body.checks as Record<string, unknown>).hasActiveOwner).toBe(
      'boolean',
    );
  });

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_RDN_BIZ_ID}/readiness`)
      .expect(403);
  });

  it('unauthenticated → 401', async () => {
    await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_RDN_BIZ_ID}/readiness`)
      .expect(401);
  });

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .get('/admin/businesses/00000000-0000-4000-8000-000000000000/readiness')
      .expect(404);
  });

  it('readiness reflects actual state: no active services → hasActiveService false', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_RDN_BIZ_ID}/readiness`)
      .expect(200);

    const checks = (res.body as { checks: Record<string, boolean> }).checks;
    expect(checks.hasActiveOwner).toBe(true);
    expect(checks.hasActiveService).toBe(false);
    expect((res.body as { isReady: boolean }).isReady).toBe(false);
  });
});

// ─── PATCH /admin/businesses/:businessId/status — TRIAL → ACTIVE (activation) ─

describe('PATCH status: TRIAL → ACTIVE (activation)', () => {
  let ownerUser: User;

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.serviceProvider.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.service.deleteMany({ where: { id: E2E_ADMIN_ACTIVE_SVC_ID } });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.business.deleteMany({
      where: { id: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.user.deleteMany({
      where: { id: E2E_ADMIN_ACTIVE_OWN_USER_ID },
    });

    // Seed a fully configured TRIAL business so all 7 readiness checks pass
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_ACTIVE_BIZ_ID,
        name: 'E2E Admin Activation Business',
        slug: E2E_ADMIN_ACTIVE_BIZ_SLUG,
        status: 'TRIAL',
        publicBookingEnabled: false,
      },
    });

    ownerUser = await prisma.user.create({
      data: {
        id: E2E_ADMIN_ACTIVE_OWN_USER_ID,
        phoneNormalized: ADMIN_ACTIVE_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_ACTIVE_BIZ_ID,
        userId: ownerUser.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });

    await prisma.service.create({
      data: {
        id: E2E_ADMIN_ACTIVE_SVC_ID,
        businessId: E2E_ADMIN_ACTIVE_BIZ_ID,
        name: 'Activation Test Service',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });

    await prisma.businessWorkingHour.create({
      data: {
        businessId: E2E_ADMIN_ACTIVE_BIZ_ID,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    const sp = await prisma.serviceProvider.create({
      data: {
        businessId: E2E_ADMIN_ACTIVE_BIZ_ID,
        businessUserId: ownerBU.id,
        displayName: 'Activation Test Provider',
        isActive: true,
        services: { create: [{ serviceId: E2E_ADMIN_ACTIVE_SVC_ID }] },
      },
    });

    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: E2E_ADMIN_ACTIVE_BIZ_ID,
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
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.serviceProvider.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.service.deleteMany({ where: { id: E2E_ADMIN_ACTIVE_SVC_ID } });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.business.deleteMany({
      where: { id: E2E_ADMIN_ACTIVE_BIZ_ID },
    });
    await prisma.user.deleteMany({
      where: { id: E2E_ADMIN_ACTIVE_OWN_USER_ID },
    });
  });

  beforeEach(async () => {
    // Reset to TRIAL before each test so each test starts from the same state
    await prisma.business.update({
      where: { id: E2E_ADMIN_ACTIVE_BIZ_ID },
      data: { status: 'TRIAL', publicBookingEnabled: false },
    });
  });

  it('TRIAL → ACTIVE with passing readiness → 200, status ACTIVE', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: E2E_ADMIN_ACTIVE_BIZ_ID,
      status: BusinessStatus.ACTIVE,
    });
  });

  it('publicBookingEnabled remains false after TRIAL → ACTIVE', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(false);
  });

  it('owner dashboard access works after TRIAL → ACTIVE', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/services`)
      .expect(200);
  });

  it('public booking still returns 404 after TRIAL → ACTIVE when publicBookingEnabled is false', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/public/businesses/${E2E_ADMIN_ACTIVE_BIZ_SLUG}`)
      .expect(404);
  });

  it('ACTIVE → ACTIVE → 409', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    // First request: TRIAL → ACTIVE succeeds
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    // Second request: ACTIVE → ACTIVE must fail with 409
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ACTIVE_BIZ_ID}/status`)
      .send({ status: 'ACTIVE' })
      .expect(409);
  });
});

// ─── PATCH /admin/businesses/:businessId/public-booking ───────────────────────

describe('PATCH /admin/businesses/:businessId/public-booking', () => {
  const ALL_PB_BIZ_IDS = [
    E2E_ADMIN_PB_TRIAL_BIZ_ID,
    E2E_ADMIN_PB_ACTIVE_BIZ_ID,
    E2E_ADMIN_PB_DRAFT_BIZ_ID,
    E2E_ADMIN_PB_NOREADY_TRIAL_BIZ_ID,
    E2E_ADMIN_PB_NOREADY_ACTIVE_BIZ_ID,
  ];

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.serviceProvider.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_PB_TRIAL_SVC_ID, E2E_ADMIN_PB_ACTIVE_SVC_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.user.deleteMany({ where: { id: E2E_ADMIN_PB_OWNER_USER_ID } });

    // Shared owner user
    const pbOwner = await prisma.user.create({
      data: {
        id: E2E_ADMIN_PB_OWNER_USER_ID,
        phoneNormalized: ADMIN_PB_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    // ── TRIAL fully-configured ────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_PB_TRIAL_BIZ_ID,
        name: 'E2E PB Trial Business',
        slug: E2E_ADMIN_PB_TRIAL_SLUG,
        status: 'TRIAL',
        publicBookingEnabled: false,
      },
    });
    const trialOwnerBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_PB_TRIAL_BIZ_ID,
        userId: pbOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
    await prisma.service.create({
      data: {
        id: E2E_ADMIN_PB_TRIAL_SVC_ID,
        businessId: E2E_ADMIN_PB_TRIAL_BIZ_ID,
        name: 'PB Trial Service',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: E2E_ADMIN_PB_TRIAL_BIZ_ID,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
    const trialSp = await prisma.serviceProvider.create({
      data: {
        businessId: E2E_ADMIN_PB_TRIAL_BIZ_ID,
        businessUserId: trialOwnerBU.id,
        displayName: 'PB Trial Provider',
        isActive: true,
        services: { create: [{ serviceId: E2E_ADMIN_PB_TRIAL_SVC_ID }] },
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: E2E_ADMIN_PB_TRIAL_BIZ_ID,
        serviceProviderId: trialSp.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    // ── ACTIVE fully-configured ───────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_PB_ACTIVE_BIZ_ID,
        name: 'E2E PB Active Business',
        slug: E2E_ADMIN_PB_ACTIVE_SLUG,
        status: 'ACTIVE',
        publicBookingEnabled: false,
      },
    });
    const activeOwnerBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_PB_ACTIVE_BIZ_ID,
        userId: pbOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
    await prisma.service.create({
      data: {
        id: E2E_ADMIN_PB_ACTIVE_SVC_ID,
        businessId: E2E_ADMIN_PB_ACTIVE_BIZ_ID,
        name: 'PB Active Service',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    await prisma.businessWorkingHour.create({
      data: {
        businessId: E2E_ADMIN_PB_ACTIVE_BIZ_ID,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });
    const activeSp = await prisma.serviceProvider.create({
      data: {
        businessId: E2E_ADMIN_PB_ACTIVE_BIZ_ID,
        businessUserId: activeOwnerBU.id,
        displayName: 'PB Active Provider',
        isActive: true,
        services: { create: [{ serviceId: E2E_ADMIN_PB_ACTIVE_SVC_ID }] },
      },
    });
    await prisma.serviceProviderWorkingHour.create({
      data: {
        businessId: E2E_ADMIN_PB_ACTIVE_BIZ_ID,
        serviceProviderId: activeSp.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
    });

    // ── DRAFT (no configuration required) ────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_PB_DRAFT_BIZ_ID,
        name: 'E2E PB Draft Business',
        slug: 'e2e-admin-pb-draft-biz',
        status: 'DRAFT',
        publicBookingEnabled: false,
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_PB_DRAFT_BIZ_ID,
        userId: pbOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });

    // ── TRIAL with failing readiness (no services / SPs / hours) ─────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_PB_NOREADY_TRIAL_BIZ_ID,
        name: 'E2E PB No-Ready Trial Business',
        slug: 'e2e-admin-pb-noready-trial-biz',
        status: 'TRIAL',
        publicBookingEnabled: false,
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_PB_NOREADY_TRIAL_BIZ_ID,
        userId: pbOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });

    // ── ACTIVE with failing readiness (no services / SPs / hours) ────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_PB_NOREADY_ACTIVE_BIZ_ID,
        name: 'E2E PB No-Ready Active Business',
        slug: 'e2e-admin-pb-noready-active-biz',
        status: 'ACTIVE',
        publicBookingEnabled: false,
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_PB_NOREADY_ACTIVE_BIZ_ID,
        userId: pbOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.serviceProvider.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_PB_TRIAL_SVC_ID, E2E_ADMIN_PB_ACTIVE_SVC_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: ALL_PB_BIZ_IDS } },
    });
    await prisma.user.deleteMany({ where: { id: E2E_ADMIN_PB_OWNER_USER_ID } });
  });

  beforeEach(async () => {
    // Reset publicBookingEnabled for all PB fixtures before each test
    await prisma.business.updateMany({
      where: { id: { in: ALL_PB_BIZ_IDS } },
      data: { publicBookingEnabled: false },
    });
  });

  it('admin enables PB for TRIAL business with passing readiness → 200, publicBookingEnabled=true', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_TRIAL_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(true);
  });

  it('public booking returns 200 after TRIAL + readiness + publicBookingEnabled=true', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_TRIAL_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/public/businesses/${E2E_ADMIN_PB_TRIAL_SLUG}`)
      .expect(200);
  });

  it('admin enables PB for ACTIVE business with passing readiness → 200, publicBookingEnabled=true', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(true);
  });

  it('public booking returns 200 after ACTIVE + readiness + publicBookingEnabled=true', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/public/businesses/${E2E_ADMIN_PB_ACTIVE_SLUG}`)
      .expect(200);
  });

  it('admin tries to enable PB for DRAFT business → 409', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_DRAFT_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(409);
  });

  it('admin tries to enable PB for TRIAL business with failing readiness → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(
        `/admin/businesses/${E2E_ADMIN_PB_NOREADY_TRIAL_BIZ_ID}/public-booking`,
      )
      .send({ publicBookingEnabled: true })
      .expect(400);
  });

  it('admin tries to enable PB for ACTIVE business with failing readiness → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(
        `/admin/businesses/${E2E_ADMIN_PB_NOREADY_ACTIVE_BIZ_ID}/public-booking`,
      )
      .send({ publicBookingEnabled: true })
      .expect(400);
  });

  it('admin disables PB for ACTIVE business → 200, publicBookingEnabled=false', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    // Enable first so there is something to disable
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: false })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(false);
  });

  it('public booking returns 404 after disabling publicBookingEnabled', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/public/businesses/${E2E_ADMIN_PB_ACTIVE_SLUG}`)
      .expect(404);
  });

  it('admin disables PB for DRAFT business → 200, publicBookingEnabled=false', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_DRAFT_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: false })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(false);
  });

  it('disabling PB does not require readiness (TRIAL no-ready → 200)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/admin/businesses/${E2E_ADMIN_PB_NOREADY_TRIAL_BIZ_ID}/public-booking`,
      )
      .send({ publicBookingEnabled: false })
      .expect(200);

    expect(
      (res.body as { publicBookingEnabled: boolean }).publicBookingEnabled,
    ).toBe(false);
  });

  it('enabling PB does not change business.status (TRIAL remains TRIAL)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_TRIAL_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(200);

    expect((res.body as { status: string }).status).toBe(BusinessStatus.TRIAL);
  });

  it('disabling PB does not change business.status (ACTIVE remains ACTIVE)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_ACTIVE_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: false })
      .expect(200);

    expect((res.body as { status: string }).status).toBe(BusinessStatus.ACTIVE);
  });

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_TRIAL_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_TRIAL_BIZ_ID}/public-booking`)
      .send({ publicBookingEnabled: true })
      .expect(401);
  });

  it('non-existent business → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(
        '/admin/businesses/00000000-0000-4000-8000-000000000000/public-booking',
      )
      .send({ publicBookingEnabled: true })
      .expect(404);
  });

  it('invalid body / missing publicBookingEnabled → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_PB_TRIAL_BIZ_ID}/public-booking`)
      .send({})
      .expect(400);
  });
});

// ─── POST /admin/businesses/:businessId/services ──────────────────────────────

describe('POST /admin/businesses/:businessId/services', () => {
  let csvcOwner: User;

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.service.deleteMany({
      where: {
        businessId: {
          in: [E2E_ADMIN_CSVC_BIZ_ID, E2E_ADMIN_CSVC_BIZ_B_ID],
        },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: {
          in: [E2E_ADMIN_CSVC_BIZ_ID, E2E_ADMIN_CSVC_BIZ_B_ID],
        },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: {
          in: [E2E_ADMIN_CSVC_BIZ_ID, E2E_ADMIN_CSVC_BIZ_B_ID],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_CSVC_OWNER_ID, E2E_ADMIN_CSVC_OWNER_B_ID] },
      },
    });

    // Seed biz A — DRAFT (primary fixture for admin service creation)
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_CSVC_BIZ_ID,
        name: 'E2E Admin Create Service Business A',
        slug: 'e2e-admin-csvc-biz-a',
        status: 'DRAFT',
      },
    });
    csvcOwner = await prisma.user.create({
      data: {
        id: E2E_ADMIN_CSVC_OWNER_ID,
        phoneNormalized: ADMIN_CSVC_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_CSVC_BIZ_ID,
        userId: csvcOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });

    // Seed biz B — TRIAL (used only for tenant isolation test)
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_CSVC_BIZ_B_ID,
        name: 'E2E Admin Create Service Business B',
        slug: 'e2e-admin-csvc-biz-b',
        status: 'TRIAL',
      },
    });
    const ownerB = await prisma.user.create({
      data: {
        id: E2E_ADMIN_CSVC_OWNER_B_ID,
        phoneNormalized: ADMIN_CSVC_OWNER_B_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_CSVC_BIZ_B_ID,
        userId: ownerB.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.service.deleteMany({
      where: {
        businessId: {
          in: [E2E_ADMIN_CSVC_BIZ_ID, E2E_ADMIN_CSVC_BIZ_B_ID],
        },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: {
          in: [E2E_ADMIN_CSVC_BIZ_ID, E2E_ADMIN_CSVC_BIZ_B_ID],
        },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: {
          in: [E2E_ADMIN_CSVC_BIZ_ID, E2E_ADMIN_CSVC_BIZ_B_ID],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_CSVC_OWNER_ID, E2E_ADMIN_CSVC_OWNER_B_ID] },
      },
    });
  });

  beforeEach(async () => {
    // Reset biz A to DRAFT in case a test moved it to TRIAL
    await prisma.business.update({
      where: { id: E2E_ADMIN_CSVC_BIZ_ID },
      data: { status: 'DRAFT' },
    });
  });

  it('admin creates service for DRAFT business → 201 with correct shape', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Haircut', durationMinutes: 30 })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String) as string,
      name: 'Haircut',
      durationMinutes: 30,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      description: null,
      priceCents: null,
    });
  });

  it('admin creates inactive service → 201 with isActive=false', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Inactive Service', durationMinutes: 60, isActive: false })
      .expect(201);

    expect((res.body as { isActive: boolean }).isActive).toBe(false);
  });

  it('missing name → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ durationMinutes: 30 })
      .expect(400);
  });

  it('durationMinutes below minimum (4) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Too Short', durationMinutes: 4 })
      .expect(400);
  });

  it('durationMinutes above maximum (481) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Too Long', durationMinutes: 481 })
      .expect(400);
  });

  it('negative priceCents → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Bad Price', durationMinutes: 30, priceCents: -1 })
      .expect(400);
  });

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post('/admin/businesses/00000000-0000-4000-8000-000000000000/services')
      .send({ name: 'Ghost Service', durationMinutes: 30 })
      .expect(404);
  });

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Blocked', durationMinutes: 30 })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'No Auth', durationMinutes: 30 })
      .expect(401);
  });

  it('admin-created service is visible in dashboard after DRAFT → TRIAL', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Dashboard Visible Service', durationMinutes: 45 })
      .expect(201);

    // Move DRAFT → TRIAL so assertAccess allows the owner in
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    MockClerkAuthGuard.currentUser = csvcOwner;
    const listRes = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .expect(200);

    const names = (listRes.body as { name: string }[]).map((s) => s.name);
    expect(names).toContain('Dashboard Visible Service');
  });

  it('service created for biz A does not appear in biz B dashboard (tenant isolation)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Biz A Only Service', durationMinutes: 30 })
      .expect(201);

    // biz B is already TRIAL; csvcOwnerB can call the dashboard
    MockClerkAuthGuard.currentUser = await prisma.user.findUniqueOrThrow({
      where: { id: E2E_ADMIN_CSVC_OWNER_B_ID },
    });
    const listRes = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_CSVC_BIZ_B_ID}/services`)
      .expect(200);

    const names = (listRes.body as { name: string }[]).map((s) => s.name);
    expect(names).not.toContain('Biz A Only Service');
  });

  it('admin-created active service contributes to readiness hasActiveService=true', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/services`)
      .send({ name: 'Readiness Service', durationMinutes: 60, isActive: true })
      .expect(201);

    const rdnRes = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_CSVC_BIZ_ID}/readiness`)
      .expect(200);

    expect(
      (rdnRes.body as { checks: { hasActiveService: boolean } }).checks
        .hasActiveService,
    ).toBe(true);
  });
});

// ─── POST /admin/businesses/:businessId/users (B.2) ───────────────────────────

describe('POST /admin/businesses/:businessId/users (admin add business user)', () => {
  let abuOwner: User;

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.serviceProvider.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    await prisma.service.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    const priorTestUsers = await prisma.user.findMany({
      where: { phoneNormalized: { in: ALL_ABU_TEST_PHONES } },
      select: { id: true },
    });
    if (priorTestUsers.length > 0) {
      await prisma.businessUser.deleteMany({
        where: { userId: { in: priorTestUsers.map((u) => u.id) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: priorTestUsers.map((u) => u.id) } },
      });
    }
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [E2E_ADMIN_ABU_OWNER_ID, E2E_ADMIN_ABU_OWNER_B_ID] } },
    });

    // Seed biz A (DRAFT)
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_ABU_BIZ_ID,
        name: 'E2E Admin ABU Business A',
        slug: 'e2e-admin-abu-biz-a',
        status: 'DRAFT',
      },
    });
    abuOwner = await prisma.user.create({
      data: {
        id: E2E_ADMIN_ABU_OWNER_ID,
        phoneNormalized: ADMIN_ABU_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_ABU_BIZ_ID,
        userId: abuOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });

    // Seed biz B (TRIAL) for cross-business membership test
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_ABU_BIZ_B_ID,
        name: 'E2E Admin ABU Business B',
        slug: 'e2e-admin-abu-biz-b',
        status: 'TRIAL',
      },
    });
    const ownerB = await prisma.user.create({
      data: {
        id: E2E_ADMIN_ABU_OWNER_B_ID,
        phoneNormalized: ADMIN_ABU_OWNER_B_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_ABU_BIZ_B_ID,
        userId: ownerB.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.serviceProvider.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    await prisma.service.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    const testUsers = await prisma.user.findMany({
      where: { phoneNormalized: { in: ALL_ABU_TEST_PHONES } },
      select: { id: true },
    });
    if (testUsers.length > 0) {
      await prisma.businessUser.deleteMany({
        where: { userId: { in: testUsers.map((u) => u.id) } },
      });
    }
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_ABU_BIZ_ID, E2E_ADMIN_ABU_BIZ_B_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [E2E_ADMIN_ABU_OWNER_ID, E2E_ADMIN_ABU_OWNER_B_ID] } },
    });
    await prisma.user.deleteMany({
      where: { phoneNormalized: { in: ALL_ABU_TEST_PHONES } },
    });
  });

  beforeEach(async () => {
    // Delete services and SPs created by test 13 (integration test)
    await prisma.serviceProvider.deleteMany({
      where: { businessId: E2E_ADMIN_ABU_BIZ_ID },
    });
    await prisma.service.deleteMany({
      where: { businessId: E2E_ADMIN_ABU_BIZ_ID },
    });
    // Delete test-created users and all their business users (covers biz A and biz B)
    const testUsers = await prisma.user.findMany({
      where: { phoneNormalized: { in: ALL_ABU_TEST_PHONES } },
      select: { id: true },
    });
    if (testUsers.length > 0) {
      await prisma.businessUser.deleteMany({
        where: { userId: { in: testUsers.map((u) => u.id) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: testUsers.map((u) => u.id) } },
      });
    }
    // Reset biz A to DRAFT (in case a test moved it to TRIAL)
    await prisma.business.update({
      where: { id: E2E_ADMIN_ABU_BIZ_ID },
      data: { status: 'DRAFT' },
    });
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('admin adds MANAGER to DRAFT business → 201 with ACTIVE status', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_MANAGER_PHONE, role: 'MANAGER' })
      .expect(201);

    const body = res.body as {
      id: string;
      userId: string;
      businessId: string;
      role: string;
      status: string;
      phoneNormalized: string;
      email: string | null;
      serviceProviderId: string | null;
    };
    expect(body.role).toBe('MANAGER');
    expect(body.status).toBe(BusinessUserStatus.ACTIVE);
    expect(body.businessId).toBe(E2E_ADMIN_ABU_BIZ_ID);
    expect(body.phoneNormalized).toBe(ADMIN_ABU_MANAGER_PHONE);
    expect(body.serviceProviderId).toBeNull();
  });

  it('admin adds MEMBER to DRAFT business → 201', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_MEMBER_PHONE, role: 'MEMBER' })
      .expect(201);

    expect((res.body as { role: string }).role).toBe('MEMBER');
    expect((res.body as { status: string }).status).toBe(
      BusinessUserStatus.ACTIVE,
    );
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('OWNER role → 400 (DTO enum rejects it)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_MANAGER_PHONE, role: 'OWNER' })
      .expect(400);
  });

  it('missing phone → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ role: 'MANAGER' })
      .expect(400);
  });

  it('invalid email format → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({
        phone: ADMIN_ABU_MANAGER_PHONE,
        email: 'not-an-email',
        role: 'MANAGER',
      })
      .expect(400);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post('/admin/businesses/00000000-0000-4000-8000-000000000000/users')
      .send({ phone: ADMIN_ABU_MANAGER_PHONE, role: 'MANAGER' })
      .expect(404);
  });

  // ── Duplicate ─────────────────────────────────────────────────────────────

  it('same phone added twice to the same business → 409', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_DUP_PHONE, role: 'MANAGER' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_DUP_PHONE, role: 'MANAGER' })
      .expect(409);
  });

  // ── Cross-business ────────────────────────────────────────────────────────

  it('same user can belong to a second business → 201', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_CROSS_BIZ_PHONE, role: 'MANAGER' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_B_ID}/users`)
      .send({ phone: ADMIN_ABU_CROSS_BIZ_PHONE, role: 'MEMBER' })
      .expect(201);

    expect((res.body as { businessId: string }).businessId).toBe(
      E2E_ADMIN_ABU_BIZ_B_ID,
    );
  });

  // ── Auth guards ───────────────────────────────────────────────────────────

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_MANAGER_PHONE, role: 'MANAGER' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_MANAGER_PHONE, role: 'MANAGER' })
      .expect(401);
  });

  // ── Dashboard access via DRAFT lock ───────────────────────────────────────

  it('admin-created MANAGER can access dashboard after DRAFT → TRIAL', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const addRes = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_T11_PHONE, role: 'MANAGER' })
      .expect(201);
    const { userId } = addRes.body as { userId: string };
    const managerUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_ABU_BIZ_ID}/services`)
      .expect(200);
  });

  it('admin-created MANAGER cannot access dashboard while business is DRAFT → 403', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const addRes = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_T12_PHONE, role: 'MANAGER' })
      .expect(201);
    const { userId } = addRes.body as { userId: string };
    const managerUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_ABU_BIZ_ID}/services`)
      .expect(403);
  });

  // ── Integration: B.1 + B.2 + SP creation ─────────────────────────────────

  it('admin-created MANAGER businessUserId can be used to create a ServiceProvider', async () => {
    MockClerkAuthGuard.currentUser = adminUser;

    const svcRes = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/services`)
      .send({ name: 'ABU SP Integration Service', durationMinutes: 60 })
      .expect(201);
    const svcId = (svcRes.body as { id: string }).id;

    const addRes = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/users`)
      .send({ phone: ADMIN_ABU_T13_PHONE, role: 'MANAGER' })
      .expect(201);
    const managerBuId = (addRes.body as { id: string }).id;

    const spRes = await request(app.getHttpServer())
      .post(`/admin/businesses/${E2E_ADMIN_ABU_BIZ_ID}/service-providers`)
      .send({
        displayName: 'ABU Integration Provider',
        businessUserId: managerBuId,
        serviceIds: [svcId],
        isActive: true,
      })
      .expect(201);

    expect((spRes.body as { displayName: string }).displayName).toBe(
      'ABU Integration Provider',
    );
  });
});

// ─── PUT /admin/businesses/:businessId/working-hours (B.3) ────────────────────

describe('PUT /admin/businesses/:businessId/working-hours (admin set business working hours)', () => {
  let bwhOwner: User;

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.businessWorkingHour.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_BWH_BIZ_ID, E2E_ADMIN_BWH_BIZ_B_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_BWH_BIZ_ID, E2E_ADMIN_BWH_BIZ_B_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_BWH_BIZ_ID, E2E_ADMIN_BWH_BIZ_B_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_BWH_OWNER_ID, E2E_ADMIN_BWH_OWNER_B_ID] },
      },
    });

    // Seed biz A (DRAFT) — primary fixture
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_BWH_BIZ_ID,
        name: 'E2E Admin BWH Business A',
        slug: 'e2e-admin-bwh-biz-a',
        status: 'DRAFT',
        timezone: 'Asia/Jerusalem',
      },
    });
    bwhOwner = await prisma.user.create({
      data: {
        id: E2E_ADMIN_BWH_OWNER_ID,
        phoneNormalized: ADMIN_BWH_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_BWH_BIZ_ID,
        userId: bwhOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });

    // Seed biz B (TRIAL) — for tenant isolation test
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_BWH_BIZ_B_ID,
        name: 'E2E Admin BWH Business B',
        slug: 'e2e-admin-bwh-biz-b',
        status: 'TRIAL',
        timezone: 'Asia/Jerusalem',
      },
    });
    const ownerB = await prisma.user.create({
      data: {
        id: E2E_ADMIN_BWH_OWNER_B_ID,
        phoneNormalized: ADMIN_BWH_OWNER_B_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_BWH_BIZ_B_ID,
        userId: ownerB.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.businessWorkingHour.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_BWH_BIZ_ID, E2E_ADMIN_BWH_BIZ_B_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_BWH_BIZ_ID, E2E_ADMIN_BWH_BIZ_B_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_BWH_BIZ_ID, E2E_ADMIN_BWH_BIZ_B_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_BWH_OWNER_ID, E2E_ADMIN_BWH_OWNER_B_ID] },
      },
    });
  });

  beforeEach(async () => {
    // Clear business working hours for biz A; reset status to DRAFT
    await prisma.businessWorkingHour.deleteMany({
      where: { businessId: E2E_ADMIN_BWH_BIZ_ID },
    });
    await prisma.business.update({
      where: { id: E2E_ADMIN_BWH_BIZ_ID },
      data: { status: 'DRAFT' },
    });
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('admin sets business working hours for DRAFT business → 200 with correct shape', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as Array<{
      id: string;
      dayOfWeek: number;
      startTime: string | null;
      endTime: string | null;
      isClosed: boolean;
    }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      dayOfWeek: 1,
      isClosed: false,
      startTime: '09:00',
      endTime: '18:00',
    });
    expect(typeof body[0].id).toBe('string');

    // Verify persistence
    const rows = await prisma.businessWorkingHour.findMany({
      where: { businessId: E2E_ADMIN_BWH_BIZ_ID },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].dayOfWeek).toBe(1);
  });

  it('admin sets a mix of open and closed days → 200', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          { dayOfWeek: 0, isClosed: true },
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
          { dayOfWeek: 6, isClosed: true },
        ],
      })
      .expect(200);

    const body = res.body as Array<{ dayOfWeek: number; isClosed: boolean }>;
    expect(body).toHaveLength(3);
    const closed = body.filter((h) => h.isClosed);
    const open = body.filter((h) => !h.isClosed);
    expect(closed).toHaveLength(2);
    expect(open).toHaveLength(1);
  });

  it('second PUT replaces all existing hours (full-week replacement)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '10:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(200);

    const rows = await prisma.businessWorkingHour.findMany({
      where: { businessId: E2E_ADMIN_BWH_BIZ_ID },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].dayOfWeek).toBe(2);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        '/admin/businesses/00000000-0000-4000-8000-000000000000/working-hours',
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(404);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('dayOfWeek out of range (7) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 7,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(400);
  });

  it('invalid time format (missing leading zero) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '9:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(400);
  });

  it('startTime after endTime → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '18:00',
            endTime: '09:00',
          },
        ],
      })
      .expect(400);
  });

  it('open day with missing startTime/endTime → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [{ dayOfWeek: 1, isClosed: false }],
      })
      .expect(400);
  });

  // ── Auth guards ───────────────────────────────────────────────────────────

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(401);
  });

  // ── Dashboard visibility ──────────────────────────────────────────────────

  it('admin-set hours are visible via dashboard GET after DRAFT → TRIAL', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 3,
            isClosed: false,
            startTime: '08:00',
            endTime: '16:00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    MockClerkAuthGuard.currentUser = bwhOwner;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .expect(200);

    const body = res.body as Array<{ dayOfWeek: number; startTime: string }>;
    expect(body.some((h) => h.dayOfWeek === 3 && h.startTime === '08:00')).toBe(
      true,
    );
  });

  // ── Readiness contribution ────────────────────────────────────────────────

  it('hasBusinessWorkingHours is false before and true after setting hours', async () => {
    MockClerkAuthGuard.currentUser = adminUser;

    const before = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/readiness`)
      .expect(200);
    expect(
      (
        before.body as {
          checks: { hasBusinessWorkingHours: boolean };
        }
      ).checks.hasBusinessWorkingHours,
    ).toBe(false);

    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/readiness`)
      .expect(200);
    expect(
      (
        after.body as {
          checks: { hasBusinessWorkingHours: boolean };
        }
      ).checks.hasBusinessWorkingHours,
    ).toBe(true);
  });

  // ── Tenant isolation ──────────────────────────────────────────────────────

  it('setting hours for biz A does not create hours for biz B', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(`/admin/businesses/${E2E_ADMIN_BWH_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    // Biz B is TRIAL; owner B can read its working-hours via dashboard
    MockClerkAuthGuard.currentUser = await prisma.user.findUniqueOrThrow({
      where: { id: E2E_ADMIN_BWH_OWNER_B_ID },
    });
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_ADMIN_BWH_BIZ_B_ID}/working-hours`)
      .expect(200);

    expect(res.body).toEqual([]);
  });
});

// ─── PUT /admin/businesses/:businessId/service-providers/:spId/working-hours (B.4) ─

describe('PUT /admin/businesses/:businessId/service-providers/:spId/working-hours (admin set SP working hours)', () => {
  let spwhOwner: User;
  let spId: string;
  let spBId: string;

  beforeAll(async () => {
    // Idempotent pre-cleanup
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.serviceProvider.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SPWH_SVC_ID, E2E_ADMIN_SPWH_SVC_B_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SPWH_OWNER_ID, E2E_ADMIN_SPWH_OWNER_B_ID] },
      },
    });

    // ── Seed biz A (DRAFT) ────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_SPWH_BIZ_ID,
        name: 'E2E Admin SPWH Business A',
        slug: 'e2e-admin-spwh-biz-a',
        status: 'DRAFT',
        timezone: 'Asia/Jerusalem',
      },
    });
    spwhOwner = await prisma.user.create({
      data: {
        id: E2E_ADMIN_SPWH_OWNER_ID,
        phoneNormalized: ADMIN_SPWH_OWNER_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const buA = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_SPWH_BIZ_ID,
        userId: spwhOwner.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
    await prisma.service.create({
      data: {
        id: E2E_ADMIN_SPWH_SVC_ID,
        businessId: E2E_ADMIN_SPWH_BIZ_ID,
        name: 'SPWH Test Service A',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    const spA = await prisma.serviceProvider.create({
      data: {
        businessId: E2E_ADMIN_SPWH_BIZ_ID,
        businessUserId: buA.id,
        displayName: 'SPWH Test Provider A',
        isActive: true,
        services: { create: [{ serviceId: E2E_ADMIN_SPWH_SVC_ID }] },
      },
    });
    spId = spA.id;

    // ── Seed biz B (TRIAL) ────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_ADMIN_SPWH_BIZ_B_ID,
        name: 'E2E Admin SPWH Business B',
        slug: 'e2e-admin-spwh-biz-b',
        status: 'TRIAL',
        timezone: 'Asia/Jerusalem',
      },
    });
    const ownerB = await prisma.user.create({
      data: {
        id: E2E_ADMIN_SPWH_OWNER_B_ID,
        phoneNormalized: ADMIN_SPWH_OWNER_B_PHONE,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
    const buB = await prisma.businessUser.create({
      data: {
        businessId: E2E_ADMIN_SPWH_BIZ_B_ID,
        userId: ownerB.id,
        role: BusinessUserRole.OWNER,
        status: BusinessUserStatus.ACTIVE,
      },
    });
    await prisma.service.create({
      data: {
        id: E2E_ADMIN_SPWH_SVC_B_ID,
        businessId: E2E_ADMIN_SPWH_BIZ_B_ID,
        name: 'SPWH Test Service B',
        durationMinutes: 60,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });
    const spB = await prisma.serviceProvider.create({
      data: {
        businessId: E2E_ADMIN_SPWH_BIZ_B_ID,
        businessUserId: buB.id,
        displayName: 'SPWH Test Provider B',
        isActive: true,
        services: { create: [{ serviceId: E2E_ADMIN_SPWH_SVC_B_ID }] },
      },
    });
    spBId = spB.id;
  });

  afterAll(async () => {
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.serviceProvider.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.service.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SPWH_SVC_ID, E2E_ADMIN_SPWH_SVC_B_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SPWH_BIZ_ID, E2E_ADMIN_SPWH_BIZ_B_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_ADMIN_SPWH_OWNER_ID, E2E_ADMIN_SPWH_OWNER_B_ID] },
      },
    });
  });

  beforeEach(async () => {
    // Clear SP A working hours; reset biz A to DRAFT
    await prisma.serviceProviderWorkingHour.deleteMany({
      where: { serviceProviderId: spId },
    });
    await prisma.business.update({
      where: { id: E2E_ADMIN_SPWH_BIZ_ID },
      data: { status: 'DRAFT' },
    });
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('admin sets SP working hours for DRAFT business → 200 with correct shape', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as Array<{
      id: string;
      dayOfWeek: number;
      startTime: string | null;
      endTime: string | null;
      isClosed: boolean;
    }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      dayOfWeek: 1,
      isClosed: false,
      startTime: '09:00',
      endTime: '18:00',
    });
    expect(typeof body[0].id).toBe('string');

    // Verify persistence
    const rows = await prisma.serviceProviderWorkingHour.findMany({
      where: { serviceProviderId: spId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].dayOfWeek).toBe(1);
  });

  it('admin sets a mix of open and closed days for a provider → 200', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    const res = await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          { dayOfWeek: 0, isClosed: true },
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
          { dayOfWeek: 6, isClosed: true },
        ],
      })
      .expect(200);

    const body = res.body as Array<{ dayOfWeek: number; isClosed: boolean }>;
    expect(body).toHaveLength(3);
    expect(body.filter((h) => h.isClosed)).toHaveLength(2);
    expect(body.filter((h) => !h.isClosed)).toHaveLength(1);
  });

  it('second PUT replaces all existing SP hours (full replacement)', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 3,
            isClosed: false,
            startTime: '10:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(200);

    const rows = await prisma.serviceProviderWorkingHour.findMany({
      where: { serviceProviderId: spId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].dayOfWeek).toBe(3);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('non-existent businessId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/00000000-0000-4000-8000-000000000000/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(404);
  });

  it('non-existent serviceProviderId → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/00000000-0000-4000-8000-000000000000/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(404);
  });

  it('ServiceProvider from another business → 404', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spBId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(404);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('dayOfWeek out of range (7) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 7,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(400);
  });

  it('invalid time format → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '9:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(400);
  });

  it('startTime after endTime → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '18:00',
            endTime: '09:00',
          },
        ],
      })
      .expect(400);
  });

  it('open day with missing startTime/endTime → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [{ dayOfWeek: 1, isClosed: false }],
      })
      .expect(400);
  });

  // ── Auth guards ───────────────────────────────────────────────────────────

  it('non-admin → 403', async () => {
    MockClerkAuthGuard.currentUser = regularUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(401);
  });

  // ── Dashboard visibility ──────────────────────────────────────────────────

  it('admin-set SP hours visible via dashboard GET after DRAFT → TRIAL', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 4,
            isClosed: false,
            startTime: '08:00',
            endTime: '16:00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/status`)
      .send({ status: 'TRIAL' })
      .expect(200);

    MockClerkAuthGuard.currentUser = spwhOwner;
    const res = await request(app.getHttpServer())
      .get(
        `/dashboard/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .expect(200);

    const body = res.body as Array<{ dayOfWeek: number; startTime: string }>;
    expect(body.some((h) => h.dayOfWeek === 4 && h.startTime === '08:00')).toBe(
      true,
    );
  });

  // ── Readiness contribution ────────────────────────────────────────────────

  it('allActiveProvidersHaveWorkingHours is false before and true after setting SP hours', async () => {
    MockClerkAuthGuard.currentUser = adminUser;

    const before = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/readiness`)
      .expect(200);
    expect(
      (
        before.body as {
          checks: { allActiveProvidersHaveWorkingHours: boolean };
        }
      ).checks.allActiveProvidersHaveWorkingHours,
    ).toBe(false);

    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get(`/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/readiness`)
      .expect(200);
    expect(
      (
        after.body as {
          checks: { allActiveProvidersHaveWorkingHours: boolean };
        }
      ).checks.allActiveProvidersHaveWorkingHours,
    ).toBe(true);
  });

  // ── Tenant isolation ──────────────────────────────────────────────────────

  it('setting hours for SP A does not create hours for SP B', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .put(
        `/admin/businesses/${E2E_ADMIN_SPWH_BIZ_ID}/service-providers/${spId}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const rows = await prisma.serviceProviderWorkingHour.findMany({
      where: { serviceProviderId: spBId },
    });
    expect(rows).toHaveLength(0);
  });
});
