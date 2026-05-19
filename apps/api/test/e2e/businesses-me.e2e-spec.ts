import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClerkAuthGuard } from '../../src/auth/guards/clerk-auth.guard';
import { BusinessesModule } from '../../src/businesses/businesses.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { User } from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

// Fail immediately if TEST_DATABASE_URL is not configured — this test writes
// real rows and must never run against the development database.
requireTestDatabase();

// ─── Stable IDs — prefixed e2e to avoid clashing with dev seed data ───────────
const E2E_BUSINESS_ID = 'e2e00000-0000-4000-8000-000000000001';
const E2E_OWNER_ID = 'e2e00000-0000-4000-8000-000000000002';
const E2E_STAFF_ID = 'e2e00000-0000-4000-8000-000000000003';
const E2E_NOBODY_ID = 'e2e00000-0000-4000-8000-000000000004';

// Response shape returned by GET /businesses/me
type BusinessMembership = {
  role: string;
  businessId: string;
  business: { id: string; name: string };
};

describe('GET /businesses/me', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerUser: User;
  let staffUser: User;
  let nobodyUser: User;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // ignoreEnvFile: env vars are already loaded by jest-e2e.setup.ts
        ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
        BusinessesModule,
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useClass(MockClerkAuthGuard)
      .compile();

    app = await createTestApp(module);
    prisma = module.get(PrismaService);

    // ── Idempotent pre-cleanup (handles leftover from a crashed previous run) ──
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_BUSINESS_ID },
    });
    await prisma.business.deleteMany({ where: { id: E2E_BUSINESS_ID } });
    await prisma.user.deleteMany({
      where: { id: { in: [E2E_OWNER_ID, E2E_STAFF_ID, E2E_NOBODY_ID] } },
    });

    // ── Seed minimal test data ─────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_BUSINESS_ID,
        name: 'E2E Test Business',
        slug: 'e2e-test-business',
        status: 'ACTIVE',
      },
    });

    ownerUser = await prisma.user.create({
      data: {
        id: E2E_OWNER_ID,
        phoneNormalized: '+19990000001',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_BUSINESS_ID,
        userId: ownerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    staffUser = await prisma.user.create({
      data: {
        id: E2E_STAFF_ID,
        phoneNormalized: '+19990000002',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_BUSINESS_ID,
        userId: staffUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    nobodyUser = await prisma.user.create({
      data: {
        id: E2E_NOBODY_ID,
        phoneNormalized: '+19990000003',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });
  });

  afterAll(async () => {
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_BUSINESS_ID },
    });
    await prisma.business.deleteMany({ where: { id: E2E_BUSINESS_ID } });
    await prisma.user.deleteMany({
      where: { id: { in: [E2E_OWNER_ID, E2E_STAFF_ID, E2E_NOBODY_ID] } },
    });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null;
  });

  // ── Test cases ──────────────────────────────────────────────────────────────

  it('owner returns 200 with their business', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get('/businesses/me')
      .expect(200);

    const body = res.body as BusinessMembership[];
    expect(body).toHaveLength(1);
    expect(body[0].role).toBe('OWNER');
    expect(body[0].business.id).toBe(E2E_BUSINESS_ID);
    expect(body[0].business.name).toBe('E2E Test Business');
  });

  it('member returns 200 with their business and role MEMBER', async () => {
    MockClerkAuthGuard.currentUser = staffUser;
    const res = await request(app.getHttpServer())
      .get('/businesses/me')
      .expect(200);

    const body = res.body as BusinessMembership[];
    expect(body).toHaveLength(1);
    expect(body[0].role).toBe('MEMBER');
    expect(body[0].business.id).toBe(E2E_BUSINESS_ID);
  });

  it('user with no business returns 200 and empty array', async () => {
    MockClerkAuthGuard.currentUser = nobodyUser;
    const res = await request(app.getHttpServer())
      .get('/businesses/me')
      .expect(200);

    expect(res.body as BusinessMembership[]).toEqual([]);
  });

  it('missing auth returns 401', async () => {
    // currentUser is null (reset by beforeEach)
    await request(app.getHttpServer()).get('/businesses/me').expect(401);
  });
});
