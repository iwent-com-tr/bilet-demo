-- CreateEnum
CREATE TYPE "public"."EventCategory" AS ENUM ('CONCERT', 'FESTIVAL', 'UNIVERSITY', 'WORKSHOP', 'CONFERENCE', 'SPORT', 'PERFORMANCE', 'EDUCATION');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SenderType" AS ENUM ('USER', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "public"."ChatMessageStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PrivateMessageStatus" AS ENUM ('SENT', 'READ', 'DELETED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "city" TEXT NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "userType" "public"."UserType" NOT NULL DEFAULT 'USER',
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organizer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "address" TEXT,
    "bankAccount" TEXT,
    "lastLogin" TIMESTAMP(3),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "devices" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "public"."EventCategory" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "banner" TEXT,
    "socialMedia" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "capacity" INTEGER,
    "ticketTypes" JSONB NOT NULL DEFAULT '[]',
    "status" "public"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConcertDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "artistList" JSONB NOT NULL DEFAULT '[]',
    "stageSetup" TEXT,
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConcertDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FestivalDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "lineup" JSONB NOT NULL DEFAULT '[]',
    "sponsors" JSONB NOT NULL DEFAULT '[]',
    "activities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UniversityDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "campus" TEXT,
    "department" TEXT,
    "studentDiscount" BOOLEAN NOT NULL DEFAULT false,
    "facultyList" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniversityDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkshopDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "instructorList" JSONB NOT NULL DEFAULT '[]',
    "materials" JSONB NOT NULL DEFAULT '[]',
    "skillLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConferenceDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "speakerList" JSONB NOT NULL DEFAULT '[]',
    "agenda" JSONB NOT NULL DEFAULT '[]',
    "topics" TEXT[],
    "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConferenceDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SportDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teams" JSONB NOT NULL DEFAULT '[]',
    "league" TEXT,
    "scoreTracking" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerformanceDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "performers" JSONB NOT NULL DEFAULT '[]',
    "scriptSummary" TEXT,
    "duration" TEXT,
    "genre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EducationDetails" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "curriculum" JSONB NOT NULL DEFAULT '[]',
    "instructors" JSONB NOT NULL DEFAULT '[]',
    "prerequisites" TEXT[],
    "certification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketType" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "qrCode" TEXT,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "entryTime" TIMESTAMP(3),
    "gate" TEXT,
    "deviceId" TEXT,
    "referenceCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "public"."SenderType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "public"."ChatMessageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Friendship" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "public"."FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrivateMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "public"."PrivateMessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_email_key" ON "public"."Organizer"("email");

-- CreateIndex
CREATE INDEX "Organizer_email_idx" ON "public"."Organizer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "public"."Event"("slug");

-- CreateIndex
CREATE INDEX "Event_slug_idx" ON "public"."Event"("slug");

-- CreateIndex
CREATE INDEX "Event_organizerId_idx" ON "public"."Event"("organizerId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "public"."Event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConcertDetails_eventId_key" ON "public"."ConcertDetails"("eventId");

-- CreateIndex
CREATE INDEX "ConcertDetails_eventId_idx" ON "public"."ConcertDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalDetails_eventId_key" ON "public"."FestivalDetails"("eventId");

-- CreateIndex
CREATE INDEX "FestivalDetails_eventId_idx" ON "public"."FestivalDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UniversityDetails_eventId_key" ON "public"."UniversityDetails"("eventId");

-- CreateIndex
CREATE INDEX "UniversityDetails_eventId_idx" ON "public"."UniversityDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopDetails_eventId_key" ON "public"."WorkshopDetails"("eventId");

-- CreateIndex
CREATE INDEX "WorkshopDetails_eventId_idx" ON "public"."WorkshopDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceDetails_eventId_key" ON "public"."ConferenceDetails"("eventId");

-- CreateIndex
CREATE INDEX "ConferenceDetails_eventId_idx" ON "public"."ConferenceDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SportDetails_eventId_key" ON "public"."SportDetails"("eventId");

-- CreateIndex
CREATE INDEX "SportDetails_eventId_idx" ON "public"."SportDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceDetails_eventId_key" ON "public"."PerformanceDetails"("eventId");

-- CreateIndex
CREATE INDEX "PerformanceDetails_eventId_idx" ON "public"."PerformanceDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EducationDetails_eventId_key" ON "public"."EducationDetails"("eventId");

-- CreateIndex
CREATE INDEX "EducationDetails_eventId_idx" ON "public"."EducationDetails"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCode_key" ON "public"."Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "public"."Ticket"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "public"."Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_qrCode_idx" ON "public"."Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "ChatMessage_eventId_idx" ON "public"."ChatMessage"("eventId");

-- CreateIndex
CREATE INDEX "Friendship_fromUserId_idx" ON "public"."Friendship"("fromUserId");

-- CreateIndex
CREATE INDEX "Friendship_toUserId_idx" ON "public"."Friendship"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_fromUserId_toUserId_key" ON "public"."Friendship"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "PrivateMessage_senderId_idx" ON "public"."PrivateMessage"("senderId");

-- CreateIndex
CREATE INDEX "PrivateMessage_receiverId_idx" ON "public"."PrivateMessage"("receiverId");

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "public"."Block"("blockerId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "public"."Block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "public"."Block"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConcertDetails" ADD CONSTRAINT "ConcertDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FestivalDetails" ADD CONSTRAINT "FestivalDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UniversityDetails" ADD CONSTRAINT "UniversityDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkshopDetails" ADD CONSTRAINT "WorkshopDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConferenceDetails" ADD CONSTRAINT "ConferenceDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SportDetails" ADD CONSTRAINT "SportDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PerformanceDetails" ADD CONSTRAINT "PerformanceDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EducationDetails" ADD CONSTRAINT "EducationDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrivateMessage" ADD CONSTRAINT "PrivateMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrivateMessage" ADD CONSTRAINT "PrivateMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
