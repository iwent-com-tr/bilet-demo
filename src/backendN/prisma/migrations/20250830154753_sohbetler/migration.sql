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
CREATE INDEX "EventMute_eventId_idx" ON "public"."EventMute"("eventId");

-- CreateIndex
CREATE INDEX "EventMute_userId_idx" ON "public"."EventMute"("userId");

-- CreateIndex
CREATE INDEX "EventMute_mutedById_idx" ON "public"."EventMute"("mutedById");

-- CreateIndex
CREATE UNIQUE INDEX "EventMute_eventId_userId_key" ON "public"."EventMute"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "public"."EventMute" ADD CONSTRAINT "EventMute_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMute" ADD CONSTRAINT "EventMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMute" ADD CONSTRAINT "EventMute_mutedById_fkey" FOREIGN KEY ("mutedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
