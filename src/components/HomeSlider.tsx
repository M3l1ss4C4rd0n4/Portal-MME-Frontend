"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import SemiGauge from "@/components/ui/SemiGauge";
import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { useHomeSlider } from "@/hooks/useHomeSlider";
import { fmtCortePresupuesto } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import SlideRedesX, { ALL_X_ACCOUNTS } from "@/components/SlideRedesX";
import CapacidadEmbalseChart, { type CapacidadEmbalseData } from "@/components/charts/CapacidadEmbalseChart";
import InformesDiariosSlider from "@/components/InformesDiariosSlider";
import { SlideSupervision } from "@/components/slides/SlideSupervision";
import type { TermicaSliderData } from "@/types/home-slider";
// Marco regulatorio oficial — Resolución CREG 026/2014, 209/2020, 101 066/2024
import {
  clasificarVisualEmbalse,
  clasificarVisualAportes,
  clasificarVisualPrecioBolsa,
  clasificarIndiceNE,
  obtenerSendaReferencia,
  NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT,
  OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT,
  HSIN_UMBRAL_NORMAL,
  HSIN_UMBRAL_DEFICIT_SEVERO,
  HSIN_UMBRAL_CRITICO_HISTORICO,
  PRECIO_ESCASEZ_PEI_REF_2026_01,
  PRECIO_ESCASEZ_PE_REF_2026_01,
  PRECIO_ESCASEZ_PES_REF_2026_01,
} from "@/lib/umbralesOficiales";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtCOP = (v: number) => `$ ${Math.round(v).toLocaleString("es-CO")}`;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
  titulo?: string;
  title?: string;
  resumen?: string;
  fuente?: string;
  url?: string;
  imagen?: string;
  image?: string;
  fecha?: string;
}

export interface HomeSliderProps {
  sectorData: {
    generacionGwh: number;
    precioBolsa: number;
    pctEmbalses: number;
    embalseGwh?: number | null;
    capacidadEmbalseGwh?: number | null;
    aportesHidricos?: {
      actualGwh: number;
      historicoGwh: number;
      pct?: number | null;
      hsinPct?: number | null;
      pctMtd?: number | null;
      indiceHsin?: string | null;
      dailyActualGwh?: number | null;
      dailyHistGwh?: number | null;
    };
    umbralesRegulatorios?: {
      sendaReferenciaPct?: number;
      indiceNe?: string;
      indiceHsin?: string;
      indicePbp?: string;
      condicionSistema?: string;
      pei?: number;
      pe?: number;
      pes?: number;
      preciosOrigen?: string;
    } | null;
    estadoSin?: string | null;
    colorSin?: string | null;
    tendencias?: {
      embalses?: MetricaTendencia | null;
      precio?: MetricaTendencia | null;
      generacion?: MetricaTendencia | null;
      aportes?: MetricaTendencia | null;
    } | null;
    fechaGeneracion?: string | null;
    fechaPrecio?: string | null;
    fechaEmbalse?: string | null;
    fechaAportes?: string | null;
    ultimaActualizacion?: string | null;
    ultimaEjecucionETL?: string | null;
    oniActual?: number | null;
    oniClasificacion?: string | null;
    oniFecha?: string | null;
    oniProyeccionInicio?: string | null;
  };
  sectorDetalle?: {
    generacionPorFuente: Array<{ id: string; label: string; value: number; color: string; generacionGwh: number }>;
    precioBolsaSeries: Array<{ id: string; color: string; data: Array<{ x: string; y: number; fecha?: Date }> }>;
    embalsesPromedio: number;
    embalses: Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh: number }>;
    aportesRios: Array<{ codigo: string; nombre: string; actualGwh: number; historicoGwh: number; porcentaje: number }>;
    sparklines: { embalses: Array<{ x: string; y: number }>; aportes: Array<{ x: string; y: number }> };
  };
  termicaData?: TermicaSliderData;
  presuData: {
    totales: {
      apropiacion: number;
      comprometido: number;
      pct_comprometido: number;
      obligados: number;
      pct_obligado: number;
    };
    ultimaActualizacion?: string | null;
  };
  cemData: { implementadas: number; inversionEstimada: number; capacidadKwp: number };
  cemDepts?: Array<{ name: string; count: number; capacidad?: number }>;
  orData: {
    nContratos: number;
    avanceGeneral: number;
    avanceFinanciero: number;
    nUsuarios: number;
    nCEs: number;
    inversionTotal: number;
    potenciaTotal: number;
  };
  supData: {
    nContratos: number;
    nProyectos: number;
    enEjecucion: number;
    enAOM: number;
    enLiquidacion: number;
    liquidados: number;
    perdidaCompetencia: number;
    avanceFisico: number;
    avanceFinanciero: number;
    avanceContrato: number;
    avanceFisicoActivos: number;
    avanceFinancieroActivos: number;
    financiero: {
      valorProyecto: number;
      valorDesembolsado: number;
      valorPorDesembolsar: number;
      pctDesembolsado: number;
    };
    usuarios: { contratados: number; finales: number };
    nFotovoltaicos: number;
    porFondo: { fondo: string; contratos: number }[];
  };
  subData: {
    deficitAcumulado: number;
    anio2025: { resoluciones: number; valorAsignado: number; pendiente: number; pagado: number };
    anio2026: { resoluciones: number; valorAsignado: number; pendiente: number; pagado: number };
    historico?: { anio: number; fondo: string; valor_asignado: number; pagado: number; pendiente: number }[];
    ultimaActualizacion?: string | null;
  };
  deficitFssri?: number;
  deficitSeries?: Array<{ x: string; y: number }>;
  subBarData?: Array<{ anio: string; Subsidios: number; Contribuciones: number }>;
}

// ─── Config ────────────────────────────────────────────────────────────────────
const SLIDE_INTERVAL_MS = 90000; // 1.5 minutos (90 segundos) por slide

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtNum(v: number) {
  return Math.round(v).toLocaleString("es-CO");
}
function fmtFull(v: number) {
  return `$ ${Math.round(v).toLocaleString("es-CO")}`;
}

// ─── Animation variants ────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: { duration: 0.5, ease: [0.55, 0.04, 0.9, 0.3] as const },
  }),
};

// ─── KPI Block (reutilizable) ──────────────────────────────────────────────────
function KpiBlock({
  label, value, unit, date, valueClass = "text-gold", large = false,
  chipLabel, chipColor, tendencia, metrica,
  valueTitle, chipTitle, trendTitle,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  date?: string | null;
  valueClass?: string;
  large?: boolean;
  chipLabel?: string;
  chipColor?: string;
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  /** Tooltip nativo al pasar cursor sobre el valor numérico */
  valueTitle?: string;
  /** Tooltip nativo al pasar cursor sobre el chip de estado */
  chipTitle?: string;
  /** Tooltip nativo al pasar cursor sobre el badge de tendencia */
  trendTitle?: string;
}) {
  const strLen = typeof value === 'string' || typeof value === 'number' ? String(value).length : 12;
  let fontClass: string;
  
  if (large) {
    if (strLen <= 8) {
      fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";
    } else if (strLen <= 12) {
      fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
    } else if (strLen <= 18) {
      fontClass = "text-2xl xl:text-3xl 2xl:text-4xl";
    } else {
      fontClass = "text-lg xl:text-xl 2xl:text-2xl";
    }
  } else {
    if (strLen <= 8) {
      fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
    } else if (strLen <= 12) {
      fontClass = "text-2xl xl:text-3xl 2xl:text-4xl";
    } else if (strLen <= 18) {
      fontClass = "text-xl xl:text-2xl 2xl:text-3xl";
    } else {
      fontClass = "text-lg xl:text-xl 2xl:text-2xl";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-2">
      <p className="text-theme-muted text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium">
        {label}
      </p>
      <div
        className={`inline-flex items-center gap-2 font-black leading-none break-all ${valueClass} ${fontClass}`}
        style={tendencia && tendencia.label !== "S/D" ? { color: getTrendColor(tendencia, metrica ?? "valor") } : undefined}
        title={valueTitle}
      >
        {value}
        <TrendArrow tendencia={tendencia} metrica={metrica} trendTitle={trendTitle} />
      </div>
      {(unit || date) && (
        <p className="text-slate-400 text-xs xl:text-sm 2xl:text-base mt-0.5">
          {unit}
          {unit && date && " · "}
          {date && `Dato: ${date}`}
        </p>
      )}
      <TrendBadge tendencia={tendencia} metrica={metrica} title={trendTitle} />
      {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} title={chipTitle} />}
    </div>
  );
}

// ─── Slide decoration helpers ──────────────────────────────────────────────────
function TopAccent({ color }: { color: string }) {
  return (
    <div
      className="absolute top-0 inset-x-0 h-1"
      style={{
        background: `linear-gradient(90deg, transparent, ${color}99, transparent)`,
      }}
    />
  );
}

