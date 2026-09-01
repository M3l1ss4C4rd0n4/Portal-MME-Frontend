/**
 * Riesgo de UN embalse individual según IDEAM/UNGRD (seguridad de presa —
 * riesgo de desborde/sequía), NO el Índice NE de la CREG (que compara el
 * embalse AGREGADO del SIN contra la senda de referencia — ver
 * src/lib/umbralesOficiales.ts::clasificarVisualEmbalse, usado en
 * src/lib/embalses-coords.ts para ese caso).
 *
 * Fuente: IDEAM (Instituto de Hidrología, Meteorología y Estudios
 * Ambientales) y UNGRD (Unidad Nacional para la Gestión del Riesgo de
 * Desastres) — mismos umbrales ya citados en
 * server/domain/services/orchestrator/handlers/anomalias_handler.py.
 *
 * Unificado 2026-08-26 (a pedido del usuario): antes esta función tenía su
 * propio umbral inventado (50/60/70/80, sin cita), una de 5 implementaciones
 * independientes e inconsistentes del mismo concepto en el proyecto. Espejo
 * exacto de server/core/umbrales_ideam_ungrd.py — ver ese archivo para el
 * detalle completo de la unificación.
 */
export function getEmbalseColor(pct: number): string {
  if (pct < 27) return "#EF4444"; // Crítico — racionamiento
  if (pct < 40) return "#F97316"; // Alerta — nivel bajo
  if (pct <= 80) return "#22C55E"; // Normal
  if (pct <= 90) return "#F59E0B"; // Alerta — nivel elevado
  if (pct <= 95) return "#F97316"; // Alerta — nivel muy alto
  return "#EF4444"; // Crítico — desbordamiento
}

export function getEmbalseEstado(pct: number): string {
  if (pct < 27) return "Crítico — racionamiento";
  if (pct < 40) return "Alerta — nivel bajo";
  if (pct <= 80) return "Normal";
  if (pct <= 90) return "Alerta — nivel elevado";
  if (pct <= 95) return "Alerta — nivel muy alto";
  return "Crítico — desbordamiento";
}
