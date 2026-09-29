/**
 * Curvas S Colombia Solar — lectura desde PostgreSQL (schema colombia_solar).
 *
 * Modelo de datos PMO (Cuadro Inauguraciones):
 * - Proyectado Obras/Usuarios/Internas: usuarios acumulados planeados (misma curva).
 * - Proyectado Potencia: MWp acumulados planeados.
 * - Reportado Usuarios: avance real principal (8/18 proyectos con datos).
 * - Reportado Obras/Internas/Potencia: reporte parcial o sin diligenciar en muchos casos.
 */

export interface CurvaSPoint {
  fecha: string;
  programado: number;
  real: number | null;
}

export interface ProyectoCurva {
  nombre: string;
  departamento: string;
  operadorDeRed: string;
  programado: CurvaSPoint[];
  /** Origen de la serie Real para transparencia en UI */
  realFuente?: "reportado" | "reportado_usuarios" | "sin_avance" | "sin_datos";
  /** Número total de usuarios del proyecto */
  usuarios?: number;
  /** Potencia total instalada en MWp del proyecto */
  potencia?: number;
}

export interface CurvaSCategoria {
  id: string;
  label: string;
  proyectos: ProyectoCurva[];
}

export const CURVA_S_CATEGORIAS = [
  {
    id: "obrasCiviles",
    label: "Obras Civiles",
    tablaProyectado: "proyectado_obras_civiles",
    tablaReportado: "reportado_obras_civiles",
    denomProyectado: "usuarios" as const,
    denomReportado: "usuarios" as const,
    fallbackUsuarios: true,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    tablaProyectado: "proyectado_usuarios",
    tablaReportado: "reportado_usuarios",
    denomProyectado: "usuarios" as const,
    denomReportado: "usuarios" as const,
    fallbackUsuarios: false,
  },
  {
    id: "potencia",
    label: "Potencia",
    tablaProyectado: "proyectado_potencia",
    tablaReportado: "reportado_potencia",
    denomProyectado: "potencia" as const,
    // Reportado Potencia en Excel registra usuarios energizados, no MWp
    denomReportado: "usuarios" as const,
    fallbackUsuarios: true,
  },
  {
    id: "internas",
    label: "Internas",
    tablaProyectado: "proyectado_internas",
    tablaReportado: "reportado_internas",
    denomProyectado: "usuarios" as const,
    denomReportado: "usuarios" as const,
    fallbackUsuarios: true,
  },
] as const;

type DbRow = Record<string, string | number | null>;

/** col_05_05_2026 o col_5_09_2026 (Excel a veces omite cero inicial) */
const DATE_COL_RE = /^col_(\d{1,2})_(\d{1,2})_(\d{4})$/;

function colToIso(col: string): string {
  const m = col.match(DATE_COL_RE);
  if (!m) return col;
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  return `${m[3]}-${mo}-${d}`;
}

function isDateColumn(col: string): boolean {
  return DATE_COL_RE.test(col);
}

function parseNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/** Fecha de "hoy" (America/Bogota) en formato ISO, para invalidar reportes "futuros". */
export const TODAY_ISO = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" });

/**
 * Un dato "Real" (reportado) con fecha posterior a hoy no puede existir — un avance
 * reportado nunca tiene fecha futura. Estas columnas aparecen por corrupción de datos
 * en la fuente (headers de fecha duplicados que el ETL deduplica pegando un dígito al
 * final, ej. "25/08/2026" repetida → col_25_08_2026 y col_25_08_20262; o fechas mal
 * digitadas en el Excel, ej. columnas de 2027/2028 sueltas). Sin este filtro, ese único
 * dato corrupto arrastra la curva "Real" (promedio) hasta esa fecha, haciéndola ver
 * continua en vez de cortarse en el último reporte real.
 */
export function nullFutureReal(
  values: (number | null)[],
  fechasIso: string[],
  todayIso: string = TODAY_ISO
): (number | null)[] {
  return values.map((v, j) => (fechasIso[j] > todayIso ? null : v));
}

/** Curva acumulada programado: siempre rellena desde 0 */
function forwardFillPct(values: (number | null)[], total: number): number[] {
  let last = 0;
  return values.map((val) => {
    if (val !== null && val > 0) last = Math.max(last, val);
    return total > 0 ? Math.min((last / total) * 100, 100) : 0;
  });
}

