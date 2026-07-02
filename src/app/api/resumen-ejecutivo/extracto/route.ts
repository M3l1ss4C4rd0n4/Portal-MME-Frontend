import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY ?? "";
const SCRIPT_DIR = path.resolve(process.cwd(), "scripts/pdf-extract");
const PUBLIC_PDFS_DIR = path.resolve(process.cwd(), "public/generated-pdfs");

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function runPython(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      [path.join(SCRIPT_DIR, script), ...args],
      { timeout: 60_000, maxBuffer: 50 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      },
    );
  });
}

async function cleanupOldOutputs(prefix: string, keepDir: string) {
  try {
    const entries = await fs.readdir(PUBLIC_PDFS_DIR);
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.startsWith(prefix)) continue;
      const fullPath = path.join(PUBLIC_PDFS_DIR, entry);
      const stat = await fs.stat(fullPath);
      if (fullPath !== keepDir && now - stat.mtime.getTime() > 60_000) {
        await fs.rm(fullPath, { recursive: true, force: true });
      }
    }
  } catch {
    // ignore
  }
}

export async function GET() {
  const cacheKey = "resumen";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Cache": "HIT",
      },
    });
  }

  let tmpFile = "";
  let outputDir = "";
  try {
    const res = await fetch(`${BACKEND_URL}/v1/reports/resumen-ejecutivo/latest`, {
      headers: {
        "X-API-Key": BACKEND_KEY,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[API /resumen-ejecutivo/extracto] Error:", res.status, detail);
      return NextResponse.json(
        { error: "No se pudo descargar el resumen ejecutivo" },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    tmpFile = path.join(tmpdir(), `resumen-${Date.now()}.pdf`);
    await fs.writeFile(tmpFile, buffer);

    const ts = Date.now();
    outputDir = path.join(PUBLIC_PDFS_DIR, `resumen-${ts}`);
    await fs.mkdir(outputDir, { recursive: true });

    const stdout = await runPython("extract_and_render.py", [tmpFile, outputDir, "", "150"]);
    const parsed = JSON.parse(stdout);

    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="?([^";\n]+)"?/i);
    const filename = match?.[1] ?? "resumen-ejecutivo.pdf";

    const data = {
      ...parsed,
      filename,
      descargarUrl: "/api/resumen-ejecutivo",
      extraidoEn: new Date().toISOString(),
    };

    cache.set(cacheKey, { data, ts: Date.now() });

    cleanupOldOutputs("resumen-", outputDir).catch(() => {});

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[API /resumen-ejecutivo/extracto] Error:", error);
    return NextResponse.json(
      { error: "Error interno al extraer el resumen ejecutivo" },
      { status: 500 },
    );
  } finally {
    if (tmpFile) {
      try {
        await fs.unlink(tmpFile);
      } catch {
        // ignore
      }
    }
  }
}
