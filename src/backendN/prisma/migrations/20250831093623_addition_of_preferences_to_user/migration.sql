-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "preferences" JSONB[] DEFAULT ARRAY[]::JSONB[];
