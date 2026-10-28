import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  empresaKeySql,
  estadoValidacionSql,
  anioPagosSql,
  trimestrePagosSql,
  resolucionDistintaSql,
  consultaCortes,
  corteWhereSql,
  claveCorte,
  consultaMapaEmpresas,
  mapaEmpresasCte,
  periodoLabel,
  pctEjecucion,
  indiceTrimestre,
  periodoDesdeIndice,
  rangoPeriodoSql,
  rangoPeriodoPagosSql,
  clavePeriodoPagos,
} from "@/lib/subsidios-sql";
import { consultaResumenPeriodo, consultaDetalleGrupos } from "@/lib/subsidios-resumen-sql";

export const dynamic = "force-dynamic";

/* ─── Filtros ──────────────────────────────────────────────────────────────
 * Quedan dos. `empresa` es multivalor (?empresa=1250&empresa=1411) y, ausente,
 * deja pasar todas. El período es un rango cerrado sobre el índice de
 * trimestre y siempre tiene valor; el tablero lo mueve con un deslizador.
 *
 * Fondo y área se quitaron a pedido del área: siguen siendo columnas de la
 * tabla, pero ya no filtran.
 *
 * `corte` es aparte: la tabla de validaciones acumula snapshots y SIEMPRE hay
 * que restringirse a uno. El mes no sirve como corte —trae dos cargas, y cada
 * una es un snapshot completo—, así que se resuelve a la fecha de la última
 * carga del mes y se filtra por esa fecha. A pagos no le aplica.
 *
 * Toda consulta empieza con el mapa de empresas en $1 y $2, así que los
 * parámetros de filtro arrancan en $3 (de ahí `PARAMS_MAPA`).
 */

/** Los dos parámetros que ocupa el mapa al inicio de cada consulta. */
const PARAMS_MAPA = 2;

interface Filtros {
  empresa: string[] | null;
  desde: number;
  hasta: number;
}

type Valor = string[] | string | number | null;

function buildWhere(
  alias: "sv" | "sp",
  f: Filtros,
  opts: { carga?: string | null; omitirEmpresa?: boolean; omitirPeriodo?: boolean; desde?: number } = {}
): { where: string; values: Valor[] } {
  const values: Valor[] = [];
  const parts: string[] = [];
  // Cuando dos WHERE viven en la misma consulta, el segundo tiene que seguir
  // la numeración del primero o los parámetros se cruzan.
  const base = opts.desde ?? PARAMS_MAPA;
  const ph = (n: number) => `$${base + n}`;
  const push = (v: Valor) => {
    values.push(v);
    return ph(values.length);
  };

  if (alias === "sv") {
    parts.push("sv.trimestre IS NOT NULL");
    parts.push("(sv.estado_validacion IS NOT NULL OR sv.estado_validacion_organizado IS NOT NULL)");
    if (opts.carga) parts.push(corteWhereSql("sv", push(opts.carga)));
  } else {
    parts.push("sp.anio_trimestre_resolucion IS NOT NULL");
  }

  if (!opts.omitirPeriodo) {
    const d = periodoDesdeIndice(f.desde);
    const h = periodoDesdeIndice(f.hasta);
    if (alias === "sv") {
      parts.push(
        rangoPeriodoSql("sv", [
          push(d.anio), push(d.trimestre), push(h.anio), push(h.trimestre),
        ] as [string, string, string, string])
      );
    } else {
      parts.push(
        rangoPeriodoPagosSql(
          "sp",
          push(clavePeriodoPagos(d.anio, d.trimestre)),
          push(clavePeriodoPagos(h.anio, h.trimestre))
        )
      );
    }
  }

  // Un filtro vacío se omite del WHERE en vez de pasar NULL con
  // `($n IS NULL OR col = ANY($n))`. Con ese patrón el planificador no puede
  // descartar la rama y evalúa la expresión de la columna en cada fila —
  // incluida la clave de empresa, con su subconsulta. Era la causa de los
  // 3 segundos sin filtros: omitirla lo deja en décimas.
  if (f.empresa !== null && !opts.omitirEmpresa) {
    parts.push(`${empresaKeySql(alias)} = ANY(${push(f.empresa)}::text[])`);
  }

  return { where: parts.join(" AND "), values };
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isNaN(n) ? null : n;
}

