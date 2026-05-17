import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * API de Evolución del Costo Unitario (CU).
 * Devuelve datos históricos de cu_daily para la gráfica de evolución del CU
 * en la sub-ficha "Portal Energético" de la home page.
 */
export async function GET() {
  const pool = getPool();
  try {
    // ── Últimos 60 días (para gráfica diaria en home) ──
    const dailyRes = await pool.query<{
      fecha: Date;
      componente_g: number;
      componente_t: number;
      componente_d: number;
      componente_c: number;
      componente_p: number;
      componente_r: number | null;
      cu_total: number;
    }>(`
      SELECT fecha,
             componente_g, componente_t, componente_d,
             componente_c, componente_p, componente_r,
             cu_total
      FROM sector_energetico.cu_daily
      WHERE fecha >= CURRENT_DATE - INTERVAL '60 days'
      ORDER BY fecha ASC
    `);

    // ── Últimos 12 meses agregados mensualmente (para vista mensual) ──
    const monthlyRes = await pool.query<{
      mes: string;
      componente_g: number;
      componente_t: number;
      componente_d: number;
      componente_c: number;
      componente_p: number;
      componente_r: number | null;
      cu_total: number;
    }>(`
      SELECT DATE_TRUNC('month', fecha)::date as mes,
             ROUND(AVG(componente_g)::numeric, 4) as componente_g,
             ROUND(AVG(componente_t)::numeric, 4) as componente_t,
             ROUND(AVG(componente_d)::numeric, 4) as componente_d,
             ROUND(AVG(componente_c)::numeric, 4) as componente_c,
             ROUND(AVG(componente_p)::numeric, 4) as componente_p,
             ROUND(AVG(COALESCE(componente_r, 0))::numeric, 4) as componente_r,
             ROUND(AVG(cu_total)::numeric, 4) as cu_total
      FROM sector_energetico.cu_daily
      WHERE fecha >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', fecha)
      ORDER BY mes ASC
    `);

    // ── Último valor disponible (para KPIs) ──
    const latestRes = await pool.query<{
      fecha: Date;
      cu_total: number;
      componente_g: number;
      componente_t: number;
      componente_d: number;
      componente_c: number;
      componente_p: number;
      componente_r: number | null;
    }>(`
      SELECT fecha, cu_total, componente_g, componente_t,
             componente_d, componente_c, componente_p, componente_r
      FROM sector_energetico.cu_daily
      ORDER BY fecha DESC
      LIMIT 1
    `);

    const latest = latestRes.rows[0];

    // ── Formatear series para Nivo ──
    const componentes = [
      { id: "Generación", key: "componente_g", color: "#F59E0B" },
      { id: "Transmisión", key: "componente_t", color: "#3B82F6" },
      { id: "Distribución", key: "componente_d", color: "#10B981" },
      { id: "Comercialización", key: "componente_c", color: "#8B5CF6" },
      { id: "Pérdidas", key: "componente_p", color: "#EF4444" },
      { id: "Restricciones", key: "componente_r", color: "#F97316" },
    ];

    type CuRow = {
      fecha?: Date;
      mes?: string;
      componente_g: number;
      componente_t: number;
      componente_d: number;
      componente_c: number;
      componente_p: number;
      componente_r: number | null;
      cu_total: number;
    };

    const buildSeries = (rows: CuRow[]) => {
      return componentes.map((comp) => ({
        id: comp.id,
        color: comp.color,
        data: rows.map((r) => ({
          x: r.fecha ? r.fecha.toISOString().split("T")[0] : (r.mes ?? ""),
          y: parseFloat((Number((r as Record<string, unknown>)[comp.key] ?? 0)).toFixed(4)),
        })),
      }));
    };

    const buildTotalSeries = (rows: CuRow[]) => [
      {
        id: "CU Total",
        color: "#06B6D4",
        data: rows.map((r) => ({
          x: r.fecha ? r.fecha.toISOString().split("T")[0] : (r.mes ?? ""),
          y: parseFloat(Number(r.cu_total).toFixed(4)),
        })),
      },
    ];

    return NextResponse.json({
      daily: {
        series: buildSeries(dailyRes.rows),
        totalSeries: buildTotalSeries(dailyRes.rows),
        rows: dailyRes.rows.map((r) => ({
          fecha: r.fecha.toISOString().split("T")[0],
          componente_g: parseFloat(Number(r.componente_g).toFixed(4)),
          componente_t: parseFloat(Number(r.componente_t).toFixed(4)),
          componente_d: parseFloat(Number(r.componente_d).toFixed(4)),
          componente_c: parseFloat(Number(r.componente_c).toFixed(4)),
          componente_p: parseFloat(Number(r.componente_p).toFixed(4)),
          componente_r: r.componente_r ? parseFloat(Number(r.componente_r).toFixed(4)) : null,
          cu_total: parseFloat(Number(r.cu_total).toFixed(4)),
        })),
      },
      monthly: {
        series: buildSeries(monthlyRes.rows),
        totalSeries: buildTotalSeries(monthlyRes.rows),
        rows: monthlyRes.rows.map((r) => ({
          mes: r.mes,
          componente_g: parseFloat(Number(r.componente_g).toFixed(4)),
          componente_t: parseFloat(Number(r.componente_t).toFixed(4)),
          componente_d: parseFloat(Number(r.componente_d).toFixed(4)),
          componente_c: parseFloat(Number(r.componente_c).toFixed(4)),
          componente_p: parseFloat(Number(r.componente_p).toFixed(4)),
          componente_r: r.componente_r ? parseFloat(Number(r.componente_r).toFixed(4)) : null,
          cu_total: parseFloat(Number(r.cu_total).toFixed(4)),
        })),
      },
      latest: latest
        ? {
            fecha: latest.fecha.toISOString().split("T")[0],
            cu_total: parseFloat(Number(latest.cu_total).toFixed(2)),
            cu_usuario_final: parseFloat((Number(latest.cu_total) * 1.42).toFixed(2)),
            componentes: {
              g: parseFloat(Number(latest.componente_g).toFixed(4)),
              t: parseFloat(Number(latest.componente_t).toFixed(4)),
              d: parseFloat(Number(latest.componente_d).toFixed(4)),
              c: parseFloat(Number(latest.componente_c).toFixed(4)),
              p: parseFloat(Number(latest.componente_p).toFixed(4)),
              r: latest.componente_r ? parseFloat(Number(latest.componente_r).toFixed(4)) : null,
            },
          }
        : null,
    });
  } catch (err) {
    console.error("[api/cu-evolucion] Error:", err);
    return NextResponse.json(
      { error: "Error al obtener evolución del CU" },
      { status: 500 }
    );
  }
}
