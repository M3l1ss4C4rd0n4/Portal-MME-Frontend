"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import SemiGauge from "@/components/ui/SemiGauge";
import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { useHomeSlider } from "@/hooks/useHomeSlider";

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
      dailyActualGwh?: number | null;
      dailyHistGwh?: number | null;
    };
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
  };
  sectorDetalle?: {
    generacionPorFuente: Array<{ id: string; label: string; value: number; color: string; generacionGwh: number }>;
    precioBolsaSeries: Array<{ id: string; color: string; data: Array<{ x: string; y: number; fecha?: Date }> }>;
    embalsesPromedio: number;
    embalses: Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh: number }>;
    aportesRios: Array<{ codigo: string; nombre: string; actualGwh: number; historicoGwh: number; porcentaje: number }>;
    sparklines: { embalses: Array<{ x: string; y: number }>; aportes: Array<{ x: string; y: number }> };
  };
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
    avanceFisicoActivos: number;
    avanceFinancieroActivos: number;
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
const SLIDE_INTERVAL_MS = 8000;

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
  label, value, unit, date, valueClass = "text-amber-400", large = false,
  chipLabel, chipColor, tendencia, metrica,
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
}) {
  // Calcular tamaño dinámico basado en longitud del valor
  const strLen = typeof value === 'string' || typeof value === 'number' ? String(value).length : 12;
  let fontClass: string;
  
  if (large) {
    // Tamaños aumentados cuando large=true
    if (strLen <= 8) {
      fontClass = "text-5xl xl:text-6xl 2xl:text-7xl";
    } else if (strLen <= 12) {
      fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";
    } else if (strLen <= 18) {
      fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
    } else {
      fontClass = "text-xl xl:text-2xl 2xl:text-3xl";
    }
  } else {
    // Tamaños normales
    if (strLen <= 8) {
      fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";
    } else if (strLen <= 12) {
      fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
    } else if (strLen <= 18) {
      fontClass = "text-2xl xl:text-3xl 2xl:text-4xl";
    } else {
      fontClass = "text-lg xl:text-xl 2xl:text-2xl";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-4">
      <p className="text-slate-400 text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium">
        {label}
      </p>
      <div
        className={`inline-flex items-center gap-2 font-black leading-none break-all ${valueClass} ${fontClass}`}
        style={tendencia && tendencia.label !== "S/D" ? { color: getTrendColor(tendencia, metrica ?? "valor") } : undefined}
      >
        {value}
        <TrendArrow tendencia={tendencia} metrica={metrica} />
      </div>
      {(unit || date) && (
        <p className="text-slate-400 text-xs xl:text-sm 2xl:text-base mt-0.5">
          {unit}
          {unit && date && " · "}
          {date && `Dato: ${date}`}
        </p>
      )}
      <TrendBadge tendencia={tendencia} metrica={metrica} />
      {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} />}
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
      <span className="text-amber-400 font-black tracking-[0.3em] text-xl xl:text-2xl 2xl:text-3xl uppercase">
        {label}
      </span>
    </div>
  );
}

// ─── Tema Nivo para slider oscuro ─────────────────────────────────────────────
const NIVO_SLIDER = {
  background: "transparent" as const,
  text: { fill: "#94A3B8", fontSize: 10 },
  tooltip: {
    container: {
      background: "#1E293B",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#E2E8F0",
      fontSize: "12px",
    },
  },
  grid: { line: { stroke: "#1A2740", strokeWidth: 1 } },
  axis: {
    domain: { line: { stroke: "#2A3D5A" } },
    ticks: {
      line: { stroke: "#2A3D5A" },
      text: { fill: "#64748B", fontSize: 9 },
    },
    legend: { text: { fill: "#94A3B8", fontSize: 9 } },
  },
};

