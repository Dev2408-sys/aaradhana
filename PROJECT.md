# Kesariya 4.0 Seller OS

## 1. Project Overview

Kesariya 4.0 Seller OS is a smart ticket reseller and seller-community management platform for Kesariya Navratri 4.0.

The platform manages:

- Seller registration and authentication
- Master seller / seller hierarchy
- Ticket inventory
- Gold and VIP ticket management
- Ticket assignment
- Customer management
- Ticket sales
- Seller margins
- Payment collection
- Pending settlements
- Seller team performance
- Daily sales targets
- Leaderboards
- Excel import/export
- WhatsApp-ready notifications
- Admin analytics
- AI-powered operational assistance

The primary objective is to enable a distributed seller network to sell and manage Kesariya tickets efficiently.

---

# 2. Business Objective

Event:

Kesariya Navratri 4.0

Dates:

11 October 2026 – 20 October 2026

Location:

Kesariya AC Dome, VIP Road, Vesu, Surat

Primary sales target:

1,100 tickets/day

Ticket zones:

- Gold
- VIP

Base seller allocation price:

₹400 per ticket

The actual selling price may be higher than the base allocation price according to the event's approved pricing rules.

Seller earnings:

Selling Price - Base Price = Seller Gross Margin

Example:

Base price = ₹400
Customer selling price = ₹799

Seller gross margin = ₹399

All pricing, discounts, incentives and settlement rules must be configurable from Admin.

---

# 3. Core Business Model

The platform supports a seller hierarchy.

Example:

Admin
│
├── Master Seller A
│   ├── Seller A1
│   ├── Seller A2
│   └── Seller A3
│
├── Master Seller B
│   ├── Seller B1
│   └── Seller B2
│
└── Master Seller C

The system must track:

- Who recruited whom
- Direct seller
- Parent seller
- Seller level
- Team size
- Team sales
- Direct sales
- Total team sales

Important:

Rewards/incentives must be tied to legitimate ticket sales rather than merely recruiting people.

---

# 4. User Roles

## 4.1 Super Admin

Full system access.

Can:

- Manage admins
- Manage sellers
- Manage hierarchy
- Import tickets
- Allocate tickets
- Change ticket status
- View all customers
- View all sales
- Manage payments
- Configure pricing
- Configure incentives
- View analytics
- Export reports
- Manage event settings
- View audit logs

---

## 4.2 Admin / Operations

Can:

- Manage sellers
- Manage customers
- Manage tickets
- Manage sales
- Record payments
- View reports
- Export Excel
- Send notifications

Cannot modify critical system configuration unless permission is granted.

---

## 4.3 Master Seller

Can:

- View own dashboard
- View own tickets
- Sell tickets
- Add customers
- View own sales
- View own profit
- Invite sellers
- View direct team
- View eligible team performance
- View leaderboard

Cannot:

- View unrelated sellers
- Modify ticket base price
- Modify another seller's customers
- Modify system settings
- Access admin functions

---

## 4.4 Seller

Can:

- Login
- View assigned tickets
- Sell tickets
- Add customer
- View sales
- View profit
- View own ticket status
- Generate/share referral link
- View basic team information if eligible

---

# 5. Frontend Technology

Use:

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- shadcn/ui or equivalent reusable component system
- TanStack Query
- React Hook Form
- Zod
- Axios
- Recharts
- Lucide Icons

Frontend principles:

- Mobile-first
- Fast
- Responsive
- Clean
- Professional
- Low visual clutter
- Reusable components
- Loading states
- Empty states
- Error states
- Toast notifications
- Skeleton loaders

Brand direction:

Primary:

- Navy / deep blue
- Orange
- White
- Light grey

Do not make the dashboard visually heavy.

---

# 6. Backend Technology

Use:

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcrypt/argon2 password hashing
- Zod validation
- Helmet
- CORS
- Rate limiting
- Structured logging

Backend architecture:

```text
src/
  config/
  controllers/
  services/
  repositories/
  routes/
  middleware/
  validators/
  utils/
  jobs/
  integrations/
  ai/
  types/
  app.ts
  server.ts
```

Business logic must live primarily inside services, not directly inside route handlers.

---

# 7. Database

Use PostgreSQL.

Recommended major tables:

## users

- id
- name
- mobile
- email
- password_hash
- role
- status
- created_at
- updated_at
- last_login_at

Roles:

- SUPER_ADMIN
- ADMIN
- MASTER_SELLER
- SELLER

