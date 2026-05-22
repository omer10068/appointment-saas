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
  AppointmentStatus,
  BusinessUserRole,
  BusinessUserStatus,
} from '../../src/generated/prisma/client';
import { createTestApp } from '../helpers/create-test-app';
import { MockClerkAuthGuard } from '../helpers/mock-clerk-auth.guard';
import { requireTestDatabase } from '../helpers/test-db';

requireTestDatabase();

// ─── Stable IDs — hex-only prefix e2e10000 ────────────────────────────────────

const E2E_APT_BIZ_ID = 'e2e10000-0000-4000-8000-000000000001';

const E2E_APT_OWNER_USER_ID = 'e2e10000-0000-4000-8000-000000000002';
const E2E_APT_MGR_USER_ID = 'e2e10000-0000-4000-8000-000000000003';
const E2E_APT_MBR_USER_ID = 'e2e10000-0000-4000-8000-000000000004';
const E2E_APT_OUT_USER_ID = 'e2e10000-0000-4000-8000-000000000005';
const E2E_APT_SP_USER_ID = 'e2e10000-0000-4000-8000-000000000006';

const E2E_APT_CP_ID = 'e2e10000-0000-4000-8000-000000000010';
const E2E_APT_BC_ID = 'e2e10000-0000-4000-8000-000000000011';

const E2E_APT_SVC_ID = 'e2e10000-0000-4000-8000-000000000020';
const E2E_APT_INACTIVE_SVC_ID = 'e2e10000-0000-4000-8000-000000000021';
const E2E_APT_UNLINKED_SVC_ID = 'e2e10000-0000-4000-8000-000000000022';

const E2E_APT_SP_ID = 'e2e10000-0000-4000-8000-000000000030';
const E2E_APT_INACTIVE_SP_ID = 'e2e10000-0000-4000-8000-000000000031';

// Pre-seeded appointments
const E2E_APT_EXISTING_ID = 'e2e10000-0000-4000-8000-000000000040';
const E2E_APT_COMPLETED_ID = 'e2e10000-0000-4000-8000-000000000041';
const E2E_APT_CANCELLED_BIZ_ID = 'e2e10000-0000-4000-8000-000000000042';
const E2E_APT_CANCELLED_CUST_ID = 'e2e10000-0000-4000-8000-000000000043';
const E2E_APT_NO_SHOW_ID = 'e2e10000-0000-4000-8000-000000000044';
const E2E_APT_FOR_UPDATE_OWNER_ID = 'e2e10000-0000-4000-8000-000000000045';
const E2E_APT_FOR_UPDATE_MGR_ID = 'e2e10000-0000-4000-8000-000000000046';
const E2E_APT_FOR_OVERLAP_UPDATE_ID = 'e2e10000-0000-4000-8000-000000000047';
const E2E_APT_FOR_STATUS_OWNER_ID = 'e2e10000-0000-4000-8000-000000000048';
const E2E_APT_FOR_STATUS_MGR_ID = 'e2e10000-0000-4000-8000-000000000049';
const E2E_APT_FOR_AVAIL_UPDATE_ID = 'e2e10000-0000-4000-8000-000000000050';
const E2E_APT_AVAIL_EXCEPTION_ID = 'e2e10000-0000-4000-8000-000000000070';

// Cross-tenant fixture
const E2E_APT_OTHER_BIZ_ID = 'e2e10000-0000-4000-8000-000000000060';
const E2E_APT_OTHER_USER_ID = 'e2e10000-0000-4000-8000-000000000061';
const E2E_APT_OTHER_SP_USER_ID = 'e2e10000-0000-4000-8000-000000000062';
const E2E_APT_OTHER_CP_ID = 'e2e10000-0000-4000-8000-000000000063';
const E2E_APT_OTHER_BC_ID = 'e2e10000-0000-4000-8000-000000000064';
const E2E_APT_OTHER_SVC_ID = 'e2e10000-0000-4000-8000-000000000065';
const E2E_APT_OTHER_SP_ID = 'e2e10000-0000-4000-8000-000000000066';
const E2E_APT_OTHER_APT_ID = 'e2e10000-0000-4000-8000-000000000067';

