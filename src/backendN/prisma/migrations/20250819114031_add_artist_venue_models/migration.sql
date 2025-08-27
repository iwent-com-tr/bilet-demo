-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "public"."Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "banner" TEXT,
    "socialMedia" JSONB NOT NULL DEFAULT '{}',
    "bio" TEXT,
    "organizerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "favoriteCount" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FavoriteArtist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteArtist_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "banner" TEXT,
    "details" TEXT,
    "capacity" INTEGER,
    "seatedCapacity" INTEGER,
    "standingCapacity" INTEGER,
    "accessibility" JSONB,
    "address" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "mapsLocation" TEXT,
    "organizerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FavoriteVenue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteVenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "public"."Artist"("slug");

-- CreateIndex
CREATE INDEX "Artist_slug_idx" ON "public"."Artist"("slug");

-- CreateIndex
CREATE INDEX "Artist_organizerId_idx" ON "public"."Artist"("organizerId");

-- CreateIndex
CREATE INDEX "FavoriteArtist_userId_idx" ON "public"."FavoriteArtist"("userId");

-- CreateIndex
CREATE INDEX "FavoriteArtist_artistId_idx" ON "public"."FavoriteArtist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteArtist_userId_artistId_key" ON "public"."FavoriteArtist"("userId", "artistId");

-- CreateIndex
CREATE INDEX "EventArtist_eventId_idx" ON "public"."EventArtist"("eventId");

-- CreateIndex
CREATE INDEX "EventArtist_artistId_idx" ON "public"."EventArtist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "EventArtist_eventId_artistId_key" ON "public"."EventArtist"("eventId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "public"."Venue"("slug");

-- CreateIndex
CREATE INDEX "Venue_slug_idx" ON "public"."Venue"("slug");

-- CreateIndex
CREATE INDEX "Venue_organizerId_idx" ON "public"."Venue"("organizerId");

-- CreateIndex
CREATE INDEX "FavoriteVenue_userId_idx" ON "public"."FavoriteVenue"("userId");

-- CreateIndex
CREATE INDEX "FavoriteVenue_venueId_idx" ON "public"."FavoriteVenue"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteVenue_userId_venueId_key" ON "public"."FavoriteVenue"("userId", "venueId");

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "public"."Event"("venueId");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Artist" ADD CONSTRAINT "Artist_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteArtist" ADD CONSTRAINT "FavoriteArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteArtist" ADD CONSTRAINT "FavoriteArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventArtist" ADD CONSTRAINT "EventArtist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventArtist" ADD CONSTRAINT "EventArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venue" ADD CONSTRAINT "Venue_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteVenue" ADD CONSTRAINT "FavoriteVenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteVenue" ADD CONSTRAINT "FavoriteVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
