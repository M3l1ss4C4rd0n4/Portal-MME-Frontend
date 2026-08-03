import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const DIAS_PRODUCCION = 30;
const DIAS_COMMODITIES = 90;

export async function GET() {
  try {
    const pool = getPool();

    const produccionResult = await pool.query(
      `SELECT fecha, petroleo_bbl, gas_fiscalizado_mpc, gas_comercializado_mpc
       FROM hidrocarburos.produccion_diaria
       ORDER BY fecha DESC
       LIMIT $1`,
      [DIAS_PRODUCCION]
    );

    // produccion_top5 ahora acumula histórico por periodo (YYYY-MM) — filtrar
    // por el mes más reciente para no mezclar cortes de distintos meses.
    const top5Result = await pool.query(
      `SELECT mes, categoria, nombre, valor, unidad
       FROM hidrocarburos.produccion_top5
       WHERE periodo = (SELECT MAX(periodo) FROM hidrocarburos.produccion_top5)
       ORDER BY categoria, valor DESC`
    );

    const commoditiesResult = await pool.query(
      `SELECT fecha, commodity, valor_usd, variacion_abs, variacion_pct, fecha_carga
       FROM hidrocarburos.commodities_historico
       WHERE fecha >= CURRENT_DATE - $1::int
       ORDER BY commodity, fecha ASC`,
      [DIAS_COMMODITIES]
    );

    const commodities: Record<
      string,
      {
        valorUsd: number | null;
        variacionAbs: number | null;
        variacionPct: number | null;
        fecha: string | null;
        fechaCarga: string | null;
        historico: Array<{ fecha: string; valor: number }>;
      }
    > = {};

    for (const row of commoditiesResult.rows) {
      const key = String(row.commodity).toLowerCase();
      if (!commodities[key]) {
        commodities[key] = { valorUsd: null, variacionAbs: null, variacionPct: null, fecha: null, fechaCarga: null, historico: [] };
      }
      commodities[key].historico.push({ fecha: row.fecha, valor: Number(row.valor_usd) });
      commodities[key].valorUsd = Number(row.valor_usd);
      commodities[key].variacionAbs = row.variacion_abs !== null ? Number(row.variacion_abs) : null;
      commodities[key].variacionPct = row.variacion_pct !== null ? Number(row.variacion_pct) : null;
      commodities[key].fecha = row.fecha;
      commodities[key].fechaCarga = row.fecha_carga;
    }

    // node-postgres devuelve columnas NUMERIC como string — convertir a number
    const produccionDiaria = produccionResult.rows.reverse().map((r) => ({
      fecha: r.fecha,
      petroleo_bbl: Number(r.petroleo_bbl),
      gas_fiscalizado_mpc: Number(r.gas_fiscalizado_mpc),
      gas_comercializado_mpc: Number(r.gas_comercializado_mpc),
    }));
    const top5 = top5Result.rows.map((r) => ({
      mes: r.mes,
      categoria: r.categoria,
      nombre: r.nombre,
      valor: Number(r.valor),
      unidad: r.unidad,
    }));

    // Brecha entre gas fiscalizado y comercializado (volumen que no se
    // comercializa: reinyección, consumo propio, quema, pérdidas) — hallazgo
    // no obvio del último dato disponible, útil como KPI dedicado.
    const ultimo = produccionDiaria[produccionDiaria.length - 1];
    const brecha = ultimo
      ? {
          mpcd: ultimo.gas_fiscalizado_mpc - ultimo.gas_comercializado_mpc,
          pct:
            ultimo.gas_fiscalizado_mpc > 0
              ? ((ultimo.gas_fiscalizado_mpc - ultimo.gas_comercializado_mpc) / ultimo.gas_fiscalizado_mpc) * 100
              : null,
        }
      : null;

    return NextResponse.json({ produccionDiaria, top5, commodities, brecha });
  } catch (err) {
    console.error("[api/hidrocarburos/produccion]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
