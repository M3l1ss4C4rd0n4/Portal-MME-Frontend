import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const FISCAL_YEAR = 2026;

interface KpisRow {
  valor_asignado: string | number | null;
  valor_pagado: string | number | null;
  valor_pendiente: string | number | null;
  total_resoluciones: string | number | null;
  resoluciones_pendientes: string | number | null;
}

interface TrimestreRow {
  periodo: string;
  pagado: string | number | null;
  pendiente: string | number | null;
}

interface ResolucionRow {
  no_resolucion: number;
  anio_expedicion: number;
  valor_asignado: string | number | null;
  valor_pagado: string | number | null;
  saldo_pendiente: string | number | null;
}

interface PrestadorRow {
  nombre_prestador: string;
  saldo_pendiente: string | number | null;
}

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

/** Construye un WHERE clause seguro con parámetros posicionales del driver pg.
 *  Cada filtro se pasa como array JS (o null) y el driver lo convierte a array PostgreSQL.
 *  skipIdx: índice 1-based del filtro a omitir (para cálculo de opciones dependientes). */
function buildWhere(
  filters: [
    string[] | null,   // 1 prestadores
    number[] | null,   // 2 aniosPago
    number[] | null,   // 3 aniosExp
    string[] | null,   // 4 estadosPago
    number[] | null,   // 5 resoluciones
    number[] | null,   // 6 trimestres
    string[] | null,   // 7 areas
    string[] | null,   // 8 fondos
    string[] | null,   // 9 departamentos
  ],
  skipIdx?: number
) {
  const defs = [
    { type: "text[]", clause: "sp.nombre_prestador = ANY($IDX::text[])" },
    { type: "int[]", clause: "sp.anio = ANY($IDX::int[])" },
    { type: "int[]", clause: "LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($IDX::int[])" },
    { type: "text[]", clause: "sp.estado_pago = ANY($IDX::text[])" },
    { type: "int[]", clause: "sp.no_resolucion = ANY($IDX::int[])" },
    { type: "int[]", clause: "RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($IDX::int[])" },
    { type: "text[]", clause: "sp.area = ANY($IDX::text[])" },
    { type: "text[]", clause: "sp.fondo = ANY($IDX::text[])" },
    { type: "text[]", clause: "COALESCE(se.departamento, 'Sin departamento') = ANY($IDX::text[])" },
  ];

  let idx = 1;
  const params: (string[] | number[] | null)[] = [];
  const parts: string[] = [];

  for (let i = 0; i < defs.length; i++) {
    if (i + 1 === skipIdx) continue;
    const d = defs[i];
    const placeholder = `$${idx}::${d.type}`;
    params.push(filters[i]);
    parts.push(`(${placeholder} IS NULL OR ${d.clause.replace("$IDX", `$${idx}`)})`);
    idx++;
  }

  const where = parts.length > 0 ? "WHERE " + parts.join("\n          AND ") : "";
  return { where, params };
}

