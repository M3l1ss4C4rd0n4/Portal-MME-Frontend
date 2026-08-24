/**
 * Cliente HTTP para llamar al backend FastAPI desde rutas de Next.js (server-side).
 * Nunca importar desde componentes cliente — solo en route.ts / server actions.
 */

import http from "node:http";
import https from "node:https";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY ?? "";
const PDF_TIMEOUT_MS = 600_000;

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "BackendError";
  }
}

export interface BackendPdfResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

function requestBackend(path: string): Promise<BackendPdfResponse> {
  const url = new URL(`${BACKEND_URL}${path}`);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: "GET",
        headers: {
          "X-API-Key": BACKEND_KEY,
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          const status = res.statusCode ?? 500;
          const headerMap = res.headers;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: {
              get: (name: string) => {
                const val = headerMap[name.toLowerCase()];
                return Array.isArray(val) ? val[0] ?? null : val ?? null;
              },
            },
            arrayBuffer: async () =>
              body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
            text: async () => body.toString("utf-8"),
          });
        });
      },
    );

    req.setTimeout(PDF_TIMEOUT_MS, () => {
      req.destroy(new Error("Backend PDF request timeout"));
    });
    req.on("error", reject);
    req.end();
  });
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

/** GET binario (PDF/ZIP) con timeouts extendidos vía http/https nativo. */
export function backendGetPdf(path: string): Promise<BackendPdfResponse> {
  return requestBackend(path);
}

export async function backendPost<T>(
  path: string,
  body?: unknown,
  timeoutMs = 15_000
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": BACKEND_KEY,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