// ─── Helpers de estado por métrica ────────────────────────────────────────────
function estadoReservas(pct: number) {
  if (pct >= 80) return { label: "NORMAL",             color: "#22C55E", tw: "text-emerald-400" };
  if (pct >= 70) return { label: "ESTABLE",            color: "#06B6D4", tw: "text-cyan-400"    };
  if (pct >= 60) return { label: "ALERTA TEMPRANA",    color: "#F59E0B", tw: "text-amber-400"   };
  if (pct >= 50) return { label: "ALERTA ALTA",        color: "#F97316", tw: "text-orange-400"  };
  return           { label: "CRÍTICO",                 color: "#EF4444", tw: "text-red-400"     };
}
function estadoAportes(pct: number) {
  if (pct >= 120) return { label: "MUY FAVORABLE",     color: "#22C55E" };
  if (pct >= 100) return { label: "NORMAL",            color: "#06B6D4" };
  if (pct >= 90)  return { label: "VIGILANCIA",        color: "#F59E0B" };
  if (pct >= 70)  return { label: "DÉFICIT HÍDRICO",   color: "#F97316" };
  return            { label: "CRÍTICO — SEQUÍA",       color: "#EF4444" };
}
function estadoPrecio(precio: number) {
  if (precio < 200) return { label: "CÓMODO",          color: "#22C55E" };
  if (precio < 300) return { label: "ESTRÉS MODERADO", color: "#F59E0B" };
  if (precio < 400) return { label: "ALERTA",          color: "#F97316" };
  return              { label: "CRISIS ENERGÉTICA",    color: "#EF4444" };
}