function SectionBadge({
  label,
  pulse = false,
  dot = "#F59E0B",
}: {
  label: string;
  pulse?: boolean;
  dot?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      <span
        className={`w-3.5 h-3.5 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: dot }}
      />
      <span className="text-gold font-black tracking-[0.3em] text-xl xl:text-2xl 2xl:text-3xl uppercase">
        {label}
      </span>
    </div>
  );
}

// ─── Helpers de estado por métrica ────────────────────────────────────────────
// IMPORTANTE: Todos los estados ahora se calculan con el marco regulatorio
// oficial colombiano (Estatuto CREG para Situaciones de Riesgo de Desabasteci-
// miento). Ver @/lib/umbralesOficiales para detalle de cada umbral y su fuente.
// ─────────────────────────────────────────────────────────────────────────────

// Tailwind classes asociadas a cada color hex oficial
const _TW_COLOR_MAP: Record<string, string> = {
  "#22C55E": "text-emerald-400",  // Verde
  "#06B6D4": "text-cyan-400",     // Cian
  "#F59E0B": "text-gold",    // Ámbar
  "#F97316": "text-orange-400",   // Naranja
  "#EF4444": "text-red-400",      // Rojo
};

/**
 * Estado de reservas hídricas — Índice NE oficial (Resolución CREG 209/2020).
 * Compara contra Senda de Referencia mensual publicada por XM/CND.
 */
function estadoReservas(pct: number) {
  const v = clasificarVisualEmbalse(pct);
  return { label: v.label, color: v.color, tw: _TW_COLOR_MAP[v.color] ?? "text-slate-400" };
}

/**
 * Estado de aportes hídricos — Índice HSIN oficial (CREG 026/2014 art. 2).
 * HSIN = aportes vs media histórica × 100.
 */
function estadoAportes(pct: number) {
  const v = clasificarVisualAportes(pct);
  return { label: v.label, color: v.color };
}

/**
 * Estado de precio de bolsa — niveles oficiales CREG 101 066/2024.
 * Compara contra PEI/PE/PES (tres niveles regulatorios de precio de escasez).
 */
function estadoPrecio(
  precio: number,
  precios?: { pei?: number; pe?: number; pes?: number },
) {
  const v = clasificarVisualPrecioBolsa(
    precio,
    precios?.pei ?? PRECIO_ESCASEZ_PEI_REF_2026_01,
    precios?.pe ?? PRECIO_ESCASEZ_PE_REF_2026_01,
    precios?.pes ?? PRECIO_ESCASEZ_PES_REF_2026_01,
  );
  return { label: v.label, color: v.color };
}

const _GEN_PRIO: Record<string, number> = {
  "TECHO REGULATORIO": 4, "CRISIS ENERGÉTICA": 4, "CRÍTICO": 4,
  "RIESGO — DESABASTECIMIENTO": 4, "CRÍTICO HISTÓRICO — SEQUÍA": 4,
  "ALTA PRESIÓN": 3, "ALERTA": 3,
  "ESTRÉS MODERADO": 2, "ALERTA MEDIA": 2,
  "VIGILANCIA": 1, "VIGILANCIA CREG": 1,
};
function _prio(label: string) { return _GEN_PRIO[label] ?? 0; }

function estadoI2Hidro(ratio: number) {
  if (ratio <= 1.0) return { label: "SOSTENIBLE",  color: "#22C55E" };
  if (ratio <= 1.2) return { label: "VIGILANCIA",  color: "#F59E0B" };
  if (ratio <= 1.5) return { label: "ALERTA",      color: "#F97316" };
  return              { label: "CRÍTICO",          color: "#EF4444" };
}
function estadoI3Termica(pct: number) {
  if (pct <= 15) return { label: "SOSTENIBLE",   color: "#22C55E" };
  if (pct <= 25) return { label: "NORMAL",       color: "#06B6D4" };
  if (pct <= 35) return { label: "ALERTA MEDIA", color: "#F97316" };
  return           { label: "CRÍTICO",           color: "#EF4444" };
}

function estadoGeneracion(
  fuentes: Array<{ id: string; value: number }> | undefined,
  totalGwh: number,
  dailyAportesGwh: number | null | undefined,
  precio: number,
  precios?: { pei?: number; pe?: number; pes?: number },
): { label: string; color: string } {
  const all: Array<{ label: string; color: string }> = [];
  const stPr = estadoPrecio(precio, precios);
  all.push(stPr);
  if (fuentes && fuentes.length > 0) {
    const hidro   = fuentes.find(f => f.id === "HIDRAULICA");
    const termica = fuentes.find(f => f.id === "TERMICA");
    if (termica) all.push(estadoI3Termica(termica.value));
    if (hidro && dailyAportesGwh && dailyAportesGwh > 0) {
      const ratio = (hidro.value / 100) * totalGwh / dailyAportesGwh;
      all.push(estadoI2Hidro(ratio));
    }
  }
  all.sort((a, b) => _prio(b.label) - _prio(a.label));
  return all[0] ?? { label: "CONTEXTUAL", color: "#64748B" };
}

/**
 * Parámetros para el diagnóstico holístico del SIN.
 */
interface DiagnosticoParams {
  reservasPct: number;
  aportesPct: number | null;
  precio: number;
  preciosReg: {
    pei?: number;
    pe?: number;
    pes?: number;
    indiceNe?: string;
    indiceHsin?: string;
    indicePbp?: string;
    condicionSistema?: string;
  } | null | undefined;
  generacionGwh: number;
  fuentes: Array<{ id: string; value: number; generacionGwh: number }> | undefined;
  tendencias: {
    embalses?: MetricaTendencia | null;
    precio?: MetricaTendencia | null;
    generacion?: MetricaTendencia | null;
    aportes?: MetricaTendencia | null;
  } | null | undefined;
  estados: {
    reservas: { label: string; color: string };
    aportes: { label: string; color: string } | null;
    precio: { label: string; color: string };
    generacion: { label: string; color: string };
  };
  oniActual: number | null;
  oniClasificacion: string | null;
  oniProyeccionInicio: string | null;
}

/**
 * Diagnóstico narrativo del SIN — integra todos los indicadores + clima ONI.
 * Busca ser conciso, causal y proyectivo, no repetitivo de las fichas.
 * Marco regulatorio: Estatuto CREG 026/2014 + Res. CREG 209/2020 + ONI NOAA CPC.
 */
function diagnosticoSIN(params: DiagnosticoParams): string {
  const {
    reservasPct, aportesPct, precio, preciosReg,
    fuentes, oniActual, oniClasificacion, oniProyeccionInicio,
  } = params;

  const hidro = fuentes?.find(f => f.id === "HIDRAULICA");
  const termica = fuentes?.find(f => f.id === "TERMICA");
  const hidroPct = hidro?.value ?? null;
  const termicaPct = termica?.value ?? null;

  // ── Oración 1: Encabezado (una línea, sin repetir números) ──────────
  let texto = "";

  if (reservasPct >= 70 && (aportesPct ?? 100) >= 60 && precio < (preciosReg?.pe ?? 591)) {
    texto += "El sector energético se encuentra en condiciones normales. ";
  } else if (reservasPct < 50 || (aportesPct ?? 100) < 40 || precio >= (preciosReg?.pe ?? 591)) {
    texto += "El sector energético presenta condiciones de estrés. ";
  } else {
    texto += "El sector energético está en vigilancia. ";
  }

  // ── Oración 2: Relación causal embalses–aportes ─────────────────────
  if (aportesPct != null && aportesPct < 90 && reservasPct >= 70) {
    texto += `Aunque los aportes hídricos están por debajo de lo normal (${aportesPct.toFixed(0)}%), los embalses aún se mantienen estables al ${reservasPct.toFixed(0)}%. `;
  } else if (aportesPct != null && aportesPct >= 90) {
    texto += `Los aportes hídricos están en nivel normal, sosteniendo los embalses al ${reservasPct.toFixed(0)}%. `;
  } else {
    texto += `Embalses al ${reservasPct.toFixed(0)}%. `;
  }

  // ── Oración 3: Proyección ENSO (valor agregado) ────────────────────
  if (oniActual != null && oniClasificacion) {
    if (oniClasificacion === "EL_NIÑO") {
      texto += `El Fenómeno de El Niño está activo (ONI ${oniActual.toFixed(2)}°C), reduciendo las lluvias y presionando el sistema. `;
    } else if (oniClasificacion === "LA_NIÑA") {
      texto += `El Fenómeno de La Niña está activo (ONI ${oniActual.toFixed(2)}°C), aumentando las lluvias y favoreciendo los aportes. `;
    } else if (oniProyeccionInicio) {
      texto += `El ENSO aún es neutral (ONI ${oniActual.toFixed(2)}°C), pero la tendencia de calentamiento proyecta que El Niño comenzaría aproximadamente en ${oniProyeccionInicio}. `;
    } else {
      texto += `El ENSO se mantiene neutral (ONI ${oniActual.toFixed(2)}°C), sin presión climática adicional en el horizonte. `;
    }
  }

  // ── Oración 4: Generación y precio (solo lo relevante) ─────────────
  if (hidroPct != null && termicaPct != null) {
    texto += `La generación hidráulica cubre el ${hidroPct.toFixed(1)}% de la demanda, y la térmica el ${termicaPct.toFixed(1)}%. `;
  }

  const pe = preciosReg?.pe ?? PRECIO_ESCASEZ_PE_REF_2026_01;
  if (precio < pe) {
    texto += `El precio de bolsa ($ ${precio.toFixed(0)} COP/kWh) ha aumentado pero no llega al precio de escasez de $ ${Math.round(pe).toLocaleString('es-CO')}. `;
  } else {
    texto += `El precio de bolsa ($ ${precio.toFixed(0)} COP/kWh) ya superó el precio de escasez de $ ${Math.round(pe).toLocaleString('es-CO')}. `;
  }

  // ── Oración 5: Cierre ──────────────────────────────────────────────
  if (reservasPct >= 70 && (aportesPct ?? 100) >= 60 && precio < pe) {
    texto += `Sin novedades — operación normal del SIN.`;
  } else if (reservasPct < 50 || precio >= pe) {
    texto += `Se requieren medidas preventivas — monitoreo continuo.`;
  } else {
    texto += `Seguimiento recomendado — evolución en próximos días.`;
  }

  return texto;
}

// ─── StatusChip: sub-ficha de estado ──────────────────────────────────────────
function StatusChip({ label, color, title }: { label: string; color: string; title?: string }) {
  return (
    <div
      className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] xl:text-xs font-bold tracking-wider uppercase"
      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
      title={title}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </div>
  );
}

// ─── HydroKpiBlock: columna estilo XM para embalses/aportes ───────────────────
function HydroKpiBlock({
  label, pct, pctColor,
  gwh, gwhRef, gwhRefLabel,
  dailyGwh, dailyHistGwh,
  date, chipLabel, chipColor, tendencia, metrica,
  valueTitle, chipTitle, trendTitle, gwhTitle,
}: {
  label: string;
  pct: number;
  pctColor: string;
  gwh?: number | null;
  gwhRef?: number | null;
  gwhRefLabel?: string;
  dailyGwh?: number | null;
  dailyHistGwh?: number | null;
  date?: string | null;
  chipLabel?: string;
  chipColor?: string;
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  /** Tooltip nativo sobre el % */
  valueTitle?: string;
  /** Tooltip nativo sobre el chip de estado */
  chipTitle?: string;
  /** Tooltip nativo sobre el badge de tendencia */
  trendTitle?: string;
  /** Tooltip nativo sobre la línea de GWh */
  gwhTitle?: string;
}) {
  const fmt = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  const fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-2">
      <p className="text-slate-400 text-base xl:text-lg 2xl:text-xl uppercase tracking-[0.18em] font-medium">
        {label}
      </p>
      <div
        className={`inline-flex items-center gap-2 ${fontClass} font-black leading-none ${pctColor}`}
        style={tendencia && tendencia.label !== "S/D" ? { color: getTrendColor(tendencia, metrica ?? "valor") } : undefined}
        title={valueTitle}
      >
        {pct.toFixed(2)}%
        <TrendArrow tendencia={tendencia} metrica={metrica} trendTitle={trendTitle} />
      </div>
      {gwh != null && (
        <p className="text-slate-300 text-xs xl:text-sm font-semibold mt-0.5" title={gwhTitle}>
          {fmt(gwh)} GWh
          {gwhRef != null && (
            <span className="text-slate-500 font-normal"> · {gwhRefLabel ?? "ref."} {fmt(gwhRef)} GWh</span>
          )}
        </p>
      )}
      {dailyGwh != null ? (
        <p className="text-slate-500 text-[10px] xl:text-xs">
          {date ?? "hoy"}: {fmt(dailyGwh)} GWh
          {dailyHistGwh != null && (
            <span className="text-slate-600"> · media {fmt(dailyHistGwh)} GWh</span>
          )}
        </p>
      ) : (
        date && <p className="text-slate-500 text-[10px] xl:text-xs">{date}</p>
      )}
      <TrendBadge tendencia={tendencia} metrica={metrica} title={trendTitle} />
      {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} title={chipTitle} />}
    </div>
  );
}

// ─── Dual Gauge + Sparklines (Embalses + Aportes) ──────────────────────────────
function DualGaugeSparklines({ embalsesPct, aportesPct, sparklines }: {
  embalsesPct: number;
  aportesPct: number | null;
  sparklines: { embalses: Array<{ x: string; y: number }>; aportes: Array<{ x: string; y: number }> };
}) {
  // Gauge helpers
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 180) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const embColor = embalsesPct < 50 ? "#EF4444" : embalsesPct < 60 ? "#F97316" : embalsesPct < 70 ? "#F59E0B" : embalsesPct < 80 ? "#06B6D4" : "#22C55E";
  const apoColor = aportesPct === null ? "#94A3B8" : aportesPct < 80 ? "#EF4444" : aportesPct < 100 ? "#F59E0B" : "#22C55E";

  // Sparkline helper
  const MiniSpark = ({ data, color, height = 28 }: { data: Array<{ x: string; y: number }>; color: string; height?: number }) => {
    if (data.length < 2) return <div className="h-[28px]" />;
    const vals = data.map(d => d.y);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = 2;
    const w = 100;
    const h = height;
    const range = max - min || 1;
    const points = data.map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((d.y - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[28px]" preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points.split(" ").pop()?.split(",")[0]} cy={points.split(" ").pop()?.split(",")[1]} r="2" fill={color} />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Reservas y Aportes · Estado Actual</p>
      <div className="flex-1 flex gap-2">
        {/* Embalses Gauge */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full aspect-[2/1]">
            <svg viewBox="0 0 120 65" className="w-full h-full">
              {/* Background arc */}
              <path d={describeArc(60, 60, 50, 0, 180)} fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
              {/* Value arc */}
              <path d={describeArc(60, 60, 50, 0, (embalsesPct / 100) * 180)} fill="none" stroke={embColor} strokeWidth="10" strokeLinecap="round" />
              {/* Center text */}
              <text x="60" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{embalsesPct.toFixed(1)}%</text>
              <text x="60" y="62" textAnchor="middle" fill="#94A3B8" fontSize="7">Embalses</text>
            </svg>
          </div>
          <MiniSpark data={sparklines.embalses} color={embColor} />
        </div>
        {/* Aportes Gauge */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full aspect-[2/1]">
            <svg viewBox="0 0 120 65" className="w-full h-full">
              <path d={describeArc(60, 60, 50, 0, 180)} fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
              <path d={describeArc(60, 60, 50, 0, ((aportesPct ?? 0) / 100) * 180)} fill="none" stroke={apoColor} strokeWidth="10" strokeLinecap="round" />
              <text x="60" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{aportesPct !== null ? `${aportesPct.toFixed(1)}%` : "—"}</text>
              <text x="60" y="62" textAnchor="middle" fill="#94A3B8" fontSize="7">Aportes</text>
            </svg>
          </div>
          <MiniSpark data={sparklines.aportes} color={apoColor} />
        </div>
      </div>
    </div>
  );
}

// ─── Slide 1: Gestión del Sector ───────────────────────────────────────────────
function SlideGestionSector({ d, detalle }: { d: HomeSliderProps["sectorData"]; detalle?: HomeSliderProps["sectorDetalle"] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [embalseData, setEmbalseData] = useState<CapacidadEmbalseData | null>(null);
  useEffect(() => {
    fetch("/api/embalses/capacidad-historica")
      .then((r) => r.json())
      .then((json) => setEmbalseData(json))
      .catch(() => undefined);
  }, []);

  const hasDetalle = !!detalle && detalle.generacionPorFuente.length > 0;
  const hasPrecioSeries = !!detalle && detalle.precioBolsaSeries.length > 0 && detalle.precioBolsaSeries[0].data.length > 0;
  const aportes = d.aportesHidricos;
  const preciosReg = d.umbralesRegulatorios;
  const aportesPct = aportes?.hsinPct ?? aportes?.pct ?? (
    aportes && aportes.historicoGwh > 0 ? (aportes.actualGwh / aportes.historicoGwh) * 100 : null
  );

  const stRes = estadoReservas(d.pctEmbalses);
  const stAp  = aportesPct !== null ? estadoAportes(aportesPct) : null;
  const stPr  = estadoPrecio(d.precioBolsa, preciosReg ?? undefined);
  const stGen = estadoGeneracion(
    detalle?.generacionPorFuente,
    d.generacionGwh,
    aportes?.dailyActualGwh,
    d.precioBolsa,
    preciosReg ?? undefined,
  );
  const diagnostico = diagnosticoSIN({
    reservasPct: d.pctEmbalses,
    aportesPct,
    precio: d.precioBolsa,
    preciosReg: d.umbralesRegulatorios,
    generacionGwh: d.generacionGwh,
    fuentes: detalle?.generacionPorFuente,
    tendencias: d.tendencias,
    estados: { reservas: stRes, aportes: stAp, precio: stPr, generacion: stGen },
    oniActual: d.oniActual ?? null,
    oniClasificacion: d.oniClasificacion ?? null,
    oniProyeccionInicio: d.oniProyeccionInicio ?? null,
  });

  const aportesColor = aportesPct === null ? "text-slate-400"
    : aportesPct >= HSIN_UMBRAL_NORMAL ? "text-emerald-400"
    : aportesPct >= HSIN_UMBRAL_DEFICIT_SEVERO ? "text-gold"
    : "text-red-400";

  // ─── Tooltips nativos (title) para cada valor ────────────────────────────
  const pei = preciosReg?.pei ?? PRECIO_ESCASEZ_PEI_REF_2026_01;
  const pe  = preciosReg?.pe  ?? PRECIO_ESCASEZ_PE_REF_2026_01;
  const pes = preciosReg?.pes ?? PRECIO_ESCASEZ_PES_REF_2026_01;

  const sendaPct = obtenerSendaReferencia();
  const ne = clasificarIndiceNE(d.pctEmbalses);

  // Variables auxiliares para tendencias
  const chPrecio = d.tendencias?.precio?.cambio7d;
  const chGeneracion = d.tendencias?.generacion?.cambio7d;
  const chEmbalses = d.tendencias?.embalses?.cambio7d;
  const chAportes = d.tendencias?.aportes?.cambio7d;

  // ─── Precio de Bolsa ──────────────────────────────────────────────────────
  const tPrecioValor =
    `Este es el precio al que se vendió la energía hoy en el mercado mayorista colombiano: ` +
    `$${d.precioBolsa.toFixed(2)} por cada kilovatio-hora. ` +
    `Es un promedio de todas las ofertas que fueron aceptadas en la bolsa de energía. ` +
    `El operador del mercado, XM, publica este dato todos los días.`;

  const tPrecioChip =
    `${stPr.label}. El precio de hoy, $${d.precioBolsa.toFixed(2)}, se encuentra en un nivel ` +
    (d.precioBolsa < pei
      ? `cómodo, por debajo del piso mínimo de $${pei.toFixed(0)}. Esto significa que generar energía es barato y no hay presión en el mercado.`
      : d.precioBolsa < pe
      ? `medio: supera el piso mínimo del precio de escasez inferior, $${pei.toFixed(0)}, pero todavía no alcanza el umbral del precio de escasez de $${pe.toFixed(0)}. El mercado está en vigilancia.`
      : d.precioBolsa < pes
      ? `alto: ya superó el precio de escasez de $${pe.toFixed(0)}. Cuando el precio llega a este nivel, se considera que hay estrés en el mercado y se activan medidas de seguimiento.`
      : `crítico: superó el precio de escasez superior de $${pes.toFixed(0)}. Este es el escenario más delicado. La energía es muy cara y hay riesgo de desabastecimiento.`);

  const tPrecioTrend =
    chPrecio != null
      ? `El precio ${chPrecio > 0 ? 'subió' : 'bajó'} ${Math.abs(chPrecio).toFixed(1)}% con respecto al promedio de los últimos 7 días. ` +
        (chPrecio > 0 ? 'Cuando el precio sube, hay más presión en el mercado y la energía se vuelve más costosa.' : 'Cuando el precio baja, es una buena noticia: la energía se está volviendo más barata.')
      : `Se compara el precio de hoy con el promedio de la última semana para ver si está subiendo o bajando.`;

  // ─── Energía Generada ────────────────────────────────────────────────────
  const tGeneracionValor =
    `Hoy se generaron ${d.generacionGwh.toFixed(2)} gigavatios-hora en todo el Sistema Interconectado Nacional. ` +
    `Esto es la suma de toda la electricidad que produjeron las plantas hidráulicas, térmicas, solares y eólicas del país. ` +
    `Para referencia, un día típico Colombia consume entre 200 y 250 GWh. La capacidad instalada total del sistema es de 21.029 megavatios.`;

  // ─── Función auxiliar para tooltip de generación ────────────────────────
  function buildTGeneracionChip(): string {
    const fuentes = detalle?.generacionPorFuente;
    const hidroPct = fuentes?.find(f => f.id === "HIDRAULICA")?.value;
    const termicaPct = fuentes?.find(f => f.id === "TERMICA")?.value;
    const dailyAportes = aportes?.dailyActualGwh;
    const indiceI2 = hidroPct != null && dailyAportes && dailyAportes > 0
      ? estadoI2Hidro((hidroPct / 100) * d.generacionGwh / dailyAportes).label
      : null;
    const indiceI3 = termicaPct != null ? estadoI3Termica(termicaPct).label : null;

    let detalle2 = `${stGen.label}. El estado de la generación se calcula tomando el peor resultado de tres indicadores:\n\n`;
    
    detalle2 += `1. Precio de bolsa (I1): ${stPr.label}. El precio de hoy es $${d.precioBolsa.toFixed(2)} COP/kWh. `;
    if (d.precioBolsa < pei) detalle2 += `Está por debajo del precio de escasez inferior ($${pei.toFixed(0)}), nivel cómodo.`;
    else if (d.precioBolsa < pe) detalle2 += `Supera el piso de $${pei.toFixed(0)} pero no llega al precio de escasez de $${pe.toFixed(0)}.`;
    else if (d.precioBolsa < pes) detalle2 += `Ya superó el precio de escasez de $${pe.toFixed(0)}. Hay estrés en el mercado.`;
    else detalle2 += `Superó el precio de escasez superior de $${pes.toFixed(0)}. Nivel crítico.`;
    
    detalle2 += `\n\n2. Sostenibilidad hidráulica (I2): ${indiceI2 ?? 'sin datos'}. `;
    if (hidroPct != null && dailyAportes && dailyAportes > 0) {
      const ratio = (hidroPct / 100) * d.generacionGwh / dailyAportes;
      detalle2 += `Mide qué tanta generación hidráulica (${hidroPct.toFixed(1)}% del total, ${((hidroPct/100)*d.generacionGwh).toFixed(1)} GWh) hay frente al agua que está llegando a los embalses (${dailyAportes.toFixed(1)} GWh hoy). `;
      detalle2 += `El resultado es un ratio de ${ratio.toFixed(2)}. `;
      if (ratio <= 1.0) detalle2 += `Como es menor o igual a 1.0, se considera sostenible: hay más agua llegando de la que se está usando.`;
      else if (ratio <= 1.2) detalle2 += `Como está entre 1.0 y 1.2, se considera en vigilancia: se está usando un poco más de agua de la que está llegando.`;
      else if (ratio <= 1.5) detalle2 += `Como está entre 1.2 y 1.5, se considera en alerta: se está usando bastante más agua de la que está llegando.`;
      else detalle2 += `Como es mayor a 1.5, se considera crítico: se está usando mucha más agua de la que está llegando a los embalses.`;
    } else {
      detalle2 += `No hay suficientes datos de generación hidráulica o de aportes para calcular este indicador.`;
    }
    
    detalle2 += `\n\n3. Estrés térmico (I3): ${indiceI3 ?? 'sin datos'}. `;
    if (termicaPct != null) {
      detalle2 += `Hoy las plantas térmicas generaron el ${termicaPct.toFixed(1)}% del total. `;
      if (termicaPct <= 15) detalle2 += `Como es 15% o menos, se considera sostenible: el sistema no depende de las térmicas.`;
      else if (termicaPct <= 25) detalle2 += `Como está entre 15% y 25%, se considera normal.`;
      else if (termicaPct <= 35) detalle2 += `Como está entre 25% y 35%, se considera en alerta media: hay una dependencia creciente de las térmicas.`;
      else detalle2 += `Como es mayor a 35%, se considera crítico: el sistema depende demasiado de las térmicas, lo cual es costoso y menos eficiente.`;
    } else {
      detalle2 += `No hay datos de generación térmica para este día.`;
    }
    
    detalle2 += `\n\nDe los tres indicadores, el peor es "${stGen.label}", y ese es el estado que se muestra.`;
    return detalle2;
  }

  const tGeneracionChip = buildTGeneracionChip();

  const tGeneracionTrend =
    chGeneracion != null
      ? `La generación ${chGeneracion > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(chGeneracion).toFixed(1)}% con respecto al promedio de los últimos 7 días. ` +
        (chGeneracion > 0 ? 'Puede ser por mayor demanda o por buenas condiciones de generación.' : 'Puede ser por menor demanda o por dificultades en la generación.')
      : `Se compara la generación de hoy con el promedio de la última semana.`;

  // ─── Reservas Hídricas ───────────────────────────────────────────────────
  const tReservasValor =
    `Los embalses del país están al ${d.pctEmbalses.toFixed(1)}% de su capacidad total. ` +
    `Esto significa que, de toda el agua que pueden almacenar las represas para generar electricidad, hoy tenemos ocupado ese porcentaje. ` +
    `La capacidad total de todos los embalses equivale a unos 17.000 gigavatios-hora de energía potencial. ` +
    `El dato lo publica XM todos los días.`;

  const tReservasGwh =
    `En este momento hay almacenados ${d.embalseGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh de energía en forma de agua en los embalses, ` +
    `de un total posible de ${d.capacidadEmbalseGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh. ` +
    `Es como la batería del sistema: cuando los embalses están llenos, hay energía de sobra; cuando están vacíos, hay que prender otras plantas.`;

  const tReservasChip =
    `${stRes.label}. ` +
    (ne.nivel === 'SUPERIOR'
      ? `Los embalses están en muy buen nivel, por encima de la senda de referencia que establece la CREG (${sendaPct.toFixed(1)}% para este mes). Esto significa que hay agua suficiente y el sistema está tranquilo.`
      : ne.nivel === 'ALERTA'
      ? `Los embalses están por debajo de la senda de referencia que fija la CREG (${sendaPct.toFixed(1)}%). Todavía no es crítico, pero hay que vigilar de cerca la evolución en los próximos días.`
      : `Los embalses están en un nivel inferior al esperado para esta época del año. La senda de referencia de la CREG es de ${sendaPct.toFixed(1)}%. Esta situación puede activar medidas de seguimiento especial.`);

  const tReservasTrend =
    chEmbalses != null
      ? `Los embalses ${chEmbalses > 0 ? 'subieron' : 'bajaron'} ${Math.abs(chEmbalses).toFixed(1)} puntos porcentuales con respecto a hace 7 días. ` +
        (chEmbalses > 0 ? 'Están recuperándose, lo cual es una buena noticia para el sistema.' : 'Están perdiendo agua, lo cual puede ser preocupante si la tendencia continúa.')
      : `Compara el nivel de los embalses hoy con el de hace una semana.`;

  // ─── Aportes Hídricos ────────────────────────────────────────────────────
  const tAportesValor =
    `Los ríos están aportando ${aportesPct?.toFixed(1) ?? '—'}% del agua que históricamente aportan en esta misma época del año. ` +
    `Si el valor es 100%, significa que están en su nivel normal. Si es mayor, hay más agua de lo normal. Si es menor, hay menos. ` +
    `Este indicador se calcula acumulando el agua que ha llegado a los embalses desde el primero de enero y comparándolo con el promedio histórico del mismo período.`;

  const tAportesGwh =
    `En lo que va corrido del año, los ríos han aportado ${aportes?.actualGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh a los embalses. ` +
    `Históricamente, en este mismo período, el aporte promedio es de ${aportes?.historicoGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh. ` +
    `La diferencia entre estos dos números te dice si este ha sido un año más lluvioso o más seco de lo normal.`;

  const tAportesChip =
    `${stAp?.label ?? 'Sin datos'}. ` +
    (aportesPct !== null
      ? aportesPct >= HSIN_UMBRAL_NORMAL
        ? `Los aportes están en un nivel normal o mejor de lo normal. Los ríos están trayendo suficiente agua a los embalses.`
        : aportesPct >= HSIN_UMBRAL_DEFICIT_SEVERO
        ? `Los aportes están por debajo de lo normal. Están entre el ${HSIN_UMBRAL_DEFICIT_SEVERO}% y el ${HSIN_UMBRAL_NORMAL}% del promedio histórico. Este es un nivel de vigilancia: hay que monitorear si la situación mejora o empeora.`
        : aportesPct >= HSIN_UMBRAL_CRITICO_HISTORICO
        ? `Los aportes están en un nivel de déficit severo. Están entre el ${HSIN_UMBRAL_CRITICO_HISTORICO}% y el ${HSIN_UMBRAL_DEFICIT_SEVERO}% del promedio histórico. Esto ya es una señal de alarma.`
        : `Los aportes están en un nivel crítico histórico, por debajo del ${HSIN_UMBRAL_CRITICO_HISTORICO}%. Esto es muy delicado: significa que está lloviendo tan poco como en los peores años de sequía registrados.`
      : `No hay datos disponibles de aportes hídricos para este momento.`);

  const tAportesTrend =
    chAportes != null
      ? `El indicador de aportes ${chAportes > 0 ? 'mejoró' : 'empeoró'} ${Math.abs(chAportes).toFixed(1)} puntos porcentuales con respecto a hace 7 días. ` +
        (chAportes > 0 ? 'Los ríos están trayendo más agua que la semana pasada.' : 'Los ríos están trayendo menos agua que la semana pasada.')
      : `Compara el indicador de aportes de hoy con el de hace una semana.`;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-7xl px-6 xl:px-8 gap-2 xl:gap-4">
        {/* Header con diagnóstico dinámico */}
        <div className="text-center">
          <SectionBadge label="Gestión del Sector" pulse dot="#EF4444" />
          <p className="text-theme-secondary text-xs xl:text-sm font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-[10px] xl:text-xs mt-0.5">
            {d.ultimaEjecucionETL
              ? `ETL sector energético · última ejecución: ${d.ultimaEjecucionETL}`
              : d.ultimaActualizacion
              ? `Datos en tiempo real de XM · últimos datos: ${d.ultimaActualizacion}`
              : "Datos en tiempo real de XM"}
          </p>
        </div>

        {/* KPIs — 4 columnas */}
        <div className="grid grid-cols-4 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="Precio de Bolsa (PPP)"
            value={`$${d.precioBolsa.toFixed(2)}`}
            unit="COP/kWh"
            date={d.fechaPrecio}
            valueClass="text-gold"
            chipLabel={stPr.label}
            chipColor={stPr.color}
            tendencia={d.tendencias?.precio}
            metrica="precio"
            valueTitle={tPrecioValor}
            chipTitle={tPrecioChip}
            trendTitle={tPrecioTrend}
          />
          <KpiBlock
            label="Energía Generada"
            value={d.generacionGwh.toFixed(2)}
            unit="GWh"
            date={d.fechaGeneracion}
            valueClass="text-blue-400"
            chipLabel={stGen.label}
            chipColor={stGen.color}
            tendencia={d.tendencias?.generacion}
            metrica="generacion"
            valueTitle={tGeneracionValor}
            chipTitle={tGeneracionChip}
            trendTitle={tGeneracionTrend}
          />
          <HydroKpiBlock
            label="Reservas Hídricas"
            pct={d.pctEmbalses}
            pctColor={stRes.tw}
            gwh={d.embalseGwh}
            gwhRef={d.capacidadEmbalseGwh}
            gwhRefLabel="cap."
            date={d.fechaEmbalse}
            chipLabel={stRes.label}
            chipColor={stRes.color}
            tendencia={d.tendencias?.embalses}
            metrica="embalses"
            valueTitle={tReservasValor}
            gwhTitle={tReservasGwh}
            chipTitle={tReservasChip}
            trendTitle={tReservasTrend}
          />
          {aportesPct !== null && stAp ? (
            <HydroKpiBlock
              label="Aportes Hídricos"
              pct={aportesPct}
              pctColor={aportesColor}
              gwh={aportes?.actualGwh}
              gwhRef={aportes?.historicoGwh}
              gwhRefLabel="hist."
              dailyGwh={aportes?.dailyActualGwh}
              dailyHistGwh={aportes?.dailyHistGwh}
              date={d.fechaAportes}
              chipLabel={stAp.label}
              chipColor={stAp.color}
              tendencia={d.tendencias?.aportes}
              metrica="aportes"
              valueTitle={tAportesValor}
              gwhTitle={tAportesGwh}
              chipTitle={tAportesChip}
              trendTitle={tAportesTrend}
            />
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-slate-600 text-sm">Sin datos</p>
            </div>
          )}
        </div>

        {/* Gráficos — 3 columnas: Precio | Generación | Aportes */}
        {hasDetalle && (
          <div className="grid grid-cols-1 md:grid-cols-[3fr_3fr_4fr] w-full gap-2 xl:gap-3">
            {/* Precio de Bolsa (PPP) - Línea */}
            {hasPrecioSeries && (
              <div className="flex flex-col">
                <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Precio de Bolsa (PPP) · Tendencia</p>
                <div className="h-[16vh] min-h-[90px] max-h-[160px]">
                  <ResponsiveLine
                    data={detalle!.precioBolsaSeries}
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 6, right: 12, bottom: 52, left: 36 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: "auto", max: "auto" }}
                    curve="catmullRom"
                    enablePoints={false}
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 8,
                      tickRotation: -45,
                      tickValues: detalle!.precioBolsaSeries[0]?.data
                        .filter((_, i) => i % 4 === 0 || i === detalle!.precioBolsaSeries[0].data.length - 1)
                        .map(d => d.x) ?? [],
                      format: (value) => {
                        const dataPoint = detalle!.precioBolsaSeries[0]?.data.find(d => d.x === value);
                        if (dataPoint?.fecha) {
                          return new Date(dataPoint.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
                        }
                        return value;
                      },
                    }}
                    axisLeft={{ tickSize: 0, tickValues: 3, tickPadding: 6 }}
                    colors={["#F59E0B"]}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.15}
                    useMesh
                    tooltip={({ point }) => {
                      const dataPoint = detalle!.precioBolsaSeries[0]?.data.find(d => d.x === point.data.x);
                      const fecha = dataPoint?.fecha
                        ? new Date(dataPoint.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                        : point.data.xFormatted;
                      return (
                        <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                          {fecha}: <strong className="text-gold">${Number(point.data.y).toFixed(2)}</strong>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            {/* Generación por Fuente - Donut */}
            <div className="flex flex-col items-center">
              <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1 self-start">Generación por Fuente</p>
              <div className="relative h-[12vh] min-h-[70px] max-h-[120px] w-full">
                <ResponsivePie
                  data={detalle!.generacionPorFuente}
                  theme={getNivoTheme(isDark)}
                  margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  innerRadius={0.65}
                  padAngle={2}
                  cornerRadius={3}
                  activeOuterRadiusOffset={5}
                  colors={{ datum: "data.color" }}
                  borderWidth={0}
                  enableArcLinkLabels={false}
                  arcLabelsSkipAngle={12}
                  arcLabelsTextColor="var(--text-primary)"
                  arcLabelsRadiusOffset={0.75}
                  legends={[]}
                  tooltip={({ datum }) => (
                    <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                      {datum.label}: <strong>{datum.value}%</strong>
                    </div>
                  )}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base xl:text-lg font-bold text-theme-primary leading-none">{d.generacionGwh.toFixed(1)}</span>
                  <span className="text-[9px] text-slate-400">GWh</span>
                </div>
              </div>
              {/* Leyenda personalizada — 2 filas con flex-wrap */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1">
                {detalle!.generacionPorFuente.map((item) => (
                  <div key={item.id} className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-[8px] text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hidrología: Capacidad Embalse SIN (gráfico de área histórico) */}
            <div className="flex flex-col">
              <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Capacidad Embalse</p>
              {embalseData ? (
                <CapacidadEmbalseChart data={embalseData} height={220} />
              ) : (
                <div className="flex items-center justify-center h-[22vh] min-h-[140px] max-h-[220px] text-slate-600 text-xs">
                  Cargando embalses…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slide 1: Generación Térmica ──────────────────────────────────────────────
function SlideGeneracionTermica({ d }: { d: TermicaSliderData }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const stTerm = estadoI3Termica(d.generacionTermica.participacionPct);
  const stEsc  = estadoPrecio(d.precios.escasez.valor);
  const stPPP  = estadoPrecio(d.precios.ppp.valor);
  const pct    = d.generacionTermica.participacionPct;
  const pei    = PRECIO_ESCASEZ_PEI_REF_2026_01;
  const pe     = PRECIO_ESCASEZ_PE_REF_2026_01;
  const pes    = PRECIO_ESCASEZ_PES_REF_2026_01;

  // ── Diagnóstico dinámico ────────────────────────────────────────────────────
  function buildDiagnostico(): string {
    let texto = "";
    const escActual = d.precios.escasez.valor;
    const pppActual = d.precios.ppp.valor;

    if (pct <= 15) {
      texto += "El despacho térmico está en niveles sostenibles. ";
    } else if (pct <= 25) {
      texto += "Las plantas térmicas están en operación normal como soporte a la hidráulica. ";
    } else if (pct <= 35) {
      texto += "El despacho térmico está en alerta media, indicando mayor dependencia de combustibles fósiles. ";
    } else {
      texto += "El despacho térmico es crítico: se está dependiendo demasiado de las plantas de combustibles fósiles. ";
    }

    texto += `Las plantas térmicas cubren el ${pct.toFixed(1)}% de la generación total del SIN hoy. `;

    if (pppActual < escActual) {
      texto += `El PPP diario ($${pppActual.toFixed(0)} COP/kWh) está por debajo del precio de escasez ($${escActual.toFixed(0)} COP/kWh), lo que indica que no se han activado los mecanismos de cargo por confiabilidad. `;
    } else {
      texto += `El PPP diario ($${pppActual.toFixed(0)} COP/kWh) superó el precio de escasez ($${escActual.toFixed(0)} COP/kWh), señal de estrés en el mercado energético. `;
    }

    if (pct <= 25 && pppActual < escActual) {
      texto += "Operación dentro de los parámetros normales del SIN.";
    } else if (pct > 35 || pppActual >= escActual) {
      texto += "Se recomienda monitoreo continuo de la situación.";
    } else {
      texto += "Seguimiento recomendado para los próximos días.";
    }

    return texto;
  }

  const diagnostico = buildDiagnostico();

  // ── Tooltip strings — Energía Térmica ──────────────────────────────────────
  const tTermicaValor =
    `Hoy las plantas térmicas del país generaron ${d.generacionTermica.gwh.toFixed(2)} gigavatios-hora. ` +
    `Esto incluye toda la electricidad producida por plantas que queman gas natural, carbón, diésel o gas importado. ` +
    `Las térmicas son el respaldo del sistema cuando no hay suficiente agua en los embalses.`;

  const tTermicaChip =
    `${stTerm.label}. ` +
    (pct <= 15
      ? `Las térmicas están generando el ${pct.toFixed(1)}% del total, lo cual es un nivel base saludable. El sistema no está dependiendo de ellas de forma excesiva.`
      : pct <= 25
      ? `Las térmicas están generando el ${pct.toFixed(1)}% del total. Es un nivel normal de soporte complementario a la generación hidráulica.`
      : pct <= 35
      ? `Las térmicas están generando el ${pct.toFixed(1)}% del total. Esto indica que el sistema está dependiendo más de lo habitual de los combustibles fósiles, lo cual encarece la energía.`
      : `Las térmicas están generando el ${pct.toFixed(1)}% del total. Esto supera el umbral del 35% que se considera crítico: el sistema está muy dependiente de plantas costosas y con emisiones altas.`);

  const tTermicaTrend =
    d.generacionTermica.tendencia?.cambio7d != null
      ? `La generación térmica ${d.generacionTermica.tendencia.cambio7d > 0 ? 'aumentó' : 'bajó'} ` +
        `${Math.abs(d.generacionTermica.tendencia.cambio7d).toFixed(1)}% con respecto al promedio de los últimos 7 días. ` +
        (d.generacionTermica.tendencia.cambio7d > 0
          ? 'Un aumento sostenido puede indicar que los embalses están bajando o que la demanda creció.'
          : 'Una reducción es positiva: el sistema está dependiendo menos de combustibles fósiles.')
      : 'Compara la generación térmica de hoy con el promedio de la última semana.';

  // ── Tooltip strings — Precio de Escasez ────────────────────────────────────
  const tEscasezValor =
    `El precio de escasez actual es $${d.precios.escasez.valor.toFixed(2)} COP/kWh (publicado por la CREG, se actualiza cada mes). ` +
    `Cuando el PPP diario supera este valor, los generadores cobran el cargo por confiabilidad a este precio. ` +
    `La escala de clasificación usa tres umbrales regulatorios: ` +
    `piso inferior $${pei.toFixed(0)}, umbral principal $${pe.toFixed(0)}, umbral superior $${pes.toFixed(0)} COP/kWh.`;

  const escVal = d.precios.escasez.valor;
  const tEscasezChip =
    escVal < pei
      ? `BAJO (< $${pei.toFixed(0)} COP/kWh). El precio de escasez actual de $${escVal.toFixed(0)} ` +
        `está por debajo del piso de la escala regulatoria ($${pei.toFixed(0)} COP/kWh). ` +
        `El mercado opera en condición cómoda.`
      : escVal < pe
      ? `VIGILANCIA ($${pei.toFixed(0)} – $${pe.toFixed(0)} COP/kWh). El precio de escasez de $${escVal.toFixed(0)} ` +
        `está entre el piso y el umbral principal. El PPP diario se acerca al rango de activación del cargo por confiabilidad.`
      : escVal < pes
      ? `ALTA PRESIÓN ($${pe.toFixed(0)} – $${pes.toFixed(0)} COP/kWh). El precio de escasez de $${escVal.toFixed(0)} ` +
        `superó el umbral principal ($${pe.toFixed(0)} COP/kWh). Si el PPP diario supera este valor, ` +
        `los generadores cobran el cargo por confiabilidad.`
      : `TECHO REGULATORIO (> $${pes.toFixed(0)} COP/kWh). El precio de escasez de $${escVal.toFixed(0)} ` +
        `superó el umbral superior ($${pes.toFixed(0)} COP/kWh), el nivel más alto de la escala regulatoria. ` +
        `La energía está en su momento más costoso del período.`;

  const tEscasezTrend =
    d.precios.escasez.tendencia?.cambio7d != null
      ? `El precio de escasez ${d.precios.escasez.tendencia.cambio7d > 0 ? 'subió' : 'bajó'} ${Math.abs(d.precios.escasez.tendencia.cambio7d).toFixed(1)}% con respecto al promedio de los últimos 7 días.`
      : 'Variación del precio de escasez respecto al promedio de la última semana.';

  // ── Tooltip strings — PPP Diario ────────────────────────────────────────────
  const escActual = d.precios.escasez.valor;
  const tPPPValor =
    `El PPP diario de hoy es $${d.precios.ppp.valor.toFixed(2)} COP/kWh. ` +
    `Es el precio promedio ponderado al que se negoció la energía en la bolsa colombiana hoy. ` +
    `La referencia clave es el precio de escasez actual ($${escActual.toFixed(0)} COP/kWh): ` +
    (d.precios.ppp.valor < escActual
      ? `el PPP está por debajo, por lo que no se activó el cargo por confiabilidad.`
      : `el PPP ya lo superó — los generadores están cobrando el cargo por confiabilidad.`);

  const pppVal = d.precios.ppp.valor;
  const tPPPChip =
    pppVal < pei
      ? `BAJO (< $${pei.toFixed(0)} COP/kWh). El PPP de $${pppVal.toFixed(0)} está por debajo del piso de ` +
        `la escala. La energía cotiza barata y no hay presión de precio en el mercado.`
      : pppVal < pe
      ? `VIGILANCIA ($${pei.toFixed(0)} – $${pe.toFixed(0)} COP/kWh). El PPP de $${pppVal.toFixed(0)} ` +
        `está entre el piso y el umbral principal ($${pe.toFixed(0)} COP/kWh). Aún no supera el precio ` +
        `de escasez vigente ($${escActual.toFixed(0)} COP/kWh).`
      : pppVal < pes
      ? `ALTA PRESIÓN ($${pe.toFixed(0)} – $${pes.toFixed(0)} COP/kWh). El PPP de $${pppVal.toFixed(0)} ` +
        `superó el umbral principal ($${pe.toFixed(0)} COP/kWh). ` +
        (pppVal < escActual
          ? `Sin embargo, está por debajo del precio de escasez vigente ($${escActual.toFixed(0)} COP/kWh), ` +
            `por lo que el cargo por confiabilidad no se activó hoy.`
          : `Además supera el precio de escasez vigente ($${escActual.toFixed(0)} COP/kWh), ` +
            `por lo que el cargo por confiabilidad se activó hoy.`)
      : `TECHO REGULATORIO (> $${pes.toFixed(0)} COP/kWh). El PPP de $${pppVal.toFixed(0)} ` +
        `superó el umbral superior ($${pes.toFixed(0)} COP/kWh). ` +
        (pppVal < escActual
          ? `Está por debajo del precio de escasez vigente ($${escActual.toFixed(0)} COP/kWh) — ` +
            `el cargo por confiabilidad no se activó.`
          : `También superó el precio de escasez vigente ($${escActual.toFixed(0)} COP/kWh) — ` +
            `los generadores cobran cargo por confiabilidad.`);

  const tPPPTrend =
    d.precios.ppp.tendencia?.cambio7d != null
      ? `El PPP ${d.precios.ppp.tendencia.cambio7d > 0 ? 'subió' : 'bajó'} ${Math.abs(d.precios.ppp.tendencia.cambio7d).toFixed(1)}% con respecto al promedio de los últimos 7 días. ` +
        (d.precios.ppp.tendencia.cambio7d > 0
          ? 'Cuando el precio sube, la energía es más cara y puede haber presión en el sistema.'
          : 'Cuando el precio baja, la energía está más barata — una señal positiva.')
      : 'Compara el PPP de hoy con el promedio de los últimos 7 días.';

  // ── Datos para gráfico de barras ────────────────────────────────────────────
  const barData = [...d.plantas]
    .sort((a, b) => b.generacionGwh - a.generacionGwh)
    .map((p) => ({
      planta: p.nombre.length > 18 ? `${p.nombre.slice(0, 16)}…` : p.nombre,
      generacion: p.generacionGwh,
      pct: p.participacionPct,
    }))
    .reverse();

  function OutsideBarLabels({ bars }: BarCustomLayerProps<{ planta: string; generacion: number; pct: number }>) {
    return (
      <g>
        {bars.map((bar) => {
          const row = bar.data.data;
          return (
            <text key={bar.key} x={bar.x + bar.width + 6} y={bar.y + bar.height / 2} fill="var(--text-secondary)" fontSize={9} dominantBaseline="central">
              {`${row.generacion.toFixed(2)} GWh · ${row.pct}% part.`}
            </text>
          );
        })}
      </g>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#EF4444" />
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-slate-900/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-7xl px-6 xl:px-8 gap-2 xl:gap-4">
        <div className="text-center">
          <SectionBadge label="Generación Térmica" pulse dot="#EF4444" />
          <p className="text-theme-secondary text-xs xl:text-sm font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-[10px] xl:text-xs mt-0.5">Datos XM · sector_energetico</p>
        </div>

        <div className="grid grid-cols-4 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="Energía Térmica"
            value={d.generacionTermica.gwh.toFixed(2)}
            unit="GWh"
            date={d.generacionTermica.fecha}
            valueClass="text-red-400"
            chipLabel={stTerm.label}
            chipColor={stTerm.color}
            tendencia={d.generacionTermica.tendencia}
            metrica="generacion"
            valueTitle={tTermicaValor}
            chipTitle={tTermicaChip}
            trendTitle={tTermicaTrend}
          />

          {/* Precio Escasez */}
          <div
            className={`flex flex-col items-center justify-center text-center gap-0.5 px-2 transition-opacity duration-300 ${
              d.precios.mayor === "escasez" ? "opacity-100" : "opacity-40"
            }`}
          >
            <p className="text-theme-muted text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium">Precio Escasez</p>
            <div
              className="inline-flex items-center gap-2 font-black text-3xl xl:text-4xl leading-none text-theme-primary"
              title={tEscasezValor}
            >
              ${d.precios.escasez.valor.toFixed(2)}
              <TrendArrow tendencia={d.precios.escasez.tendencia} metrica="precio" trendTitle={tEscasezTrend} />
            </div>
            {d.precios.escasez.fecha && (
              <p className="text-theme-muted text-xs xl:text-sm mt-0.5">COP/kWh · Dato: {d.precios.escasez.fecha}</p>
            )}
            {d.precios.escasez.variacion != null && (
              <p className={`text-xs mt-1 ${d.precios.escasez.variacion < 0 ? "text-red-400" : "text-emerald-400"}`}>
                Var. mensual: {d.precios.escasez.variacion >= 0 ? "+" : ""}{d.precios.escasez.variacion.toFixed(2)} COP/kWh
              </p>
            )}
            <TrendBadge tendencia={d.precios.escasez.tendencia} metrica="precio" title={tEscasezTrend} />
            <StatusChip label={stEsc.label} color={stEsc.color} title={tEscasezChip} />
          </div>

          {/* PPP Diario */}
          <div
            className={`flex flex-col items-center justify-center text-center gap-0.5 px-2 transition-opacity duration-300 ${
              d.precios.mayor === "ppp" ? "opacity-100" : "opacity-40"
            }`}
          >
            <p className="text-theme-muted text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium">PPP Diario</p>
            <div
              className="inline-flex items-center gap-2 font-black text-3xl xl:text-4xl leading-none text-theme-primary"
              title={tPPPValor}
            >
              ${d.precios.ppp.valor.toFixed(2)}
              <TrendArrow tendencia={d.precios.ppp.tendencia} metrica="precio" trendTitle={tPPPTrend} />
            </div>
            {d.precios.ppp.fecha && (
              <p className="text-theme-muted text-xs xl:text-sm mt-0.5">COP/kWh · Dato: {d.precios.ppp.fecha}</p>
            )}
            {d.precios.ppp.variacion != null && (
              <p className={`text-xs mt-1 ${d.precios.ppp.variacion < 0 ? "text-red-400" : "text-emerald-400"}`}>
                Var. semanal: {d.precios.ppp.variacion >= 0 ? "+" : ""}{d.precios.ppp.variacion.toFixed(2)} COP/kWh
              </p>
            )}
            <TrendBadge tendencia={d.precios.ppp.tendencia} metrica="precio" title={tPPPTrend} />
            <StatusChip label={stPPP.label} color={stPPP.color} title={tPPPChip} />
          </div>

          {/* Plantas Térmicas */}
          <div className="flex flex-col px-2">
            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Plantas Térmicas · Diaria</p>
            <div className="flex-1 min-h-[18vh]">
              {barData.length > 0 ? (
                <ResponsiveBar
                  data={barData}
                  keys={["generacion"]}
                  indexBy="planta"
                  layout="horizontal"
                  theme={getNivoTheme(isDark)}
                  margin={{ top: 0, right: 132, bottom: 0, left: 92 }}
                  padding={0.25}
                  colors={["#EF4444"]}
                  borderRadius={2}
                  enableGridY={false}
                  axisTop={null}
                  axisRight={null}
                  axisLeft={{ tickSize: 0, tickPadding: 6 }}
                  axisBottom={null}
                  enableLabel={false}
                  layers={["grid", "axes", "bars", OutsideBarLabels, "markers", "legends", "annotations"]}
                  tooltip={({ indexValue, value, data }) => (
                    <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                      <strong>{indexValue}</strong>: {Number(value).toFixed(2)} GWh · {data.pct}% participación
                    </div>
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sin plantas</div>
              )}
            </div>
          </div>
        </div>

        {/* Gráficos — 2 columnas */}
        <div className="grid grid-cols-2 w-full gap-2 xl:gap-3">
          {/* Evolución térmica por combustible */}
          <div className="flex flex-col">
            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1"
               title="Serie diaria de generación térmica del último mes por tipo de combustible. Una subida sostenida del gas importado o líquidos indica presión en el sistema.">
              Evolución Generación Térmica · 1 mes
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5 min-h-[14px]">
              {d.evolucionTermica.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 text-[9px] text-slate-400">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.id}
                </span>
              ))}
            </div>
            <div className="h-[18vh] xl:h-[20vh]">
              <ResponsiveLine
                data={d.evolucionTermica}
                theme={getNivoTheme(isDark)}
                margin={{ top: 4, right: 8, bottom: 28, left: 36 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="catmullRom"
                enablePoints={false}
                enableGridX={false}
                enableGridY
                gridYValues={4}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 6,
                  tickValues: "every 5 days",
                  format: (value) => {
                    const pt = d.evolucionTermica[0]?.data.find((p) => p.x === value);
                    if (pt?.fecha) return String(new Date(pt.fecha).getDate());
                    return value;
                  },
                }}
                axisLeft={{ tickSize: 0, tickValues: 4, tickPadding: 6 }}
                colors={(s) => (s.color as string) ?? "#94A3B8"}
                lineWidth={2}
                useMesh
                tooltip={({ point }) => {
                  const serie = d.evolucionTermica.find((s) => s.id === point.seriesId);
                  const pt = serie?.data.find((p) => p.x === point.data.x);
                  const fecha = pt?.fecha
                    ? new Date(pt.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                    : point.data.xFormatted;
                  return (
                    <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                      {point.seriesId} · {fecha}: <strong>{Number(point.data.y).toFixed(1)} GWh</strong>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          {/* Generación por fuente (total SIN) */}
          {(() => {
            const data = d.evolucionTotal;
            if (!data.length) return <div className="flex items-center justify-center text-slate-600 text-sm">Sin datos</div>;
            const yMax = d.maxTotalDiarioGwh > 0 ? d.maxTotalDiarioGwh : Math.max(...data.flatMap((s) => s.data.map((p) => p.y)));
            const gwhTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
            const toPct = (gwh: number) => (yMax > 0 ? (gwh / yMax) * 100 : 0);
            return (
              <div className="flex flex-col">
                <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1"
                   title="Evolución diaria de la generación total del SIN por tipo de fuente. Eje izquierdo en GWh, eje derecho en % de participación. Participación térmica mayor a 35% sostenida es señal de riesgo estructural.">
                  Generación por Fuente · 1 mes
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5 min-h-[14px]">
                  {data.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 text-[9px] text-slate-400">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      {s.id}
                    </span>
                  ))}
                </div>
                <div className="h-[18vh] xl:h-[20vh]">
                  <ResponsiveLine
                    data={data}
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 4, right: 40, bottom: 28, left: 36 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: yMax }}
                    curve="catmullRom"
                    enablePoints={false}
                    enableGridX={false}
                    enableGridY
                    gridYValues={gwhTicks}
                    axisTop={null}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 6,
                      tickValues: "every 5 days",
                      format: (value) => {
                        const pt = data[0]?.data.find((p) => p.x === value);
                        if (pt?.fecha) return String(new Date(pt.fecha).getDate());
                        return value;
                      },
                    }}
                    axisLeft={{ tickSize: 0, tickValues: gwhTicks, tickPadding: 6, format: (v) => `${Math.round(Number(v))}` }}
                    axisRight={{ tickSize: 0, tickValues: gwhTicks, tickPadding: 6, format: (v) => `${toPct(Number(v)).toFixed(0)}%` }}
                    colors={(s) => (s.color as string) ?? "#94A3B8"}
                    lineWidth={2}
                    useMesh
                    tooltip={({ point }) => {
                      const serie = data.find((s) => s.id === point.seriesId);
                      const pt = serie?.data.find((p) => p.x === point.data.x);
                      const fecha = pt?.fecha
                        ? new Date(pt.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                        : point.data.xFormatted;
                      const gwh = Number(point.data.y);
                      const pctVal = pt?.pct ?? toPct(gwh);
                      return (
                        <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                          {point.seriesId} · {fecha}: <strong>{gwh.toFixed(2)} GWh · {pctVal.toFixed(1)}%</strong>
                        </div>
                      );
                    }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-slate-600 mt-0.5 px-1">
                  <span>← GWh</span>
                  <span>% participación →</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Presupuesto ──────────────────────────────────────────────────────
function SlidePresupuesto({ d }: { d: HomeSliderProps["presuData"] }) {
  const { apropiacion, pct_comprometido, obligados, pct_obligado } = d.totales;
  const pctDisp = Math.max(0, 100 - pct_comprometido);
  const pctCompNoObl = Math.max(0, pct_comprometido - pct_obligado);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-3 overflow-y-auto flex flex-col items-center justify-center gap-3">
        <div className="text-center">
          <SectionBadge label="Ejecución Presupuestal 2026" dot="#F59E0B" />
          <p className="text-theme-muted text-base xl:text-lg">
            Ejecución de proyectos DEE — corte {fmtCortePresupuesto(d.ultimaActualizacion)}
          </p>
        </div>

        {/* Apropiación total */}
        <div className="text-center">
          <p className="text-theme-muted text-lg xl:text-xl uppercase tracking-[0.2em] font-medium mb-1">
            Apropiación Pptal DEE
          </p>
          <div className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-gold leading-none">
            {fmtFull(apropiacion)}
          </div>
        </div>

        {/* Barra visual apilada */}
        <div className="w-full max-w-4xl">
          <div className="h-4 xl:h-5 bg-theme-tertiary rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pct_obligado}%` }}
              title={`Obligado (legalizado): ${pct_obligado.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pctCompNoObl}%` }}
              title={`Comprometido restante (aún no obligado): ${pctCompNoObl.toFixed(2)}%\nTotal comprometido: ${pct_comprometido.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div
              className="h-full bg-gradient-to-r from-slate-700 to-slate-500 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pctDisp}%` }}
              title={`Disponible (sin compromiso): ${pctDisp.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm xl:text-base">
            <span className="text-gold font-semibold">
              {pct_comprometido.toFixed(2)}% Comp. ({pct_obligado.toFixed(1)}% obl.)
            </span>
            <span className="text-slate-500">
              {pctDisp.toFixed(2)}% Disponible
            </span>
          </div>
        </div>

        {/* SemiGauges */}
        <div className="flex justify-around w-full max-w-3xl">
          <SemiGauge rawValue={pct_comprometido} label="% Comprometido" color="gold" size="xl" delay={0.3} />
          <SemiGauge rawValue={pct_obligado} label="% Obligado" color="muted" size="xl" delay={0.4} />
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Comunidades Energéticas ─────────────────────────────────────────
function SlideComunidades({ d, depts }: { d: HomeSliderProps["cemData"]; depts?: HomeSliderProps["cemDepts"] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const barData = useMemo(() => {
    if (!depts || depts.length === 0) return [];
    return depts
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((d) => ({
        dept: d.name.length > 18 ? d.name.slice(0, 18) + "…" : d.name,
        "CEs": d.count,
        "kWp (÷10)": +((d.capacidad ?? 0) / 10).toFixed(0),
      }))
      .reverse(); // Nivo horizontal dibuja de abajo hacia arriba; reverse para que el mayor quede arriba
  }, [depts]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-3 overflow-y-auto flex flex-col items-center justify-center gap-3">
        <div className="text-center">
          <SectionBadge label="Comunidades Energéticas" dot="#10B981" />
          <p className="text-theme-muted text-base xl:text-lg">
            Transición energética · Acceso a energía limpia
          </p>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="CE Implementadas"
            value={fmtNum(d.implementadas)}
            unit="Comunidades"
            valueClass="text-emerald-400"
          />
          <KpiBlock
            label="Inversión Estimada"
            value={fmtFull(d.inversionEstimada)}
            unit="En proyectos activos"
            valueClass="text-gold"
          />
          <KpiBlock
            label="Capacidad Instalada"
            value={Math.round(d.capacidadKwp).toLocaleString("es-CO")}
            unit="kWp instalados"
            valueClass="text-teal-400"
          />
        </div>

        <div className="w-full max-w-3xl">
          <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1 text-center">
            CEs por departamento (Top 12)
          </p>
          <div className="h-[22vh] min-h-[140px] max-h-[220px]">
            {barData.length > 0 ? (
              <ResponsiveBar
                data={barData}
                keys={["CEs", "kWp (÷10)"]}
                indexBy="dept"
                theme={getNivoTheme(isDark)}
                groupMode="grouped"
                layout="horizontal"
                margin={{ top: 4, right: 16, bottom: 20, left: 130 }}
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#F59E0B", "#06B6D4"]}
                borderRadius={3}
                padding={0.25}
                enableLabel={false}
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                tooltip={({ id, value, indexValue }) => (
                  <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <strong>{indexValue}</strong> — {id}: <strong style={{ color: id === "CEs" ? "#F59E0B" : "#06B6D4" }}>{value}</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-slate-500 text-sm">Cargando…</span>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {[{ label: "N° CEs", c: "#F59E0B" }, { label: "kWp instalados ÷10", c: "#06B6D4" }].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 4: Contratos OR ─────────────────────────────────────────────────────
function SlideContratosOR({ d }: { d: HomeSliderProps["orData"] }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-3 overflow-y-auto flex flex-col items-center justify-center gap-3">
        <div className="text-center">
          <SectionBadge label="Contratos OR 2025" dot="#8B5CF6" />
          <p className="text-theme-muted text-base xl:text-lg">
            Obras de Reconexión · Energía Rural Colombiana
          </p>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="Contratos Activos"
            value={fmtNum(d.nContratos)}
            valueClass="text-purple-400"
          />
          <KpiBlock
            label="Usuarios Beneficiados"
            value={fmtNum(d.nUsuarios)}
            unit="hogares"
            valueClass="text-gold"
          />
          <KpiBlock
            label="N° Comunidades"
            value={fmtNum(d.nCEs)}
            unit="CEs beneficiadas"
            valueClass="text-blue-400"
          />
        </div>

        {/* SemiGauges */}
        <div className="flex justify-around w-full max-w-3xl">
          <SemiGauge rawValue={d.avanceFinanciero} label="Avance Financiero" color="gold" size="xl" delay={0.3} />
          <SemiGauge rawValue={d.avanceGeneral} label="Avance General" color="success" size="xl" delay={0.4} />
        </div>
      </div>
    </div>
  );
}

// ─── Slide 6: Subsidios ────────────────────────────────────────────────────────
function SlideSubsidios({ d, deficitFssri, deficitSeries, subBarData }: { d: HomeSliderProps["subData"]; deficitFssri?: number; deficitSeries?: Array<{ x: string; y: number }>; subBarData?: Array<{ anio: string; Subsidios: number; Contribuciones: number }>; }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const asig = d.anio2026.valorAsignado;
  const pag = d.anio2026.pagado;
  const pend = d.anio2026.pendiente;
  const pctPag = asig > 0 ? (pag / asig) * 100 : 0;
  const pctPend = asig > 0 ? (pend / asig) * 100 : 0;
  // const deficitPrincipal = deficitFssri ?? d.deficitAcumulado;
  
  // Valores para la fila superior
  const totalApropiado = 5_850_784_897_494; // Valor fijo
  const totalDisponible = totalApropiado - asig;

  // Agrupar histórico por año (sumar fondos)
  const historicoPorAnio = (d.historico ?? []).reduce((acc, h) => {
    const a = h.anio;
    if (!acc[a]) acc[a] = { asignado: 0, pagado: 0, pendiente: 0 };
    acc[a].asignado += h.valor_asignado;
    acc[a].pagado += h.pagado;
    acc[a].pendiente += h.pendiente;
    return acc;
  }, {} as Record<number, { asignado: number; pagado: number; pendiente: number }>);

  const anios = Object.keys(historicoPorAnio).map(Number).sort((a, b) => a - b);
  const tieneHistorico = anios.length > 0;
  const mostrarGraficas = (subBarData && subBarData.length > 0) || (deficitSeries && deficitSeries.length > 0) || tieneHistorico;

  const lineData = [
    {
      id: "Asignado",
      color: "#8B5CF6",
      data: anios.map(a => ({ x: String(a), y: +(historicoPorAnio[a].asignado / 1e9).toFixed(1) })),
    },
    {
      id: "Pagado",
      color: "#10B981",
      data: anios.map(a => ({ x: String(a), y: +(historicoPorAnio[a].pagado / 1e9).toFixed(1) })),
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-3 overflow-y-auto flex flex-col items-center justify-center gap-3">
        <div className="text-center">
          <SectionBadge label="Subsidios Energéticos" dot="#EF4444" />
          <p className="text-theme-muted text-base xl:text-lg">
            Seguimiento a la deuda del fondo de subsidios — corte {d.ultimaActualizacion ?? "1 de abril 2026"}
          </p>
        </div>

        {/* Fila superior: APROPIADO 2026, ASIGNADO 2026, DISPONIBLE 2026 */}
        <div className="grid grid-cols-3 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="APROPIADO 2026"
            value={fmtFull(totalApropiado)}
            valueClass="text-theme-primary"
          />
          <KpiBlock
            label="COMPROMETIDO EN RESOLUCIONES 2026"
            value={fmtFull(asig)}
            valueClass="text-purple-400"
          />
          <KpiBlock
            label="DISPONIBLE 2026"
            value={fmtFull(totalDisponible)}
            valueClass="text-emerald-400"
          />
        </div>

        {/* Fila inferior: RESOLUCIONES 2026 y PENDIENTE DE PAGO 2026 */}
        <div className="grid grid-cols-2 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="RESOLUCIONES 2026"
            value={fmtNum(d.anio2026.resoluciones)}
            unit="expedidas"
            valueClass="text-gold"
          />
          {/* KPI Pendiente de pago 2026 con barra de porcentaje integrada - mismo estilo que KpiBlock */}
          <div className="flex flex-col items-center justify-center text-center gap-0.5 px-4">
            <p className="text-theme-muted text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium">
              PENDIENTE DE PAGO 2026
            </p>
            <div className="inline-flex items-center gap-2 font-black leading-none text-xl xl:text-2xl 2xl:text-3xl text-red-400">
              {fmtFull(pend)}
              <span className="relative group cursor-help text-base xl:text-lg leading-none">
                *
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Pendiente de desembolso por parte del Ministerio de Hacienda y Crédito Público
                </span>
              </span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full max-w-[280px] mt-2">
              <div className="h-2.5 bg-theme-tertiary rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-1000 shrink-0"
                  style={{ width: `${pctPag}%` }}
                  title={`Pagado: ${pctPag.toFixed(2)}%`}
                />
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 shrink-0"
                  style={{ width: `${pctPend}%` }}
                  title={`Pendiente: ${pctPend.toFixed(2)}%`}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs">
                <span className="text-emerald-400 font-semibold">{pctPag.toFixed(2)}% Pagado</span>
                <span className="text-red-400 font-semibold">{pctPend.toFixed(2)}% Pendiente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficas históricas — Asignado vs Pagado + Déficit Acumulado */}
        {mostrarGraficas && (
          <div className={`w-full grid ${deficitSeries && deficitSeries.length > 0 ? 'grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl' : 'max-w-4xl'}`}>
            {/* Gráfica 1: Subsidios (SIN+ZNI) vs Contribuciones */}
            {subBarData && subBarData.length > 0 && (
              <div>
                <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1 text-center">
                  Subsidios (SIN+ZNI) y Contribuciones por Año
                </p>
                <div className="h-[16vh] min-h-[90px] max-h-[160px]">
                  <ResponsiveBar
                    data={subBarData}
                    keys={["Subsidios", "Contribuciones"]}
                    indexBy="anio"
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 6, right: 12, bottom: 28, left: 44 }}
                    groupMode="grouped"
                    valueScale={{ type: "linear" }}
                    indexScale={{ type: "band", round: true }}
                    colors={["#F59E0B", "#8B5CF6"]}
                    borderRadius={2}
                    padding={0.2}
                    innerPadding={2}
                    enableLabel={false}
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{ tickSize: 0, tickPadding: 6, format: (v) => String(v).slice(-2) }}
                    axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 4, format: (v) => `${v}B` }}
                    legends={[
                      {
                        dataFrom: "keys" as const,
                        anchor: "top" as const,
                        direction: "row" as const,
                        justify: false,
                        translateX: 0,
                        translateY: -16,
                        itemsSpacing: 12,
                        itemWidth: 90,
                        itemHeight: 12,
                        itemTextColor: "var(--text-secondary)",
                        itemDirection: "left-to-right" as const,
                        symbolSize: 8,
                        symbolShape: "circle" as const,
                      },
                    ]}
                    tooltip={({ id, indexValue, data }) => {
                      const exacto = ((data as unknown) as Record<string, number>)[`${id}_exacto`];
                      return (
                        <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary min-w-[200px]">
                          <p className="font-semibold mb-1 text-theme-secondary">Año {indexValue}</p>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: id === "Subsidios" ? "#F59E0B" : "#8B5CF6" }} />
                              <span>{id}</span>
                            </div>
                            <strong style={{ color: id === "Subsidios" ? "#F59E0B" : "#8B5CF6" }}>{fmtCOP(exacto || 0)}</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            {/* Gráfica 2: Déficit Acumulado FSSRI histórico */}
            {deficitSeries && deficitSeries.length > 0 && (
              <div>
                <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1 text-center">
                  Déficit acumulado FSSRI (Miles M$)
                </p>
                <div className="h-[16vh] min-h-[90px] max-h-[160px]">
                  <ResponsiveLine
                    data={[{ id: "Déficit Acumulado", color: "#EF4444", data: deficitSeries }]}
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 6, right: 12, bottom: 28, left: 44 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: "auto", max: "auto" }}
                    curve="monotoneX"
                    enablePoints
                    pointSize={4}
                    pointBorderWidth={1}
                    pointBorderColor="transparent"
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{ tickSize: 0, tickPadding: 6 }}
                    axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 4, format: (v) => `${v}B` }}
                    colors={["#EF4444"]}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.12}
                    useMesh
                    enableSlices="x"
                    legends={[]}
                    sliceTooltip={({ slice }) => {
                      const year = slice.points[0]?.data.xFormatted ?? "";
                      const pt = slice.points[0];
                      return (
                        <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary min-w-[140px]">
                          <p className="font-semibold mb-1 text-theme-secondary">Año {year}</p>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                              <span>Déficit acumulado</span>
                            </div>
                            <strong className="text-red-400">${pt?.data.yFormatted}B</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barra de progreso movida dentro del KPI Pendiente 2026 */}
      </div>
    </div>
  );
}

// ─── Slide 7+: Noticias ────────────────────────────────────────────────────────
function SlideNoticia({
  news,
  index,
  total,
  fetchedAt,
  tag,
}: {
  news: NewsItem;
  index: number;
  total: number;
  fetchedAt?: string | null;
  tag?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const title = news.titulo ?? news.title ?? "Noticia del sector energético";
  const imageUrl = news.imagen ?? news.image ?? null;

  return (
    <div className="relative w-full h-full flex items-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-slate-900/10 pointer-events-none" />

      {/* Imagen de fondo si existe */}
      {imageUrl && (
        <>
          <div
            className="absolute inset-0 bg-center bg-cover opacity-15"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-[var(--bg-primary)]/60" />
        </>
      )}

      <div className="relative z-10 w-full flex items-center px-12 xl:px-20 gap-12 xl:gap-20">
        {/* Contenido texto */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {/* Timestamp de última actualización */}
          {fetchedAt && (
            <p className="text-slate-500 text-xs xl:text-sm mb-3 tracking-wide">
              Última actualización: {fetchedAt}
            </p>
          )}

          {/* Badge de noticia */}
          <div className="flex items-center gap-3 mb-6 xl:mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-theme-secondary border border-theme-primary rounded-full text-theme-muted text-sm xl:text-base font-semibold tracking-widest uppercase">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Noticia {index + 1} de {total}
            </span>
            {tag && (() => {
              const isEnergia = tag === "ENERGÍA";
              const bgClass = isEnergia
                ? (isDark ? "bg-blue-900/40 border-blue-600/40 text-blue-400" : "bg-blue-100 border-blue-300 text-blue-700")
                : (isDark ? "bg-amber-900/40 border-amber-600/40 text-gold" : "bg-amber-100 border-amber-300 text-amber-700");
              return (
                <span className={`inline-flex items-center px-3 py-1.5 ${bgClass} rounded-full text-sm xl:text-base font-bold tracking-wider uppercase`}>
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isEnergia ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    )}
                  </svg>
                  {tag}
                </span>
              );
            })()}
            {news.fuente && (
              <span className="text-slate-500 text-sm xl:text-base">{news.fuente}</span>
            )}
            {news.fecha && (
              <span className="text-slate-600 text-sm xl:text-base">{news.fecha}</span>
            )}
          </div>

          {/* Título */}
          <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-theme-primary leading-tight mb-6 xl:mb-8">
            {title}
          </h2>

          {/* Resumen */}
          {news.resumen && (
            <p className="text-slate-400 text-xl xl:text-2xl leading-relaxed line-clamp-4 mb-8 xl:mb-10">
              {news.resumen}
            </p>
          )}

          {/* Link */}
          {news.url && (
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-gold hover:bg-amber-500/20 hover:border-amber-500/60 transition-all text-lg xl:text-xl font-semibold"
            >
              Leer noticia completa
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Imagen lateral si existe */}
        {imageUrl && (
          <div className="hidden xl:block flex-shrink-0 w-80 2xl:w-96 h-64 2xl:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Placeholder si no hay imagen */}
        {!imageUrl && (
          <div className="hidden xl:flex flex-shrink-0 w-72 2xl:w-80 h-64 rounded-2xl border border-theme-primary bg-theme-secondary/50 items-center justify-center">
            <svg className="w-24 h-24 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Navegación: botón flecha ──────────────────────────────────────────────────
function NavArrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "prev" ? "Diapositiva anterior" : "Diapositiva siguiente"}
      className="absolute top-1/2 -translate-y-1/2 z-30 w-14 h-14 xl:w-16 xl:h-16 flex items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/50 hover:bg-black/60 hover:border-white/20 hover:text-white transition-all duration-200 backdrop-blur-sm"
      style={{ [direction === "prev" ? "left" : "right"]: "1.5rem" }}
    >
      {direction === "prev" ? (
        <svg className="w-7 h-7 xl:w-8 xl:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      ) : (
        <svg className="w-7 h-7 xl:w-8 xl:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

// ─── Slide definitions metadata ────────────────────────────────────────────────
const SLIDE_META = [
  { id: "sector",      label: "Sector",      color: "#3B82F6", href: "/energia"      },
  { id: "termica",     label: "Térmica",     color: "#3B82F6", href: "/energia"      },
  { id: "presupuesto", label: "Presupuesto", color: "#3B82F6", href: "/presupuesto"  },
  { id: "comunidades", label: "Comunidades", color: "#3B82F6", href: "/comunidades"  },
  { id: "contratos",   label: "Contratos OR",color: "#3B82F6", href: "/contratos-or" },
  { id: "supervision", label: "Supervisión", color: "#3B82F6", href: "/supervision"  },
  { id: "subsidios",   label: "Subsidios",   color: "#3B82F6", href: "/subsidios"    },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HomeSlider(props: HomeSliderProps) {
  const { sectorData, sectorDetalle, termicaData, presuData, cemData, cemDepts, orData, supData, subData, deficitFssri, deficitSeries, subBarData } = props;

  const {
    current,
    direction,
    news,
    hydroNews,
    fetchedAt,
    paused,
    totalSlides,
    goTo,
    handlePrev,
    handleNext,
    setPaused,
  } = useHomeSlider(0); // NOTE: Slides de Redes Sociales X suspendidos temporalmente.
  // Motivo: X (Twitter) bloquea embeds gratuitos con HTTP 429.
  // Reactivar cuando haya presupuesto para API paga (TwitterAPI.io ~$10-20/mes).
  // Para reactivar: cambiar useHomeSlider(0) → useHomeSlider(3) y descomentar
  // los dots y renderSlide de redes sociales más abajo.

  // Render slide content
  function renderSlide(idx: number) {
    if (idx === 0) return <SlideGestionSector d={sectorData} detalle={sectorDetalle} />;
    if (idx === 1) {
      if (!termicaData) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-theme-primary text-theme-muted">
            Cargando generación térmica…
          </div>
        );
      }
      return <SlideGeneracionTermica d={termicaData} />;
    }
    if (idx === 2) return <SlidePresupuesto d={presuData} />;
    if (idx === 3) return <SlideComunidades d={cemData} depts={cemDepts} />;
    if (idx === 4) return <SlideContratosOR d={orData} />;
    if (idx === 5) return <SlideSupervision d={supData} />;
    if (idx === 6) return <SlideSubsidios d={subData} deficitFssri={deficitFssri} deficitSeries={deficitSeries} subBarData={subBarData} />;
    const newsIdx = idx - 7;
    if (news[newsIdx]) {
      return (
        <SlideNoticia
          news={news[newsIdx]}
          index={newsIdx}
          total={news.length}
          fetchedAt={fetchedAt}
          tag="ENERGÍA"
        />
      );
    }
    // Slides de hidrocarburos (después de noticias del sector)
    const hydroIdx = idx - (7 + news.length);
    if (hydroNews[hydroIdx]) {
      return (
        <SlideNoticia
          news={hydroNews[hydroIdx]}
          index={hydroIdx}
          total={hydroNews.length}
          fetchedAt={fetchedAt}
          tag="HIDROCARBUROS"
        />
      );
    }
    // ── SUSPENDIDO: Slides de Redes Sociales X ──
    // const redesIdx = idx - (6 + news.length);
    // if (redesIdx >= 0 && redesIdx <= 2) {
    //   const start = redesIdx * 3;
    //   return <SlideRedesX accounts={ALL_X_ACCOUNTS.slice(start, start + 3)} />;
    // }
    // Para reactivar: descomentar el bloque de arriba y cambiar useHomeSlider(0) → (3)
    return null;
  }

  // Dot descriptor: 7 KPI dots + news dots + hydrocarbon news dots
  const dots = [
    ...SLIDE_META,
    ...news.map((_, i) => ({
      id: `news-${i}`,
      label: `Noticia ${i + 1}`,
      color: "#3B82F6",
    })),
    ...hydroNews.map((_, i) => ({
      id: `hydro-${i}`,
      label: `Hidrocarburos ${i + 1}`,
      color: "#D97706",
    })),
    // ── SUSPENDIDO: Dots de Redes Sociales X ──
    // { id: "redes-x-1", label: "Redes 1", color: "#1DA1F2" },
    // { id: "redes-x-2", label: "Redes 2", color: "#1DA1F2" },
    // { id: "redes-x-3", label: "Redes 3", color: "#1DA1F2" },
  ];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "calc(100vh - 5rem)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Carrusel de indicadores clave del sector energético"
    >
      {/* Informes XM — visible en todos los slides */}
      <div className="absolute top-5 left-5 xl:top-6 xl:left-6 z-30 pointer-events-auto">
        <InformesDiariosSlider />
      </div>

      {/* ── Slides ── */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`slide-${current}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          {renderSlide(current)}
        </motion.div>
      </AnimatePresence>

      {/* ── Nav arrows ── */}
      <NavArrow direction="prev" onClick={handlePrev} />
      <NavArrow direction="next" onClick={handleNext} />

      {/* ── Bottom bar: dots + progress ── */}
      <div className="absolute bottom-0 inset-x-0 z-20 pb-5">
        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/5 mb-4">
          {!paused && (
            <motion.div
              key={`progress-${current}-${paused}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: SLIDE_INTERVAL_MS / 1000, ease: "linear" }}
              className="h-full bg-amber-500/60"
            />
          )}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 xl:gap-3">
          {dots.map((dot, i) => (
            <button
              key={dot.id}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Ir a: ${dot.label}`}
              className="group relative transition-all duration-300"
            >
              {i === current ? (
                /* Active dot: elongated pill */
                <span
                  className="block h-2.5 xl:h-3 rounded-full transition-all duration-300"
                  style={{
                    width: "2.5rem",
                    backgroundColor: dot.color,
                    boxShadow: `0 0 8px ${dot.color}80`,
                  }}
                />
              ) : (
                /* Inactive dot */
                <span
                  className="block w-2.5 xl:w-3 h-2.5 xl:h-3 rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-200"
                  style={{ backgroundColor: dot.color }}
                />
              )}
              {/* Tooltip on hover */}
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/70 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                {dot.label}
              </span>
            </button>
          ))}
        </div>

        {/* Paused indicator */}
        {paused && (
          <p className="text-center text-slate-600 text-xs mt-2 tracking-widest">
            ⏸ PAUSADO
          </p>
        )}
      </div>

      {/* ── Slide counter (top right) ── */}
      <div className="absolute top-4 right-20 z-20 text-slate-600 text-sm xl:text-base font-mono">
        {String(current + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
      </div>

      {/* ── Ver dashboard (top right, a la izquierda del contador) ── */}
      {current < SLIDE_META.length && (
        <Link
          href={SLIDE_META[current].href}
          className="absolute top-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-gold hover:bg-white/5 transition-all duration-200 text-sm xl:text-base"
          style={{ right: "calc(5rem + 6rem)" }}
        >
          Ver dashboard completo
          <svg className="w-3.5 h-3.5 xl:w-4 xl:h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </section>
  );
}
