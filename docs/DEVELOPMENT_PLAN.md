# Development Plan

Build incrementally. Complete one phase, verify, document, then continue.

**Architecture source of truth:** `ARCHITECTURE_REVISION.md` (unlimited issuance).

## Phase Checklist (revised)

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project foundation | Completed |
| 2 | Database schema + seed | Completed |
| 3 | Authentication + roles | Completed |
| 4 | Seller management / hierarchy / referral | Completed |
| 5 | Unlimited ticket issuance engine + number generator | Foundation completed |
| 6 | Customers + sales + bulk issuance | Completed |
| 7 | Accounting / ledger / payments / outstanding | Completed |
| 8 | Admin + seller + finance dashboards | Completed |
| 9 | Reports (CSV/XLSX) | Pending |
| 10 | Notifications + announcements | Pending |
| 11 | Leaderboard / team performance / targets | Pending |
| 12 | Production hardening / mobile QA / deploy | Pending |

## Explicitly deferred / removed

- AI Copilot
- WhatsApp API
- Finite inventory import/assignment as primary flow
- Recruitment-based commissions

## Phase 5 foundation scope

- Ticket statuses: ISSUED / SOLD / CANCELLED / VOID
- `ticket_sequences` + concurrency-safe number generator
- Ticket type prefixes (G / V) and configurable base prices
- `GET /api/ticket-types`

## Phase 6 scope (current)

- Customer find-or-create by normalized mobile
- Sales-first bulk ticket issuance (SOLD status)
- `reserveTicketNumbers()` + `KS-SALE-######` sale numbers
- Seller `/seller/sell` mobile flow + sales list/detail
- Admin sales / ticket records / create-on-behalf
- Internal notifications + audit logs
- Dashboard sales-summary foundation (no full dashboards)
## Phase 7 scope (current)

- Seller ledger (append-only) for admin base receivable
- Customer payments + reversals
- Seller settlements via `seller_payments` + ledger credits
- Customer/seller outstanding services
- Admin receivables summary
- Idempotent accounting backfill for Phase 6 sales
- Seller finance UI + admin accounting UI
- No AI / WhatsApp / payment gateway / Phase 8 dashboards

## Gate rules

1. Financial logic stays on backend.
2. No fake sales/finance data.
3. Verify phase before continuing.
4. Wait for instruction between major phases when requested.
