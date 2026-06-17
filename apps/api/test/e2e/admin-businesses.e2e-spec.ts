import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClerkAuthGuard } from '../../src/auth/guards/clerk-auth.guard';
import { AdminModule } from '../../src/admin/admin.module';
import { DashboardModule } from '../../src/dashboard/dashboard.module';
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

const ADMIN_PHONE = '+19990002001';
const REG_PHONE = '+19990002002';
const EXISTING_OWNER_PHONE = '+19990002003';
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
        in: [E2E_ADMIN_BIZ_ID, E2E_ADMIN_OWNED_BIZ_ID, E2E_ADMIN_REGRESSION_BIZ_ID],
      },
    },
  });
  await prisma.user.deleteMany({
    where: { phoneNormalized: { in: [CREATED_OWNER_PHONE, REGRESSION_OWNER_PHONE] } },
  });
  await prisma.business.deleteMany({
    where: {
      id: { in: [E2E_ADMIN_BIZ_ID, E2E_ADMIN_OWNED_BIZ_ID, E2E_ADMIN_REGRESSION_BIZ_ID] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_ADMIN_USER_ID,
          E2E_ADMIN_REG_USER_ID,
          E2E_ADMIN_EXISTING_OWNER_USER_ID,
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
        in: [E2E_ADMIN_BIZ_ID, E2E_ADMIN_OWNED_BIZ_ID, E2E_ADMIN_REGRESSION_BIZ_ID],
      },
    },
  });
  await prisma.user.deleteMany({
    where: { phoneNormalized: { in: [CREATED_OWNER_PHONE, REGRESSION_OWNER_PHONE] } },
  });
  await prisma.business.deleteMany({
    where: {
      id: { in: [E2E_ADMIN_BIZ_ID, E2E_ADMIN_OWNED_BIZ_ID, E2E_ADMIN_REGRESSION_BIZ_ID] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_ADMIN_USER_ID,
          E2E_ADMIN_REG_USER_ID,
          E2E_ADMIN_EXISTING_OWNER_USER_ID,
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
      .send({ phone: REGRESSION_OWNER_PHONE, email: 'regression-owner@example.com' })
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
      .send({ phone: REGRESSION_OWNER_PHONE, email: 'regression-owner@example.com' })
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
