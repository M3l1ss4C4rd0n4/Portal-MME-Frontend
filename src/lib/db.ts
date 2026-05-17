import { Pool } from "pg";

// Singleton pool — reutiliza conexiones entre requests en el mismo proceso Node
let pool: Pool | undefined;

function validateEnv(): string[] {
  // PGPASSWORD puede ser string vacío (autenticación trust/peer de PostgreSQL)
  const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER'];
  const missing = required.filter(key => process.env[key] === undefined);

  if (missing.length > 0) {
    console.error(`[db.ts] 🚨 CRÍTICO: Variables de entorno faltantes: ${missing.join(', ')}`);
    console.error('[db.ts] Las conexiones a PostgreSQL fallarán o usarán credenciales por defecto.');
    console.error('[db.ts] Solución: exporte las variables o use "pm2 restart portal-mme --update-env"');
  }
  return missing;
}

export function getPool(): Pool {
  if (!pool) {
    const missing = validateEnv();

    pool = new Pool({
      host: process.env.PGHOST ?? "localhost",
      port: parseInt(process.env.PGPORT ?? "5432", 10),
      database: process.env.PGDATABASE ?? "portal_energetico",
      user: process.env.PGUSER ?? "mme_user",
      password: process.env.PGPASSWORD ?? "",
      max: 10,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });

    pool.on('error', (err) => {
      console.error('[db.ts] Error inesperado en el pool de PostgreSQL:', err);
    });

    if (missing.length > 0) {
      // Intentar una query de prueba para fallar rápido y claro
      pool.query('SELECT 1').catch((err) => {
        console.error('[db.ts] 🚨 La conexión a PostgreSQL falló:', err.message);
      });
    }
  }
  return pool;
}
