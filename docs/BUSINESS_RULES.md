# Business Rules

## Event

- Event name: Kesariya Navratri 4.0
- Dates: 11 Oct 2026 – 20 Oct 2026
- Venue: Kesariya AC Dome, VIP Road, Vesu, Surat
- Daily ticket target: configurable via `events.daily_target` (seed default **1,100**)
- Ticket types: **GOLD**, **VIP**
- Default base price: **₹400** each (configurable via `ticket_types.base_price`)

## Unlimited issuance

Tickets are **not** limited by software inventory.

Never block a valid sale due to a stock counter reaching zero.

Every issued ticket still requires a **unique ticket number**.

## Hierarchy

```text
Admin / Super Admin (ops roles — not seller tree nodes)
  → Master Seller
    → Seller
      → Customer (CRM record)
```

- `parent_seller_id` stores referral/parent relationship.
- Circular hierarchy is forbidden.
- `/seller/join/:sellerCode` sets parent server-side from referral code.
- Incentives require legitimate ticket sales, not recruitment alone.

## Pricing & margin

```text
gross_margin = customer_selling_price - base_price
admin_receivable = base_price (per ticket)
```

- Base price from `ticket_types` (snapshotted on sale items).
- Backend is source of truth for all financial calculations.
- Never trust client-submitted profit/base/totals.

## Ticket lifecycle

```text
Sale confirm → ISSUED + SOLD (atomic create)
SOLD → CANCELLED
SOLD → VOID
```

Hard rules:

1. Ticket numbers globally unique (`KSR-G-######` / `KSR-V-######`).
2. Numbers generated server-side via `ticket_sequences` + row lock.
3. Never reuse a sold ticket number.
4. Never hard-delete tickets/sales/financial history.
5. Cancellation/refund creates reversal/audit records.

## Concurrent issuance

Two concurrent sales must never receive the same ticket numbers.
Use transaction + `SELECT … FOR UPDATE` on `ticket_sequences`.

## Sales transaction (Phase 6+)

```text
BEGIN
  Validate seller / customer / type / price
  Reserve ticket numbers (locked sequence)
  Create customer
  Create tickets (SOLD)
  Create sale + sale_items
  Create ledger / payment records as applicable
  Notifications + audit
COMMIT / ROLLBACK
```

## Accounting separation

| Track | Status enum (DB) | Meaning |
|-------|------------------|---------|
| Customer payment | PENDING / PARTIAL / PAID / OVERPAID / REFUNDED | Money from customer vs sale total |
| Seller settlement | PENDING / PARTIAL / PAID / ADJUSTED | Seller→admin base receivable settlement |

These tracks are **independent**. Customer can be PAID while seller is still PENDING.

### Ledger sign convention (seller → admin)

Append-only `seller_ledger_entries`:

| Entry | Direction | Effect |
|-------|-----------|--------|
| SALE_DEBIT | DEBIT | +baseAmount owed to admin |
| PAYMENT_CREDIT | CREDIT | −seller settlement paid |
| REVERSAL_DEBIT | DEBIT | undoes a payment credit |

Amounts are always stored positive; direction carries the sign.

```text
seller_outstanding = Σ(DEBIT) − Σ(CREDIT)
                  = total_confirmed_base − recorded_seller_payments (± adjustments)
```

### Worked example

Base ₹400, customer price ₹799, margin ₹399.

1. Sale created → SALE_DEBIT ₹400 (seller owes admin ₹400). Margin ₹399 is informational (from `sales.seller_profit`), not a ledger liability.
2. Customer pays ₹300 → customer outstanding ₹499; seller outstanding unchanged (still ₹400).
3. Seller settles ₹200 → PAYMENT_CREDIT ₹200; seller outstanding ₹200.
4. Reverse settlement → REVERSAL_DEBIT ₹200; seller outstanding back to ₹400.

### Customer payments

```text
customer_paid = Σ(RECORDED customer_payments)
customer_outstanding = sale_total − customer_paid
```

Overpayment is rejected. Reversals set status `REVERSED` (no hard delete).

## Authorization

| Actor | Access |
|-------|--------|
| SUPER_ADMIN / ADMIN | All operational data |
| MASTER_SELLER / SELLER | Own data + authorized team |
| Public | Referral join only |

## Phase 8 — Dashboard rules

- Metrics use **CONFIRMED** sales only (pending approvals excluded).
- Event target = `dailyTarget × 10` (default 1,100 × 10 = 11,000).
- Top sellers: primary = tickets sold; secondary = sales value; tie-break = sale count.
- “Sales contribution %” = seller tickets / filtered total tickets (not a per-seller target).
- Pace projection = (tickets / elapsed event days) × 10 — labeled **Current pace projection**, not a guarantee.
- Event health: ON_TRACK / WATCH / ATTENTION from daily/event achievement, collection ratio, active sellers today.
- Seller settlements are lifetime ledger-based; day filter hides settlement totals when day-scoped (not day-attributed).

## Explicit non-goals

AI Copilot, WhatsApp API, finite inventory exhaustion, recruitment commissions, fake finance.
