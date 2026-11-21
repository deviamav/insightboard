-- AlterTable
ALTER TABLE "daily_stats" ADD COLUMN "periodType" VARCHAR(10) NOT NULL DEFAULT 'day';
ALTER TABLE "daily_stats" ADD COLUMN "noSend" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "daily_stats" ADD COLUMN "offerName" VARCHAR(100) NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "daily_stats_geo_idx" ON "daily_stats"("geo");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_date_geo_periodType_offerName_key" ON "daily_stats"("date", "geo", "periodType", "offerName");
