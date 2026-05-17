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
