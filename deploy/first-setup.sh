#!/usr/bin/env bash
# One-time Contabo setup for aaradhana.khodi.in
# Run as root (or sudo) AFTER code is at /var/www/aaradhana
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/aaradhana}"
DOMAIN="${DOMAIN:-aaradhana.khodi.in}"

echo "==> First-time setup for $DOMAIN"

# Node (if missing)
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 20+ then re-run."
  exit 1
fi

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

# Nginx site
if [[ -d /etc/nginx/sites-available ]]; then
  cp "$APP_ROOT/deploy/nginx/${DOMAIN}.conf" "/etc/nginx/sites-available/${DOMAIN}"
  ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
  nginx -t
  systemctl reload nginx
  echo "==> Nginx site enabled for $DOMAIN"
else
  echo "WARN: /etc/nginx/sites-available not found — install nginx config manually."
fi

# Backend env
if [[ ! -f "$APP_ROOT/backend/.env" ]]; then
  cp "$APP_ROOT/backend/.env.production.example" "$APP_ROOT/backend/.env"
  echo "==> Created backend/.env — EDIT secrets/DB password before deploy!"
fi

mkdir -p /var/log/pm2
mkdir -p "$APP_ROOT/backend/uploads/payment-proofs" "$APP_ROOT/backend/uploads/upi-qr"

echo ""
echo "Next steps:"
echo "  1) Create DB:  sudo -u postgres psql -f $APP_ROOT/deploy/setup-db.sql"
echo "  2) Edit:       nano $APP_ROOT/backend/.env"
echo "  3) Deploy:     bash $APP_ROOT/deploy/deploy.sh"
echo "  4) SSL:        certbot --nginx -d $DOMAIN"
echo "  5) Seed (opt): cd $APP_ROOT/backend && npx tsx prisma/seed.ts"
echo "                 (needs tsx: npm i -D tsx  OR use npm run seed:demo after npm ci with devDeps)"
