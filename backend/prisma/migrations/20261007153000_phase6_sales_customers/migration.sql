-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'SALE_CREATED',
  'NEW_SALE',
  'PAYMENT_RECEIVED',
  'PAYMENT_PENDING',
  'SELLER_JOINED',
  'SELLER_ACTIVATED',
  'SELLER_SUSPENDED',
  'TICKET_CANCELLED',
  'DAILY_TARGET',
  'TEAM_SALE',
  'SYSTEM_ALERT'
);

-- AlterTable customers: unique mobile
CREATE UNIQUE INDEX "customers_mobile_key" ON "customers"("mobile");
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- AlterTable sales
ALTER TABLE "sales" ADD COLUMN "sale_number" TEXT;
ALTER TABLE "sales" ADD COLUMN "total_quantity" INTEGER NOT NULL DEFAULT 0;

-- Backfill sale numbers for any existing rows (none expected)
UPDATE "sales"
SET "sale_number" = 'KS-SALE-LEGACY-' || SUBSTRING(REPLACE("id"::text, '-', ''), 1, 12)
WHERE "sale_number" IS NULL;

ALTER TABLE "sales" ALTER COLUMN "sale_number" SET NOT NULL;
CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"("sale_number");
CREATE INDEX "sales_sold_at_idx" ON "sales"("sold_at");
CREATE INDEX "sales_sale_status_idx" ON "sales"("sale_status");

-- AlterTable sale_items
ALTER TABLE "sale_items" ADD COLUMN "ticket_type_id" UUID;
ALTER TABLE "sale_items" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- If any sale_items exist, backfill ticket_type_id from tickets
UPDATE "sale_items" si
SET "ticket_type_id" = t."ticket_type_id"
FROM "tickets" t
WHERE si."ticket_id" = t."id" AND si."ticket_type_id" IS NULL;

-- For empty table, allow NOT NULL after ensuring column populated
ALTER TABLE "sale_items" ALTER COLUMN "ticket_type_id" SET NOT NULL;

CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX "sale_items_ticket_type_id_idx" ON "sale_items"("ticket_type_id");

ALTER TABLE "sale_items"
  ADD CONSTRAINT "sale_items_ticket_type_id_fkey"
  FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable sale_sequences
CREATE TABLE "sale_sequences" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'SALE',
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sale_sequences_key_key" ON "sale_sequences"("key");

INSERT INTO "sale_sequences" ("id", "key", "current_number", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'SALE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_recipient_user_id_is_read_idx" ON "notifications"("recipient_user_id", "is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
