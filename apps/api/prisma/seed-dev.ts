import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AppointmentStatus,
  PrismaClient,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const seedOwnerClerkUserId = process.env.SEED_OWNER_CLERK_USER_ID;
const seedOwnerEmail = process.env.SEED_OWNER_EMAIL;
if (!seedOwnerClerkUserId)
  throw new Error('SEED_OWNER_CLERK_USER_ID is not defined');
if (!seedOwnerEmail) throw new Error('SEED_OWNER_EMAIL is not defined');

function assertLocalDevDatabase(url: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run dev seed when NODE_ENV=production');
  }

  const parsed = new URL(url);
  const allowedHosts = new Set(['localhost', '127.0.0.1', 'postgres', 'db']);

  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(
      `Refusing to run dev seed on non-local database host: ${parsed.hostname}`,
    );
  }

  if (parsed.pathname.includes('test')) {
    throw new Error(
      'Refusing to run dev seed against a test database. Use DATABASE_URL for local dev only.',
    );
  }
}

assertLocalDevDatabase(connectionString);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Stable IDs — fixed so dashboard URLs/data survive DB resets
const YUVAL_BUSINESS_ID = '11111111-1111-4111-8111-000000000001';

const AVIVIT_USER_ID = '11111111-1111-4111-8111-000000000011';
const OWNER_BUSINESS_USER_ID = '11111111-1111-4111-8111-000000000021';
const AVIVIT_BUSINESS_USER_ID = '11111111-1111-4111-8111-000000000022';

const YUVAL_SERVICE_PROVIDER_ID = '11111111-1111-4111-8111-000000000031';
const AVIVIT_SERVICE_PROVIDER_ID = '11111111-1111-4111-8111-000000000032';

const SVC_FACIAL_ID = '11111111-1111-4111-8111-000000000101';
const SVC_FACE_LASER_ID = '11111111-1111-4111-8111-000000000102';
const SVC_BODY_LASER_ID = '11111111-1111-4111-8111-000000000103';
const SVC_SPRAY_TAN_ID = '11111111-1111-4111-8111-000000000104';

const OLD_DEMO_SLUG = 'demo-beauty-studio';
const TARGET_SLUG = 'yuval-turgeman';

