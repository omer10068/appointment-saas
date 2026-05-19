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

// ─── Stable IDs — prefixed e2e-svc to avoid clashing with dev seed data ───────
const E2E_SVC_BUSINESS_ID = 'e2e50000-0000-4000-8000-000000000001';
const E2E_SVC_OWNER_ID = 'e2e50000-0000-4000-8000-000000000002';
const E2E_SVC_STAFF_ID = 'e2e50000-0000-4000-8000-000000000003';
const E2E_SVC_OUTSIDER_ID = 'e2e50000-0000-4000-8000-000000000004';
const E2E_SVC_CONSULT_ID = 'e2e50000-0000-4000-8000-000000000010';
const E2E_SVC_LASER_ID = 'e2e50000-0000-4000-8000-000000000011';

// Response shape returned by GET /dashboard/businesses/:businessId/services
type ServiceDto = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
  bufferBeforeMin: number;
  bufferAfterMin: number;
};

describe('GET /dashboard/businesses/:businessId/services', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerUser: User;
  let staffUser: User;
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
    await prisma.service.deleteMany({
      where: { businessId: E2E_SVC_BUSINESS_ID },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_SVC_BUSINESS_ID },
    });
    await prisma.business.deleteMany({ where: { id: E2E_SVC_BUSINESS_ID } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_SVC_OWNER_ID, E2E_SVC_STAFF_ID, E2E_SVC_OUTSIDER_ID] },
      },
    });

    // ── Seed minimal test data ─────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_SVC_BUSINESS_ID,
        name: 'E2E Services Business',
        slug: 'e2e-services-business',
        status: 'ACTIVE',
      },
    });

    ownerUser = await prisma.user.create({
      data: {
        id: E2E_SVC_OWNER_ID,
        phoneNormalized: '+19990001001',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_SVC_BUSINESS_ID,
        userId: ownerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    staffUser = await prisma.user.create({
      data: {
        id: E2E_SVC_STAFF_ID,
        phoneNormalized: '+19990001002',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_SVC_BUSINESS_ID,
        userId: staffUser.id,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    outsiderUser = await prisma.user.create({
      data: {
        id: E2E_SVC_OUTSIDER_ID,
        phoneNormalized: '+19990001003',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.service.createMany({
      data: [
        {
          id: E2E_SVC_CONSULT_ID,
          businessId: E2E_SVC_BUSINESS_ID,
          name: 'Consultation',
          durationMinutes: 30,
          priceCents: 5000,
          isActive: true,
          bufferBeforeMin: 0,
          bufferAfterMin: 0,
        },
        {
          id: E2E_SVC_LASER_ID,
          businessId: E2E_SVC_BUSINESS_ID,
          name: 'Laser Treatment',
          durationMinutes: 60,
          priceCents: 15000,
          isActive: true,
          bufferBeforeMin: 5,
          bufferAfterMin: 10,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.service.deleteMany({
      where: { businessId: E2E_SVC_BUSINESS_ID },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_SVC_BUSINESS_ID },
    });
    await prisma.business.deleteMany({ where: { id: E2E_SVC_BUSINESS_ID } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [E2E_SVC_OWNER_ID, E2E_SVC_STAFF_ID, E2E_SVC_OUTSIDER_ID] },
      },
    });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null;
  });

  // ── Test cases ──────────────────────────────────────────────────────────────

  it('owner returns 200 with services and correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SVC_BUSINESS_ID}/services`)
      .expect(200);

    const body = res.body as ServiceDto[];
    expect(body).toHaveLength(2);

    // Services are ordered by name asc: Consultation < Laser Treatment
    expect(body[0]).toMatchObject<ServiceDto>({
      id: E2E_SVC_CONSULT_ID,
      name: 'Consultation',
      description: null,
      durationMinutes: 30,
      priceCents: 5000,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    });
    expect(body[1]).toMatchObject<ServiceDto>({
      id: E2E_SVC_LASER_ID,
      name: 'Laser Treatment',
      description: null,
      durationMinutes: 60,
      priceCents: 15000,
      isActive: true,
      bufferBeforeMin: 5,
      bufferAfterMin: 10,
    });
  });

  it('staff returns 200 with services', async () => {
    MockClerkAuthGuard.currentUser = staffUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SVC_BUSINESS_ID}/services`)
      .expect(200);

    const body = res.body as ServiceDto[];
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe(E2E_SVC_CONSULT_ID);
    expect(body[1].id).toBe(E2E_SVC_LASER_ID);
  });

  it('authenticated user not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SVC_BUSINESS_ID}/services`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    // currentUser is null (reset by beforeEach)
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_SVC_BUSINESS_ID}/services`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/services',
      )
      .expect(403);
  });
});
