import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Stable UUIDs — these are fixed so Postman env vars survive DB resets
const SUPER_ADMIN_ID = 'd8ccc07a-e315-40d6-a4c1-d6e227590c5b';
const BUSINESS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
const YUVAL_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const AVIVIT_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002';
const SVC_CONSULT_ID = '11111111-1111-4111-8111-111111111111';
const SVC_LASER_FACE_ID = '22222222-2222-4222-8222-222222222222';
const SVC_LASER_LEGS_ID = '33333333-3333-4333-8333-333333333333';

async function main() {
  console.log('Seeding dev data...');

  // Platform SUPER_ADMIN — update and create are fully consistent
  const superAdmin = await prisma.user.upsert({
    where: { id: SUPER_ADMIN_ID },
    update: {
      clerkUserId: 'user_3DlLgMQ6Ni2Hr21fsmuWYXdlnHc',
      email: 'omer10068@gmail.com',
      phoneNormalized: '+972501111111',
      phoneVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      platformRole: 'SUPER_ADMIN',
    },
    create: {
      id: SUPER_ADMIN_ID,
      clerkUserId: 'user_3DlLgMQ6Ni2Hr21fsmuWYXdlnHc',
      email: 'omer10068@gmail.com',
      phoneNormalized: '+972501111111',
      phoneVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      platformRole: 'SUPER_ADMIN',
    },
  });

  // Business: Yuval Turgeman — stable ID set in create so it survives resets
  const business = await prisma.business.upsert({
    where: { slug: 'yuval-turgeman' },
    update: {},
    create: {
      id: BUSINESS_ID,
      name: 'Yuval Turgeman',
      slug: 'yuval-turgeman',
      status: 'ACTIVE',
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL',
      currency: 'ILS',
    },
  });

  // Services — IDs are valid UUIDs; required by @IsUUID() in appointment DTOs
  const svcConsult = await prisma.service.upsert({
    where: { id: SVC_CONSULT_ID },
    update: {},
    create: {
      id: SVC_CONSULT_ID,
      businessId: business.id,
      name: 'פגישת ייעוץ',
      durationMinutes: 20,
      priceCents: 0,
      isActive: true,
    },
  });

  const svcLaserFace = await prisma.service.upsert({
    where: { id: SVC_LASER_FACE_ID },
    update: {},
    create: {
      id: SVC_LASER_FACE_ID,
      businessId: business.id,
      name: 'הסרת שיער בלייזר - פנים',
      durationMinutes: 30,
      priceCents: 12000,
      isActive: true,
    },
  });

  const svcLaserLegs = await prisma.service.upsert({
    where: { id: SVC_LASER_LEGS_ID },
    update: {},
    create: {
      id: SVC_LASER_LEGS_ID,
      businessId: business.id,
      name: 'הסרת שיער בלייזר - רגליים',
      durationMinutes: 60,
      priceCents: 25000,
      isActive: true,
    },
  });

  // Owner: Yuval Turgeman — upsert by stable ID; where and create phone match
  const yuvalUser = await prisma.user.upsert({
    where: { id: YUVAL_USER_ID },
    update: {},
    create: {
      id: YUVAL_USER_ID,
      clerkUserId: 'user_3Dnq0lwCHze3mSiCbqbbfWDRGLo',
      phoneNormalized: '+972501234567',
      email: 'owner+clerk_test@example.com',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const yuvalBu = await prisma.businessUser.upsert({
    where: {
      businessId_userId: { businessId: business.id, userId: yuvalUser.id },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: yuvalUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const yuvalStaff = await prisma.staffMember.upsert({
    where: { businessUserId: yuvalBu.id },
    update: {},
    create: {
      businessId: business.id,
      businessUserId: yuvalBu.id,
      displayName: 'Yuval Turgeman',
      isActive: true,
    },
  });

  await prisma.staffMemberService.createMany({
    data: [
      { staffMemberId: yuvalStaff.id, serviceId: svcConsult.id },
      { staffMemberId: yuvalStaff.id, serviceId: svcLaserFace.id },
    ],
    skipDuplicates: true,
  });

  // Staff: Avivit Turgeman — upsert by stable ID; where and create phone match
  const avivitUser = await prisma.user.upsert({
    where: { id: AVIVIT_USER_ID },
    update: {},
    create: {
      id: AVIVIT_USER_ID,
      clerkUserId: 'user_3DsWoF8rxi853aZYSA4UzGtDm5s',
      phoneNormalized: '+972507654321',
      email: 'staff+clerk_test@example.com',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const avivitBu = await prisma.businessUser.upsert({
    where: {
      businessId_userId: { businessId: business.id, userId: avivitUser.id },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: avivitUser.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  const avivitStaff = await prisma.staffMember.upsert({
    where: { businessUserId: avivitBu.id },
    update: {},
    create: {
      businessId: business.id,
      businessUserId: avivitBu.id,
      displayName: 'Avivit Turgeman',
      isActive: true,
    },
  });

  await prisma.staffMemberService.createMany({
    data: [
      { staffMemberId: avivitStaff.id, serviceId: svcLaserFace.id },
      { staffMemberId: avivitStaff.id, serviceId: svcLaserLegs.id },
    ],
    skipDuplicates: true,
  });

  // Customer: Noam Levi
  const noamProfile = await prisma.customerProfile.upsert({
    where: { phoneNormalized: '+972525551001' },
    update: {},
    create: {
      phoneNormalized: '+972525551001',
      fullName: 'Noam Levi',
      email: 'noam.levi@example.com',
    },
  });

  const noamBc = await prisma.businessCustomer.upsert({
    where: {
      businessId_customerProfileId: {
        businessId: business.id,
        customerProfileId: noamProfile.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      customerProfileId: noamProfile.id,
      status: 'ACTIVE',
    },
  });

  console.log(
    '\n─── Postman environment variables ───────────────────────────────────',
  );
  console.log(`businessId           = ${business.id}`);
  console.log(`superAdminUserId     = ${superAdmin.id}`);
  console.log(`ownerUserId          = ${yuvalUser.id}`);
  console.log(`ownerBusinessUserId  = ${yuvalBu.id}`);
  console.log(`ownerStaffMemberId   = ${yuvalStaff.id}`);
  console.log(`staffUserId          = ${avivitUser.id}`);
  console.log(`staffBusinessUserId  = ${avivitBu.id}`);
  console.log(`staffStaffMemberId   = ${avivitStaff.id}`);
  console.log(`svcConsultId         = ${svcConsult.id}`);
  console.log(`svcLaserFaceId       = ${svcLaserFace.id}`);
  console.log(`svcLaserLegsId       = ${svcLaserLegs.id}`);
  console.log(`customerProfileId    = ${noamProfile.id}`);
  console.log(`businessCustomerId   = ${noamBc.id}`);
  console.log(
    '─────────────────────────────────────────────────────────────────────\n',
  );
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
