import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/* ─── SQL helpers ─────────────────────────────────────────────────────────── */

// Mapear estado_validacion → código estándar cuando estado_validacion_organizado es NULL
const ESTADO_SQL = `
  CASE
    WHEN sv.estado_validacion_organizado IS NOT NULL THEN sv.estado_validacion_organizado
    WHEN sv.estado_validacion = 'VF'    THEN 'e. VF'
    WHEN sv.estado_validacion = 'VP'    THEN 'd. VP'
    WHEN sv.estado_validacion = 'VI'    THEN 'b. VI'
    WHEN sv.estado_validacion = 'VI SP' THEN 'c. VI SP'
    ELSE 'a. Otros'
  END
`;

// Mapear area: FOES con NA → SIN
const AREA_SQL = `
  CASE
    WHEN sv.area = 'NA' AND sv.fondo = 'FOES' THEN 'SIN'
    ELSE sv.area
  END
`;

/* ─── Helpers para construir WHERE reutilizable ─────────────────────────── */

interface FilterParams {
  fondo?: string | null;
  area?: string | null;
  anioDesde?: number | null;
  anioHasta?: number | null;
  trimestre?: number | null;
  prestador?: string | null;
  departamento?: string | null;
  fechaActualizacion: string; // YYYY-MM — siempre requerido
}

function buildWhere(
  p: FilterParams,
  exclude?: "fondo" | "area" | "anio" | "trimestre" | "prestador" | "departamento"
) {
  const conditions = [
    `${AREA_SQL} IN ('SIN', 'ZNI')`,
    "sv.trimestre IS NOT NULL",
    "(sv.estado_validacion IS NOT NULL OR sv.estado_validacion_organizado IS NOT NULL)",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];

  // Fecha de actualización SIEMPRE se aplica (nunca se excluye)
  const [faAnio, faMes] = p.fechaActualizacion.split("-").map(Number);
  values.push(faAnio);
  conditions.push(`EXTRACT(YEAR FROM sv.fecha_actualizacion) = $${values.length}`);
  values.push(faMes);
  conditions.push(`EXTRACT(MONTH FROM sv.fecha_actualizacion) = $${values.length}`);

  if (p.fondo && exclude !== "fondo") {
    values.push(p.fondo);
    conditions.push(`sv.fondo = $${values.length}`);
  }
  if (p.area && exclude !== "area") {
    values.push(p.area);
    conditions.push(`${AREA_SQL} = $${values.length}`);
  }
  if (p.anioDesde && exclude !== "anio") {
    values.push(p.anioDesde);
    conditions.push(`sv.anio >= $${values.length}`);
  }
  if (p.anioHasta && exclude !== "anio") {
    values.push(p.anioHasta);
    conditions.push(`sv.anio <= $${values.length}`);
  }
  if (p.trimestre && exclude !== "trimestre") {
    values.push(p.trimestre);
    conditions.push(`sv.trimestre = $${values.length}`);
  }
  if (p.prestador && exclude !== "prestador") {
    values.push(`%${p.prestador}%`);
    conditions.push(`sv.nombre_prestador ILIKE $${values.length}`);
  }
  if (p.departamento && exclude !== "departamento") {
    values.push(p.departamento);
    conditions.push(`se.departamento = $${values.length}`);
  }

  return { where: conditions.join(" AND "), values };
}

