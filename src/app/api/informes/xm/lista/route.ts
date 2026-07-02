import { NextRequest, NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export interface ItemXM {
  nombre: string;
  fecha: string;
  fechaModificado: string;
  tipo: string | null;
  tipoLabel: string | null;
  driveId: string;
  itemId: string;
  tamano: number;
}

export interface ListaXMResponse {
  items: ItemXM[];
  total: number;
  pagina: number;
  limite: number;
}

const TIPOS_VALIDOS = new Set([
  "SeguimientoDespacho",
  "VariablesOperativas",
  "VariablesHidrologicas",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const pagina = searchParams.get("pagina") ?? "1";
  const limite = searchParams.get("limite") ?? "30";
  const tipo = searchParams.get("tipo");
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");

  if (tipo && !TIPOS_VALIDOS.has(tipo)) {
    return NextResponse.json(
      { error: `Tipo inválido: ${tipo}` },
      { status: 400 },
    );
  }

  const extra = [
    tipo ? `tipo=${encodeURIComponent(tipo)}` : "",
    fechaDesde ? `fecha_desde=${fechaDesde}` : "",
    fechaHasta ? `fecha_hasta=${fechaHasta}` : "",
  ].filter(Boolean).join("&");

  try {
    const data = await backendGet<ListaXMResponse>(
      `/v1/reports/informes-diarios-xm/lista?pagina=${pagina}&limite=${limite}${extra ? `&${extra}` : ""}`,
      120_000,
    );
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status });
  }
}
