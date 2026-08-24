import { NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

/**
 * Proxy al backend: PDF del informe de empalme más reciente (SharePoint).
 */
export async function GET() {
  try {
    const res = await backendGetPdf("/v1/reports/informe-empalme/latest");

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[API /informe-empalme] Backend error:", res.status, detail);
      return NextResponse.json(
        { error: "No se pudo obtener el informe de empalme" },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const pdf = await res.arrayBuffer();
    const disposition =
      res.headers.get("Content-Disposition") ??
      'attachment; filename="Informe_de_Empalme_MME.pdf"';

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
    console.error("[API /informe-empalme] Error:", error);
    return NextResponse.json(
      { error: "Error interno al descargar el informe de empalme" },
      { status: 500 },
    );
  }
}
