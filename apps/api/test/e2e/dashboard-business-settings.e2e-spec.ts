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

// ─── Stable IDs — hex-only prefix e2e13000 ───────────────────────────────────

const BIZ_ID      = 'e2e13000-0000-4000-8000-000000000001';
const OWNER_ID    = 'e2e13000-0000-4000-8000-000000000002';
const MANAGER_ID  = 'e2e13000-0000-4000-8000-000000000003';
const MEMBER_ID   = 'e2e13000-0000-4000-8000-000000000004';
const OUTSIDER_ID = 'e2e13000-0000-4000-8000-000000000005';

const ALL_USER_IDS = [OWNER_ID, MANAGER_ID, MEMBER_ID, OUTSIDER_ID];
const NONEXISTENT_BIZ_ID = 'e2e13000-0000-4000-8000-000000000099';

describe('Dashboard business settings (e2e)', () => {
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
      data: {
        id: BIZ_ID,
        name: 'Settings Test Biz',
        slug: 'e2e-settings-test-biz',
        status: 'ACTIVE',
        timezone: 'Asia/Jerusalem',
        locale: 'he-IL',
        currency: 'ILS',
      },
    });

    for (const [id, phone] of [
      [OWNER_ID,    '+19130001001'],
      [MANAGER_ID,  '+19130001002'],
      [MEMBER_ID,   '+19130001003'],
      [OUTSIDER_ID, '+19130001004'],
    ] as [string, string][]) {
      await prisma.user.create({
        data: { id, phoneNormalized: phone, status: 'ACTIVE', platformRole: 'USER' },
      });
    }

    await prisma.businessUser.createMany({
      data: [
        { businessId: BIZ_ID, userId: OWNER_ID,   role: 'OWNER',   status: 'ACTIVE' },
        { businessId: BIZ_ID, userId: MANAGER_ID,  role: 'MANAGER', status: 'ACTIVE' },
        { businessId: BIZ_ID, userId: MEMBER_ID,   role: 'MEMBER',  status: 'ACTIVE' },
      ],
    });
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

  // ─── GET /dashboard/businesses/:businessId ───────────────────────────────

  describe('GET /dashboard/businesses/:businessId', () => {
    it('OWNER → 200 with full response shape', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      const { body } = await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}`)
        .expect(200);

      expect(body).toMatchObject({
        id: BIZ_ID,
        name: 'Settings Test Biz',
        slug: 'e2e-settings-test-biz',
        status: 'ACTIVE',
        timezone: 'Asia/Jerusalem',
        locale: 'he-IL',
        currency: 'ILS',
      });
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('MANAGER → 200', async () => {
      MockClerkAuthGuard.currentUser = { id: MANAGER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}`)
        .expect(200);
    });

    it('MEMBER → 200', async () => {
      MockClerkAuthGuard.currentUser = { id: MEMBER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}`)
        .expect(200);
    });

    it('outsider → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: OUTSIDER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}`)
        .expect(403);
    });

    it('missing auth → 401', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${BIZ_ID}`)
        .expect(401);
    });

    it('non-existent businessId → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      await request(app.getHttpServer())
        .get(`/dashboard/businesses/${NONEXISTENT_BIZ_ID}`)
        .expect(403);
    });
  });

  // ─── PATCH /dashboard/businesses/:businessId ─────────────────────────────

  describe('PATCH /dashboard/businesses/:businessId', () => {
    it('OWNER can update name, timezone, locale, and currency → 200', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      const { body } = await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ name: 'Renamed', timezone: 'UTC', locale: 'en-US', currency: 'USD' })
        .expect(200);

      expect(body).toMatchObject({
        id: BIZ_ID,
        name: 'Renamed',
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
      });
      expect(body.slug).toBeDefined();
      expect(body.status).toBeDefined();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('MANAGER can update → 200', async () => {
      MockClerkAuthGuard.currentUser = { id: MANAGER_ID } as User;
      const { body } = await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ name: 'Manager Renamed' })
        .expect(200);

      expect(body.name).toBe('Manager Renamed');
    });

    it('MEMBER → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: MEMBER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ name: 'X' })
        .expect(403);
    });

    it('outsider → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: OUTSIDER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ name: 'X' })
        .expect(403);
    });

    it('missing auth → 401', async () => {
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ name: 'X' })
        .expect(401);
    });

    it('non-existent businessId → 403', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${NONEXISTENT_BIZ_ID}`)
        .send({ name: 'X' })
        .expect(403);
    });

    it('empty body → 400', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({})
        .expect(400);
    });

    it('invalid locale → 400', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ locale: 'not-a-locale' })
        .expect(400);
    });

    it('invalid currency (lowercase) → 400', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ currency: 'usd' })
        .expect(400);
    });

    it('non-whitelisted field (status) → 400', async () => {
      MockClerkAuthGuard.currentUser = { id: OWNER_ID } as User;
      await request(app.getHttpServer())
        .patch(`/dashboard/businesses/${BIZ_ID}`)
        .send({ status: 'SUSPENDED' })
        .expect(400);
    });
  });
});
