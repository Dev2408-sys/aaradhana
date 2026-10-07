# Kesariya 4.0 Seller OS — Current System State (AI Handoff)

**Purpose:** This document describes what is **actually built and running today** (as of Oct 2026). Use this for AI analysis, reviews, and next-feature design. Prefer this over the original `PROJECT.md` vision where they conflict.

**Related docs:**
- `PROJECT.md` — original full vision (includes deferred items)
- `docs/ARCHITECTURE_REVISION.md` — unlimited ticket issuance model
- `docs/DEMO_CREDENTIALS.md` — demo logins
- `docs/DEVELOPMENT_PLAN.md` — phase checklist (partially outdated after seller UX simplification)

---

## 1. Product in one paragraph

Kesariya 4.0 Seller OS is a **ticket booking + seller network** app for **Kesariya Navratri 4.0** (11–20 Oct 2026, Surat). Sellers book Gold/VIP tickets for customers, **pay admin base amount via UPI/QR**, upload a **payment screenshot with the booking**, and wait for **admin approval**. Admin verifies the screenshot, approves only if payment is **PAID**, then marks tickets as sent (manual WhatsApp — no WhatsApp API). Admin keeps full accounting/ledger tools; **sellers do not see finance/ledger**.

---

## 2. Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, Vite 8, TypeScript, React Router 7, TanStack Query, Tailwind CSS 4, Lucide, Recharts (admin dashboards) |
| Backend | Node.js, Express, TypeScript, Zod validation, JWT auth, Pino logging |
| DB | PostgreSQL + Prisma 6 |
| Uploads | Multer → local `backend/uploads/` served at `/uploads` |
| QR | `qrcode` package generates UPI deep-link QR; optional custom QR image upload |
| Tests | Vitest + Supertest (backend) |

**Local URLs**
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/api`
- Static uploads: `http://localhost:4000/uploads/...`

**Timezone:** Business days / “today” use Asia/Kolkata where dashboards apply.

---

## 3. Roles

| Role | App surface | Main job |
|------|-------------|----------|
| `SUPER_ADMIN` / `ADMIN` | `/admin/*` | Approvals, sellers, sales, tickets, pricing, UPI, accounting, notifications |
| `MASTER_SELLER` / `SELLER` | `/seller/*` | Sell tickets, view own sales, support WhatsApp, profile |
| Public | `/`, `/login`, `/seller/join/:sellerCode` | Landing, login, referral join |

Password for all demo users: `Kesariya@123` (see `docs/DEMO_CREDENTIALS.md`).

---

## 4. Core business rules (implemented)

### Event & tickets
- Event nights: **Day 1–10** = **11–20 Oct 2026**
- Zones: **GOLD** (`KSR-G-######`), **VIP** (`KSR-V-######`)
- **Unlimited issuance**: tickets created at sale time (no pre-imported finite stock as primary model)
- Default admin base ≈ **₹400/ticket** (overridable per day via `EventDayPrice`)
- Seller margin = selling price − admin base
- Selling price must be ≥ day minimum / base rules

### Money tracks (do not confuse)
1. **Admin base settlement** — seller pays org via UPI for base amount. Proof = **screenshot** on the sale. Sets `paymentStatus = PAID` on seller-submitted sales.
2. **Seller ledger / seller_payments** — admin-side outstanding accounting (still exists for admin).
3. **Customer payments** — optional admin accounting track; **not** the seller’s main UX anymore.

### Approval gate (critical)
Admin **cannot approve** a pending sale unless:
- `paymentStatus === 'PAID'`, AND
- `adminPaymentProofUrl` (or legacy `adminPaymentUtr`) is present

On approve with proof: tickets → `SOLD`, delivery → `READY_TO_SEND`, settlement auto-recorded, then admin can **Mark ticket sent**.

---

## 5. End-to-end flows

### 5.1 Seller happy path (current UX)

```
Login → Home (ticket counts)
  → Sell ticket
      1. Pick Navratri day (1–10)
      2. Gold/VIP qty + selling price
      3. Customer name + mobile
      4. Pay admin UPI/QR (amount = base)
      5. Upload payment screenshot
      6. Submit → sale PENDING, payment PAID
  → My Sales (ticket counts + status)
  → Support WhatsApp (confirmation / details help)
  → Profile
```

**Seller nav (only):** Home · Sell · Sales · Support · Me  
**Removed from seller UI:** Finance, Ledger, Payments received, Dashboard, Team (routes redirect to `/seller`).

### 5.2 Admin happy path

