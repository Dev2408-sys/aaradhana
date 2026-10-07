#!/usr/bin/env bash
# Deploy / update Aaradhana on Contabo VPS.
# Run from repo root on the server:  bash deploy/deploy.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/aaradhana}"
cd "$APP_ROOT"

echo "==> Aaradhana deploy @ $APP_ROOT"

if [[ ! -f backend/.env ]]; then
  echo "ERROR: backend/.env missing. Copy backend/.env.production.example → backend/.env and edit."
  exit 1
fi

echo "==> Backend deps + build"
cd backend
npm ci --omit=dev
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

echo "==> Done"
echo "    Health: curl -sS https://aaradhana.khodi.in/api/health || curl -sS http://127.0.0.1:4010/api/health"
echo "    Site:   https://aaradhana.khodi.in"
