-- AlterTable
ALTER TABLE "public"."Organizer" ADD COLUMN     "favoriteCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."FavoriteOrganizer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteOrganizer_userId_idx" ON "public"."FavoriteOrganizer"("userId");

-- CreateIndex
CREATE INDEX "FavoriteOrganizer_organizerId_idx" ON "public"."FavoriteOrganizer"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteOrganizer_userId_organizerId_key" ON "public"."FavoriteOrganizer"("userId", "organizerId");

-- AddForeignKey
ALTER TABLE "public"."FavoriteOrganizer" ADD CONSTRAINT "FavoriteOrganizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteOrganizer" ADD CONSTRAINT "FavoriteOrganizer_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