export async function GET(request: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(request.url);

    // Cada filtro acepta múltiples valores vía ?param=a&param=b
    const prestadores    = searchParams.getAll("prestador");
    const aniosPago      = searchParams.getAll("anioPago").map(Number).filter(n => !isNaN(n));
    const aniosExp       = searchParams.getAll("anioExp").map(Number).filter(n => !isNaN(n));
    const estadosPago    = searchParams.getAll("estadoPago");
    const resoluciones   = searchParams.getAll("resolucion").map(Number).filter(n => !isNaN(n));
    const trimestres     = searchParams.getAll("trimestre").map(Number).filter(n => !isNaN(n));
    const areas          = searchParams.getAll("area");
    const fondos         = searchParams.getAll("fondo");
    const departamentos  = searchParams.getAll("departamento");

    // null = sin filtro (muestra todo), array = filtrar por esos valores
    const p1 = prestadores.length   > 0 ? prestadores   : null;
    const p2 = aniosPago.length     > 0 ? aniosPago     : null;
    const p3 = aniosExp.length      > 0 ? aniosExp      : null;
    const p4 = estadosPago.length   > 0 ? estadosPago   : null;
    const p5 = resoluciones.length  > 0 ? resoluciones  : null;
    const p6 = trimestres.length    > 0 ? trimestres    : null;
    const p7 = areas.length         > 0 ? areas         : null;
    const p8 = fondos.length        > 0 ? fondos        : null;
    const p9 = departamentos.length > 0 ? departamentos : null;

    const baseFilters: [
      string[] | null, number[] | null, number[] | null,
      string[] | null, number[] | null, number[] | null,
      string[] | null, string[] | null, string[] | null,
    ] = [p1, p2, p3, p4, p5, p6, p7, p8, p9];

    // ── KPIs ──
    // Todos los KPIs se calculan directamente desde subsidios_pagos.
    // kpis_resumen ya no se usa porque subsidios_pagos (hoja Pagos)
    // produce los mismos valores tras corregir el hash de dedup.
    const { where, params } = buildWhere(baseFilters);
    const kpisRes = await pool.query<KpisRow>(`
      SELECT
        COALESCE(SUM(sp.valor_resolucion), 0) as valor_asignado,
        COALESCE(SUM(sp.valor_pagado), 0) as valor_pagado,
        COALESCE(SUM(sp.saldo_pendiente), 0) as valor_pendiente,
        COUNT(DISTINCT sp.no_resolucion) as total_resoluciones,
        COUNT(DISTINCT CASE WHEN sp.saldo_pendiente > 0 THEN sp.no_resolucion END) as resoluciones_pendientes
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${where}
    `, params);
    const kpisRow = kpisRes.rows[0];

    const valorAsignado  = toNum(kpisRow?.valor_asignado);
    const valorPagado    = toNum(kpisRow?.valor_pagado);
    const valorPendiente = toNum(kpisRow?.valor_pendiente);
    const pctPagado = valorAsignado > 0 ? (valorPagado / valorAsignado) * 100 : 0;

    // ── Trimestres ──
    const { where: whereTrim, params: paramsTrim } = buildWhere(baseFilters);
    const trimRes = await pool.query<TrimestreRow>(`
      SELECT
        sp.anio_trimestre_resolucion as periodo,
        COALESCE(SUM(sp.valor_pagado), 0) as pagado,
        COALESCE(SUM(sp.saldo_pendiente), 0) as pendiente
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${whereTrim}
      GROUP BY sp.anio_trimestre_resolucion
      ORDER BY sp.anio_trimestre_resolucion
    `, paramsTrim);

    const trimestresData = trimRes.rows.map((r) => {
      const periodo = (r.periodo ?? "").replace("/", " ");
      const parts = periodo.split(" ");
      const anio = parseInt(parts[0] ?? "0", 10);
      const trimestre = parseInt((parts[1] ?? "T0").replace("T", ""), 10);
      return { periodo, anio, trimestre, pagado: toNum(r.pagado), pendiente: toNum(r.pendiente) };
    });

    // ── Resoluciones ──
    const { where: whereResol, params: paramsResol } = buildWhere(baseFilters);
    const resolRes = await pool.query<ResolucionRow>(`
      SELECT
        sp.no_resolucion,
        LEFT(MIN(sp.anio_trimestre_resolucion), 4)::int as anio_expedicion,
        COALESCE(SUM(sp.valor_resolucion), 0) as valor_asignado,
        COALESCE(SUM(sp.valor_pagado), 0) as valor_pagado,
        COALESCE(SUM(sp.saldo_pendiente), 0) as saldo_pendiente
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${whereResol}
      GROUP BY sp.no_resolucion
      ORDER BY SUM(sp.saldo_pendiente) DESC, sp.no_resolucion DESC
      LIMIT 200
    `, paramsResol);

    const resolucionesData = resolRes.rows.map((r) => ({
      noResolucion: Number(r.no_resolucion),
      anio: r.anio_expedicion,
      valorAsignado: toNum(r.valor_asignado),
      valorPagado: toNum(r.valor_pagado),
      saldoPendiente: toNum(r.saldo_pendiente),
    }));

    // ── Prestadores pendientes ──
    const { where: wherePrest, params: paramsPrest } = buildWhere(baseFilters);
    const prestRes = await pool.query<PrestadorRow>(`
      SELECT
        sp.nombre_prestador,
        COALESCE(SUM(sp.saldo_pendiente), 0) as saldo_pendiente
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${wherePrest}
      GROUP BY sp.nombre_prestador
      HAVING SUM(sp.saldo_pendiente) > 0
      ORDER BY SUM(sp.saldo_pendiente) DESC
      LIMIT 10
    `, paramsPrest);

    const prestadoresPendientes = prestRes.rows.map((r) => ({
      nombre: r.nombre_prestador,
      saldoPendiente: toNum(r.saldo_pendiente),
    }));

    // ── Opciones de filtros (dependientes) ──
    const [
      prestadoresOpts, aniosPagoOpts, aniosExpOpts,
      estadosOpts, resolucionesOpts, trimestresOpts,
      areasOpts, fondosOpts, deptosOpts, fechaCorteRes,
    ] = await Promise.all([
      (() => {
        const { where, params } = buildWhere(baseFilters, 1);
        return pool.query<{ nombre_prestador: string }>(`
          SELECT DISTINCT sp.nombre_prestador 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY sp.nombre_prestador
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 2);
        return pool.query<{ anio: number }>(`
          SELECT DISTINCT sp.anio 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY sp.anio DESC
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 3);
        return pool.query<{ anio: number }>(`
          SELECT DISTINCT LEFT(sp.anio_trimestre_resolucion, 4)::int as anio 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY anio DESC
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 4);
        return pool.query<{ estado_pago: string }>(`
          SELECT DISTINCT sp.estado_pago 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY sp.estado_pago
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 5);
        return pool.query<{ no_resolucion: number }>(`
          SELECT DISTINCT sp.no_resolucion 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY sp.no_resolucion DESC
          LIMIT 500
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 6);
        return pool.query<{ trimestre: number }>(`
          SELECT DISTINCT RIGHT(sp.anio_trimestre_resolucion, 1)::int as trimestre 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY trimestre
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 7);
        return pool.query<{ area: string | null }>(`
          SELECT DISTINCT sp.area 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY sp.area
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 8);
        return pool.query<{ fondo: string | null }>(`
          SELECT DISTINCT sp.fondo 
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY sp.fondo
        `, params);
      })(),
      (() => {
        const { where, params } = buildWhere(baseFilters, 9);
        return pool.query<{ departamento: string | null }>(`
          SELECT DISTINCT COALESCE(se.departamento, 'Sin departamento') as departamento
          FROM subsidios.subsidios_pagos sp
          LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
          ${where}
          ORDER BY departamento
        `, params);
      })(),
      pool.query<{ fecha_corte: Date | null }>(`
        SELECT MAX(fecha) as fecha_corte FROM subsidios.subsidios_import_log
      `),
    ]);

    const rawFecha = fechaCorteRes.rows[0]?.fecha_corte;
    let fechaCorte: string | null = null;
    if (rawFecha) {
      const d = new Date(rawFecha);
      const pad = (n: number) => n.toString().padStart(2, "0");
      fechaCorte = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    return NextResponse.json({
      kpis: {
        valorAsignado,
        valorPagado,
        valorPendiente,
        totalResoluciones: toNum(kpisRow?.total_resoluciones),
        resolucionesPendientes: toNum(kpisRow?.resoluciones_pendientes),
        pctPagado: parseFloat(pctPagado.toFixed(2)),
      },
      trimestres: trimestresData,
      resoluciones: resolucionesData,
      prestadoresPendientes,
      fechaCorte,
      filtrosOpciones: {
        prestadores:      prestadoresOpts.rows.map((r) => r.nombre_prestador),
        aniosPago:        aniosPagoOpts.rows.map((r) => r.anio),
        aniosExpedicion:  aniosExpOpts.rows.map((r) => r.anio),
        estadosPago:      estadosOpts.rows.map((r) => r.estado_pago).filter(Boolean),
        resoluciones:     resolucionesOpts.rows.map((r) => Number(r.no_resolucion)),
        trimestres:       trimestresOpts.rows.map((r) => r.trimestre).filter((t): t is number => !isNaN(t)),
        areas:            areasOpts.rows.map((r) => r.area).filter((a): a is string => Boolean(a)),
        fondos:           fondosOpts.rows.map((r) => r.fondo).filter((f): f is string => Boolean(f)),
        departamentos:    deptosOpts.rows.map((r) => r.departamento).filter((d): d is string => Boolean(d)),
      },
    });
  } catch (err) {
    console.error("[api/subsidios/pagos-detalle] Error:", err);
    return NextResponse.json(
      { error: "Error al obtener detalle de pagos" },
      { status: 500 }
    );
  }
}