const _GEN_PRIO: Record<string, number> = {
  "CRISIS ENERGÉTICA": 4, "CRÍTICO": 4,
  "ALERTA": 3,
  "ESTRÉS MODERADO": 2, "ALERTA MEDIA": 2,
  "VIGILANCIA": 1,
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
  precio: number
): { label: string; color: string } {
  const all: Array<{ label: string; color: string }> = [];
  const stPr = estadoPrecio(precio);
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

function diagnosticoSIN(reservasPct: number, aportesPct: number | null, precio: number): string {
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

// ─── StatusChip: sub-ficha de estado ──────────────────────────────────────────
function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] xl:text-xs font-bold tracking-wider uppercase"
      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
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
}) {
  const fmt = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  // Usar el mismo tamaño que KpiBlock para uniformidad
  const fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";
  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-3">
      <p className="text-slate-400 text-base xl:text-lg 2xl:text-xl uppercase tracking-[0.18em] font-medium">
        {label}
      </p>
      <div
        className={`inline-flex items-center gap-2 ${fontClass} font-black leading-none ${pctColor}`}
        style={tendencia && tendencia.label !== "S/D" ? { color: getTrendColor(tendencia, metrica ?? "valor") } : undefined}
      >
        {pct.toFixed(2)}%
        <TrendArrow tendencia={tendencia} metrica={metrica} />
      </div>
      {gwh != null && (
        <p className="text-slate-300 text-xs xl:text-sm font-semibold mt-0.5">
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
      <TrendBadge tendencia={tendencia} metrica={metrica} />
      {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} />}
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
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reservas y Aportes · Estado Actual</p>
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
  const hasDetalle = !!detalle && detalle.generacionPorFuente.length > 0;
  const hasPrecioSeries = !!detalle && detalle.precioBolsaSeries.length > 0 && detalle.precioBolsaSeries[0].data.length > 0;
  const aportes = d.aportesHidricos;
  const aportesPct = aportes?.pct ?? (aportes && aportes.historicoGwh > 0 ? (aportes.actualGwh / aportes.historicoGwh) * 100 : null);

  const stRes = estadoReservas(d.pctEmbalses);
  const stAp  = aportesPct !== null ? estadoAportes(aportesPct) : null;
  const stPr  = estadoPrecio(d.precioBolsa);
  const stGen = estadoGeneracion(
    detalle?.generacionPorFuente,
    d.generacionGwh,
    aportes?.dailyActualGwh,
    d.precioBolsa
  );
  const diagnostico = diagnosticoSIN(d.pctEmbalses, aportesPct, d.precioBolsa);

  const aportesColor = aportesPct === null ? "text-slate-400"
    : aportesPct >= 100 ? "text-emerald-400"
    : aportesPct >= 80  ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-amber-900/15 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-7xl px-6 xl:px-8 gap-4 xl:gap-6">
        {/* Header con diagnóstico dinámico */}
        <div className="text-center">
          <SectionBadge label="Gestión del Sector" pulse dot="#EF4444" />
          <p className="text-slate-300 text-sm xl:text-base font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-xs xl:text-sm mt-0.5">
            {d.ultimaEjecucionETL
              ? `ETL sector energético · última ejecución: ${d.ultimaEjecucionETL}`
              : d.ultimaActualizacion
              ? `Datos en tiempo real de XM · últimos datos: ${d.ultimaActualizacion}`
              : "Datos en tiempo real de XM"}
          </p>
        </div>

        {/* KPIs — 4 columnas */}
        <div className="grid grid-cols-4 w-full divide-x divide-white/5">
          <KpiBlock
            label="Precio de Bolsa (PPP)"
            value={`$${d.precioBolsa.toFixed(2)}`}
            unit="COP/kWh"
            date={d.fechaPrecio}
            valueClass="text-amber-400"
            chipLabel={stPr.label}
            chipColor={stPr.color}
            tendencia={d.tendencias?.precio}
            metrica="precio"
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
            />
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-slate-600 text-sm">Sin datos</p>
            </div>
          )}
        </div>

        {/* Gráficos — 3 columnas: Precio | Generación | Aportes */}
        {hasDetalle && (
          <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-3 xl:gap-4">
            {/* Precio de Bolsa (PPP) - Línea */}
            {hasPrecioSeries && (
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Precio de Bolsa (PPP) · Tendencia</p>
                <div className="h-[120px] xl:h-[140px]">
                  <ResponsiveLine
                    data={detalle!.precioBolsaSeries}
                    theme={NIVO_SLIDER}
                    margin={{ top: 6, right: 12, bottom: 28, left: 36 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: "auto", max: "auto" }}
                    curve="catmullRom"
                    enablePoints={false}
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 6,
                      tickRotation: 0,
                      tickValues: "every 4 days",
                      format: (value) => {
                        const dataPoint = detalle!.precioBolsaSeries[0]?.data.find(d => d.x === value);
                        if (dataPoint?.fecha) {
                          return String(new Date(dataPoint.fecha).getDate());
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
                        <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                          {fecha}: <strong className="text-amber-400">${Number(point.data.y).toFixed(2)}</strong>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            {/* Generación por Fuente - Donut */}
            <div className="flex flex-col items-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 self-start">Generación por Fuente</p>
              <div className="relative h-[120px] xl:h-[140px] w-full">
                <ResponsivePie
                  data={detalle!.generacionPorFuente}
                  theme={NIVO_SLIDER}
                  margin={{ top: 4, right: 35, bottom: 4, left: 4 }}
                  innerRadius={0.65}
                  padAngle={2}
                  cornerRadius={3}
                  activeOuterRadiusOffset={5}
                  colors={{ datum: "data.color" }}
                  borderWidth={0}
                  enableArcLinkLabels={false}
                  arcLabelsSkipAngle={12}
                  arcLabelsTextColor="#fff"
                  arcLabelsRadiusOffset={0.75}
                  legends={[
                    {
                      anchor: "right" as const,
                      direction: "column" as const,
                      justify: false,
                      translateX: 30,
                      translateY: 0,
                      itemsSpacing: 3,
                      itemWidth: 60,
                      itemHeight: 12,
                      itemTextColor: "#94A3B8",
                      itemDirection: "left-to-right" as const,
                      symbolSize: 7,
                      symbolShape: "circle" as const,
                    },
                  ]}
                  tooltip={({ datum }) => (
                    <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                      {datum.label}: <strong>{datum.value}%</strong>
                    </div>
                  )}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-12">
                  <span className="text-base xl:text-lg font-bold text-white leading-none">{d.generacionGwh.toFixed(1)}</span>
                  <span className="text-[9px] text-slate-400">GWh</span>
                </div>
              </div>
            </div>

            {/* Hidrología: Aportes (izq) + Embalses (der) — top 12 cada uno */}
            {detalle?.aportesRios && detalle.aportesRios.length > 0 && (
              <div className="flex flex-col h-[120px] xl:h-[140px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Hidrología · Aportes y Embalses</p>
                <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
                  {/* Izquierda — Aportes */}
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Aportes · vs Hist.</p>
                    <div className="space-y-[1px]">
                      {detalle.aportesRios.slice(0, 15).map((rio) => {
                        const maxVal = Math.max(rio.actualGwh, rio.historicoGwh);
                        const pct = rio.porcentaje;
                        const pctColor = pct >= 100 ? "text-emerald-400" : pct >= 80 ? "text-amber-400" : "text-red-400";
                        const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
                        return (
                          <div key={rio.codigo} className="flex items-center gap-1 text-[9px] leading-none py-[1px]">
                            <span className="w-12 text-right text-slate-400 truncate" title={rio.nombre}>{rio.nombre}</span>
                            <div className="w-12 h-1.5 bg-slate-700/40 rounded-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 h-full bg-slate-600/30 rounded-sm" style={{ width: `${Math.min((rio.historicoGwh / maxVal) * 100, 100)}%` }} />
                              <div className={`absolute top-0 left-0 h-full ${barColor} rounded-sm`} style={{ width: `${Math.min((rio.actualGwh / maxVal) * 100, 100)}%` }} />
                            </div>
                            <span className={`w-5 text-right font-medium ${pctColor}`}>{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Derecha — Embalses críticos */}
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Embalses · % Actual</p>
                    <div className="space-y-[1px]">
                      {detalle.embalses
                        ?.slice()
                        .sort((a, b) => b.capacidadGwh - a.capacidadGwh)
                        .slice(0, 15)
                        .map((emb) => {
                          const embColor = emb.porcentaje < 50 ? "bg-red-500" : emb.porcentaje < 60 ? "bg-orange-500" : emb.porcentaje < 70 ? "bg-amber-500" : emb.porcentaje < 80 ? "bg-cyan-500" : "bg-emerald-500";
                          return (
                            <div key={emb.codigo} className="flex items-center gap-1 text-[9px] leading-none py-[1px]">
                              <span className="w-12 text-right text-slate-400 truncate" title={emb.nombre}>{emb.nombre}</span>
                              <div className="w-12 h-1.5 bg-slate-700/40 rounded-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 h-full ${embColor} rounded-sm`} style={{ width: `${Math.min(emb.porcentaje, 100)}%` }} />
                              </div>
                              <span className="w-5 text-right font-medium text-slate-300">{emb.porcentaje.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#F59E0B" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Ejecución Presupuestal 2026" dot="#F59E0B" />
          <p className="text-slate-500 text-base xl:text-lg">
            Ejecución de proyectos DEE — corte {d.ultimaActualizacion ?? "1 de abril de 2026"}
          </p>
        </div>

        {/* Apropiación total */}
        <div className="text-center">
          <p className="text-slate-400 text-lg xl:text-xl uppercase tracking-[0.2em] font-medium mb-1">
            Apropiación Pptal DEE
          </p>
          <div className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-amber-400 leading-none">
            {fmtFull(apropiacion)}
          </div>
        </div>

        {/* Barra visual apilada */}
        <div className="w-full max-w-4xl">
          <div className="h-4 xl:h-5 bg-slate-800 rounded-full overflow-hidden flex">
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
            <span className="text-amber-400 font-semibold">
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#10B981" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/15 via-transparent to-teal-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Comunidades Energéticas" dot="#10B981" />
          <p className="text-slate-500 text-base xl:text-lg">
            Transición energética · Acceso a energía limpia
          </p>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-white/5">
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
            valueClass="text-amber-400"
          />
          <KpiBlock
            label="Capacidad Instalada"
            value={Math.round(d.capacidadKwp).toLocaleString("es-CO")}
            unit="kWp instalados"
            valueClass="text-teal-400"
          />
        </div>

        <div className="w-full max-w-3xl">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
            CEs por departamento (Top 12)
          </p>
          <div className="h-[220px]">
            {barData.length > 0 ? (
              <ResponsiveBar
                data={barData}
                keys={["CEs", "kWp (÷10)"]}
                indexBy="dept"
                theme={NIVO_SLIDER}
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
                  <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#8B5CF6" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 via-transparent to-violet-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Contratos OR 2025" dot="#8B5CF6" />
          <p className="text-slate-500 text-base xl:text-lg">
            Obras de Reconexión · Energía Rural Colombiana
          </p>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-white/5">
          <KpiBlock
            label="Contratos Activos"
            value={fmtNum(d.nContratos)}
            valueClass="text-purple-400"
          />
          <KpiBlock
            label="Usuarios Beneficiados"
            value={fmtNum(d.nUsuarios)}
            unit="hogares"
            valueClass="text-amber-400"
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

// ─── Slide 5: Supervisión ──────────────────────────────────────────────────────
function SlideSupervision({ d }: { d: HomeSliderProps["supData"] }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#06B6D4" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Supervisión" dot="#06B6D4" />
          <p className="text-slate-500 text-base xl:text-lg">
            Monitoreo y seguimiento de contratos activos
          </p>
        </div>

        {(() => {
          const tot = d.nContratos || 1;
          const pct = (n: number) => `${((n / tot) * 100).toFixed(1)}%`;
          return (
            <div className="grid grid-cols-6 w-full divide-x divide-white/5">
              <KpiBlock label="Contratos"       value={fmtNum(d.nContratos)}          valueClass="text-cyan-400"    unit="total portafolio" />
              <KpiBlock label="En Ejecución"    value={fmtNum(d.enEjecucion)}         valueClass="text-emerald-400" unit={pct(d.enEjecucion)} />
              <KpiBlock label="AOM"             value={fmtNum(d.enAOM)}               valueClass="text-teal-400"    unit={pct(d.enAOM)} />
              <KpiBlock label="En Liquidación"  value={fmtNum(d.enLiquidacion)}       valueClass="text-amber-400"   unit={pct(d.enLiquidacion)} />
              <KpiBlock label="Liquidados"      value={fmtNum(d.liquidados)}          valueClass="text-slate-300"   unit={pct(d.liquidados)} />
              <KpiBlock label="Perdida Comp."   value={fmtNum(d.perdidaCompetencia)}  valueClass="text-rose-400"    unit={pct(d.perdidaCompetencia)} />
            </div>
          );
        })()}

        {/* Gauges: portafolio total + solo activos + Donut */}
        <div className="flex justify-center items-end w-full gap-4 xl:gap-8">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-widest">Portafolio</span>
            <div className="flex gap-4">
              <SemiGauge rawValue={d.avanceFisico}     label="Físico"     color="success" size="lg" delay={0.3} />
              <SemiGauge rawValue={d.avanceFinanciero} label="Financiero" color="success" size="lg" delay={0.35} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-cyan-400/60 uppercase tracking-widest">En Ejecución</span>
            <div className="flex gap-4">
              <SemiGauge rawValue={d.avanceFisicoActivos}     label="Físico"     color="gold" size="lg" delay={0.4} />
              <SemiGauge rawValue={d.avanceFinancieroActivos} label="Financiero" color="gold" size="lg" delay={0.45} />
            </div>
          </div>
          {/* Donut Contratos por Fondo */}
          <div className="w-[340px] h-[160px] relative">
            {d.porFondo.length > 0 ? (
              <>
                <ResponsivePie
                  data={d.porFondo.slice(0, 6).map((f, i) => ({
                    id: f.fondo,
                    label: f.fondo,
                    value: f.contratos,
                    color: ['#F59E0B', '#8B5CF6', '#06B6D4', '#22C55E', '#EF4444', '#F97316'][i],
                  }))}
                  theme={NIVO_SLIDER}
                  margin={{ top: 6, right: 90, bottom: 6, left: 6 }}
                  innerRadius={0.55}
                  padAngle={2}
                  cornerRadius={3}
                  activeOuterRadiusOffset={5}
                  colors={{ datum: "data.color" }}
                  borderWidth={0}
                  enableArcLinkLabels={false}
                  arcLabelsSkipAngle={12}
                  arcLabelsTextColor="#fff"
                  arcLabelsRadiusOffset={0.75}
                  legends={[
                    {
                      anchor: "right",
                      direction: "column",
                      justify: false,
                      translateX: 80,
                      translateY: 0,
                      itemsSpacing: 5,
                      itemWidth: 80,
                      itemHeight: 16,
                      itemTextColor: "#94A3B8",
                      itemDirection: "left-to-right",
                      symbolSize: 8,
                      symbolShape: "circle",
                    },
                  ]}
                  tooltip={({ datum }) => (
                    <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                      {datum.label}: <strong>{datum.value}</strong>
                    </div>
                  )}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingRight: 90 }}>
                  <span className="text-xl font-bold text-white leading-none">{d.nContratos}</span>
                  <span className="text-[9px] text-slate-400">total</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-slate-500 text-sm">Cargando…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 6: Subsidios ────────────────────────────────────────────────────────
function SlideSubsidios({ d, deficitFssri, deficitSeries, subBarData }: { d: HomeSliderProps["subData"]; deficitFssri?: number; deficitSeries?: Array<{ x: string; y: number }>; subBarData?: Array<{ anio: string; Subsidios: number; Contribuciones: number }>; }) {
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#EF4444" />
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/15 via-transparent to-rose-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Subsidios Energéticos" dot="#EF4444" />
          <p className="text-slate-500 text-base xl:text-lg">
            Seguimiento a la deuda del fondo de subsidios — corte {d.ultimaActualizacion ?? "1 de abril 2026"}
          </p>
        </div>

        {/* Fila superior: APROPIADO 2026, ASIGNADO 2026, DISPONIBLE 2026 */}
        <div className="grid grid-cols-3 w-full divide-x divide-white/5">
          <KpiBlock
            label="APROPIADO 2026"
            value={fmtFull(totalApropiado)}
            valueClass="text-slate-200"
          />
          <KpiBlock
            label="ASIGNADO 2026"
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
        <div className="grid grid-cols-2 w-full divide-x divide-white/5">
          <KpiBlock
            label="RESOLUCIONES 2026"
            value={fmtNum(d.anio2026.resoluciones)}
            unit="expedidas"
            valueClass="text-amber-400"
          />
          {/* KPI Pendiente de pago 2026 con barra de porcentaje integrada - mismo estilo que KpiBlock */}
          <div className="flex flex-col items-center justify-center text-center gap-0.5 px-4">
            <p className="text-slate-400 text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium">
              PENDIENTE DE PAGO 2026
            </p>
            <div className="inline-flex items-center gap-2 font-black leading-none text-xl xl:text-2xl 2xl:text-3xl text-red-400">
              {fmtFull(pend)}
              <span className="relative group cursor-help text-base xl:text-lg leading-none">
                *
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Pendiente de desembolso por parte del Ministerio de Hacienda y Crédito Público
                </span>
              </span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full max-w-[280px] mt-2">
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
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
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
                  Subsidios (SIN+ZNI) y Contribuciones por Año
                </p>
                <div className="h-[150px]">
                  <ResponsiveBar
                    data={subBarData}
                    keys={["Subsidios", "Contribuciones"]}
                    indexBy="anio"
                    theme={NIVO_SLIDER}
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
                        itemTextColor: "#94A3B8",
                        itemDirection: "left-to-right" as const,
                        symbolSize: 8,
                        symbolShape: "circle" as const,
                      },
                    ]}
                    tooltip={({ id, indexValue, data }) => {
                      const exacto = ((data as unknown) as Record<string, number>)[`${id}_exacto`];
                      return (
                        <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 min-w-[200px]">
                          <p className="font-semibold mb-1 text-slate-300">Año {indexValue}</p>
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
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
                  Déficit acumulado FSSRI (Miles M$)
                </p>
                <div className="h-[150px]">
                  <ResponsiveLine
                    data={[{ id: "Déficit Acumulado", color: "#EF4444", data: deficitSeries }]}
                    theme={NIVO_SLIDER}
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
                        <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 min-w-[140px]">
                          <p className="font-semibold mb-1 text-slate-300">Año {year}</p>
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
}: {
  news: NewsItem;
  index: number;
  total: number;
}) {
  const title = news.titulo ?? news.title ?? "Noticia del sector energético";
  const imageUrl = news.imagen ?? news.image ?? null;

  return (
    <div className="relative w-full h-full flex items-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#94A3B8" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-800/20 pointer-events-none" />

      {/* Imagen de fondo si existe */}
      {imageUrl && (
        <>
          <div
            className="absolute inset-0 bg-center bg-cover opacity-15"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060B14] via-[#060B14]/90 to-[#060B14]/60" />
        </>
      )}

      <div className="relative z-10 w-full flex items-center px-12 xl:px-20 gap-12 xl:gap-20">
        {/* Contenido texto */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {/* Badge de noticia */}
          <div className="flex items-center gap-3 mb-6 xl:mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-700/60 border border-slate-600/40 rounded-full text-slate-400 text-sm xl:text-base font-semibold tracking-widest uppercase">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Noticia {index + 1} de {total}
            </span>
            {news.fuente && (
              <span className="text-slate-500 text-sm xl:text-base">{news.fuente}</span>
            )}
            {news.fecha && (
              <span className="text-slate-600 text-sm xl:text-base">{news.fecha}</span>
            )}
          </div>

          {/* Título */}
          <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-white leading-tight mb-6 xl:mb-8">
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
              className="inline-flex items-center gap-3 px-6 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all text-lg xl:text-xl font-semibold"
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
          <div className="hidden xl:flex flex-shrink-0 w-72 2xl:w-80 h-64 rounded-2xl border border-white/5 bg-slate-800/30 items-center justify-center">
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
  { id: "presupuesto", label: "Presupuesto", color: "#F59E0B", href: "/presupuesto"  },
  { id: "comunidades", label: "Comunidades", color: "#10B981", href: "/comunidades"  },
  { id: "contratos",   label: "Contratos OR",color: "#8B5CF6", href: "/contratos-or" },
  { id: "supervision", label: "Supervisión", color: "#06B6D4", href: "/supervision"  },
  { id: "subsidios",   label: "Subsidios",   color: "#EF4444", href: "/subsidios"    },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HomeSlider(props: HomeSliderProps) {
  const { sectorData, sectorDetalle, presuData, cemData, cemDepts, orData, supData, subData, deficitFssri, deficitSeries, subBarData } = props;

  const {
    current,
    direction,
    news,
    paused,
    totalSlides,
    goTo,
    handlePrev,
    handleNext,
    setPaused,
  } = useHomeSlider();

  // Render slide content
  function renderSlide(idx: number) {
    if (idx === 0) return <SlideGestionSector d={sectorData} detalle={sectorDetalle} />;
    if (idx === 1) return <SlidePresupuesto d={presuData} />;
    if (idx === 2) return <SlideComunidades d={cemData} depts={cemDepts} />;
    if (idx === 3) return <SlideContratosOR d={orData} />;
    if (idx === 4) return <SlideSupervision d={supData} />;
    if (idx === 5) return <SlideSubsidios d={subData} deficitFssri={deficitFssri} deficitSeries={deficitSeries} subBarData={subBarData} />;
    const newsIdx = idx - 6;
    if (news[newsIdx]) {
      return (
        <SlideNoticia
          news={news[newsIdx]}
          index={newsIdx}
          total={news.length}
        />
      );
    }
    return null;
  }

  // Dot descriptor: 6 KPI dots + news dots
  const dots = [
    ...SLIDE_META,
    ...news.map((_, i) => ({
      id: `news-${i}`,
      label: `Noticia ${i + 1}`,
      color: "#94A3B8",
    })),
  ];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "calc(100vh - 5rem)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Carrusel de indicadores clave del sector energético"
    >
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
          className="absolute top-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-white/5 transition-all duration-200 text-sm xl:text-base"
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
