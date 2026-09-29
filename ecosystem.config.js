// pm2 ecosystem configuration
// Start with: pm2 start ecosystem.config.js
// After first start: pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'portal-mme',
      script: 'node_modules/.bin/next',
      // Fase 45 (auditoría de seguridad, 2026-09-10): antes Next.js
      // escuchaba en 0.0.0.0 (todas las interfaces), alcanzable
      // directamente sin pasar por nginx (sin TLS ni headers de
      // seguridad). nginx ya proxea a 127.0.0.1:3001 (upstream
      // nextjs_portal), así que atarlo a loopback no rompe nada.
      // La variable de entorno HOSTNAME no tuvo efecto en esta versión
      // de Next.js (16.2.1) — el flag -H del CLI sí funciona.
      args: 'start -H 127.0.0.1',
      cwd: '/home/admonctrlxm/portal-direccion-mme',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        PGHOST: 'localhost',
        PGPORT: '5432',
        PGDATABASE: 'portal_energetico',
        PGUSER: 'mme_user',
        PGPASSWORD: '',
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
