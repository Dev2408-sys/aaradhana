-- CreateEnum
CREATE TYPE "SellerSettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'ADJUSTED');

-- AlterEnum TicketStatus: ISSUED, SOLD, CANCELLED, VOID
CREATE TYPE "TicketStatus_new" AS ENUM ('ISSUED', 'SOLD', 'CANCELLED', 'VOID');

ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "tickets"
  ALTER COLUMN "status" TYPE "TicketStatus_new"
  USING (
    CASE "status"::text
      WHEN 'SOLD' THEN 'SOLD'::"TicketStatus_new"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"TicketStatus_new"
      WHEN 'BLOCKED' THEN 'VOID'::"TicketStatus_new"
      ELSE 'ISSUED'::"TicketStatus_new"
    END
  );

DROP TYPE "TicketStatus";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";

ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'ISSUED';

-- TicketType.number_prefix
ALTER TABLE "ticket_types" ADD COLUMN "number_prefix" TEXT NOT NULL DEFAULT 'X';

UPDATE "ticket_types" SET "number_prefix" = 'G' WHERE "code" = 'GOLD';
UPDATE "ticket_types" SET "number_prefix" = 'V' WHERE "code" = 'VIP';

-- Rename assigned_seller_id → seller_id
ALTER TABLE "tickets" RENAME COLUMN "assigned_seller_id" TO "seller_id";

-- Replace imported_at with issued_at
ALTER TABLE "tickets" RENAME COLUMN "imported_at" TO "issued_at";

-- Sales.settlement_status
ALTER TABLE "sales" ADD COLUMN "settlement_status" "SellerSettlementStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable ticket_sequences
CREATE TABLE "ticket_sequences" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_sequences_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "tickets_seller_id_idx" ON "tickets"("seller_id");
CREATE INDEX "tickets_event_id_ticket_type_id_idx" ON "tickets"("event_id", "ticket_type_id");
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at");
CREATE INDEX "sales_settlement_status_idx" ON "sales"("settlement_status");
CREATE INDEX "ticket_sequences_ticket_type_id_idx" ON "ticket_sequences"("ticket_type_id");

CREATE UNIQUE INDEX "ticket_sequences_event_id_ticket_type_id_key" ON "ticket_sequences"("event_id", "ticket_type_id");

-- Drop old assigned seller index name if present and recreate seller FK/index naming
DROP INDEX IF EXISTS "tickets_assigned_seller_id_idx";

-- Foreign keys for ticket_sequences
ALTER TABLE "ticket_sequences" ADD CONSTRAINT "ticket_sequences_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_sequences" ADD CONSTRAINT "ticket_sequences_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
