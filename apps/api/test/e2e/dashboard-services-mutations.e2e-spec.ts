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

// ─── Stable IDs — hex-only prefix e2ec0000 ────────────────────────────────────
const E2E_SVC_MUT_BIZ_ID = 'e2ec0000-0000-4000-8000-000000000001';
const E2E_SVC_MUT_OWNER_USER_ID = 'e2ec0000-0000-4000-8000-000000000002';
const E2E_SVC_MUT_MGR_USER_ID = 'e2ec0000-0000-4000-8000-000000000003';
const E2E_SVC_MUT_MBR_USER_ID = 'e2ec0000-0000-4000-8000-000000000004';
const E2E_SVC_MUT_OUT_USER_ID = 'e2ec0000-0000-4000-8000-000000000005';
// Pre-seeded service used for update/status tests
const E2E_SVC_MUT_EXISTING_SVC_ID = 'e2ec0000-0000-4000-8000-000000000010';
// Cross-tenant fixture
const E2E_SVC_MUT_OTHER_BIZ_ID = 'e2ec0000-0000-4000-8000-000000000030';
const E2E_SVC_MUT_OTHER_USER_ID = 'e2ec0000-0000-4000-8000-000000000031';
const E2E_SVC_MUT_OTHER_SVC_ID = 'e2ec0000-0000-4000-8000-000000000033';

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
  // FK-safe order: Service → BusinessUser → Business → User
  await prisma.service.deleteMany({
    where: {
      businessId: { in: [E2E_SVC_MUT_BIZ_ID, E2E_SVC_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.businessUser.deleteMany({
    where: {
      businessId: { in: [E2E_SVC_MUT_BIZ_ID, E2E_SVC_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_SVC_MUT_BIZ_ID, E2E_SVC_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_SVC_MUT_OWNER_USER_ID,
          E2E_SVC_MUT_MGR_USER_ID,
          E2E_SVC_MUT_MBR_USER_ID,
          E2E_SVC_MUT_OUT_USER_ID,
          E2E_SVC_MUT_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_SVC_MUT_BIZ_ID,
      name: 'E2E Services Mutations Business',
      slug: 'e2e-services-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_SVC_MUT_OWNER_USER_ID,
      phoneNormalized: '+19990008001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_SVC_MUT_BIZ_ID,
      userId: ownerUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_SVC_MUT_MGR_USER_ID,
      phoneNormalized: '+19990008002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_SVC_MUT_BIZ_ID,
      userId: managerUser.id,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_SVC_MUT_MBR_USER_ID,
      phoneNormalized: '+19990008003',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_SVC_MUT_BIZ_ID,
      userId: memberUser.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_SVC_MUT_OUT_USER_ID,
      phoneNormalized: '+19990008004',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // Pre-seeded service: used by update and status test cases
  await prisma.service.create({
    data: {
      id: E2E_SVC_MUT_EXISTING_SVC_ID,
      businessId: E2E_SVC_MUT_BIZ_ID,
      name: 'Existing Service',
      durationMinutes: 60,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_SVC_MUT_OTHER_BIZ_ID,
      name: 'E2E Services Mutations Other Business',
      slug: 'e2e-services-mutations-other-business',
      status: 'ACTIVE',
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      id: E2E_SVC_MUT_OTHER_USER_ID,
      phoneNormalized: '+19990008010',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_SVC_MUT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.service.create({
    data: {
      id: E2E_SVC_MUT_OTHER_SVC_ID,
      businessId: E2E_SVC_MUT_OTHER_BIZ_ID,
      name: 'Other Business Service',
      durationMinutes: 30,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });
});

afterAll(async () => {
  // afterAll covers both pre-seeded rows and any services created by tests
  await prisma.service.deleteMany({
    where: {
      businessId: { in: [E2E_SVC_MUT_BIZ_ID, E2E_SVC_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.businessUser.deleteMany({
    where: {
      businessId: { in: [E2E_SVC_MUT_BIZ_ID, E2E_SVC_MUT_OTHER_BIZ_ID] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_SVC_MUT_BIZ_ID, E2E_SVC_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_SVC_MUT_OWNER_USER_ID,
          E2E_SVC_MUT_MGR_USER_ID,
          E2E_SVC_MUT_MBR_USER_ID,
          E2E_SVC_MUT_OUT_USER_ID,
          E2E_SVC_MUT_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── POST /dashboard/businesses/:businessId/services ──────────────────────────

describe('POST /dashboard/businesses/:businessId/services', () => {
  const VALID_BODY = {
    name: 'New Service',
    durationMinutes: 30,
    priceCents: 5000,
    bufferBeforeMin: 5,
    bufferAfterMin: 10,
    isActive: true,
  };

  it('owner → 201 with correct ServiceDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send(VALID_BODY)
      .expect(201);

    expect(res.body).toMatchObject<ServiceDto>({
      id: expect.any(String) as string,
      name: 'New Service',
      description: null,
      durationMinutes: 30,
      priceCents: 5000,
      isActive: true,
      bufferBeforeMin: 5,
      bufferAfterMin: 10,
    });
  });

  it('manager → 201', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: 'Manager Service', durationMinutes: 45 })
      .expect(201);

    const body = res.body as ServiceDto;
    expect(body.name).toBe('Manager Service');
    expect(body.durationMinutes).toBe(45);
    // isActive defaults to true when not provided
    expect(body.isActive).toBe(true);
    // buffers default to 0 when not provided
    expect(body.bufferBeforeMin).toBe(0);
    expect(body.bufferAfterMin).toBe(0);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send(VALID_BODY)
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send(VALID_BODY)
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send(VALID_BODY)
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/services',
      )
      .send(VALID_BODY)
      .expect(403);
  });

  it('missing required name → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ durationMinutes: 30 })
      .expect(400);
  });

  it('empty name → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: '', durationMinutes: 30 })
      .expect(400);
  });

  it('name exceeds 100 characters → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: 'A'.repeat(101), durationMinutes: 30 })
      .expect(400);
  });

  it('missing required durationMinutes → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: 'Service Without Duration' })
      .expect(400);
  });

  it('durationMinutes below minimum (4 < 5) → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: 'Short Service', durationMinutes: 4 })
      .expect(400);
  });

  it('durationMinutes above maximum (481 > 480) → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: 'Long Service', durationMinutes: 481 })
      .expect(400);
  });

  it('negative priceCents → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services`)
      .send({ name: 'Service', durationMinutes: 30, priceCents: -1 })
      .expect(400);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/services/:serviceId ──────────────

describe('PATCH /dashboard/businesses/:businessId/services/:serviceId', () => {
  it('owner → 200 with updated fields', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ name: 'Updated By Owner', description: 'Owner description' })
      .expect(200);

    const body = res.body as ServiceDto;
    expect(body.id).toBe(E2E_SVC_MUT_EXISTING_SVC_ID);
    expect(body.name).toBe('Updated By Owner');
    expect(body.description).toBe('Owner description');
  });

  it('manager → 200 with updated fields', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ durationMinutes: 45 })
      .expect(200);

    const body = res.body as ServiceDto;
    expect(body.id).toBe(E2E_SVC_MUT_EXISTING_SVC_ID);
    expect(body.durationMinutes).toBe(45);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ name: 'Member Attempt' })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ name: 'Outsider Attempt' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ name: 'No Auth Attempt' })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ name: 'Update' })
      .expect(403);
  });

  it('non-existent serviceId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/00000000-0000-4000-8000-000000000099`,
      )
      .send({ name: 'Update' })
      .expect(404);
  });

  it('cross-tenant serviceId → 404', async () => {
    // The other business's service ID passed to the main business — assertServiceInBusiness fails
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_OTHER_SVC_ID}`,
      )
      .send({ name: 'Cross Tenant Attempt' })
      .expect(404);
  });

  it('durationMinutes below minimum → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}`,
      )
      .send({ durationMinutes: 4 })
      .expect(400);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/services/:serviceId/status ───────

describe('PATCH /dashboard/businesses/:businessId/services/:serviceId/status', () => {
  it('owner → 200 sets isActive false', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({ isActive: false })
      .expect(200);

    const body = res.body as ServiceDto;
    expect(body.id).toBe(E2E_SVC_MUT_EXISTING_SVC_ID);
    expect(body.isActive).toBe(false);
  });

  it('manager → 200 sets isActive true', async () => {
    // Restore isActive after the owner test set it to false
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({ isActive: true })
      .expect(200);

    const body = res.body as ServiceDto;
    expect(body.isActive).toBe(true);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({ isActive: false })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({ isActive: false })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({ isActive: false })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({ isActive: false })
      .expect(403);
  });

  it('non-existent serviceId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/00000000-0000-4000-8000-000000000099/status`,
      )
      .send({ isActive: false })
      .expect(404);
  });

  it('cross-tenant serviceId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_OTHER_SVC_ID}/status`,
      )
      .send({ isActive: false })
      .expect(404);
  });

  it('missing isActive → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_SVC_MUT_BIZ_ID}/services/${E2E_SVC_MUT_EXISTING_SVC_ID}/status`,
      )
      .send({})
      .expect(400);
  });
});
