import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const MES_ORDER: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const programa = searchParams.getAll("programa");
  const departamento = searchParams.getAll("departamento");
  const mes = searchParams.getAll("mes");
  const tipo = searchParams.getAll("tipo");
  const contratista = searchParams.getAll("contratista");

  try {
    const pool = getPool();
    const conditions: string[] = ["mes IS NOT NULL"];
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
        mes AS mes,
        SUM(planeado_usuarios::numeric) AS planeado,
        SUM(ejecutado_usuarios::numeric) AS ejecutado
       FROM colombia_solar.base
       WHERE ${where}
       GROUP BY mes
       ORDER BY mes`,
      values
    );

    const sorted = result.rows.sort(
      (a, b) => (MES_ORDER[a.mes] ?? 99) - (MES_ORDER[b.mes] ?? 99)
    );

    return NextResponse.json({ data: sorted });
  } catch (error) {
    console.error("[/api/chart-mensual]", error);
    return NextResponse.json({ error: "Error al obtener datos mensuales" }, { status: 500 });
  }
}
