/**
 * Lógica pura de cálculo de estados y diagnósticos del SIN.
 * Sin dependencias de React — testeable unitariamente.
 */

export interface EstadoResult {
  label: string;
  color: string;
}

export interface EstadoReservasResult extends EstadoResult {
  tw: string;
}

export function estadoReservas(pct: number): EstadoReservasResult {
  if (pct >= 80) return { label: "NORMAL", color: "#22C55E", tw: "text-emerald-400" };
  if (pct >= 70) return { label: "ESTABLE", color: "#06B6D4", tw: "text-cyan-400" };
  if (pct >= 60) return { label: "ALERTA TEMPRANA", color: "#F59E0B", tw: "text-amber-400" };
  if (pct >= 50) return { label: "ALERTA ALTA", color: "#F97316", tw: "text-orange-400" };
  return { label: "CRÍTICO", color: "#EF4444", tw: "text-red-400" };
}

export function estadoAportes(pct: number): EstadoResult {
  if (pct >= 120) return { label: "MUY FAVORABLE", color: "#22C55E" };
  if (pct >= 100) return { label: "NORMAL", color: "#06B6D4" };
  if (pct >= 90) return { label: "VIGILANCIA", color: "#F59E0B" };
  if (pct >= 70) return { label: "DÉFICIT HÍDRICO", color: "#F97316" };
  return { label: "CRÍTICO — SEQUÍA", color: "#EF4444" };
}

export function estadoPrecio(precio: number): EstadoResult {
  if (precio < 200) return { label: "CÓMODO", color: "#22C55E" };
  if (precio < 300) return { label: "ESTRÉS MODERADO", color: "#F59E0B" };
  if (precio < 400) return { label: "ALERTA", color: "#F97316" };
  return { label: "CRISIS ENERGÉTICA", color: "#EF4444" };
}

const GEN_PRIO: Record<string, number> = {
  "CRISIS ENERGÉTICA": 4,
  "CRÍTICO": 4,
  "ALERTA": 3,
  "ESTRÉS MODERADO": 2,
  "ALERTA MEDIA": 2,
  "VIGILANCIA": 1,
};

function prio(label: string): number {
  return GEN_PRIO[label] ?? 0;
}

export function estadoI2Hidro(ratio: number): EstadoResult {
  if (ratio <= 1.0) return { label: "SOSTENIBLE", color: "#22C55E" };
  if (ratio <= 1.2) return { label: "VIGILANCIA", color: "#F59E0B" };
  if (ratio <= 1.5) return { label: "ALERTA", color: "#F97316" };
  return { label: "CRÍTICO", color: "#EF4444" };
}

export function estadoI3Termica(pct: number): EstadoResult {
  if (pct <= 15) return { label: "SOSTENIBLE", color: "#22C55E" };
  if (pct <= 25) return { label: "NORMAL", color: "#06B6D4" };
  if (pct <= 35) return { label: "ALERTA MEDIA", color: "#F97316" };
  return { label: "CRÍTICO", color: "#EF4444" };
}

export function estadoGeneracion(
  fuentes: Array<{ id: string; value: number }> | undefined,
  totalGwh: number,
  dailyAportesGwh: number | null | undefined,
  precio: number
): EstadoResult {
  const all: Array<EstadoResult> = [];
  all.push(estadoPrecio(precio));
  if (fuentes && fuentes.length > 0) {
    const hidro = fuentes.find((f) => f.id === "HIDRAULICA");
    const termica = fuentes.find((f) => f.id === "TERMICA");
    if (termica) all.push(estadoI3Termica(termica.value));
    if (hidro && dailyAportesGwh && dailyAportesGwh > 0) {
      const ratio = (hidro.value / 100) * totalGwh / dailyAportesGwh;
      all.push(estadoI2Hidro(ratio));
    }
  }
  all.sort((a, b) => prio(b.label) - prio(a.label));
  return all[0] ?? { label: "CONTEXTUAL", color: "#64748B" };
}

export function diagnosticoSIN(
  reservasPct: number,
  aportesPct: number | null,
  precio: number
): string {
  if (reservasPct < 50)
    return "Sistema en estado crítico — se requieren medidas urgentes de racionamiento.";
  if (reservasPct < 60)
    return "Sistema en alerta alta — riesgo de desabastecimiento si los aportes no mejoran.";
  if (reservasPct < 70) {
    if (aportesPct !== null && aportesPct < 90)
      return "Sistema bajo vigilancia, con riesgo si los aportes no mejoran.";
    return "Sistema en alerta temprana — monitoreando evolución de embalses y aportes.";
  }
  if (reservasPct < 80)
    return "Sistema estable, con seguimiento preventivo de niveles hídricos.";
  return "Sistema en condiciones normales — niveles cómodos.";
}
