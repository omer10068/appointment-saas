-- CreateTable
CREATE TABLE "BusinessWorkingHour" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessWorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffWorkingHour" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffWorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessWorkingHour_businessId_idx" ON "BusinessWorkingHour"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWorkingHour_businessId_dayOfWeek_key" ON "BusinessWorkingHour"("businessId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "StaffWorkingHour_businessId_idx" ON "StaffWorkingHour"("businessId");

-- CreateIndex
CREATE INDEX "StaffWorkingHour_staffMemberId_idx" ON "StaffWorkingHour"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffWorkingHour_staffMemberId_dayOfWeek_key" ON "StaffWorkingHour"("staffMemberId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "AvailabilityException_businessId_idx" ON "AvailabilityException"("businessId");

-- CreateIndex
CREATE INDEX "AvailabilityException_staffMemberId_idx" ON "AvailabilityException"("staffMemberId");

-- CreateIndex
CREATE INDEX "AvailabilityException_date_idx" ON "AvailabilityException"("date");

-- AddForeignKey
ALTER TABLE "BusinessWorkingHour" ADD CONSTRAINT "BusinessWorkingHour_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWorkingHour" ADD CONSTRAINT "StaffWorkingHour_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWorkingHour" ADD CONSTRAINT "StaffWorkingHour_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
