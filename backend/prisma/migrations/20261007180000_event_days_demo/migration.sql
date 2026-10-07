-- Event day master + demo seed meta

CREATE TYPE "EventDayStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "gate_opening" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "show_start" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

CREATE TABLE "event_days" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "day_number" INTEGER NOT NULL,
  "event_date" DATE NOT NULL,
  "label" TEXT NOT NULL,
  "status" "EventDayStatus" NOT NULL DEFAULT 'UPCOMING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_days_event_id_day_number_key" ON "event_days"("event_id", "day_number");
CREATE UNIQUE INDEX "event_days_event_id_event_date_key" ON "event_days"("event_id", "event_date");
CREATE INDEX "event_days_event_id_day_number_idx" ON "event_days"("event_id", "day_number");

ALTER TABLE "event_days"
  ADD CONSTRAINT "event_days_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "demo_seed_meta" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "stats" JSONB,
  "seeded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demo_seed_meta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demo_seed_meta_key_key" ON "demo_seed_meta"("key");

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "event_day_id" UUID;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "data_source" TEXT;

CREATE INDEX IF NOT EXISTS "sales_event_day_id_idx" ON "sales"("event_day_id");
CREATE INDEX IF NOT EXISTS "sales_data_source_idx" ON "sales"("data_source");

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_event_day_id_fkey"
  FOREIGN KEY ("event_day_id") REFERENCES "event_days"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
