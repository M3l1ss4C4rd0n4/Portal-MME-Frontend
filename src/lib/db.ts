import { Pool } from "pg";

// Singleton pool — reutiliza conexiones entre requests en el mismo proceso Node
let pool: Pool | undefined;

function validateEnv() {
  const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`[db.ts] Variables de entorno faltantes: ${missing.join(', ')}. Usando valores por defecto.`);
  }
}

export function getPool(): Pool {
  if (!pool) {
    validateEnv();
    
    pool = new Pool({
      host: process.env.PGHOST ?? "localhost",
      port: parseInt(process.env.PGPORT ?? "5432", 10),
      database: process.env.PGDATABASE ?? "portal_energetico",
      user: process.env.PGUSER ?? "mme_user",
      password: process.env.PGPASSWORD!,
      max: 10,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    
    // Manejo de errores en el pool
    pool.on('error', (err) => {
      console.error('[db.ts] Error inesperado en el pool de PostgreSQL:', err);
    });
  }
  return pool;
}
