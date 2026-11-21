-- AlterTable
ALTER TABLE "funnels" ADD COLUMN "zip_size_bytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "funnels" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'public';
