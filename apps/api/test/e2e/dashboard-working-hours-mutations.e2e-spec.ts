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
import {
  BusinessUserRole,
  BusinessUserStatus,
} from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2e40000 ────────────────────────────────────
const E2E_WH_MUT_BIZ_ID = 'e2e40000-0000-4000-8000-000000000001';
const E2E_WH_MUT_OWNER_USER_ID = 'e2e40000-0000-4000-8000-000000000002';
const E2E_WH_MUT_MGR_USER_ID = 'e2e40000-0000-4000-8000-000000000003';
const E2E_WH_MUT_MBR_USER_ID = 'e2e40000-0000-4000-8000-000000000004';
const E2E_WH_MUT_OUT_USER_ID = 'e2e40000-0000-4000-8000-000000000005';
const E2E_WH_MUT_SP_ID = 'e2e40000-0000-4000-8000-000000000010';
// Cross-tenant fixture
const E2E_WH_MUT_OTHER_BIZ_ID = 'e2e40000-0000-4000-8000-000000000020';
const E2E_WH_MUT_OTHER_USER_ID = 'e2e40000-0000-4000-8000-000000000021';
const E2E_WH_MUT_OTHER_SP_ID = 'e2e40000-0000-4000-8000-000000000030';

// User phones
const OWNER_PHONE = '+19990004001';
const MGR_PHONE = '+19990004002';
const MBR_PHONE = '+19990004003';
const OUT_PHONE = '+19990004004';
const OTHER_USER_PHONE = '+19990004010';

type WorkingHourDto = {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
};

// ─── Valid payload helpers ────────────────────────────────────────────────────
const VALID_PAYLOAD = {
  hours: [
    { dayOfWeek: 1, isClosed: false, startTime: '09:00', endTime: '17:00' },
  ],
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

  // ── Idempotent pre-cleanup (FK-safe order) ─────────────────────────────────
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [E2E_WH_MUT_SP_ID, E2E_WH_MUT_OTHER_SP_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_WH_MUT_OWNER_USER_ID,
          E2E_WH_MUT_MGR_USER_ID,
          E2E_WH_MUT_MBR_USER_ID,
          E2E_WH_MUT_OUT_USER_ID,
          E2E_WH_MUT_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_WH_MUT_BIZ_ID,
      name: 'E2E Working Hours Mutations Business',
      slug: 'e2e-working-hours-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_OWNER_USER_ID,
      phoneNormalized: OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const ownerBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: ownerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_MGR_USER_ID,
      phoneNormalized: MGR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: managerUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_MBR_USER_ID,
      phoneNormalized: MBR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_OUT_USER_ID,
      phoneNormalized: OUT_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // ServiceProvider for main business — linked to owner's BusinessUser
  await prisma.serviceProvider.create({
    data: {
      id: E2E_WH_MUT_SP_ID,
      businessId: E2E_WH_MUT_BIZ_ID,
      businessUserId: ownerBU.id,
      displayName: 'E2E Provider',
      isActive: true,
    },
  });

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_WH_MUT_OTHER_BIZ_ID,
      name: 'E2E Working Hours Mutations Other Business',
      slug: 'e2e-working-hours-mutations-other-business',
      status: 'ACTIVE',
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      id: E2E_WH_MUT_OTHER_USER_ID,
      phoneNormalized: OTHER_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const otherBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_WH_MUT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: E2E_WH_MUT_OTHER_SP_ID,
      businessId: E2E_WH_MUT_OTHER_BIZ_ID,
      businessUserId: otherBU.id,
      displayName: 'E2E Other Provider',
      isActive: true,
    },
  });
});

afterAll(async () => {
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { id: { in: [E2E_WH_MUT_SP_ID, E2E_WH_MUT_OTHER_SP_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_WH_MUT_BIZ_ID, E2E_WH_MUT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_WH_MUT_OWNER_USER_ID,
          E2E_WH_MUT_MGR_USER_ID,
          E2E_WH_MUT_MBR_USER_ID,
          E2E_WH_MUT_OUT_USER_ID,
          E2E_WH_MUT_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── PUT /dashboard/businesses/:businessId/working-hours ──────────────────────

describe('PUT /dashboard/businesses/:businessId/working-hours', () => {
  it('owner → 200 with correct WorkingHourDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as WorkingHourDto[];
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isClosed: false,
    });
  });

  it('isClosed=true → startTime and endTime are null in response', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [{ dayOfWeek: 0, isClosed: true }] })
      .expect(200);

    expect((res.body as WorkingHourDto[])[0]).toMatchObject({
      dayOfWeek: 0,
      isClosed: true,
      startTime: null,
      endTime: null,
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/working-hours',
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_OTHER_BIZ_ID}/working-hours`)
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('empty hours array → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [] })
      .expect(400);
  });

  it('more than 7 hours items → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const hours = Array.from({ length: 8 }, (_, i) => ({
      dayOfWeek: i,
      isClosed: true,
    }));
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours })
      .expect(400);
  });

  it('invalid dayOfWeek (> 6) → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [{ dayOfWeek: 7, isClosed: true }] })
      .expect(400);
  });

  it('open entry missing startTime → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({ hours: [{ dayOfWeek: 1, isClosed: false, endTime: '17:00' }] })
      .expect(400);
  });

  it('invalid time format → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '9:00',
            endTime: '17:00',
          },
        ],
      })
      .expect(400);
  });

  it('endTime not after startTime → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            startTime: '17:00',
            endTime: '09:00',
          },
        ],
      })
      .expect(400);
  });

  it('duplicate dayOfWeek → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(`/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/working-hours`)
      .send({
        hours: [
          { dayOfWeek: 1, isClosed: true },
          { dayOfWeek: 1, isClosed: true },
        ],
      })
      .expect(400);
  });
});

// ─── PUT /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours ───

describe('PUT /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours', () => {
  it('owner → 200 with correct WorkingHourDto shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send({
        hours: [
          {
            dayOfWeek: 2,
            isClosed: false,
            startTime: '10:00',
            endTime: '18:00',
          },
        ],
      })
      .expect(200);

    const body = res.body as WorkingHourDto[];
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject<WorkingHourDto>({
      id: expect.any(String) as string,
      dayOfWeek: 2,
      startTime: '10:00',
      endTime: '18:00',
      isClosed: false,
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('owner of another tenant calls other businessId → 403 (Pattern A)', async () => {
    // ownerUser belongs to E2E_WH_MUT_BIZ_ID, not E2E_WH_MUT_OTHER_BIZ_ID
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_OTHER_BIZ_ID}/service-providers/${E2E_WH_MUT_OTHER_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(403);
  });

  it('serviceProviderId from another business under main businessId → 404 (Pattern B)', async () => {
    // Access check passes (ownerUser is OWNER of main biz), but SP belongs to other biz
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_OTHER_SP_ID}/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(404);
  });

  it('non-existent serviceProviderId → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/00000000-0000-4000-8000-000000000000/working-hours`,
      )
      .send(VALID_PAYLOAD)
      .expect(404);
  });

  it('invalid DTO → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .put(
        `/dashboard/businesses/${E2E_WH_MUT_BIZ_ID}/service-providers/${E2E_WH_MUT_SP_ID}/working-hours`,
      )
      .send({ hours: [] })
      .expect(400);
  });
});