/**
 * Curva real: valores INCREMENTALES → acumular con cumSum.
 * NULLs intermedios (desfase de fechas entre hojas) → forward-fill.
 * NULLs al final (contratista dejó de reportar) → cortar la línea.
 */
function forwardFillPctReal(values: (number | null)[], total: number): (number | null)[] {
  let cumSum = 0;
  let hasStarted = false;
  const result: (number | null)[] = values.map((val) => {
    if (val === null) return hasStarted ? Math.min((cumSum / total) * 100, 100) : null;
    cumSum += val;
    hasStarted = true;
    return total > 0 ? Math.min((cumSum / total) * 100, 100) : 0;
  });
  // Recortar trailing forward-fills: si el original era null, volver a null
  let lastNonNull = values.length - 1;
  while (lastNonNull >= 0 && values[lastNonNull] === null) lastNonNull--;
  for (let i = lastNonNull + 1; i < result.length; i++) result[i] = null;
  return result;
}

function extractSeries(row: DbRow, dateCols: string[]): (number | null)[] {
  return dateCols.map((col) => parseNum(row[col]));
}

function maxPositive(values: (number | null)[]): number {
  return values.reduce<number>((max, v) => (v !== null && v > 0 ? Math.max(max, v) : max), 0);
}

function isValidProyecto(nombre: string | null | undefined): nombre is string {
  if (!nombre) return false;
  const n = String(nombre).trim();
  return n.length > 0 && n.toUpperCase() !== "TOTALES";
}

export async function tableExists(pool: DbPool, table: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'colombia_solar' AND table_name = $1`,
    [table]
  );
  return res.rows.length > 0;
}

type DbPool = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: DbRow[] }>;
};

async function getDateColumns(pool: DbPool, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'colombia_solar' AND table_name = $1
       AND column_name ~ '^col_[0-9]'
     ORDER BY column_name`,
    [table]
  );
  return res.rows.map((r) => String(r.column_name ?? "")).filter(isDateColumn);
}

function rowTotal(row: DbRow, denom: "usuarios" | "potencia"): number {
  return denom === "potencia"
    ? parseNum(row.potencia_a_instalar_mwp) || 1
    : parseNum(row.usuarios_totales) || 1;
}

function buildRowMap(rows: DbRow[]): Map<string, DbRow> {
  const map = new Map<string, DbRow>();
  for (const row of rows) {
    const nombre = row.proyecto ? String(row.proyecto).trim() : "";
    if (isValidProyecto(nombre)) map.set(nombre, row);
  }
  return map;
}

