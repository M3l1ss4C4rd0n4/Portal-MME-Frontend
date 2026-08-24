import { NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tablero: string }> }
) {
  try {
    const { tablero } = await params;

    const validos = [
      "subsidios", "fenoge", "contratos-or", "supervision",
      "presupuesto", "comunidades", "pagos", "validaciones",
      "energia", "colombia-solar", "predicciones",
    ];

    if (!validos.includes(tablero)) {
      return NextResponse.json(
        { error: `Tablero '${tablero}' no encontrado` },
        { status: 404 }
      );
    }

    // Forward query params (filtros activos) al backend
    const incomingUrl = new URL(req.url);
    const query = new URLSearchParams(incomingUrl.search);
    const path = `/v1/informes/${tablero}${query.toString() ? `?${query}` : ""}`;

    const res = await backendGetPdf(path);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Backend error: ${res.status} - ${errorText}`);
    }

    const pdfBuffer = await res.arrayBuffer();

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Informe_${tablero}_${new Date().toISOString().split("T")[0]}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });

    return new Response(pdfBuffer, { headers });

  } catch (err) {
    console.error("[api/informes/tablero]", err);
    return NextResponse.json(
      { error: "Error al generar informe", detail: String(err) },
      { status: 500 }
    );
  }
}
