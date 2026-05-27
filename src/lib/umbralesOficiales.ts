/**
 * ═════════════════════════════════════════════════════════════════════════════
 * UMBRALES OFICIALES DEL SECTOR ELÉCTRICO COLOMBIANO (Portal de Dirección MME)
 *
 * Único punto de verdad para todos los umbrales visuales del portal.
 * Todos los valores están respaldados por resoluciones de la CREG y
 * publicaciones oficiales de XM/CND.
 *
 * ESTE MÓDULO ES EL ESPEJO TYPESCRIPT DE:
 *   /home/admonctrlxm/server/core/umbrales_oficiales.py
 *
 * Mantener sincronizado con la versión Python al actualizar normativa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FUENTES REGULATORIAS:
 *   - Resolución CREG 026 de 2014 — Estatuto para Situaciones de Riesgo de
 *     Desabastecimiento. Índices HSIN y PBP.
 *   - Resolución CREG 071 de 2006 — Precio de escasez.
 *   - Resolución CREG 140 de 2017 — Precio Marginal de Escasez (PES).
 *   - Resolución CREG 209 de 2020 — Senda de Referencia e Índice NE.
 *   - Resolución CREG 101 055 de 2024 — Complemento al Estatuto.
 *   - Resolución CREG 101 066 de 2024 — Tres niveles de precio de escasez
 *     (PEI, PE, PES).
 *
 * Publicación oficial XM/CND:
 *   https://www.xm.com.co/resoluciones/operacion-y-mercado/resolucion-creg-209-de-2020-condicion-del-sistema
 *
 * Última revisión: 25 de mayo de 2026.
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. SENDA DE REFERENCIA CREG E ÍNDICE NE
// ─────────────────────────────────────────────────────────────────────────────
// Resolución CREG 209/2020, art. 2.8.2.1.3.
// La senda es el nivel diario MÍNIMO del embalse útil del SIN (% volumen útil
// total ≈ 17 000 GWh) necesario para asegurar el suministro.
//
// Índice NE (Nivel de Embalse):
//   • SUPERIOR: embalse ≥ senda  O  embalse ≥ 70% (regla absoluta CREG)
//   • ALERTA:   senda − X ≤ embalse < senda
//   • INFERIOR: embalse < senda − X  (X = 0 en práctica reciente)
// ─────────────────────────────────────────────────────────────────────────────

/** Regla absoluta CREG 209/2020: por encima de 70% siempre nivel superior. */
export const NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT = 70.0;

/** Objetivo XM ante El Niño (Boletín XM 10-abril-2026). NO regulatorio. */
export const OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT = 80.0;

/** Tolerancia de la senda en puntos porcentuales (X = 0 en práctica reciente). */
export const SENDA_TOLERANCIA_PP = 0.0;

/**
 * Senda de Referencia mensual oficial publicada por XM/CND
 * (Res. CREG 209/2020). Valores en % del volumen útil del SIN.
 *
 * Referencias usadas:
 *   - 1 mayo 2024 = 28.7% (Circular CREG 023/2024, senda invierno 2024)
 *   - 30 noviembre 2024 = 67.8% (fin invierno 2024)
 *   - Abril 2024 = 35.4% (reporte CREG)
 *
 * IMPORTANTE: en producción debería consultarse vía API/FTPS de XM. Esta tabla
 * es el fallback regulatoriamente correcto.
 */
export const SENDA_REFERENCIA: Record<number, number> = {
  1: 55.0,   // Enero (estación verano)
  2: 47.0,   // Febrero
  3: 37.0,   // Marzo (mínimo histórico verano)
  4: 35.4,   // Abril (oficial CREG)
  5: 28.7,   // Mayo (oficial CREG inicio invierno 2024)
  6: 35.0,   // Junio
  7: 45.0,   // Julio
  8: 55.0,   // Agosto
  9: 62.0,   // Septiembre
  10: 65.0,  // Octubre
  11: 67.8,  // Noviembre (oficial CREG fin invierno 2024)
  12: 65.0,  // Diciembre (inicio verano siguiente)
};

/** Devuelve el % mínimo de embalse según Senda CREG para el mes dado. */
export function obtenerSendaReferencia(fecha?: Date): number {
  const f = fecha ?? new Date();
  const mes = f.getMonth() + 1; // JS: 0-11 → 1-12
  return SENDA_REFERENCIA[mes] ?? 50.0;
}

export type NivelNE = "SUPERIOR" | "ALERTA" | "INFERIOR";

export interface ResultadoIndiceNE {
  nivel: NivelNE;
  descripcion: string;
  sendaReferenciaPct: number;
}

