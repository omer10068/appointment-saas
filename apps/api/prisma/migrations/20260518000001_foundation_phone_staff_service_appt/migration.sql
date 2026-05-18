-- Migration: foundation_phone_staff_service_appt
-- Applies:
--   1. phoneNormalized (required, unique) on User and CustomerProfile
--   2. Remove old phone column from User and CustomerProfile
--   3. StaffMember.businessUserId becomes required + unique + FK to BusinessUser
--   4. Appointment.staffMemberId becomes required
--   5. StaffMemberService join table
--   6. New composite indexes

-- ─── Drop old indexes / constraints that conflict ─────────────────────────────

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_staffMemberId_fkey";

DROP INDEX "Appointment_businessId_idx";
DROP INDEX "Appointment_staffMemberId_idx";
DROP INDEX "Appointment_startsAt_idx";
DROP INDEX "CustomerProfile_phone_idx";
DROP INDEX "User_phone_key";

-- ─── User: add phoneNormalized as nullable, populate, then enforce NOT NULL ───

ALTER TABLE "User" ADD COLUMN "phoneNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- Normalize existing phone values to E.164
UPDATE "User"
SET "phoneNormalized" =
  CASE
    WHEN phone LIKE '+%' THEN REGEXP_REPLACE(phone, '[^+0-9]', '', 'g')
    WHEN phone LIKE '972%' THEN '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    WHEN phone LIKE '05%' THEN '+972' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 2)
    WHEN phone LIKE '0%'  THEN '+972' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 2)
    ELSE REGEXP_REPLACE(phone, '[^+0-9]', '', 'g')
  END
WHERE phone IS NOT NULL AND phone <> '';

-- Assign dev placeholder phones to Users still without one.
-- WARNING: These placeholder phones are not real. Dev users must add a
-- verified phone to their Clerk profile to authenticate after this migration.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "User"
  WHERE "phoneNormalized" IS NULL
)
UPDATE "User" u
SET "phoneNormalized" = '+97299' || LPAD(n.rn::text, 6, '0')
FROM numbered n
WHERE u.id = n.id;

ALTER TABLE "User" ALTER COLUMN "phoneNormalized" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "phone";

-- ─── CustomerProfile: same phone normalization ────────────────────────────────

ALTER TABLE "CustomerProfile" ADD COLUMN "phoneNormalized" TEXT;
ALTER TABLE "CustomerProfile" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

UPDATE "CustomerProfile"
SET "phoneNormalized" =
  CASE
    WHEN phone LIKE '+%' THEN REGEXP_REPLACE(phone, '[^+0-9]', '', 'g')
    WHEN phone LIKE '972%' THEN '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    WHEN phone LIKE '05%' THEN '+972' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 2)
    WHEN phone LIKE '0%'  THEN '+972' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 2)
    ELSE REGEXP_REPLACE(phone, '[^+0-9]', '', 'g')
  END
WHERE phone IS NOT NULL AND phone <> '';

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "CustomerProfile"
  WHERE "phoneNormalized" IS NULL
)
UPDATE "CustomerProfile" cp
SET "phoneNormalized" = '+97288' || LPAD(n.rn::text, 6, '0')
FROM numbered n
WHERE cp.id = n.id;

ALTER TABLE "CustomerProfile" ALTER COLUMN "phoneNormalized" SET NOT NULL;
ALTER TABLE "CustomerProfile" DROP COLUMN "phone";

-- ─── StaffMember: businessUserId required, unique, FK ────────────────────────

ALTER TABLE "StaffMember" ALTER COLUMN "businessUserId" SET NOT NULL;

CREATE UNIQUE INDEX "StaffMember_businessUserId_key" ON "StaffMember"("businessUserId");

ALTER TABLE "StaffMember"
  ADD CONSTRAINT "StaffMember_businessUserId_fkey"
  FOREIGN KEY ("businessUserId") REFERENCES "BusinessUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Appointment: staffMemberId required ──────────────────────────────────────

ALTER TABLE "Appointment" ALTER COLUMN "staffMemberId" SET NOT NULL;

-- ─── StaffMemberService join table ───────────────────────────────────────────

CREATE TABLE "StaffMemberService" (
    "staffMemberId" TEXT NOT NULL,
    "serviceId"     TEXT NOT NULL,
    CONSTRAINT "StaffMemberService_pkey" PRIMARY KEY ("staffMemberId", "serviceId")
);

CREATE INDEX "StaffMemberService_serviceId_idx" ON "StaffMemberService"("serviceId");

ALTER TABLE "StaffMemberService"
  ADD CONSTRAINT "StaffMemberService_staffMemberId_fkey"
  FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffMemberService"
  ADD CONSTRAINT "StaffMemberService_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Unique indexes ───────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "User_phoneNormalized_key"            ON "User"("phoneNormalized");
CREATE UNIQUE INDEX "CustomerProfile_phoneNormalized_key" ON "CustomerProfile"("phoneNormalized");

-- ─── New composite indexes for Appointment ────────────────────────────────────

CREATE INDEX "Appointment_businessId_startsAt_idx"   ON "Appointment"("businessId", "startsAt");
CREATE INDEX "Appointment_staffMemberId_startsAt_idx" ON "Appointment"("staffMemberId", "startsAt");

-- ─── Re-add Appointment FK with RESTRICT (was nullable before) ────────────────

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_staffMemberId_fkey"
  FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
