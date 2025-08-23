/*
  Warnings:

  - You are about to drop the `Favorite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Favorite" DROP CONSTRAINT "Favorite_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Favorite" DROP CONSTRAINT "Favorite_userId_fkey";

-- AlterTable
ALTER TABLE "public"."ConcertDetails" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."Event" ALTER COLUMN "venue" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."Favorite";