/* ─── Caché del mapa de empresas ───────────────────────────────────────────
 * Recorrer las dos tablas para armarlo cuesta ~600 ms y solo cambia cuando el
 * ETL recarga (diario, más el watcher cada 5 min). Se guarda en memoria del
 * proceso con vigencia corta: el mapa solo traduce nombres a códigos, así que
 * un dato de hace unos minutos no altera ninguna cifra.
 */
const MAPA_TTL_MS = 5 * 60 * 1000;
let mapaCache: { nombres: string[]; codigos: string[]; en: number } | null = null;

async function obtenerMapa(pool: ReturnType<typeof getPool>) {
  if (mapaCache && Date.now() - mapaCache.en < MAPA_TTL_MS) return mapaCache;
  const r = await pool.query<{ nom: string; cod: string }>(consultaMapaEmpresas());
  mapaCache = {
    nombres: r.rows.map((x) => x.nom),
    codigos: r.rows.map((x) => x.cod),
    en: Date.now(),
  };
  return mapaCache;
}

/** La clave es el código SUI salvo cuando se resolvió por nombre. */
function codigoDeClave(key: string): string | null {
  return key.startsWith("NOM:") ? null : key;
}

interface FilaResumenRow {
  anio: number; trimestre: number; fondo: string | null; estado: string;
  empresas: number; validaciones: number; resoluciones: number;
  res_min: string | null; res_max: string | null;
  valor_resolucion: string | null; valor_pagado: string | null; saldo_pendiente: string | null;
}

