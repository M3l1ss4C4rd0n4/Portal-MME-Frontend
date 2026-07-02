import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT anio, subsidios, contribuciones, deficit_anual, deficit_acumulado,
              apropiacion_pgn, recursos_faltantes
       FROM subsidios.deficit_historico
       ORDER BY anio`
    );
    const fechaResult = await pool.query(
      `SELECT MAX(fecha_carga) as ultima FROM subsidios.deficit_historico`
    );
    const ultima = fechaResult.rows[0]?.ultima;
    const ultimaStr = ultima
      ? new Date(ultima).toLocaleString("es-CO", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : null;
    return NextResponse.json({
      ultima_actualizacion: ultimaStr,
      data: result.rows,
    });
  } catch (err) {
    console.error("[api/subsidios/deficit-historico]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
