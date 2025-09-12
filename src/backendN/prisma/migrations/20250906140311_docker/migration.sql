/*
  Warnings:

  - A unique constraint covering the columns `[endpoint]` on the table `PushSubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."NotificationCategory" ADD VALUE 'EVENT_UPDATE';

-- AlterEnum
ALTER TYPE "public"."SettingInputType" ADD VALUE 'BUTTON';

-- AlterEnum
ALTER TYPE "public"."UserType" ADD VALUE 'ORGANIZER';

-- AlterTable
ALTER TABLE "public"."Artist" ADD COLUMN     "avatar" TEXT;

-- AlterTable
ALTER TABLE "public"."ChatMessage" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."EventMute" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "public"."LoginEvent" ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Organizer" ALTER COLUMN "approved" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."PushSubscription" ADD COLUMN     "auth" TEXT,
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "endpoint" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "p256dh" TEXT,
ALTER COLUMN "pwa" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "public"."ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "public"."ChatMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_endpoint_idx" ON "public"."PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
