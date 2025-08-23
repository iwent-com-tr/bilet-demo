/*
  Warnings:

  - You are about to drop the column `genres` on the `ConcertDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ConcertDetails" DROP COLUMN "genres";

-- AlterTable
ALTER TABLE "public"."Organizer" ALTER COLUMN "approved" SET DEFAULT false;
