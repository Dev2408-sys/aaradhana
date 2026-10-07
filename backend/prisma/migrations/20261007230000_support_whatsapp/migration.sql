ALTER TABLE "payment_settings"
  ADD COLUMN IF NOT EXISTS "support_whatsapp" TEXT;

UPDATE "payment_settings"
SET "support_whatsapp" = '919998887766'
WHERE "support_whatsapp" IS NULL;
