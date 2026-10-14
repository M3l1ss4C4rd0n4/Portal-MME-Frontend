import { getPool } from "@/lib/db";

/**
 * Metadata de cobertura y conciliación de una base SICOM.
 *
 * Hay dos rutas de datos conviviendo y la franja del tablero debe decir cuál
 * está mostrando:
 *
 *   · `cubo`  — extracción directa de los cubos OLAP (etl/etl_sicom_olap.py).
 *               Concilia contra el total que declara el propio cubo.
 *   · `excel` — Excel exportado a mano y subido a OneDrive. Es la ruta heredada;
 *               se conserva para contraste.
 */
export type FuenteSicom = "cubo" | "excel";

export interface CoberturaSicom {
  fuente: FuenteSicom;
  tabla: string;
  archivoFuente: string;
  hoja: string;
  filasCargadas: number;
  medida: string | null;
  sumaDetalle: number | null;
  totalCubo: number | null;
  gapAbs: number | null;
  gapPct: number | null;
  concilia: boolean | null;
  truncado: boolean;
  primeraClave: string | null;
  ultimaClave: string | null;
  /** Solo en la ruta del cubo: identidades distintas (p. ej. agentes). */
  identidades: number | null;
  fechaDato: string | null;
  fechaCarga: string;
}

/** Número desde una columna NUMERIC de node-postgres (llega como string). */
export function num(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

/** Número que puede ser legítimamente nulo (no colapsar a 0). */
export function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

/**
 * Última carga COMPLETA de la base indicada, desde los cubos OLAP.
 *
 * Se excluyen las cargas parciales (`--desde`, que el cron corre de lunes a
 * sábado sobre los dos ciclos recientes): sus cifras no cubren toda la historia
 * y presentarlas como cobertura daría un desvío que no significa nada.
 */
export async function getCoberturaOlap(base: string): Promise<CoberturaSicom | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT base, catalogo, cubo, medida, filas_cargadas, suma_detalle, total_cubo,
            gap_abs, gap_pct, concilia, identidades, fecha_carga
     FROM hidrocarburos.sicom_olap_control
     WHERE base = $1 AND NOT parcial
     ORDER BY fecha_carga DESC
     LIMIT 1`,
    [base]
  );
  const r = rows[0];
  if (!r) return null;

  return {
    fuente: "cubo",
    tabla: r.base,
    archivoFuente: r.catalogo,
    hoja: r.cubo,
    filasCargadas: num(r.filas_cargadas),
    medida: r.medida,
    sumaDetalle: numOrNull(r.suma_detalle),
    totalCubo: numOrNull(r.total_cubo),
    gapAbs: numOrNull(r.gap_abs),
    gapPct: numOrNull(r.gap_pct),
    concilia: r.concilia,
    truncado: false, // el cubo no tiene límite de filas
    primeraClave: null,
    ultimaClave: null,
    identidades: numOrNull(r.identidades),
    fechaDato: r.fecha_carga,
    fechaCarga: r.fecha_carga,
  };
}

/** Última fila de control de la ruta heredada (Excel de OneDrive). */
export async function getCobertura(tabla: string): Promise<CoberturaSicom | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT tabla, archivo_fuente, hoja, filas_cargadas, medida,
            suma_detalle, total_general_declarado, gap_abs, gap_pct,
            concilia, truncado_excel, primer_valor_clave, ultimo_valor_clave,
            fecha_dato, fecha_carga
     FROM hidrocarburos.sicom_carga_control
     WHERE tabla = $1
     ORDER BY fecha_carga DESC
     LIMIT 1`,
    [tabla]
  );
  const r = rows[0];
  if (!r) return null;

  return {
    fuente: "excel",
    tabla: r.tabla,
    archivoFuente: r.archivo_fuente,
    hoja: r.hoja,
    filasCargadas: num(r.filas_cargadas),
    medida: r.medida,
    sumaDetalle: numOrNull(r.suma_detalle),
    totalCubo: numOrNull(r.total_general_declarado),
    gapAbs: numOrNull(r.gap_abs),
    gapPct: numOrNull(r.gap_pct),
    concilia: r.concilia,
    truncado: Boolean(r.truncado_excel),
    primeraClave: r.primer_valor_clave,
    ultimaClave: r.ultimo_valor_clave,
    identidades: null,
    fechaDato: r.fecha_dato,
    fechaCarga: r.fecha_carga,
  };
}
