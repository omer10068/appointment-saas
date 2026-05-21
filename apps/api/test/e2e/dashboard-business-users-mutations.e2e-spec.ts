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
  BusinessUserRole,
  BusinessUserStatus,
} from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2ef0000 ────────────────────────────────────
const E2E_BU_MUT_BIZ_ID = 'e2ef0000-0000-4000-8000-000000000001';
const E2E_BU_MUT_OWNER_USER_ID = 'e2ef0000-0000-4000-8000-000000000002';
const E2E_BU_MUT_MGR_USER_ID = 'e2ef0000-0000-4000-8000-000000000003';
const E2E_BU_MUT_MBR_USER_ID = 'e2ef0000-0000-4000-8000-000000000004';
const E2E_BU_MUT_OUT_USER_ID = 'e2ef0000-0000-4000-8000-000000000005';
// Cross-tenant fixture
const E2E_BU_MUT_OTHER_BIZ_ID = 'e2ef0000-0000-4000-8000-000000000020';
const E2E_BU_MUT_OTHER_USER_ID = 'e2ef0000-0000-4000-8000-000000000021';

// Phones for seed User rows
const OWNER_PHONE = '+19990011001';
const MGR_PHONE = '+19990011002';
const MBR_PHONE = '+19990011003'; // also used for duplicate-invite test
const OUT_PHONE = '+19990011004';
const OTHER_USER_PHONE = '+19990011010';

// Phones for Users dynamically created during POST success tests (must be cleaned up)
const OWNER_INVITE_PHONE = '+18880011010';
const MGR_INVITE_PHONE = '+18880011011';

type BusinessUserCreatedDto = {
  id: string;
  userId: string;
  businessId: string;
  role: string;
  status: string;
  phoneNormalized: string;
  email: string | null;
  serviceProviderId: string | null;
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

  // ── Idempotent pre-cleanup ─────────────────────────────────────────────────
  // FK-safe: BusinessUser (references Business + User) first, then Business, then User
  await prisma.businessUser.deleteMany({
    where: {
      businessId: { in: [E2E_BU_MUT_BIZ_ID, E2E_BU_MUT_OTHER_BIZ_ID] },
    },
  });
  // Clean up Users that may have been created by previous POST success tests
  await prisma.user.deleteMany({
    where: {
      phoneNormalized: { in: [OWNER_INVITE_PHONE, MGR_INVITE_PHONE] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_BU_MUT_BIZ_ID, E2E_BU_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_BU_MUT_OWNER_USER_ID,
          E2E_BU_MUT_MGR_USER_ID,
          E2E_BU_MUT_MBR_USER_ID,
          E2E_BU_MUT_OUT_USER_ID,
          E2E_BU_MUT_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_BU_MUT_BIZ_ID,
      name: 'E2E Business User Mutations Business',
      slug: 'e2e-business-user-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_BU_MUT_OWNER_USER_ID,
      phoneNormalized: OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_BU_MUT_BIZ_ID,
      userId: ownerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_BU_MUT_MGR_USER_ID,
      phoneNormalized: MGR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_BU_MUT_BIZ_ID,
      userId: managerUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_BU_MUT_MBR_USER_ID,
      phoneNormalized: MBR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_BU_MUT_BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_BU_MUT_OUT_USER_ID,
      phoneNormalized: OUT_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_BU_MUT_OTHER_BIZ_ID,
      name: 'E2E Business User Mutations Other Business',
      slug: 'e2e-business-user-mutations-other-business',
      status: 'ACTIVE',
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      id: E2E_BU_MUT_OTHER_USER_ID,
      phoneNormalized: OTHER_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_BU_MUT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
});

afterAll(async () => {
  await prisma.businessUser.deleteMany({
    where: {
      businessId: { in: [E2E_BU_MUT_BIZ_ID, E2E_BU_MUT_OTHER_BIZ_ID] },
    },
  });
  // Users created by POST success tests during the suite
  await prisma.user.deleteMany({
    where: {
      phoneNormalized: { in: [OWNER_INVITE_PHONE, MGR_INVITE_PHONE] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_BU_MUT_BIZ_ID, E2E_BU_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_BU_MUT_OWNER_USER_ID,
          E2E_BU_MUT_MGR_USER_ID,
          E2E_BU_MUT_MBR_USER_ID,
          E2E_BU_MUT_OUT_USER_ID,
          E2E_BU_MUT_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── POST /dashboard/businesses/:businessId/users ─────────────────────────────

describe('POST /dashboard/businesses/:businessId/users', () => {
  it('owner → 201 with correct BusinessUserCreatedDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({
        phone: OWNER_INVITE_PHONE,
        role: BusinessUserRole.MEMBER,
        email: 'invited@example.com',
      })
      .expect(201);

    expect(res.body).toMatchObject<BusinessUserCreatedDto>({
      id: expect.any(String) as string,
      userId: expect.any(String) as string,
      businessId: E2E_BU_MUT_BIZ_ID,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
      phoneNormalized: OWNER_INVITE_PHONE,
      email: 'invited@example.com',
      serviceProviderId: null,
    });
  });

  it('manager → 403', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({
        phone: MGR_INVITE_PHONE,
        role: BusinessUserRole.MEMBER,
      })
      .expect(403);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: '+18880011020', role: BusinessUserRole.MEMBER })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: '+18880011021', role: BusinessUserRole.MEMBER })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: '+18880011022', role: BusinessUserRole.MEMBER })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post('/dashboard/businesses/00000000-0000-4000-8000-000000000000/users')
      .send({ phone: '+18880011023', role: BusinessUserRole.MEMBER })
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    // ownerUser belongs to E2E_BU_MUT_BIZ_ID, not E2E_BU_MUT_OTHER_BIZ_ID
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_OTHER_BIZ_ID}/users`)
      .send({ phone: '+18880011024', role: BusinessUserRole.MEMBER })
      .expect(403);
  });

  it('missing phone → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ role: BusinessUserRole.MEMBER })
      .expect(400);
  });

  it('invalid phone format → 400', async () => {
    // normalizePhone throws BadRequestException for unrecognized format
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: 'not-a-phone', role: BusinessUserRole.MEMBER })
      .expect(400);
  });

  it('missing role → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: '+18880011025' })
      .expect(400);
  });

  it('invalid role value → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: '+18880011026', role: 'ADMIN' })
      .expect(400);
  });

  it('role OWNER → 400 (excluded from enum by DTO)', async () => {
    // CreateBusinessUserDto only allows MEMBER or MANAGER
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: '+18880011027', role: BusinessUserRole.OWNER })
      .expect(400);
  });

  it('duplicate — user already in this business → 409', async () => {
    // memberUser (MBR_PHONE) already has a BusinessUser row for this business
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({ phone: MBR_PHONE, role: BusinessUserRole.MEMBER })
      .expect(409);
  });

  it('invalid email format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_BU_MUT_BIZ_ID}/users`)
      .send({
        phone: '+18880011028',
        role: BusinessUserRole.MEMBER,
        email: 'not-an-email',
      })
      .expect(400);
  });
});
