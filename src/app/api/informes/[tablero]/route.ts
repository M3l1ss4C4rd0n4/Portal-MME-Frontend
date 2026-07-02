import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:8000";
const API_KEY = process.env.API_KEY || "";

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
    const backendUrl = new URL(`${BACKEND_BASE}/v1/informes/${tablero}`);
    incomingUrl.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const res = await fetch(
      backendUrl.toString(),
      {
        headers: {
          "X-API-Key": API_KEY,
        },
        signal: AbortSignal.timeout(180000),
      }
    );
    
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
