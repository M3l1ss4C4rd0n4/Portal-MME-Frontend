import { NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

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
    const res = await backendGetPdf("/v1/reports/informes-diarios-xm/paquete");

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
