/**
 * Cliente HTTP para llamar al backend FastAPI desde rutas de Next.js (server-side).
 * Nunca importar desde componentes cliente — solo en route.ts / server actions.
 */

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY ?? "";

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "BackendError";
  }
}

export async function backendGet<T>(
  path: string,
  timeoutMs = 15_000
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": BACKEND_KEY },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new BackendError(res.status, text || `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}
