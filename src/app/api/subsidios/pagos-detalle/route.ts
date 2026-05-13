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

    // Helper para construir valores SQL con tipos explícitos
    const sqlVal = (val: unknown, type: string): string => {
      if (val === null) return `NULL::${type}`;
      if (Array.isArray(val)) {
        if (val.length === 0) return `NULL::${type}`;
        const items = val.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)).join(',');
        return `ARRAY[${ items }]::${type}`;
      }
      return String(val);
    };

    // Construir valores SQL para cada parámetro
    const v1 = sqlVal(p1, 'text[]');     // prestadores
    const v2 = sqlVal(p2, 'int[]');      // aniosPago
    const v3 = sqlVal(p3, 'int[]');      // aniosExp
    const v4 = sqlVal(p4, 'text[]');     // estadosPago
    const v5 = sqlVal(p5, 'bigint[]');   // resoluciones
    const v6 = sqlVal(p6, 'int[]');      // trimestres
    const v7 = sqlVal(p7, 'text[]');     // areas
    const v8 = sqlVal(p8, 'text[]');     // fondos
    const v9 = sqlVal(p9, 'text[]');     // departamentos

    // ── KPIs ──
    const hayFiltros = p1 || p2 || p3 || p4 || p5 || p6 || p7 || p8 || p9;

    // kpis_resumen se usa SOLO cuando año de vigencia = FISCAL_YEAR y no hay otros filtros
    // de scope (prestador, área, fondo, depto, resolución, trimestre, año expedición).
    // "Todos" (p2=null) usa subsidios_pagos histórico completo.
    // Año de vigencia (p2=anio) y año de expedición (p3=anio_trimestre_resolucion) son
    // campos distintos en subsidios_pagos y se tratan de forma independiente.
    const usarKpisResumen =
      !p1 && !p3 && !p5 && !p6 && !p7 && !p8 && !p9 &&
      p2 !== null && p2.length === 1 && p2[0] === FISCAL_YEAR;

    const todosEstadosPago    = !p4 || (p4.includes("Pagado") && p4.includes("Pendiente"));
    const soloFiltroPagado    = usarKpisResumen && p4?.length === 1 && p4[0] === "Pagado";
    // Con año=2026+Pendiente la deuda está en rows con anio != 2026, se consulta sin anio.
    const soloFiltroPendiente = usarKpisResumen && p4?.length === 1 && p4[0] === "Pendiente";

    let kpisRow: KpisRow | undefined;

    if (usarKpisResumen && todosEstadosPago) {
      // Año=2026 (con o sin Pagado+Pendiente): totales oficiales desde kpis_resumen.
      // resoluciones_pendientes = conteo real en subsidios_pagos (saldo > 0).
      const [baseRes, pendRes] = await Promise.all([
        pool.query<Omit<KpisRow, "resoluciones_pendientes">>(`
          SELECT
            COALESCE(SUM(valor_asignado), 0) as valor_asignado,
            COALESCE(SUM(valor_asignado - valor_pendiente), 0) as valor_pagado,
            COALESCE(SUM(valor_pendiente), 0) as valor_pendiente,
            SUM(n_resoluciones) as total_resoluciones
          FROM subsidios.kpis_resumen
          WHERE anio = ${FISCAL_YEAR}
        `),
        pool.query<{ cnt: string }>(`
          SELECT COUNT(DISTINCT no_resolucion) as cnt
          FROM subsidios.subsidios_pagos WHERE saldo_pendiente > 0
        `),
      ]);
      const base = baseRes.rows[0];
      kpisRow = {
        valor_asignado:          base?.valor_asignado ?? 0,
        valor_pagado:            base?.valor_pagado ?? 0,
        valor_pendiente:         base?.valor_pendiente ?? 0,
        total_resoluciones:      base?.total_resoluciones ?? 0,
        resoluciones_pendientes: toNum(pendRes.rows[0]?.cnt),
      };
    } else if (soloFiltroPagado) {
      // Año=2026 + solo Pagado: derivar de kpis_resumen 2026 - pendientes (23 - 6 = 17).
      const [baseRes, pendRes] = await Promise.all([
        pool.query<{ n: string; va: string }>(`
          SELECT SUM(n_resoluciones) as n, SUM(valor_asignado) as va
          FROM subsidios.kpis_resumen WHERE anio = ${FISCAL_YEAR}
        `),
        pool.query<{ cnt: string; va_pend: string }>(`
          SELECT COUNT(DISTINCT no_resolucion) as cnt, SUM(valor_resolucion) as va_pend
          FROM subsidios.subsidios_pagos WHERE saldo_pendiente > 0
        `),
      ]);
      const nTotal       = toNum(baseRes.rows[0]?.n);
      const nPendiente   = toNum(pendRes.rows[0]?.cnt);
      const vaTotal      = toNum(baseRes.rows[0]?.va);
      const vaPendientes = toNum(pendRes.rows[0]?.va_pend);
      const vaPagado     = Math.max(0, vaTotal - vaPendientes);
      kpisRow = {
        valor_asignado:          vaPagado,
        valor_pagado:            vaPagado,
        valor_pendiente:         0,
        total_resoluciones:      nTotal - nPendiente,
        resoluciones_pendientes: 0,
      };
    } else if (soloFiltroPendiente) {
      // Año=2026 + solo Pendiente: subsidios_pagos sin filtro de anio — la deuda real
      // está en rows con anio != 2026 y filtrar por anio la pierde.
      const kpisRes = await pool.query<KpisRow>(`
        SELECT
          COALESCE(SUM(valor_resolucion), 0) as valor_asignado,
          COALESCE(SUM(valor_pagado), 0) as valor_pagado,
          COALESCE(SUM(saldo_pendiente), 0) as valor_pendiente,
          COUNT(DISTINCT no_resolucion) as total_resoluciones,
          COUNT(DISTINCT CASE WHEN saldo_pendiente > 0 THEN no_resolucion END) as resoluciones_pendientes
        FROM subsidios.subsidios_pagos
        WHERE estado_pago = 'Pendiente'
      `);
      kpisRow = kpisRes.rows[0];
    } else {
      // Todos (sin año) / años históricos / otros filtros de scope: subsidios_pagos completo.
      const kpisRes = await pool.query<KpisRow>(`
        SELECT
          COALESCE(SUM(sp.valor_resolucion), 0) as valor_asignado,
          COALESCE(SUM(sp.valor_pagado), 0) as valor_pagado,
          COALESCE(SUM(sp.saldo_pendiente), 0) as valor_pendiente,
          COUNT(DISTINCT sp.no_resolucion) as total_resoluciones,
          COUNT(DISTINCT CASE WHEN sp.saldo_pendiente > 0 THEN sp.no_resolucion END) as resoluciones_pendientes
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
      `);
      kpisRow = kpisRes.rows[0];
    }

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
      WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
        AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
        AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
        AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
        AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
        AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
        AND (${v7} IS NULL OR sp.area = ANY(${v7}))
        AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
        AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
      GROUP BY sp.anio_trimestre_resolucion
      ORDER BY sp.anio_trimestre_resolucion
    `);

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
      WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
        AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
        AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
        AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
        AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
        AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
        AND (${v7} IS NULL OR sp.area = ANY(${v7}))
        AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
        AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
      GROUP BY sp.no_resolucion
      ORDER BY SUM(sp.saldo_pendiente) DESC, sp.no_resolucion DESC
      LIMIT 200
    `);

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
      WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
        AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
        AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
        AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
        AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
        AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
        AND (${v7} IS NULL OR sp.area = ANY(${v7}))
        AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
        AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
      GROUP BY sp.nombre_prestador
      HAVING SUM(sp.saldo_pendiente) > 0
      ORDER BY SUM(sp.saldo_pendiente) DESC
      LIMIT 10
    `);

    const prestadoresPendientes = prestRes.rows.map((r) => ({
      nombre: r.nombre_prestador,
      saldoPendiente: toNum(r.saldo_pendiente),
    }));

    // ── Opciones de filtros (dependientes - calculadas basándose en filtros activos) ──
    // Para cada filtro, calculamos las opciones disponibles aplicando TODOS los filtros EXCEPTO el propio
    // Esto permite ver qué opciones están disponibles para el usuario dado el contexto actual

    const whereSinPrestador = `
      WHERE ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinAnioPago = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinAnioExp = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinEstadoPago = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinResolucion = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinTrimestre = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinArea = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinFondo = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($9::text[]   IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY($9::text[]))
    `;

    const whereSinDepartamento = `
      WHERE ($1::text[]   IS NULL OR sp.nombre_prestador = ANY($1::text[]))
        AND ($2::int[]    IS NULL OR sp.anio = ANY($2::int[]))
        AND ($3::int[]    IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY($3::int[]))
        AND ($4::text[]   IS NULL OR sp.estado_pago = ANY($4::text[]))
        AND ($5::bigint[] IS NULL OR sp.no_resolucion = ANY($5::bigint[]))
        AND ($6::int[]    IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY($6::int[]))
        AND ($7::text[]   IS NULL OR sp.area = ANY($7::text[]))
        AND ($8::text[]   IS NULL OR sp.fondo = ANY($8::text[]))
    `;

    const [
      prestadoresOpts, aniosPagoOpts, aniosExpOpts,
      estadosOpts, resolucionesOpts, trimestresOpts,
      areasOpts, fondosOpts, deptosOpts, fechaCorteRes,
    ] = await Promise.all([
      // Prestadores disponibles (sin filtrar por prestador mismo - excluye $1)
      pool.query<{ nombre_prestador: string }>(`
        SELECT DISTINCT sp.nombre_prestador 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY sp.nombre_prestador
      `),
      // Años de pago disponibles (sin filtrar por año de pago - excluye $2)
      pool.query<{ anio: number }>(`
        SELECT DISTINCT sp.anio 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY sp.anio DESC
      `),
      // Años de expedición disponibles (sin filtrar por año de expedición - excluye $3)
      pool.query<{ anio: number }>(`
        SELECT DISTINCT LEFT(sp.anio_trimestre_resolucion, 4)::int as anio 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY anio DESC
      `),
      // Estados de pago disponibles (sin filtrar por estado - excluye $4)
      pool.query<{ estado_pago: string }>(`
        SELECT DISTINCT sp.estado_pago 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY sp.estado_pago
      `),
      // Resoluciones disponibles (sin filtrar por resolución - excluye $5)
      pool.query<{ no_resolucion: number }>(`
        SELECT DISTINCT sp.no_resolucion 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY sp.no_resolucion DESC
        LIMIT 500
      `),
      // Trimestres disponibles (sin filtrar por trimestre - excluye $6)
      pool.query<{ trimestre: number }>(`
        SELECT DISTINCT RIGHT(sp.anio_trimestre_resolucion, 1)::int as trimestre 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY trimestre
      `),
      // Áreas disponibles (sin filtrar por área - excluye $7)
      pool.query<{ area: string | null }>(`
        SELECT DISTINCT sp.area 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY sp.area
      `),
      // Fondos disponibles (sin filtrar por fondo - excluye $8)
      pool.query<{ fondo: string | null }>(`
        SELECT DISTINCT sp.fondo 
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v9} IS NULL OR COALESCE(se.departamento, 'Sin departamento') = ANY(${v9}))
        ORDER BY sp.fondo
      `),
      // Departamentos disponibles (sin filtrar por departamento - excluye $9)
      pool.query<{ departamento: string | null }>(`
        SELECT DISTINCT COALESCE(se.departamento, 'Sin departamento') as departamento
        FROM subsidios.subsidios_pagos sp
        LEFT JOIN subsidios.subsidios_empresas se ON sp.codigo_sui = se.codigo_sui
        WHERE (${v1} IS NULL OR sp.nombre_prestador = ANY(${v1}))
          AND (${v2} IS NULL OR sp.anio = ANY(${v2}))
          AND (${v3} IS NULL OR LEFT(sp.anio_trimestre_resolucion, 4)::int = ANY(${v3}))
          AND (${v4} IS NULL OR sp.estado_pago = ANY(${v4}))
          AND (${v5} IS NULL OR sp.no_resolucion = ANY(${v5}))
          AND (${v6} IS NULL OR RIGHT(sp.anio_trimestre_resolucion, 1)::int = ANY(${v6}))
          AND (${v7} IS NULL OR sp.area = ANY(${v7}))
          AND (${v8} IS NULL OR sp.fondo = ANY(${v8}))
        ORDER BY departamento
      `),
      // Fecha de la última importación desde SharePoint
      pool.query<{ fecha_corte: Date | null }>(`
        SELECT MAX(fecha_importacion) as fecha_corte FROM subsidios.subsidios_pagos
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
