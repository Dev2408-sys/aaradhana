-- Sale approval + ticket delivery / WhatsApp handoff lifecycle

CREATE TYPE "TicketDeliveryStatus" AS ENUM (
  'AWAITING_APPROVAL',
  'AWAITING_PAYMENT',
  'READY_TO_SEND',
  'SENT'
);

ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "delivery_status" "TicketDeliveryStatus" NOT NULL DEFAULT 'AWAITING_APPROVAL',
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejected_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "tickets_transferred_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "whatsapp_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "whatsapp_sent_by_user_id" UUID;

-- Backfill existing sales
UPDATE "sales"
SET
  "delivery_status" = CASE
    WHEN "sale_status" = 'PENDING' THEN 'AWAITING_APPROVAL'::"TicketDeliveryStatus"
    WHEN "sale_status" = 'CONFIRMED' AND "payment_status" = 'PAID' THEN 'READY_TO_SEND'::"TicketDeliveryStatus"
    WHEN "sale_status" = 'CONFIRMED' THEN 'AWAITING_PAYMENT'::"TicketDeliveryStatus"
    ELSE 'AWAITING_APPROVAL'::"TicketDeliveryStatus"
  END,
  "approved_at" = CASE
    WHEN "sale_status" = 'CONFIRMED' THEN COALESCE("approved_at", "sold_at")
    ELSE "approved_at"
  END,
  "tickets_transferred_at" = CASE
    WHEN "sale_status" = 'CONFIRMED' AND "payment_status" = 'PAID'
      THEN COALESCE("tickets_transferred_at", "sold_at")
    ELSE "tickets_transferred_at"
  END;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_whatsapp_sent_by_user_id_fkey"
  FOREIGN KEY ("whatsapp_sent_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "sales_delivery_status_idx" ON "sales"("delivery_status");
