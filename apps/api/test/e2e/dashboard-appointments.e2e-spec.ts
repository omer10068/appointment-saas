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
import { AppointmentStatus } from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2eb0000 ────────────────────────────────────
const E2E_APT_BIZ_ID = 'e2eb0000-0000-4000-8000-000000000001';
const E2E_APT_OWNER_USER_ID = 'e2eb0000-0000-4000-8000-000000000002';
const E2E_APT_MGR_USER_ID = 'e2eb0000-0000-4000-8000-000000000003';
const E2E_APT_MBR_USER_ID = 'e2eb0000-0000-4000-8000-000000000004';
const E2E_APT_OUT_USER_ID = 'e2eb0000-0000-4000-8000-000000000005';
const E2E_APT_SVC_ID = 'e2eb0000-0000-4000-8000-000000000010';
const E2E_APT_PROFILE_ID = 'e2eb0000-0000-4000-8000-000000000020';
const E2E_APT_BC_ID = 'e2eb0000-0000-4000-8000-000000000040';
// Cross-tenant fixture
const E2E_APT_OTHER_BIZ_ID = 'e2eb0000-0000-4000-8000-000000000030';
const E2E_APT_OTHER_USER_ID = 'e2eb0000-0000-4000-8000-000000000031';
const E2E_APT_OTHER_PROFILE_ID = 'e2eb0000-0000-4000-8000-000000000032';
const E2E_APT_OTHER_SVC_ID = 'e2eb0000-0000-4000-8000-000000000033';

