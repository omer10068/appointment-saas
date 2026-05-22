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

// ─── Stable IDs — hex-only prefix e2e12000 ───────────────────────────────────

const OWNER_USER_ID      = 'e2e12000-0000-4000-8000-000000000001';
const SUSPENDED_BIZ_ID   = 'e2e12000-0000-4000-8000-000000000002';
const CANCELLED_BIZ_ID   = 'e2e12000-0000-4000-8000-000000000003';

describe('Business.status dashboard access enforcement (e2e)', () => {
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
    await prisma.businessUser.deleteMany({ where: { userId: OWNER_USER_ID } });
    await prisma.business.deleteMany({ where: { id: { in: [SUSPENDED_BIZ_ID, CANCELLED_BIZ_ID] } } });
    await prisma.user.deleteMany({ where: { id: OWNER_USER_ID } });

    // ── Seed ──────────────────────────────────────────────────────────────
    await prisma.user.create({
      data: { id: OWNER_USER_ID, phoneNormalized: '+19120001001', status: 'ACTIVE', platformRole: 'USER' },
    });

    await prisma.business.create({
      data: { id: SUSPENDED_BIZ_ID, name: 'Suspended Biz', slug: 'e2e-suspended-biz', status: 'SUSPENDED' },
    });
    await prisma.business.create({
      data: { id: CANCELLED_BIZ_ID, name: 'Cancelled Biz', slug: 'e2e-cancelled-biz', status: 'CANCELLED' },
    });

    await prisma.businessUser.create({
      data: { businessId: SUSPENDED_BIZ_ID, userId: OWNER_USER_ID, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.businessUser.create({
      data: { businessId: CANCELLED_BIZ_ID, userId: OWNER_USER_ID, role: 'OWNER', status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({ where: { userId: OWNER_USER_ID } });
    await prisma.business.deleteMany({ where: { id: { in: [SUSPENDED_BIZ_ID, CANCELLED_BIZ_ID] } } });
    await prisma.user.deleteMany({ where: { id: OWNER_USER_ID } });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = { id: OWNER_USER_ID } as User;
  });

  // ─── assertAccess: GET /services ─────────────────────────────────────────

  describe('GET /dashboard/businesses/:businessId/services — assertAccess', () => {
    it('SUSPENDED business → 403', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${SUSPENDED_BIZ_ID}/services`)
        .expect(403);
    });

    it('CANCELLED business → 403', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${CANCELLED_BIZ_ID}/services`)
        .expect(403);
    });
  });

  // ─── assertMutationAccess: POST /services ────────────────────────────────

  describe('POST /dashboard/businesses/:businessId/services — assertMutationAccess', () => {
    const validDto = { name: 'Haircut', durationMinutes: 30 };

    it('SUSPENDED business → 403', async () => {
      await request(app.getHttpServer())
        .post(`/dashboard/businesses/${SUSPENDED_BIZ_ID}/services`)
        .send(validDto)
        .expect(403);
    });

    it('CANCELLED business → 403', async () => {
      await request(app.getHttpServer())
        .post(`/dashboard/businesses/${CANCELLED_BIZ_ID}/services`)
        .send(validDto)
        .expect(403);
    });
  });

  // ─── assertOwnerAccess: GET /users ───────────────────────────────────────

  describe('GET /dashboard/businesses/:businessId/users — assertOwnerAccess', () => {
    it('SUSPENDED business → 403', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${SUSPENDED_BIZ_ID}/users`)
        .expect(403);
    });

    it('CANCELLED business → 403', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${CANCELLED_BIZ_ID}/users`)
        .expect(403);
    });
  });
});
