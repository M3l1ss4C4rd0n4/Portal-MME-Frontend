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
    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error("[api/subsidios/deficit-historico]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