type AppointmentDto = {
  id: string;
  businessId: string;
  businessCustomerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  serviceProviderId: string;
  serviceProviderName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

let app: INestApplication<App>;
let prisma: PrismaService;
let ownerUser: User;
let managerUser: User;
let memberUser: User;
let outsiderUser: User;
let appointmentId: string;
let otherAppointmentId: string;

const APPOINTMENT_STARTS_AT = new Date('2026-06-15T10:00:00.000Z');
const APPOINTMENT_ENDS_AT = new Date('2026-06-15T11:00:00.000Z');

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
  // FK-safe order: Appointment → ServiceProvider → Service
  // → BusinessCustomer → CustomerProfile → BusinessUser → Business → User
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: {
      id: { in: [E2E_APT_SVC_ID, E2E_APT_OTHER_SVC_ID] },
    },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: {
      id: { in: [E2E_APT_PROFILE_ID, E2E_APT_OTHER_PROFILE_ID] },
    },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_APT_OWNER_USER_ID,
          E2E_APT_MGR_USER_ID,
          E2E_APT_MBR_USER_ID,
          E2E_APT_OUT_USER_ID,
          E2E_APT_OTHER_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_APT_BIZ_ID,
      name: 'E2E Appointments Business',
      slug: 'e2e-appointments-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_APT_OWNER_USER_ID,
      phoneNormalized: '+19990007001',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const ownerBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: ownerUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_APT_MGR_USER_ID,
      phoneNormalized: '+19990007002',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: managerUser.id,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_APT_MBR_USER_ID,
      phoneNormalized: '+19990007003',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: memberUser.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_APT_OUT_USER_ID,
      phoneNormalized: '+19990007004',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  await prisma.service.create({
    data: {
      id: E2E_APT_SVC_ID,
      businessId: E2E_APT_BIZ_ID,
      name: 'E2E Appointment Service',
      durationMinutes: 60,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

  await prisma.customerProfile.create({
    data: {
      id: E2E_APT_PROFILE_ID,
      fullName: 'E2E Appointment Customer',
      phoneNormalized: '+19990007010',
    },
  });

  const bc = await prisma.businessCustomer.create({
    data: {
      id: E2E_APT_BC_ID,
      businessId: E2E_APT_BIZ_ID,
      customerProfileId: E2E_APT_PROFILE_ID,
      status: 'ACTIVE',
    },
  });

  const sp = await prisma.serviceProvider.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      businessUserId: ownerBU.id,
      displayName: 'E2E Appointment Provider',
      isActive: true,
    },
  });

  const apt = await prisma.appointment.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      businessCustomerId: bc.id,
      serviceId: E2E_APT_SVC_ID,
      serviceProviderId: sp.id,
      startsAt: APPOINTMENT_STARTS_AT,
      endsAt: APPOINTMENT_ENDS_AT,
      status: AppointmentStatus.SCHEDULED,
    },
  });
  appointmentId = apt.id;

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_APT_OTHER_BIZ_ID,
      name: 'E2E Appointments Other Business',
      slug: 'e2e-appointments-other-business',
      status: 'ACTIVE',
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      id: E2E_APT_OTHER_USER_ID,
      phoneNormalized: '+19990007020',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const otherBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.service.create({
    data: {
      id: E2E_APT_OTHER_SVC_ID,
      businessId: E2E_APT_OTHER_BIZ_ID,
      name: 'E2E Other Appointment Service',
      durationMinutes: 60,
      isActive: true,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

  await prisma.customerProfile.create({
    data: {
      id: E2E_APT_OTHER_PROFILE_ID,
      fullName: 'E2E Other Customer',
      phoneNormalized: '+19990007021',
    },
  });

  const otherBc = await prisma.businessCustomer.create({
    data: {
      businessId: E2E_APT_OTHER_BIZ_ID,
      customerProfileId: E2E_APT_OTHER_PROFILE_ID,
      status: 'ACTIVE',
    },
  });

  const otherSp = await prisma.serviceProvider.create({
    data: {
      businessId: E2E_APT_OTHER_BIZ_ID,
      businessUserId: otherBU.id,
      displayName: 'E2E Other Provider',
      isActive: true,
    },
  });

  const otherApt = await prisma.appointment.create({
    data: {
      businessId: E2E_APT_OTHER_BIZ_ID,
      businessCustomerId: otherBc.id,
      serviceId: E2E_APT_OTHER_SVC_ID,
      serviceProviderId: otherSp.id,
      startsAt: APPOINTMENT_STARTS_AT,
      endsAt: APPOINTMENT_ENDS_AT,
      status: AppointmentStatus.SCHEDULED,
    },
  });
  otherAppointmentId = otherApt.id;
});

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProvider.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: {
      id: { in: [E2E_APT_SVC_ID, E2E_APT_OTHER_SVC_ID] },
    },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: {
      id: { in: [E2E_APT_PROFILE_ID, E2E_APT_OTHER_PROFILE_ID] },
    },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_APT_OWNER_USER_ID,
          E2E_APT_MGR_USER_ID,
          E2E_APT_MBR_USER_ID,
          E2E_APT_OUT_USER_ID,
          E2E_APT_OTHER_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── GET /dashboard/businesses/:businessId/appointments ───────────────────────

describe('GET /dashboard/businesses/:businessId/appointments', () => {
  it('owner returns 200 with seeded appointment and correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .expect(200);

    const body = res.body as AppointmentDto[];
    expect(Array.isArray(body)).toBe(true);

    // Exactly one appointment for this business — cross-tenant must not appear
    expect(body).toHaveLength(1);
    const ids = body.map((a) => a.id);
    expect(ids).not.toContain(otherAppointmentId);

    expect(body[0]).toMatchObject<AppointmentDto>({
      id: appointmentId,
      businessId: E2E_APT_BIZ_ID,
      businessCustomerId: expect.any(String) as string,
      customerName: 'E2E Appointment Customer',
      serviceId: E2E_APT_SVC_ID,
      serviceName: 'E2E Appointment Service',
      serviceProviderId: expect.any(String) as string,
      serviceProviderName: 'E2E Appointment Provider',
      startsAt: expect.any(String) as string,
      endsAt: expect.any(String) as string,
      status: 'SCHEDULED',
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
  });

  it('owner with from filter that covers the appointment returns it', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .query({ from: '2026-06-15' })
      .expect(200);

    const body = res.body as AppointmentDto[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(appointmentId);
  });

  it('owner with from filter after the appointment returns empty list', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .query({ from: '2026-07-01' })
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('owner with status filter matching the appointment returns it', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .query({ status: 'SCHEDULED' })
      .expect(200);

    const body = res.body as AppointmentDto[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(appointmentId);
    expect(body[0].status).toBe('SCHEDULED');
  });

  it('manager returns 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('member returns 200', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .expect(200);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/appointments',
      )
      .expect(403);
  });

  it('businessCustomerId filter returns only that customer appointments', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .query({ businessCustomerId: E2E_APT_BC_ID })
      .expect(200);

    const body = res.body as AppointmentDto[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(appointmentId);
    expect(body[0].businessCustomerId).toBe(E2E_APT_BC_ID);
  });

  it('businessCustomerId filter for unknown customer returns empty list', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .query({ businessCustomerId: 'e2eb0000-0000-4000-8000-999999999999' })
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
