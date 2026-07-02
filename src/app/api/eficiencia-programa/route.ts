import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const departamento = searchParams.getAll("departamento");
  const mes = searchParams.getAll("mes");
  const tipo = searchParams.getAll("tipo");
  const contratista = searchParams.getAll("contratista");

  try {
    const pool = getPool();
    const conditions: string[] = ["programa IS NOT NULL"];
    const values: (string | string[])[] = [];
    let idx = 1;

    if (departamento.length > 0) { conditions.push(`departamento = ANY($${idx++}::text[])`); values.push(departamento); }
    if (mes.length > 0) { conditions.push(`mes = ANY($${idx++}::text[])`); values.push(mes); }
    if (tipo.length > 0) { conditions.push(`tipo_de_solucion = ANY($${idx++}::text[])`); values.push(tipo); }
    if (contratista.length > 0) { conditions.push(`contratista_entidad = ANY($${idx++}::text[])`); values.push(contratista); }

    const where = conditions.join(" AND ");
    const result = await pool.query(
      `SELECT
        programa AS programa,
        SUM(planeado_usuarios::numeric) AS planeado,
        SUM(ejecutado_usuarios::numeric) AS ejecutado,
        COALESCE(ROUND(AVG(
          CASE WHEN planeado_usuarios::numeric > 0
            THEN (ejecutado_usuarios::numeric / planeado_usuarios::numeric) * 100
            ELSE 0
          END
        ), 2), 0) AS eficiencia_pct
       FROM colombia_solar.base
       WHERE ${where}
       GROUP BY programa
       ORDER BY eficiencia_pct DESC`,
      values
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error("[/api/eficiencia-programa]", error);
    return NextResponse.json({ error: "Error al obtener eficiencia por programa" }, { status: 500 });
  }
}