---

## seller_profiles

- id
- user_id
- seller_code
- parent_seller_id
- level
- city
- area
- instagram_handle
- expected_sales
- activation_status
- joined_at

Hierarchy must use parent_seller_id.

---

## events

- id
- name
- slug
- start_date
- end_date
- venue
- status
- created_at

---

## ticket_types

- id
- event_id
- name
- code
- base_price
- minimum_price
- active

Examples:

GOLD
VIP

---

## tickets

Every physical/digital ticket must have a unique record.

Fields:

- id
- ticket_number
- ticket_type_id
- event_id
- status
- assigned_seller_id
- customer_id
- sale_id
- imported_at
- sold_at
- created_at
- updated_at

Ticket status:

AVAILABLE
RESERVED
ASSIGNED
SOLD
CANCELLED
BLOCKED

Never delete tickets after creation.

---

# 8. Customers

customers:

- id
- name
- mobile
- email
- city
- notes
- created_at
- updated_at

A customer can have multiple tickets.

---

# 9. Sales

sales:

- id
- seller_id
- customer_id
- event_id
- total_amount
- base_amount
- seller_profit
- payment_status
- sale_status
- sold_at
- created_at

Statuses:

Payment:

PENDING
PARTIAL
PAID
REFUNDED

Sale:

PENDING
CONFIRMED
CANCELLED
REFUNDED

---

# 10. Sale Items

sale_items:

- id
- sale_id
- ticket_id
- selling_price
- base_price
- seller_profit

This allows one sale to contain multiple tickets.

Example:

Customer buys:

3 Gold
2 VIP

One sale can contain 5 ticket items.

---

# 11. Seller Payments / Settlements

seller_payments:

- id
- seller_id
- amount
- payment_method
- transaction_reference
- payment_date
- notes
- recorded_by
- created_at

Seller outstanding calculation:

Total Base Amount
- Payments Received
= Outstanding Amount

---

# 12. Seller Incentives

seller_incentives:

- id
- seller_id
- sale_id
- incentive_type
- amount
- status
- description
- created_at

Incentives must only be generated from valid ticket sales.

---

# 13. Seller Hierarchy

Every seller except top-level sellers can optionally have:

parent_seller_id

Example:

Raj
parent = null

Amit
parent = Raj

Jay
parent = Amit

The system must support recursive team queries.

Need:

- direct team
- full downline
- team ticket sales
- team revenue
- team seller count

For performance, use PostgreSQL recursive queries or a materialized path strategy if required later.

Do not over-engineer hierarchy for MVP.

---

# 14. Ticket Lifecycle

Ticket lifecycle:

```text
AVAILABLE
   ↓
RESERVED
   ↓
ASSIGNED
   ↓
SOLD
```

Alternative:

```text
AVAILABLE → ASSIGNED → AVAILABLE
```

if an assigned ticket is released before sale.

Final:

```text
SOLD
```

must never be casually reverted.

Cancellation/refund should create an auditable state transition.

---

# 15. Ticket Assignment

Admin can assign tickets to sellers.

Example:

Seller Raj requests:

Gold = 10
VIP = 5

System selects available tickets and assigns:

15 tickets.

All assignments must be recorded.

Create ticket_assignment_history:

- ticket_id
- from_seller_id
- to_seller_id
- action
- performed_by
- created_at

---

# 16. Selling Flow

Seller:

1. Login
2. Click "Sell Ticket"
3. Select ticket(s)
4. Enter customer
5. Enter selling price
6. Review margin
7. Confirm sale
8. Ticket becomes SOLD
9. Customer record created/updated
10. Seller profit calculated
11. Notification generated
12. Audit event created

Example:

Base = ₹400

Selling = ₹799

Profit = ₹399

Formula:

seller_profit = selling_price - base_price

All financial calculations must be performed server-side.

Never trust frontend-calculated amounts.

---

# 17. Seller Dashboard

Show:

- Today's sales
- Today's tickets
- Total tickets sold
- Gold sold
- VIP sold
- Today's profit
- Total profit
- Pending settlement
- Team size
- Team sales
- Current rank

Example:

```text
Good Morning Raj 👋

Today's Sales
12 Tickets

Today's Profit
₹4,788

Total Sales
84 Tickets

Pending Settlement
₹8,400
```

---

# 18. Admin Dashboard

Main KPIs:

