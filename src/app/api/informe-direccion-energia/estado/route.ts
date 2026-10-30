import { NextResponse } from "next/server";
import { backendGet } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export interface EstadoInforme {
  fecha: string;
  hayInformeDeHoy: boolean;
  html: string | null;
  pdf: string | null;
  ultimoDisponible: string | null;
  tableros: number;
  secciones: number;
}

export async function GET(): Promise<NextResponse> {
  try {
    const datos = await backendGet<EstadoInforme>(
      "/v1/informe-direccion-energia/estado",
      30_000,
    );
    return NextResponse.json(datos, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" },
    });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    console.error("[API /informe-direccion-energia/estado]", mensaje);
    return NextResponse.json(
      { error: "No se pudo consultar el estado del informe" },
      { status: 502 },
    );
  }
}