```
Pending sale notification / Approvals
  → Open sale
  → View payment screenshot
  → Approve (only if PAID + proof)
  → READY_TO_SEND
  → Open WhatsApp / copy slip → Mark ticket sent → SENT
```

### 5.3 Sale status machine

| Field | Values | Meaning |
|-------|--------|---------|
| `saleStatus` | PENDING → CONFIRMED / CANCELLED | Admin approval |
| `paymentStatus` | PENDING / PARTIAL / PAID | Seller booking marks **PAID** when screenshot submitted |
| `settlementStatus` | PENDING / PARTIAL / PAID | Seller→admin base ledger settlement |
| `deliveryStatus` | AWAITING_APPROVAL → READY_TO_SEND → SENT (or AWAITING_PAYMENT legacy) | Ticket handoff |

---

## 6. What is built (feature map)

### Auth & sellers
- Mobile + password login, JWT access/refresh
- Roles + protected routes
- Seller register / join via referral code
- Seller profile edit + change password
- Admin seller list/detail, activate/suspend
- Hierarchy fields exist (parent seller, levels) — team UI hidden from seller app for now

### Sales & tickets
- Create sale (seller + admin-on-behalf)
- Concurrent-safe ticket & sale number sequences
- Bulk qty per type in one sale (e.g. 15 tickets = 1 sale row)
- Admin tickets page: **one row per sale**, expand to see ticket numbers
- Filters: day, seller, status, delivery, search

### Pricing & payment settings
- Day-wise base / min / suggested prices (`EventDayPrice`)
- Admin pricing screen
- Payment settings: UPI ID, payee name, instructions, QR (auto + optional upload), **support WhatsApp**

### Uploads
- `POST /api/uploads/payment-proof` — seller screenshot
- `POST /api/uploads/upi-qr` — admin custom QR
- Files under `backend/uploads/`

### Notifications (admin)
- Backend creates notifications on new/pending sales
- `GET /api/notifications`, badges, mark read
- Admin sidebar badges: unread, pending approvals, ready-to-send, pending sellers
- Admin notifications page

### Accounting (admin-facing)
- Seller ledger (append-only debit/credit)
- Customer payments + seller payments + reversals
- Admin accounting screens + seller finance APIs still exist
- **Seller app no longer exposes finance UI**

### Dashboards (admin + APIs)
- Admin home dashboard aggregations (Phase 8)
- Seller dashboard APIs exist but seller UI redirects away from `/seller/dashboard`

### Explicitly NOT built / deferred
- AI Copilot
- WhatsApp Business API / auto-send
- Payment gateway (Razorpay etc.)
- Excel import/export reports (planned Phase 9)
- Recruitment-based commissions
- Finite ticket inventory import as primary model

---

## 7. UI / design system (current)

### Visual direction
- **Brand:** Kesariya Navratri 4.0 — navy + orange
- **Fonts:** Outfit (display), DM Sans (body) — Google Fonts
- **Colors (Tailwind theme):**
  - Navy: `#0b1220` → `#243049`
  - Orange: `#f97316` / `#ea580c`
  - Surface: light gray with soft radial gradients (not flat white-only)
- **Seller shell:** dark navy hero header strip, bottom tab nav with icons, mobile-first `max-w-lg`
- **Admin shell:** dark left sidebar, white content, badge counts on Approvals / Notifications / Tickets

### Seller screens (branded, simplified)
| Route | Purpose |
|-------|---------|
| `/seller` | Ticket sold counts, pending/approved, Sell CTA, Support |
| `/seller/sell` | Day → tickets → customer → UPI/QR → screenshot → submit |
| `/seller/sales` | List by sale; show ticket count prominently |
| `/seller/sales/:id` | Sale detail + ticket numbers + proof image |
| `/seller/support` | WhatsApp deep link with prefilled seller message |
| `/seller/profile` | Profile + password |

### Admin screens
Dashboard, Notifications, Sellers, Approvals/Sales, Tickets, Pricing, UPI settings, Accounting (+ subpages).

---

## 8. Backend module map

```
backend/src/
  routes/          # Express routers under /api
  controllers/
  services/        # Business logic (sales, workflow, ledger, pricing, …)
  validators/      # Zod
  middleware/      # auth, validate, upload, errors
  prisma/          # schema + migrations + seed
  uploads/         # runtime files (gitignored)
```