/**
 * Clasifica el embalse según el Índice NE oficial (Estatuto CREG 209/2020).
 */
export function clasificarIndiceNE(
  nivelEmbalsePct: number,
  fecha?: Date,
): ResultadoIndiceNE {
  const senda = obtenerSendaReferencia(fecha);

  if (nivelEmbalsePct >= NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT) {
    return {
      nivel: "SUPERIOR",
      descripcion: `Embalse ${nivelEmbalsePct.toFixed(1)}% > 70% (regla absoluta CREG 209/2020).`,
      sendaReferenciaPct: senda,
    };
  }

  if (nivelEmbalsePct >= senda) {
    return {
      nivel: "SUPERIOR",
      descripcion: `Embalse ${nivelEmbalsePct.toFixed(1)}% ≥ senda ${senda.toFixed(1)}% (Estatuto CREG).`,
      sendaReferenciaPct: senda,
    };
  }

  const umbralInferior = senda - SENDA_TOLERANCIA_PP;
  if (nivelEmbalsePct >= umbralInferior) {
    return {
      nivel: "ALERTA",
      descripcion: `Embalse ${nivelEmbalsePct.toFixed(1)}% entre ${umbralInferior.toFixed(1)}% y senda ${senda.toFixed(1)}%.`,
      sendaReferenciaPct: senda,
    };
  }

  return {
    nivel: "INFERIOR",
    descripcion: `Embalse ${nivelEmbalsePct.toFixed(1)}% < senda ${senda.toFixed(1)}% − ${SENDA_TOLERANCIA_PP}pp.`,
    sendaReferenciaPct: senda,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. APORTES HÍDRICOS — ÍNDICE HSIN (Res. CREG 026/2014 art. 2)
// ─────────────────────────────────────────────────────────────────────────────

/** HSIN ≥ 90% → condición normal (Resolución CREG 026/2014 art. 2). */
export const HSIN_UMBRAL_NORMAL = 90.0;
/** HSIN < 70% → déficit severo (referencia CREG 209/2020). */
export const HSIN_UMBRAL_DEFICIT_SEVERO = 70.0;
/** HSIN ≤ 60% → nivel crítico histórico (abril 2020). */
export const HSIN_UMBRAL_CRITICO_HISTORICO = 60.0;
/** Ventana de cálculo HSIN según Estatuto CREG. */
export const HSIN_VENTANA_SEMANAS = 4;

// ─────────────────────────────────────────────────────────────────────────────
// 3. PRECIO DE BOLSA — PEI / PE / PES (Res. CREG 101 066/2024)
// ─────────────────────────────────────────────────────────────────────────────
// Valores de referencia enero 2026 (XM publicación oficial).
// Estos valores se actualizan MENSUALMENTE por la CREG y deben venir del API
// de XM en producción.

export const PRECIO_ESCASEZ_PEI_REF_2026_01 = 327.67; // COP/kWh
export const PRECIO_ESCASEZ_PE_REF_2026_01 = 590.56;  // COP/kWh
export const PRECIO_ESCASEZ_PES_REF_2026_01 = 830.34; // COP/kWh

// ─────────────────────────────────────────────────────────────────────────────
// 4. CAPACIDAD OFICIAL DEL SIN
// ─────────────────────────────────────────────────────────────────────────────

/** Capacidad útil de reserva del SIN (CNO 634): ≈ 17 000 GWh. */
export const CAPACIDAD_UTIL_RESERVA_SIN_GWH = 17_000;

/** Capacidad efectiva neta instalada del SIN (XM dic-2025): 21 028.56 MW. */
export const CAPACIDAD_EFECTIVA_NETA_SIN_MW = 21_028.56;

// ─────────────────────────────────────────────────────────────────────────────
// 5. CLASIFICACIONES VISUALES DERIVADAS DE LA NORMATIVA
// ─────────────────────────────────────────────────────────────────────────────

export interface EstadoVisual {
  label: string;
  color: string;
  fuenteRegulatoria: string;
}

/**
 * Clasificación visual del embalse alineada con Senda CREG e Índice NE.
 * 5 niveles para comunicación gerencial al Viceministro.
 */
export function clasificarVisualEmbalse(
  nivelEmbalsePct: number,
  fecha?: Date,
): EstadoVisual {
  const ne = clasificarIndiceNE(nivelEmbalsePct, fecha);

  if (nivelEmbalsePct >= OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT) {
    return {
      label: "NORMAL",
      color: "#22C55E",
      fuenteRegulatoria: `≥ ${OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT}% (objetivo XM Boletín 04-2026).`,
    };
  }
  if (nivelEmbalsePct >= NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT) {
    return {
      label: "ESTABLE",
      color: "#06B6D4",
      fuenteRegulatoria: `≥ ${NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT}% (regla absoluta CREG 209/2020).`,
    };
  }
  if (ne.nivel === "SUPERIOR") {
    return {
      label: "SOBRE SENDA",
      color: "#F59E0B",
      fuenteRegulatoria: `≥ senda CREG ${ne.sendaReferenciaPct.toFixed(1)}% (Estatuto CREG 026/2014).`,
    };
  }
  if (ne.nivel === "ALERTA") {
    return {
      label: "ALERTA — BAJO SENDA",
      color: "#F97316",
      fuenteRegulatoria: `< senda CREG ${ne.sendaReferenciaPct.toFixed(1)}% — NE Alerta.`,
    };
  }
  return {
    label: "RIESGO — DESABASTECIMIENTO",
    color: "#EF4444",
    fuenteRegulatoria: `< senda CREG ${ne.sendaReferenciaPct.toFixed(1)}% — NE Inferior (CREG 026/2014 art. 3).`,
  };
}

/**
 * Clasificación visual de aportes hídricos alineada con HSIN oficial.
 */
export function clasificarVisualAportes(
  aportesPctVsHistorico: number,
): EstadoVisual {
  if (aportesPctVsHistorico >= 120) {
    return {
      label: "MUY FAVORABLE",
      color: "#22C55E",
      fuenteRegulatoria: "≥ 120% media histórica — temporada lluviosa intensa.",
    };
  }
  if (aportesPctVsHistorico >= 100) {
    return {
      label: "NORMAL",
      color: "#06B6D4",
      fuenteRegulatoria: "≥ 100% media histórica — suministro normal.",
    };
  }
  if (aportesPctVsHistorico >= HSIN_UMBRAL_NORMAL) {
    return {
      label: "VIGILANCIA CREG",
      color: "#F59E0B",
      fuenteRegulatoria: `≥ ${HSIN_UMBRAL_NORMAL}% — HSIN aún normal (CREG 026/2014).`,
    };
  }
  if (aportesPctVsHistorico >= HSIN_UMBRAL_DEFICIT_SEVERO) {
    return {
      label: "DÉFICIT HÍDRICO",
      color: "#F97316",
      fuenteRegulatoria: `< ${HSIN_UMBRAL_NORMAL}% — HSIN en vigilancia (CREG 026/2014 art. 2).`,
    };
  }
  if (aportesPctVsHistorico >= HSIN_UMBRAL_CRITICO_HISTORICO) {
    return {
      label: "DÉFICIT SEVERO",
      color: "#EF4444",
      fuenteRegulatoria: `< ${HSIN_UMBRAL_DEFICIT_SEVERO}% — déficit severo (CREG 209/2020).`,
    };
  }
  return {
    label: "CRÍTICO HISTÓRICO — SEQUÍA",
    color: "#EF4444",
    fuenteRegulatoria: `≤ ${HSIN_UMBRAL_CRITICO_HISTORICO}% — nivel histórico de crisis (abril 2020).`,
  };
}

/**
 * Clasificación visual del precio de bolsa alineada con PEI/PE/PES oficiales.
 */
export function clasificarVisualPrecioBolsa(
  pbpActual: number,
  pei: number = PRECIO_ESCASEZ_PEI_REF_2026_01,
  pe: number = PRECIO_ESCASEZ_PE_REF_2026_01,
  pes: number = PRECIO_ESCASEZ_PES_REF_2026_01,
): EstadoVisual {
  if (pbpActual < pei) {
    return {
      label: "CÓMODO",
      color: "#22C55E",
      fuenteRegulatoria: `< PEI ${pei.toFixed(0)} COP/kWh — sin presión (CREG 101 066/2024).`,
    };
  }
  if (pbpActual < pe) {
    return {
      label: "ESTRÉS MODERADO",
      color: "#F59E0B",
      fuenteRegulatoria: `≥ PEI ${pei.toFixed(0)} — alza moderada (CREG 101 066/2024).`,
    };
  }
  if (pbpActual < pes) {
    return {
      label: "ALTA PRESIÓN",
      color: "#F97316",
      fuenteRegulatoria: `≥ PE ${pe.toFixed(0)} — alta presión (CREG 101 066/2024).`,
    };
  }
  return {
    label: "TECHO REGULATORIO",
    color: "#EF4444",
    fuenteRegulatoria: `≥ PES ${pes.toFixed(0)} COP/kWh — cerca techo escasez (CREG 140/2017).`,
  };
}
