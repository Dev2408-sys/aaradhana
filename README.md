# Kesariya 4.0 Seller OS

Production web application for Kesariya Navratri 4.0 ticket reseller and seller-community management.

## Structure

- `frontend/` — Vite + React + TypeScript
- `backend/` — Express + Prisma + PostgreSQL
- `docs/` — Product and technical specifications

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

## Quick start

```bash
# 1. Database (host port 5434)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env   # if needed
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

- API: http://localhost:4000/api/health  
- App: http://localhost:5173  

### Seed logins

Password for all seed users: `Kesariya@123`

| Role | Mobile |
|------|--------|
| SUPER_ADMIN | 9999999999 |
| ADMIN | 8888888888 |
| MASTER_SELLER | 7777777777 |
| SELLER | 6666666666 / 5555555555 |
