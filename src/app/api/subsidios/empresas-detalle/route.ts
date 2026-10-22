import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  empresaKeySql,
  estadoValidacionSql,
  areaSql,
  anioPagosSql,
  trimestrePagosSql,
  resolucionDistintaSql,
  periodoLabel,
  pctEjecucion,
} from "@/lib/subsidios-sql";

export const dynamic = "force-dynamic";

/* ─── Filtros ──────────────────────────────────────────────────────────────
 * Los cinco filtros son multivalor (?fondo=FOES&fondo=FSSRI). Un filtro
 * ausente se envía como NULL y la cláusula lo deja pasar entero, así la misma
 * consulta sirve con y sin filtro.
 *
 * `corte` es aparte: la tabla de validaciones guarda un snapshot por mes, así
 * que SIEMPRE se restringe a uno. Sin eso se suman varios cortes del mismo
 * trimestre y los conteos salen inflados. A pagos no le aplica.
 */

type FiltroKey = "empresa" | "anio" | "trimestre" | "fondo" | "area";

const FILTRO_KEYS: FiltroKey[] = ["empresa", "anio", "trimestre", "fondo", "area"];

const TIPO: Record<FiltroKey, "text[]" | "int[]"> = {
  empresa: "text[]",
  anio: "int[]",
  trimestre: "int[]",
  fondo: "text[]",
  area: "text[]",
};

interface Filtros {
  empresa: string[] | null;
  anio: number[] | null;
  trimestre: number[] | null;
  fondo: string[] | null;
  area: string[] | null;
}

/** Expresión SQL de cada filtro, por tabla. */
function columnas(alias: "sv" | "sp"): Record<FiltroKey, string> {
  return alias === "sv"
    ? {
        empresa: empresaKeySql("sv"),
        anio: "sv.anio",
        trimestre: "sv.trimestre",
        fondo: "sv.fondo",
        area: areaSql("sv"),
      }
    : {
        empresa: empresaKeySql("sp"),
        anio: anioPagosSql("sp"),
        trimestre: trimestrePagosSql("sp"),
        fondo: "sp.fondo",
        area: areaSql("sp"),
      };
}

type Valor = string[] | number[] | string | number | null;

/**
 * WHERE con parámetros posicionales del driver pg.
 *
 * `omitir` sirve para las opciones dependientes: al calcular la lista de áreas
 * disponibles se aplican todos los filtros MENOS el de área, para que el
 * usuario no se quede sin opciones que pueda elegir.
 */
