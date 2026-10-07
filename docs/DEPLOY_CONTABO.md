# Deploy Aaradhana on Contabo VPS

**Domain:** `aaradhana.khodi.in`  
**App path:** `/var/www/aaradhana`  
**API port:** `4010` (local only; nginx proxies `/api` + `/uploads`)

Fits your existing Contabo layout (`/var/www/carnest`, `khodi`, etc.) without touching other sites.

---

## Architecture

```
Browser → https://aaradhana.khodi.in
            │
            ├─ /           → nginx → frontend/dist (SPA)
            ├─ /api/*      → nginx → 127.0.0.1:4010 (PM2 Node API)
            └─ /uploads/*  → nginx → 127.0.0.1:4010 (static uploads)
```

PostgreSQL already on the VPS — we only create a **new database + user**.

---

## 0. DNS

Point A record:

| Host | Type | Value |
|------|------|--------|
| `aaradhana` (or `aaradhana.khodi.in`) | A | your Contabo VPS IP |

---

## 1. Put code on the server

```bash
# On Contabo (as root)
cd /var/www
# Option A — git
git clone <YOUR_REPO_URL> aaradhana

# Option B — upload zip / scp / rsync from your PC
# scp -r ./aaradhana root@YOUR_VPS_IP:/var/www/aaradhana
```

---

## 2. Database (existing PostgreSQL)

```bash
sudo -u postgres psql -f /var/www/aaradhana/deploy/setup-db.sql

# Set a strong password
sudo -u postgres psql -c "ALTER USER aaradhana_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
```

Test:

```bash
psql "postgresql://aaradhana_user:YOUR_STRONG_PASSWORD@127.0.0.1:5432/aaradhana" -c '\dt'
```

---

## 3. Backend env

```bash
cd /var/www/aaradhana
cp backend/.env.production.example backend/.env
nano backend/.env
```

Must set:

- `DATABASE_URL` (user/password/db)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (long random strings)
- `CORS_ORIGIN=https://aaradhana.khodi.in`
- `FRONTEND_URL=https://aaradhana.khodi.in`
- `PORT=4010`

Generate secrets:

```bash
openssl rand -base64 48
```

---

## 4. One-time server wiring

```bash
cd /var/www/aaradhana
bash deploy/first-setup.sh
```

This enables nginx site + PM2 + creates `.env` if missing.

---

## 5. Build + start

```bash
cd /var/www/aaradhana
bash deploy/deploy.sh
```

Optional demo seed (after first migrate):

```bash
cd /var/www/aaradhana/backend
npm ci          # include devDeps for tsx seed once
npm run seed:demo
# then production deps again if you want:
# npm ci --omit=dev
```

---

## 6. SSL

```bash
certbot --nginx -d aaradhana.khodi.in
```

---

## 7. Verify

```bash
curl -sS https://aaradhana.khodi.in/api/health
# → {"success":true,"message":"Kesariya API is running"}

pm2 status
pm2 logs aaradhana-api --lines 50
```

Open: https://aaradhana.khodi.in

---

## Day-to-day updates

```bash
cd /var/www/aaradhana
git pull          # or rsync new code
bash deploy/deploy.sh
```

Useful PM2:

```bash
pm2 restart aaradhana-api
pm2 logs aaradhana-api
pm2 save
```

---

## Local development (unchanged)

```bash
# DB via Docker (port 5434)
docker compose up -d

cd backend && cp .env.example .env && npm i && npx prisma migrate dev && npm run seed:demo && npm run dev
cd frontend && cp .env.example .env && npm i && npm run dev
```

Root helpers:

```bash
npm run dev:api
npm run dev:web
npm run build
npm test
```

---

## Ports / conflict safety

| Service | Port | Notes |
|---------|------|--------|
| Aaradhana API | **4010** | Only localhost; chosen to avoid clashing with other Node apps |
| PostgreSQL | 5432 | Shared existing install |
| Nginx | 80/443 | Existing |

Do **not** expose `4010` publicly in firewall — nginx is the only public entry.

---

## Uploads

Files live in `backend/uploads/` (gitignored). Keep permissions writable by the PM2 user. Back up this folder with DB dumps.

---

## Rollback

```bash
cd /var/www/aaradhana
git checkout <previous-commit>
bash deploy/deploy.sh
```

---

## Checklist

- [ ] DNS A record for `aaradhana.khodi.in`
- [ ] DB `aaradhana` + user created
- [ ] `backend/.env` filled (prod secrets)
- [ ] `bash deploy/first-setup.sh`
- [ ] `bash deploy/deploy.sh`
- [ ] `certbot --nginx -d aaradhana.khodi.in`
- [ ] `/api/health` OK
- [ ] Login works (demo or real users)
