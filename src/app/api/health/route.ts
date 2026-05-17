import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { backendGet } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
    backend: { ok: boolean; latencyMs: number; error?: string };
    env: { ok: boolean; missing: string[] };
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version ?? "unknown";

  // ── Validar variables de entorno críticas ──
  // Nota: PGPASSWORD puede no ser necesario si PostgreSQL usa trust auth.
  // Se reporta como advertencia pero no fuerza unhealthy si la BD responde.
  const requiredEnv = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "BACKEND_API_URL"];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);
  const missingPgPassword = !process.env.PGPASSWORD;

  // ── Check PostgreSQL ──
  const dbStart = Date.now();
  let dbOk = false;
  let dbError: string | undefined;
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }
  const dbLatency = Date.now() - dbStart;

  // ── Check Backend FastAPI ──
  // Nota: el backend puede no tener /v1/health. Consideramos "ok" cualquier
  // respuesta HTTP (incluyendo 404) porque indica que el servidor responde.
  const backendStart = Date.now();
  let backendOk = false;
  let backendError: string | undefined;
  try {
    const res = await fetch(`${process.env.BACKEND_API_URL}/v1/health`, {
      headers: { "X-API-Key": process.env.BACKEND_API_KEY ?? "" },
      signal: AbortSignal.timeout(5_000),
    });
    backendOk = true; // Cualquier respuesta HTTP = servidor vivo
    if (res.status === 404) {
      backendError = "Backend responde pero no expone /v1/health";
    }
  } catch (err) {
    backendError = err instanceof Error ? err.message : String(err);
  }
  const backendLatency = Date.now() - backendStart;

  const status: HealthCheck["status"] =
    dbOk && backendOk && missingEnv.length === 0
      ? "healthy"
      : dbOk && missingEnv.length === 0
        ? "degraded"
        : "unhealthy";

  const response: HealthCheck = {
    status,
    timestamp,
    version,
    checks: {
      database: { ok: dbOk, latencyMs: dbLatency, error: dbError },
      backend: { ok: backendOk, latencyMs: backendLatency, error: backendError },
      env: {
        ok: missingEnv.length === 0 && !missingPgPassword,
        missing: missingPgPassword ? [...missingEnv, "PGPASSWORD (opcional si trust auth)"] : missingEnv,
      },
    },
  };

  return NextResponse.json(response, {
    status: status === "healthy" ? 200 : status === "degraded" ? 200 : 503,
  });
}
