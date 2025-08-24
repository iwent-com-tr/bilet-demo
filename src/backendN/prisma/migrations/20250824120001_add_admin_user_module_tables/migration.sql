-- CreateEnum
CREATE TYPE "public"."AdminRole" AS ENUM ('USER', 'ADMIN', 'SUPPORT', 'READONLY');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."PushChannel" AS ENUM ('WEB_PUSH');

-- CreateEnum
CREATE TYPE "public"."Browser" AS ENUM ('CHROME', 'SAFARI', 'FIREFOX', 'EDGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OS" AS ENUM ('IOS', 'ANDROID', 'MACOS', 'WINDOWS', 'LINUX', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');

-- CreateEnum
CREATE TYPE "public"."SegmentSource" AS ENUM ('INTERNAL', 'ONESIGNAL');

-- CreateEnum
CREATE TYPE "public"."LoginMethod" AS ENUM ('PASSWORD', 'OAUTH', 'MAGIC_LINK');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "adminRole" "public"."AdminRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "country" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "locale" TEXT DEFAULT 'tr-TR',
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "public"."PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "public"."PushChannel" NOT NULL,
    "onesignalUserId" TEXT NOT NULL,
    "onesignalSubId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "browser" "public"."Browser" NOT NULL,
    "os" "public"."OS" NOT NULL,
    "deviceType" "public"."DeviceType" NOT NULL,
    "pwa" BOOLEAN NOT NULL,
    "subscribed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSegmentTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" "public"."SegmentSource" NOT NULL,

    CONSTRAINT "UserSegmentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "ua" TEXT,
    "method" "public"."LoginMethod" NOT NULL,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_browser_os_deviceType_pwa_idx" ON "public"."PushSubscription"("userId", "browser", "os", "deviceType", "pwa");

-- CreateIndex
CREATE INDEX "UserSegmentTag_userId_key_value_idx" ON "public"."UserSegmentTag"("userId", "key", "value");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_ts_idx" ON "public"."LoginEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "public"."AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "User_externalId_key" ON "public"."User"("externalId");

-- CreateIndex
CREATE INDEX "User_externalId_idx" ON "public"."User"("externalId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "User_lastLogin_idx" ON "public"."User"("lastLogin");

-- CreateIndex
CREATE INDEX "User_adminRole_status_idx" ON "public"."User"("adminRole", "status");

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSegmentTag" ADD CONSTRAINT "UserSegmentTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;