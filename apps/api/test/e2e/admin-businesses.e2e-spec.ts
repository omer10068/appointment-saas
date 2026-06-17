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

const ADMIN_PHONE = '+19990002001';
const REG_PHONE = '+19990002002';
const EXISTING_OWNER_PHONE = '+19990002003';
const DRAFT_OWNER_PHONE = '+19990002004';
const ADMIN_SP_OWNER_PHONE = '+19990002030';
const ADMIN_SP_MEMBER_PHONE = '+19990002031';
const ADMIN_SP_DUP_PHONE = '+19990002032';
const ADMIN_SP_INACT_SVC_PHONE = '+19990002033';
const ADMIN_RDN_OWNER_PHONE = '+19990002041';
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

  it('invalid status value (ACTIVE) → 400', async () => {
    MockClerkAuthGuard.currentUser = adminUser;
    await request(app.getHttpServer())
      .patch(`/admin/businesses/${E2E_ADMIN_DRAFT_BIZ_ID}/status`)
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
