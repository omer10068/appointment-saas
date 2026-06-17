-- AlterEnum
ALTER TYPE "BusinessStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT false;
