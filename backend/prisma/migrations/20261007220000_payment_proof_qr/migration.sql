-- Payment screenshot proof on sales (replaces UTR for seller→admin settlement)
ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "admin_payment_proof_url" TEXT;

CREATE INDEX IF NOT EXISTS "sales_admin_payment_proof_url_idx"
  ON "sales"("admin_payment_proof_url");

-- Optional custom QR image for admin UPI
ALTER TABLE "payment_settings"
  ADD COLUMN IF NOT EXISTS "upi_qr_image_url" TEXT;

-- UTR no longer required by default
ALTER TABLE "payment_settings"
  ALTER COLUMN "require_utr_for_upi" SET DEFAULT false;

UPDATE "payment_settings" SET "require_utr_for_upi" = false;
