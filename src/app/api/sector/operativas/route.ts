import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MetricaConTendencia {
  fecha: string | null;
  actual: number;
  hace7d: number | null;
  cambio7d: number | null;
  unidad: string | null;
}

async function metricaNacionalConTendencia(
  pool: ReturnType<typeof getPool>,
  metrica: string,
  entidad: string,
  // RestAliv/RestSinAliv: XM publica con ~3 días de rezago; mientras tanto la
  // fila del día queda en 0 (todas las horas NaN) en vez de ausente — un "0.0"
  // reciente ahí no es un valor real, es "aún sin publicar". Para esas 2
  // métricas se pide la fecha más reciente con valor ≠ 0, para no mostrar ese
  // cero falso como si fuera el dato del día. Otras métricas (demanda no
  // atendida, intercambios) sí pueden ser legítimamente 0 cualquier día, así
  // que no aplican este filtro.
  excluirCerosRecientes = false,
): Promise<MetricaConTendencia> {
  const filtroValor = excluirCerosRecientes
    ? `
      SELECT fecha, valor, unidad FROM (
        SELECT fecha, SUM(valor_gwh) as valor, MIN(unidad) as unidad
        FROM sector_energetico.metrics
        WHERE metrica = $1 AND entidad = $2
        GROUP BY fecha
      ) t
      WHERE valor <> 0
      ORDER BY fecha DESC
      LIMIT 1
    `
    : `
      SELECT fecha, SUM(valor_gwh) as valor, MIN(unidad) as unidad
      FROM sector_energetico.metrics
      WHERE metrica = $1 AND entidad = $2
        AND fecha = (SELECT MAX(fecha) FROM sector_energetico.metrics WHERE metrica = $1 AND entidad = $2)
      GROUP BY fecha
    `;

  let actualRes = await pool.query<{ fecha: Date; valor: number; unidad: string | null }>(
    filtroValor,
    [metrica, entidad],
  );

  // Respaldo: si todo el histórico es 0 (o no hay filas ≠0), usar la fecha
  // más reciente sin más — mejor mostrar un 0 real que no mostrar nada.
  if (excluirCerosRecientes && actualRes.rows.length === 0) {
    actualRes = await pool.query<{ fecha: Date; valor: number; unidad: string | null }>(
      `
        SELECT fecha, SUM(valor_gwh) as valor, MIN(unidad) as unidad
        FROM sector_energetico.metrics
        WHERE metrica = $1 AND entidad = $2
          AND fecha = (SELECT MAX(fecha) FROM sector_energetico.metrics WHERE metrica = $1 AND entidad = $2)
        GROUP BY fecha
      `,
      [metrica, entidad],
    );
  }

  const fecha = actualRes.rows[0]?.fecha ?? null;
  const actual = Number(actualRes.rows[0]?.valor ?? 0);
  const unidad = actualRes.rows[0]?.unidad ?? null;

  if (!fecha) {
    return { fecha: null, actual: 0, hace7d: null, cambio7d: null, unidad: null };
  }

  const hace7dRes = await pool.query<{ valor: number }>(
    `
      SELECT SUM(valor_gwh) as valor
      FROM sector_energetico.metrics
      WHERE metrica = $1 AND entidad = $2
        AND fecha = $3::date - INTERVAL '7 days'
    `,
    [metrica, entidad, fecha],
  );
  const hace7d = hace7dRes.rows[0]?.valor != null ? Number(hace7dRes.rows[0].valor) : null;
  const cambio7d = hace7d !== null ? Number((actual - hace7d).toFixed(4)) : null;

  // Valores sin redondear todavía — el redondeo final depende de la unidad de
  // presentación (ver `aMwh`), y redondear aquí perdería precisión antes de
  // convertir GWh → MWh.
  return {
    fecha: fecha.toISOString().split("T")[0],
    actual,
    hace7d,
    cambio7d,
    unidad,
  };
}

/**
 * Convierte una métrica en GWh a MWh para legibilidad — 0.02 GWh ("casi cero")
 * se lee mucho mejor como 20 MWh. Métricas en COP/Millones COP no se tocan.
 */
function aMwh(m: MetricaConTendencia): MetricaConTendencia {
  if (m.unidad !== "GWh") {
    return {
      ...m,
      actual: Number(m.actual.toFixed(2)),
      hace7d: m.hace7d !== null ? Number(m.hace7d.toFixed(2)) : null,
      cambio7d: m.cambio7d !== null ? Number(m.cambio7d.toFixed(2)) : null,
    };
  }
  return {
    ...m,
    actual: Number((m.actual * 1000).toFixed(1)),
    hace7d: m.hace7d !== null ? Number((m.hace7d * 1000).toFixed(1)) : null,
    cambio7d: m.cambio7d !== null ? Number((m.cambio7d * 1000).toFixed(1)) : null,
    unidad: "MWh",
  };
}

export async function GET() {
  const pool = getPool();
  try {
    const [demaNoAtenProg, demaNoAtenNoProg, restAliv, restSinAliv, expoEner, impoEner] =
      await Promise.all([
        metricaNacionalConTendencia(pool, "DemaNoAtenProg", "Area"),
        metricaNacionalConTendencia(pool, "DemaNoAtenNoProg", "Area"),
        // RestAliv: sus ceros recientes son datos reales y confirmados (24/24
        // horas publicadas) — no aplica el filtro de "hueco de publicación".
        metricaNacionalConTendencia(pool, "RestAliv", "Sistema", false),
        // RestSinAliv: sus ceros recientes son 24/24 horas NaN (XM aún no
        // publica) — sí aplica el filtro.
        metricaNacionalConTendencia(pool, "RestSinAliv", "Sistema", true),
        metricaNacionalConTendencia(pool, "ExpoEner", "Sistema"),
        metricaNacionalConTendencia(pool, "ImpoEner", "Sistema"),
      ]);

    return NextResponse.json({
      demandaNoAtendida: {
        programada: aMwh(demaNoAtenProg),
        noProgramada: aMwh(demaNoAtenNoProg),
      },
      restricciones: {
        aliviadas: aMwh(restAliv),
        sinAliviar: aMwh(restSinAliv),
      },
      intercambios: {
        exportaciones: aMwh(expoEner),
        importaciones: aMwh(impoEner),
      },
    });
  } catch (err) {
    console.error("[api/sector/operativas]", err);
    return NextResponse.json({ error: "Error al obtener datos operativos del sector" }, { status: 500 });
  }
}
