# Master Architecture Revision — Unlimited Issuance

This document supersedes earlier finite-inventory assumptions.

## Core model

Kesariya Seller OS issues tickets **without a finite inventory ceiling**.

The system must never block a valid sale because a software stock count reached zero.

Primary purposes:

1. Ticket issuance with unique numbers  
2. Seller network / hierarchy  
3. Sales + accounting (ledger, receivables, settlements)  
4. Ops dashboards, reports, notifications, audit  

## Ticket lifecycle (current)

```text
Sale confirm → ISSUED + SOLD (atomic)
SOLD → CANCELLED
SOLD → VOID
```

Deprecated as primary inventory states:

- AVAILABLE
- RESERVED
- ASSIGNED

## Ticket numbers

Server-generated, concurrency-safe via `ticket_sequences` + row lock:

- GOLD: `KSR-G-000001`
- VIP: `KSR-V-000001`

Unique DB constraint on `tickets.ticket_number`.

## Accounting separation

| Concept | Meaning |
|---------|---------|
| Customer selling amount | What customer pays |
| Base amount | Admin receivable from seller |
| Seller margin | selling − base |
| Seller settlement | Paid vs outstanding base |

Customer payment status ≠ seller settlement status.

## Explicit non-goals

- AI Copilot  
- WhatsApp API / unofficial automation  
- Finite stock exhaustion  
- Recruitment-based commissions  
- Fake sales / fake finance  

## Phase order (revised)

| Phase | Scope |
|-------|-------|
| 4 | Seller management (done) |
| 5 | Unlimited issuance engine + ticket numbers + lifecycle |
| 6 | Customers + sales + bulk issuance |
| 7 | Ledger + payments + outstanding |
| 8 | Dashboards |
| 9 | Reports |
| 10 | Notifications |
| 11 | Leaderboard / targets |
| 12 | Hardening / mobile QA / deploy |
