import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { mesOrderCaseSql } from "@/lib/format";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const programa = searchParams.getAll("programa");
  const departamento = searchParams.getAll("departamento");
  const mes = searchParams.getAll("mes");
  const tipo = searchParams.getAll("tipo");
  const contratista = searchParams.getAll("contratista");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = (page - 1) * limit;

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

    const [dataResult, countResult, totalsResult] = await Promise.all([
      pool.query(
        `SELECT
          programa  AS programa,
          contratista_entidad AS contratista,
          departamento  AS departamento,
          municipio  AS municipio,
          tipo_de_solucion  AS tipo_solucion,
          inversion  AS inversion,
          mes AS mes,
          planeado_usuarios AS planeado_usuarios,
          ejecutado_usuarios AS ejecutado_usuarios,
          capacidad_kwp_planeada AS kwp_planeado,
          capacidad_kwp_ejecutada AS kwp_ejecutado
         FROM colombia_solar.base
         WHERE ${where}
         ORDER BY programa, contratista_entidad, departamento, municipio, ${mesOrderCaseSql("mes")}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM colombia_solar.base WHERE ${where}`,
        values
      ),
      pool.query(
        `SELECT
          COALESCE(SUM(planeado_usuarios::numeric), 0) AS planeado_usuarios,
          COALESCE(SUM(ejecutado_usuarios::numeric), 0) AS ejecutado_usuarios,
          COALESCE(SUM(capacidad_kwp_planeada::numeric), 0) AS kwp_planeado,
          COALESCE(SUM(capacidad_kwp_ejecutada::numeric), 0) AS kwp_ejecutado,
          COALESCE(SUM(inversion::numeric), 0) AS inversion
         FROM colombia_solar.base
         WHERE ${where}`,
        values
      ),
    ]);

    return NextResponse.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
      totals: totalsResult.rows[0],
    });
  } catch (error) {
    console.error("[/api/tabla]", error);
    return NextResponse.json({ error: "Error al obtener tabla" }, { status: 500 });
  }
}
