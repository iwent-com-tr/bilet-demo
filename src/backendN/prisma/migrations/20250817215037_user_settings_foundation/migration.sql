-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('TR', 'EN');

-- CreateEnum
CREATE TYPE "public"."SettingInputType" AS ENUM ('TOGGLE', 'SELECT', 'MULTISELECT');

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('EVENT_TIME_CHANGE', 'EVENT_VENUE_CHANGE', 'TICKET_PURCHASED', 'TICKET_QR', 'FRIEND_JOINED_EVENT', 'FOLLOWED_VENUE_UPDATE', 'FOLLOWED_ARTIST_UPDATE');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "public"."SettingSection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titleTR" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "descriptionTR" TEXT,
    "descriptionEN" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SettingItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titleTR" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "descriptionTR" TEXT,
    "descriptionEN" TEXT,
    "inputType" "public"."SettingInputType" NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "defaultValue" JSONB NOT NULL DEFAULT 'null',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "handle" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettingSection_key_key" ON "public"."SettingSection"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SettingItem_key_key" ON "public"."SettingItem"("key");

-- CreateIndex
CREATE INDEX "SettingItem_sectionId_idx" ON "public"."SettingItem"("sectionId");

-- CreateIndex
CREATE INDEX "UserSetting_userId_idx" ON "public"."UserSetting"("userId");

-- CreateIndex
CREATE INDEX "UserSetting_itemId_idx" ON "public"."UserSetting"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_itemId_key" ON "public"."UserSetting"("userId", "itemId");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_userId_idx" ON "public"."UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_category_key" ON "public"."UserNotificationPreference"("userId", "category");

-- CreateIndex
CREATE INDEX "UserSocialAccount_userId_idx" ON "public"."UserSocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSocialAccount_userId_provider_key" ON "public"."UserSocialAccount"("userId", "provider");

-- AddForeignKey
ALTER TABLE "public"."SettingItem" ADD CONSTRAINT "SettingItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."SettingSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSetting" ADD CONSTRAINT "UserSetting_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."SettingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSocialAccount" ADD CONSTRAINT "UserSocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
