-- Migration: rename StaffMember → ServiceProvider (and related tables/columns)
-- Uses RENAME operations to preserve all existing data.

-- ─── Step 1: Drop FKs that reference StaffMember from other tables ─────────────

ALTER TABLE "StaffMemberService"    DROP CONSTRAINT "StaffMemberService_staffMemberId_fkey";
ALTER TABLE "StaffWorkingHour"      DROP CONSTRAINT "StaffWorkingHour_staffMemberId_fkey";
ALTER TABLE "Appointment"           DROP CONSTRAINT "Appointment_staffMemberId_fkey";
ALTER TABLE "AvailabilityException" DROP CONSTRAINT "AvailabilityException_staffMemberId_fkey";

-- ─── Step 2: Rename tables ────────────────────────────────────────────────────

ALTER TABLE "StaffMember"        RENAME TO "ServiceProvider";
ALTER TABLE "StaffMemberService" RENAME TO "ServiceProviderService";
ALTER TABLE "StaffWorkingHour"   RENAME TO "ServiceProviderWorkingHour";

-- ─── Step 3: Rename constraints within ServiceProvider (was StaffMember) ──────

ALTER TABLE "ServiceProvider" RENAME CONSTRAINT "StaffMember_pkey"               TO "ServiceProvider_pkey";
ALTER TABLE "ServiceProvider" RENAME CONSTRAINT "StaffMember_businessId_fkey"     TO "ServiceProvider_businessId_fkey";
ALTER TABLE "ServiceProvider" RENAME CONSTRAINT "StaffMember_businessUserId_fkey" TO "ServiceProvider_businessUserId_fkey";

-- ─── Step 4: Rename indexes for ServiceProvider ───────────────────────────────

ALTER INDEX "StaffMember_businessUserId_key" RENAME TO "ServiceProvider_businessUserId_key";
ALTER INDEX "StaffMember_businessId_idx"     RENAME TO "ServiceProvider_businessId_idx";

-- ─── Step 5: Rename constraints within ServiceProviderService ─────────────────

ALTER TABLE "ServiceProviderService" RENAME CONSTRAINT "StaffMemberService_pkey"           TO "ServiceProviderService_pkey";
ALTER TABLE "ServiceProviderService" RENAME CONSTRAINT "StaffMemberService_serviceId_fkey"  TO "ServiceProviderService_serviceId_fkey";

-- ─── Step 6: Rename indexes for ServiceProviderService ────────────────────────

ALTER INDEX "StaffMemberService_serviceId_idx" RENAME TO "ServiceProviderService_serviceId_idx";

-- ─── Step 7: Rename constraints within ServiceProviderWorkingHour ─────────────

ALTER TABLE "ServiceProviderWorkingHour" RENAME CONSTRAINT "StaffWorkingHour_pkey"            TO "ServiceProviderWorkingHour_pkey";
ALTER TABLE "ServiceProviderWorkingHour" RENAME CONSTRAINT "StaffWorkingHour_businessId_fkey"  TO "ServiceProviderWorkingHour_businessId_fkey";

-- ─── Step 8: Rename columns ──────────────────────────────────────────────────

ALTER TABLE "ServiceProviderService"     RENAME COLUMN "staffMemberId" TO "serviceProviderId";
ALTER TABLE "ServiceProviderWorkingHour" RENAME COLUMN "staffMemberId" TO "serviceProviderId";
ALTER TABLE "Appointment"                RENAME COLUMN "staffMemberId" TO "serviceProviderId";
ALTER TABLE "AvailabilityException"      RENAME COLUMN "staffMemberId" TO "serviceProviderId";

-- ─── Step 9: Rename indexes that referenced old column/table names ────────────

ALTER INDEX "StaffWorkingHour_businessId_idx"              RENAME TO "ServiceProviderWorkingHour_businessId_idx";
ALTER INDEX "StaffWorkingHour_staffMemberId_idx"           RENAME TO "ServiceProviderWorkingHour_serviceProviderId_idx";
ALTER INDEX "StaffWorkingHour_staffMemberId_dayOfWeek_key" RENAME TO "ServiceProviderWorkingHour_serviceProviderId_dayOfWeek_key";
ALTER INDEX "AvailabilityException_staffMemberId_idx"      RENAME TO "AvailabilityException_serviceProviderId_idx";
ALTER INDEX "Appointment_staffMemberId_startsAt_idx"       RENAME TO "Appointment_serviceProviderId_startsAt_idx";

-- ─── Step 10: Re-add FKs with new names ──────────────────────────────────────

ALTER TABLE "ServiceProviderService"
  ADD CONSTRAINT "ServiceProviderService_serviceProviderId_fkey"
  FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceProviderWorkingHour"
  ADD CONSTRAINT "ServiceProviderWorkingHour_serviceProviderId_fkey"
  FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_serviceProviderId_fkey"
  FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AvailabilityException"
  ADD CONSTRAINT "AvailabilityException_serviceProviderId_fkey"
  FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
