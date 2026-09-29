import { NextRequest, NextResponse } from "next/server";
import { backendPost, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

/**
 * Proxy hacia POST /v1/balance-oferta-demanda/simular-contrafactual — recalcula
 * el margen de reserva histórico asumiendo que ciertos proyectos UPME
 * retrasados hubieran entrado en operación en su fecha originalmente
 * planeada. Ver domain/services/balance_oferta_demanda_service.py.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await backendPost("/v1/balance-oferta-demanda/simular-contrafactual", body);
    return NextResponse.json(data);
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 502;
    console.error("[api/balance-oferta-demanda/simular-contrafactual]", error);
    return NextResponse.json(
      { error: "No se pudo simular el escenario contrafactual" },
      { status }
    );
  }
}
