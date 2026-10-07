/**
 * PM2 process file for Contabo VPS.
 * Usage (from /var/www/aaradhana):
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'aaradhana-api',
      cwd: '/var/www/aaradhana/backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      time: true,
      error_file: '/var/log/pm2/aaradhana-api-error.log',
      out_file: '/var/log/pm2/aaradhana-api-out.log',
      merge_logs: true,
    },
  ],
};
