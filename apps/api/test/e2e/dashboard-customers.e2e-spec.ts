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

// ─── Stable IDs — hex-only prefix e2e60000 ────────────────────────────────────
const E2E_CUST_BUSINESS_ID = 'e2e60000-0000-4000-8000-000000000001';
const E2E_CUST_OWNER_ID = 'e2e60000-0000-4000-8000-000000000002';
const E2E_CUST_STAFF_ID = 'e2e60000-0000-4000-8000-000000000003';
const E2E_CUST_OUTSIDER_ID = 'e2e60000-0000-4000-8000-000000000004';
const E2E_CUST_PROFILE_1_ID = 'e2e60000-0000-4000-8000-000000000010';
const E2E_CUST_PROFILE_2_ID = 'e2e60000-0000-4000-8000-000000000011';
const E2E_CUST_BC_1_ID = 'e2e60000-0000-4000-8000-000000000020';
const E2E_CUST_BC_2_ID = 'e2e60000-0000-4000-8000-000000000021';
// Cross-tenant fixture — proves customers from another business are excluded
const E2E_CUST_OTHER_BUSINESS_ID = 'e2e60000-0000-4000-8000-000000000030';
const E2E_CUST_OTHER_PROFILE_ID = 'e2e60000-0000-4000-8000-000000000031';
const E2E_CUST_OTHER_BC_ID = 'e2e60000-0000-4000-8000-000000000032';

// Response shape returned by GET /dashboard/businesses/:businessId/customers
type CustomerDto = {
  businessCustomerId: string;
  customerProfileId: string;
  fullName: string;
  email: string | null;
  phone: string;
  status: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
  notes: string | null;
};

