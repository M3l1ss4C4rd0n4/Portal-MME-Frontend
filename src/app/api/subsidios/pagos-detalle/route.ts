import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const baseWhere = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const params = [p1, p2, p3, p4, p5, p6, p7, p8, p9];

    // ── KPIs ──
    const kpisRes = await pool.query<KpisRow>(`
      SELECT
        COALESCE(SUM(sp.valor_resolucion), 0) as valor_asignado,
        COALESCE(SUM(sp.valor_pagado), 0) as valor_pagado,
        COALESCE(SUM(sp.saldo_pendiente), 0) as valor_pendiente,
        COUNT(DISTINCT sp.no_resolucion) as total_resoluciones,
        COUNT(DISTINCT CASE WHEN sp.saldo_pendiente > 0 THEN sp.no_resolucion END) as resoluciones_pendientes
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${baseWhere}
    `, params);

    const kpisRow = kpisRes.rows[0];
    const valorAsignado  = toNum(kpisRow?.valor_asignado);
    const valorPagado    = toNum(kpisRow?.valor_pagado);
    const valorPendiente = toNum(kpisRow?.valor_pendiente);
    const pctPagado = valorAsignado > 0 ? (valorPagado / valorAsignado) * 100 : 0;

    // ── Trimestres (agrupados por período de expedición de la resolución) ──
    const trimRes = await pool.query<TrimestreRow>(`
      SELECT
        sp.anio_trimestre_resolucion as periodo,
        COALESCE(SUM(sp.valor_pagado), 0) as pagado,
        COALESCE(SUM(sp.saldo_pendiente), 0) as pendiente
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${baseWhere}
      GROUP BY sp.anio_trimestre_resolucion
      ORDER BY sp.anio_trimestre_resolucion
    `, params);

    const trimestresData = trimRes.rows.map((r) => {
      const periodo = (r.periodo ?? "").replace("/", " ");
      const parts = periodo.split(" ");
      const anio = parseInt(parts[0] ?? "0", 10);
      const trimestre = parseInt((parts[1] ?? "T0").replace("T", ""), 10);
      return { periodo, anio, trimestre, pagado: toNum(r.pagado), pendiente: toNum(r.pendiente) };
    });

    // ── Resoluciones (una fila por resolución, agrupando todas sus vigencias) ──
    const resolRes = await pool.query<ResolucionRow>(`
      SELECT
        sp.no_resolucion,
        LEFT(MIN(sp.anio_trimestre_resolucion), 4)::int as anio_expedicion,
        COALESCE(SUM(sp.valor_resolucion), 0) as valor_asignado,
        COALESCE(SUM(sp.valor_pagado), 0) as valor_pagado,
        COALESCE(SUM(sp.saldo_pendiente), 0) as saldo_pendiente
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${baseWhere}
      GROUP BY sp.no_resolucion
      ORDER BY SUM(sp.saldo_pendiente) DESC, sp.no_resolucion DESC
      LIMIT 200
    `, params);

    const resolucionesData = resolRes.rows.map((r) => ({
      noResolucion: Number(r.no_resolucion),
      anio: r.anio_expedicion,
      valorAsignado: toNum(r.valor_asignado),
      valorPagado: toNum(r.valor_pagado),
      saldoPendiente: toNum(r.saldo_pendiente),
    }));

    // ── Prestadores pendientes ──
    const prestRes = await pool.query<PrestadorRow>(`
      SELECT
        sp.nombre_prestador,
        COALESCE(SUM(sp.saldo_pendiente), 0) as saldo_pendiente
      FROM subsidios.subsidios_pagos sp
      LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
      ${baseWhere}
      GROUP BY sp.nombre_prestador
      HAVING SUM(sp.saldo_pendiente) > 0
      ORDER BY SUM(sp.saldo_pendiente) DESC
      LIMIT 10
    `, params);

    const prestadoresPendientes = prestRes.rows.map((r) => ({
      nombre: r.nombre_prestador,
      saldoPendiente: toNum(r.saldo_pendiente),
    }));

    // ── Opciones de filtros (siempre sin aplicar filtros para mostrar todas las opciones) ──
    const [
      prestadoresOpts, aniosPagoOpts, aniosExpOpts,
      estadosOpts, resolucionesOpts, trimestresOpts,
      areasOpts, fondosOpts, deptosOpts,
    ] = await Promise.all([
      pool.query<{ nombre_prestador: string }>(
        `SELECT DISTINCT nombre_prestador FROM subsidios.subsidios_pagos ORDER BY nombre_prestador`
      ),
      pool.query<{ anio: number }>(
        `SELECT DISTINCT anio FROM subsidios.subsidios_pagos ORDER BY anio DESC`
      ),
      pool.query<{ anio: number }>(
        `SELECT DISTINCT LEFT(anio_trimestre_resolucion, 4)::int as anio FROM subsidios.subsidios_pagos ORDER BY anio DESC`
      ),
      pool.query<{ estado_pago: string }>(
        `SELECT DISTINCT estado_pago FROM subsidios.subsidios_pagos ORDER BY estado_pago`
      ),
      pool.query<{ no_resolucion: number }>(
        `SELECT DISTINCT no_resolucion FROM subsidios.subsidios_pagos ORDER BY no_resolucion DESC LIMIT 500`
      ),
      pool.query<{ trimestre: number }>(
        `SELECT DISTINCT RIGHT(anio_trimestre_resolucion, 1)::int as trimestre FROM subsidios.subsidios_pagos ORDER BY trimestre`
      ),
      pool.query<{ area: string | null }>(
        `SELECT DISTINCT area FROM subsidios.subsidios_pagos ORDER BY area`
      ),
      pool.query<{ fondo: string | null }>(
        `SELECT DISTINCT fondo FROM subsidios.subsidios_pagos ORDER BY fondo`
      ),
      pool.query<{ departamento: string | null }>(`
        SELECT DISTINCT COALESCE(departamento, 'Sin departamento') as departamento
        FROM subsidios.subsidios_empresas ORDER BY departamento
      `),
    ]);

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
      { error: "Error al obtener detalle de pagos", detail: String(err) },
      { status: 500 }
    );
  }
}
