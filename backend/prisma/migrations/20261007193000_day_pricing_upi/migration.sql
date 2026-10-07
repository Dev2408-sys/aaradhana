-- Day-wise seller pricing + admin UPI payment settings

CREATE TABLE "event_day_prices" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "event_day_id" UUID NOT NULL,
  "ticket_type_id" UUID NOT NULL,
  "day_number" INTEGER NOT NULL,
  "base_price" DECIMAL(12,2) NOT NULL,
  "minimum_selling_price" DECIMAL(12,2),
  "suggested_selling_price" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_day_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_day_prices_event_day_id_ticket_type_id_key"
  ON "event_day_prices"("event_day_id", "ticket_type_id");
CREATE UNIQUE INDEX "event_day_prices_event_id_day_number_ticket_type_id_key"
  ON "event_day_prices"("event_id", "day_number", "ticket_type_id");
CREATE INDEX "event_day_prices_event_id_day_number_idx"
  ON "event_day_prices"("event_id", "day_number");

ALTER TABLE "event_day_prices"
  ADD CONSTRAINT "event_day_prices_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_day_prices"
  ADD CONSTRAINT "event_day_prices_event_day_id_fkey"
  FOREIGN KEY ("event_day_id") REFERENCES "event_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_day_prices"
  ADD CONSTRAINT "event_day_prices_ticket_type_id_fkey"
  FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_settings" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "upi_id" TEXT,
  "upi_payee_name" TEXT,
  "upi_instructions" TEXT,
  "require_utr_for_upi" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_settings_event_id_key" ON "payment_settings"("event_id");

ALTER TABLE "payment_settings"
  ADD CONSTRAINT "payment_settings_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default day prices from ticket type base for existing event days
INSERT INTO "event_day_prices" (
  "id", "event_id", "event_day_id", "ticket_type_id", "day_number",
  "base_price", "minimum_selling_price", "suggested_selling_price",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  ed.event_id,
  ed.id,
  tt.id,
  ed.day_number,
  tt.base_price,
  COALESCE(tt.minimum_price, tt.base_price),
  CASE WHEN tt.base_price < 499 THEN 499 ELSE tt.base_price END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "event_days" ed
JOIN "ticket_types" tt ON tt.event_id = ed.event_id AND tt.active = true
WHERE NOT EXISTS (
  SELECT 1 FROM "event_day_prices" edp
  WHERE edp.event_day_id = ed.id AND edp.ticket_type_id = tt.id
);

INSERT INTO "payment_settings" (
  "id", "event_id", "upi_id", "upi_payee_name", "upi_instructions",
  "require_utr_for_upi", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  e.id,
  'kesariya@upi',
  'Kesariya Navratri 4.0',
  'Pay admin base amount via UPI and submit the 12-digit UTR / UPI reference.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "events" e
WHERE e.slug = 'kesariya-navratri-4-0'
  AND NOT EXISTS (
    SELECT 1 FROM "payment_settings" ps WHERE ps.event_id = e.id
  );
