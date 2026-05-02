// pm2 ecosystem configuration
// Start with: pm2 start ecosystem.config.js
// After first start: pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'portal-mme',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/admonctrlxm/portal-direccion-mme',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      error_file: '/home/admonctrlxm/.pm2/logs/portal-mme-error.log',
      out_file: '/home/admonctrlxm/.pm2/logs/portal-mme-out.log',
    },
  ],
};
