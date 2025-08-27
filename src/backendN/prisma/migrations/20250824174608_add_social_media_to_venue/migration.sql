-- AlterTable
ALTER TABLE "public"."Organizer" ALTER COLUMN "approved" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Venue" ADD COLUMN     "socialMedia" JSONB DEFAULT '{}';