// Phone numbers
const OWNER_PHONE = '+19990001001';
const MGR_PHONE = '+19990001002';
const MBR_PHONE = '+19990001003';
const OUT_PHONE = '+19990001004';
const SP_USER_PHONE = '+19990001005';
const OTHER_USER_PHONE = '+19990001010';
const OTHER_SP_USER_PHONE = '+19990001011';
const CP_PHONE = '+19990001020';
const OTHER_CP_PHONE = '+19990001021';

// Service duration used to compute expected endsAt in assertions
const SERVICE_DURATION_MINUTES = 60;

// Future appointment times — all beyond 2030 so past-date guard never fires
const EXISTING_STARTS_AT = '2030-06-15T09:00:00.000Z';
const EXISTING_ENDS_AT = '2030-06-15T10:00:00.000Z';
const UPDATE_OWNER_STARTS_AT = '2030-06-16T09:00:00.000Z';
const UPDATE_MGR_STARTS_AT = '2030-06-16T11:00:00.000Z';
const OVERLAP_UPDATE_STARTS_AT = '2030-06-16T13:00:00.000Z';
const STATUS_OWNER_STARTS_AT = '2030-06-17T09:00:00.000Z';
const STATUS_MGR_STARTS_AT = '2030-06-17T11:00:00.000Z';
const POST_OWNER_STARTS_AT = '2030-06-20T10:00:00.000Z';
const POST_MGR_STARTS_AT = '2030-06-20T12:00:00.000Z';
const CONFLICT_STARTS_AT = '2030-06-15T09:30:00.000Z'; // inside EXISTING window
const PATCH_OWNER_NEW_STARTS_AT = '2030-07-01T10:00:00.000Z';
const PATCH_MGR_NEW_STARTS_AT = '2030-07-01T12:00:00.000Z';

// Availability validation test times (business timezone = Asia/Jerusalem = UTC+3 in summer)
// Jul 4 = Thursday, Jul 7 = Sunday, Jul 8 = Monday
const AVAIL_POST_INSIDE_STARTS_AT = '2030-07-04T09:00:00.000Z'; // Thu 12:00 local — inside 08:00-18:00
const AVAIL_POST_OUTSIDE_BIZ_STARTS_AT = '2030-07-04T16:00:00.000Z'; // Thu 19:00 local — after 18:00 close
const AVAIL_POST_NO_SP_HRS_STARTS_AT = '2030-07-07T09:00:00.000Z'; // Sun 12:00 local — SP has no Sunday hours
const AVAIL_POST_EXCEPTION_STARTS_AT = '2030-07-08T09:00:00.000Z'; // Mon 12:00 local — business closed exception
const AVAIL_PATCH_OUTSIDE_STARTS_AT = '2030-07-04T16:00:00.000Z'; // Thu 19:00 local — after 18:00 close
const AVAIL_UPDATE_SEEDED_STARTS_AT = '2030-07-04T07:00:00.000Z'; // Thu 10:00 local — inside hours

