import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY ?? "";

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

/**
 * Proxy al backend: ZIP con los 3 informes diarios XM
 * (seguimiento, operativas, hidrológicas) con fallback al día anterior.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/reports/informes-diarios-xm/paquete`, {
      headers: {
        "X-API-Key": BACKEND_KEY,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(600_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[API /informes-diarios] Backend error:", res.status, detail);
      return NextResponse.json(
        { error: "No se pudo obtener los informes diarios" },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const zip = await res.arrayBuffer();
    const disposition =
      res.headers.get("Content-Disposition") ??
      'attachment; filename="Informes_Diarios_XM.zip"';

    return new NextResponse(zip, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": disposition,
        ...NO_CACHE,
      },
    });
  } catch (error) {
    console.error("[API /informes-diarios] Error:", error);
    return NextResponse.json(
      { error: "Error interno al descargar los informes" },
      { status: 500 },
    );
  }
}