function buildWhere(
  alias: "sv" | "sp",
  f: Filtros,
  opts: { corte?: string | null; omitir?: FiltroKey } = {}
): { where: string; values: Valor[] } {
  const cols = columnas(alias);
  const values: Valor[] = [];
  const parts: string[] = [];

  // Solo filas clasificables: mismo criterio que el tablero de Validaciones.
  if (alias === "sv") {
    parts.push("sv.trimestre IS NOT NULL");
    parts.push("(sv.estado_validacion IS NOT NULL OR sv.estado_validacion_organizado IS NOT NULL)");
    if (opts.corte) {
      const [anio, mes] = opts.corte.split("-").map(Number);
      values.push(anio);
      parts.push(`EXTRACT(YEAR FROM sv.fecha_actualizacion) = $${values.length}`);
      values.push(mes);
      parts.push(`EXTRACT(MONTH FROM sv.fecha_actualizacion) = $${values.length}`);
    }
  } else {
    parts.push("sp.anio_trimestre_resolucion IS NOT NULL");
  }

  for (const key of FILTRO_KEYS) {
    if (key === opts.omitir) continue;
    values.push(f[key]);
    const ph = `$${values.length}::${TIPO[key]}`;
    parts.push(`(${ph} IS NULL OR ${cols[key]} = ANY(${ph}))`);
  }

  return { where: parts.join(" AND "), values };
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function leerFiltros(searchParams: URLSearchParams): Filtros {
  const texto = (k: string) => {
    const v = searchParams.getAll(k);
    return v.length > 0 ? v : null;
  };
  const entero = (k: string) => {
    const v = searchParams.getAll(k).map(Number).filter((n) => !Number.isNaN(n));
    return v.length > 0 ? v : null;
  };
  return {
    empresa: texto("empresa"),
    anio: entero("anio"),
    trimestre: entero("trimestre"),
    fondo: texto("fondo"),
    area: texto("area"),
  };
}

interface EmpresaRow {
  empresa_key: string;
  nombre: string | null;
  nit: string | null;
  departamento: string | null;
  fondo: string | null;
  area: string | null;
  vf: number; vp: number; vi: number; vi_sp: number; otros: number;
  total_validaciones: number;
  pagos: number;
  valor_resolucion: string | null;
  valor_pagado: string | null;
  saldo_pendiente: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const f = leerFiltros(searchParams);

  try {
    const pool = getPool();
    const ESTADO = estadoValidacionSql("sv");
    const EMPRESA_SV = empresaKeySql("sv");
    const EMPRESA_SP = empresaKeySql("sp");
    const ANIO_SP = anioPagosSql("sp");
    const TRIM_SP = trimestrePagosSql("sp");

    /* ── Corte vigente de validaciones ─────────────────────────────────── */
    const cortesRes = await pool.query<{ anio: number; mes: number }>(`
      SELECT DISTINCT
        EXTRACT(YEAR FROM fecha_actualizacion)::int  AS anio,
        EXTRACT(MONTH FROM fecha_actualizacion)::int AS mes
      FROM subsidios.subsidios_validaciones
      WHERE fecha_actualizacion IS NOT NULL
      ORDER BY anio DESC, mes DESC
    `);
    const cortesDisponibles = cortesRes.rows;
    const pedido = searchParams.get("corte");
    const corte =
      pedido && cortesDisponibles.some((c) => `${c.anio}-${String(c.mes).padStart(2, "0")}` === pedido)
        ? pedido
        : cortesDisponibles.length > 0
        ? `${cortesDisponibles[0].anio}-${String(cortesDisponibles[0].mes).padStart(2, "0")}`
        : null;

    const wVal = buildWhere("sv", f, { corte });
    const wPag = buildWhere("sp", f);

    /* ── Detalle por empresa ───────────────────────────────────────────────
     * Validaciones y pagos tienen granos distintos, así que se agregan por
     * separado y se unen con FULL OUTER JOIN: con un INNER JOIN
     * desaparecerían las empresas que tienen pagos pero aún no validaciones,
     * y al revés.
     *
     * El join con el catálogo es LEFT a propósito: el 6 % de las filas de
     * pagos y el 3,6 % de las de validaciones no cruzan con él.
     */
    const detalleRes = await pool.query<EmpresaRow>(
      `
      WITH val AS (
        SELECT ${EMPRESA_SV} AS empresa_key,
               MIN(sv.nombre_prestador) AS nombre,
               MIN(sv.fondo)            AS fondo,
               MIN(${areaSql("sv")})    AS area,
               COUNT(*) FILTER (WHERE ${ESTADO} = 'e. VF')     AS vf,
               COUNT(*) FILTER (WHERE ${ESTADO} = 'd. VP')     AS vp,
               COUNT(*) FILTER (WHERE ${ESTADO} = 'b. VI')     AS vi,
               COUNT(*) FILTER (WHERE ${ESTADO} = 'c. VI SP')  AS vi_sp,
               COUNT(*) FILTER (WHERE ${ESTADO} = 'a. Otros')  AS otros,
               COUNT(*)                                        AS total_validaciones
        FROM subsidios.subsidios_validaciones sv
        WHERE ${wVal.where}
        GROUP BY 1
      ),
      pag AS (
        SELECT ${EMPRESA_SP} AS empresa_key,
               MIN(sp.nombre_prestador)        AS nombre,
               MIN(sp.fondo)                   AS fondo,
               MIN(${areaSql("sp")})           AS area,
               COUNT(DISTINCT ${resolucionDistintaSql('sp')}) AS pagos,
               SUM(sp.valor_resolucion)        AS valor_resolucion,
               SUM(sp.valor_pagado)            AS valor_pagado,
               SUM(sp.saldo_pendiente)         AS saldo_pendiente
        FROM subsidios.subsidios_pagos sp
        WHERE ${wPag.where}
        GROUP BY 1
      ),
      unidas AS (
        SELECT COALESCE(val.empresa_key, pag.empresa_key) AS empresa_key,
               COALESCE(val.nombre, pag.nombre)           AS nombre,
               COALESCE(val.fondo,  pag.fondo)            AS fondo,
               COALESCE(val.area,   pag.area)             AS area,
               COALESCE(val.vf, 0)                 AS vf,
               COALESCE(val.vp, 0)                 AS vp,
               COALESCE(val.vi, 0)                 AS vi,
               COALESCE(val.vi_sp, 0)              AS vi_sp,
               COALESCE(val.otros, 0)              AS otros,
               COALESCE(val.total_validaciones, 0) AS total_validaciones,
               COALESCE(pag.pagos, 0)              AS pagos,
               COALESCE(pag.valor_resolucion, 0)   AS valor_resolucion,
               COALESCE(pag.valor_pagado, 0)       AS valor_pagado,
               COALESCE(pag.saldo_pendiente, 0)    AS saldo_pendiente
        FROM val
        FULL OUTER JOIN pag ON val.empresa_key = pag.empresa_key
      )
      SELECT u.empresa_key,
             COALESCE(se.nombre_prestador, u.nombre) AS nombre,
             se.nit, se.departamento,
             u.fondo, u.area,
             u.vf, u.vp, u.vi, u.vi_sp, u.otros, u.total_validaciones,
             u.pagos, u.valor_resolucion, u.valor_pagado, u.saldo_pendiente
      FROM unidas u
      LEFT JOIN subsidios.subsidios_empresas se ON se.codigo_sui = u.empresa_key
      ORDER BY u.valor_pagado DESC NULLS LAST, nombre
      `,
      [...wVal.values, ...wPag.values]
    );

    /* ── Serie de validaciones por trimestre ───────────────────────────── */
    const serieValRes = await pool.query<{
      anio: number; trimestre: number; estado: string; conteo: number;
    }>(
      `
      SELECT sv.anio, sv.trimestre, ${ESTADO} AS estado, COUNT(*)::int AS conteo
      FROM subsidios.subsidios_validaciones sv
      WHERE ${wVal.where}
      GROUP BY sv.anio, sv.trimestre, ${ESTADO}
      ORDER BY sv.anio, sv.trimestre
      `,
      wVal.values
    );

    /* ── Serie de pagos por trimestre ──────────────────────────────────── */
    const seriePagRes = await pool.query<{
      anio: number; trimestre: number; pagos: number; valor_pagado: string | null;
    }>(
      `
      SELECT ${ANIO_SP} AS anio, ${TRIM_SP} AS trimestre,
             COUNT(DISTINCT ${resolucionDistintaSql('sp')})::int AS pagos,
             SUM(sp.valor_pagado) AS valor_pagado
      FROM subsidios.subsidios_pagos sp
      WHERE ${wPag.where}
      GROUP BY 1, 2
      ORDER BY 1, 2
      `,
      wPag.values
    );

    /* ── Opciones de cada filtro, excluyéndose a sí mismo ──────────────── */
    const opcion = async (key: FiltroKey, alias: "sv" | "sp", expr: string) => {
      const w = buildWhere(alias, f, { corte: alias === "sv" ? corte : null, omitir: key });
      const tabla =
        alias === "sv" ? "subsidios.subsidios_validaciones sv" : "subsidios.subsidios_pagos sp";
      const r = await pool.query<{ val: string | number }>(
        `SELECT DISTINCT ${expr} AS val FROM ${tabla} WHERE ${w.where} AND ${expr} IS NOT NULL ORDER BY 1`,
        w.values
      );
      return r.rows.map((x) => x.val);
    };

    const [aniosVal, aniosPag, trimestres, fondos, areas] = await Promise.all([
      opcion("anio", "sv", "sv.anio"),
      opcion("anio", "sp", ANIO_SP),
      opcion("trimestre", "sv", "sv.trimestre"),
      opcion("fondo", "sv", "sv.fondo"),
      opcion("area", "sv", areaSql("sv")),
    ]);

    // Las empresas elegibles salen del propio detalle sin su filtro aplicado.
    const wValEmp = buildWhere("sv", f, { corte, omitir: "empresa" });
    const wPagEmp = buildWhere("sp", f, { omitir: "empresa" });
    const empresasOpcRes = await pool.query<{ key: string; nombre: string }>(
      `
      SELECT key, MIN(nombre) AS nombre FROM (
        SELECT ${EMPRESA_SV} AS key, sv.nombre_prestador AS nombre
        FROM subsidios.subsidios_validaciones sv WHERE ${wValEmp.where}
        UNION ALL
        SELECT ${EMPRESA_SP} AS key, sp.nombre_prestador AS nombre
        FROM subsidios.subsidios_pagos sp WHERE ${wPagEmp.where}
      ) t
      WHERE key IS NOT NULL AND key <> ''
      GROUP BY key ORDER BY 2
      `,
      [...wValEmp.values, ...wPagEmp.values]
    );

    /* ── KPIs globales ─────────────────────────────────────────────────────
     * No se obtienen sumando las filas por empresa: una misma resolución paga
     * a varias empresas a la vez, así que sumar los COUNT(DISTINCT) de cada
     * una da 11.381 resoluciones cuando en realidad son 610.
     */
    const kpisPagosRes = await pool.query<{
      total_pagos: number; valor_resolucion: string | null;
      valor_pagado: string | null; saldo_pendiente: string | null;
    }>(
      `
      SELECT COUNT(DISTINCT ${resolucionDistintaSql("sp")})::int AS total_pagos,
             COALESCE(SUM(sp.valor_resolucion), 0) AS valor_resolucion,
             COALESCE(SUM(sp.valor_pagado), 0)     AS valor_pagado,
             COALESCE(SUM(sp.saldo_pendiente), 0)  AS saldo_pendiente
      FROM subsidios.subsidios_pagos sp
      WHERE ${wPag.where}
      `,
      wPag.values
    );
    const kpisValRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM subsidios.subsidios_validaciones sv WHERE ${wVal.where}`,
      wVal.values
    );

    /* ── Fecha de corte de la carga ────────────────────────────────────── */
    const cargaRes = await pool.query<{ fecha: Date | null }>(
      "SELECT MAX(fecha) AS fecha FROM subsidios.subsidios_import_log"
    );
    const fechaCarga = cargaRes.rows[0]?.fecha ?? null;

    /* ── Armado de la respuesta ────────────────────────────────────────── */
    const empresas = detalleRes.rows.map((r) => {
      const valorResolucion = toNum(r.valor_resolucion);
      const valorPagado = toNum(r.valor_pagado);
      return {
        key: r.empresa_key,
        nombre: r.nombre ?? "Sin nombre",
        nit: r.nit,
        departamento: r.departamento ?? "Sin departamento",
        fondo: r.fondo,
        area: r.area,
        vf: toNum(r.vf), vp: toNum(r.vp), vi: toNum(r.vi),
        viSp: toNum(r.vi_sp), otros: toNum(r.otros),
        totalValidaciones: toNum(r.total_validaciones),
        pagos: toNum(r.pagos),
        valorResolucion,
        valorPagado,
        saldoPendiente: toNum(r.saldo_pendiente),
        pctEjecucion: pctEjecucion(valorPagado, valorResolucion),
      };
    });

    const porPeriodo = new Map<string, Record<string, number | string>>();
    for (const row of serieValRes.rows) {
      const periodo = periodoLabel(row.anio, row.trimestre);
      const actual = porPeriodo.get(periodo) ?? {
        periodo, anio: row.anio, trimestre: row.trimestre,
        VF: 0, VP: 0, VI: 0, "VI SP": 0, Otros: 0,
      };
      const etiqueta = row.estado.replace(/^[a-e]\.\s*/, "");
      actual[etiqueta] = toNum(actual[etiqueta]) + toNum(row.conteo);
      porPeriodo.set(periodo, actual);
    }

    const kpisPagos = kpisPagosRes.rows[0];
    const totalPagos = toNum(kpisPagos?.total_pagos);
    const valorPagado = toNum(kpisPagos?.valor_pagado);
    const valorResolucion = toNum(kpisPagos?.valor_resolucion);

    return NextResponse.json({
      corte,
      cortesDisponibles,
      fechaCarga,
      kpis: {
        totalPagos,
        valorResolucion,
        valorPagado,
        saldoPendiente: toNum(kpisPagos?.saldo_pendiente),
        pctEjecucion: pctEjecucion(valorPagado, valorResolucion),
        totalEmpresas: empresas.length,
        totalValidaciones: toNum(kpisValRes.rows[0]?.total),
      },
      validacionPorTrimestre: [...porPeriodo.values()],
      pagosPorTrimestre: seriePagRes.rows.map((r) => ({
        periodo: periodoLabel(r.anio, r.trimestre),
        anio: r.anio,
        trimestre: r.trimestre,
        pagos: toNum(r.pagos),
        valorPagado: toNum(r.valor_pagado),
      })),
      empresas,
      filtrosOpciones: {
        empresas: empresasOpcRes.rows,
        anios: [...new Set([...aniosVal, ...aniosPag].map(Number))].sort((a, b) => a - b),
        trimestres: trimestres.map(Number).sort((a, b) => a - b),
        fondos: fondos.map(String),
        areas: areas.map(String),
      },
    });
  } catch (error) {
    console.error("[/api/subsidios/empresas-detalle]", error);
    return NextResponse.json(
      { error: "Error al obtener el detalle por empresa" },
      { status: 500 }
    );
  }
}