function endsAt(startsAt: string, durationMinutes: number): string {
  return new Date(
    new Date(startsAt).getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
}

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
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.availabilityException.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderService.deleteMany({
    where: {
      serviceProviderId: {
        in: [E2E_APT_SP_ID, E2E_APT_INACTIVE_SP_ID, E2E_APT_OTHER_SP_ID],
      },
    },
  });
  await prisma.serviceProvider.deleteMany({
    where: {
      id: { in: [E2E_APT_SP_ID, E2E_APT_INACTIVE_SP_ID, E2E_APT_OTHER_SP_ID] },
    },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: { in: [E2E_APT_CP_ID, E2E_APT_OTHER_CP_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_APT_OWNER_USER_ID,
          E2E_APT_MGR_USER_ID,
          E2E_APT_MBR_USER_ID,
          E2E_APT_OUT_USER_ID,
          E2E_APT_SP_USER_ID,
          E2E_APT_OTHER_USER_ID,
          E2E_APT_OTHER_SP_USER_ID,
        ],
      },
    },
  });

  // ── Seed main business ─────────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_APT_BIZ_ID,
      name: 'E2E Appointment Mutations Business',
      slug: 'e2e-appointment-mutations-business',
      status: 'ACTIVE',
    },
  });

  ownerUser = await prisma.user.create({
    data: {
      id: E2E_APT_OWNER_USER_ID,
      phoneNormalized: OWNER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: ownerUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  managerUser = await prisma.user.create({
    data: {
      id: E2E_APT_MGR_USER_ID,
      phoneNormalized: MGR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: managerUser.id,
      role: BusinessUserRole.MANAGER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  memberUser = await prisma.user.create({
    data: {
      id: E2E_APT_MBR_USER_ID,
      phoneNormalized: MBR_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const memberBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: memberUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  outsiderUser = await prisma.user.create({
    data: {
      id: E2E_APT_OUT_USER_ID,
      phoneNormalized: OUT_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  // Dedicated user whose BusinessUser backs the active ServiceProvider
  const spUser = await prisma.user.create({
    data: {
      id: E2E_APT_SP_USER_ID,
      phoneNormalized: SP_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const spBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_BIZ_ID,
      userId: spUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  // Services
  await prisma.service.create({
    data: {
      id: E2E_APT_SVC_ID,
      businessId: E2E_APT_BIZ_ID,
      name: 'Test Service',
      durationMinutes: SERVICE_DURATION_MINUTES,
      isActive: true,
    },
  });
  await prisma.service.create({
    data: {
      id: E2E_APT_INACTIVE_SVC_ID,
      businessId: E2E_APT_BIZ_ID,
      name: 'Inactive Service',
      durationMinutes: 30,
      isActive: false,
    },
  });
  await prisma.service.create({
    data: {
      id: E2E_APT_UNLINKED_SVC_ID,
      businessId: E2E_APT_BIZ_ID,
      name: 'Unlinked Service',
      durationMinutes: 45,
      isActive: true,
    },
  });

  // Active ServiceProvider — linked to spBU, offers only SVC_ID
  await prisma.serviceProvider.create({
    data: {
      id: E2E_APT_SP_ID,
      businessId: E2E_APT_BIZ_ID,
      businessUserId: spBU.id,
      displayName: 'Test Provider',
      isActive: true,
    },
  });

  // Inactive ServiceProvider — linked to memberBU (isActive=false fires before BU check)
  await prisma.serviceProvider.create({
    data: {
      id: E2E_APT_INACTIVE_SP_ID,
      businessId: E2E_APT_BIZ_ID,
      businessUserId: memberBU.id,
      displayName: 'Inactive Provider',
      isActive: false,
    },
  });

  await prisma.serviceProviderService.create({
    data: { serviceProviderId: E2E_APT_SP_ID, serviceId: E2E_APT_SVC_ID },
  });

  // Customer
  await prisma.customerProfile.create({
    data: {
      id: E2E_APT_CP_ID,
      fullName: 'Test Customer',
      phoneNormalized: CP_PHONE,
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: E2E_APT_BC_ID,
      businessId: E2E_APT_BIZ_ID,
      customerProfileId: E2E_APT_CP_ID,
      status: 'ACTIVE',
    },
  });

  // ── Pre-seeded appointments ────────────────────────────────────────────────

  // EXISTING: SCHEDULED future appointment — anchor for conflict tests
  await prisma.appointment.create({
    data: {
      id: E2E_APT_EXISTING_ID,
      businessId: E2E_APT_BIZ_ID,
      businessCustomerId: E2E_APT_BC_ID,
      serviceId: E2E_APT_SVC_ID,
      serviceProviderId: E2E_APT_SP_ID,
      startsAt: new Date(EXISTING_STARTS_AT),
      endsAt: new Date(EXISTING_ENDS_AT),
      status: AppointmentStatus.SCHEDULED,
    },
  });

  // Terminal appointments (past dates — seeded directly, bypass past-date guard)
  for (const [id, status, date] of [
    [E2E_APT_COMPLETED_ID, AppointmentStatus.COMPLETED, '2024-01-15'],
    [
      E2E_APT_CANCELLED_BIZ_ID,
      AppointmentStatus.CANCELLED_BY_BUSINESS,
      '2024-01-16',
    ],
    [
      E2E_APT_CANCELLED_CUST_ID,
      AppointmentStatus.CANCELLED_BY_CUSTOMER,
      '2024-01-17',
    ],
    [E2E_APT_NO_SHOW_ID, AppointmentStatus.NO_SHOW, '2024-01-18'],
  ] as const) {
    await prisma.appointment.create({
      data: {
        id,
        businessId: E2E_APT_BIZ_ID,
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: new Date(`${date}T09:00:00.000Z`),
        endsAt: new Date(`${date}T10:00:00.000Z`),
        status,
      },
    });
  }

  // Future SCHEDULED appointments consumed by update and status success tests
  for (const [id, startsAtStr] of [
    [E2E_APT_FOR_UPDATE_OWNER_ID, UPDATE_OWNER_STARTS_AT],
    [E2E_APT_FOR_UPDATE_MGR_ID, UPDATE_MGR_STARTS_AT],
    [E2E_APT_FOR_OVERLAP_UPDATE_ID, OVERLAP_UPDATE_STARTS_AT],
    [E2E_APT_FOR_STATUS_OWNER_ID, STATUS_OWNER_STARTS_AT],
    [E2E_APT_FOR_STATUS_MGR_ID, STATUS_MGR_STARTS_AT],
  ] as const) {
    await prisma.appointment.create({
      data: {
        id,
        businessId: E2E_APT_BIZ_ID,
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: new Date(startsAtStr),
        endsAt: new Date(endsAt(startsAtStr, SERVICE_DURATION_MINUTES)),
        status: AppointmentStatus.SCHEDULED,
      },
    });
  }

  // ── Availability validation fixtures ──────────────────────────────────────

  // Business working hours: all 7 days, 08:00-18:00
  await prisma.businessWorkingHour.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      businessId: E2E_APT_BIZ_ID,
      dayOfWeek,
      startTime: '08:00',
      endTime: '18:00',
      isClosed: false,
    })),
  });

  // SP working hours: Monday (1) and Thursday (4) only
  await prisma.serviceProviderWorkingHour.createMany({
    data: [1, 4].map((dayOfWeek) => ({
      businessId: E2E_APT_BIZ_ID,
      serviceProviderId: E2E_APT_SP_ID,
      dayOfWeek,
      startTime: '08:00',
      endTime: '18:00',
      isClosed: false,
    })),
  });

  // Business-level closed exception for Monday July 8, 2030
  await prisma.availabilityException.create({
    data: {
      id: E2E_APT_AVAIL_EXCEPTION_ID,
      businessId: E2E_APT_BIZ_ID,
      serviceProviderId: null,
      date: new Date('2030-07-08'),
      isClosed: true,
    },
  });

  // Appointment used by the availability PATCH test: Thu Jul 4 10:00 Jerusalem — inside hours
  await prisma.appointment.create({
    data: {
      id: E2E_APT_FOR_AVAIL_UPDATE_ID,
      businessId: E2E_APT_BIZ_ID,
      businessCustomerId: E2E_APT_BC_ID,
      serviceId: E2E_APT_SVC_ID,
      serviceProviderId: E2E_APT_SP_ID,
      startsAt: new Date(AVAIL_UPDATE_SEEDED_STARTS_AT),
      endsAt: new Date(
        endsAt(AVAIL_UPDATE_SEEDED_STARTS_AT, SERVICE_DURATION_MINUTES),
      ),
      status: AppointmentStatus.SCHEDULED,
    },
  });

  // ── Cross-tenant fixture ───────────────────────────────────────────────────
  await prisma.business.create({
    data: {
      id: E2E_APT_OTHER_BIZ_ID,
      name: 'E2E Appointment Mutations Other Business',
      slug: 'e2e-appointment-mutations-other-business',
      status: 'ACTIVE',
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      id: E2E_APT_OTHER_USER_ID,
      phoneNormalized: OTHER_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_OTHER_BIZ_ID,
      userId: otherUser.id,
      role: BusinessUserRole.OWNER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  const otherSpUser = await prisma.user.create({
    data: {
      id: E2E_APT_OTHER_SP_USER_ID,
      phoneNormalized: OTHER_SP_USER_PHONE,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  const otherSpBU = await prisma.businessUser.create({
    data: {
      businessId: E2E_APT_OTHER_BIZ_ID,
      userId: otherSpUser.id,
      role: BusinessUserRole.MEMBER,
      status: BusinessUserStatus.ACTIVE,
    },
  });

  await prisma.service.create({
    data: {
      id: E2E_APT_OTHER_SVC_ID,
      businessId: E2E_APT_OTHER_BIZ_ID,
      name: 'Other Service',
      durationMinutes: 60,
      isActive: true,
    },
  });
  await prisma.serviceProvider.create({
    data: {
      id: E2E_APT_OTHER_SP_ID,
      businessId: E2E_APT_OTHER_BIZ_ID,
      businessUserId: otherSpBU.id,
      displayName: 'Other Provider',
      isActive: true,
    },
  });
  await prisma.serviceProviderService.create({
    data: {
      serviceProviderId: E2E_APT_OTHER_SP_ID,
      serviceId: E2E_APT_OTHER_SVC_ID,
    },
  });
  await prisma.customerProfile.create({
    data: {
      id: E2E_APT_OTHER_CP_ID,
      fullName: 'Other Customer',
      phoneNormalized: OTHER_CP_PHONE,
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: E2E_APT_OTHER_BC_ID,
      businessId: E2E_APT_OTHER_BIZ_ID,
      customerProfileId: E2E_APT_OTHER_CP_ID,
      status: 'ACTIVE',
    },
  });
  await prisma.appointment.create({
    data: {
      id: E2E_APT_OTHER_APT_ID,
      businessId: E2E_APT_OTHER_BIZ_ID,
      businessCustomerId: E2E_APT_OTHER_BC_ID,
      serviceId: E2E_APT_OTHER_SVC_ID,
      serviceProviderId: E2E_APT_OTHER_SP_ID,
      startsAt: new Date('2030-06-15T09:00:00.000Z'),
      endsAt: new Date('2030-06-15T10:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
    },
  });
});

afterAll(async () => {
  // FK-safe order: appointment → availabilityException → serviceProviderWorkingHour
  // → businessWorkingHour → serviceProviderService → serviceProvider
  // → businessCustomer → service → businessUser → business → customerProfile → user
  await prisma.appointment.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.availabilityException.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.businessWorkingHour.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.serviceProviderService.deleteMany({
    where: {
      serviceProviderId: {
        in: [E2E_APT_SP_ID, E2E_APT_INACTIVE_SP_ID, E2E_APT_OTHER_SP_ID],
      },
    },
  });
  await prisma.serviceProvider.deleteMany({
    where: {
      id: { in: [E2E_APT_SP_ID, E2E_APT_INACTIVE_SP_ID, E2E_APT_OTHER_SP_ID] },
    },
  });
  await prisma.businessCustomer.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.service.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.businessUser.deleteMany({
    where: { businessId: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [E2E_APT_BIZ_ID, E2E_APT_OTHER_BIZ_ID] } },
  });
  await prisma.customerProfile.deleteMany({
    where: { id: { in: [E2E_APT_CP_ID, E2E_APT_OTHER_CP_ID] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          E2E_APT_OWNER_USER_ID,
          E2E_APT_MGR_USER_ID,
          E2E_APT_MBR_USER_ID,
          E2E_APT_OUT_USER_ID,
          E2E_APT_SP_USER_ID,
          E2E_APT_OTHER_USER_ID,
          E2E_APT_OTHER_SP_USER_ID,
        ],
      },
    },
  });
  await app.close();
});

beforeEach(() => {
  MockClerkAuthGuard.currentUser = null;
});

// ─── POST /dashboard/businesses/:businessId/appointments ──────────────────────

describe('POST /dashboard/businesses/:businessId/appointments', () => {
  it('owner → 201 with correct AppointmentDto shape and derived endsAt', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: POST_OWNER_STARTS_AT,
      })
      .expect(201);

    expect(res.body).toMatchObject<AppointmentDto>({
      id: expect.any(String) as string,
      businessId: E2E_APT_BIZ_ID,
      businessCustomerId: E2E_APT_BC_ID,
      customerName: 'Test Customer',
      serviceId: E2E_APT_SVC_ID,
      serviceName: 'Test Service',
      serviceProviderId: E2E_APT_SP_ID,
      serviceProviderName: 'Test Provider',
      startsAt: POST_OWNER_STARTS_AT,
      endsAt: endsAt(POST_OWNER_STARTS_AT, SERVICE_DURATION_MINUTES),
      status: AppointmentStatus.SCHEDULED,
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
  });

  it('manager → 201', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: POST_MGR_STARTS_AT,
      })
      .expect(201);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T10:00:00.000Z',
      })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T11:00:00.000Z',
      })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T12:00:00.000Z',
      })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(
        '/dashboard/businesses/00000000-0000-4000-8000-000000000000/appointments',
      )
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T13:00:00.000Z',
      })
      .expect(403);
  });

  it('owner of main business uses other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_OTHER_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T14:00:00.000Z',
      })
      .expect(403);
  });

  it('businessCustomerId from another business → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_OTHER_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T15:00:00.000Z',
      })
      .expect(404);
  });

  it('serviceId from another business → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_OTHER_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-25T16:00:00.000Z',
      })
      .expect(404);
  });

  it('serviceProviderId from another business → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_OTHER_SP_ID,
        startsAt: '2030-06-25T17:00:00.000Z',
      })
      .expect(404);
  });

  it('inactive service → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_INACTIVE_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-26T10:00:00.000Z',
      })
      .expect(400);
  });

  it('inactive service provider → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_INACTIVE_SP_ID,
        startsAt: '2030-06-26T10:00:00.000Z',
      })
      .expect(400);
  });

  it('service provider does not offer selected service → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_UNLINKED_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-26T10:00:00.000Z',
      })
      .expect(400);
  });

  it('overlapping appointment for same service provider → 409', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // CONFLICT_STARTS_AT (09:30) falls inside EXISTING window (09:00–10:00)
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: CONFLICT_STARTS_AT,
      })
      .expect(409);
  });

  it('past startsAt → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2020-01-01T10:00:00.000Z',
      })
      .expect(400);
  });

  it('invalid businessCustomerId UUID → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: 'not-a-uuid',
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-27T10:00:00.000Z',
      })
      .expect(400);
  });

  it('invalid serviceId UUID → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: 'not-a-uuid',
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: '2030-06-27T10:00:00.000Z',
      })
      .expect(400);
  });

  it('invalid serviceProviderId UUID → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: 'not-a-uuid',
        startsAt: '2030-06-27T10:00:00.000Z',
      })
      .expect(400);
  });

  it('invalid startsAt → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: 'not-a-date',
      })
      .expect(400);
  });

  it('missing required fields → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({})
      .expect(400);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/appointments/:appointmentId ──────

describe('PATCH /dashboard/businesses/:businessId/appointments/:appointmentId', () => {
  it('owner → 200 with recomputed endsAt', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_FOR_UPDATE_OWNER_ID}`,
      )
      .send({ startsAt: PATCH_OWNER_NEW_STARTS_AT })
      .expect(200);

    expect(res.body).toMatchObject<Partial<AppointmentDto>>({
      id: E2E_APT_FOR_UPDATE_OWNER_ID,
      businessId: E2E_APT_BIZ_ID,
      startsAt: PATCH_OWNER_NEW_STARTS_AT,
      endsAt: endsAt(PATCH_OWNER_NEW_STARTS_AT, SERVICE_DURATION_MINUTES),
      status: AppointmentStatus.SCHEDULED,
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_FOR_UPDATE_MGR_ID}`,
      )
      .send({ startsAt: PATCH_MGR_NEW_STARTS_AT })
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ startsAt: '2030-08-01T10:00:00.000Z' })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ startsAt: '2030-08-01T10:00:00.000Z' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ startsAt: '2030-08-01T10:00:00.000Z' })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ startsAt: '2030-08-01T10:00:00.000Z' })
      .expect(403);
  });

  it('owner of main business uses other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_OTHER_BIZ_ID}/appointments/${E2E_APT_OTHER_APT_ID}`,
      )
      .send({ startsAt: '2030-08-01T10:00:00.000Z' })
      .expect(403);
  });

  it('appointmentId from another business under main businessId → 404 (Pattern B)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_OTHER_APT_ID}`,
      )
      .send({ startsAt: '2030-08-01T10:00:00.000Z' })
      .expect(404);
  });

  it('serviceId from another business → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ serviceId: E2E_APT_OTHER_SVC_ID })
      .expect(404);
  });

  it('serviceProviderId from another business → 404', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ serviceProviderId: E2E_APT_OTHER_SP_ID })
      .expect(404);
  });

  it('service provider does not offer selected service → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ serviceId: E2E_APT_UNLINKED_SVC_ID })
      .expect(400);
  });

  it('overlapping appointment after update → 409', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    // Move FOR_OVERLAP_UPDATE to 09:30 — conflicts with EXISTING (09:00–10:00)
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_FOR_OVERLAP_UPDATE_ID}`,
      )
      .send({ startsAt: CONFLICT_STARTS_AT })
      .expect(409);
  });

  it('past startsAt → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ startsAt: '2020-01-01T10:00:00.000Z' })
      .expect(400);
  });

  it('empty body → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({})
      .expect(400);
  });

  it('update terminal appointment (COMPLETED) → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_COMPLETED_ID}`,
      )
      .send({ serviceId: E2E_APT_SVC_ID })
      .expect(400);
  });

  it('invalid serviceId UUID → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ serviceId: 'not-a-uuid' })
      .expect(400);
  });

  it('invalid serviceProviderId UUID → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ serviceProviderId: 'not-a-uuid' })
      .expect(400);
  });

  it('invalid startsAt → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}`,
      )
      .send({ startsAt: 'not-a-date' })
      .expect(400);
  });
});

