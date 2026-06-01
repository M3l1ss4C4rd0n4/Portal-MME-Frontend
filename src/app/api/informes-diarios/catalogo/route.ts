import { NextResponse } from "next/server";
import { backendGet } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

interface InformeCatalogo {
  tipo: string;
  label: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  fechaIso: string;
  esDelDia: boolean;
  filename: string;
  modificado?: string;
}

interface CatalogoResponse {
  informes: InformeCatalogo[];
  total: number;
  resumen?: {
    fechaConsulta: string;
    completosDelDia: number;
    totalTipos: number;
    pendientes: string[];
    completo: boolean;
    actualizadoEn?: string;
  };
}

export async function GET() {
  try {
    const data = await backendGet<CatalogoResponse>(
      "/v1/reports/informes-diarios-xm/catalogo",
      120_000,
    );
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("[API /informes-diarios/catalogo] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el catálogo de informes" },
      { status: 502 },
    );
  }
}
