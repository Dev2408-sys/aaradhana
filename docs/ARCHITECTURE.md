# Architecture

## 1. High-Level Layout

```text
aaradhana/
├── frontend/          # Vite React SPA (independently runnable)
├── backend/           # Express API (independently runnable)
├── docs/              # Product & technical documentation
└── PROJECT.md         # Original product brief
```

Frontend and backend communicate over HTTP/JSON. No shared runtime process.

## 2. Backend Structure

```text
backend/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    config/            # env, constants
    controllers/       # thin HTTP adapters
    services/          # business logic
    repositories/      # Prisma data access (when needed)
    routes/
    middleware/        # auth, roles, errors, rate limit
    validators/        # Zod schemas
    utils/             # logger, crypto, response helpers
    types/
    app.ts             # Express app
    server.ts          # listen + bootstrap
```

**Rule:** Route handlers stay thin. Financial and ticket state logic lives in services. Prisma provides SQL injection protection via parameterized queries.

## 3. Frontend Structure

```text
frontend/
  src/
    api/               # Axios client + endpoint modules
    components/        # UI primitives + shared layout
    features/          # domain feature modules
    hooks/
    lib/               # utils, query client
    pages/
    routes/            # public + protected route trees
    types/
    App.tsx
    main.tsx
```

## 4. Request Flow

```text
Client → Axios → Express middleware (Helmet, CORS, rate limit, JSON)
      → Zod validation
      → requireAuth / requireRole / requireSellerOwnership
      → Controller → Service → Prisma → PostgreSQL
      → Consistent JSON response
```

Success shape:

```json
{ "success": true, "data": {}, "message": "optional" }
```

Error shape:

```json
{ "success": false, "message": "Human readable message", "code": "ERROR_CODE" }
```

Never expose stack traces, DB errors, or secrets to clients.

## 5. Auth Model

- Access JWT (short-lived) + Refresh JWT (longer-lived, stored hashed/revocable where applicable)
- Password hashing via bcrypt (or argon2)
- Frontend route guards for UX only
- Backend middleware enforces all permissions

## 6. Data Integrity Patterns

- UUID primary keys
- Foreign keys + indexes on hot paths
- Ticket sales and assignments use PostgreSQL transactions
- Row-level locking (`SELECT … FOR UPDATE`) for concurrent ticket claims
- Soft state transitions; never delete historical financial/ticket records

## 7. Security Layers

| Layer | Mechanism |
|-------|-----------|
| Transport | CORS allowlist, Helmet headers |
| Abuse | Rate limiting on auth and write endpoints |
| Input | Zod on every mutating/query-critical endpoint |
| AuthZ | Role + ownership checks |
| Secrets | Environment variables only; never in frontend |
| Audit | Structured audit_logs for sensitive actions |

## 8. Phase 7 accounting model

Financial truth lives in PostgreSQL (Prisma Decimal + transactions).

Tracks (independent):

1. **Customer payments** — `customer_payments` vs `sales.total_amount`
2. **Seller settlement** — `seller_ledger_entries` for admin **base** receivable + `seller_payments`
3. **Seller margin** — derived from sales (`selling − base`), not a settlement liability

Sale creation posts an idempotent `SALE_DEBIT:{saleId}` ledger entry for `base_amount`.

## 9. Phase 8 dashboards

Aggregations live in `services/dashboard/*` (admin + seller/master). Frontend charts (Recharts) consume `/api/dashboard/*` only — no client-side KPI invention.

Filter contract is shared (`eventDay`, date range, seller/master, ticket type, payment/settlement status). Role scoping overrides client-supplied seller IDs.

## 10. AI Boundary (future phases)

AI tools call backend services that return real DB data. AI never invents metrics. Responses are scoped to the authenticated user's permissions.

## 11. Runtime

| Process | Default |
|---------|---------|
| Frontend Vite | `http://localhost:5173` |
| Backend API | `http://localhost:4000` |
| PostgreSQL | Docker Compose on host `5434` → container `5432` |

Both apps must remain independently startable with their own `.env` files.
