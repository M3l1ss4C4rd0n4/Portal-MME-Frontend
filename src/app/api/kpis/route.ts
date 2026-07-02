import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const programa = searchParams.getAll("programa");
  const departamento = searchParams.getAll("departamento");
  const mes = searchParams.getAll("mes");
  const tipo = searchParams.getAll("tipo");
  const contratista = searchParams.getAll("contratista");

  try {
    const pool = getPool();
    const conditions: string[] = ["1=1"];
    const values: (string | string[])[] = [];
    let idx = 1;

    if (programa.length > 0) { conditions.push(`programa = ANY($${idx++}::text[])`); values.push(programa); }
    if (departamento.length > 0) { conditions.push(`departamento = ANY($${idx++}::text[])`); values.push(departamento); }
    if (mes.length > 0) { conditions.push(`mes = ANY($${idx++}::text[])`); values.push(mes); }
    if (tipo.length > 0) { conditions.push(`tipo_de_solucion = ANY($${idx++}::text[])`); values.push(tipo); }
    if (contratista.length > 0) { conditions.push(`contratista_entidad = ANY($${idx++}::text[])`); values.push(contratista); }

    const where = conditions.join(" AND ");
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(planeado_usuarios::numeric), 0)  AS planeado_usuarios,
        COALESCE(SUM(ejecutado_usuarios::numeric), 0)  AS ejecutado_usuarios,
        COALESCE(SUM(capacidad_kwp_planeada::numeric), 0)  AS kwp_planeado,
        COALESCE(SUM(capacidad_kwp_ejecutada::numeric), 0)  AS kwp_ejecutado,
        COALESCE(ROUND(AVG(
          CASE WHEN planeado_usuarios::numeric > 0
            THEN (ejecutado_usuarios::numeric / planeado_usuarios::numeric) * 100
            ELSE 0
          END
        ), 2), 0) AS eficiencia_pct,
        MAX(fecha_carga) AS ultima_actualizacion
       FROM colombia_solar.base WHERE ${where}`,
      values
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error("[/api/kpis]", error);
    return NextResponse.json({ error: "Error al obtener KPIs" }, { status: 500 });
  }
}
