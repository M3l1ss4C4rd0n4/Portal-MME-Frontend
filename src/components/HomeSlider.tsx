"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import SemiGauge from "@/components/ui/SemiGauge";
import { SkeletonBlock, SkeletonKpiCard, SkeletonChart } from "@/components/ui/Skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import { TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { useHomeSlider, SLIDE_INTERVAL_MS } from "@/hooks/useHomeSlider";
import { useDiagnosticosIA } from "@/hooks/useDiagnosticosIA";
import { fmtCortePresupuesto } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import SlideRedesX, { ALL_X_ACCOUNTS } from "@/components/SlideRedesX";
import CapacidadEmbalseChart, { type CapacidadEmbalseData } from "@/components/charts/CapacidadEmbalseChart";
import PredictionLineChart from "@/components/predictions/PredictionLineChart";
import PredictionKpiBlock from "@/components/predictions/PredictionKpiBlock";
import type { PredictionPoint } from "@/types/predictions";
import { fmtShortDate } from "@/types/predictions";
import InformesDiariosSlider from "@/components/InformesDiariosSlider";
import { TopAccent, SectionBadge, CategoryTag, containerVariants, itemVariants } from "@/components/slides/SlideUI";
import { SlideSupervision } from "@/components/slides/SlideSupervision";
import { SlideHidrocarburosPresupuesto } from "@/components/slides/SlideHidrocarburosPresupuesto";
import { SlideHidrocarburosProduccion } from "@/components/slides/SlideHidrocarburosProduccion";
import type { TermicaSliderData } from "@/types/home-slider";
// Marco regulatorio oficial — Resolución CREG 026/2014, 209/2020, 101 066/2024
import {
  clasificarVisualEmbalse,
  clasificarVisualAportes,
  clasificarVisualPrecioBolsa,
  clasificarIndiceNE,
  obtenerSendaReferencia,
  OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT,
  HSIN_UMBRAL_NORMAL,
  HSIN_UMBRAL_DEFICIT_SEVERO,
  HSIN_UMBRAL_CRITICO_HISTORICO,
  PRECIO_ESCASEZ_PEI_REF_2026_01,
  PRECIO_ESCASEZ_PE_REF_2026_01,
  PRECIO_ESCASEZ_PES_REF_2026_01,
} from "@/lib/umbralesOficiales";
import { diagnosticoTermico } from "@/lib/kpi-logic";

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
    capacidadInstaladaMw?: number | null;
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
    avanceFisico: number;
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
  hidroPresuData?: {
    resumen: {
      fecha_actualizacion: string | null;
      apropiacion_vigente: number;
      compromisos: number;
      obligaciones: number;
      por_comprometer: number;
      pct_compromisos: number;
      pct_obligaciones: number;
    } | null;
    proyectos: Array<{
      proyecto: string;
      apropiacion_vigente: number;
      compromisos: number;
      obligaciones: number;
      por_comprometer: number;
      pct_compromisos: number;
      pct_obligacion: number;
    }>;
  };
  hidroProdData?: {
    produccionDiaria: Array<{
      fecha: string;
      petroleo_bbl: number;
      gas_fiscalizado_mpc: number;
      gas_comercializado_mpc: number;
    }>;
    top5: Array<{ mes: string; categoria: string; nombre: string; valor: number; unidad: string }>;
    commodities: Record<
      string,
      {
        valorUsd: number | null;
        variacionAbs: number | null;
        variacionPct: number | null;
        fecha: string | null;
        fechaCarga: string | null;
        historico: Array<{ fecha: string; valor: number }>;
      }
    >;
    brecha?: { mpcd: number; pct: number | null } | null;
  };
}

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
  valueSizeClass,
  progressPct,
  chipLabel, chipColor, chipNota, tendencia, metrica,
  valueTitle, chipTitle, trendTitle,
  sparklineData, sparklineColor,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  date?: string | null;
  valueClass?: string;
  large?: boolean;
  /** Fuerza un tamaño de fuente fijo para el valor, ignorando el autoescalado por longitud de
      texto — usar cuando la cifra debe verse igual de grande que otra tarjeta aunque tenga más
      dígitos (ej. valores en pesos con precisión completa vs. montos abreviados). */
  valueSizeClass?: string;
  /** Cuando el valor ES un porcentaje (0-100), muestra la barra de progreso con degradado y
      escala 0%/100% — igual que en Reservas/Aportes/Proyección Embalses. Omitir en valores que
      no son un porcentaje de algo (precios, montos, conteos): una barra ahí no tiene sentido. */
  progressPct?: number;
  chipLabel?: string;
  chipColor?: string;
  /** Nota corta y visible bajo el chip de estado — usar cuando el chip se
      calcula (total o parcialmente) con un criterio operativo del CND
      (XM) que NO es normativa de la CREG, para que quede claro sin tener
      que pasar el cursor sobre el tooltip. Ver estadoGeneracion()/
      estadoI3Termica() en este mismo archivo. */
  chipNota?: string;
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  /** Tooltip nativo al pasar cursor sobre el valor numérico */
  valueTitle?: string;
  /** Tooltip nativo al pasar cursor sobre el chip de estado */
  chipTitle?: string;
  /** Tooltip nativo al pasar cursor sobre el badge de tendencia */
  trendTitle?: string;
  /** Serie histórica para la mini gráfica de tendencia — se omite si no hay datos suficientes */
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  const strLen = typeof value === 'string' || typeof value === 'number' ? String(value).length : 12;
  let fontClass: string;

  if (valueSizeClass) {
    fontClass = valueSizeClass;
  } else if (large) {
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

  const trendColor = tendencia && tendencia.label !== "S/D" ? getTrendColor(tendencia, metrica ?? "valor") : undefined;
  const trendUnit = metrica === "embalses" || metrica === "aportes" ? "pp" : "%";

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: "0 8px 30px -8px var(--glow-energia)", transition: { duration: 0.2 } }}
      className="h-full flex flex-col text-center gap-1.5 px-3 py-2.5 bg-card-glow-energia border border-card-energia border-t-2 border-t-[var(--color-title-energia)] rounded-xl"
    >
      {/* Encabezado: título a la izquierda, estado como badge arriba a la derecha */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-theme-muted text-xs xl:text-sm uppercase tracking-[0.14em] font-semibold text-left">
          {label}
        </p>
        {chipLabel && chipColor && (
          <div className="flex flex-col items-end gap-0.5">
            <StatusChip label={chipLabel} color={chipColor} title={chipTitle} />
            {chipNota && (
              <span className="text-slate-500 text-[9px] xl:text-[10px] leading-tight text-right max-w-[9rem]">
                {chipNota}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Valor principal + tendencia — la mini-tendencia (si hay) va a la izquierda del valor */}
      <div className="flex items-center justify-center gap-2.5" title={valueTitle}>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} color={sparklineColor ?? "var(--color-title-energia)"} className="w-10 xl:w-12 shrink-0" />
        )}
        <div className="inline-flex items-baseline gap-2 flex-wrap">
          <span
            className={`font-extrabold leading-none tabular-nums break-all ${valueClass} ${fontClass}`}
            style={trendColor ? { color: trendColor } : undefined}
          >
            {value}
          </span>
          {tendencia && tendencia.label !== "S/D" && (
            <span
              className="inline-flex items-center gap-0.5 text-xs xl:text-sm font-bold"
              style={{ color: trendColor }}
              title={trendTitle}
            >
              <TrendArrow tendencia={tendencia} metrica={metrica} />
              {tendencia.cambio7d !== null && `${Math.abs(tendencia.cambio7d).toFixed(1)}${trendUnit}/7d`}
            </span>
          )}
        </div>
      </div>

      {(unit || date) && (
        <p className="text-slate-400 text-xs xl:text-sm font-medium">
          {unit}
          {unit && date && " · "}
          {date && `Dato: ${date}`}
        </p>
      )}

      {/* Barra de progreso con degradado — solo cuando el valor es un porcentaje real */}
      {progressPct != null && (
        <div>
          <div className="w-full h-1.5 rounded-full bg-theme-tertiary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #60A5FA, #1D4ED8)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPct, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 leading-none mt-0.5">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </motion.div>
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
  "DÉFICIT SEVERO": 4,
  "ALTA PRESIÓN": 3, "ALERTA": 3,
  "ALERTA — BAJO SENDA": 3, "DÉFICIT HÍDRICO": 3,
  "ESTRÉS MODERADO": 2, "ALERTA MEDIA": 2,
  "SOBRE SENDA": 2,
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

interface DiagnosticoReservasParams {
  reservasPct: number;
  aportesPct: number | null;
  estados: {
    reservas: { label: string; color: string };
    aportes: { label: string; color: string } | null;
  };
  oniActual: number | null;
  oniClasificacion: string | null;
  oniProyeccionInicio: string | null;
  /** Resumen de la proyección de embalses, si ya se cargó desde /api/predicciones/ */
  prediccion?: { picoPct: number; picoFecha: string; meta80Fecha?: string } | null;
}

/**
 * Diagnóstico narrativo de reservas y aportes hídricos — usa las mismas
 * clasificaciones oficiales (`estados`) que ya se muestran en los chips,
 * para que el encabezado nunca contradiga lo que ve el usuario al lado.
 * Marco regulatorio: Estatuto CREG 026/2014 + Res. CREG 209/2020 + ONI NOAA CPC.
 */
function diagnosticoReservas(p: DiagnosticoReservasParams): string {
  const severidad = Math.max(_prio(p.estados.reservas.label), p.estados.aportes ? _prio(p.estados.aportes.label) : 0);

  let texto = severidad >= 3
    ? "Las reservas hídricas y los aportes del sistema presentan estrés. "
    : severidad === 2
    ? "Las reservas hídricas y los aportes del sistema están en vigilancia. "
    : "Las reservas hídricas y los aportes del sistema están en condiciones normales. ";

  // .toFixed(1), no .toFixed(0): las tarjetas de KPI de al lado muestran 1-2
  // decimales (ej. "79.51%") — redondear el texto a entero (79.51→"80") cruza
  // la barrera del número entero y hace parecer que el párrafo usa un dato
  // distinto al de la tarjeta, aunque sea el mismo valor solo que redondeado.
  if (p.aportesPct != null && p.aportesPct < 90 && p.reservasPct >= 70) {
    texto += `Aunque los aportes hídricos están por debajo de lo normal (${p.aportesPct.toFixed(1)}%), los embalses aún se mantienen estables al ${p.reservasPct.toFixed(1)}%. `;
  } else if (p.aportesPct != null && p.aportesPct >= 90) {
    texto += `Los aportes hídricos están en nivel normal, sosteniendo los embalses al ${p.reservasPct.toFixed(1)}%. `;
  } else {
    texto += `Embalses al ${p.reservasPct.toFixed(1)}%. `;
  }

  if (p.oniActual != null && p.oniClasificacion) {
    if (p.oniClasificacion === "EL_NIÑO") {
      texto += `El Fenómeno de El Niño está activo (ONI ${p.oniActual.toFixed(2)}°C), reduciendo las lluvias y presionando el sistema. `;
    } else if (p.oniClasificacion === "LA_NIÑA") {
      texto += `El Fenómeno de La Niña está activo (ONI ${p.oniActual.toFixed(2)}°C), aumentando las lluvias y favoreciendo los aportes. `;
    } else if (p.oniProyeccionInicio) {
      texto += `El ENSO aún es neutral (ONI ${p.oniActual.toFixed(2)}°C), pero la tendencia de calentamiento proyecta que El Niño comenzaría aproximadamente en ${p.oniProyeccionInicio}. `;
    } else {
      texto += `El ENSO se mantiene neutral (ONI ${p.oniActual.toFixed(2)}°C), sin presión climática adicional en el horizonte. `;
    }
  }

  if (p.prediccion) {
    // Bug real corregido: "pico" es el máximo DENTRO de la serie de predicción
    // futura (ver server/api/v1/routes/predictions.py:196, idxmax() sobre solo
    // los próximos 90 días) — una serie distinta del valor actual medido
    // (p.reservasPct). Es matemáticamente válido que ese máximo futuro sea
    // igual o menor al valor de hoy (el modelo no proyecta recuperación), pero
    // decir "se proyecta un pico" en ese caso suena a buena noticia futura
    // cuando en realidad es lo contrario.
    const sinRecuperacionProyectada = p.prediccion.picoPct <= p.reservasPct;
    texto += sinRecuperacionProyectada
      ? `El modelo no proyecta una recuperación en los próximos meses: el mejor escenario esperado es ${p.prediccion.picoPct.toFixed(1)}% el ${fmtShortDate(p.prediccion.picoFecha)}, en línea con el nivel actual o levemente por debajo`
      : `Se proyecta un pico de ${p.prediccion.picoPct.toFixed(1)}% el ${fmtShortDate(p.prediccion.picoFecha)}`;
    texto += p.prediccion.meta80Fecha
      ? `, superando la meta del 80% a partir del ${fmtShortDate(p.prediccion.meta80Fecha)}. `
      : `, sin alcanzar la meta del 80% en el horizonte proyectado. `;
    texto += `La ventana de mayor riesgo energético se ubica entre diciembre de 2026 y marzo de 2027. `;
  }

  return texto.trim();
}

interface DiagnosticoPrecioParams {
  precio: number;
  preciosReg: { pe?: number } | null | undefined;
  fuentes: Array<{ id: string; value: number }> | undefined;
  estados: {
    precio: { label: string; color: string };
    generacion: { label: string; color: string };
  };
}

/**
 * Diagnóstico narrativo de precio de bolsa y generación — misma lógica de
 * reutilizar `estados` ya clasificados para mantener coherencia con los chips.
 */
function diagnosticoPrecio(p: DiagnosticoPrecioParams): string {
  const severidad = Math.max(_prio(p.estados.precio.label), _prio(p.estados.generacion.label));
  const pe = p.preciosReg?.pe ?? PRECIO_ESCASEZ_PE_REF_2026_01;
  const hidroPct = p.fuentes?.find(f => f.id === "HIDRAULICA")?.value ?? null;
  const termicaPct = p.fuentes?.find(f => f.id === "TERMICA")?.value ?? null;

  let texto = severidad >= 3
    ? "El precio de bolsa y la generación presentan estrés. "
    : severidad === 2
    ? "El precio de bolsa y la generación están en vigilancia. "
    : "El precio de bolsa y la generación están en condiciones normales. ";

  if (hidroPct != null && termicaPct != null) {
    // "de la generación" (no "de la demanda" — bug real: esto es composición
    // de la generación, no del consumo) y "en los últimos 7 días" explícito —
    // este dato es un promedio semanal (generacionPorFuente, ventana de 7 días),
    // a diferencia del % puntual "de hoy" que muestra el slide de Generación
    // Térmica. Sin esta aclaración ambos números parecen contradecirse aunque
    // los dos sean correctos para lo que miden.
    texto += `En promedio de los últimos 7 días, la generación hidráulica ha cubierto el ${hidroPct.toFixed(1)}% de la generación total, y la térmica el ${termicaPct.toFixed(1)}%. `;
  }

  texto += p.precio < pe
    ? `El precio de bolsa ($ ${p.precio.toFixed(0)} COP/kWh) ha aumentado pero no llega al precio de escasez de $ ${Math.round(pe).toLocaleString('es-CO')}. `
    : `El precio de bolsa ($ ${p.precio.toFixed(0)} COP/kWh) ya superó el precio de escasez de $ ${Math.round(pe).toLocaleString('es-CO')}. `;

  return texto.trim();
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
  valueTitle, chipTitle, trendTitle, gwhTitle, dailyTitle,
  sparklineData, sparklineColor,
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
  /** Tooltip nativo sobre la línea diaria (dailyGwh/date) */
  dailyTitle?: string;
  /** Serie histórica para la mini gráfica de tendencia — se omite si no hay datos suficientes */
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  const fmt = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  const fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
  const trendColor = tendencia && tendencia.label !== "S/D" ? getTrendColor(tendencia, metrica ?? "valor") : undefined;
  const trendUnit = metrica === "embalses" || metrica === "aportes" ? "pp" : "%";
  const footer = dailyGwh != null
    ? <>{date ?? "hoy"}: {fmt(dailyGwh)} GWh{dailyHistGwh != null && <span className="text-slate-600"> · media {fmt(dailyHistGwh)} GWh</span>}</>
    : date
    ? <>Última act.: {date}</>
    : null;
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: "0 8px 30px -8px var(--glow-energia)", transition: { duration: 0.2 } }}
      className="h-full flex flex-col text-center gap-1.5 px-3 py-2.5 bg-card-glow-energia border border-card-energia border-t-2 border-t-[var(--color-title-energia)] rounded-xl"
    >
      {/* Encabezado: título a la izquierda, estado como badge arriba a la derecha */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-theme-muted text-xs xl:text-sm uppercase tracking-[0.14em] font-semibold text-left">
          {label}
        </p>
        {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} title={chipTitle} />}
      </div>

      {/* Valor principal + tendencia — la mini-tendencia (si hay) va a la izquierda del valor */}
      <div className="flex items-center justify-center gap-2.5" title={valueTitle}>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} color={sparklineColor ?? "var(--color-title-energia)"} className="w-10 xl:w-12 shrink-0" />
        )}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={`${fontClass} font-extrabold leading-none tabular-nums ${pctColor}`}
            style={trendColor ? { color: trendColor } : undefined}
          >
            {pct.toFixed(2)}%
          </span>
          {tendencia && tendencia.label !== "S/D" && (
            <span
              className="inline-flex items-center gap-0.5 text-xs xl:text-sm font-bold"
              style={{ color: trendColor }}
              title={trendTitle}
            >
              <TrendArrow tendencia={tendencia} metrica={metrica} />
              {tendencia.cambio7d !== null && `${Math.abs(tendencia.cambio7d).toFixed(1)}${trendUnit}/7d`}
            </span>
          )}
        </div>
      </div>

      {/* Métrica secundaria */}
      {gwh != null && (
        <p className="text-slate-300 text-xs xl:text-sm font-medium" title={gwhTitle}>
          {fmt(gwh)} GWh
          {gwhRef != null && (
            <span className="text-slate-500"> · {gwhRefLabel ?? "ref."} {fmt(gwhRef)} GWh</span>
          )}
        </p>
      )}

      {/* Barra de progreso con degradado — refuerzo visual del % (escala 0-100%) y única
          separadora visual antes del pie, ya no hace falta una línea divisoria aparte */}
      <div>
        <div className="w-full h-1.5 rounded-full bg-theme-tertiary overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #60A5FA, #1D4ED8)" }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 leading-none mt-0.5">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Metadato al pie */}
      {footer && (
        <p className="mt-auto text-slate-500 text-[11px] xl:text-xs font-medium" title={dailyTitle}>{footer}</p>
      )}
    </motion.div>
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

