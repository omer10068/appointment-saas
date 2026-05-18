import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dev data...');

  // Business
  const business = await prisma.business.upsert({
    where: { slug: 'demo-barbershop' },
    update: {},
    create: {
      name: 'Demo Barbershop',
      slug: 'demo-barbershop',
      status: 'ACTIVE',
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL',
      currency: 'ILS',
    },
  });
  console.log('Business:', business.id);

  // Owner User
  const ownerUser = await prisma.user.upsert({
    where: { phoneNormalized: '+972501111111' },
    update: {},
    create: {
      phoneNormalized: '+972501111111',
      email: 'owner@demo.local',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  console.log('Owner user:', ownerUser.id);

  // Owner BusinessUser
  const ownerBu = await prisma.businessUser.upsert({
    where: { businessId_userId: { businessId: business.id, userId: ownerUser.id } },
    update: {},
    create: {
      businessId: business.id,
      userId: ownerUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  console.log('Owner BusinessUser:', ownerBu.id);

  // Staff User
  const staffUser = await prisma.user.upsert({
    where: { phoneNormalized: '+972502222222' },
    update: {},
    create: {
      phoneNormalized: '+972502222222',
      email: 'staff@demo.local',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });
  console.log('Staff user:', staffUser.id);

  // Staff BusinessUser
  const staffBu = await prisma.businessUser.upsert({
    where: { businessId_userId: { businessId: business.id, userId: staffUser.id } },
    update: {},
    create: {
      businessId: business.id,
      userId: staffUser.id,
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });
  console.log('Staff BusinessUser:', staffBu.id);

  // Services
  const haircut = await prisma.service.upsert({
    where: { id: 'seed-svc-haircut' },
    update: {},
    create: {
      id: 'seed-svc-haircut',
      businessId: business.id,
      name: 'Haircut',
      durationMinutes: 30,
      priceCents: 8000,
      isActive: true,
    },
  });

  const beard = await prisma.service.upsert({
    where: { id: 'seed-svc-beard' },
    update: {},
    create: {
      id: 'seed-svc-beard',
      businessId: business.id,
      name: 'Beard Trim',
      durationMinutes: 20,
      priceCents: 5000,
      isActive: true,
    },
  });
  console.log('Services:', haircut.id, beard.id);

  // StaffMember (upsert by businessUserId unique)
  const staffMember = await prisma.staffMember.upsert({
    where: { businessUserId: staffBu.id },
    update: {},
    create: {
      businessId: business.id,
      businessUserId: staffBu.id,
      displayName: 'Moshe Cohen',
      isActive: true,
    },
  });
  console.log('StaffMember:', staffMember.id);

  // StaffMemberService links (createMany with skipDuplicates)
  await prisma.staffMemberService.createMany({
    data: [
      { staffMemberId: staffMember.id, serviceId: haircut.id },
      { staffMemberId: staffMember.id, serviceId: beard.id },
    ],
    skipDuplicates: true,
  });
  console.log('StaffMemberService links created');

  // Customer
  const customerProfile = await prisma.customerProfile.upsert({
    where: { phoneNormalized: '+972503333333' },
    update: {},
    create: {
      phoneNormalized: '+972503333333',
      fullName: 'Yossi Levi',
      email: 'yossi@example.com',
    },
  });
  console.log('CustomerProfile:', customerProfile.id);

  const businessCustomer = await prisma.businessCustomer.upsert({
    where: {
      businessId_customerProfileId: {
        businessId: business.id,
        customerProfileId: customerProfile.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      customerProfileId: customerProfile.id,
      status: 'ACTIVE',
    },
  });
  console.log('BusinessCustomer:', businessCustomer.id);

  // Appointment (tomorrow at 10:00 AM Jerusalem)
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(10, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + haircut.durationMinutes * 60 * 1000);

  const existing = await prisma.appointment.findFirst({
    where: {
      businessCustomerId: businessCustomer.id,
      serviceId: haircut.id,
      staffMemberId: staffMember.id,
    },
  });

  if (!existing) {
    const appt = await prisma.appointment.create({
      data: {
        businessId: business.id,
        businessCustomerId: businessCustomer.id,
        serviceId: haircut.id,
        staffMemberId: staffMember.id,
        startsAt,
        endsAt,
        status: 'SCHEDULED',
      },
    });
    console.log('Appointment:', appt.id);
  } else {
    console.log('Appointment already exists:', existing.id);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
