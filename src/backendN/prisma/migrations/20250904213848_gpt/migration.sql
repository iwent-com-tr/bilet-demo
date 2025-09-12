/*
  Warnings:

  - The values [ORGANIZER] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `avatar` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Block` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `ageRestriction` on the `ConcertDetails` table. All the data in the column will be lost.
  - You are about to drop the column `genre` on the `ConcertDetails` table. All the data in the column will be lost.
  - You are about to drop the column `lineup` on the `ConcertDetails` table. All the data in the column will be lost.
  - You are about to drop the column `networking` on the `ConferenceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `speakers` on the `ConferenceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `tracks` on the `ConferenceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `artistId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `ageRestriction` on the `FestivalDetails` table. All the data in the column will be lost.
  - You are about to drop the column `stages` on the `FestivalDetails` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Friendship` table. All the data in the column will be lost.
  - You are about to drop the column `success` on the `LoginEvent` table. All the data in the column will be lost.
  - You are about to drop the column `cast` on the `PerformanceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `performanceType` on the `PerformanceDetails` table. All the data in the column will be lost.
  - The `options` column on the `SettingItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `season` on the `SportDetails` table. All the data in the column will be lost.
  - You are about to drop the column `sport` on the `SportDetails` table. All the data in the column will be lost.
  - You are about to drop the column `studentOnly` on the `UniversityDetails` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `instructor` on the `WorkshopDetails` table. All the data in the column will be lost.
  - You are about to drop the column `maxParticipants` on the `WorkshopDetails` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,onesignalUserId]` on the table `PushSubscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,key,source]` on the table `UserSegmentTag` will be added. If there are existing duplicate values, this will fail.
  - Made the column `socialMedia` on table `Artist` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `senderId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Made the column `socialMedia` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ticketTypes` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."UserType_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "userType" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "userType" TYPE "public"."UserType_new" USING ("userType"::text::"public"."UserType_new");
ALTER TYPE "public"."UserType" RENAME TO "UserType_old";
ALTER TYPE "public"."UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "public"."User" ALTER COLUMN "userType" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ChatMessage" DROP CONSTRAINT "ChatMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Event" DROP CONSTRAINT "Event_artistId_fkey";

-- DropIndex
DROP INDEX "public"."ChatMessage_createdAt_idx";

-- DropIndex
DROP INDEX "public"."ChatMessage_userId_idx";

-- DropIndex
DROP INDEX "public"."Event_category_idx";

-- DropIndex
DROP INDEX "public"."Event_city_idx";

-- DropIndex
DROP INDEX "public"."Event_startDate_idx";

-- DropIndex
DROP INDEX "public"."LoginEvent_ts_idx";

-- DropIndex
DROP INDEX "public"."LoginEvent_userId_idx";

-- DropIndex
DROP INDEX "public"."PrivateMessage_createdAt_idx";

-- DropIndex
DROP INDEX "public"."PushSubscription_userId_idx";

-- DropIndex
DROP INDEX "public"."SettingItem_key_idx";

-- DropIndex
DROP INDEX "public"."SettingSection_key_idx";

-- DropIndex
DROP INDEX "public"."SettingSection_order_idx";

-- DropIndex
DROP INDEX "public"."UserSegmentTag_key_idx";

-- DropIndex
DROP INDEX "public"."UserSegmentTag_userId_idx";

-- DropIndex
DROP INDEX "public"."UserSegmentTag_userId_key_key";

-- DropIndex
DROP INDEX "public"."Venue_city_idx";

-- AlterTable
ALTER TABLE "public"."Artist" DROP COLUMN "avatar",
ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "genres" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "socialMedia" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Block" DROP COLUMN "reason";

-- AlterTable
ALTER TABLE "public"."ChatMessage" DROP COLUMN "userId",
ADD COLUMN     "senderId" TEXT NOT NULL,
ALTER COLUMN "senderType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."ConcertDetails" DROP COLUMN "ageRestriction",
DROP COLUMN "genre",
DROP COLUMN "lineup",
ADD COLUMN     "artistList" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "stageSetup" TEXT;

-- AlterTable
ALTER TABLE "public"."ConferenceDetails" DROP COLUMN "networking",
DROP COLUMN "speakers",
DROP COLUMN "tracks",
ADD COLUMN     "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "speakerList" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "topics" TEXT[];

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "artistId",
ALTER COLUMN "venue" DROP NOT NULL,
ALTER COLUMN "socialMedia" SET NOT NULL,
ALTER COLUMN "ticketTypes" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."FestivalDetails" DROP COLUMN "ageRestriction",
DROP COLUMN "stages",
ADD COLUMN     "sponsors" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "public"."Friendship" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."LoginEvent" DROP COLUMN "success",
ALTER COLUMN "ip" DROP NOT NULL,
ALTER COLUMN "ua" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."PerformanceDetails" DROP COLUMN "cast",
DROP COLUMN "performanceType",
ADD COLUMN     "performers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "scriptSummary" TEXT,
ALTER COLUMN "duration" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."PushSubscription" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "channel" SET DEFAULT 'WEB_PUSH',
ALTER COLUMN "pwa" DROP DEFAULT,
ALTER COLUMN "lastSeen" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."SettingItem" ADD COLUMN     "descriptionEN" TEXT,
ADD COLUMN     "descriptionTR" TEXT,
ALTER COLUMN "defaultValue" SET DEFAULT 'null',
DROP COLUMN "options",
ADD COLUMN     "options" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "public"."SettingSection" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "public"."SportDetails" DROP COLUMN "season",
DROP COLUMN "sport",
ADD COLUMN     "rules" TEXT,
ADD COLUMN     "scoreTracking" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."UniversityDetails" DROP COLUMN "studentOnly",
ADD COLUMN     "campus" TEXT,
ADD COLUMN     "studentDiscount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."UserSegmentTag" ADD COLUMN     "syncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Venue" DROP COLUMN "avatar",
DROP COLUMN "description",
ADD COLUMN     "accessibility" JSONB,
ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "details" TEXT,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "mapsLocation" TEXT,
ADD COLUMN     "seatedCapacity" INTEGER,
ADD COLUMN     "standingCapacity" INTEGER,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."WorkshopDetails" DROP COLUMN "instructor",
DROP COLUMN "maxParticipants",
ADD COLUMN     "instructorList" JSONB NOT NULL DEFAULT '[]';

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

-- CreateTable
CREATE TABLE "public"."EventArtist" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3),
    "eventId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventMute" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "muteUntil" TIMESTAMP(3),
    "mutedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMute_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "EventArtist_eventId_idx" ON "public"."EventArtist"("eventId");

-- CreateIndex
CREATE INDEX "EventArtist_artistId_idx" ON "public"."EventArtist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "EventArtist_eventId_artistId_key" ON "public"."EventArtist"("eventId", "artistId");

-- CreateIndex
CREATE INDEX "EventMute_eventId_idx" ON "public"."EventMute"("eventId");

-- CreateIndex
CREATE INDEX "EventMute_userId_idx" ON "public"."EventMute"("userId");

-- CreateIndex
CREATE INDEX "EventMute_mutedById_idx" ON "public"."EventMute"("mutedById");

-- CreateIndex
CREATE UNIQUE INDEX "EventMute_eventId_userId_key" ON "public"."EventMute"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "public"."Event"("venueId");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_ts_idx" ON "public"."LoginEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_browser_os_deviceType_pwa_idx" ON "public"."PushSubscription"("userId", "browser", "os", "deviceType", "pwa");

-- CreateIndex
CREATE INDEX "PushSubscription_subscribed_lastSeen_idx" ON "public"."PushSubscription"("subscribed", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_onesignalUserId_key" ON "public"."PushSubscription"("userId", "onesignalUserId");

-- CreateIndex
CREATE INDEX "UserSegmentTag_userId_key_value_idx" ON "public"."UserSegmentTag"("userId", "key", "value");

-- CreateIndex
CREATE INDEX "UserSegmentTag_key_value_idx" ON "public"."UserSegmentTag"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "UserSegmentTag_userId_key_source_key" ON "public"."UserSegmentTag"("userId", "key", "source");

-- AddForeignKey
ALTER TABLE "public"."NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventArtist" ADD CONSTRAINT "EventArtist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventArtist" ADD CONSTRAINT "EventArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMute" ADD CONSTRAINT "EventMute_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMute" ADD CONSTRAINT "EventMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMute" ADD CONSTRAINT "EventMute_mutedById_fkey" FOREIGN KEY ("mutedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
