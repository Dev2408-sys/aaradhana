/**
 * PM2 process file for Contabo VPS.
 * Usage (from /var/www/aaradhana):
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 */
const fs = require('fs');
const path = require('path');

const APP_ROOT = '/var/www/aaradhana';
const ENV_PATH = path.join(APP_ROOT, 'backend', '.env');
const KHODI_ENV_PATH = '/var/www/khodi-mart/.env.prod';
const WHATSAPP_KEYS = [
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_PHONE_ID',
  'WHATSAPP_API_URL',
  'WHATSAPP_DEV_MODE',
];

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile(ENV_PATH);
const khodiEnv = loadEnvFile(KHODI_ENV_PATH);
for (const key of WHATSAPP_KEYS) {
  if (!fileEnv[key] && khodiEnv[key]) fileEnv[key] = khodiEnv[key];
}
// Khodi .env still points at Meta's +1 555 test number. Send from the live Indian line.
if (!fileEnv.WHATSAPP_PHONE_ID || fileEnv.WHATSAPP_PHONE_ID === '1222441257625130') {
  fileEnv.WHATSAPP_PHONE_ID = '1245317021999582';
}

module.exports = {
  apps: [
    {
      name: 'aaradhana-api',
      cwd: path.join(APP_ROOT, 'backend'),
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ...fileEnv,
      },
      max_memory_restart: '400M',
      time: true,
      autorestart: true,
      error_file: '/var/log/pm2/aaradhana-api-error.log',
      out_file: '/var/log/pm2/aaradhana-api-out.log',
      merge_logs: true,
    },
  ],
};
