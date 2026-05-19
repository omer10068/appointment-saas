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

// ─── Stable IDs — hex-only prefix e2e70000 ────────────────────────────────────
const E2E_STAFF_BIZ_ID = 'e2e70000-0000-4000-8000-000000000001';
const E2E_STAFF_OWNER_USER_ID = 'e2e70000-0000-4000-8000-000000000002';
const E2E_STAFF_MGR_USER_ID = 'e2e70000-0000-4000-8000-000000000003';
const E2E_STAFF_MBR_USER_ID = 'e2e70000-0000-4000-8000-000000000004';
const E2E_STAFF_OUT_USER_ID = 'e2e70000-0000-4000-8000-000000000005';
const E2E_STAFF_SVC_1_ID = 'e2e70000-0000-4000-8000-000000000010';
const E2E_STAFF_SVC_2_ID = 'e2e70000-0000-4000-8000-000000000011';
const E2E_STAFF_SM_1_ID = 'e2e70000-0000-4000-8000-000000000020';
const E2E_STAFF_SM_2_ID = 'e2e70000-0000-4000-8000-000000000021';
// Cross-tenant fixture — proves staff from another business are excluded
const E2E_STAFF_OTHER_BIZ_ID = 'e2e70000-0000-4000-8000-000000000030';
const E2E_STAFF_OTHER_USER_ID = 'e2e70000-0000-4000-8000-000000000031';
const E2E_STAFF_OTHER_SVC_ID = 'e2e70000-0000-4000-8000-000000000032';
const E2E_STAFF_OTHER_SM_ID = 'e2e70000-0000-4000-8000-000000000033';

// Response shape returned by GET /dashboard/businesses/:businessId/staff
type StaffMemberDto = {
  id: string;
  displayName: string;
  isActive: boolean;
  businessUserId: string;
  serviceIds: string[];
  createdAt: string;
  updatedAt: string;
};

