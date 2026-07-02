import { NextRequest, NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export interface ItemBoletin {
  nombre: string;
  fecha: string;
  driveId: string;
  itemId: string;
  tamano: number;
}

export interface ListaBoletinesResponse {
  items: ItemBoletin[];
  total: number;
  pagina: number;
  limite: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const pagina = searchParams.get("pagina") ?? "1";
  const limite = searchParams.get("limite") ?? "30";
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");

  const extra = [
    fechaDesde ? `fecha_desde=${fechaDesde}` : "",
    fechaHasta ? `fecha_hasta=${fechaHasta}` : "",
  ].filter(Boolean).join("&");

  try {
    const data = await backendGet<ListaBoletinesResponse>(
      `/v1/reports/boletines-energeticos/lista?pagina=${pagina}&limite=${limite}${extra ? `&${extra}` : ""}`,
      120_000,
    );
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status });
  }
}
