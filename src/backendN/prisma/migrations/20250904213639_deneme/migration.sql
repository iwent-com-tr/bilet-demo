/*
  Warnings:

  - The values [BUTTON] on the enum `SettingInputType` will be removed. If these variants are still used in the database, this will fail.
  - The values [ADMIN] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `approved` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `artistList` on the `ConcertDetails` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `ConcertDetails` table. All the data in the column will be lost.
  - You are about to drop the column `stageSetup` on the `ConcertDetails` table. All the data in the column will be lost.
  - You are about to drop the column `hasCertificate` on the `ConferenceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `speakerList` on the `ConferenceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `topics` on the `ConferenceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `sponsors` on the `FestivalDetails` table. All the data in the column will be lost.
  - You are about to drop the column `performers` on the `PerformanceDetails` table. All the data in the column will be lost.
  - You are about to drop the column `scriptSummary` on the `PerformanceDetails` table. All the data in the column will be lost.
  - The `duration` column on the `PerformanceDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `ipAddress` on the `PushSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `PushSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionEN` on the `SettingItem` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionTR` on the `SettingItem` table. All the data in the column will be lost.
  - The `options` column on the `SettingItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `icon` on the `SettingSection` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `SportDetails` table. All the data in the column will be lost.
  - You are about to drop the column `scoreTracking` on the `SportDetails` table. All the data in the column will be lost.
  - You are about to drop the column `campus` on the `UniversityDetails` table. All the data in the column will be lost.
  - You are about to drop the column `studentDiscount` on the `UniversityDetails` table. All the data in the column will be lost.
  - You are about to drop the column `syncedAt` on the `UserSegmentTag` table. All the data in the column will be lost.
  - You are about to drop the column `accessibility` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `approved` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `mapsLocation` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `seatedCapacity` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `standingCapacity` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `instructorList` on the `WorkshopDetails` table. All the data in the column will be lost.
  - You are about to drop the `EventArtist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventMute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,key]` on the table `UserSegmentTag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Made the column `venue` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Friendship` table without a default value. This is not possible if the table is not empty.
  - Made the column `ip` on table `LoginEvent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ua` on table `LoginEvent` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `performanceType` to the `PerformanceDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sport` to the `SportDetails` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `Venue` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `Venue` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."SettingInputType_new" AS ENUM ('TOGGLE', 'SELECT', 'MULTISELECT');
ALTER TABLE "public"."SettingItem" ALTER COLUMN "inputType" TYPE "public"."SettingInputType_new" USING ("inputType"::text::"public"."SettingInputType_new");
ALTER TYPE "public"."SettingInputType" RENAME TO "SettingInputType_old";
ALTER TYPE "public"."SettingInputType_new" RENAME TO "SettingInputType";
DROP TYPE "public"."SettingInputType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."UserType_new" AS ENUM ('USER', 'ORGANIZER');
ALTER TABLE "public"."User" ALTER COLUMN "userType" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "userType" TYPE "public"."UserType_new" USING ("userType"::text::"public"."UserType_new");
ALTER TYPE "public"."UserType" RENAME TO "UserType_old";
ALTER TYPE "public"."UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "public"."User" ALTER COLUMN "userType" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."EventArtist" DROP CONSTRAINT "EventArtist_artistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventArtist" DROP CONSTRAINT "EventArtist_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventMute" DROP CONSTRAINT "EventMute_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventMute" DROP CONSTRAINT "EventMute_mutedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventMute" DROP CONSTRAINT "EventMute_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NotificationEvent" DROP CONSTRAINT "NotificationEvent_userId_fkey";

-- DropIndex
DROP INDEX "public"."Event_venueId_idx";

-- DropIndex
DROP INDEX "public"."LoginEvent_userId_ts_idx";

-- DropIndex
DROP INDEX "public"."PushSubscription_subscribed_lastSeen_idx";

-- DropIndex
DROP INDEX "public"."PushSubscription_userId_browser_os_deviceType_pwa_idx";

-- DropIndex
DROP INDEX "public"."PushSubscription_userId_onesignalUserId_key";

-- DropIndex
DROP INDEX "public"."UserSegmentTag_key_value_idx";

-- DropIndex
DROP INDEX "public"."UserSegmentTag_userId_key_source_key";

-- DropIndex
DROP INDEX "public"."UserSegmentTag_userId_key_value_idx";

-- AlterTable
ALTER TABLE "public"."Artist" DROP COLUMN "approved",
ADD COLUMN     "avatar" TEXT,
ALTER COLUMN "genres" DROP DEFAULT,
ALTER COLUMN "socialMedia" DROP NOT NULL,
ALTER COLUMN "favoriteCount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Block" ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "public"."ChatMessage" DROP COLUMN "senderId",
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "senderType" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "public"."ConcertDetails" DROP COLUMN "artistList",
DROP COLUMN "duration",
DROP COLUMN "stageSetup",
ADD COLUMN     "ageRestriction" INTEGER,
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "lineup" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "public"."ConferenceDetails" DROP COLUMN "hasCertificate",
DROP COLUMN "speakerList",
DROP COLUMN "topics",
ADD COLUMN     "networking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "speakers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tracks" TEXT[];

-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "artistId" TEXT,
ALTER COLUMN "venue" SET NOT NULL,
ALTER COLUMN "socialMedia" DROP NOT NULL,
ALTER COLUMN "ticketTypes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."FestivalDetails" DROP COLUMN "sponsors",
ADD COLUMN     "ageRestriction" INTEGER,
ADD COLUMN     "stages" TEXT[];

-- AlterTable
ALTER TABLE "public"."Friendship" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."LoginEvent" ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "ip" SET NOT NULL,
ALTER COLUMN "ua" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Organizer" ALTER COLUMN "approved" SET DEFAULT false;

-- AlterTable
ALTER TABLE "public"."PerformanceDetails" DROP COLUMN "performers",
DROP COLUMN "scriptSummary",
ADD COLUMN     "cast" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "performanceType" TEXT NOT NULL,
DROP COLUMN "duration",
ADD COLUMN     "duration" INTEGER;

-- AlterTable
ALTER TABLE "public"."PushSubscription" DROP COLUMN "ipAddress",
DROP COLUMN "userAgent",
ALTER COLUMN "channel" DROP DEFAULT,
ALTER COLUMN "pwa" SET DEFAULT false,
ALTER COLUMN "lastSeen" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."SettingItem" DROP COLUMN "descriptionEN",
DROP COLUMN "descriptionTR",
DROP COLUMN "options",
ADD COLUMN     "options" TEXT[],
ALTER COLUMN "defaultValue" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."SettingSection" DROP COLUMN "icon";

-- AlterTable
ALTER TABLE "public"."SportDetails" DROP COLUMN "rules",
DROP COLUMN "scoreTracking",
ADD COLUMN     "season" TEXT,
ADD COLUMN     "sport" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."UniversityDetails" DROP COLUMN "campus",
DROP COLUMN "studentDiscount",
ADD COLUMN     "studentOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."UserSegmentTag" DROP COLUMN "syncedAt";

-- AlterTable
ALTER TABLE "public"."Venue" DROP COLUMN "accessibility",
DROP COLUMN "approved",
DROP COLUMN "details",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "mapsLocation",
DROP COLUMN "seatedCapacity",
DROP COLUMN "standingCapacity",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "description" TEXT,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."WorkshopDetails" DROP COLUMN "instructorList",
ADD COLUMN     "instructor" TEXT,
ADD COLUMN     "maxParticipants" INTEGER;

-- DropTable
DROP TABLE "public"."EventArtist";

-- DropTable
DROP TABLE "public"."EventMute";

-- DropTable
DROP TABLE "public"."NotificationEvent";

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "public"."ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "public"."ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "public"."Event"("category");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "public"."Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_city_idx" ON "public"."Event"("city");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_idx" ON "public"."LoginEvent"("userId");

-- CreateIndex
CREATE INDEX "LoginEvent_ts_idx" ON "public"."LoginEvent"("ts");

-- CreateIndex
CREATE INDEX "PrivateMessage_createdAt_idx" ON "public"."PrivateMessage"("createdAt");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "public"."PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "SettingItem_key_idx" ON "public"."SettingItem"("key");

-- CreateIndex
CREATE INDEX "SettingSection_key_idx" ON "public"."SettingSection"("key");

-- CreateIndex
CREATE INDEX "SettingSection_order_idx" ON "public"."SettingSection"("order");

-- CreateIndex
CREATE INDEX "UserSegmentTag_userId_idx" ON "public"."UserSegmentTag"("userId");

-- CreateIndex
CREATE INDEX "UserSegmentTag_key_idx" ON "public"."UserSegmentTag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserSegmentTag_userId_key_key" ON "public"."UserSegmentTag"("userId", "key");

-- CreateIndex
CREATE INDEX "Venue_city_idx" ON "public"."Venue"("city");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