export async function loadCurvaSFromDb(pool: DbPool, programa?: string): Promise<CurvaSCategoria[]> {
  const categorias: CurvaSCategoria[] = [];

  let usuariosRepMap = new Map<string, DbRow>();
  if (await tableExists(pool, "reportado_usuarios")) {
    const uRes = programa
      ? await pool.query(`SELECT * FROM colombia_solar."reportado_usuarios" WHERE programa = $1`, [programa])
      : await pool.query(`SELECT * FROM colombia_solar."reportado_usuarios"`);
    usuariosRepMap = buildRowMap(uRes.rows);
  }

  for (const cfg of CURVA_S_CATEGORIAS) {
    const hasProj = await tableExists(pool, cfg.tablaProyectado);
    const hasRep = await tableExists(pool, cfg.tablaReportado);
    if (!hasProj) continue;

    const projRes = programa
      ? await pool.query(`SELECT * FROM colombia_solar."${cfg.tablaProyectado}" WHERE programa = $1`, [programa])
      : await pool.query(`SELECT * FROM colombia_solar."${cfg.tablaProyectado}"`);
    const repRes = hasRep
      ? (programa
        ? await pool.query(`SELECT * FROM colombia_solar."${cfg.tablaReportado}" WHERE programa = $1`, [programa])
        : await pool.query(`SELECT * FROM colombia_solar."${cfg.tablaReportado}"`))
      : { rows: [] as DbRow[] };

    if (projRes.rows.length === 0) continue;

    const projDateCols = await getDateColumns(pool, cfg.tablaProyectado);
    const repDateColsRaw = hasRep ? await getDateColumns(pool, cfg.tablaReportado) : [];
    // "Proyectado" define el horizonte real del proyecto. Una columna de
    // "Reportado" con fecha posterior a ese horizonte es un encabezado
    // corrupto en el Excel (año mal digitado, ej. 2027/2028/2029 en vez de
    // 2026) — se excluye del eje compartido para que no lo estire ni
    // desplace los ticks visibles, aunque su valor ya se anule aparte vía
    // nullFutureReal.
    const maxProjIso = projDateCols.length
      ? projDateCols.map(colToIso).reduce((a, b) => (b > a ? b : a))
      : null;
    const repDateCols = maxProjIso
      ? repDateColsRaw.filter((c) => colToIso(c) <= maxProjIso)
      : repDateColsRaw;
    const dateColSet = new Set([...projDateCols, ...repDateCols]);
    const dateCols = [...dateColSet].sort((a, b) => colToIso(a).localeCompare(colToIso(b)));
    const fechasIso = dateCols.map(colToIso);

    const repByName = buildRowMap(repRes.rows);

    const proyectos: ProyectoCurva[] = [];
    for (const row of projRes.rows) {
      const nombre = row.proyecto ? String(row.proyecto).trim() : "";
      if (!isValidProyecto(nombre)) continue;

      let repRow = repByName.get(nombre);
      const repRowExiste = repRow !== undefined;
      let realFuente: ProyectoCurva["realFuente"] = "sin_datos";

      if (repRow) {
        const repMax = maxPositive(nullFutureReal(extractSeries(repRow, dateCols), fechasIso));
        if (repMax > 0) {
          realFuente = "reportado";
        } else if (cfg.fallbackUsuarios && usuariosRepMap.has(nombre)) {
          const uMax = maxPositive(
            nullFutureReal(extractSeries(usuariosRepMap.get(nombre)!, dateCols), fechasIso)
          );
          if (uMax > 0) {
            repRow = usuariosRepMap.get(nombre);
            realFuente = "reportado_usuarios";
          } else {
            realFuente = "sin_avance";
          }
        } else {
          realFuente = "sin_avance";
        }
      } else if (cfg.fallbackUsuarios && usuariosRepMap.has(nombre)) {
        const uMax = maxPositive(
          nullFutureReal(extractSeries(usuariosRepMap.get(nombre)!, dateCols), fechasIso)
        );
        if (uMax > 0) {
          repRow = usuariosRepMap.get(nombre);
          realFuente = "reportado_usuarios";
        } else {
          realFuente = repRowExiste ? "sin_avance" : "sin_datos";
        }
      }

      const progSeries = extractSeries(row, dateCols);
      const realSeriesRaw = repRow ? extractSeries(repRow, dateCols) : dateCols.map(() => null);
      const realSeries = nullFutureReal(realSeriesRaw, fechasIso);

      // Si total=0 en Excel (celda vacía), derivar del máximo acumulado de la serie
      const rawTotalProg = rowTotal(row, cfg.denomProyectado);
      const totalProg = rawTotalProg > 1 ? rawTotalProg : (maxPositive(progSeries) || 1);
      const rawTotalRep = repRow ? rowTotal(repRow, cfg.denomReportado) : rawTotalProg;
      const totalRep = rawTotalRep > 1 ? rawTotalRep : (maxPositive(realSeries) || totalProg);

      const progPct = forwardFillPct(progSeries, totalProg);
      const realPct = forwardFillPctReal(realSeries, totalRep);

      // Extraer usuarios y potencia del proyecto (para KPIs dinámicos)
      const usuariosVal = parseNum(row.usuarios_totales) ?? 0;
      const potenciaVal = parseNum(row.potencia_a_instalar_mwp) ?? 0;

      proyectos.push({
        nombre,
        departamento: row.departamento ? String(row.departamento) : "",
        operadorDeRed: row.operador_de_red ? String(row.operador_de_red).trim() : "",
        realFuente,
        usuarios: usuariosVal,
        potencia: potenciaVal,
        programado: fechasIso.map((fecha, j) => ({
          fecha,
          programado: progPct[j],
          real: realPct[j],
        })),
      });
    }

    if (proyectos.length > 0) {
      categorias.push({ id: cfg.id, label: cfg.label, proyectos });
    }
  }

  return categorias;
}
