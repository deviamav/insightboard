-- AlterTable
ALTER TABLE "stat_templates" ADD COLUMN "geos_json" JSONB;
ALTER TABLE "stat_templates" ADD COLUMN "buyer_count" INTEGER NOT NULL DEFAULT 5;
