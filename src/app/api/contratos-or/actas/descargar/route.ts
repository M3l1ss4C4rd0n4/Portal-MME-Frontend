import { NextRequest, NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const itemId = request.nextUrl.searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json(
      { error: "Parámetro 'itemId' requerido" },
      { status: 400 },
    );
  }

  try {
    const res = await backendGetPdf(
      `/v1/contratos-or/actas/descargar?item_id=${encodeURIComponent(itemId)}`,
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "[API /contratos-or/actas/descargar] Error:",
        res.status,
        detail,
      );
      return NextResponse.json(
        { error: "No se pudo descargar el acta" },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const pdf = await res.arrayBuffer();
    const disposition =
      res.headers.get("Content-Disposition") ?? 'attachment; filename="acta.pdf"';

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
    console.error("[API /contratos-or/actas/descargar] Error:", error);
    return NextResponse.json(
      { error: "Error interno al descargar el acta" },
      { status: 500 },
    );
  }
}
