-- CreateTable
CREATE TABLE "stat_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "geo" VARCHAR(10) NOT NULL,
    "geoLabel" VARCHAR(100),
    "periodType" VARCHAR(10) NOT NULL DEFAULT 'day',
    "anchorDate" DATE NOT NULL,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "invalids" INTEGER NOT NULL DEFAULT 0,
    "deposits" INTEGER NOT NULL DEFAULT 0,
    "noSend" INTEGER NOT NULL DEFAULT 0,
    "offerName" VARCHAR(100) NOT NULL DEFAULT '',
    "profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "buyerName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stat_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "activeTemplateId" TEXT,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- Insert default config row
INSERT INTO "app_config" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;