/* ─── Handler GET ───────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(request.url);

    let fechaActualizacion = searchParams.get("fechaActualizacion");

    // Si no se proporciona fecha, usar la más reciente disponible en la tabla
    if (!fechaActualizacion) {
      const ultimaRes = await pool.query(
        `SELECT MAX(fecha_actualizacion) AS ultima FROM subsidios.subsidios_validaciones`
      );
      const ultima = ultimaRes.rows[0]?.ultima;
      if (ultima) {
        const d = new Date(ultima);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        fechaActualizacion = `${yyyy}-${mm}`;
      } else {
        // No hay datos en la tabla, devolver respuesta vacía
        return NextResponse.json({
          serie: [],
          resumen: {},
          ultimaActualizacion: null,
          filtros: {
            fondos: [],
            anios: [],
            trimestres: [],
            prestadores: [],
            departamentos: [],
            fechasActualizacion: [],
          },
        });
      }
    }

    const p: FilterParams = {
      fechaActualizacion,
      fondo: searchParams.get("fondo") || null,
      area: searchParams.get("area") || null,
      anioDesde: searchParams.get("anioDesde") ? Number(searchParams.get("anioDesde")) : null,
      anioHasta: searchParams.get("anioHasta") ? Number(searchParams.get("anioHasta")) : null,
      trimestre: searchParams.get("trimestre") ? Number(searchParams.get("trimestre")) : null,
      prestador: searchParams.get("prestador") || null,
      departamento: searchParams.get("departamento") || null,
    };

    /* ── Serie histórica (conteo por área / año / trimestre / estado) ───── */
    const serieWhere = buildWhere(p);
    const serieRes = await pool.query(
      `
      SELECT
        ${AREA_SQL} AS area,
        sv.anio,
        sv.trimestre,
        ${ESTADO_SQL} AS estado,
        COUNT(*)::int AS conteo
      FROM subsidios.subsidios_validaciones sv
      LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
      WHERE ${serieWhere.where}
      GROUP BY ${AREA_SQL}, sv.anio, sv.trimestre, ${ESTADO_SQL}
      ORDER BY ${AREA_SQL}, sv.anio, sv.trimestre, ${ESTADO_SQL}
      `,
      serieWhere.values
    );

    /* ── Resumen KPIs (totales por estado, respeta todos los filtros) ───── */
    const resumenWhere = buildWhere(p);
    const resumenRes = await pool.query(
      `
      SELECT ${ESTADO_SQL} AS estado, COUNT(*)::int AS total
      FROM subsidios.subsidios_validaciones sv
      LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
      WHERE ${resumenWhere.where}
      GROUP BY ${ESTADO_SQL}
      ORDER BY ${ESTADO_SQL}
      `,
      resumenWhere.values
    );

    /* ── Resumen por FONDO/ÁREA (para gráficos separados en home) ─────────
       FOES = fondo FOES
       ZNI  = área ZNI (cualquier fondo)
       SIN  = área SIN (cualquier fondo)                                      */
    const resumenPorFondo: Record<string, Record<string, number>> = {};
    
    // FOES: filtrar por fondo
    const foesWhere = buildWhere({ ...p, fondo: 'FOES' }, "fondo");
    const foesRes = await pool.query(
      `
      SELECT ${ESTADO_SQL} AS estado, COUNT(*)::int AS total
      FROM subsidios.subsidios_validaciones sv
      LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
      WHERE ${foesWhere.where} AND sv.fondo = 'FOES'
      GROUP BY ${ESTADO_SQL}
      ORDER BY ${ESTADO_SQL}
      `,
      foesWhere.values
    );
    resumenPorFondo['FOES'] = {};
    for (const r of foesRes.rows) resumenPorFondo['FOES'][r.estado] = r.total;
    
    // ZNI: filtrar por área
    const zniWhere = buildWhere({ ...p, area: 'ZNI' }, "area");
    const zniRes = await pool.query(
      `
      SELECT ${ESTADO_SQL} AS estado, COUNT(*)::int AS total
      FROM subsidios.subsidios_validaciones sv
      LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
      WHERE ${zniWhere.where} AND ${AREA_SQL} = 'ZNI'
      GROUP BY ${ESTADO_SQL}
      ORDER BY ${ESTADO_SQL}
      `,
      zniWhere.values
    );
    resumenPorFondo['ZNI'] = {};
    for (const r of zniRes.rows) resumenPorFondo['ZNI'][r.estado] = r.total;
    
    // SIN: filtrar por área
    const sinWhere = buildWhere({ ...p, area: 'SIN' }, "area");
    const sinRes = await pool.query(
      `
      SELECT ${ESTADO_SQL} AS estado, COUNT(*)::int AS total
      FROM subsidios.subsidios_validaciones sv
      LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
      WHERE ${sinWhere.where} AND ${AREA_SQL} = 'SIN'
      GROUP BY ${ESTADO_SQL}
      ORDER BY ${ESTADO_SQL}
      `,
      sinWhere.values
    );
    resumenPorFondo['SIN'] = {};
    for (const r of sinRes.rows) resumenPorFondo['SIN'][r.estado] = r.total;

    /* ── Opciones de filtros con dependencias cruzadas ────────────────────
       Cada lista se calcula aplicando: fechaActualizacion +
       TODOS los filtros EXCEPTO el propio                            */

    // Fondos disponibles
    const fondosWhere = buildWhere(p, "fondo");
    const fondosRes = await pool.query(
      `SELECT DISTINCT sv.fondo FROM subsidios.subsidios_validaciones sv
       LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
       WHERE ${fondosWhere.where} AND sv.fondo IS NOT NULL
       ORDER BY sv.fondo`,
      fondosWhere.values
    );

    // Años disponibles
    const aniosWhere = buildWhere(p, "anio");
    const aniosRes = await pool.query(
      `SELECT DISTINCT sv.anio FROM subsidios.subsidios_validaciones sv
       LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
       WHERE ${aniosWhere.where} AND sv.anio IS NOT NULL
       ORDER BY sv.anio`,
      aniosWhere.values
    );

    // Trimestres disponibles
    const trimWhere = buildWhere(p, "trimestre");
    const trimRes = await pool.query(
      `SELECT DISTINCT sv.trimestre FROM subsidios.subsidios_validaciones sv
       LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
       WHERE ${trimWhere.where} AND sv.trimestre IS NOT NULL
       ORDER BY sv.trimestre`,
      trimWhere.values
    );

    // Prestadores disponibles
    const prestWhere = buildWhere(p, "prestador");
    const prestadoresRes = await pool.query(
      `SELECT DISTINCT sv.nombre_prestador FROM subsidios.subsidios_validaciones sv
       LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
       WHERE ${prestWhere.where} AND sv.nombre_prestador IS NOT NULL
       ORDER BY sv.nombre_prestador`,
      prestWhere.values
    );

    // Departamentos disponibles
    const deptoWhere = buildWhere(p, "departamento");
    const deptosRes = await pool.query(
      `SELECT DISTINCT se.departamento
       FROM subsidios.subsidios_validaciones sv
       LEFT JOIN subsidios.subsidios_empresas se ON sv.codigo_sui = se.codigo_sui
       WHERE ${deptoWhere.where} AND se.departamento IS NOT NULL
       ORDER BY se.departamento`,
      deptoWhere.values
    );

    /* ── Todas las fechas de actualización (SIN filtros cruzados) ─────────
       El usuario debe poder elegir cualquier carga que exista en la DB    */
    const fechasRes = await pool.query(
      `SELECT DISTINCT
         EXTRACT(YEAR FROM fecha_actualizacion)::int AS anio,
         EXTRACT(MONTH FROM fecha_actualizacion)::int AS mes
       FROM subsidios.subsidios_validaciones
       WHERE fecha_actualizacion IS NOT NULL
       ORDER BY anio DESC, mes DESC`
    );

    /* ── Última actualización global ────────────────────────────────────── */
    const ultimaActRes = await pool.query(
      `SELECT MAX(fecha_actualizacion) AS ultima FROM subsidios.subsidios_validaciones`
    );

    /* ── Respuesta ──────────────────────────────────────────────────────── */
    const resumen: Record<string, number> = {};
    for (const r of resumenRes.rows) resumen[r.estado] = r.total;

    return NextResponse.json({
      serie: serieRes.rows,
      resumen,
      resumenPorFondo,
      ultimaActualizacion: ultimaActRes.rows[0]?.ultima ?? null,
      filtros: {
        fondos: fondosRes.rows.map((r) => r.fondo),
        anios: aniosRes.rows.map((r) => Number(r.anio)),
        trimestres: trimRes.rows.map((r) => String(r.trimestre)),
        prestadores: prestadoresRes.rows.map((r) => r.nombre_prestador),
        departamentos: deptosRes.rows.map((r) => r.departamento),
        fechasActualizacion: fechasRes.rows.map((r) => ({
          anio: Number(r.anio),
          mes: Number(r.mes),
        })),
      },
    });
  } catch (err) {
    console.error("[api/subsidios/validaciones]", err);
    return NextResponse.json({ error: "Error al obtener validaciones" }, { status: 500 });
  }
}
