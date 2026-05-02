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
