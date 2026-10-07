#!/usr/bin/env bash
# One-shot deploy on Contabo VPS:
#   cd /var/www/aaradhana && bash deploy/deploy.sh
#
# Pulls latest main, migrates DB, builds API + frontend, reloads PM2 + nginx.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/aaradhana}"
BRANCH="${BRANCH:-main}"
cd "$APP_ROOT"

echo "==> Aaradhana deploy @ $APP_ROOT (branch: $BRANCH)"

if [[ ! -f backend/.env ]]; then
  echo "ERROR: backend/.env missing. Copy backend/.env.production.example → backend/.env and edit."
  exit 1
fi

echo "==> Git pull"
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Backend deps + migrate + build"
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

echo "==> Frontend build"
cd frontend
npm ci
npm run build
cd ..

echo "==> Ensure uploads writable"
mkdir -p backend/uploads/payment-proofs backend/uploads/upi-qr
chmod -R u+rwX backend/uploads

echo "==> Restart API (PM2)"
mkdir -p /var/log/pm2
if pm2 describe aaradhana-api >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

if command -v nginx >/dev/null 2>&1; then
  echo "==> Reload nginx"
  nginx -t && systemctl reload nginx
fi

echo "==> Health check"
curl -sS http://127.0.0.1:4010/api/health || true
echo
curl -sS https://aaradhana.khodi.in/api/health || true
echo

echo "==> Done → https://aaradhana.khodi.in"
