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
  real: number;
}

export interface ProyectoCurva {
  nombre: string;
  departamento: string;
  operadorDeRed: string;
  programado: CurvaSPoint[];
  /** Origen de la serie Real para transparencia en UI */
  realFuente?: "reportado" | "reportado_usuarios" | "sin_datos";
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

/** Curva acumulada: null y 0 explícitos no reinician el avance */
function forwardFillPct(values: (number | null)[], total: number): number[] {
  let last = 0;
  return values.map((val) => {
    if (val !== null && val > 0) last = val;
    return total > 0 ? (last / total) * 100 : 0;
  });
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

export async function loadCurvaSFromDb(pool: DbPool): Promise<CurvaSCategoria[]> {
  const categorias: CurvaSCategoria[] = [];

  let usuariosRepMap = new Map<string, DbRow>();
  if (await tableExists(pool, "reportado_usuarios")) {
    const uRes = await pool.query(`SELECT * FROM colombia_solar."reportado_usuarios"`);
    usuariosRepMap = buildRowMap(uRes.rows);
  }

  for (const cfg of CURVA_S_CATEGORIAS) {
    const hasProj = await tableExists(pool, cfg.tablaProyectado);
    const hasRep = await tableExists(pool, cfg.tablaReportado);
    if (!hasProj) continue;

    const projRes = await pool.query(`SELECT * FROM colombia_solar."${cfg.tablaProyectado}"`);
    const repRes = hasRep
      ? await pool.query(`SELECT * FROM colombia_solar."${cfg.tablaReportado}"`)
      : { rows: [] as DbRow[] };

    if (projRes.rows.length === 0) continue;

    const projDateCols = await getDateColumns(pool, cfg.tablaProyectado);
    const repDateCols = hasRep ? await getDateColumns(pool, cfg.tablaReportado) : [];
    const dateColSet = new Set([...projDateCols, ...repDateCols]);
    const dateCols = [...dateColSet].sort((a, b) => colToIso(a).localeCompare(colToIso(b)));
    const fechasIso = dateCols.map(colToIso);

    const repByName = buildRowMap(repRes.rows);

    const proyectos: ProyectoCurva[] = [];
    for (const row of projRes.rows) {
      const nombre = row.proyecto ? String(row.proyecto).trim() : "";
      if (!isValidProyecto(nombre)) continue;

      let repRow = repByName.get(nombre);
      let realFuente: ProyectoCurva["realFuente"] = "sin_datos";

      if (repRow) {
        const repMax = maxPositive(extractSeries(repRow, dateCols));
        if (repMax > 0) {
          realFuente = "reportado";
        } else if (cfg.fallbackUsuarios && usuariosRepMap.has(nombre)) {
          const uMax = maxPositive(extractSeries(usuariosRepMap.get(nombre)!, dateCols));
          if (uMax > 0) {
            repRow = usuariosRepMap.get(nombre);
            realFuente = "reportado_usuarios";
          }
        }
      } else if (cfg.fallbackUsuarios && usuariosRepMap.has(nombre)) {
        const uMax = maxPositive(extractSeries(usuariosRepMap.get(nombre)!, dateCols));
        if (uMax > 0) {
          repRow = usuariosRepMap.get(nombre);
          realFuente = "reportado_usuarios";
        }
      }

      const totalProg = rowTotal(row, cfg.denomProyectado);
      const totalRep = repRow ? rowTotal(repRow, cfg.denomReportado) : totalProg;

      const progSeries = extractSeries(row, dateCols);
      const realSeries = repRow ? extractSeries(repRow, dateCols) : dateCols.map(() => null);

      const progPct = forwardFillPct(progSeries, totalProg);
      const realPct = forwardFillPct(realSeries, totalRep);

      proyectos.push({
        nombre,
        departamento: row.departamento ? String(row.departamento) : "",
        operadorDeRed: row.operador_de_red ? String(row.operador_de_red).trim() : "",
        realFuente,
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
