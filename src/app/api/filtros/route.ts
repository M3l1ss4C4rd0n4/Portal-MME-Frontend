import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    const [programas, departamentos, meses, tipos, contratistas] = await Promise.all([
      pool.query("SELECT DISTINCT programa AS val FROM colombia_solar.base WHERE programa IS NOT NULL ORDER BY 1"),
      pool.query("SELECT DISTINCT departamento AS val FROM colombia_solar.base WHERE departamento IS NOT NULL ORDER BY 1"),
      pool.query("SELECT DISTINCT mes AS val FROM colombia_solar.base WHERE mes IS NOT NULL ORDER BY 1"),
      pool.query("SELECT DISTINCT tipo_de_solucion AS val FROM colombia_solar.base WHERE tipo_de_solucion IS NOT NULL ORDER BY 1"),
      pool.query("SELECT DISTINCT contratista_entidad AS val FROM colombia_solar.base WHERE contratista_entidad IS NOT NULL ORDER BY 1"),
    ]);

    const MES_ORDER: Record<string, number> = {
      Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
      Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
    };

    return NextResponse.json({
      programas: programas.rows.map((r) => r.val),
      departamentos: departamentos.rows.map((r) => r.val),
      meses: meses.rows.map((r) => r.val).sort((a, b) => (MES_ORDER[a] ?? 99) - (MES_ORDER[b] ?? 99)),
      tipos: tipos.rows.map((r) => r.val),
      contratistas: contratistas.rows.map((r) => r.val),
    });
  } catch (error) {
    console.error("[/api/filtros]", error);
    return NextResponse.json({ error: "Error al obtener filtros" }, { status: 500 });
  }
}
