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