describe('GET /dashboard/businesses/:businessId/staff', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerUser: User;
  let managerUser: User;
  let memberUser: User;
  let outsiderUser: User;
  // BusinessUser IDs are auto-generated; capture them for DTO assertions.
  let ownerBUId: string;
  let managerBUId: string;

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
    // StaffMember (onDelete: Cascade → StaffMemberService) must go before Service/BusinessUser.
    await prisma.staffMember.deleteMany({
      where: {
        businessId: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.service.deleteMany({
      where: {
        businessId: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            E2E_STAFF_OWNER_USER_ID,
            E2E_STAFF_MGR_USER_ID,
            E2E_STAFF_MBR_USER_ID,
            E2E_STAFF_OUT_USER_ID,
            E2E_STAFF_OTHER_USER_ID,
          ],
        },
      },
    });

    // ── Seed main business ─────────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_STAFF_BIZ_ID,
        name: 'E2E Staff Business',
        slug: 'e2e-staff-business',
        status: 'ACTIVE',
      },
    });

    ownerUser = await prisma.user.create({
      data: {
        id: E2E_STAFF_OWNER_USER_ID,
        phoneNormalized: '+19990003001',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    const ownerBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_STAFF_BIZ_ID,
        userId: ownerUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    ownerBUId = ownerBU.id;

    managerUser = await prisma.user.create({
      data: {
        id: E2E_STAFF_MGR_USER_ID,
        phoneNormalized: '+19990003002',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    const managerBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_STAFF_BIZ_ID,
        userId: managerUser.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });
    managerBUId = managerBU.id;

    memberUser = await prisma.user.create({
      data: {
        id: E2E_STAFF_MBR_USER_ID,
        phoneNormalized: '+19990003003',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    await prisma.businessUser.create({
      data: {
        businessId: E2E_STAFF_BIZ_ID,
        userId: memberUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    outsiderUser = await prisma.user.create({
      data: {
        id: E2E_STAFF_OUT_USER_ID,
        phoneNormalized: '+19990003004',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    // Services for main business
    await prisma.service.createMany({
      data: [
        {
          id: E2E_STAFF_SVC_1_ID,
          businessId: E2E_STAFF_BIZ_ID,
          name: 'Haircut',
          durationMinutes: 30,
          isActive: true,
          bufferBeforeMin: 0,
          bufferAfterMin: 0,
        },
        {
          id: E2E_STAFF_SVC_2_ID,
          businessId: E2E_STAFF_BIZ_ID,
          name: 'Manicure',
          durationMinutes: 45,
          isActive: true,
          bufferBeforeMin: 0,
          bufferAfterMin: 0,
        },
      ],
    });

    // StaffMember records — displayName asc ordering: "Alice Staff" < "Bob Staff"
    await prisma.staffMember.create({
      data: {
        id: E2E_STAFF_SM_1_ID,
        businessId: E2E_STAFF_BIZ_ID,
        businessUserId: ownerBUId,
        displayName: 'Alice Staff',
        isActive: true,
        services: {
          create: [
            { serviceId: E2E_STAFF_SVC_1_ID },
            { serviceId: E2E_STAFF_SVC_2_ID },
          ],
        },
      },
    });

    await prisma.staffMember.create({
      data: {
        id: E2E_STAFF_SM_2_ID,
        businessId: E2E_STAFF_BIZ_ID,
        businessUserId: managerBUId,
        displayName: 'Bob Staff',
        isActive: true,
        services: {
          create: [{ serviceId: E2E_STAFF_SVC_1_ID }],
        },
      },
    });

    // ── Cross-tenant fixture ───────────────────────────────────────────────────
    await prisma.business.create({
      data: {
        id: E2E_STAFF_OTHER_BIZ_ID,
        name: 'E2E Other Staff Business',
        slug: 'e2e-other-staff-business',
        status: 'ACTIVE',
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        id: E2E_STAFF_OTHER_USER_ID,
        phoneNormalized: '+19990003010',
        status: 'ACTIVE',
        platformRole: 'USER',
      },
    });

    const otherBU = await prisma.businessUser.create({
      data: {
        businessId: E2E_STAFF_OTHER_BIZ_ID,
        userId: otherUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    await prisma.service.create({
      data: {
        id: E2E_STAFF_OTHER_SVC_ID,
        businessId: E2E_STAFF_OTHER_BIZ_ID,
        name: 'Other Service',
        durationMinutes: 30,
        isActive: true,
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    });

    await prisma.staffMember.create({
      data: {
        id: E2E_STAFF_OTHER_SM_ID,
        businessId: E2E_STAFF_OTHER_BIZ_ID,
        businessUserId: otherBU.id,
        displayName: 'Other Staff',
        isActive: true,
        services: {
          create: [{ serviceId: E2E_STAFF_OTHER_SVC_ID }],
        },
      },
    });
  });

  afterAll(async () => {
    // FK-safe order: StaffMember (cascades StaffMemberService) → Service → BusinessUser → Business → User
    await prisma.staffMember.deleteMany({
      where: {
        businessId: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.service.deleteMany({
      where: {
        businessId: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.businessUser.deleteMany({
      where: {
        businessId: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [E2E_STAFF_BIZ_ID, E2E_STAFF_OTHER_BIZ_ID] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            E2E_STAFF_OWNER_USER_ID,
            E2E_STAFF_MGR_USER_ID,
            E2E_STAFF_MBR_USER_ID,
            E2E_STAFF_OUT_USER_ID,
            E2E_STAFF_OTHER_USER_ID,
          ],
        },
      },
    });
    await app.close();
  });

  beforeEach(() => {
    MockClerkAuthGuard.currentUser = null;
  });

  // ── Test cases ──────────────────────────────────────────────────────────────

  it('owner returns 200 with staff members and correct shape', async () => {
    MockClerkAuthGuard.currentUser = ownerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_STAFF_BIZ_ID}/staff`)
      .expect(200);

    const body = res.body as StaffMemberDto[];
    // Only the two staff members for this business — the cross-tenant staff
    // member (E2E_STAFF_OTHER_SM_ID) must not appear.
    expect(body).toHaveLength(2);
    const ids = body.map((s) => s.id);
    expect(ids).not.toContain(E2E_STAFF_OTHER_SM_ID);

    // Ordered by displayName asc: "Alice Staff" → index 0, "Bob Staff" → index 1
    expect(body[0]).toMatchObject<StaffMemberDto>({
      id: E2E_STAFF_SM_1_ID,
      displayName: 'Alice Staff',
      isActive: true,
      businessUserId: ownerBUId,
      serviceIds: expect.arrayContaining([
        E2E_STAFF_SVC_1_ID,
        E2E_STAFF_SVC_2_ID,
      ]) as string[],
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
    expect(body[0].serviceIds).toHaveLength(2);

    expect(body[1]).toMatchObject<StaffMemberDto>({
      id: E2E_STAFF_SM_2_ID,
      displayName: 'Bob Staff',
      isActive: true,
      businessUserId: managerBUId,
      serviceIds: [E2E_STAFF_SVC_1_ID],
      createdAt: expect.any(String) as string,
      updatedAt: expect.any(String) as string,
    });
    expect(body[1].serviceIds).toHaveLength(1);
  });

  it('manager returns 200 with staff members', async () => {
    // assertAccess allows any BusinessUser regardless of role
    MockClerkAuthGuard.currentUser = managerUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_STAFF_BIZ_ID}/staff`)
      .expect(200);

    const body = res.body as StaffMemberDto[];
    expect(body).toHaveLength(2);
    const smIds = body.map((s) => s.id);
    expect(smIds).toContain(E2E_STAFF_SM_1_ID);
    expect(smIds).toContain(E2E_STAFF_SM_2_ID);
  });

  it('member returns 200 with staff members', async () => {
    // assertAccess allows any BusinessUser regardless of role
    MockClerkAuthGuard.currentUser = memberUser;
    const res = await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_STAFF_BIZ_ID}/staff`)
      .expect(200);

    const body = res.body as StaffMemberDto[];
    expect(body).toHaveLength(2);
  });

  it('authenticated outsider not a member returns 403', async () => {
    MockClerkAuthGuard.currentUser = outsiderUser;
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_STAFF_BIZ_ID}/staff`)
      .expect(403);
  });

  it('missing auth returns 401', async () => {
    // currentUser is null (reset by beforeEach)
    await request(app.getHttpServer())
      .get(`/dashboard/businesses/${E2E_STAFF_BIZ_ID}/staff`)
      .expect(401);
  });

  it('non-existent businessId returns 403', async () => {
    // assertAccess finds no BusinessUser for this combination → ForbiddenException
    MockClerkAuthGuard.currentUser = ownerUser;
    await request(app.getHttpServer())
      .get('/dashboard/businesses/00000000-0000-4000-8000-000000000000/staff')
      .expect(403);
  });
});
