# Aaradhana — Kesariya 4.0 Seller OS

Ticket booking + seller network for **Kesariya Navratri 4.0**.

| Layer | Stack |
|-------|--------|
| Frontend | React 19, Vite, Tailwind, TanStack Query |
| Backend | Node, Express, Prisma, PostgreSQL |
| Domain (prod) | https://aaradhana.khodi.in |

## Repo structure

```
frontend/          Vite SPA
backend/           Express API
deploy/            Contabo nginx + PM2 + scripts
docs/              Specs + DEPLOY_CONTABO.md
docker-compose.yml Local Postgres only
```

## Local development

**Prerequisites:** Node 20+, Docker (for Postgres)

```bash
# 1) Database (host port 5434)
docker compose up -d

# 2) Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed:demo
npm run dev
# → http://localhost:4000/api/health

# 3) Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

Root helpers (optional):

```bash
npm run dev:api
npm run dev:web
npm run build
npm test
```

### Demo logins

Password: `Kesariya@123` — see `docs/DEMO_CREDENTIALS.md`

| Role | Mobile |
|------|--------|
| SUPER_ADMIN | 9999999999 |
| ADMIN | 8888888888 |
| MASTER_SELLER | 7777777777 |
| SELLER | 9122000001 / 6666666666 |

## Production (Contabo VPS)

Your server already has PostgreSQL + nginx sites under `/var/www/`.

Full guide: **[docs/DEPLOY_CONTABO.md](docs/DEPLOY_CONTABO.md)**

Short path:

```bash
# On Contabo
cd /var/www && git clone <repo> aaradhana   # or upload code
sudo -u postgres psql -f /var/www/aaradhana/deploy/setup-db.sql
cp /var/www/aaradhana/backend/.env.production.example /var/www/aaradhana/backend/.env
# edit DATABASE_URL + JWT secrets
bash /var/www/aaradhana/deploy/first-setup.sh
bash /var/www/aaradhana/deploy/deploy.sh
certbot --nginx -d aaradhana.khodi.in
```

- App path: `/var/www/aaradhana`
- API: `127.0.0.1:4010` (not public)
- Nginx proxies `/api` + `/uploads`

## Docs

- `docs/AI_CURRENT_STATE.md` — what is built today
- `docs/DEPLOY_CONTABO.md` — Contabo deploy
- `docs/DEMO_CREDENTIALS.md` — seed accounts
