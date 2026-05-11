-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'BLOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BusinessUserRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "BusinessUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_BUSINESS', 'COMPLETED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "BusinessStatus" NOT NULL DEFAULT 'TRIAL',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "locale" TEXT NOT NULL DEFAULT 'he-IL',
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessUser" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessUserRole" NOT NULL,
    "status" "BusinessUserStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCustomer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "priceCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bufferBeforeMin" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessUserId" TEXT,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessCustomerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "BusinessUser_businessId_idx" ON "BusinessUser"("businessId");

-- CreateIndex
CREATE INDEX "BusinessUser_userId_idx" ON "BusinessUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUser_businessId_userId_key" ON "BusinessUser"("businessId", "userId");

-- CreateIndex
CREATE INDEX "CustomerProfile_userId_idx" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE INDEX "CustomerProfile_phone_idx" ON "CustomerProfile"("phone");

-- CreateIndex
CREATE INDEX "BusinessCustomer_businessId_idx" ON "BusinessCustomer"("businessId");

-- CreateIndex
CREATE INDEX "BusinessCustomer_customerProfileId_idx" ON "BusinessCustomer"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCustomer_businessId_customerProfileId_key" ON "BusinessCustomer"("businessId", "customerProfileId");

-- CreateIndex
CREATE INDEX "Service_businessId_idx" ON "Service"("businessId");

-- CreateIndex
CREATE INDEX "StaffMember_businessId_idx" ON "StaffMember"("businessId");

-- CreateIndex
CREATE INDEX "Appointment_businessId_idx" ON "Appointment"("businessId");

-- CreateIndex
CREATE INDEX "Appointment_businessCustomerId_idx" ON "Appointment"("businessCustomerId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- CreateIndex
CREATE INDEX "Appointment_staffMemberId_idx" ON "Appointment"("staffMemberId");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");

-- AddForeignKey
ALTER TABLE "BusinessUser" ADD CONSTRAINT "BusinessUser_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessUser" ADD CONSTRAINT "BusinessUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessCustomerId_fkey" FOREIGN KEY ("businessCustomerId") REFERENCES "BusinessCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