// All dates below are in Israel summer time (+03:00).
// The seed is for local dashboard/manual testing only.
function israelDateTime(localDate: string, localTime: string): Date {
  return new Date(`${localDate}T${localTime}:00.000+03:00`);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function deleteSeededBusinessBySlug(slug: string): Promise<void> {
  const businesses = await prisma.business.findMany({
    where: { slug },
    select: { id: true },
  });

  for (const business of businesses) {
    const businessId = business.id;

    const serviceProviders = await prisma.serviceProvider.findMany({
      where: { businessId },
      select: { id: true },
    });
    const serviceProviderIds = serviceProviders.map((sp) => sp.id);

    const services = await prisma.service.findMany({
      where: { businessId },
      select: { id: true },
    });
    const serviceIds = services.map((service) => service.id);

    await prisma.appointment.deleteMany({ where: { businessId } });
    await prisma.availabilityException.deleteMany({ where: { businessId } });

    if (serviceProviderIds.length > 0 || serviceIds.length > 0) {
      await prisma.serviceProviderService.deleteMany({
        where: {
          OR: [
            { serviceProviderId: { in: serviceProviderIds } },
            { serviceId: { in: serviceIds } },
          ],
        },
      });
    }

    if (serviceProviderIds.length > 0) {
      await prisma.serviceProviderWorkingHour.deleteMany({
        where: { serviceProviderId: { in: serviceProviderIds } },
      });
    }

    await prisma.serviceProvider.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.businessWorkingHour.deleteMany({ where: { businessId } });
    await prisma.businessCustomer.deleteMany({ where: { businessId } });
    await prisma.businessUser.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
  }
}

async function main() {
  console.log('Seeding local dev data (yuval-turgeman)...');

  // Keep the dev dataset exact and readable:
  // - remove the old demo business
  // - reset the target business on each seed run
  await deleteSeededBusinessBySlug(OLD_DEMO_SLUG);
  await deleteSeededBusinessBySlug(TARGET_SLUG);

  const owner = await prisma.user.upsert({
    where: { clerkUserId: seedOwnerClerkUserId },
    update: {
      email: seedOwnerEmail,
      status: 'ACTIVE',
      platformRole: 'USER',
    },
    create: {
      clerkUserId: seedOwnerClerkUserId,
      email: seedOwnerEmail,
      phoneNormalized: '+972509000010',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const avivit = await prisma.user.upsert({
    where: { phoneNormalized: '+972509000011' },
    update: {
      email: 'avivit.turgeman@example.com',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
    create: {
      id: AVIVIT_USER_ID,
      phoneNormalized: '+972509000011',
      email: 'avivit.turgeman@example.com',
      status: 'ACTIVE',
      platformRole: 'USER',
    },
  });

  const business = await prisma.business.create({
    data: {
      id: YUVAL_BUSINESS_ID,
      name: TARGET_SLUG,
      slug: TARGET_SLUG,
      status: 'ACTIVE',
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL',
      currency: 'ILS',
    },
  });

  const ownerBu = await prisma.businessUser.create({
    data: {
      id: OWNER_BUSINESS_USER_ID,
      businessId: business.id,
      userId: owner.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const avivitBu = await prisma.businessUser.create({
    data: {
      id: AVIVIT_BUSINESS_USER_ID,
      businessId: business.id,
      userId: avivit.id,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  const svcFacial = await prisma.service.create({
    data: {
      id: SVC_FACIAL_ID,
      businessId: business.id,
      name: 'טיפול פנים',
      durationMinutes: 60,
      priceCents: 25000,
      isActive: true,
    },
  });

  const svcFaceLaser = await prisma.service.create({
    data: {
      id: SVC_FACE_LASER_ID,
      businessId: business.id,
      name: 'לייזר פנים',
      durationMinutes: 30,
      priceCents: 18000,
      isActive: true,
    },
  });

  const svcBodyLaser = await prisma.service.create({
    data: {
      id: SVC_BODY_LASER_ID,
      businessId: business.id,
      name: 'לייזר גוף',
      durationMinutes: 75,
      priceCents: 42000,
      isActive: true,
    },
  });

  const svcSprayTan = await prisma.service.create({
    data: {
      id: SVC_SPRAY_TAN_ID,
      businessId: business.id,
      name: 'שיזוף בהתזה',
      durationMinutes: 30,
      priceCents: 14000,
      isActive: true,
    },
  });

  const yuvalSp = await prisma.serviceProvider.create({
    data: {
      id: YUVAL_SERVICE_PROVIDER_ID,
      businessId: business.id,
      businessUserId: ownerBu.id,
      displayName: "יובל תורג'מן",
      isActive: true,
    },
  });

  const avivitSp = await prisma.serviceProvider.create({
    data: {
      id: AVIVIT_SERVICE_PROVIDER_ID,
      businessId: business.id,
      businessUserId: avivitBu.id,
      displayName: "אביבית תורג'מן",
      isActive: true,
    },
  });

  await prisma.serviceProviderService.createMany({
    data: [
      { serviceProviderId: yuvalSp.id, serviceId: svcFacial.id },
      { serviceProviderId: yuvalSp.id, serviceId: svcFaceLaser.id },
      { serviceProviderId: yuvalSp.id, serviceId: svcBodyLaser.id },
      { serviceProviderId: yuvalSp.id, serviceId: svcSprayTan.id },

      { serviceProviderId: avivitSp.id, serviceId: svcFacial.id },
      { serviceProviderId: avivitSp.id, serviceId: svcFaceLaser.id },
      { serviceProviderId: avivitSp.id, serviceId: svcBodyLaser.id },
      { serviceProviderId: avivitSp.id, serviceId: svcSprayTan.id },
    ],
  });

  // Business working hours (0=Sun, 1=Mon, ..., 6=Sat)
  await prisma.businessWorkingHour.createMany({
    data: [
      {
        businessId: business.id,
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '19:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '19:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '19:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '19:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 4,
        startTime: '09:00',
        endTime: '19:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '14:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        dayOfWeek: 6,
        startTime: null,
        endTime: null,
        isClosed: true,
      },
    ],
  });

  await prisma.serviceProviderWorkingHour.createMany({
    data: [
      // Yuval: Sun–Thu, short Friday, closed Saturday
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 4,
        startTime: '09:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '13:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        dayOfWeek: 6,
        startTime: null,
        endTime: null,
        isClosed: true,
      },

      // Avivit: Sunday + Mon–Thu, short Friday, closed Saturday
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 0,
        startTime: '10:00',
        endTime: '16:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 2,
        startTime: '10:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '18:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '13:00',
        isClosed: false,
      },
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        dayOfWeek: 6,
        startTime: null,
        endTime: null,
        isClosed: true,
      },
    ],
  });

  await prisma.availabilityException.createMany({
    data: [
      {
        businessId: business.id,
        serviceProviderId: avivitSp.id,
        date: new Date('2026-06-08T00:00:00.000Z'),
        startTime: null,
        endTime: null,
        isClosed: true,
        reason: 'חופשה',
      },
      {
        businessId: business.id,
        serviceProviderId: yuvalSp.id,
        date: new Date('2026-06-11T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '13:00',
        isClosed: false,
        reason: 'סידורים אישיים',
      },
      {
        businessId: business.id,
        serviceProviderId: null,
        date: new Date('2026-07-02T00:00:00.000Z'),
        startTime: null,
        endTime: null,
        isClosed: true,
        reason: 'יום הדרכה לעסק',
      },
    ],
  });

  const customerRows = [
    {
      phoneNormalized: '+972521120001',
      fullName: 'שרה כהן',
      email: 'sarah.cohen@example.com',
    },
    {
      phoneNormalized: '+972521120002',
      fullName: 'נועה לוי',
      email: 'noa.levi@example.com',
    },
    {
      phoneNormalized: '+972521120003',
      fullName: 'מאיה מזרחי',
      email: 'maya.mizrahi@example.com',
    },
    {
      phoneNormalized: '+972521120004',
      fullName: 'דניאל ביטון',
      email: 'daniel.biton@example.com',
    },
    {
      phoneNormalized: '+972521120005',
      fullName: 'שירה אזולאי',
      email: 'shira.azulay@example.com',
    },
    {
      phoneNormalized: '+972521120006',
      fullName: 'יעל פרץ',
      email: 'yael.peretz@example.com',
    },
    {
      phoneNormalized: '+972521120007',
      fullName: 'תמר שלום',
      email: 'tamar.shalom@example.com',
    },
    {
      phoneNormalized: '+972521120008',
      fullName: 'עדן גבאי',
      email: 'eden.gabay@example.com',
    },
    {
      phoneNormalized: '+972521120009',
      fullName: 'ליאור כהן',
      email: 'lior.cohen@example.com',
    },
    {
      phoneNormalized: '+972521120010',
      fullName: 'מיכל דהן',
      email: 'michal.dahan@example.com',
    },
    {
      phoneNormalized: '+972521120011',
      fullName: 'נטע מור',
      email: 'neta.mor@example.com',
    },
    {
      phoneNormalized: '+972521120012',
      fullName: 'הילה בר',
      email: 'hila.bar@example.com',
    },
    {
      phoneNormalized: '+972521120013',
      fullName: 'רוני אברהם',
      email: 'roni.avraham@example.com',
    },
    {
      phoneNormalized: '+972521120014',
      fullName: "גלית תורג'מן",
      email: 'galit.turgeman@example.com',
    },
    {
      phoneNormalized: '+972521120015',
      fullName: 'עדי כהן',
      email: 'adi.malka@example.com',
    },
    {
      phoneNormalized: '+972521120016',
      fullName: 'קרין אוחיון',
      email: 'karin.ohayon@example.com',
    },
    {
      phoneNormalized: '+972521120017',
      fullName: 'שיר בן דוד',
      email: 'shir.bendavid@example.com',
    },
    {
      phoneNormalized: '+972521120018',
      fullName: 'אביטל שוורץ',
      email: 'avital.shwartz@example.com',
    },
  ];

  const customersByPhone = new Map<string, string>();

  for (const [index, customer] of customerRows.entries()) {
    const profile = await prisma.customerProfile.upsert({
      where: { phoneNormalized: customer.phoneNormalized },
      update: {
        fullName: customer.fullName,
        email: customer.email,
      },
      create: customer,
    });

    const businessCustomer = await prisma.businessCustomer.create({
      data: {
        id: `11111111-1111-4111-8111-0000000002${String(index + 1).padStart(
          2,
          '0',
        )}`,
        businessId: business.id,
        customerProfileId: profile.id,
        status: index === 17 ? 'BLOCKED' : 'ACTIVE',
      },
    });

    customersByPhone.set(customer.phoneNormalized, businessCustomer.id);
  }

  const serviceByKey = {
    facial: svcFacial,
    faceLaser: svcFaceLaser,
    bodyLaser: svcBodyLaser,
    sprayTan: svcSprayTan,
  } as const;

  const providerByKey = {
    yuval: yuvalSp,
    avivit: avivitSp,
  } as const;

  const appointmentRows: Array<{
    id: string;
    customerPhone: string;
    serviceKey: keyof typeof serviceByKey;
    providerKey: keyof typeof providerByKey;
    localDate: string;
    localTime: string;
    status: AppointmentStatus;
  }> = [
    // Past completed
    {
      id: '11111111-1111-4111-8111-000000000301',
      customerPhone: '+972521120001',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-05-03',
      localTime: '09:30',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000302',
      customerPhone: '+972521120002',
      serviceKey: 'facial',
      providerKey: 'avivit',
      localDate: '2026-05-03',
      localTime: '11:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000303',
      customerPhone: '+972521120003',
      serviceKey: 'bodyLaser',
      providerKey: 'yuval',
      localDate: '2026-05-04',
      localTime: '10:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000304',
      customerPhone: '+972521120004',
      serviceKey: 'faceLaser',
      providerKey: 'avivit',
      localDate: '2026-05-04',
      localTime: '13:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000305',
      customerPhone: '+972521120005',
      serviceKey: 'sprayTan',
      providerKey: 'avivit',
      localDate: '2026-05-05',
      localTime: '10:30',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000306',
      customerPhone: '+972521120006',
      serviceKey: 'bodyLaser',
      providerKey: 'yuval',
      localDate: '2026-05-05',
      localTime: '12:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000307',
      customerPhone: '+972521120007',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-05-06',
      localTime: '15:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000308',
      customerPhone: '+972521120008',
      serviceKey: 'facial',
      providerKey: 'avivit',
      localDate: '2026-05-07',
      localTime: '10:30',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000309',
      customerPhone: '+972521120009',
      serviceKey: 'sprayTan',
      providerKey: 'yuval',
      localDate: '2026-05-10',
      localTime: '12:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000310',
      customerPhone: '+972521120010',
      serviceKey: 'bodyLaser',
      providerKey: 'avivit',
      localDate: '2026-05-11',
      localTime: '11:30',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000311',
      customerPhone: '+972521120011',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-05-12',
      localTime: '16:00',
      status: AppointmentStatus.COMPLETED,
    },
    {
      id: '11111111-1111-4111-8111-000000000312',
      customerPhone: '+972521120012',
      serviceKey: 'faceLaser',
      providerKey: 'avivit',
      localDate: '2026-05-14',
      localTime: '14:00',
      status: AppointmentStatus.COMPLETED,
    },

    // Past cancelled / no-show
    {
      id: '11111111-1111-4111-8111-000000000313',
      customerPhone: '+972521120013',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-05-18',
      localTime: '10:00',
      status: AppointmentStatus.CANCELLED_BY_CUSTOMER,
    },
    {
      id: '11111111-1111-4111-8111-000000000314',
      customerPhone: '+972521120014',
      serviceKey: 'facial',
      providerKey: 'avivit',
      localDate: '2026-05-19',
      localTime: '11:00',
      status: AppointmentStatus.CANCELLED_BY_BUSINESS,
    },
    {
      id: '11111111-1111-4111-8111-000000000315',
      customerPhone: '+972521120015',
      serviceKey: 'sprayTan',
      providerKey: 'yuval',
      localDate: '2026-05-20',
      localTime: '14:30',
      status: AppointmentStatus.NO_SHOW,
    },

    // Future scheduled / confirmed
    {
      id: '11111111-1111-4111-8111-000000000316',
      customerPhone: '+972521120016',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-05-24',
      localTime: '09:30',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000317',
      customerPhone: '+972521120017',
      serviceKey: 'facial',
      providerKey: 'avivit',
      localDate: '2026-05-24',
      localTime: '11:00',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000318',
      customerPhone: '+972521120001',
      serviceKey: 'bodyLaser',
      providerKey: 'yuval',
      localDate: '2026-05-25',
      localTime: '10:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000319',
      customerPhone: '+972521120002',
      serviceKey: 'faceLaser',
      providerKey: 'avivit',
      localDate: '2026-05-25',
      localTime: '13:00',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000320',
      customerPhone: '+972521120003',
      serviceKey: 'sprayTan',
      providerKey: 'avivit',
      localDate: '2026-05-26',
      localTime: '10:30',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000321',
      customerPhone: '+972521120004',
      serviceKey: 'bodyLaser',
      providerKey: 'yuval',
      localDate: '2026-05-26',
      localTime: '12:00',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000322',
      customerPhone: '+972521120005',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-05-27',
      localTime: '15:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000323',
      customerPhone: '+972521120006',
      serviceKey: 'facial',
      providerKey: 'avivit',
      localDate: '2026-05-28',
      localTime: '10:30',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000324',
      customerPhone: '+972521120007',
      serviceKey: 'sprayTan',
      providerKey: 'yuval',
      localDate: '2026-05-29',
      localTime: '09:30',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000325',
      customerPhone: '+972521120008',
      serviceKey: 'bodyLaser',
      providerKey: 'avivit',
      localDate: '2026-05-31',
      localTime: '12:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000326',
      customerPhone: '+972521120009',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-06-01',
      localTime: '16:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000327',
      customerPhone: '+972521120010',
      serviceKey: 'faceLaser',
      providerKey: 'avivit',
      localDate: '2026-06-02',
      localTime: '11:00',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000328',
      customerPhone: '+972521120011',
      serviceKey: 'bodyLaser',
      providerKey: 'yuval',
      localDate: '2026-06-03',
      localTime: '09:30',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000329',
      customerPhone: '+972521120012',
      serviceKey: 'facial',
      providerKey: 'avivit',
      localDate: '2026-06-04',
      localTime: '13:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000330',
      customerPhone: '+972521120013',
      serviceKey: 'facial',
      providerKey: 'yuval',
      localDate: '2026-06-05',
      localTime: '10:00',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000331',
      customerPhone: '+972521120014',
      serviceKey: 'sprayTan',
      providerKey: 'yuval',
      localDate: '2026-06-07',
      localTime: '11:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000332',
      customerPhone: '+972521120015',
      serviceKey: 'bodyLaser',
      providerKey: 'avivit',
      localDate: '2026-06-09',
      localTime: '14:00',
      status: AppointmentStatus.CONFIRMED,
    },
    {
      id: '11111111-1111-4111-8111-000000000333',
      customerPhone: '+972521120016',
      serviceKey: 'bodyLaser',
      providerKey: 'yuval',
      localDate: '2026-06-10',
      localTime: '10:00',
      status: AppointmentStatus.SCHEDULED,
    },
    {
      id: '11111111-1111-4111-8111-000000000334',
      customerPhone: '+972521120017',
      serviceKey: 'faceLaser',
      providerKey: 'avivit',
      localDate: '2026-06-12',
      localTime: '09:30',
      status: AppointmentStatus.SCHEDULED,
    },
  ];

  for (const appointment of appointmentRows) {
    const service = serviceByKey[appointment.serviceKey];
    const provider = providerByKey[appointment.providerKey];
    const businessCustomerId = customersByPhone.get(appointment.customerPhone);
    if (!businessCustomerId) {
      throw new Error(`Missing customer for ${appointment.customerPhone}`);
    }

    const startsAt = israelDateTime(
      appointment.localDate,
      appointment.localTime,
    );

    await prisma.appointment.create({
      data: {
        id: appointment.id,
        businessId: business.id,
        businessCustomerId,
        serviceId: service.id,
        serviceProviderId: provider.id,
        startsAt,
        endsAt: addMinutes(startsAt, service.durationMinutes),
        status: appointment.status,
      },
    });
  }

  console.log(
    '\n─── yuval-turgeman IDs ───────────────────────────────────────────',
  );
  console.log(`businessId              = ${business.id}`);
  console.log(`businessSlug            = ${business.slug}`);
  console.log(`ownerUserId             = ${owner.id}`);
  console.log(`ownerBusinessUserId     = ${ownerBu.id}`);
  console.log(`yuvalServiceProviderId  = ${yuvalSp.id}`);
  console.log(`avivitUserId            = ${avivit.id}`);
  console.log(`avivitBusinessUserId    = ${avivitBu.id}`);
  console.log(`avivitServiceProviderId = ${avivitSp.id}`);
  console.log(`customers               = ${customerRows.length}`);
  console.log(`appointments            = ${appointmentRows.length}`);
  console.log(
    '─────────────────────────────────────────────────────────────────\n',
  );
  console.log('Dev seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
