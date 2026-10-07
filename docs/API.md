# API Specification

Base URL: `/api`  
Content-Type: `application/json`  
Auth: `Authorization: Bearer <accessToken>` unless noted.

## Response Envelope

### Success

```json
{
  "success": true,
  "message": "optional",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Human readable message",
  "code": "ERROR_CODE"
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.

---

## Phase 1

### GET /api/health

Public.

```json
{
  "success": true,
  "message": "Kesariya API is running"
}
```

---

## Phase 3 — Authentication

### POST /api/auth/login

Body:

```json
{
  "mobile": "9999999999",
  "password": "••••••••"
}
```

Response `data`:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "name": "...",
    "mobile": "...",
    "email": null,
    "role": "SUPER_ADMIN",
    "status": "ACTIVE"
  }
}
```

### POST /api/auth/refresh

Body:

```json
{ "refreshToken": "..." }
```

Returns new `accessToken` (+ rotated `refreshToken` when implemented).

### POST /api/auth/logout

Auth required. Body may include `refreshToken` to revoke. Invalidates refresh token.

### GET /api/auth/me

Auth required. Returns current user (+ seller profile when applicable).

---

## Phase 4 — Sellers

| Method | Path | Auth |
|--------|------|------|
| GET | `/sellers` | Admin / team-scoped sellers |
| POST | `/sellers` | SUPER_ADMIN, ADMIN |
| GET | `/sellers/me` | MASTER_SELLER, SELLER |
| PATCH | `/sellers/me` | MASTER_SELLER, SELLER |
| GET | `/sellers/referral/:sellerCode` | Public |
| POST | `/sellers/register` | Public |
| GET | `/sellers/:id` | Admin / team ownership |
| PATCH | `/sellers/:id` | SUPER_ADMIN, ADMIN |
| PATCH | `/sellers/:id/status` | SUPER_ADMIN, ADMIN |
| PATCH | `/sellers/:id/parent` | SUPER_ADMIN, ADMIN |
| GET | `/sellers/:id/team` | Admin / team ownership |
| GET | `/sellers/:id/referral-link` | Admin / team ownership |

## Phase 5 foundation — Ticket types

| Method | Path | Auth |
|--------|------|------|
| GET | `/ticket-types` | Authenticated seller/admin |

Returns active event, configurable base prices, prefixes, and issued sequence counts.

## Phase 6 — Customers + sales + tickets

| Method | Path | Auth |
|--------|------|------|
| GET | `/customers` | Admin all / seller own-sales customers |
| GET | `/customers/search?q=` | Same ownership rules |
| GET | `/customers/:id` | Same ownership rules |
| POST | `/customers` | Auth scoped |
| PATCH | `/customers/:id` | Auth scoped |
| POST | `/sales` | Seller (self) / Admin (sellerId required) |
| GET | `/sales` | Admin all / seller own; paginated |
| GET | `/sales/:id` | Ownership enforced |
| GET | `/tickets` | Admin all / seller own; paginated |
| GET | `/tickets/stats` | Auth scoped aggregates |
| GET | `/tickets/:id` | Ownership enforced |
| GET | `/dashboard/sales-summary` | Legacy today aggregates (CONFIRMED sales) |

Tickets are created only inside `POST /sales` (no public ticket-create endpoint).

## Phase 8 — Dashboards

Common query filters (where applicable): `eventId`, `eventDay` (1–10), `eventDayId`, `startDate`, `endDate`, `sellerId`, `masterSellerId`, `ticketTypeId`, `paymentStatus`, `settlementStatus`, `search`, `page`, `limit`.

Authorization is enforced server-side (seller/master IDs from JWT cannot escalate).

### Admin

| Method | Path | Notes |
|--------|------|-------|
| GET | `/dashboard/admin/summary` | Header + KPI cards |
| GET | `/dashboard/admin/daily-performance` | Day 1–10 tickets vs target + sales value |
| GET | `/dashboard/admin/target-progress` | 11,000 target, pace projection |
| GET | `/dashboard/admin/ticket-mix` | Gold vs VIP |
| GET | `/dashboard/admin/top-sellers` | Rank: tickets → sales value → sale count |
| GET | `/dashboard/admin/top-masters` | Rank: team tickets |
| GET | `/dashboard/admin/seller-performance` | Paginated table + sales contribution % |
| GET | `/dashboard/admin/payment-summary` | Sales by `paymentStatus` |
| GET | `/dashboard/admin/settlement-summary` | Sales by `settlementStatus` |
| GET | `/dashboard/admin/recent-sales` | Latest sales |
| GET | `/dashboard/admin/recent-payments` | Customer + seller payments |
| GET | `/dashboard/admin/event-pulse` | Live day pulse |
| GET | `/dashboard/admin/outstanding-alerts` | Needs Attention lists |
| GET | `/dashboard/admin/event-health` | ON_TRACK / WATCH / ATTENTION |

### Seller / Master

| Method | Path | Auth |
|--------|------|------|
| GET | `/dashboard/seller/summary` | MASTER_SELLER, SELLER |
| GET | `/dashboard/seller/daily-performance` | Same |
| GET | `/dashboard/seller/ticket-mix` | Same |
| GET | `/dashboard/seller/recent-sales` | Same |
| GET | `/dashboard/seller/finance` | Same (uses Phase 7 ledger for outstanding) |
| GET | `/dashboard/master/summary` | MASTER_SELLER only |
| GET | `/dashboard/master/team-performance` | MASTER_SELLER only (own team) |

## Phase 7 — Accounting

| Method | Path | Auth |
|--------|------|------|
| POST | `/customer-payments` | Seller (own sales) / Admin |
| GET | `/customer-payments` | Scoped |
| GET | `/customer-payments/:id` | Scoped |
| POST | `/customer-payments/:id/reverse` | Scoped |
| POST | `/seller-payments` | Seller (self) / Admin (sellerId) |
| GET | `/seller-payments` | Scoped |
| GET | `/seller-payments/:id` | Scoped |
| POST | `/seller-payments/:id/reverse` | Scoped |
| GET | `/accounting/sellers/:sellerId/summary` | Own / Admin |
| GET | `/accounting/sellers/:sellerId/ledger` | Own / Admin |
| GET | `/accounting/customers/:customerId/summary` | Scoped |
| GET | `/accounting/sales/:saleId/summary` | Scoped |
| GET | `/accounting/receivables` | Admin |
| GET | `/accounting/summary` | Admin |
| GET | `/accounting/sellers` | Admin |
| POST | `/accounting/backfill` | Admin (idempotent) |

## Planned Endpoints (later phases)

| Method | Path | Phase | Roles |
|--------|------|-------|-------|
| GET | `/leaderboard` | 11 | Auth scoped |
| GET | `/reports/*` | 9 | Admin+ |

---

## Middleware Contract

| Middleware | Behavior |
|------------|----------|
| `requireAuth` | Validates access JWT; attaches `req.user` |
| `requireRole(...roles)` | Rejects if role not allowed |
| `requireSellerOwnership` | Ensures seller resource belongs to caller or admin |

Frontend protected routes are UX only; every sensitive endpoint enforces authz on the backend.
