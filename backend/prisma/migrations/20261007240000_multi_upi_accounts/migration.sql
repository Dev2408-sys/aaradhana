-- CreateEnum
CREATE TYPE "UpiAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable PaymentSettings
ALTER TABLE "payment_settings"
ADD COLUMN "default_rotate_limit_amount" DECIMAL(12,2) NOT NULL DEFAULT 100000;

-- CreateTable
CREATE TABLE "upi_accounts" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "upi_id" TEXT NOT NULL,
    "payee_name" TEXT NOT NULL,
    "qr_image_url" TEXT,
    "instructions" TEXT,
    "status" "UpiAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "is_receiving" BOOLEAN NOT NULL DEFAULT false,
    "rotate_limit_amount" DECIMAL(12,2) NOT NULL DEFAULT 100000,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upi_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable Sale
ALTER TABLE "sales"
ADD COLUMN "upi_account_id" UUID,
ADD COLUMN "upi_id_snapshot" TEXT,
ADD COLUMN "upi_payee_name_snapshot" TEXT;

-- Indexes
CREATE INDEX "upi_accounts_event_id_status_idx" ON "upi_accounts"("event_id", "status");
CREATE INDEX "upi_accounts_event_id_is_receiving_idx" ON "upi_accounts"("event_id", "is_receiving");
CREATE INDEX "upi_accounts_event_id_sort_order_idx" ON "upi_accounts"("event_id", "sort_order");
CREATE INDEX "sales_upi_account_id_idx" ON "sales"("upi_account_id");
CREATE INDEX "sales_upi_account_id_approved_at_idx" ON "sales"("upi_account_id", "approved_at");

-- ForeignKeys
ALTER TABLE "upi_accounts"
ADD CONSTRAINT "upi_accounts_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales"
ADD CONSTRAINT "sales_upi_account_id_fkey"
FOREIGN KEY ("upi_account_id") REFERENCES "upi_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate legacy PaymentSettings UPI into first UpiAccount (when present)
INSERT INTO "upi_accounts" (
  "id",
  "event_id",
  "label",
  "upi_id",
  "payee_name",
  "qr_image_url",
  "instructions",
  "status",
  "is_main",
  "is_receiving",
  "rotate_limit_amount",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  ps."event_id",
  COALESCE(NULLIF(TRIM(ps."upi_payee_name"), ''), 'Main UPI'),
  TRIM(ps."upi_id"),
  COALESCE(NULLIF(TRIM(ps."upi_payee_name"), ''), 'Kesariya Navratri 4.0'),
  ps."upi_qr_image_url",
  ps."upi_instructions",
  'ACTIVE',
  true,
  true,
  COALESCE(ps."default_rotate_limit_amount", 100000),
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "payment_settings" ps
WHERE ps."upi_id" IS NOT NULL AND TRIM(ps."upi_id") <> '';