describe('GET /dashboard/businesses/:businessId/customers', () => {
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
    await prisma.businessCustomer.deleteMany({
      where: {
        businessId: { in: [E2E_CUST_BUSINESS_ID, E2E_CUST_OTHER_BUSINESS_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_CUST_BUSINESS_ID },
    });
    await prisma.customerProfile.deleteMany({
      where: {
        id: {
          in: [
            E2E_CUST_PROFILE_1_ID,
            E2E_CUST_PROFILE_2_ID,
            E2E_CUST_OTHER_PROFILE_ID,
          ],
        },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_CUST_BUSINESS_ID, E2E_CUST_OTHER_BUSINESS_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [E2E_CUST_OWNER_ID, E2E_CUST_STAFF_ID, E2E_CUST_OUTSIDER_ID],
        },
      },
    });

    // ── Seed minimal test data ─────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_CUST_BUSINESS_ID,
        name: 'E2E Customers Business',
        slug: 'e2e-customers-business',
        status: 'ACTIVE',
      },
    });

    ownerUser = await prisma.user.create({
      data: {
        id: E2E_CUST_OWNER_ID,
        phoneNormalized: '+19990002001',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_CUST_BUSINESS_ID,
        userId: ownerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    staffUser = await prisma.user.create({
      data: {
        id: E2E_CUST_STAFF_ID,
        phoneNormalized: '+19990002002',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_CUST_BUSINESS_ID,
        userId: staffUser.id,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    outsiderUser = await prisma.user.create({
      data: {
        id: E2E_CUST_OUTSIDER_ID,
        phoneNormalized: '+19990002003',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    // Create CustomerProfiles and BusinessCustomers sequentially so that
    // createdAt timestamps differ and the desc ordering is deterministic.
    //
    // BC_1 (ACTIVE, with notes) is created first → older → appears second in desc.
    // BC_2 (BLOCKED, no notes)  is created second → newer → appears first in desc.
    await prisma.customerProfile.create({
      data: {
        id: E2E_CUST_PROFILE_1_ID,
        fullName: 'Alice Test',
        email: 'alice@test.example',
        phoneNormalized: '+19990002010',
      },
    });

    await prisma.businessCustomer.create({
      data: {
        id: E2E_CUST_BC_1_ID,
        businessId: E2E_CUST_BUSINESS_ID,
        customerProfileId: E2E_CUST_PROFILE_1_ID,
        status: 'ACTIVE',
        notes: 'Test note for Alice',
      },
    });

    await prisma.customerProfile.create({
      data: {
        id: E2E_CUST_PROFILE_2_ID,
        fullName: 'Bob Test',
        email: null,
        phoneNormalized: '+19990002011',
      },
    });

    await prisma.businessCustomer.create({
      data: {
        id: E2E_CUST_BC_2_ID,
        businessId: E2E_CUST_BUSINESS_ID,
        customerProfileId: E2E_CUST_PROFILE_2_ID,
        status: 'BLOCKED',
        notes: null,
      },
    });

    // ── Cross-tenant fixture — a second business with its own customer ─────────
    await prisma.business.create({
      data: {
        id: E2E_CUST_OTHER_BUSINESS_ID,
        name: 'E2E Other Business',
        slug: 'e2e-other-customers-business',
        status: 'ACTIVE',
      },
    });

    await prisma.customerProfile.create({
      data: {
        id: E2E_CUST_OTHER_PROFILE_ID,
        fullName: 'Carol Other',
        email: null,
        phoneNormalized: '+19990002020',
      },
    });

    await prisma.businessCustomer.create({
      data: {
        id: E2E_CUST_OTHER_BC_ID,
        businessId: E2E_CUST_OTHER_BUSINESS_ID,
        customerProfileId: E2E_CUST_OTHER_PROFILE_ID,
        status: 'ACTIVE',
        notes: null,
      },
    });
  });

  afterAll(async () => {
    // Delete in FK-safe order: BusinessCustomer → CustomerProfile → BusinessUser → Business → User
    await prisma.businessCustomer.deleteMany({
      where: {
        businessId: { in: [E2E_CUST_BUSINESS_ID, E2E_CUST_OTHER_BUSINESS_ID] },
      },
    });
    await prisma.customerProfile.deleteMany({
      where: {
        id: {
          in: [
            E2E_CUST_PROFILE_1_ID,
            E2E_CUST_PROFILE_2_ID,
            E2E_CUST_OTHER_PROFILE_ID,
          ],
        },
      },
    });
    await prisma.businessUser.deleteMany({
      where: { businessId: E2E_CUST_BUSINESS_ID },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_CUST_BUSINESS_ID, E2E_CUST_OTHER_BUSINESS_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [E2E_CUST_OWNER_ID, E2E_CUST_STAFF_ID, E2E_CUST_OUTSIDER_ID],
        },
      },
    });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null;
  });

  // ── Test cases ──────────────────────────────────────────────────────────────

  it('owner returns 200 with customers and correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_CUST_BUSINESS_ID}/customers`)
      .expect(200);

    const body = res.body as CustomerDto[];
    // Only the two customers belonging to this business — the cross-tenant
    // customer (E2E_CUST_OTHER_BC_ID) must not appear.
    expect(body).toHaveLength(2);
    const ids = body.map((c) => c.businessCustomerId);
    expect(ids).not.toContain(E2E_CUST_OTHER_BC_ID);

    // Find each record regardless of position — createdAt desc ordering can
    // collapse to the same millisecond in fast CI, making index-based checks flaky.
    const alice = body.find((c) => c.businessCustomerId === E2E_CUST_BC_1_ID);
    const bob = body.find((c) => c.businessCustomerId === E2E_CUST_BC_2_ID);

    expect(alice).toBeDefined();
    expect(alice).toMatchObject<CustomerDto>({
      businessCustomerId: E2E_CUST_BC_1_ID,
      customerProfileId: E2E_CUST_PROFILE_1_ID,
      fullName: 'Alice Test',
      email: 'alice@test.example',
      phone: '+19990002010',
      // status and notes come from BusinessCustomer, not CustomerProfile
      status: 'ACTIVE',
      notes: 'Test note for Alice',
    });

    expect(bob).toBeDefined();
    expect(bob).toMatchObject<CustomerDto>({
      businessCustomerId: E2E_CUST_BC_2_ID,
      customerProfileId: E2E_CUST_PROFILE_2_ID,
      fullName: 'Bob Test',
      email: null,
      phone: '+19990002011',
      // BLOCKED status comes from BusinessCustomer (CustomerProfile has no status)
      status: 'BLOCKED',
      notes: null,
    });
  });

  it('staff returns 200 with customers', async () => {
    MockClerkAuthGuard.currentUser = staffUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_CUST_BUSINESS_ID}/customers`)
      .expect(200);

    const body = res.body as CustomerDto[];
    expect(body).toHaveLength(2);
    const ids = body.map((c) => c.businessCustomerId);
    expect(ids).toContain(E2E_CUST_BC_1_ID);
    expect(ids).toContain(E2E_CUST_BC_2_ID);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_CUST_BUSINESS_ID}/customers`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    // currentUser is null (reset by beforeEach)
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_CUST_BUSINESS_ID}/customers`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    // assertAccess finds no BusinessUser for this combination → ForbiddenException
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/customers',
      )
      .expect(403);
  });
});
