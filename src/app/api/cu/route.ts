import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

interface CUCurrentRaw {
  fecha: string;
  cu_total: number;
  confianza: string;
  componente_g: number | null;
  componente_t: number;
  componente_d: number;
  componente_c: number;
  componente_p: number | null;
  componente_r: number | null;
  demanda_gwh: number | null;
  generacion_gwh: number | null;
  perdidas_pct: number | null;
  notas: string | null;
}

interface CuMinoristaNacional {
  status: string;
  cu_minorista_promedio: number;
}

export async function GET() {
  try {
    const raw = await backendGet<CUCurrentRaw>("/v1/cu/current");
    const cuTotal = Number(raw.cu_total);

    // CU Usuario Final: promedio nacional REAL (26 operadores reales,
    // cu_tarifas_or, fuente SSPD) — reemplaza el multiplicador ×1.42 sin
    // fuente que se usaba antes. Si el backend no tiene el dato, se omite
    // en vez de fabricar un número.
    let cuUsuarioFinal: number | null = null;
    try {
      const minorista = await backendGet<CuMinoristaNacional>(
        "/v1/cu/minorista/promedio-nacional"
      );
      cuUsuarioFinal = minorista.cu_minorista_promedio;
    } catch (err) {
      if (!(err instanceof BackendError && err.status === 404)) {
        console.error("[api/cu] Error obteniendo CU minorista nacional:", err);
      }
    }

    return NextResponse.json({
      fecha:          raw.fecha,
      cuMayoristaLac: parseFloat(cuTotal.toFixed(2)),
      cuUsuarioFinal,
      componentes: {
        generacion:       raw.componente_g != null ? parseFloat(Number(raw.componente_g).toFixed(4)) : null,
        transmision:      parseFloat(Number(raw.componente_t).toFixed(4)),
        distribucion:     parseFloat(Number(raw.componente_d).toFixed(4)),
        comercializacion: parseFloat(Number(raw.componente_c).toFixed(4)),
        perdidas:         raw.componente_p != null ? parseFloat(Number(raw.componente_p).toFixed(4)) : null,
        restricciones:    raw.componente_r != null ? parseFloat(Number(raw.componente_r).toFixed(4)) : null,
      },
      demandaGwh:    raw.demanda_gwh    != null ? parseFloat(Number(raw.demanda_gwh).toFixed(2))    : null,
      generacionGwh: raw.generacion_gwh != null ? parseFloat(Number(raw.generacion_gwh).toFixed(2)) : null,
      perdidasPct:   raw.perdidas_pct   != null ? parseFloat(Number(raw.perdidas_pct).toFixed(2))   : null,
      confianza:     raw.confianza,
      notas:         raw.notas,
    });
  } catch (err) {
    if (err instanceof BackendError) {
      if (err.status === 404)
        return NextResponse.json({ error: "No hay datos de CU disponibles" }, { status: 404 });
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    }
    console.error("[api/cu]", err);
    return NextResponse.json({ error: "Error al obtener datos de CU" }, { status: 500 });
  }
}
