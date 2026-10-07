-- Phase 8 dashboard aggregation helpers
CREATE INDEX IF NOT EXISTS "sales_event_id_sale_status_event_day_idx"
  ON "sales"("event_id", "sale_status", "event_day");

CREATE INDEX IF NOT EXISTS "sales_event_id_sale_status_seller_id_idx"
  ON "sales"("event_id", "sale_status", "seller_id");

CREATE INDEX IF NOT EXISTS "sale_items_ticket_type_id_sale_id_idx"
  ON "sale_items"("ticket_type_id", "sale_id");

CREATE INDEX IF NOT EXISTS "customer_payments_status_created_at_idx"
  ON "customer_payments"("status", "created_at");
