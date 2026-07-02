-- AlterTable
ALTER TABLE "BusinessInvitation" ADD COLUMN     "clerkSendAttemptedAt" TIMESTAMP(3),
ALTER COLUMN "expiresAt" DROP NOT NULL;