- Today's target
- Today's sold
- Remaining target
- Gold sold
- VIP sold
- Total sales value
- Base collection
- Seller profit
- Pending collection
- Active sellers
- New sellers
- Team sales
- Conversion metrics

Target:

1,100/day

Progress bar:

Sold / Target × 100

---

# 19. Live Sales Board

Admin can view:

```text
Target: 1100
Sold: 782
Remaining: 318
Achievement: 71.1%
```

Top sellers:

1. Raj
2. Priyal
3. Jay
4. Karan
5. Dhruv

Top teams:

1. Raj Team
2. Jay Team
3. Amit Team

---

# 20. Seller Leaderboard

Filters:

- Today
- Yesterday
- This week
- Total
- Gold
- VIP
- Team sales

Leaderboard fields:

- Rank
- Seller
- Tickets
- Revenue
- Profit
- Team Sales

Do not expose sensitive financial data to sellers unless permitted.

---

# 21. Excel Import

Admin can upload ticket Excel/CSV.

Expected columns:

Ticket Number
Zone
Date
Status

Import process:

1. Upload
2. Validate
3. Preview
4. Detect duplicates
5. Detect invalid zones
6. Confirm import
7. Insert valid tickets
8. Generate import report

Never directly insert unvalidated spreadsheet rows.

---

# 22. Excel Export

Exports:

### Seller Report

- Seller
- Parent
- Level
- Tickets
- Gold
- VIP
- Revenue
- Base Amount
- Profit
- Paid
- Pending

### Customer Report

- Customer
- Mobile
- Seller
- Ticket
- Zone
- Selling Price
- Payment
- Date

### Ticket Report

- Ticket Number
- Zone
- Seller
- Customer
- Status
- Sale Date

### Daily Sales Report

One row per date.

---

# 23. WhatsApp Integration

MVP:

Generate WhatsApp-ready message links.

Later:

Integrate official WhatsApp Business API provider.

Customer message:

```text
Hello {customerName},

Your Kesariya Navratri 4.0 ticket is confirmed.

Ticket: {ticketNumber}
Zone: {zone}
Date: {eventDate}

Thank you for choosing Kesariya.
```

Seller message:

```text
Your ticket sale has been confirmed.

Ticket: {ticketNumber}
Customer: {customerName}
Sale Price: ₹{amount}
Your Profit: ₹{profit}
```

Do not build unofficial WhatsApp automation that risks account bans.

---

# 24. AI Layer

AI should assist operations, not control critical financial operations.

AI modules:

## AI Admin Copilot

Examples:

"How many tickets did we sell today?"

"Which sellers are falling behind?"

"Who are my top 10 sellers?"

"Which team needs attention?"

"What is today's pending collection?"

"Give me today's sales summary."

AI must call backend tools/functions to retrieve real data.

Never let the LLM invent database values.

---

## AI Seller Copilot

Seller can ask:

"How many tickets did I sell today?"

"What should I sell to my customers?"

"Give me a WhatsApp pitch."

"Write an Instagram story."

"Who are my top team members?"

"How much profit did I make?"

---

## AI Daily Summary

Admin can request:

- sales summary
- target achievement
- weak sellers
- top sellers
- pending payments
- ticket inventory warning
- recommended actions

---

# 25. AI Tool Architecture

Create internal tools:

get_today_sales
get_seller_sales
get_team_sales
get_ticket_inventory
get_pending_payments
get_top_sellers
get_seller_performance
get_event_summary
generate_seller_message
generate_customer_message

AI can only use authorized tools.

Role-based data access must be enforced server-side.

---

# 26. Authentication

Use:

Access Token
Refresh Token

Passwords hashed.

Protected routes.

Role-based middleware:

requireAuth()
requireRole()
requireSellerAccess()

Never rely on frontend route protection alone.

---

# 27. Audit Logs

Every important operation:

- Login
- Ticket import
- Ticket assignment
- Ticket sale
- Payment entry
- Ticket cancellation
- Seller creation
- Seller status change
- Price configuration
- Admin changes

audit_logs:

- id
- user_id
- action
- entity_type
- entity_id
- old_value
- new_value
- metadata
- ip_address
- created_at

---

# 28. Frontend Pages

## Public

/  
/login  
/seller/register  
/seller/join/:referralCode

---

## Seller

/seller/dashboard
/seller/tickets
/seller/sell
/seller/customers
/seller/sales
/seller/team
/seller/leaderboard
/seller/profile
/seller/ai

---

## Admin

