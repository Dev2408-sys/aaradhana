-- Phase 7: accounting ledger + customer payments + seller payment status

CREATE TYPE "LedgerEntryType" AS ENUM (
  'SALE_DEBIT',
  'PAYMENT_CREDIT',
  'ADJUSTMENT_DEBIT',
  'ADJUSTMENT_CREDIT',
  'REFUND_DEBIT',
  'REVERSAL_CREDIT',
  'REVERSAL_DEBIT'
);

CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

CREATE TYPE "FinancialRecordStatus" AS ENUM ('RECORDED', 'REVERSED');

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CARD',
  'OTHER'
);

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'OVERPAID';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SELLER_PAYMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REVERSED';

-- Seller payments: evolve columns
ALTER TABLE "seller_payments" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "seller_payments" ADD COLUMN IF NOT EXISTS "status" "FinancialRecordStatus" NOT NULL DEFAULT 'RECORDED';
ALTER TABLE "seller_payments" ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3);
ALTER TABLE "seller_payments" ADD COLUMN IF NOT EXISTS "reversed_by_user_id" UUID;
ALTER TABLE "seller_payments" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert payment_method string → enum
ALTER TABLE "seller_payments" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "seller_payments"
  ALTER COLUMN "payment_method" TYPE "PaymentMethod"
  USING (
    CASE UPPER(TRIM("payment_method"))
      WHEN 'CASH' THEN 'CASH'::"PaymentMethod"
      WHEN 'UPI' THEN 'UPI'::"PaymentMethod"
      WHEN 'BANK_TRANSFER' THEN 'BANK_TRANSFER'::"PaymentMethod"
      WHEN 'CARD' THEN 'CARD'::"PaymentMethod"
      ELSE 'OTHER'::"PaymentMethod"
    END
  );

CREATE UNIQUE INDEX IF NOT EXISTS "seller_payments_idempotency_key_key"
  ON "seller_payments"("idempotency_key");
CREATE INDEX IF NOT EXISTS "seller_payments_status_idx" ON "seller_payments"("status");
CREATE INDEX IF NOT EXISTS "seller_payments_created_at_idx" ON "seller_payments"("created_at");
CREATE INDEX IF NOT EXISTS "seller_payments_payment_method_transaction_reference_idx"
  ON "seller_payments"("payment_method", "transaction_reference");

ALTER TABLE "seller_payments"
  ADD CONSTRAINT "seller_payments_reversed_by_user_id_fkey"
  FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "seller_ledger_entries" (
  "id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "sale_id" UUID,
  "seller_payment_id" UUID,
  "entry_type" "LedgerEntryType" NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balance_after" DECIMAL(12,2),
  "reference" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_ledger_entries_reference_key" ON "seller_ledger_entries"("reference");
CREATE INDEX "seller_ledger_entries_seller_id_created_at_idx"
  ON "seller_ledger_entries"("seller_id", "created_at");
CREATE INDEX "seller_ledger_entries_sale_id_idx" ON "seller_ledger_entries"("sale_id");
CREATE INDEX "seller_ledger_entries_seller_payment_id_idx"
  ON "seller_ledger_entries"("seller_payment_id");
CREATE INDEX "seller_ledger_entries_entry_type_idx" ON "seller_ledger_entries"("entry_type");

ALTER TABLE "seller_ledger_entries"
  ADD CONSTRAINT "seller_ledger_entries_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_ledger_entries"
  ADD CONSTRAINT "seller_ledger_entries_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seller_ledger_entries"
  ADD CONSTRAINT "seller_ledger_entries_seller_payment_id_fkey"
  FOREIGN KEY ("seller_payment_id") REFERENCES "seller_payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seller_ledger_entries"
  ADD CONSTRAINT "seller_ledger_entries_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_payments" (
  "id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "payment_method" "PaymentMethod" NOT NULL,
  "payment_reference" TEXT,
  "idempotency_key" TEXT,
  "notes" TEXT,
  "status" "FinancialRecordStatus" NOT NULL DEFAULT 'RECORDED',
  "received_by_user_id" UUID NOT NULL,
  "reversed_at" TIMESTAMP(3),
  "reversed_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_payments_idempotency_key_key" ON "customer_payments"("idempotency_key");
CREATE INDEX "customer_payments_customer_id_idx" ON "customer_payments"("customer_id");
CREATE INDEX "customer_payments_sale_id_idx" ON "customer_payments"("sale_id");
CREATE INDEX "customer_payments_status_idx" ON "customer_payments"("status");
CREATE INDEX "customer_payments_created_at_idx" ON "customer_payments"("created_at");
CREATE INDEX "customer_payments_payment_method_payment_reference_idx"
  ON "customer_payments"("payment_method", "payment_reference");

ALTER TABLE "customer_payments"
  ADD CONSTRAINT "customer_payments_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments"
  ADD CONSTRAINT "customer_payments_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments"
  ADD CONSTRAINT "customer_payments_received_by_user_id_fkey"
  FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments"
  ADD CONSTRAINT "customer_payments_reversed_by_user_id_fkey"
  FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "sales_payment_status_idx" ON "sales"("payment_status");
