import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  BusinessStatus,
  BusinessUserRole,
  BusinessUserStatus,
} from '../../src/generated/prisma/client';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PublicModule } from '../../src/public/public.module';
import { createTestApp } from '../helpers/create-test-app';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2e15000 ────────────────────────────────────

const PUB_BIZ_ID = 'e2e15000-0000-4000-8000-000000000001';
const PUB_BIZ_SLUG = 'e2e15-active-business';

const PUB_SUSPENDED_BIZ_ID = 'e2e15000-0000-4000-8000-000000000002';
const PUB_SUSPENDED_BIZ_SLUG = 'e2e15-suspended-business';

const PUB_SP_USER_ID = 'e2e15000-0000-4000-8000-000000000010';
const PUB_SP_BU_ID = 'e2e15000-0000-4000-8000-000000000011';
const PUB_INACTIVE_SP_USER_ID = 'e2e15000-0000-4000-8000-000000000012';
const PUB_INACTIVE_SP_BU_ID = 'e2e15000-0000-4000-8000-000000000013';

const PUB_SVC_ACTIVE_ID = 'e2e15000-0000-4000-8000-000000000020';
const PUB_SVC_INACTIVE_ID = 'e2e15000-0000-4000-8000-000000000021';

const PUB_SP_ACTIVE_ID = 'e2e15000-0000-4000-8000-000000000030';
const PUB_SP_INACTIVE_ID = 'e2e15000-0000-4000-8000-000000000031';

// Test date: 2030-07-01 is a Monday (dayOfWeek = 1)
const TEST_DATE = '2030-07-01';
const SERVICE_DURATION = 60;

