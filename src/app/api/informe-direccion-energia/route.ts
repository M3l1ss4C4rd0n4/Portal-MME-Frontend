import { NextRequest, NextResponse } from "next/server";
import { backendGetPdf } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

const SIN_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

type Formato = "html" | "pdf";

/**
 * Proxy al backend del Informe Diario de Dirección de Energía.
 *
 * El informe lo genera la tarea de las 7:00 AM; aquí solo se reenvía. Se usa
 * `backendGetPdf` (y no `backendGet`) porque devuelve el cuerpo crudo, que es
 * lo que hace falta tanto para el PDF binario como para el HTML sin reparsear.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const pedido = request.nextUrl.searchParams.get("formato");
  const formato: Formato = pedido === "pdf" ? "pdf" : "html";

  try {
    const res = await backendGetPdf(`/v1/informe-direccion-energia?formato=${formato}`);

    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      console.error("[API /informe-direccion-energia] backend", res.status, detalle);
      return NextResponse.json(
        { error: "El informe diario no está disponible en este momento" },
        { status: res.status >= 500 ? 502 : res.status, headers: SIN_CACHE },
      );
    }

    const cuerpo = await res.arrayBuffer();
    const fecha = res.headers.get("X-Informe-Fecha") ?? "";
    const esDeHoy = res.headers.get("X-Informe-Es-De-Hoy") ?? "";

    if (formato === "pdf") {
      return new NextResponse(cuerpo, {
        status: 200,
        headers: {
          ...SIN_CACHE,
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="Informe_Direccion_Energia_${fecha || "reciente"}.pdf"`,
          "X-Informe-Fecha": fecha,
          "X-Informe-Es-De-Hoy": esDeHoy,
        },
      });
    }

    return new NextResponse(cuerpo, {
      status: 200,
      headers: {
        ...SIN_CACHE,
        "Content-Type": "text/html; charset=utf-8",
        "X-Informe-Fecha": fecha,
        "X-Informe-Es-De-Hoy": esDeHoy,
      },
    });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    console.error("[API /informe-direccion-energia]", mensaje);
    return NextResponse.json(
      { error: "Error interno al obtener el informe diario" },
      { status: 500, headers: SIN_CACHE },
    );
  }
}
