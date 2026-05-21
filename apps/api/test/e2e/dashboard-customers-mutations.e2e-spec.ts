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
import { CustomerStatus } from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2ee0000 ────────────────────────────────────
const E2E_CUST_MUT_BIZ_ID = 'e2ee0000-0000-4000-8000-000000000001';
const E2E_CUST_MUT_OWNER_USER_ID = 'e2ee0000-0000-4000-8000-000000000002';
const E2E_CUST_MUT_MGR_USER_ID = 'e2ee0000-0000-4000-8000-000000000003';
const E2E_CUST_MUT_MBR_USER_ID = 'e2ee0000-0000-4000-8000-000000000004';
const E2E_CUST_MUT_OUT_USER_ID = 'e2ee0000-0000-4000-8000-000000000005';
// Pre-seeded CustomerProfile for update/status tests (stable ID)
const E2E_CUST_MUT_EXISTING_CP_ID = 'e2ee0000-0000-4000-8000-000000000010';
// Cross-tenant fixture
const E2E_CUST_MUT_OTHER_BIZ_ID = 'e2ee0000-0000-4000-8000-000000000020';
const E2E_CUST_MUT_OTHER_USER_ID = 'e2ee0000-0000-4000-8000-000000000021';
const E2E_CUST_MUT_OTHER_CP_ID = 'e2ee0000-0000-4000-8000-000000000022';

// Phone numbers for seed User rows
const OWNER_PHONE = '+19990010001';
const MGR_PHONE = '+19990010002';
const MBR_PHONE = '+19990010003';
const OUT_PHONE = '+19990010004';
const OTHER_USER_PHONE = '+19990010005';

// Phone numbers for CustomerProfile rows
const EXISTING_CUSTOMER_PHONE = '+18880010001'; // pre-seeded; reused for duplicate-phone test
const OTHER_CUSTOMER_PHONE = '+18880010002'; // cross-tenant
const OWNER_CREATE_PHONE = '+18880010010'; // created by POST success test (owner)
const MGR_CREATE_PHONE = '+18880010011'; // created by POST success test (manager)

type CustomerDto = {
  businessCustomerId: string;
  customerProfileId: string;
  fullName: string;
  email: string | null;
  phone: string;
  status: string;
  notes: string | null;
};

// ─── Shared module-level setup ────────────────────────────────────────────────

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
let managerUser: User;
let memberUser: User;
let outsiderUser: User;