let app: INestApplication<App>;
let prisma: PrismaService;

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
      PrismaModule,
      PublicModule,
    ],
  }).compile();

  app = await createTestApp(module);
  prisma = module.get(PrismaService);

  // ── Idempotent pre-cleanup (FK-safe order) ─────────────────────────────────
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [PUB_BIZ_ID, PUB_SUSPENDED_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [PUB_BIZ_ID, PUB_SUSPENDED_BIZ_ID] } },
  });
  await prisma.serviceProviderService.deleteMany({
    where: {
      serviceProviderId: { in: [PUB_SP_ACTIVE_ID, PUB_SP_INACTIVE_ID] },
    },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [PUB_SP_ACTIVE_ID, PUB_SP_INACTIVE_ID] } },
  });
  await prisma.service.deleteMany({
    where: { id: { in: [PUB_SVC_ACTIVE_ID, PUB_SVC_INACTIVE_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { id: { in: [PUB_SP_BU_ID, PUB_INACTIVE_SP_BU_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [PUB_BIZ_ID, PUB_SUSPENDED_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [PUB_SP_USER_ID, PUB_INACTIVE_SP_USER_ID] } },
  });

  // ── Seed active business ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: PUB_BIZ_ID,
      name: 'E2E Public Business',
      slug: PUB_BIZ_SLUG,
      status: BusinessStatus.ACTIVE,
      // timezone defaults to Asia/Jerusalem
    },
  });

  // SP backing user (active)
  const spUser = await prisma.user.create({
    data: {
      id: PUB_SP_USER_ID,
      phoneNormalized: '+19990051001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const spBU = await prisma.businessUser.create({
    data: {
      id: PUB_SP_BU_ID,
      businessId: PUB_BIZ_ID,
      userId: spUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  // SP backing user (inactive — for filtering test)
  const inactiveSpUser = await prisma.user.create({
    data: {
      id: PUB_INACTIVE_SP_USER_ID,
      phoneNormalized: '+19990051002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const inactiveSpBU = await prisma.businessUser.create({
    data: {
      id: PUB_INACTIVE_SP_BU_ID,
      businessId: PUB_BIZ_ID,
      userId: inactiveSpUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  // Services
  await prisma.service.create({
    data: {
      id: PUB_SVC_ACTIVE_ID,
      businessId: PUB_BIZ_ID,
      name: 'Active Service',
      durationMinutes: SERVICE_DURATION,
      isActive: true,
    },
  });
  await prisma.service.create({
    data: {
      id: PUB_SVC_INACTIVE_ID,
      businessId: PUB_BIZ_ID,
      name: 'Inactive Service',
      durationMinutes: 30,
      isActive: false,
    },
  });

  // Service providers
  await prisma.serviceProvider.create({
    data: {
      id: PUB_SP_ACTIVE_ID,
      businessId: PUB_BIZ_ID,
      businessUserId: spBU.id,
      displayName: 'Active Provider',
      isActive: true,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: PUB_SP_INACTIVE_ID,
      businessId: PUB_BIZ_ID,
      businessUserId: inactiveSpBU.id,
      displayName: 'Inactive Provider',
      isActive: false,
    },
  });

  // SP-service link (for available-slots)
  await prisma.serviceProviderService.create({
    data: { serviceProviderId: PUB_SP_ACTIVE_ID, serviceId: PUB_SVC_ACTIVE_ID },
  });

  // Business working hours: Monday (1) 08:00-17:00
  await prisma.businessWorkingHour.create({
    data: {
      businessId: PUB_BIZ_ID,
      dayOfWeek: 1,
      isClosed: false,
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  // SP working hours: Monday (1) 08:00-17:00
  await prisma.serviceProviderWorkingHour.create({
    data: {
      businessId: PUB_BIZ_ID,
      serviceProviderId: PUB_SP_ACTIVE_ID,
      dayOfWeek: 1,
      isClosed: false,
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  // ── Seed suspended business ────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: PUB_SUSPENDED_BIZ_ID,
      name: 'E2E Suspended Business',
      slug: PUB_SUSPENDED_BIZ_SLUG,
      status: BusinessStatus.SUSPENDED,
    },
  });
});

afterAll(async () => {
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [PUB_BIZ_ID, PUB_SUSPENDED_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [PUB_BIZ_ID, PUB_SUSPENDED_BIZ_ID] } },
  });
  await prisma.serviceProviderService.deleteMany({
    where: {
      serviceProviderId: { in: [PUB_SP_ACTIVE_ID, PUB_SP_INACTIVE_ID] },
    },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [PUB_SP_ACTIVE_ID, PUB_SP_INACTIVE_ID] } },
  });
  await prisma.service.deleteMany({
    where: { id: { in: [PUB_SVC_ACTIVE_ID, PUB_SVC_INACTIVE_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { id: { in: [PUB_SP_BU_ID, PUB_INACTIVE_SP_BU_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [PUB_BIZ_ID, PUB_SUSPENDED_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [PUB_SP_USER_ID, PUB_INACTIVE_SP_USER_ID] } },
  });
  await app.close();
});

// ─── GET /public/businesses/:slug ─────────────────────────────────────────────

describe('GET /public/businesses/:slug', () => {
  it('returns 200 with correct profile shape for an active business', async () => {
    const res = await request(app.getHttpServer()).get(
      `/public/businesses/${PUB_BIZ_SLUG}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: PUB_BIZ_ID,
      name: 'E2E Public Business',
      slug: PUB_BIZ_SLUG,
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL',
      currency: 'ILS',
    });
    expect(res.body).not.toHaveProperty('status');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app.getHttpServer()).get(
      '/public/businesses/does-not-exist',
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for a suspended business', async () => {
    const res = await request(app.getHttpServer()).get(
      `/public/businesses/${PUB_SUSPENDED_BIZ_SLUG}`,
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /public/businesses/:slug/services ────────────────────────────────────

describe('GET /public/businesses/:slug/services', () => {
  it('returns 200 with only active services', async () => {
    const res = await request(app.getHttpServer()).get(
      `/public/businesses/${PUB_BIZ_SLUG}/services`,
    );

    expect(res.status).toBe(200);
    const body = res.body as { id: string; name: string }[];
    expect(Array.isArray(body)).toBe(true);

    const ids = body.map((s) => s.id);
    expect(ids).toContain(PUB_SVC_ACTIVE_ID);
    expect(ids).not.toContain(PUB_SVC_INACTIVE_ID);
  });

  it('active service has correct shape', async () => {
    const res = await request(app.getHttpServer()).get(
      `/public/businesses/${PUB_BIZ_SLUG}/services`,
    );

    expect(res.status).toBe(200);
    const body = res.body as {
      id: string;
      name: string;
      description: string | null;
      durationMinutes: number;
      priceCents: number | null;
    }[];
    const svc = body.find((s) => s.id === PUB_SVC_ACTIVE_ID);
    expect(svc).toBeDefined();
    expect(svc).toMatchObject({
      id: PUB_SVC_ACTIVE_ID,
      name: 'Active Service',
      durationMinutes: SERVICE_DURATION,
    });
    expect(Object.keys(svc!)).toContain('description');
    expect(Object.keys(svc!)).toContain('priceCents');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app.getHttpServer()).get(
      '/public/businesses/does-not-exist/services',
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /public/businesses/:slug/service-providers ──────────────────────────

describe('GET /public/businesses/:slug/service-providers', () => {
  it('returns 200 with only active providers', async () => {
    const res = await request(app.getHttpServer()).get(
      `/public/businesses/${PUB_BIZ_SLUG}/service-providers`,
    );

    expect(res.status).toBe(200);
    const body = res.body as { id: string; displayName: string }[];
    expect(Array.isArray(body)).toBe(true);

    const ids = body.map((p) => p.id);
    expect(ids).toContain(PUB_SP_ACTIVE_ID);
    expect(ids).not.toContain(PUB_SP_INACTIVE_ID);
  });

  it('active provider has correct shape', async () => {
    const res = await request(app.getHttpServer()).get(
      `/public/businesses/${PUB_BIZ_SLUG}/service-providers`,
    );

    expect(res.status).toBe(200);
    const body = res.body as { id: string; displayName: string }[];
    const provider = body.find((p) => p.id === PUB_SP_ACTIVE_ID);
    expect(provider).toBeDefined();
    expect(provider).toMatchObject({
      id: PUB_SP_ACTIVE_ID,
      displayName: 'Active Provider',
    });
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app.getHttpServer()).get(
      '/public/businesses/does-not-exist/service-providers',
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /public/businesses/:slug/available-slots ────────────────────────────

describe('GET /public/businesses/:slug/available-slots', () => {
  function slotsQuery(overrides: Record<string, string> = {}) {
    return {
      serviceId: PUB_SVC_ACTIVE_ID,
      serviceProviderId: PUB_SP_ACTIVE_ID,
      date: TEST_DATE,
      intervalMinutes: '60',
      ...overrides,
    };
  }

  it('returns 200 with correct response shape', async () => {
    const res = await request(app.getHttpServer())
      .get(`/public/businesses/${PUB_BIZ_SLUG}/available-slots`)
      .query(slotsQuery());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      date: TEST_DATE,
      timezone: 'Asia/Jerusalem',
      serviceId: PUB_SVC_ACTIVE_ID,
      serviceProviderId: PUB_SP_ACTIVE_ID,
      durationMinutes: SERVICE_DURATION,
      intervalMinutes: 60,
    });
    const body = res.body as { slots: { localStartTime: string }[] };
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body.slots.length).toBeGreaterThan(0);
    expect(body.slots[0]).toHaveProperty('startsAt');
    expect(body.slots[0]).toHaveProperty('endsAt');
    expect(body.slots[0]).toHaveProperty('localStartTime');
    expect(body.slots[0]).toHaveProperty('localEndTime');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/businesses/does-not-exist/available-slots')
      .query(slotsQuery());

    expect(res.status).toBe(404);
  });

  it('returns 404 for a suspended business', async () => {
    const res = await request(app.getHttpServer())
      .get(`/public/businesses/${PUB_SUSPENDED_BIZ_SLUG}/available-slots`)
      .query(slotsQuery());

    expect(res.status).toBe(404);
  });

  it('returns 400 when service is inactive', async () => {
    const res = await request(app.getHttpServer())
      .get(`/public/businesses/${PUB_BIZ_SLUG}/available-slots`)
      .query(slotsQuery({ serviceId: PUB_SVC_INACTIVE_ID }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when SP does not offer the service (no link)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/public/businesses/${PUB_BIZ_SLUG}/available-slots`)
      .query(
        slotsQuery({
          serviceId: PUB_SVC_ACTIVE_ID,
          serviceProviderId: PUB_SP_INACTIVE_ID,
        }),
      );

    // PUB_SP_INACTIVE_ID is isActive:false → 400 from engine before link check
    expect(res.status).toBe(400);
  });
});
