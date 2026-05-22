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
import { BusinessUserRole, BusinessUserStatus } from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2e11000 ───────────────────────────────────

const BIZ_ID = 'e2e11000-0000-4000-8000-000000000001';

const BLOCKED_MEMBER_USER_ID  = 'e2e11000-0000-4000-8000-000000000002';
const INVITED_MEMBER_USER_ID  = 'e2e11000-0000-4000-8000-000000000003';
const BLOCKED_MANAGER_USER_ID = 'e2e11000-0000-4000-8000-000000000004';
const INVITED_MANAGER_USER_ID = 'e2e11000-0000-4000-8000-000000000005';
const BLOCKED_OWNER_USER_ID   = 'e2e11000-0000-4000-8000-000000000006';
const INVITED_OWNER_USER_ID   = 'e2e11000-0000-4000-8000-000000000007';

// Unique phone numbers for each user
const PHONES: Record<string, string> = {
  [BLOCKED_MEMBER_USER_ID]:  '+19110001001',
  [INVITED_MEMBER_USER_ID]:  '+19110001002',
  [BLOCKED_MANAGER_USER_ID]: '+19110001003',
  [INVITED_MANAGER_USER_ID]: '+19110001004',
  [BLOCKED_OWNER_USER_ID]:   '+19110001005',
  [INVITED_OWNER_USER_ID]:   '+19110001006',
};

const ALL_USER_IDS = Object.keys(PHONES);

describe('BusinessUser status enforcement (e2e)', () => {
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

    // ── Idempotent pre-cleanup (FK-safe order) ─────────────────────────────
    await prisma.businessUser.deleteMany({ where: { businessId: BIZ_ID } });
    await prisma.business.deleteMany({ where: { id: BIZ_ID } });
    await prisma.user.deleteMany({ where: { id: { in: ALL_USER_IDS } } });

    // ── Seed ──────────────────────────────────────────────────────────────
    await prisma.business.create({
      data: { id: BIZ_ID, name: 'Status Test Biz', slug: 'e2e-status-test-biz', status: 'ACTIVE' },
    });

    const userFixtures: Array<{ id: string; role: BusinessUserRole; status: BusinessUserStatus }> = [
      { id: BLOCKED_MEMBER_USER_ID,  role: BusinessUserRole.MEMBER,  status: BusinessUserStatus.BLOCKED },
      { id: INVITED_MEMBER_USER_ID,  role: BusinessUserRole.MEMBER,  status: BusinessUserStatus.INVITED },
      { id: BLOCKED_MANAGER_USER_ID, role: BusinessUserRole.MANAGER, status: BusinessUserStatus.BLOCKED },
      { id: INVITED_MANAGER_USER_ID, role: BusinessUserRole.MANAGER, status: BusinessUserStatus.INVITED },
      { id: BLOCKED_OWNER_USER_ID,   role: BusinessUserRole.OWNER,   status: BusinessUserStatus.BLOCKED },
      { id: INVITED_OWNER_USER_ID,   role: BusinessUserRole.OWNER,   status: BusinessUserStatus.INVITED },
    ];

    for (const f of userFixtures) {
      await prisma.user.create({
        data: { id: f.id, phoneNormalized: PHONES[f.id], status: 'ACTIVE', platformRole: 'USER' },
      });
      await prisma.businessUser.create({
        data: { businessId: BIZ_ID, userId: f.id, role: f.role, status: f.status },
      });
    }
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({ where: { businessId: BIZ_ID } });
    await prisma.business.deleteMany({ where: { id: BIZ_ID } });
    await prisma.user.deleteMany({ where: { id: { in: ALL_USER_IDS } } });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null as unknown as User;
  });

  // ─── assertAccess: GET /services ─────────────────────────────────────────

  describe('GET /dashboard/businesses/:businessId/services — assertAccess', () => {
    it('BLOCKED MEMBER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: BLOCKED_MEMBER_USER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}/services`)
        .expect(403);
    });

    it('INVITED MEMBER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: INVITED_MEMBER_USER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}/services`)
        .expect(403);
    });
  });

  // ─── assertMutationAccess: POST /services ────────────────────────────────

  describe('POST /dashboard/businesses/:businessId/services — assertMutationAccess', () => {
    const validDto = { name: 'Haircut', durationMinutes: 30 };

    it('BLOCKED MANAGER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: BLOCKED_MANAGER_USER_ID } as User;
      await request(app.getHttpServer())
        .post(`/dashboard/businesses/${BIZ_ID}/services`)
        .send(validDto)
        .expect(403);
    });

    it('INVITED MANAGER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: INVITED_MANAGER_USER_ID } as User;
      await request(app.getHttpServer())
        .post(`/dashboard/businesses/${BIZ_ID}/services`)
        .send(validDto)
        .expect(403);
    });
  });

  // ─── assertOwnerAccess: GET /users ───────────────────────────────────────

  describe('GET /dashboard/businesses/:businessId/users — assertOwnerAccess', () => {
    it('BLOCKED OWNER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: BLOCKED_OWNER_USER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}/users`)
        .expect(403);
    });

    it('INVITED OWNER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: INVITED_OWNER_USER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}/users`)
        .expect(403);
    });
  });
});