**Important services**
- `sale.service.ts` — create/list/get sales; seller requires `adminPaymentProofUrl`; sets `paymentStatus=PAID`
- `sale-workflow.service.ts` — approve/reject/mark sent/slip; approve requires PAID + proof
- `payment-settings.service.ts` — UPI + QR data URL + support WhatsApp
- `ledger.service.ts` — sale debit / payment credit / recompute settlement
- `notification.service.ts` — create/list/badges
- `pricing.service.ts` / `event-day.service.ts` — day pricing

**Key Sale fields**
- `adminPaymentProofUrl` — screenshot path (`/uploads/payment-proofs/...`)
- `adminPaymentUtr` — legacy optional
- `eventDay` / `eventDayId` — Navratri night
- `saleStatus`, `paymentStatus`, `settlementStatus`, `deliveryStatus`

---

## 9. API surface (high level)

| Area | Prefix | Notes |
|------|--------|-------|
| Auth | `/api/auth` | login, refresh, me, change-password |
| Sellers | `/api/sellers` | CRUD-ish, referral, activate |
| Sales | `/api/sales` | create, list, get, approve, reject, mark-whatsapp-sent, slip |
| Tickets | `/api/tickets` | list, stats |
| Pricing | `/api/pricing` | day prices |
| Payment settings | `/api/payment-settings` | get/update UPI+QR+support WA |
| Uploads | `/api/uploads` | payment-proof, upi-qr |
| Notifications | `/api/notifications` | list, badges, read |
| Accounting | `/api/accounting`, `/customer-payments`, `/seller-payments` | admin/seller APIs |
| Dashboard | `/api/dashboard/*` | admin + seller aggregations |
| Ticket types | `/api/ticket-types` | includes dayPricing |
| Customers | `/api/customers` | search / create |
| Health | `/api/health` | |

---

## 10. Data model (principal entities)

`User` → `SellerProfile` (hierarchy via parent)  
`Event` → `EventDay`, `EventDayPrice`, `PaymentSettings`, `TicketType`  
`Sale` → `SaleItem` → `Ticket`; also `Customer`  
`SellerPayment` / `CustomerPayment` / `SellerLedgerEntry`  
`Notification`, `AuditLog`, `RefreshToken`  
Sequences: `TicketSequence`, `SaleSequence`

---

## 11. Design principles for future AI work

1. **Seller app stays simple** — sell + see sales + support. Do not re-expose ledger/finance unless product asks.
2. **Payment proof rides with booking** — screenshot required; status becomes PAID before admin can approve.
3. **Unlimited tickets** — issue on sale; don’t rebuild finite inventory stock UI as default.
4. **No fake demo numbers** in dashboards — real aggregations only.
5. **No WhatsApp API / payment gateway / AI** unless explicitly scoped.
6. **Admin owns complexity** — approvals, pricing, UPI, accounting, notifications.
7. **UI:** navy + orange, Outfit + DM Sans, mobile-first seller, avoid generic purple/cream AI templates.
8. **One sale = one customer booking** — many ticket numbers inside; lists group by sale.

---

## 12. Known intentional simplifications (vs original PROJECT.md)

| Original vision | Current reality |
|-----------------|-----------------|
| Seller finance / ledger in seller app | Removed from seller nav; admin keeps accounting |
| Customer payment unlocks WhatsApp | Seller UPI screenshot + PAID unlocks approve → send |
| UTR required for UPI | Replaced by payment screenshot |
| Full AI + WhatsApp API | Deferred |
| Finite ticket inventory | Unlimited issuance |
| Seller team / dashboard as primary tabs | Hidden; home shows counts instead |

---

## 13. How to run (dev)

```bash
# Backend
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run seed          # demo users + optional DEMO sales
npm run dev           # :4000

# Frontend
cd frontend
npm install
npm run dev           # :5173
```

Quick seller test: login `9122000001` / `Kesariya@123` (see DEMO_CREDENTIALS).  
Quick admin test: `8888888888` / `Kesariya@123`.

---

## 14. Production deploy (Contabo)

- Domain: `aaradhana.khodi.in`
- Path: `/var/www/aaradhana`
- Guide: `docs/DEPLOY_CONTABO.md`
- Scripts: `deploy/first-setup.sh`, `deploy/deploy.sh`, `deploy/nginx/`, `deploy/ecosystem.config.cjs`
- API binds `127.0.0.1:4010`; nginx serves SPA + proxies `/api` + `/uploads`

## 15. Suggested next work (not started)

- Phase 9: CSV/XLSX reports
- Leaderboard / daily targets UX
- Optional: re-enable master-seller team view as a separate scoped feature
- Optional: cloud object storage for screenshots instead of local disk

---

*End of AI handoff. Prefer this file as the source of truth for “what exists now.”*
