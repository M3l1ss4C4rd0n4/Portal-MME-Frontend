import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(request.url);
    const fondo      = searchParams.get("fondo");
    const area       = searchParams.get("area");
    const anioDes    = searchParams.get("anioDesde") ? Number(searchParams.get("anioDesde")) : null;
    const anioHas    = searchParams.get("anioHasta") ? Number(searchParams.get("anioHasta")) : null;
    const prestador  = searchParams.get("prestador");
    const depto      = searchParams.get("departamento");

    const filtros: string[] = [
      "sv.estado_validacion_organizado IS NOT NULL",
      "sv.area IN ('SIN', 'ZNI')",
      "sv.trimestre IS NOT NULL",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (fondo)     { params.push(fondo);            filtros.push(`sv.fondo = $${params.length}`); }
    if (area)      { params.push(area);             filtros.push(`sv.area = $${params.length}`); }
    if (anioDes)   { params.push(anioDes);          filtros.push(`sv.anio >= $${params.length}`); }
    if (anioHas)   { params.push(anioHas);          filtros.push(`sv.anio <= $${params.length}`); }
    if (prestador) { params.push(`%${prestador}%`); filtros.push(`sv.nombre_prestador ILIKE $${params.length}`); }
    if (depto)     { params.push(depto);            filtros.push(`se.departamento = $${params.length}`); }

    const where = filtros.join(" AND ");
    const joinDepto = depto ? "LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui" : "";

    // Serie: conteo por area / anio / trimestre / estado_organizado
    const serieRes = await pool.query(`
      SELECT
        sv.area,
        sv.anio,
        sv.trimestre,
        sv.estado_validacion_organizado AS estado,
        COUNT(*)::int AS conteo
      FROM subsidios.subsidios_validaciones sv
      ${joinDepto}
      WHERE ${where}
      GROUP BY sv.area, sv.anio, sv.trimestre, sv.estado_validacion_organizado
      ORDER BY sv.area, sv.anio, sv.trimestre, sv.estado_validacion_organizado
    `, params);

    // Resumen KPIs (sin filtro de depto para no complejizar la query)
    const resumenRes = await pool.query(`
      SELECT estado_validacion_organizado AS estado, COUNT(*)::int AS total
      FROM subsidios.subsidios_validaciones
      WHERE area IN ('SIN','ZNI') AND estado_validacion_organizado IS NOT NULL
      GROUP BY estado_validacion_organizado
      ORDER BY estado_validacion_organizado
    `);

    const [fondosRes, aniosRes, prestadoresRes, deptosRes] = await Promise.all([
      pool.query(`SELECT DISTINCT fondo FROM subsidios.subsidios_validaciones WHERE fondo IS NOT NULL ORDER BY fondo`),
      pool.query(`SELECT DISTINCT anio FROM subsidios.subsidios_validaciones WHERE anio IS NOT NULL AND area IN ('SIN','ZNI') ORDER BY anio`),
      pool.query(`SELECT DISTINCT nombre_prestador FROM subsidios.subsidios_validaciones WHERE nombre_prestador IS NOT NULL AND area IN ('SIN','ZNI') ORDER BY nombre_prestador`),
      pool.query(`SELECT DISTINCT departamento FROM subsidios.subsidios_empresas WHERE departamento IS NOT NULL ORDER BY departamento`),
    ]);

    const ultimaActRes = await pool.query(`SELECT MAX(fecha_actualizacion) AS ultima FROM subsidios.subsidios_validaciones`);

    const resumen: Record<string, number> = {};
    for (const r of resumenRes.rows) resumen[r.estado] = r.total;

    return NextResponse.json({
      serie: serieRes.rows,
      resumen,
      ultimaActualizacion: ultimaActRes.rows[0]?.ultima ?? null,
      filtros: {
        fondos:       fondosRes.rows.map((r) => r.fondo),
        anios:        aniosRes.rows.map((r) => Number(r.anio)),
        prestadores:  prestadoresRes.rows.map((r) => r.nombre_prestador),
        departamentos: deptosRes.rows.map((r) => r.departamento),
      },
    });
  } catch (err) {
    console.error("[api/subsidios/validaciones]", err);
    return NextResponse.json({ error: "Error al obtener validaciones" }, { status: 500 });
  }
}
