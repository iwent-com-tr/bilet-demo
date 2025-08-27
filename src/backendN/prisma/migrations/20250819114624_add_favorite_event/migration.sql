-- CreateTable
CREATE TABLE "public"."FavoriteEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteEvent_userId_idx" ON "public"."FavoriteEvent"("userId");

-- CreateIndex
CREATE INDEX "FavoriteEvent_eventId_idx" ON "public"."FavoriteEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteEvent_userId_eventId_key" ON "public"."FavoriteEvent"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "public"."FavoriteEvent" ADD CONSTRAINT "FavoriteEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteEvent" ADD CONSTRAINT "FavoriteEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