/admin/dashboard
/admin/sellers
/admin/sellers/:id
/admin/tickets
/admin/tickets/import
/admin/customers
/admin/sales
/admin/payments
/admin/reports
/admin/leaderboard
/admin/settings
/admin/audit-logs
/admin/ai

---

# 29. UI/UX Requirements

The application should feel like a modern SaaS dashboard.

Desktop:

Sidebar + top header + content.

Mobile:

Bottom navigation or collapsible navigation.

Seller mobile UI is very important because sellers will primarily use phones.

Primary CTA:

"Sell Ticket"

should always be easy to reach.

Use:

- cards
- tables
- charts
- badges
- progress indicators
- drawers
- modals
- confirmation dialogs
- skeleton loaders
- toast notifications

Avoid:

- excessive gradients
- huge cards
- unnecessary animations
- slow pages
- complex navigation

---

# 30. API Structure

Example:

POST /api/auth/login

GET /api/dashboard/admin

GET /api/dashboard/seller

GET /api/sellers

POST /api/sellers

GET /api/sellers/:id

GET /api/sellers/:id/team

GET /api/tickets

POST /api/tickets/import

POST /api/tickets/assign

POST /api/sales

GET /api/sales

GET /api/customers

POST /api/customers

GET /api/payments

POST /api/payments

GET /api/reports/sellers

GET /api/reports/sales

GET /api/leaderboard

GET /api/ai/summary

POST /api/ai/chat

---

# 31. Important Business Rules

1. Ticket numbers must be unique.
2. A SOLD ticket cannot be sold again.
3. Financial calculations happen on backend.
4. Seller cannot access another seller's private data.
5. Admin can access all data.
6. Every ticket state transition is auditable.
7. Every payment is auditable.
8. Every sale must reference a valid seller.
9. Every sale must reference valid ticket(s).
10. Ticket allocation must use database transactions.
11. Concurrent sales must not create duplicate ticket sales.
12. Duplicate customer mobile numbers should be handled safely.
13. Refund/cancellation must not silently delete records.
14. Base price must be configurable.
15. Event dates must be configurable.
16. AI cannot invent financial numbers.
17. AI cannot directly mutate financial records without explicit authorized backend actions.
18. All sensitive endpoints require authentication.

---

# 32. Transaction Safety

Ticket sale must use a PostgreSQL transaction.

Pseudo flow:

BEGIN

Lock selected tickets

Verify ticket status

Create/update customer

Create sale

Create sale items

Update ticket status to SOLD

Calculate seller profit

Create audit log

COMMIT

If any operation fails:

ROLLBACK

This is mandatory.

---

# 33. MVP Priority

## P0 — Must work before launch

- Authentication
- Roles
- Seller creation
- Seller hierarchy
- Ticket import
- Ticket inventory
- Ticket assignment
- Ticket sale
- Customer management
- Payment tracking
- Seller profit
- Admin dashboard
- Seller dashboard
- Excel export
- Audit logs

## P1

- Leaderboard
- Referral links
- Team dashboard
- WhatsApp-ready notifications
- AI admin assistant
- AI seller assistant

## P2

- WhatsApp Business API
- Advanced analytics
- Advanced incentive engine
- Automated reports
- Advanced AI recommendations
- PWA/mobile optimization

---

# 34. Development Order

Do NOT build randomly.

Build in this order:

Phase 1:
Project setup

Phase 2:
Database schema + migrations

Phase 3:
Authentication + roles

Phase 4:
Seller management + hierarchy

Phase 5:
Ticket inventory

Phase 6:
Ticket assignment

Phase 7:
Customer + sales

Phase 8:
Payment + profit

Phase 9:
Admin dashboard

Phase 10:
Seller dashboard

Phase 11:
Excel import/export

Phase 12:
Leaderboard/team

Phase 13:
Notifications

Phase 14:
AI layer

Phase 15:
Testing + security + deployment

---

# 35. Definition of Done

The system is considered MVP-ready only when:

- Admin can create seller
- Seller can login
- Admin can import tickets
- Admin can assign tickets
- Seller can sell a ticket
- Customer is stored
- Ticket becomes SOLD
- Duplicate sale is impossible
- Seller profit is calculated correctly
- Payment is tracked
- Admin sees sale instantly
- Seller sees sale instantly
- Reports export correctly
- Hierarchy works
- Audit logs work
- Role restrictions work
- Error handling works
- Mobile seller flow works
- Production database migrations work

Only after this should advanced AI features be expanded.