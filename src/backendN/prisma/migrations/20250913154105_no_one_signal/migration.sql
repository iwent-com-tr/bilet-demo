/*
  Warnings:

  - The values [ONESIGNAL] on the enum `SegmentSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `onesignalId` on the `NotificationEvent` table. All the data in the column will be lost.
  - You are about to drop the column `onesignalUserId` on the `NotificationEvent` table. All the data in the column will be lost.
  - You are about to drop the column `onesignalSubId` on the `PushSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `onesignalUserId` on the `PushSubscription` table. All the data in the column will be lost.
  - Added the required column `notificationId` to the `NotificationEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."SegmentSource_new" AS ENUM ('INTERNAL', 'EXTERNAL');
ALTER TABLE "public"."UserSegmentTag" ALTER COLUMN "source" TYPE "public"."SegmentSource_new" USING ("source"::text::"public"."SegmentSource_new");
ALTER TYPE "public"."SegmentSource" RENAME TO "SegmentSource_old";
ALTER TYPE "public"."SegmentSource_new" RENAME TO "SegmentSource";
DROP TYPE "public"."SegmentSource_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."NotificationEvent_onesignalId_eventType_idx";

-- DropIndex
DROP INDEX "public"."NotificationEvent_onesignalUserId_eventType_idx";

-- DropIndex
DROP INDEX "public"."PushSubscription_onesignalUserId_idx";

-- DropIndex
DROP INDEX "public"."PushSubscription_userId_onesignalUserId_key";

-- AlterTable
ALTER TABLE "public"."NotificationEvent" DROP COLUMN "onesignalId",
DROP COLUMN "onesignalUserId",
ADD COLUMN     "notificationId" TEXT NOT NULL,
ADD COLUMN     "recipientId" TEXT;

-- AlterTable
ALTER TABLE "public"."PushSubscription" DROP COLUMN "onesignalSubId",
DROP COLUMN "onesignalUserId";

-- CreateIndex
CREATE INDEX "NotificationEvent_notificationId_eventType_idx" ON "public"."NotificationEvent"("notificationId", "eventType");
