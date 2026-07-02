-- CreateEnum
CREATE TYPE "BusinessInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "BusinessInvitation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "BusinessInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "clerkInvitationId" TEXT,
    "invitedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvitation_businessUserId_key" ON "BusinessInvitation"("businessUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvitation_clerkInvitationId_key" ON "BusinessInvitation"("clerkInvitationId");

-- CreateIndex
CREATE INDEX "BusinessInvitation_businessId_idx" ON "BusinessInvitation"("businessId");

-- CreateIndex
CREATE INDEX "BusinessInvitation_email_idx" ON "BusinessInvitation"("email");

-- CreateIndex
CREATE INDEX "BusinessInvitation_status_idx" ON "BusinessInvitation"("status");

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "BusinessUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
