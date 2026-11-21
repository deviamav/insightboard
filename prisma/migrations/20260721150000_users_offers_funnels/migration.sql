-- AlterTable
ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "geo" VARCHAR(10) NOT NULL,
    "title" VARCHAR(120),
    "price" DECIMAL(12,2) NOT NULL,
    "test_price" DECIMAL(12,2),
    "cr_min" DECIMAL(5,2),
    "cr_max" DECIMAL(5,2),
    "cr_note" VARCHAR(100),
    "funnels_json" JSONB NOT NULL DEFAULT '[]',
    "sources_json" JSONB NOT NULL DEFAULT '[]',
    "lpd_min" INTEGER,
    "lpd_max" INTEGER,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnels" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "geo" VARCHAR(10),
    "description" TEXT,
    "zip_file_name" VARCHAR(255),
    "entry_file" VARCHAR(500),
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "has_php" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_geo_idx" ON "offers"("geo");

-- CreateIndex
CREATE INDEX "funnels_geo_idx" ON "funnels"("geo");
