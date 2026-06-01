import { NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

/**
 * Proxy al backend: PDF del informe ejecutivo diario (correo/Telegram 8:30 AM).
 */
export async function GET() {
  try {
    const res = await backendGetPdf("/v1/reports/resumen-ejecutivo/latest");

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[API /resumen-ejecutivo] Backend error:", res.status, detail);
      return NextResponse.json(
        { error: "No se pudo obtener el resumen ejecutivo" },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const pdf = await res.arrayBuffer();
    const disposition =
      res.headers.get("Content-Disposition") ??
      'attachment; filename="Informe_Ejecutivo_MME.pdf"';

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
    console.error("[API /resumen-ejecutivo] Error:", error);
    return NextResponse.json(
      { error: "Error interno al descargar el resumen ejecutivo" },
      { status: 500 },
    );
  }
}
