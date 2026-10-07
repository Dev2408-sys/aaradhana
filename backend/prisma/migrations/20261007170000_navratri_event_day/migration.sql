-- Navratri Day 1–10 on sales (11 Oct – 20 Oct 2026)
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "event_day" INTEGER;
CREATE INDEX IF NOT EXISTS "sales_event_day_idx" ON "sales"("event_day");
