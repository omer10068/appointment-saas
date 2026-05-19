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

// ─── Stable IDs — hex-only prefix e2e80000 ────────────────────────────────────
const E2E_BU_BIZ_ID = 'e2e80000-0000-4000-8000-000000000001';
const E2E_BU_OWNER_USER_ID = 'e2e80000-0000-4000-8000-000000000002';
const E2E_BU_MGR_USER_ID = 'e2e80000-0000-4000-8000-000000000003';
const E2E_BU_MBR_USER_ID = 'e2e80000-0000-4000-8000-000000000004';
const E2E_BU_OUT_USER_ID = 'e2e80000-0000-4000-8000-000000000005';
// Cross-tenant fixture — proves users from another business are excluded
const E2E_BU_OTHER_BIZ_ID = 'e2e80000-0000-4000-8000-000000000030';
const E2E_BU_OTHER_USER_ID = 'e2e80000-0000-4000-8000-000000000031';

// Response shape returned by GET /dashboard/businesses/:businessId/users
type BusinessUserDto = {
  id: string;
  userId: string;
  role: string;
  status: string;
  hasServiceProviderProfile: boolean;
};

describe('GET /dashboard/businesses/:businessId/users', () => {
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

    // ── Idempotent pre-cleanup (handles leftover from a crashed previous run) ──
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_BU_BIZ_ID, E2E_BU_OTHER_BIZ_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [E2E_BU_BIZ_ID, E2E_BU_OTHER_BIZ_ID] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            E2E_BU_OWNER_USER_ID,
            E2E_BU_MGR_USER_ID,
            E2E_BU_MBR_USER_ID,
            E2E_BU_OUT_USER_ID,
            E2E_BU_OTHER_USER_ID,
          ],
        },
      },
    });

    // ── Seed main business ─────────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_BU_BIZ_ID,
        name: 'E2E Business Users Business',
        slug: 'e2e-business-users-business',
        status: 'ACTIVE',
      },
    });

    ownerUser = await prisma.user.create({
      data: {
        id: E2E_BU_OWNER_USER_ID,
        phoneNormalized: '+19990004001',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_BU_BIZ_ID,
        userId: ownerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    managerUser = await prisma.user.create({
      data: {
        id: E2E_BU_MGR_USER_ID,
        phoneNormalized: '+19990004002',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_BU_BIZ_ID,
        userId: managerUser.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });

    memberUser = await prisma.user.create({
      data: {
        id: E2E_BU_MBR_USER_ID,
        phoneNormalized: '+19990004003',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_BU_BIZ_ID,
        userId: memberUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    outsiderUser = await prisma.user.create({
      data: {
        id: E2E_BU_OUT_USER_ID,
        phoneNormalized: '+19990004004',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    // ── Cross-tenant fixture ───────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_BU_OTHER_BIZ_ID,
        name: 'E2E Other BU Business',
        slug: 'e2e-other-bu-business',
        status: 'ACTIVE',
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        id: E2E_BU_OTHER_USER_ID,
        phoneNormalized: '+19990004010',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_BU_OTHER_BIZ_ID,
        userId: otherUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // FK-safe order: BusinessUser → Business → User
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_BU_BIZ_ID, E2E_BU_OTHER_BIZ_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [E2E_BU_BIZ_ID, E2E_BU_OTHER_BIZ_ID] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            E2E_BU_OWNER_USER_ID,
            E2E_BU_MGR_USER_ID,
            E2E_BU_MBR_USER_ID,
            E2E_BU_OUT_USER_ID,
            E2E_BU_OTHER_USER_ID,
          ],
        },
      },
    });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null;
  });

  // ── Test cases ──────────────────────────────────────────────────────────────

  it('owner returns 200 with business users and correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_BU_BIZ_ID}/users`)
      .expect(200);

    const body = res.body as BusinessUserDto[];
    // Only the three members of this business — cross-tenant user must not appear.
    expect(body).toHaveLength(3);
    const userIds = body.map((bu) => bu.userId);
    expect(userIds).not.toContain(E2E_BU_OTHER_USER_ID);

    // Ordered by createdAt asc: OWNER first, then MANAGER, then MEMBER
    expect(body[0]).toMatchObject<BusinessUserDto>({
      id: expect.any(String) as string,
      userId: E2E_BU_OWNER_USER_ID,
      role: 'OWNER',
      status: 'ACTIVE',
      hasServiceProviderProfile: false,
    });
    expect(body[1]).toMatchObject<BusinessUserDto>({
      id: expect.any(String) as string,
      userId: E2E_BU_MGR_USER_ID,
      role: 'MANAGER',
      status: 'ACTIVE',
      hasServiceProviderProfile: false,
    });
    expect(body[2]).toMatchObject<BusinessUserDto>({
      id: expect.any(String) as string,
      userId: E2E_BU_MBR_USER_ID,
      role: 'MEMBER',
      status: 'ACTIVE',
      hasServiceProviderProfile: false,
    });
  });

  it('manager returns 403', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_BU_BIZ_ID}/users`)
      .expect(403);
  });

  it('member returns 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_BU_BIZ_ID}/users`)
      .expect(403);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_BU_BIZ_ID}/users`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    // currentUser is null (reset by beforeEach)
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_BU_BIZ_ID}/users`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    // assertOwnerAccess finds no BusinessUser for this combination → ForbiddenException
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get('/dashboard/businesses/00000000-0000-4000-8000-000000000000/users')
      .expect(403);
  });
});
