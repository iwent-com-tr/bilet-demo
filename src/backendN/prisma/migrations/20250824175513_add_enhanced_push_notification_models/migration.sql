/*
  Warnings:

  - You are about to drop the column `tokenHash` on the `PushSubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,onesignalUserId]` on the table `PushSubscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,key,source]` on the table `UserSegmentTag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `UserSegmentTag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."Browser" ADD VALUE 'OPERA';

-- AlterEnum
ALTER TYPE "public"."OS" ADD VALUE 'CHROME_OS';

-- AlterEnum
ALTER TYPE "public"."SegmentSource" ADD VALUE 'EXTERNAL';

-- AlterTable
ALTER TABLE "public"."PushSubscription" DROP COLUMN "tokenHash",
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "subscriptionHash" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "channel" SET DEFAULT 'WEB_PUSH',
ALTER COLUMN "onesignalSubId" DROP NOT NULL,
ALTER COLUMN "subscribed" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."UserSegmentTag" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "syncedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."NotificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "onesignalId" TEXT NOT NULL,
    "onesignalUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationEvent_userId_eventType_timestamp_idx" ON "public"."NotificationEvent"("userId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "NotificationEvent_onesignalId_eventType_idx" ON "public"."NotificationEvent"("onesignalId", "eventType");

-- CreateIndex
CREATE INDEX "NotificationEvent_onesignalUserId_eventType_idx" ON "public"."NotificationEvent"("onesignalUserId", "eventType");

-- CreateIndex
CREATE INDEX "NotificationEvent_timestamp_idx" ON "public"."NotificationEvent"("timestamp");

-- CreateIndex
CREATE INDEX "PushSubscription_onesignalUserId_idx" ON "public"."PushSubscription"("onesignalUserId");

-- CreateIndex
CREATE INDEX "PushSubscription_subscribed_lastSeen_idx" ON "public"."PushSubscription"("subscribed", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_onesignalUserId_key" ON "public"."PushSubscription"("userId", "onesignalUserId");

-- CreateIndex
CREATE INDEX "UserSegmentTag_key_value_idx" ON "public"."UserSegmentTag"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "UserSegmentTag_userId_key_source_key" ON "public"."UserSegmentTag"("userId", "key", "source");

-- AddForeignKey
ALTER TABLE "public"."NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