// ─── PATCH /dashboard/businesses/:businessId/appointments/:appointmentId/status

describe('PATCH /dashboard/businesses/:businessId/appointments/:appointmentId/status', () => {
  it('owner → 200 with updated status', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_FOR_STATUS_OWNER_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(200);

    expect(res.body).toMatchObject<Partial<AppointmentDto>>({
      id: E2E_APT_FOR_STATUS_OWNER_ID,
      status: 'CONFIRMED',
    });
  });

  it('manager → 200', async () => {
    MockClerkAuthGuard.currentUser = managerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_FOR_STATUS_MGR_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(200);
  });

  it('member → 403', async () => {
    MockClerkAuthGuard.currentUser = memberUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(403);
  });

  it('outsider → 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(403);
  });

  it('missing auth → 401', async () => {
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(401);
  });

  it('non-existent businessId → 403', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/00000000-0000-4000-8000-000000000000/appointments/${E2E_APT_EXISTING_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(403);
  });

  it('owner of main business uses other businessId → 403 (Pattern A)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_OTHER_BIZ_ID}/appointments/${E2E_APT_OTHER_APT_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(403);
  });

  it('appointmentId from another business under main businessId → 404 (Pattern B)', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_OTHER_APT_ID}/status`,
      )
      .send({ status: 'CONFIRMED' })
      .expect(404);
  });

  it('invalid status value → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}/status`,
      )
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });

  it('missing status → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_EXISTING_ID}/status`,
      )
      .send({})
      .expect(400);
  });

  it.each([
    [AppointmentStatus.COMPLETED, E2E_APT_COMPLETED_ID],
    [AppointmentStatus.CANCELLED_BY_BUSINESS, E2E_APT_CANCELLED_BIZ_ID],
    [AppointmentStatus.CANCELLED_BY_CUSTOMER, E2E_APT_CANCELLED_CUST_ID],
    [AppointmentStatus.NO_SHOW, E2E_APT_NO_SHOW_ID],
  ] as const)(
    'terminal appointment (%s) cannot change status → 400',
    async (_status, aptId) => {
      MockClerkAuthGuard.currentUser = ownerUser;
      await request(app.getHttpServer())
        .patch(
          `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${aptId}/status`,
        )
        .send({ status: 'SCHEDULED' })
        .expect(400);
    },
  );
});

