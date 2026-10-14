/**
 * Formateadores numéricos reutilizables.
 *
 * Nota: fmtCOP y fmtFull son idénticos en implementación pero se mantienen
 * separados por semántica del dominio (tooltips vs KPIs grandes).
 * Unificación pendiente para Fase 2.x.
 */

export function fmtCOP(v: number): string {
  return `$ ${Math.round(v).toLocaleString("es-CO")}`;
}

export function fmtNum(v: number): string {
  return Math.round(v).toLocaleString("es-CO");
}

export function fmtFull(v: number): string {
  return `$ ${Math.round(v).toLocaleString("es-CO")}`;
}

/** Formato compacto para KPIs de billones/millones (portafolio supervisión). */
export function fmtCOPShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) {
    const n = v / 1e12;
    return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} bill.`;
  }
  if (abs >= 1e9) {
    const n = v / 1e9;
    return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil M`;
  }
  if (abs >= 1e6) {
    const n = v / 1e6;
    return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })} M`;
  }
  return fmtCOP(v);
}

export function formatCOP(v: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatNumber(v: number): string {
  return new Intl.NumberFormat("es-CO").format(v);
}

export function formatPct(v: number, decimals = 2): string {
  return `${v.toFixed(decimals)}%`;
}

export function formatKWp(v: number): string {
  return `${formatNumber(Math.round(v * 100) / 100)} kWp`;
}

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

/**
 * Recibe la fecha exacta del backend ("DD/MM/YYYY, HH:MM") y devuelve
 * "1 de <mes> de <año>" — el día 1 del mes de actualización presupuestal.
 */
export function fmtCortePresupuesto(fechaBackend: string | null | undefined): string {
  if (!fechaBackend) return "1 de abril de 2026";
  const [datePart] = fechaBackend.split(",");
  const [, mm, yyyy] = datePart.trim().split("/");
  const nombreMes = MESES[parseInt(mm, 10) - 1] ?? "";
  return `1 de ${nombreMes} de ${yyyy}`;
}

// ─── Month ordering helpers (used by Colombia Solar dashboard) ────────────

export const MES_ORDER: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

export function sortMeses(meses: string[]): string[] {
  return [...meses].sort((a, b) => (MES_ORDER[a] ?? 99) - (MES_ORDER[b] ?? 99));
}

/** Expresión SQL CASE para ordenar meses cronológicamente (Enero → Diciembre). */
export function mesOrderCaseSql(column = "mes"): string {
  const cases = Object.entries(MES_ORDER)
    .map(([name, n]) => `WHEN '${name}' THEN ${n}`)
    .join(" ");
  return `CASE ${column} ${cases} ELSE 99 END`;
}

/**
 * Número compacto para ejes de gráficas, en convención es-CO.
 *
 * Las medidas de los cubos SICOM llegan hasta ~2,7 × 10^12; con `fmtNum` las
 * etiquetas del eje miden 17 caracteres y se recortan contra el margen.
 */
export function fmtCompactNum(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toLocaleString("es-CO", { maximumFractionDigits: 1 })} bill.`;
  if (abs >= 1e9) return `${(v / 1e9).toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil M`;
  if (abs >= 1e6) return `${(v / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  return fmtNum(v);
}