// ─── Slide 1a: Reservas y Embalses ─────────────────────────────────────────────
interface EmbalsesPrediccionData {
  prediccion: PredictionPoint[];
  pico: { fecha: string; valor: number; dias_desde_hoy: number } | null;
  mape: number;
  confianza: number;
  cobertura_ci?: number | null;
  mape_es_riguroso?: boolean;
  mape_rango_min?: number | null;
  mape_rango_max?: number | null;
  backtest?: { n_dias_test: number } | null;
}

function SlideReservasEmbalses({ d }: { d: HomeSliderProps["sectorData"] }) {
  const [embalseData, setEmbalseData] = useState<CapacidadEmbalseData | null>(null);
  useEffect(() => {
    fetch("/api/embalses/capacidad-historica")
      .then((r) => r.json())
      .then((json) => setEmbalseData(json))
      .catch(() => undefined);
  }, []);

  const [predData, setPredData] = useState<EmbalsesPrediccionData | null>(null);
  useEffect(() => {
    fetch("/api/predicciones/")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) return;
        setPredData(json.embalses);
      })
      .catch(() => undefined);
  }, []);

  const threshold80Date = predData?.prediccion.find((p) => p.valor >= 80)?.fecha;
  const climaPico = predData?.prediccion.find((p) => p.fecha === predData.pico?.fecha);
  const climaMeta = threshold80Date ? predData?.prediccion.find((p) => p.fecha === threshold80Date) : undefined;

  const aportes = d.aportesHidricos;
  const aportesPct = aportes?.hsinPct ?? aportes?.pct ?? (
    aportes && aportes.historicoGwh > 0 ? (aportes.actualGwh / aportes.historicoGwh) * 100 : null
  );

  // Preferir la clasificación visual que ya calcula el backend (estadoSin/
  // colorSin, server/core/umbrales_oficiales.py::clasificar_visual_embalse)
  // en vez de recalcularla aquí — mismo criterio ya usado abajo para
  // sendaPct/neNivel. Encontrado en producción (2026-08-24): la copia local
  // (clasificarVisualEmbalse) tenía una regla regulatoria derogada (70%
  // absoluto, Res. CREG 210/2021) que el backend ya había corregido —
  // preferir el valor del backend evita que ambas copias vuelvan a divergir
  // si una se actualiza y la otra no.
  const stRes = d.estadoSin && d.colorSin
    ? { label: d.estadoSin, color: d.colorSin, tw: _TW_COLOR_MAP[d.colorSin] ?? "text-slate-400" }
    : estadoReservas(d.pctEmbalses);
  const stAp  = aportesPct !== null ? estadoAportes(aportesPct) : null;
  const diagnosticosIA = useDiagnosticosIA();
  const diagnosticoDeterministico = diagnosticoReservas({
    reservasPct: d.pctEmbalses,
    aportesPct,
    estados: { reservas: stRes, aportes: stAp },
    oniActual: d.oniActual ?? null,
    oniClasificacion: d.oniClasificacion ?? null,
    oniProyeccionInicio: d.oniProyeccionInicio ?? null,
    prediccion: predData?.pico
      ? { picoPct: predData.pico.valor, picoFecha: predData.pico.fecha, meta80Fecha: threshold80Date }
      : null,
  });
  // Fase 11: texto generado por IA 1 vez al día (cacheado), reconcilia
  // explícitamente cifras que de otro modo parecerían contradictorias entre
  // slides. Si la tarea diaria aún no corrió o falló, cae al determinístico.
  const diagnostico = diagnosticosIA["reservas"]?.texto ?? diagnosticoDeterministico;

  const aportesColor = aportesPct === null ? "text-slate-400"
    : aportesPct >= HSIN_UMBRAL_NORMAL ? "text-emerald-400"
    : aportesPct >= HSIN_UMBRAL_DEFICIT_SEVERO ? "text-gold"
    : "text-red-400";

  // Preferir la senda/índice NE que ya calcula el backend (server/core/umbrales_oficiales.py,
  // con vía a datos en vivo); recalcular localmente solo si el backend no la envió.
  const sendaPct = d.umbralesRegulatorios?.sendaReferenciaPct ?? obtenerSendaReferencia();
  const neNivel = d.umbralesRegulatorios?.indiceNe ?? clasificarIndiceNE(d.pctEmbalses).nivel;

  // Variables auxiliares para tendencias
  const chEmbalses = d.tendencias?.embalses?.cambio7d;
  const chAportes = d.tendencias?.aportes?.cambio7d;

  // ─── Reservas Hídricas ───────────────────────────────────────────────────
  const tReservasValor =
    `Los embalses del país están al ${d.pctEmbalses.toFixed(1)}% de su capacidad total. ` +
    `Esto significa que, de toda el agua que pueden almacenar las represas para generar electricidad, hoy tenemos ocupado ese porcentaje. ` +
    `La capacidad total de todos los embalses equivale a unos ${d.capacidadEmbalseGwh?.toLocaleString('es-CO', {maximumFractionDigits:0}) ?? '17.000'} gigavatios-hora de energía potencial. ` +
    `El dato lo publica XM todos los días.`;

  const tReservasGwh =
    `En este momento hay almacenados ${d.embalseGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh de energía en forma de agua en los embalses, ` +
    `de un total posible de ${d.capacidadEmbalseGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh. ` +
    `Es como la batería del sistema: cuando los embalses están llenos, hay energía de sobra; cuando están vacíos, hay que prender otras plantas.`;

  // Bug real corregido: el índice NE "SUPERIOR" se activa por DOS reglas
  // distintas (embalse ≥ senda del mes, O embalse ≥ 70% por la "regla
  // absoluta" CREG 209/2020 — ver clasificarIndiceNE en @/lib/umbralesOficiales),
  // pero el texto asumía ciegamente que "SUPERIOR" siempre significa "por
  // encima del número de senda mostrado". En años de El Niño la senda puede
  // subir por encima del 70% (ej. 82%), y un embalse de 79.5% cae en SUPERIOR
  // por la regla absoluta sin superar esa senda específica — el texto decía
  // "por encima de la senda (82%)" con un valor que en realidad está por
  // debajo. Se compara explícitamente contra sendaPct en vez de confiar en el
  // label.
  const superaLaSendaEspecifica = d.pctEmbalses >= sendaPct;
  const tReservasChip =
    `${stRes.label}. ` +
    (neNivel === 'SUPERIOR' && superaLaSendaEspecifica
      ? `Los embalses están en muy buen nivel, por encima de la senda de referencia que establece la CREG (${sendaPct.toFixed(1)}% para este mes). Esto significa que hay agua suficiente y el sistema está tranquilo.`
      : neNivel === 'SUPERIOR'
      ? `Los embalses están por encima del piso mínimo del 70% que exige la regulación CREG 209/2020, aunque todavía por debajo de la senda específica de este mes (${sendaPct.toFixed(1)}%). El sistema está estable, sin ser el nivel ideal para la época.`
      : neNivel === 'ALERTA'
      ? `Los embalses están por debajo de la senda de referencia que fija la CREG (${sendaPct.toFixed(1)}%). Todavía no es crítico, pero hay que vigilar de cerca la evolución en los próximos días.`
      : `Los embalses están en un nivel inferior al esperado para esta época del año. La senda de referencia de la CREG es de ${sendaPct.toFixed(1)}%. Esta situación puede activar medidas de seguimiento especial.`);

  const tReservasTrend =
    chEmbalses != null
      ? `Los embalses ${chEmbalses > 0 ? 'subieron' : 'bajaron'} ${Math.abs(chEmbalses).toFixed(1)} puntos porcentuales con respecto a hace 7 días. ` +
        (chEmbalses > 0 ? 'Están recuperándose, lo cual es una buena noticia para el sistema.' : 'Están perdiendo agua, lo cual puede ser preocupante si la tendencia continúa.')
      : `Compara el nivel de los embalses hoy con el de hace una semana.`;

  const tReservasDaily =
    `Fecha del dato más reciente de embalses reportado por XM${d.fechaEmbalse ? ` (${d.fechaEmbalse})` : ''}.`;

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

  const tAportesDaily =
    aportes?.dailyActualGwh != null
      ? `Este es el aporte de agua a los embalses en el último día con información completa${d.fechaAportes ? ` (${d.fechaAportes})` : ''}: ${aportes.dailyActualGwh.toLocaleString('es-CO', {maximumFractionDigits:1})} GWh, frente a un promedio histórico de ${aportes.dailyHistGwh?.toLocaleString('es-CO', {maximumFractionDigits:1}) ?? '—'} GWh para ese mismo día del año. ` +
        `A diferencia del dato de arriba (que suma todo lo acumulado desde el 1 de enero), este es el aporte de un solo día — sirve para ver si en las últimas horas está lloviendo más o menos de lo normal.`
      : undefined;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center h-full w-full max-w-[1600px] px-6 xl:px-10 py-3 justify-evenly gap-2">
        {/* Header con diagnóstico dinámico */}
        <div className="text-center">
          <SectionBadge label="Gestión del Sector" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-secondary text-xs xl:text-sm font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-[10px] xl:text-xs mt-0.5">
            {d.ultimaEjecucionETL
              ? `ETL sector energético · última ejecución: ${d.ultimaEjecucionETL}`
              : d.ultimaActualizacion
              ? `Datos en tiempo real de XM · últimos datos: ${d.ultimaActualizacion}`
              : "Datos en tiempo real de XM"}
          </p>
        </div>

        {/* KPIs — 3 columnas */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 w-full gap-3">
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
            dailyTitle={tReservasDaily}
            sparklineData={embalseData?.pctSin.data.map((p) => p.y)}
            sparklineColor="#3B82F6"
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
              dailyTitle={tAportesDaily}
            />
          ) : (
            <div className="flex items-center justify-center bg-card-glow-energia border border-card-energia rounded-xl px-2 py-2">
              <p className="text-slate-600 text-sm">Sin datos</p>
            </div>
          )}
          {predData ? (
            <PredictionKpiBlock
              pico={predData.pico}
              metaFecha={threshold80Date ?? null}
              mape={predData.mape}
              confianza={predData.confianza}
              coberturaCi={predData.cobertura_ci}
              mapeEsRiguroso={predData.mape_es_riguroso}
              nDiasBacktest={predData.backtest?.n_dias_test}
              mapeRangoMin={predData.mape_rango_min}
              mapeRangoMax={predData.mape_rango_max}
              climaPico={climaPico}
              climaMeta={climaMeta}
            />
          ) : (
            <SkeletonKpiCard />
          )}
        </motion.div>

        {/* Gráficos — 2 columnas: Capacidad Embalse | Proyección de Embalses */}
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-2 xl:gap-3">
          {/* Hidrología: Capacidad Embalse SIN (gráfico de área histórico) */}
          <div className="flex flex-col">
            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Capacidad Embalse</p>
            {embalseData ? (
              <CapacidadEmbalseChart data={embalseData} height={220} />
            ) : (
              <SkeletonBlock className="h-[22vh] min-h-[140px] max-h-[220px] w-full" />
            )}
          </div>

          {/* Predicción: Proyección de Embalses (modelo ENSEMBLE_SECTOR) */}
          <div className="flex flex-col">
            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Proyección de Embalses</p>
            {predData && predData.prediccion.length > 0 ? (
              <PredictionLineChart
                data={predData.prediccion}
                height={220}
                peakDate={predData.pico?.fecha}
                threshold80Date={threshold80Date}
              />
            ) : (
              <SkeletonBlock className="h-[22vh] min-h-[140px] max-h-[220px] w-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 1b: Precio y Generación ─────────────────────────────────────────────
function SlidePrecioGeneracion({ d, detalle }: { d: HomeSliderProps["sectorData"]; detalle?: HomeSliderProps["sectorDetalle"] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const hasDetalle = !!detalle && detalle.generacionPorFuente.length > 0;
  const hasPrecioSeries = !!detalle && detalle.precioBolsaSeries.length > 0 && detalle.precioBolsaSeries[0].data.length > 0;
  const aportes = d.aportesHidricos;
  const preciosReg = d.umbralesRegulatorios;

  const stPr  = estadoPrecio(d.precioBolsa, preciosReg ?? undefined);
  const stGen = estadoGeneracion(
    detalle?.generacionPorFuente,
    d.generacionGwh,
    aportes?.dailyActualGwh,
    d.precioBolsa,
    preciosReg ?? undefined,
  );
  const diagnosticosIA = useDiagnosticosIA();
  const diagnosticoDeterministico = diagnosticoPrecio({
    precio: d.precioBolsa,
    preciosReg: d.umbralesRegulatorios,
    fuentes: detalle?.generacionPorFuente,
    estados: { precio: stPr, generacion: stGen },
  });
  // Fase 11: texto generado por IA 1 vez al día (cacheado), con respaldo
  // determinístico si la tarea diaria aún no corrió o falló.
  const diagnostico = diagnosticosIA["precio_generacion"]?.texto ?? diagnosticoDeterministico;

  // ─── Tooltips nativos (title) para cada valor ────────────────────────────
  const pei = preciosReg?.pei ?? PRECIO_ESCASEZ_PEI_REF_2026_01;
  const pe  = preciosReg?.pe  ?? PRECIO_ESCASEZ_PE_REF_2026_01;
  const pes = preciosReg?.pes ?? PRECIO_ESCASEZ_PES_REF_2026_01;

  // Variables auxiliares para tendencias
  const chPrecio = d.tendencias?.precio?.cambio7d;
  const chGeneracion = d.tendencias?.generacion?.cambio7d;

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
    `Para referencia, un día típico Colombia consume entre 200 y 250 GWh. La capacidad instalada total del sistema es de ${d.capacidadInstaladaMw?.toLocaleString('es-CO', {maximumFractionDigits:0}) ?? '21.029'} megavatios.`;

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

    detalle2 += `\n\nDe los tres indicadores, el peor es "${stGen.label}", y ese es el estado que se muestra. `;
    detalle2 += `Nota: solo el precio de bolsa (I1) es un indicador oficial de la CREG. Los índices I2 y I3 son criterios operativos del CND (XM), no normativa de la CREG.`;
    return detalle2;
  }

  const tGeneracionChip = buildTGeneracionChip();

  const tGeneracionTrend =
    chGeneracion != null
      ? `La generación ${chGeneracion > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(chGeneracion).toFixed(1)}% con respecto al promedio de los últimos 7 días. ` +
        (chGeneracion > 0 ? 'Puede ser por mayor demanda o por buenas condiciones de generación.' : 'Puede ser por menor demanda o por dificultades en la generación.')
      : `Se compara la generación de hoy con el promedio de la última semana.`;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center h-full w-full max-w-[1600px] px-6 xl:px-10 py-3 justify-evenly gap-2">
        {/* Header con diagnóstico dinámico */}
        <div className="text-center">
          <SectionBadge label="Gestión del Sector" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-secondary text-xs xl:text-sm font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-[10px] xl:text-xs mt-0.5">
            {d.ultimaEjecucionETL
              ? `ETL sector energético · última ejecución: ${d.ultimaEjecucionETL}`
              : d.ultimaActualizacion
              ? `Datos en tiempo real de XM · últimos datos: ${d.ultimaActualizacion}`
              : "Datos en tiempo real de XM"}
          </p>
        </div>

        {/* KPIs — 2 columnas */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 w-full gap-3">
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
            sparklineData={hasPrecioSeries ? detalle!.precioBolsaSeries[0].data.map((p) => p.y) : undefined}
            sparklineColor="var(--color-gold)"
          />
          <KpiBlock
            label="Energía Generada"
            value={d.generacionGwh.toFixed(2)}
            unit="GWh"
            date={d.fechaGeneracion}
            valueClass="text-chart-teal"
            chipLabel={stGen.label}
            chipColor={stGen.color}
            chipNota="Incluye criterio operativo CND, no solo CREG"
            tendencia={d.tendencias?.generacion}
            metrica="generacion"
            valueTitle={tGeneracionValor}
            chipTitle={tGeneracionChip}
            trendTitle={tGeneracionTrend}
          />
        </motion.div>

        {/* Gráficos — 2 columnas: Precio | Generación */}
        {hasDetalle ? (
          <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-2 xl:gap-3">
            {/* Precio de Bolsa (PPP) - Línea */}
            {hasPrecioSeries && (
              <div className="flex flex-col">
                <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Precio de Bolsa (PPP) · Tendencia</p>
                <div className="h-[20vh] min-h-[110px] max-h-[200px]">
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
                    colors={["var(--color-gold)"]}
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
              <div className="relative h-[16vh] min-h-[90px] max-h-[160px] w-full">
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-2 xl:gap-3">
            <SkeletonChart heightClass="h-[20vh] min-h-[110px] max-h-[200px]" />
            <SkeletonChart heightClass="h-[16vh] min-h-[90px] max-h-[160px]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slide 1: Generación Térmica ──────────────────────────────────────────────
function SlideGeneracionTermica({
  d,
  detalle,
}: {
  d: TermicaSliderData;
  /** Datos del slide "Precio y Generación" (promedio 7 días) — solo se usa
   * para citar el promedio semanal en el diagnóstico y así aclarar por qué
   * puede diferir del dato puntual de hoy que muestra este slide. */
  detalle?: HomeSliderProps["sectorDetalle"];
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const termica7dPct = detalle?.generacionPorFuente.find(f => f.id === "TERMICA")?.value;
  const stTerm = estadoI3Termica(d.generacionTermica.participacionPct);
  const stPPP  = estadoPrecio(d.precios.ppp.valor);
  const pct    = d.generacionTermica.participacionPct;
  // PES (precio de escasez superior) ya viene en vivo en d.precios.escasez.valor
  // (Res. CREG 101 066/2024 Art. 3). PEI (precio de escasez inferior, Art. 4)
  // viene en vivo en d.precios.pei; "pe" ya no es un umbral CREG independiente
  // desde 2024, se mantiene como punto medio solo para la escala visual de 4 tramos.
  const pes    = d.precios.escasez.valor;
  const pei    = d.precios.pei ?? PRECIO_ESCASEZ_PEI_REF_2026_01;
  const pe     = (pei + pes) / 2;
  // Condición Crítica (Art. 1, Res. CREG 101 066/2024): se activa cuando el
  // precio de bolsa supera alguno de los precios de escasez vigentes.
  const pppVsPei = d.precios.ppp.valor > pei;
  const pppVsPes = d.precios.ppp.valor > pes;
  const stEsc = pppVsPes
    ? { label: "ACTIVACIÓN TOTAL", color: "#EF4444" }
    : pppVsPei
    ? { label: "ACTIVACIÓN PARCIAL", color: "#F59E0B" }
    : { label: "SIN ACTIVACIÓN", color: "#22C55E" };

  // ── Diagnóstico dinámico ────────────────────────────────────────────────────
  // Clasificación y redacción de la participación térmica: reutiliza
  // diagnosticoTermico() de @/lib/kpi-logic (misma fuente que usa el resto del
  // portal) en vez de una copia local — antes esta función y diagnosticoPrecio()
  // (más abajo, slide "Gestión del Sector") tenían cada una su propio texto y
  // sus propios umbrales para el mismo dato, lo que permitía que quedaran
  // desalineados entre sí sin que ningún test lo detectara.
  function buildDiagnostico(): string {
    const escActual = d.precios.escasez.valor;
    const pppActual = d.precios.ppp.valor;

    let texto = `${diagnosticoTermico(pct, pppActual, escActual, undefined, termica7dPct)} `;

    if (pppActual < escActual) {
      texto += `El PPP diario ($${pppActual.toFixed(0)} COP/kWh) está por debajo del precio de escasez superior ($${escActual.toFixed(0)} COP/kWh), lo que indica que no se han activado los mecanismos de cargo por confiabilidad. `;
    } else {
      texto += `El PPP diario ($${pppActual.toFixed(0)} COP/kWh) superó el precio de escasez superior ($${escActual.toFixed(0)} COP/kWh), señal de estrés en el mercado energético. `;
    }

    return texto.trim();
  }

  const diagnosticosIA = useDiagnosticosIA();
  // Fase 11: texto generado por IA 1 vez al día (cacheado), con respaldo
  // determinístico si la tarea diaria aún no corrió o falló.
  const diagnostico = diagnosticosIA["termica"]?.texto ?? buildDiagnostico();

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
      : `Las térmicas están generando el ${pct.toFixed(1)}% del total. Esto supera el umbral del 35% que se considera crítico: el sistema está muy dependiente de plantas costosas y con emisiones altas.`) +
    ` (Umbral operativo del CND — Boletín XM, no es una regla de la CREG.)`;

  const tTermicaTrend =
    d.generacionTermica.tendencia?.cambio7d != null
      ? `La generación térmica ${d.generacionTermica.tendencia.cambio7d > 0 ? 'aumentó' : 'bajó'} ` +
        `${Math.abs(d.generacionTermica.tendencia.cambio7d).toFixed(1)}% con respecto al promedio de los últimos 7 días. ` +
        (d.generacionTermica.tendencia.cambio7d > 0
          ? 'Un aumento sostenido puede indicar que los embalses están bajando o que la demanda creció.'
          : 'Una reducción es positiva: el sistema está dependiendo menos de combustibles fósiles.')
      : 'Compara la generación térmica de hoy con el promedio de la última semana.';

  // ── Tooltip strings — Precio de Escasez (PES) ──────────────────────────────
  const escVal = d.precios.escasez.valor;
  const pppVal = d.precios.ppp.valor;
  const tEscasezValor =
    `El precio de escasez superior (PES) vigente es $${escVal.toFixed(2)} COP/kWh — es el techo regulatorio ` +
    `que la Resolución CREG 101 066/2024 (Art. 3) fija para las compras en bolsa de las plantas térmicas de gas ` +
    `y combustibles líquidos, calculado con la metodología de la Resolución CREG 140/2017. También existe un ` +
    `precio de escasez inferior (PEI) de $${pei.toFixed(2)} COP/kWh (Art. 4), que aplica a las plantas con ` +
    `renovables o carbón. Cuando el precio de bolsa supera alguno de estos dos precios, se activa la Condición ` +
    `Crítica del Cargo por Confiabilidad.`;

  const tEscasezChip =
    pppVsPes
      ? `ACTIVACIÓN TOTAL. El precio de bolsa (${pppVal.toFixed(0)}) superó el precio de escasez superior ` +
        `($${pes.toFixed(0)}) — se hacen exigibles las Obligaciones de Energía Firme de todas las plantas, ` +
        `incluidas las de gas y líquidos, y la demanda paga como techo el precio de escasez superior, no el precio de ` +
        `bolsa negociado (Res. CREG 101 066/2024, Art. 55).`
      : pppVsPei
      ? `ACTIVACIÓN PARCIAL. El precio de bolsa (${pppVal.toFixed(0)}) superó el precio de escasez inferior ` +
        `($${pei.toFixed(0)}) pero no el superior ($${pes.toFixed(0)}) — solo se activan las Obligaciones de ` +
        `Energía Firme de las plantas con renovables o carbón (Res. CREG 101 066/2024, Art. 4).`
      : `SIN ACTIVACIÓN. El precio de bolsa (${pppVal.toFixed(0)}) está por debajo del precio de escasez ` +
        `inferior ($${pei.toFixed(0)}) — no se ha activado ningún mecanismo del Cargo por Confiabilidad; ` +
        `la demanda paga el precio de bolsa.`;

  const tEscasezTrend =
    d.precios.escasez.tendencia?.cambio7d != null
      ? `El precio de escasez superior (PES) ${d.precios.escasez.tendencia.cambio7d > 0 ? 'subió' : 'bajó'} ${Math.abs(d.precios.escasez.tendencia.cambio7d).toFixed(1)}% con respecto al promedio de los últimos 7 días.`
      : 'Variación del precio de escasez superior (PES) respecto al promedio de la última semana.';

  // ── Tooltip strings — PPP Diario ────────────────────────────────────────────
  const escActual = d.precios.escasez.valor;
  const tPPPValor =
    `El PPP diario de hoy es $${d.precios.ppp.valor.toFixed(2)} COP/kWh. ` +
    `Es el precio promedio ponderado al que se negoció la energía en la bolsa colombiana hoy. ` +
    `La referencia clave es el precio de escasez superior (PES) actual ($${escActual.toFixed(0)} COP/kWh): ` +
    (d.precios.ppp.valor < escActual
      ? `el PPP está por debajo, por lo que no se activó el cargo por confiabilidad.`
      : `el PPP ya lo superó — los generadores están cobrando el cargo por confiabilidad.`);

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
          ? `Sin embargo, está por debajo del precio de escasez superior (PES) vigente ($${escActual.toFixed(0)} COP/kWh), ` +
            `por lo que el cargo por confiabilidad no se activó hoy.`
          : `Además supera el precio de escasez superior (PES) vigente ($${escActual.toFixed(0)} COP/kWh), ` +
            `por lo que el cargo por confiabilidad se activó hoy.`)
      : `TECHO REGULATORIO (> $${pes.toFixed(0)} COP/kWh). El PPP de $${pppVal.toFixed(0)} ` +
        `superó el umbral superior ($${pes.toFixed(0)} COP/kWh). ` +
        (pppVal < escActual
          ? `Está por debajo del precio de escasez superior (PES) vigente ($${escActual.toFixed(0)} COP/kWh) — ` +
            `el cargo por confiabilidad no se activó.`
          : `También superó el precio de escasez superior (PES) vigente ($${escActual.toFixed(0)} COP/kWh) — ` +
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center h-full w-full max-w-[1600px] px-6 xl:px-10 py-3 justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Generación Térmica" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-secondary text-xs xl:text-sm font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-[10px] xl:text-xs mt-0.5">Datos XM · sector_energetico</p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 gap-3 w-full items-stretch">
          <KpiBlock
            label="Energía Térmica"
            value={d.generacionTermica.gwh.toFixed(2)}
            unit="GWh"
            date={d.generacionTermica.fecha}
            valueClass="text-theme-primary"
            chipLabel={stTerm.label}
            chipColor={stTerm.color}
            chipNota="Criterio operativo CND, no CREG"
            tendencia={d.generacionTermica.tendencia}
            metrica="generacion"
            valueTitle={tTermicaValor}
            chipTitle={tTermicaChip}
            trendTitle={tTermicaTrend}
          />

          {/* Precio Escasez Superior (PES) */}
          <div
            className={`h-full flex flex-col text-center gap-1.5 px-3 py-2.5 bg-card-glow-energia border border-card-energia rounded-xl transition-opacity duration-300 ${
              d.precios.mayor === "escasez" ? "opacity-100" : "opacity-40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-theme-muted text-xs xl:text-sm uppercase tracking-[0.14em] font-semibold text-left">Precio Escasez Superior (PES)</p>
              <StatusChip label={stEsc.label} color={stEsc.color} title={tEscasezChip} />
            </div>
            <div className="flex items-center justify-center gap-2" title={tEscasezValor}>
              <span className="font-black text-3xl xl:text-4xl leading-none text-theme-primary">${d.precios.escasez.valor.toFixed(2)}</span>
              {d.precios.escasez.tendencia && d.precios.escasez.tendencia.label !== "S/D" && (
                <span
                  className="inline-flex items-center gap-0.5 text-xs xl:text-sm font-bold"
                  style={{ color: getTrendColor(d.precios.escasez.tendencia, "precio") }}
                  title={tEscasezTrend}
                >
                  <TrendArrow tendencia={d.precios.escasez.tendencia} metrica="precio" />
                  {d.precios.escasez.tendencia.cambio7d !== null && `${Math.abs(d.precios.escasez.tendencia.cambio7d).toFixed(1)}%/7d`}
                </span>
              )}
            </div>
            {d.precios.escasez.fecha && (
              <p className="text-theme-muted text-xs xl:text-sm font-medium">COP/kWh · Dato: {d.precios.escasez.fecha}</p>
            )}
            {d.precios.escasez.variacion != null && (
              <p className={`mt-auto text-xs xl:text-sm font-medium ${d.precios.escasez.variacion < 0 ? "text-red-400" : "text-emerald-400"}`}>
                Var. mensual: {d.precios.escasez.variacion >= 0 ? "+" : ""}{d.precios.escasez.variacion.toFixed(2)} COP/kWh
              </p>
            )}
          </div>

          {/* PPP Diario */}
          <div
            className={`h-full flex flex-col text-center gap-1.5 px-3 py-2.5 bg-card-glow-energia border border-card-energia rounded-xl transition-opacity duration-300 ${
              d.precios.mayor === "ppp" ? "opacity-100" : "opacity-40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-theme-muted text-xs xl:text-sm uppercase tracking-[0.14em] font-semibold text-left">PPP Diario</p>
              <StatusChip label={stPPP.label} color={stPPP.color} title={tPPPChip} />
            </div>
            <div className="flex items-center justify-center gap-2" title={tPPPValor}>
              <span className="font-black text-3xl xl:text-4xl leading-none text-theme-primary">${d.precios.ppp.valor.toFixed(2)}</span>
              {d.precios.ppp.tendencia && d.precios.ppp.tendencia.label !== "S/D" && (
                <span
                  className="inline-flex items-center gap-0.5 text-xs xl:text-sm font-bold"
                  style={{ color: getTrendColor(d.precios.ppp.tendencia, "precio") }}
                  title={tPPPTrend}
                >
                  <TrendArrow tendencia={d.precios.ppp.tendencia} metrica="precio" />
                  {d.precios.ppp.tendencia.cambio7d !== null && `${Math.abs(d.precios.ppp.tendencia.cambio7d).toFixed(1)}%/7d`}
                </span>
              )}
            </div>
            {d.precios.ppp.fecha && (
              <p className="text-theme-muted text-xs xl:text-sm font-medium">COP/kWh · Dato: {d.precios.ppp.fecha}</p>
            )}
            {d.precios.ppp.variacion != null && (
              <p className={`mt-auto text-xs xl:text-sm font-medium ${d.precios.ppp.variacion < 0 ? "text-red-400" : "text-emerald-400"}`}>
                Var. semanal: {d.precios.ppp.variacion >= 0 ? "+" : ""}{d.precios.ppp.variacion.toFixed(2)} COP/kWh
              </p>
            )}
          </div>
        </motion.div>

        {/* Gráficos — 3 columnas: Plantas Térmicas (ranking) | Evolución | Generación por fuente */}
        <div className="grid grid-cols-3 w-full gap-3 xl:gap-4">
          {/* Plantas Térmicas */}
          <div className="flex flex-col">
            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Plantas Térmicas · Diaria</p>
            <div className="flex-1 min-h-[18vh] xl:min-h-[20vh]">
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
  const montoDisponible = apropiacion * (pctDisp / 100);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-[1600px] px-4 xl:px-10 py-3 overflow-y-auto flex flex-col items-center justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Ejecución Presupuestal 2026" dot="#3B82F6" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-muted text-base xl:text-lg">
            Ejecución de proyectos DEE — corte {fmtCortePresupuesto(d.ultimaActualizacion)}
          </p>
        </div>

        {/* Apropiación total */}
        <div className="text-center">
          <p className="text-theme-muted text-lg xl:text-xl uppercase tracking-[0.2em] font-medium mb-1">
            Apropiación Pptal DEE
          </p>
          <div className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-theme-primary leading-none">
            {fmtFull(apropiacion)}
          </div>
        </div>

        {/* Barra visual apilada */}
        <div className="w-full max-w-4xl">
          <div className="h-4 xl:h-5 bg-theme-tertiary rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pct_obligado}%` }}
              title={`Obligado (legalizado): ${pct_obligado.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-1000 relative group cursor-pointer shrink-0"
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
            <span className="text-theme-primary font-semibold">
              {pct_comprometido.toFixed(2)}% Comp. ({pct_obligado.toFixed(1)}% obl.)
            </span>
            <span className="text-slate-500">
              {pctDisp.toFixed(2)}% Disponible
            </span>
          </div>
        </div>

        {/* SemiGauges */}
        <div className="flex justify-around w-full max-w-3xl">
          <SemiGauge rawValue={pct_comprometido} label="% Comprometido" color="energia" size="xl" delay={0.3} />
          <SemiGauge rawValue={pct_obligado} label="% Obligado" color="energia" size="xl" delay={0.4} />
        </div>

        <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400">
          Del total apropiado, el <strong className="text-title-energia">{pct_comprometido.toFixed(1)}%</strong> ya está comprometido y el{" "}
          <strong className="text-title-energia">{pct_obligado.toFixed(1)}%</strong> obligado (legalizado) — quedan{" "}
          <strong className="text-title-energia">{fmtFull(montoDisponible)}</strong> sin comprometer para lo que resta del año.
        </p>
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

  // Hallazgo: departamento que concentra más comunidades energéticas implementadas.
  const deptTop = useMemo(() => {
    if (!depts || depts.length === 0 || !d.implementadas) return null;
    const top = depts.slice().sort((a, b) => b.count - a.count)[0];
    return { nombre: top.name, pct: (top.count / d.implementadas) * 100 };
  }, [depts, d.implementadas]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-[1600px] px-4 xl:px-10 py-3 overflow-y-auto flex flex-col items-center justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Comunidades Energéticas" dot="#3B82F6" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-muted text-base xl:text-lg">
            Transición energética · Acceso a energía limpia
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 w-full gap-3">
          <KpiBlock
            label="CE Implementadas"
            value={fmtNum(d.implementadas)}
            unit="Comunidades"
            valueClass="text-theme-primary"
          />
          <KpiBlock
            label="Inversión Estimada"
            value={fmtFull(d.inversionEstimada)}
            unit="En proyectos activos"
            valueClass="text-chart-teal"
            valueSizeClass="text-2xl xl:text-3xl 2xl:text-4xl"
          />
          <KpiBlock
            label="Capacidad Instalada"
            value={Math.round(d.capacidadKwp).toLocaleString("es-CO")}
            unit="kWp instalados"
            valueClass="text-theme-secondary"
          />
        </motion.div>

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
                colors={["#3B82F6", "#14B8A6"]}
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
                    <strong>{indexValue}</strong> — {id}: <strong style={{ color: id === "CEs" ? "#3B82F6" : "#14B8A6" }}>{value}</strong>
                  </div>
                )}
              />
            ) : (
              <SkeletonBlock className="h-full w-full" />
            )}
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {[{ label: "N° CEs", c: "#3B82F6" }, { label: "kWp instalados ÷10", c: "#14B8A6" }].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {deptTop && (
          <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400">
            <strong className="text-title-energia">{deptTop.nombre}</strong> concentra el{" "}
            <strong className="text-title-energia">{deptTop.pct.toFixed(0)}%</strong> de las comunidades energéticas implementadas en el país.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Slide 4: Contratos OR ─────────────────────────────────────────────────────
function SlideContratosOR({ d }: { d: HomeSliderProps["orData"] }) {
  // Hallazgo: mayor brecha entre los 3 frentes de avance — señal de qué podría retrasar el cierre.
  const avances = [
    { label: "financiero", valor: d.avanceFinanciero },
    { label: "físico", valor: d.avanceFisico },
    { label: "documental", valor: d.avanceGeneral },
  ];
  const avanceMax = avances.reduce((a, b) => (b.valor > a.valor ? b : a));
  const avanceMin = avances.reduce((a, b) => (b.valor < a.valor ? b : a));

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-[1600px] px-4 xl:px-10 py-3 overflow-y-auto flex flex-col items-center justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Contratos OR 2025" dot="#3B82F6" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-muted text-base xl:text-lg">
            Obras de Reconexión · Energía Rural Colombiana
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 w-full gap-3">
          <KpiBlock
            label="Contratos Activos"
            value={fmtNum(d.nContratos)}
            valueClass="text-theme-primary"
          />
          <KpiBlock
            label="Usuarios Beneficiados"
            value={fmtNum(d.nUsuarios)}
            unit="hogares"
            valueClass="text-chart-teal"
          />
          <KpiBlock
            label="N° Comunidades"
            value={fmtNum(d.nCEs)}
            unit="CEs beneficiadas"
            valueClass="text-theme-secondary"
          />
        </motion.div>

        {/* SemiGauges */}
        <div className="flex justify-around w-full max-w-3xl">
          <SemiGauge rawValue={d.avanceFinanciero} label="Avance Financiero" color="energia" size="xl" delay={0.3} />
          <SemiGauge rawValue={d.avanceFisico} label="Avance Físico" color="energia" size="xl" delay={0.35} />
          <SemiGauge rawValue={d.avanceGeneral} label="Avance Documental" color="energia" size="xl" delay={0.4} />
        </div>

        {avanceMax.valor > avanceMin.valor && (
          <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400">
            El avance <strong className="text-title-energia">{avanceMin.label}</strong> ({avanceMin.valor.toFixed(1)}%) va muy por detrás del{" "}
            <strong className="text-title-energia">{avanceMax.label}</strong> ({avanceMax.valor.toFixed(1)}%) — una brecha de{" "}
            <strong className="text-title-energia">{(avanceMax.valor - avanceMin.valor).toFixed(1)} puntos</strong> que podría retrasar el cierre de los contratos.
          </p>
        )}
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
      color: "#14B8A6",
      data: anios.map(a => ({ x: String(a), y: +(historicoPorAnio[a].asignado / 1e9).toFixed(1) })),
    },
    {
      id: "Pagado",
      color: "#10B981",
      data: anios.map(a => ({ x: String(a), y: +(historicoPorAnio[a].pagado / 1e9).toFixed(1) })),
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-portal-gradient overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-[1600px] px-4 xl:px-10 py-3 overflow-y-auto flex flex-col items-center justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Subsidios Energéticos" dot="#3B82F6" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-theme-muted text-base xl:text-lg">
            Seguimiento a la deuda del fondo de subsidios — corte {d.ultimaActualizacion ?? "1 de abril 2026"}
          </p>
        </div>

        {/* Fila superior: APROPIADO 2026, ASIGNADO 2026, DISPONIBLE 2026 */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 w-full gap-3">
          <KpiBlock
            label="APROPIADO 2026"
            value={fmtFull(totalApropiado)}
            valueClass="text-theme-primary"
            valueSizeClass="text-2xl xl:text-3xl 2xl:text-4xl"
          />
          <KpiBlock
            label="COMPROMETIDO EN RESOLUCIONES 2026"
            value={fmtFull(asig)}
            valueClass="text-chart-teal"
            valueSizeClass="text-2xl xl:text-3xl 2xl:text-4xl"
          />
          <KpiBlock
            label="DISPONIBLE 2026"
            value={fmtFull(totalDisponible)}
            valueClass="text-theme-secondary"
            valueSizeClass="text-2xl xl:text-3xl 2xl:text-4xl"
          />
        </motion.div>

        {/* Fila inferior: RESOLUCIONES 2026 y PENDIENTE DE PAGO 2026 */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 w-full gap-3">
          <KpiBlock
            label="RESOLUCIONES 2026"
            value={fmtNum(d.anio2026.resoluciones)}
            unit="expedidas"
            valueClass="text-theme-secondary"
          />
          {/* KPI Pendiente de pago 2026 con barra de porcentaje integrada - mismo estilo que KpiBlock */}
          <div className="flex flex-col items-center justify-center text-center gap-0.5 px-2 py-2 bg-card-glow-energia border border-card-energia rounded-xl">
            <p className="text-theme-muted text-xs xl:text-sm uppercase tracking-[0.14em] font-semibold">
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
              <div className="flex justify-between mt-1 text-xs xl:text-sm font-medium">
                <span className="text-emerald-400">{pctPag.toFixed(2)}% Pagado</span>
                <span className="text-red-400">{pctPend.toFixed(2)}% Pendiente</span>
              </div>
            </div>
          </div>
        </motion.div>

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
                    colors={["#3B82F6", "#14B8A6"]}
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
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: id === "Subsidios" ? "#3B82F6" : "#14B8A6" }} />
                              <span>{id}</span>
                            </div>
                            <strong style={{ color: id === "Subsidios" ? "#3B82F6" : "#14B8A6" }}>{fmtCOP(exacto || 0)}</strong>
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

        {asig > 0 && (
          <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400">
            Del total comprometido en resoluciones 2026, el <strong className="text-title-energia">{pctPag.toFixed(1)}%</strong> ya está pagado —
            quedan <strong className="text-title-energia">{fmtFull(pend)}</strong> pendientes de desembolso por parte del Ministerio de Hacienda y Crédito Público.
          </p>
        )}
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
  const title = news.titulo ?? news.title ?? "Noticia del sector energético";
  const imageUrl = news.imagen ?? news.image ?? null;
  const isEnergia = tag !== "HIDROCARBUROS";

  return (
    <div className="relative w-full h-full flex items-center bg-portal-gradient overflow-hidden">
      <TopAccent color={isEnergia ? "#3B82F6" : "#D97706"} />
      <div className={`absolute inset-0 bg-gradient-to-br ${isEnergia ? "from-blue-900/20" : "from-amber-900/20"} via-transparent to-slate-900/10 pointer-events-none`} />

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
            {tag && <CategoryTag category={isEnergia ? "energia" : "hidrocarburos"} size="md" />}
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
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full transition-all text-lg xl:text-xl font-semibold border ${
                isEnergia
                  ? "bg-blue-500/10 border-blue-500/30 text-title-energia hover:bg-blue-500/20 hover:border-blue-500/60"
                  : "bg-amber-500/10 border-amber-500/30 text-title-hidrocarburos hover:bg-amber-500/20 hover:border-amber-500/60"
              }`}
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
  { id: "reservas-embalses", label: "Reservas y Embalses", color: "#3B82F6", href: "/energia/predicciones" },
  { id: "precio-generacion", label: "Precio y Generación", color: "#3B82F6", href: "/energia"             },
  { id: "termica",     label: "Térmica",     color: "#3B82F6", href: "/energia"      },
  { id: "presupuesto", label: "Presupuesto", color: "#3B82F6", href: "/presupuesto"  },
  { id: "comunidades", label: "Comunidades", color: "#3B82F6", href: "/comunidades"  },
  { id: "contratos",   label: "Contratos OR",color: "#3B82F6", href: "/contratos-or" },
  { id: "supervision", label: "Supervisión", color: "#3B82F6", href: "/supervision"  },
  { id: "subsidios",   label: "Subsidios",   color: "#3B82F6", href: "/subsidios"    },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HomeSlider(props: HomeSliderProps) {
  const { sectorData, sectorDetalle, termicaData, presuData, cemData, cemDepts, orData, supData, subData, deficitFssri, deficitSeries, subBarData, hidroPresuData, hidroProdData } = props;

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
  } = useHomeSlider(2); // 2 slides fijos de Hidrocarburos (Presupuesto + Producción/WTI-BRENT).
  // NOTE: Slides de Redes Sociales X suspendidos temporalmente.
  // Motivo: X (Twitter) bloquea embeds gratuitos con HTTP 429.
  // Reactivar cuando haya presupuesto para API paga (TwitterAPI.io ~$10-20/mes).
  // Para reactivar: cambiar useHomeSlider(2) → useHomeSlider(5) y descomentar
  // los dots y renderSlide de redes sociales más abajo.

  // Render slide content
  function renderSlide(idx: number) {
    if (idx === 0) return <SlideReservasEmbalses d={sectorData} />;
    if (idx === 1) return <SlidePrecioGeneracion d={sectorData} detalle={sectorDetalle} />;
    if (idx === 2) {
      if (!termicaData) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-portal-gradient px-6 xl:px-10">
            <div className="w-full max-w-[1600px] flex flex-col items-center gap-2 xl:gap-4">
              <div className="flex flex-col items-center gap-2">
                <SkeletonBlock className="h-6 w-64" />
                <SkeletonBlock className="h-3 w-48" />
              </div>
              <div className="grid grid-cols-3 gap-3 w-full">
                <SkeletonKpiCard />
                <SkeletonKpiCard />
                <SkeletonKpiCard />
              </div>
              <div className="grid grid-cols-3 gap-3 xl:gap-4 w-full">
                <SkeletonChart heightClass="h-[20vh]" />
                <SkeletonChart heightClass="h-[20vh]" />
                <SkeletonChart heightClass="h-[20vh]" />
              </div>
            </div>
          </div>
        );
      }
      return <SlideGeneracionTermica d={termicaData} detalle={sectorDetalle} />;
    }
    if (idx === 3) return <SlidePresupuesto d={presuData} />;
    if (idx === 4) return <SlideComunidades d={cemData} depts={cemDepts} />;
    if (idx === 5) return <SlideContratosOR d={orData} />;
    if (idx === 6) return <SlideSupervision d={supData} />;
    if (idx === 7) return <SlideSubsidios d={subData} deficitFssri={deficitFssri} deficitSeries={deficitSeries} subBarData={subBarData} />;
    const newsIdx = idx - 8;
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
    const hydroIdx = idx - (8 + news.length);
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
    // Slides fijos de Hidrocarburos (después de las noticias de hidrocarburos)
    const hidroBaseIdx = 8 + news.length + hydroNews.length;
    if (idx === hidroBaseIdx) return <SlideHidrocarburosPresupuesto d={hidroPresuData} />;
    if (idx === hidroBaseIdx + 1) return <SlideHidrocarburosProduccion d={hidroProdData} />;
    // ── SUSPENDIDO: Slides de Redes Sociales X ──
    // const redesIdx = idx - (6 + news.length);
    // if (redesIdx >= 0 && redesIdx <= 2) {
    //   const start = redesIdx * 3;
    //   return <SlideRedesX accounts={ALL_X_ACCOUNTS.slice(start, start + 3)} />;
    // }
    // Para reactivar: descomentar el bloque de arriba y cambiar useHomeSlider(2) → (5)
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
    { id: "hidro-presupuesto", label: "Presupuesto Hidrocarburos", color: "#D97706" },
    { id: "hidro-produccion", label: "Producción Hidrocarburos", color: "#D97706" },
    // ── SUSPENDIDO: Dots de Redes Sociales X ──
    // { id: "redes-x-1", label: "Redes 1", color: "#1DA1F2" },
    // { id: "redes-x-2", label: "Redes 2", color: "#1DA1F2" },
    // { id: "redes-x-3", label: "Redes 3", color: "#1DA1F2" },
  ];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "calc(100vh - var(--header-height, 5rem))" }}
      aria-label="Carrusel de indicadores clave del sector energético"
    >
      {/* Informes XM — visible en todos los slides */}
      <div className="absolute top-5 left-5 xl:top-6 xl:left-6 z-30 pointer-events-auto">
        <InformesDiariosSlider />
      </div>

      {/* ── Slides ── */}
      {/* pb reservado para que el contenido de ningún slide quede tapado por
          la barra de progreso + botón de reproducir/pausar, que flotan fijos
          al fondo (~96-112px) sobre el mismo contenedor. */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`slide-${current}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 pb-24 xl:pb-28"
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

        {/* Play/pause manual */}
        <div className="flex items-center justify-center mb-3">
          <button
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}
            className="w-8 h-8 xl:w-9 xl:h-9 flex items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/60 hover:bg-black/60 hover:border-white/20 hover:text-white transition-all duration-200 backdrop-blur-sm"
          >
            {paused ? (
              <svg className="w-3.5 h-3.5 xl:w-4 xl:h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 xl:w-4 xl:h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </button>
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