// ─── Availability validation (POST / PATCH) ───────────────────────────────────

describe('Availability validation (POST/PATCH)', () => {
  it('POST inside business and SP working hours → 201', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: AVAIL_POST_INSIDE_STARTS_AT,
      })
      .expect(201);
  });

  it('POST outside business working hours → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: AVAIL_POST_OUTSIDE_BIZ_STARTS_AT,
      })
      .expect(400);
  });

  it('POST on day SP has no working hours → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: AVAIL_POST_NO_SP_HRS_STARTS_AT,
      })
      .expect(400);
  });

  it('POST on day with business-level closed exception → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .post(`/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments`)
      .send({
        businessCustomerId: E2E_APT_BC_ID,
        serviceId: E2E_APT_SVC_ID,
        serviceProviderId: E2E_APT_SP_ID,
        startsAt: AVAIL_POST_EXCEPTION_STARTS_AT,
      })
      .expect(400);
  });

  it('PATCH startsAt to time outside working hours → 400', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .patch(
        `/dashboard/businesses/${E2E_APT_BIZ_ID}/appointments/${E2E_APT_FOR_AVAIL_UPDATE_ID}`,
      )
      .send({ startsAt: AVAIL_PATCH_OUTSIDE_STARTS_AT })
      .expect(400);
  });
});