interface FilaDetalleRow extends FilaResumenRow {
  empresa_key: string;
  nombre_catalogo: string | null;
  nit: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  try {
    const pool = getPool();
    const ESTADO = estadoValidacionSql("sv");
    const ANIO_SP = anioPagosSql("sp");
    const TRIM_SP = trimestrePagosSql("sp");
    const MAPA = mapaEmpresasCte("$1", "$2");

    /* El rango disponible y los cortes se resuelven antes que nada: el
     * deslizador necesita sus topes y el período pedido se acota a ellos. */
    const [mapa, cortesRes, rangoRes] = await Promise.all([
      obtenerMapa(pool),
      pool.query<{ anio: number; mes: number; carga: string }>(consultaCortes()),
      pool.query<{ min_i: number; max_i: number }>(`
        SELECT MIN(i)::int AS min_i, MAX(i)::int AS max_i FROM (
          SELECT anio * 4 + trimestre - 1 AS i
          FROM subsidios.subsidios_validaciones WHERE trimestre IS NOT NULL
          UNION ALL
          SELECT LEFT(anio_trimestre_resolucion, 4)::int * 4
                 + RIGHT(anio_trimestre_resolucion, 1)::int - 1
          FROM subsidios.subsidios_pagos WHERE anio_trimestre_resolucion IS NOT NULL
        ) t`),
    ]);
    const M = [mapa.nombres, mapa.codigos];

    const periodoMin = rangoRes.rows[0]?.min_i ?? indiceTrimestre(2014, 1);
    const periodoMax = rangoRes.rows[0]?.max_i ?? indiceTrimestre(2026, 4);

    const empresaPedida = searchParams.getAll("empresa");
    const entero = (k: string, porDefecto: number) => {
      const n = Number(searchParams.get(k));
      return Number.isFinite(n) && searchParams.get(k) !== null ? n : porDefecto;
    };
    // Se acota a los topes reales: un rango fuera de rango vaciaría el tablero
    // sin explicar por qué.
    const acotar = (n: number) => Math.min(Math.max(n, periodoMin), periodoMax);
    const pedidoDesde = acotar(entero("desde", periodoMin));
    const pedidoHasta = acotar(entero("hasta", periodoMax));

    const f: Filtros = {
      empresa: empresaPedida.length > 0 ? empresaPedida : null,
      desde: Math.min(pedidoDesde, pedidoHasta),
      hasta: Math.max(pedidoDesde, pedidoHasta),
    };

    const cortesDisponibles = cortesRes.rows.map(({ anio, mes }) => ({ anio, mes }));
    const pedido = searchParams.get("corte");
    const elegido =
      cortesRes.rows.find((c) => claveCorte(c) === pedido) ?? cortesRes.rows[0] ?? null;
    const corte = elegido ? claveCorte(elegido) : null;
    // La fecha con la que de verdad se filtra: la última carga de ese mes.
    const cargaCorte = elegido?.carga ?? null;

    const wVal = buildWhere("sv", f, { carga: cargaCorte });
    const wPag = buildWhere("sp", f);
    // Variante numerada a continuación de wVal, para las consultas que unen ambas.
    const wPagOffset = buildWhere("sp", f, { desde: PARAMS_MAPA + wVal.values.length });
    const paramsUnidas = [...M, ...wVal.values, ...wPagOffset.values];

    const resumenPromise = pool.query<FilaResumenRow>(
      consultaResumenPeriodo(MAPA, wVal.where, wPagOffset.where),
      paramsUnidas
    );

    const detallePromise = pool.query<FilaDetalleRow>(
      consultaDetalleGrupos(MAPA, wVal.where, wPagOffset.where),
      paramsUnidas
    );

    const serieValPromise = pool.query<{
      anio: number; trimestre: number; estado: string; conteo: number;
    }>(
      `
      WITH ${MAPA}
      SELECT sv.anio, sv.trimestre, ${ESTADO} AS estado, COUNT(*)::int AS conteo
      FROM subsidios.subsidios_validaciones sv
      WHERE ${wVal.where}
      GROUP BY sv.anio, sv.trimestre, ${ESTADO}
      ORDER BY sv.anio, sv.trimestre
      `,
      [...M, ...wVal.values]
    );

    const seriePagPromise = pool.query<{
      anio: number; trimestre: number; pagos: number; valor_pagado: string | null;
    }>(
      `
      WITH ${MAPA}
      SELECT ${ANIO_SP} AS anio, ${TRIM_SP} AS trimestre,
             COUNT(DISTINCT ${resolucionDistintaSql("sp")})::int AS pagos,
             SUM(sp.valor_pagado) AS valor_pagado
      FROM subsidios.subsidios_pagos sp
      WHERE ${wPag.where}
      GROUP BY 1, 2
      ORDER BY 1, 2
      `,
      [...M, ...wPag.values]
    );

    /* ── KPIs globales ─────────────────────────────────────────────────────
     * No se obtienen sumando las filas de la tabla: una misma resolución paga
     * a varias empresas a la vez, así que esa suma daría 11.381 resoluciones
     * cuando en realidad son 610.
     */
    const kpisPagosPromise = pool.query<{
      total_pagos: number; valor_resolucion: string | null;
      valor_pagado: string | null; saldo_pendiente: string | null;
    }>(
      `
      WITH ${MAPA}
      SELECT COUNT(DISTINCT ${resolucionDistintaSql("sp")})::int AS total_pagos,
             COALESCE(SUM(sp.valor_resolucion), 0) AS valor_resolucion,
             COALESCE(SUM(sp.valor_pagado), 0)     AS valor_pagado,
             COALESCE(SUM(sp.saldo_pendiente), 0)  AS saldo_pendiente
      FROM subsidios.subsidios_pagos sp
      WHERE ${wPag.where}
      `,
      [...M, ...wPag.values]
    );

    /* ── Opciones del filtro de empresa ────────────────────────────────────
     * Se excluye a sí mismo: elegir una empresa no puede vaciar la lista de
     * empresas. Llevan código y NIT porque cinco pares comparten razón social
     * y sin eso el desplegable muestra dos entradas idénticas.
     */
    const wValEmp = buildWhere("sv", f, { carga: cargaCorte, omitirEmpresa: true });
    const wPagEmp = buildWhere("sp", f, {
      omitirEmpresa: true,
      desde: PARAMS_MAPA + wValEmp.values.length,
    });
    const empresasOpcPromise = pool.query<{ key: string; nombre: string; nit: string | null }>(
      `
      WITH ${MAPA},
      claves AS (
        SELECT key, MIN(nombre) AS nombre FROM (
          SELECT ${empresaKeySql("sv")} AS key, sv.nombre_prestador AS nombre
          FROM subsidios.subsidios_validaciones sv WHERE ${wValEmp.where}
          UNION ALL
          SELECT ${empresaKeySql("sp")} AS key, sp.nombre_prestador AS nombre
          FROM subsidios.subsidios_pagos sp WHERE ${wPagEmp.where}
        ) t
        -- Sin filtro sobre la clave: el COALESCE termina en 'NOM:' || nombre,
        -- así que nunca es nula ni vacía. Repetir la expresión en el WHERE
        -- obligaba a evaluarla dos veces más por fila.
        GROUP BY key
      )
      SELECT c.key, COALESCE(se.nombre_prestador, c.nombre) AS nombre,
             NULLIF(se.nit, 'NaN') AS nit
      FROM claves c
      LEFT JOIN subsidios.subsidios_empresas se ON se.codigo_sui = c.key
      ORDER BY 2
      `,
      [...M, ...wValEmp.values, ...wPagEmp.values]
    );

    /* Todas en paralelo: son consultas independientes sobre el mismo pool. */
    const [resumenRes, detalleRes, serieValRes, seriePagRes, kpisPagosRes, empresasOpcRes, cargaRes] =
      await Promise.all([
        resumenPromise,
        detallePromise,
        serieValPromise,
        seriePagPromise,
        kpisPagosPromise,
        empresasOpcPromise,
        pool.query<{ fecha: Date | null }>(
          "SELECT MAX(fecha) AS fecha FROM subsidios.subsidios_import_log"
        ),
      ]);

    /* ── Armado de la respuesta ────────────────────────────────────────── */
    const medidas = (r: FilaResumenRow) => {
      const valorResolucion = toNum(r.valor_resolucion);
      const valorPagado = toNum(r.valor_pagado);
      return {
        anio: r.anio,
        trimestre: r.trimestre,
        fondo: r.fondo,
        estado: r.estado,
        validaciones: toNum(r.validaciones),
        resoluciones: toNum(r.resoluciones),
        resMin: toNumOrNull(r.res_min),
        resMax: toNumOrNull(r.res_max),
        valorResolucion,
        valorPagado,
        saldoPendiente: toNum(r.saldo_pendiente),
        pctEjecucion: pctEjecucion(valorPagado, valorResolucion),
      };
    };

    const resumen = resumenRes.rows.map((r) => ({ ...medidas(r), empresas: toNum(r.empresas) }));
    const detalle = detalleRes.rows.map((r) => ({
      ...medidas(r),
      empresaKey: r.empresa_key,
      nombre: r.nombre_catalogo ?? "Sin nombre",
      codigo: codigoDeClave(r.empresa_key),
      nit: r.nit,
    }));

    const porPeriodo = new Map<string, Record<string, number | string>>();
    for (const row of serieValRes.rows) {
      const periodo = periodoLabel(row.anio, row.trimestre);
      const actual = porPeriodo.get(periodo) ?? {
        periodo, anio: row.anio, trimestre: row.trimestre,
        VF: 0, VP: 0, VI: 0, "VI SP": 0, Otros: 0,
      };
      const etiqueta = row.estado.replace(/^[a-z]\.\s*/, "");
      actual[etiqueta] = toNum(actual[etiqueta]) + toNum(row.conteo);
      porPeriodo.set(periodo, actual);
    }

    const kpisPagos = kpisPagosRes.rows[0];
    const valorPagado = toNum(kpisPagos?.valor_pagado);
    const valorResolucion = toNum(kpisPagos?.valor_resolucion);

    return NextResponse.json({
      corte,
      cortesDisponibles,
      // Fecha de la carga de validaciones que se está mostrando. Un mes tiene
      // dos, y solo se muestra la última: el tablero lo dice al pie.
      cargaValidaciones: cargaCorte,
      fechaCarga: cargaRes.rows[0]?.fecha ?? null,
      kpis: {
        totalPagos: toNum(kpisPagos?.total_pagos),
        valorResolucion,
        valorPagado,
        saldoPendiente: toNum(kpisPagos?.saldo_pendiente),
        pctEjecucion: pctEjecucion(valorPagado, valorResolucion),
        totalEmpresas: new Set(detalle.map((d) => d.empresaKey)).size,
        // Cada validación cae en una sola fila del resumen, así que sumarlas
        // sí da el total del corte y ahorra una consulta.
        totalValidaciones: resumen.reduce((a, r) => a + r.validaciones, 0),
      },
      validacionPorTrimestre: [...porPeriodo.values()],
      pagosPorTrimestre: seriePagRes.rows.map((r) => ({
        periodo: periodoLabel(r.anio, r.trimestre),
        anio: r.anio,
        trimestre: r.trimestre,
        pagos: toNum(r.pagos),
        valorPagado: toNum(r.valor_pagado),
      })),
      resumen,
      detalle,
      periodoDisponible: { min: periodoMin, max: periodoMax },
      filtrosOpciones: {
        empresas: empresasOpcRes.rows.map((r) => ({
          key: r.key,
          nombre: r.nombre,
          codigo: codigoDeClave(r.key),
          nit: r.nit,
        })),
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
