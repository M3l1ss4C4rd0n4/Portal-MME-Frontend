import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    // presupuesto_resumen/presupuesto_proyectos ahora acumulan histórico por
    // fecha_actualizacion (antes se truncaban) — filtrar por el corte más reciente.
    const resumenResult = await pool.query(
      `SELECT fecha_actualizacion, apropiacion_vigente, compromisos, obligaciones,
              por_comprometer, pct_compromisos, pct_obligaciones
       FROM hidrocarburos.presupuesto_resumen
       ORDER BY fecha_actualizacion DESC
       LIMIT 1`
    );
    const proyectosResult = await pool.query(
      `SELECT proyecto, apropiacion_vigente, compromisos, obligaciones,
              por_comprometer, pct_compromisos, pct_obligacion
       FROM hidrocarburos.presupuesto_proyectos
       WHERE fecha_actualizacion = (SELECT MAX(fecha_actualizacion) FROM hidrocarburos.presupuesto_resumen)
       ORDER BY obligaciones DESC`
    );

    // node-postgres devuelve columnas NUMERIC como string — convertir a number
    const resumenRow = resumenResult.rows[0];
    const resumen = resumenRow
      ? {
          fecha_actualizacion: resumenRow.fecha_actualizacion,
          apropiacion_vigente: Number(resumenRow.apropiacion_vigente),
          compromisos: Number(resumenRow.compromisos),
          obligaciones: Number(resumenRow.obligaciones),
          por_comprometer: Number(resumenRow.por_comprometer),
          pct_compromisos: Number(resumenRow.pct_compromisos),
          pct_obligaciones: Number(resumenRow.pct_obligaciones),
        }
      : null;

    const proyectos = proyectosResult.rows.map((p) => ({
      proyecto: p.proyecto,
      apropiacion_vigente: Number(p.apropiacion_vigente),
      compromisos: Number(p.compromisos),
      obligaciones: Number(p.obligaciones),
      por_comprometer: Number(p.por_comprometer),
      pct_compromisos: Number(p.pct_compromisos),
      pct_obligacion: Number(p.pct_obligacion),
    }));

    return NextResponse.json({ resumen, proyectos });
  } catch (err) {
    console.error("[api/hidrocarburos/presupuesto]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
