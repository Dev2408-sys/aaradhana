-- Seller submits admin UPI UTR with the sale (settlement proof before approval)
ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "admin_payment_utr" TEXT;

CREATE INDEX IF NOT EXISTS "sales_admin_payment_utr_idx" ON "sales"("admin_payment_utr");
