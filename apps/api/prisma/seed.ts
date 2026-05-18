import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SUPER_ADMIN_ID = 'd8ccc07a-e315-40d6-a4c1-d6e227590c5b';
const SVC_CONSULT_ID = 'seed-svc-consult';
const SVC_LASER_FACE_ID = 'seed-svc-laser-face';
const SVC_LASER_LEGS_ID = 'seed-svc-laser-legs';

async function main() {
  console.log('Seeding dev data...');

  // Platform SUPER_ADMIN — fixed ID, preserved across resets
  const superAdmin = await prisma.user.upsert({
    where: { id: SUPER_ADMIN_ID },
    update: {
      clerkUserId: 'user_3DlLgMQ6Ni2Hr21fsmuWYXdlnHc',
      email: 'omer10068@gmail.com',
      phoneNormalized: '+97299000001',
      phoneVerifiedAt: new Date('2024-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      platformRole: 'SUPER_ADMIN',
    },
    create: {
      id: SUPER_ADMIN_ID,
      clerkUserId: 'user_3DlLgMQ6Ni2Hr21fsmuWYXdlnHc',
      email: 'omer10068@gmail.com',
      phoneNormalized: '+972501111111',
      phoneVerifiedAt: new Date('2027-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      platformRole: 'SUPER_ADMIN',
    },
  });
  console.log('SUPER_ADMIN:', superAdmin.id);

  // Business: Yuval Turgeman
  const business = await prisma.business.upsert({
    where: { slug: 'yuval-turgeman' },
    update: {},
    create: {
      name: 'Yuval Turgeman',
      slug: 'yuval-turgeman',
      status: 'ACTIVE',
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL',
      currency: 'ILS',
    },
  });
  console.log('Business:', business.id);

  // Services
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
  console.log('Services:', svcConsult.id, svcLaserFace.id, svcLaserLegs.id);

  // Owner: Yuval Turgeman
  const yuvalUser = await prisma.user.upsert({
    where: { phoneNormalized: '+972529900001' },
    update: {},
    create: {
      clerkUserId: 'user_3Dnq0lwCHze3mSiCbqbbfWDRGLo',
      phoneNormalized: '+972501234567',
      email: 'owner+clerk_test@example.com',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  console.log('Yuval user:', yuvalUser.id);

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
  console.log('Yuval StaffMember:', yuvalStaff.id);

  await prisma.staffMemberService.createMany({
    data: [
      { staffMemberId: yuvalStaff.id, serviceId: svcConsult.id },
      { staffMemberId: yuvalStaff.id, serviceId: svcLaserFace.id },
    ],
    skipDuplicates: true,
  });

  // Staff: Avivit Turgeman
  const avivitUser = await prisma.user.upsert({
    where: { phoneNormalized: '+972529900002' },
    update: {},
    create: {
      clerkUserId: 'user_3DsWoF8rxi853aZYSA4UzGtDm5s',
      phoneNormalized: '+972507654321',
      email: 'staff+clerk_test@example.com',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  console.log('Avivit user:', avivitUser.id);

  const avivitBu = await prisma.businessUser.upsert({
    where: {
      businessId_userId: { businessId: business.id, userId: avivitUser.id },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: avivitUser.id,
      role: 'STAFF',
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
  console.log('Avivit StaffMember:', avivitStaff.id);

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
  console.log('CustomerProfile:', noamProfile.id);

  await prisma.businessCustomer.upsert({
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
  console.log('BusinessCustomer linked');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
