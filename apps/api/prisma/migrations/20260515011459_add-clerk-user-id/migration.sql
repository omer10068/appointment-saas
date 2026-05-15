-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash",
ADD COLUMN     "clerkUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
