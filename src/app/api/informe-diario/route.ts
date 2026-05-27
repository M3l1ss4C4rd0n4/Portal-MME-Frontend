import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY ?? "";

/**
 * Proxy al backend FastAPI para descargar el boletín energético más reciente
 * desde la carpeta SharePoint Boletines Energeticos.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/reports/boletines-energeticos/latest`, {
      headers: {
        "X-API-Key": BACKEND_KEY,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(600_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[API /informe-diario] Backend error:", res.status, detail);
      return NextResponse.json(
        { error: "No se pudo obtener el informe diario" },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const pdf = await res.arrayBuffer();
    const disposition =
      res.headers.get("Content-Disposition") ??
      'attachment; filename="InformeDiario.pdf"';

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("[API /informe-diario] Error:", error);
    return NextResponse.json(
      { error: "Error interno al descargar el informe" },
      { status: 500 },
    );
  }
}
