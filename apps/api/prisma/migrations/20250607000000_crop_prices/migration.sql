CREATE TABLE IF NOT EXISTS "crop_price_snapshots" (
  "id" UUID NOT NULL,
  "crop_name" VARCHAR(100) NOT NULL,
  "market_name" VARCHAR(150) NOT NULL,
  "state" VARCHAR(80) NOT NULL,
  "min_price" DECIMAL(14,2) NOT NULL,
  "max_price" DECIMAL(14,2) NOT NULL,
  "modal_price" DECIMAL(14,2) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "source" VARCHAR(50) NOT NULL,
  "recorded_on" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crop_price_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crop_price_snapshots_crop_name_market_name_recorded_on_source_key"
ON "crop_price_snapshots"("crop_name", "market_name", "recorded_on", "source");

CREATE INDEX IF NOT EXISTS "crop_price_snapshots_crop_name_state_recorded_on_idx"
ON "crop_price_snapshots"("crop_name", "state", "recorded_on");
