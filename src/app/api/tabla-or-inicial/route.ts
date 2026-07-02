import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const departamentos = searchParams.getAll("departamento");

    const whereClauses = ["n::text <> 'TOTAL'"];
    const values: any[] = [];
    let paramIdx = 1;

    if (departamentos.length > 0) {
      whereClauses.push(`departamento = ANY($${paramIdx}::text[])`);
      values.push(departamentos);
      paramIdx++;
    }

    const where = whereClauses.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM colombia_solar.base_general_or_inicial WHERE ${where}`,
      values
    );
    const total = Number(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const dataResult = await pool.query(
      `SELECT n, departamento, municipio, valor, n_ce, usuarios, potencia_mwp, potencia_kwp, or_generador, tipo_de_proyecto, zona
       FROM colombia_solar.base_general_or_inicial
       WHERE ${where}
       ORDER BY id
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...values, limit, offset]
    );

    const totalsResult = await pool.query(
      `SELECT 
        SUM(valor) as total_valor,
        SUM(n_ce) as total_n_ce,
        SUM(usuarios) as total_usuarios,
        SUM(potencia_mwp) as total_potencia_mwp,
        SUM(potencia_kwp) as total_potencia_kwp
       FROM colombia_solar.base_general_or_inicial
       WHERE ${where}`,
      values
    );

    return Response.json({
      data: dataResult.rows,
      total,
      totals: totalsResult.rows[0],
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Error tabla OR inicial:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