// BusinessCustomer IDs captured at runtime
let existingBCId: string; // pre-seeded; used by update/status tests
let otherBCId: string; // cross-tenant; used for cross-tenant safety tests

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
  // FK-safe: BusinessCustomer (references CustomerProfile) first
  await prisma.businessCustomer.deleteMany({
    where: {
      businessId: { in: [E2E_CUST_MUT_BIZ_ID, E2E_CUST_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.customerProfile.deleteMany({
    where: {
      phoneNormalized: {
        in: [
          EXISTING_CUSTOMER_PHONE,
          OTHER_CUSTOMER_PHONE,
          OWNER_CREATE_PHONE,
          MGR_CREATE_PHONE,
        ],
      },
    },
  });
  await prisma.businessUser.deleteMany({
    where: {
      businessId: { in: [E2E_CUST_MUT_BIZ_ID, E2E_CUST_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_CUST_MUT_BIZ_ID, E2E_CUST_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_CUST_MUT_OWNER_USER_ID,
          E2E_CUST_MUT_MGR_USER_ID,
          E2E_CUST_MUT_MBR_USER_ID,
          E2E_CUST_MUT_OUT_USER_ID,
          E2E_CUST_MUT_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_CUST_MUT_BIZ_ID,
      name: 'E2E Customer Mutations Business',
      slug: 'e2e-customer-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_CUST_MUT_OWNER_USER_ID,
      phoneNormalized: OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_CUST_MUT_BIZ_ID,
      userId: ownerUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_CUST_MUT_MGR_USER_ID,
      phoneNormalized: MGR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_CUST_MUT_BIZ_ID,
      userId: managerUser.id,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_CUST_MUT_MBR_USER_ID,
      phoneNormalized: MBR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_CUST_MUT_BIZ_ID,
      userId: memberUser.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_CUST_MUT_OUT_USER_ID,
      phoneNormalized: OUT_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // Pre-seeded CustomerProfile + BusinessCustomer for update/status tests
  const existingCp = await prisma.customerProfile.create({
    data: {
      id: E2E_CUST_MUT_EXISTING_CP_ID,
      fullName: 'Existing Customer',
      phoneNormalized: EXISTING_CUSTOMER_PHONE,
      email: 'existing@example.com',
    },
  });
  const existingBc = await prisma.businessCustomer.create({
    data: {
      businessId: E2E_CUST_MUT_BIZ_ID,
      customerProfileId: existingCp.id,
      status: CustomerStatus.ACTIVE,
      notes: null,
    },
  });
  existingBCId = existingBc.id;

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_CUST_MUT_OTHER_BIZ_ID,
      name: 'E2E Customer Mutations Other Business',
      slug: 'e2e-customer-mutations-other-business',
      status: 'ACTIVE',
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      id: E2E_CUST_MUT_OTHER_USER_ID,
      phoneNormalized: OTHER_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_CUST_MUT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  const otherCp = await prisma.customerProfile.create({
    data: {
      id: E2E_CUST_MUT_OTHER_CP_ID,
      fullName: 'Other Business Customer',
      phoneNormalized: OTHER_CUSTOMER_PHONE,
      email: null,
    },
  });
  const otherBc = await prisma.businessCustomer.create({
    data: {
      businessId: E2E_CUST_MUT_OTHER_BIZ_ID,
      customerProfileId: otherCp.id,
      status: CustomerStatus.ACTIVE,
      notes: null,
    },
  });
  otherBCId = otherBc.id;
});

afterAll(async () => {
  await prisma.businessCustomer.deleteMany({
    where: {
      businessId: { in: [E2E_CUST_MUT_BIZ_ID, E2E_CUST_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.customerProfile.deleteMany({
    where: {
      phoneNormalized: {
        in: [
          EXISTING_CUSTOMER_PHONE,
          OTHER_CUSTOMER_PHONE,
          OWNER_CREATE_PHONE,
          MGR_CREATE_PHONE,
        ],
      },
    },
  });
  await prisma.businessUser.deleteMany({
    where: {
      businessId: { in: [E2E_CUST_MUT_BIZ_ID, E2E_CUST_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_CUST_MUT_BIZ_ID, E2E_CUST_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_CUST_MUT_OWNER_USER_ID,
          E2E_CUST_MUT_MGR_USER_ID,
          E2E_CUST_MUT_MBR_USER_ID,
          E2E_CUST_MUT_OUT_USER_ID,
          E2E_CUST_MUT_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── POST /dashboard/businesses/:businessId/customers ─────────────────────────

describe('POST /dashboard/businesses/:businessId/customers', () => {
  it('owner → 201 with correct CustomerDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({
        fullName: 'Owner Created Customer',
        phone: OWNER_CREATE_PHONE,
        email: 'owner-customer@example.com',
        notes: 'Created by owner',
      })
      .expect(201);

    expect(res.body).toMatchObject<CustomerDto>({
      businessCustomerId: expect.any(String) as string,
      customerProfileId: expect.any(String) as string,
      fullName: 'Owner Created Customer',
      phone: OWNER_CREATE_PHONE,
      email: 'owner-customer@example.com',
      status: CustomerStatus.ACTIVE,
      notes: 'Created by owner',
    });
  });

  it('manager → 201', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({
        fullName: 'Manager Created Customer',
        phone: MGR_CREATE_PHONE,
      })
      .expect(201);

    const body = res.body as CustomerDto;
    expect(body.fullName).toBe('Manager Created Customer');
    expect(body.phone).toBe(MGR_CREATE_PHONE);
    expect(body.status).toBe(CustomerStatus.ACTIVE);
    expect(body.email).toBeNull();
    expect(body.notes).toBeNull();
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: 'Member Customer', phone: '+18880010020' })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: 'Outsider Customer', phone: '+18880010021' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: 'Anon Customer', phone: '+18880010022' })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/customers',
      )
      .send({ fullName: 'Customer', phone: '+18880010023' })
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403', async () => {
    // ownerUser belongs to E2E_CUST_MUT_BIZ_ID, not E2E_CUST_MUT_OTHER_BIZ_ID
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_OTHER_BIZ_ID}/customers`)
      .send({ fullName: 'Customer', phone: '+18880010040' })
      .expect(403);
  });

  it('missing fullName → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ phone: '+18880010030' })
      .expect(400);
  });

  it('empty fullName → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: '', phone: '+18880010031' })
      .expect(400);
  });

  it('missing phone → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: 'Customer' })
      .expect(400);
  });

  it('invalid phone format → 400', async () => {
    // normalizePhone throws BadRequestException for unrecognized format
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: 'Customer', phone: 'not-a-phone' })
      .expect(400);
  });

  it('invalid email format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({
        fullName: 'Customer',
        phone: '+18880010032',
        email: 'not-an-email',
      })
      .expect(400);
  });

  it('duplicate phone in same business → 409', async () => {
    // EXISTING_CUSTOMER_PHONE is already linked to this business via the pre-seeded BusinessCustomer
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers`)
      .send({ fullName: 'Duplicate Customer', phone: EXISTING_CUSTOMER_PHONE })
      .expect(409);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/customers/:businessCustomerId ─────

describe('PATCH /dashboard/businesses/:businessId/customers/:businessCustomerId', () => {
  it('owner → 200 with updated fullName', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ fullName: 'Updated By Owner' })
      .expect(200);

    const body = res.body as CustomerDto;
    expect(body.businessCustomerId).toBe(existingBCId);
    expect(body.customerProfileId).toBe(E2E_CUST_MUT_EXISTING_CP_ID);
    expect(body.fullName).toBe('Updated By Owner');
    expect(body.phone).toBe(EXISTING_CUSTOMER_PHONE);
    expect(body.status).toBe(CustomerStatus.ACTIVE);
  });

  it('manager → 200 with updated notes', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ notes: 'Updated by manager' })
      .expect(200);

    expect((res.body as CustomerDto).notes).toBe('Updated by manager');
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ fullName: 'Member Attempt' })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ fullName: 'Outsider Attempt' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ fullName: 'Anon Attempt' })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/customers/${existingBCId}`,
      )
      .send({ fullName: 'Update' })
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_OTHER_BIZ_ID}/customers/${otherBCId}`,
      )
      .send({ fullName: 'Update' })
      .expect(403);
  });

  it('non-existent businessCustomerId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/00000000-0000-4000-8000-000000000099`,
      )
      .send({ fullName: 'Update' })
      .expect(404);
  });

  it('cross-tenant businessCustomerId → 404', async () => {
    // Other business's BusinessCustomer ID passed to main business endpoint
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${otherBCId}`,
      )
      .send({ fullName: 'Cross Tenant Update' })
      .expect(404);
  });

  it('empty fullName → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ fullName: '' })
      .expect(400);
  });

  it('invalid email → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}`,
      )
      .send({ email: 'not-an-email' })
      .expect(400);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/customers/:businessCustomerId/status

describe('PATCH /dashboard/businesses/:businessId/customers/:businessCustomerId/status', () => {
  it('owner → 200 sets status BLOCKED', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(200);

    const body = res.body as CustomerDto;
    expect(body.businessCustomerId).toBe(existingBCId);
    expect(body.status).toBe(CustomerStatus.BLOCKED);
  });

  it('manager → 200 restores status ACTIVE', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({ status: CustomerStatus.ACTIVE })
      .expect(200);

    expect((res.body as CustomerDto).status).toBe(CustomerStatus.ACTIVE);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/customers/${existingBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_OTHER_BIZ_ID}/customers/${otherBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(403);
  });

  it('non-existent businessCustomerId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/00000000-0000-4000-8000-000000000099/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(404);
  });

  it('cross-tenant businessCustomerId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${otherBCId}/status`,
      )
      .send({ status: CustomerStatus.BLOCKED })
      .expect(404);
  });

  it('missing status → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({})
      .expect(400);
  });

  it('invalid status value → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_CUST_MUT_BIZ_ID}/customers/${existingBCId}/status`,
      )
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });
});
