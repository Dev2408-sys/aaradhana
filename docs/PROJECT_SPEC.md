# Kesariya 4.0 Seller OS — Project Specification

## 1. Product

**Name:** Kesariya 4.0 Seller OS  
**Type:** Ticket reseller and seller-community management platform  
**Event:** Kesariya Navratri 4.0  
**Dates:** 11 October 2026 – 20 October 2026  
**Location:** Kesariya AC Dome, VIP Road, Vesu, Surat  

## 2. Business Goals

- Enable a distributed seller network to sell Gold and VIP tickets.
- Track seller hierarchy (Admin → Master Seller → Seller → Customer).
- Manage ticket inventory, assignment, sales, payments, and settlements.
- Tie rewards/incentives to legitimate ticket sales, not recruitment alone.
- Hit a daily sales target of **1,100 tickets/day**.

## 3. Ticket Model

| Attribute | Value |
|-----------|--------|
| Inventory | **Unlimited** issuance (no finite stock ceiling) |
| Ticket types | GOLD, VIP |
| Default base price | ₹400 (configurable in `ticket_types`) |
| Daily target | configurable (`events.daily_target`, seed 1,100) |
| Ticket numbers | Server-generated unique (`KSR-G-######` / `KSR-V-######`) |

Seller margin formula (server-side only):

```
gross_margin = sellingPrice - basePrice
```

## 4. User Roles

| Role | Scope |
|------|--------|
| SUPER_ADMIN | Full system access including configuration and audit |
| ADMIN | Operations: sellers, tickets, sales, payments, reports |
| MASTER_SELLER | Own sales + invite/view eligible team |
| SELLER | Own tickets, sales, customers, referral link |

Customers are not login roles in MVP; they are CRM records created during sales.

## 5. Core Modules (MVP)

1. Authentication & roles  
2. Seller management & hierarchy  
3. Ticket inventory & import  
4. Ticket assignment  
5. Customer management  
6. Sales (transaction-safe)  
7. Payments / settlements  
8. Admin & seller dashboards  
9. Team / leaderboard  
10. Reports (Excel/CSV)  
11. WhatsApp-ready message generators  
12. AI copilot (tool-backed, permission-aware)  
13. Audit logging  

## 6. Tech Stack

### Frontend (`/frontend`)

- React, Vite, TypeScript  
- React Router, Tailwind CSS, shadcn/ui-style components  
- TanStack Query, React Hook Form, Zod, Axios  
- Recharts, Lucide icons  

### Backend (`/backend`)

- Node.js, Express, TypeScript  
- Prisma ORM, PostgreSQL  
- JWT auth, secure password hashing, Zod validation  
- Helmet, CORS, rate limiting, structured logging  

## 7. Non-Goals (MVP)

- Unofficial WhatsApp automation  
- AI inventing or mutating financial data without authorized tools  
- Soft-delete of financial/ticket history  
- Mock APIs once real endpoints exist  

## 8. Definition of Done (MVP)

- Admin creates sellers; sellers log in  
- Tickets import, assign, and sell without duplicate sales  
- Profit calculated on backend; payments tracked  
- Dashboards, reports, hierarchy, audit, and role restrictions work  
- Concurrent sale of the same ticket never succeeds twice  

## 9. Source of Truth

This document and sibling docs under `/docs` are derived from `PROJECT.md` and the execution prompt. Business rules live in `BUSINESS_RULES.md`. Implementation order lives in `DEVELOPMENT_PLAN.md`.
