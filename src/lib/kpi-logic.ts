/**
 * Lógica de estados y diagnósticos del SIN.
 * Delega en umbralesOficiales.ts (marco CREG) — mantiene API estable para tests y slides.
 */

import {
  clasificarIndiceNE,
  clasificarVisualAportes,
  clasificarVisualEmbalse,
  clasificarVisualPrecioBolsa,
  HSIN_UMBRAL_NORMAL,
  NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT,
  OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT,
  PRECIO_ESCASEZ_PEI_REF_2026_01,
  PRECIO_ESCASEZ_PE_REF_2026_01,
  PRECIO_ESCASEZ_PES_REF_2026_01,
} from "./umbralesOficiales";

export interface EstadoResult {
  label: string;
  color: string;
}

export interface EstadoReservasResult extends EstadoResult {
  tw: string;
}

const TW_COLOR_MAP: Record<string, string> = {
  "#22C55E": "text-emerald-400",
  "#06B6D4": "text-cyan-400",
  "#F59E0B": "text-amber-400",
  "#F97316": "text-orange-400",
  "#EF4444": "text-red-400",
};

export interface PreciosEscasezOpciones {
  pei?: number;
  pe?: number;
  pes?: number;
}

export function estadoReservas(pct: number): EstadoReservasResult {
  const v = clasificarVisualEmbalse(pct);
  return { label: v.label, color: v.color, tw: TW_COLOR_MAP[v.color] ?? "text-slate-400" };
}

export function estadoAportes(pct: number): EstadoResult {
  const v = clasificarVisualAportes(pct);
  return { label: v.label, color: v.color };
}

export function estadoPrecio(
  precio: number,
  precios?: PreciosEscasezOpciones,
): EstadoResult {
  const v = clasificarVisualPrecioBolsa(
    precio,
    precios?.pei ?? PRECIO_ESCASEZ_PEI_REF_2026_01,
    precios?.pe ?? PRECIO_ESCASEZ_PE_REF_2026_01,
    precios?.pes ?? PRECIO_ESCASEZ_PES_REF_2026_01,
  );
  return { label: v.label, color: v.color };
}

const GEN_PRIO: Record<string, number> = {
  "TECHO REGULATORIO": 4,
  "CRÍTICO": 4,
  "CRÍTICO HISTÓRICO — SEQUÍA": 4,
  "RIESGO — DESABASTECIMIENTO": 4,
  "ALTA PRESIÓN": 3,
  "ALERTA": 3,
  "ESTRÉS MODERADO": 2,
  "ALERTA MEDIA": 2,
  "VIGILANCIA": 1,
  "VIGILANCIA CREG": 1,
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
  precio: number,
  precios?: PreciosEscasezOpciones,
): EstadoResult {
  const all: Array<EstadoResult> = [];
  all.push(estadoPrecio(precio, precios));
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
  _precio: number,
): string {
  const ne = clasificarIndiceNE(reservasPct);
  const sendaPct = ne.sendaReferenciaPct;

  if (ne.nivel === "INFERIOR") {
    return `Sistema en RIESGO — embalse ${reservasPct.toFixed(1)}% bajo senda CREG ${sendaPct.toFixed(1)}%.`;
  }
  if (ne.nivel === "ALERTA") {
    if (aportesPct !== null && aportesPct < HSIN_UMBRAL_NORMAL) {
      return `Sistema en VIGILANCIA — embalse bajo senda CREG + HSIN ${aportesPct.toFixed(1)}% < 90%.`;
    }
    return `Sistema en alerta temprana — embalse bajo senda CREG ${sendaPct.toFixed(1)}%.`;
  }
  if (reservasPct >= OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT) {
    return `Sistema en condiciones normales — embalse ≥ objetivo XM (${OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT}%).`;
  }
  if (reservasPct >= NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT) {
    return `Sistema estable — embalse ≥ 70% (regla absoluta CREG 209/2020).`;
  }
  return `Sistema sobre senda CREG ${sendaPct.toFixed(1)}% — NE Superior.`;
}
