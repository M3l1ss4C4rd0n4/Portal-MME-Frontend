import { NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

/**
 * Proxy al backend FastAPI para descargar el boletín energético más reciente
 * desde la carpeta SharePoint Boletines Energeticos.
 */
export async function GET() {
  try {
    const res = await backendGetPdf("/v1/reports/boletines-energeticos/latest");

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
        Pragma: "no-cache",
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
