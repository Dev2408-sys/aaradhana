# Database Design

## 1. Engine

PostgreSQL via Prisma ORM. All IDs are UUID (`String @id @default(uuid())`).

## 2. Enums

| Enum | Values |
|------|--------|
| `UserRole` | SUPER_ADMIN, ADMIN, MASTER_SELLER, SELLER |
| `UserStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `SellerActivationStatus` | PENDING, ACTIVE, INACTIVE, SUSPENDED |
| `EventStatus` | DRAFT, ACTIVE, COMPLETED, CANCELLED |
| `TicketStatus` | ISSUED, SOLD, CANCELLED, VOID |
| `PaymentStatus` | PENDING, PARTIAL, PAID, REFUNDED (customer) |
| `SellerSettlementStatus` | PENDING, PARTIAL, PAID, ADJUSTED (seller→admin) |
| `SaleStatus` | PENDING, CONFIRMED, CANCELLED, REFUNDED |
| `IncentiveStatus` | PENDING, APPROVED, PAID, CANCELLED |
| `AssignmentAction` | ASSIGN, UNASSIGN, REASSIGN, RELEASE (legacy; not primary flow) |

## 3. Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | String | |
| mobile | String | unique, indexed |
| email | String? | unique, indexed |
| password_hash | String | |
| role | UserRole | |
| status | UserStatus | default ACTIVE |
| last_login_at | DateTime? | |
| created_at / updated_at | DateTime | |

### seller_profiles

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | unique |
| seller_code | String | unique, indexed |
| parent_seller_id | UUID? FK → seller_profiles | indexed |
| level | Int | hierarchy depth |
| city / area | String? | |
| instagram_handle | String? | |
| expected_sales | Int? | |
| activation_status | SellerActivationStatus | |
| joined_at | DateTime | |

Circular parent chains are forbidden at the service layer.

### events

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name / slug | String | slug unique |
| start_date / end_date | DateTime | |
| venue | String | |
| daily_target | Int | default 1100 |
| status | EventStatus | |
| created_at / updated_at | DateTime | |

### ticket_types

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_id | UUID FK → events | |
| name / code | String | code unique per event |
| number_prefix | String | e.g. G / V for ticket numbers |
| base_price | Decimal | configurable; seed default 400.00 |
| minimum_price | Decimal? | |
| active | Boolean | |

### ticket_sequences

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_id | UUID FK | |
| ticket_type_id | UUID FK | unique with event_id |
| current_number | Int | last issued sequence; row-locked on issue |

### tickets

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| ticket_number | String | **unique**, indexed (`KSR-G-000001`) |
| ticket_type_id | UUID FK | |
| event_id | UUID FK | |
| zone | String? | |
| event_date | DateTime? | |
| status | TicketStatus | ISSUED / SOLD / CANCELLED / VOID |
| seller_id | UUID? FK → seller_profiles | selling seller |
| customer_id | UUID? FK → customers | |
| sale_id | UUID? FK → sales | |
| issued_at / sold_at | DateTime? | |
| created_at / updated_at | DateTime | |

Unlimited issuance — no AVAILABLE stock pool. Never hard-delete tickets.

### customers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | String | indexed |
| mobile | String | **unique**, indexed (normalized) |
| email / city / notes | String? | |
| created_at / updated_at | DateTime | |

### sales

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sale_number | String | **unique**, `KS-SALE-000001` |
| seller_id | UUID FK → seller_profiles | indexed |
| customer_id | UUID FK → customers | indexed |
| event_id | UUID FK → events | |
| total_quantity | Int | ticket count |
| total_amount | Decimal | customer selling sum |
| base_amount | Decimal | base sum |
| seller_profit | Decimal | total − base (gross margin) |
| payment_status | PaymentStatus | Phase 6: PENDING/PAID input only (customer) |
| settlement_status | SellerSettlementStatus | preserved for Phase 7 |
| sale_status | SaleStatus | CONFIRMED / CANCELLED / REFUNDED |
| sold_at / created_at / updated_at | DateTime | sold_at indexed |

### sale_items

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sale_id | UUID FK → sales | indexed |
| ticket_id | UUID FK → tickets | **unique** (one sale ownership) |
| ticket_type_id | UUID FK → ticket_types | |
| selling_price / base_price / seller_profit | Decimal | per ticket |
| created_at | DateTime | |

### sale_sequences

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| key | String | unique, default `SALE` |
| current_number | Int | row-locked on reserve |

### notifications

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| recipient_user_id | UUID FK → users | |
| type | NotificationType | e.g. SALE_CREATED, NEW_SALE |
| title / message | String | |
| entity_type / entity_id | String? | |
| is_read | Boolean | |
| created_at | DateTime | |

### seller_payments

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| seller_id | UUID FK | |
| amount | Decimal | |
| payment_method | PaymentMethod | CASH/UPI/BANK_TRANSFER/CARD/OTHER |
| transaction_reference | String? | |
| idempotency_key | String? | unique |
| payment_date | DateTime | |
| notes | String? | |
| status | FinancialRecordStatus | RECORDED / REVERSED |
| recorded_by | UUID FK → users | |
| reversed_at / reversed_by_user_id | | soft reverse |
| created_at / updated_at | DateTime | |

Never delete payment rows.

### seller_ledger_entries

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| seller_id | UUID FK | |
| sale_id / seller_payment_id | UUID? FK | |
| entry_type | LedgerEntryType | SALE_DEBIT, PAYMENT_CREDIT, … |
| direction | DEBIT / CREDIT | |
| amount | Decimal | always positive |
| balance_after | Decimal? | outstanding after entry |
| reference | String | **unique** idempotency key |
| description | String | |
| created_by_user_id | UUID FK | |
| created_at | DateTime | |

### customer_payments

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| customer_id / sale_id | UUID FK | |
| amount | Decimal | |
| payment_method | PaymentMethod | |
| payment_reference | String? | |
| idempotency_key | String? | unique |
| status | FinancialRecordStatus | |
| received_by_user_id | UUID FK | |
| reversed_at / reversed_by_user_id | | |
| created_at / updated_at | DateTime | |

### seller_incentives

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| seller_id | UUID FK | |
| sale_id | UUID? FK | |
| incentive_type | String | |
| amount | Decimal | |
| status | IncentiveStatus | |
| description | String? | |
| created_at | DateTime | |

### ticket_assignment_history

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| ticket_id | UUID FK | |
| from_seller_id / to_seller_id | UUID? FK | |
| action | AssignmentAction | |
| performed_by | UUID FK → users | |
| created_at | DateTime | |

### audit_logs

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID? FK → users | |
| action | String | |
| entity_type / entity_id | String | |
| old_value / new_value | Json? | |
| metadata | Json? | |
| ip_address | String? | |
| created_at | DateTime | |

### refresh_tokens (auth support)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| token_hash | String | unique |
| expires_at | DateTime | |
| revoked_at | DateTime? | |
| created_at | DateTime | |

## 4. Required Indexes

- `users.mobile`, `users.email`
- `seller_profiles.seller_code`, `seller_profiles.parent_seller_id`
- `tickets.ticket_number`, `tickets.status`, `tickets.assigned_seller_id`
- `sales.seller_id`, `sales.customer_id`, `sales.created_at`
- `customers.mobile`

## 5. Seed Data (Phase 2)

| Entity | Detail |
|--------|--------|
| Super Admin | mobile `9999999999`, role SUPER_ADMIN |
| Admin | mobile `8888888888`, role ADMIN |
| Master Seller | one profile + user |
| Sellers | two under the master seller |
| Event | Kesariya Navratri 4.0 |
| Ticket types | GOLD, VIP (base ₹400) |

No fake sales unless explicitly marked as development seed later.

## 6. Migration Impact Policy

Before any schema change: document added/altered/dropped columns, data backfill needs, and downtime risk. Prefer additive migrations for financial tables.
