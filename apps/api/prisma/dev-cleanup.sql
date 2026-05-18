-- Dev data cleanup BEFORE migration
-- Removes records that would violate the new NOT NULL constraints.
-- phoneNormalized population happens INSIDE the migration SQL.
-- DO NOT run this in production.

-- Step 1: Remove appointments with no staff member
DELETE FROM "Appointment" WHERE "staffMemberId" IS NULL;

-- Step 2: Remove records referencing orphan StaffMembers (no businessUserId)
DELETE FROM "StaffWorkingHour"
WHERE "staffMemberId" IN (
  SELECT id FROM "StaffMember" WHERE "businessUserId" IS NULL
);

DELETE FROM "AvailabilityException"
WHERE "staffMemberId" IN (
  SELECT id FROM "StaffMember" WHERE "businessUserId" IS NULL
);

DELETE FROM "Appointment"
WHERE "staffMemberId" IN (
  SELECT id FROM "StaffMember" WHERE "businessUserId" IS NULL
);

-- Step 3: Remove orphan StaffMembers
DELETE FROM "StaffMember" WHERE "businessUserId" IS NULL;
