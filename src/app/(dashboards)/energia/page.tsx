"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import CapacidadEmbalseChart from "@/components/charts/CapacidadEmbalseChart";
import { Zap, Droplets, TrendingUp, AlertTriangle, Waves, Database } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { getEmbalseColor } from "@/lib/embalse-utils";
import { embalseDepartamento, calcularAportesPorDepto } from "@/lib/embalses-coords";

// ─── Colombia SVG map (no SSR) ────────────────────────────────────────────
const ColombiaMap = dynamic(
  () => import("@react-map/colombia").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 bg-dash-chip rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    ),
  }
);

// ─── Nivo themes (dark & light) ──────────────────────────────────────────
const NIVO_DARK = {
  background: "transparent" as const,
  text: { fill: "#94A3B8", fontSize: 11 },
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
      text: { fill: "#64748B", fontSize: 11 },
    },
    legend: { text: { fill: "#94A3B8", fontSize: 11 } },
  },
};

const NIVO_LIGHT = {
  background: "transparent" as const,
  text: { fill: "#475569", fontSize: 11 },
  tooltip: {
    container: {
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: "8px",
      color: "#1E293B",
      fontSize: "12px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    },
  },
  grid: { line: { stroke: "#E2E8F0", strokeWidth: 1 } },
  axis: {
    domain: { line: { stroke: "#CBD5E1" } },
    ticks: {
      line: { stroke: "#CBD5E1" },
      text: { fill: "#64748B", fontSize: 11 },
    },
    legend: { text: { fill: "#475569", fontSize: 11 } },
  },
};

// ─── Helper: formato fecha ───────────────────────────────────────────────
function fmtDate(d: string | Date | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(".", "");
}

// ─── Helper: risk label — metodología oficial XM/UPME ───────────────────
function riesgoLabel(pct: number): string {
  if (pct > 80) return "Normal";
  if (pct >= 70) return "Estable";
  if (pct >= 60) return "Alerta temprana";
  if (pct >= 50) return "Alerta alta";
  return "Crítico";
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function GestionSectorPage() {
  const { resolvedTheme } = useTheme();
  const T = resolvedTheme === "light" ? NIVO_LIGHT : NIVO_DARK;

  // ── Estado: datos snapshot del sector ─────────────────────────────────
  const [sectorSnapshot, setSectorSnapshot] = useState({
    generacionGwh: 250.87,
    precioBolsa: 310.62,
    pctEmbalses: 64.8,
    estadoSin: "ALERTA TEMPRANA",
    colorSin: "#F59E0B",
    aportesHidricosPct: 85.4,
    aportesActualGwh: 0,
    aportesHistoricoGwh: 0,
    ultimaActualizacion: "",
    fechaGeneracion: null as string | null,
    fechaPrecio: null as string | null,
    fechaEmbalse: null as string | null,
    fechaAportes: null as string | null,
    tendencias: null as {
      embalses?: MetricaTendencia | null;
      precio?: MetricaTendencia | null;
      generacion?: MetricaTendencia | null;
      aportes?: MetricaTendencia | null;
    } | null,
  });

  // ── Estado: datos detallados del sector ───────────────────────────────
  const [sectorDetalle, setSectorDetalle] = useState<{
    generacionPorFuente: Array<{
      id: string;
      label: string;
      value: number;
      color: string;
      generacionGwh: number;
    }>;
    precioBolsaSeries: Array<{
      id: string;
      color: string;
      data: Array<{ x: string; y: number; fecha?: Date }>;
    }>;
    embalsesPromedio: number;
    embalsesDetalle: Array<{
      codigo: string;
      nombre: string;
      porcentaje: number;
      capacidadGwh?: number;
    }>;
    aportesRios: Array<{
      codigo: string;
      nombre: string;
      actualGwh: number;
      historicoGwh: number;
      porcentaje: number;
    }>;
  }>({
    generacionPorFuente: [
      { id: "Hidraulica", label: "Hidráulica", value: 68, color: "#3B82F6", generacionGwh: 0 },
      { id: "Termica", label: "Térmica", value: 24, color: "#EF4444", generacionGwh: 0 },
      { id: "Solar", label: "Solar", value: 5, color: "#F59E0B", generacionGwh: 0 },
      { id: "Eolica", label: "Eólica", value: 2, color: "#10B981", generacionGwh: 0 },
      { id: "Cogenerador", label: "Cogenerador", value: 1, color: "#8B5CF6", generacionGwh: 0 },
    ],
    precioBolsaSeries: [{
      id: "COP/kWh",
      color: "#F59E0B",
      data: [
        { x: "1", y: 310.5 }, { x: "8", y: 325.6 }, { x: "15", y: 329.7 },
        { x: "22", y: 339.7 }, { x: "25", y: 332.2 },
      ],
    }],
    embalsesPromedio: 64.8,
    embalsesDetalle: [],
    aportesRios: [],
  });

  // ── Estado: interacción con mapa ──────────────────────────────────────
  const [embalseDepto, setEmbalseDepto] = useState<{
    name: string;
    pct: number;
    embalses: Array<{ nombre: string; porcentaje: number }>;
  } | null>(null);

  const [embalseDetallePorDepto, setEmbalseDetallePorDepto] = useState<
    Record<string, Array<{ nombre: string; porcentaje: number }>>
  >({});

  const [loading, setLoading] = useState(true);

  // ── Estado: datos para gráfico de capacidad de embalses ───────────────
  const [capacidadEmbalseData, setCapacidadEmbalseData] = useState<any>(null);
  const [capacidadEmbalseLoading, setCapacidadEmbalseLoading] = useState(true);

  // ── Cargar datos reales ───────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/sector").then((r) => r.json()).catch(() => null),
      fetch("/api/sector/detalle").then((r) => r.json()).catch(() => null),
      fetch("/api/embalses/capacidad-historica?dias=120").then((r) => r.json()).catch(() => null),
    ]).then(([snap, det, cap]) => {
      setCapacidadEmbalseLoading(false);
      if (cap && !cap.error) {
        setCapacidadEmbalseData(cap);
      }
      setLoading(false);

      if (snap && !snap.error) {
        // aportesHidricos viene como objeto {actualGwh, historicoGwh}
        const aportes = snap.aportesHidricos;
        let aportesPct = 85.4;
        let actualGwh = 0;
        let historicoGwh = 0;
        if (aportes && typeof aportes === "object") {
          actualGwh = Number(aportes.actualGwh ?? 0);
          historicoGwh = Number(aportes.historicoGwh ?? 0);
          if (historicoGwh > 0) aportesPct = (actualGwh / historicoGwh) * 100;
        } else if (typeof aportes === "number") {
          aportesPct = aportes;
        }
        setSectorSnapshot({
          generacionGwh: Number(snap.generacionGwh ?? 250.87),
          precioBolsa: Number(snap.precioBolsa ?? 310.62),
          pctEmbalses: Number(snap.pctEmbalses ?? 64.8),
          estadoSin: snap.estadoSin ?? "ALERTA TEMPRANA",
          colorSin: snap.colorSin ?? "#F59E0B",
          aportesHidricosPct: aportesPct,
          aportesActualGwh: actualGwh,
          aportesHistoricoGwh: historicoGwh,
          ultimaActualizacion: snap.ultimaActualizacion ?? "",
          fechaGeneracion: snap.fechaGeneracion ?? null,
          fechaPrecio: snap.fechaPrecio ?? null,
          fechaEmbalse: snap.fechaEmbalse ?? null,
          fechaAportes: snap.fechaAportes ?? null,
          tendencias: snap.tendencias ?? null,
        });
      }

      if (det && !det.error) {
        setSectorDetalle({
          generacionPorFuente:
            det.generacionPorFuente?.length > 0
              ? det.generacionPorFuente
              : sectorDetalle.generacionPorFuente,
          precioBolsaSeries:
            det.precioBolsa?.historico?.length > 0
              ? det.precioBolsa.historico
              : sectorDetalle.precioBolsaSeries,
          embalsesPromedio:
            det.embalses?.promedioNacional ?? sectorDetalle.embalsesPromedio,
          embalsesDetalle:
            det.embalses?.detalle?.length > 0
              ? det.embalses.detalle
              : [],
          aportesRios:
            det.aportes?.rios?.length > 0
              ? det.aportes.rios
              : [],
        });

        // Agrupar embalses por departamento para el mapa semáforo
        if (det.embalses?.detalle?.length > 0) {
          const byDepto: Record<string, Array<{ nombre: string; porcentaje: number }>> = {};
          for (const e of det.embalses.detalle) {
            const dept = embalseDepartamento[e.codigo];
            if (dept) {
              if (!byDepto[dept]) byDepto[dept] = [];
              byDepto[dept].push({ nombre: e.nombre, porcentaje: e.porcentaje });
            }
          }
          setEmbalseDetallePorDepto(byDepto);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Colores dinámicos del mapa por departamento (peor embalse) ────────
  const embalseSemaforoColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const [dept, embalses] of Object.entries(embalseDetallePorDepto)) {
      const minPct = Math.min(...embalses.map((e) => e.porcentaje));
      colors[dept] = getEmbalseColor(minPct);
    }
    return colors;
  }, [embalseDetallePorDepto]);

  // ── Datos de aportes por departamento ─────────────────────────────────
  const aportesPorDepto = useMemo(() => {
    if (!sectorDetalle.aportesRios.length) return null;
    return calcularAportesPorDepto(sectorDetalle.aportesRios);
  }, [sectorDetalle.aportesRios]);

  // ── Datos para gráfica de aportes (top 10 ríos) ───────────────────────
  const aportesBarData = useMemo(() => {
    if (!sectorDetalle.aportesRios.length) return [];
    return [...sectorDetalle.aportesRios]
      .sort((a, b) => b.actualGwh - a.actualGwh)
      .slice(0, 12)
      .map((r) => ({
        rio: r.nombre,
        Actual: r.actualGwh,
        Histórico: r.historicoGwh,
      }));
  }, [sectorDetalle.aportesRios]);

  const updateTime = sectorSnapshot.ultimaActualizacion
    ? fmtDate(sectorSnapshot.ultimaActualizacion)
    : fmtDate(new Date());

  return (
    <div className="min-h-screen bg-theme-primary pt-20">
      {/* ═══════════════════════════════════════════════════════════════
          TÍTULO DE PÁGINA (no sticky — el Header global ya lo es)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-theme-primary">
              Gestión del Sector
            </h1>
            <p className="text-xs text-theme-secondary">
              Sistema Interconectado Nacional (SIN) · Actualizado: {updateTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">
              {loading ? "Cargando…" : "Datos reales de BD"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════════ */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* ── Row 1: KPIs Principales ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
        >
          {/* KPI: Generación */}
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Generación Total</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold text-theme-primary"
                style={sectorSnapshot.tendencias?.generacion?.label !== "S/D" && sectorSnapshot.tendencias?.generacion ? { color: getTrendColor(sectorSnapshot.tendencias.generacion, "generacion") } : undefined}
              >{sectorSnapshot.generacionGwh.toFixed(1)}</span>
              <TrendArrow tendencia={sectorSnapshot.tendencias?.generacion} metrica="generacion" />
              <span className="text-[10px] text-theme-muted">GWh</span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              Generación nacional{sectorSnapshot.fechaGeneracion ? ` · ${sectorSnapshot.fechaGeneracion}` : " · últimas 24h"}
            </p>
            <div className="mt-1.5">
              <TrendBadge tendencia={sectorSnapshot.tendencias?.generacion} metrica="generacion" size="md" />
            </div>
          </div>

          {/* KPI: Precio Bolsa */}
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Precio de Bolsa</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold text-amber-400"
                style={sectorSnapshot.tendencias?.precio?.label !== "S/D" && sectorSnapshot.tendencias?.precio ? { color: getTrendColor(sectorSnapshot.tendencias.precio, "precio") } : undefined}
              >${sectorSnapshot.precioBolsa.toFixed(2)}</span>
              <TrendArrow tendencia={sectorSnapshot.tendencias?.precio} metrica="precio" />
              <span className="text-[10px] text-theme-muted">COP/kWh</span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              XM{sectorSnapshot.fechaPrecio ? ` · ${sectorSnapshot.fechaPrecio}` : " · Promedio diario"}
            </p>
            <div className="mt-1.5">
              <TrendBadge tendencia={sectorSnapshot.tendencias?.precio} metrica="precio" size="md" />
            </div>
          </div>

          {/* KPI: % Embalses */}
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">% Embalses Nacional</span>
              <Droplets className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold text-blue-400"
                style={sectorSnapshot.tendencias?.embalses?.label !== "S/D" && sectorSnapshot.tendencias?.embalses ? { color: getTrendColor(sectorSnapshot.tendencias.embalses, "embalses") } : undefined}
              >{sectorSnapshot.pctEmbalses.toFixed(2)}%</span>
              <TrendArrow tendencia={sectorSnapshot.tendencias?.embalses} metrica="embalses" />
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              Volumen útil{sectorSnapshot.fechaEmbalse ? ` · ${sectorSnapshot.fechaEmbalse}` : " · promedio"}
            </p>
            <div className="mt-1.5">
              <TrendBadge tendencia={sectorSnapshot.tendencias?.embalses} metrica="embalses" size="md" />
            </div>
          </div>

          {/* KPI: Estado SIN */}
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Estado SIN</span>
              <AlertTriangle className="w-4 h-4" style={{ color: sectorSnapshot.colorSin }} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold" style={{ color: sectorSnapshot.colorSin }}>
                {sectorSnapshot.estadoSin}
              </span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              Embalses{sectorSnapshot.fechaEmbalse ? ` · ${sectorSnapshot.fechaEmbalse}` : ""}
            </p>
          </div>

          {/* KPI: Aportes Hídricos */}
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Aportes Hídricos</span>
              <Waves className="w-4 h-4 text-cyan-400" />
            </div>
            {(() => {
              const delta = sectorSnapshot.aportesHidricosPct - 100;
              const col = delta >= 0 ? "#22C55E" : delta >= -10 ? "#06B6D4" : "#EF4444";
              return (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-2xl font-bold"
                      style={{ color: sectorSnapshot.tendencias?.aportes?.label !== "S/D" && sectorSnapshot.tendencias?.aportes ? getTrendColor(sectorSnapshot.tendencias.aportes, "aportes") : col }}
                    >
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                    </span>
                    <TrendArrow tendencia={sectorSnapshot.tendencias?.aportes} metrica="aportes" />
                    <span className="text-[10px] text-theme-muted">vs hist.</span>
                  </div>
                  <p className="text-[9px] text-theme-muted mt-1">
                    {sectorSnapshot.aportesActualGwh > 0
                      ? `${sectorSnapshot.aportesActualGwh.toFixed(1)} / ${sectorSnapshot.aportesHistoricoGwh.toFixed(1)} GWh hist.`
                      : "Aportes energía · XM"}
                    {sectorSnapshot.fechaAportes ? ` · ${sectorSnapshot.fechaAportes}` : ""}
                  </p>
                  <div className="mt-1.5">
                    <TrendBadge tendencia={sectorSnapshot.tendencias?.aportes} metrica="aportes" size="md" />
                  </div>
                </>
              );
            })()}
          </div>
        </motion.div>

        {/* ── Row 2: Mapa + Generación + Precio ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

          {/* Panel izquierdo: Mapa de embalses (2/3) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                  Estado de Embalses por Departamento
                </span>
                <p className="text-[10px] text-theme-muted mt-0.5">
                  Haga click en un departamento para ver detalle de embalses
                </p>
              </div>
              <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                {sectorSnapshot.pctEmbalses.toFixed(2)}% Nac.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mapa */}
              <div className="md:col-span-2 flex justify-center">
                <ColombiaMap
                  type="select-single"
                  size={280}
                  mapColor="#1E3A5F"
                  strokeColor="#0F172A"
                  strokeWidth={0.6}
                  hoverColor="#F97316"
                  selectColor="#F59E0B"
                  cityColors={embalseSemaforoColors}
                  onSelect={(name: string | null) => {
                    if (!name) { setEmbalseDepto(null); return; }
                    const lista = embalseDetallePorDepto[name] ?? [];
                    const minPct = lista.length ? Math.min(...lista.map((e) => e.porcentaje)) : 0;
                    setEmbalseDepto({ name, pct: minPct, embalses: lista });
                  }}
                />
              </div>

              {/* Panel de detalle / leyenda */}
              <div className="space-y-3">
                {embalseDepto ? (
                  <div className="bg-theme-primary/40 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-theme-secondary uppercase tracking-wider truncate">
                        {embalseDepto.name}
                      </p>
                      <button
                        onClick={() => setEmbalseDepto(null)}
                        className="text-[9px] text-theme-muted hover:text-amber-400 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                      {embalseDepto.embalses.length > 0 ? (
                        embalseDepto.embalses.map((e) => (
                          <div key={e.nombre} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: getEmbalseColor(e.porcentaje) }}
                              />
                              <span className="text-[10px] text-theme-muted truncate">{e.nombre}</span>
                            </div>
                            <span className="text-[10px] font-bold text-theme-secondary shrink-0">
                              {e.porcentaje.toFixed(0)}%
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-theme-muted">Sin embalses registrados</span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-theme-muted">Nivel más bajo:</span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: getEmbalseColor(embalseDepto.pct) }}
                        >
                          {embalseDepto.pct.toFixed(0)}% · {riesgoLabel(embalseDepto.pct)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-theme-primary/40 rounded-lg p-3 border border-white/5">
                      <p className="text-[10px] font-bold text-theme-secondary uppercase tracking-wider mb-2">
                        Leyenda de Riesgo
                      </p>
                      <div className="space-y-1.5">
                        {[
                          { color: "#22C55E", label: "Normal", range: "> 80%" },
                          { color: "#06B6D4", label: "Estable", range: "70–80%" },
                          { color: "#F59E0B", label: "Alerta temprana", range: "60–70%" },
                          { color: "#F97316", label: "Situación delicada", range: "50–60%" },
                          { color: "#EF4444", label: "Crítico", range: "< 50%" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                              <span className="text-[10px] text-theme-muted">{item.label}</span>
                            </div>
                            <span className="text-[9px] text-theme-muted">{item.range}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-theme-primary/40 rounded-lg p-3 border border-white/5">
                      <p className="text-[10px] text-theme-muted">
                        <strong className="text-theme-secondary">{Object.keys(embalseDetallePorDepto).length}</strong> departamentos con embalses monitoreados
                      </p>
                      <p className="text-[9px] text-theme-muted mt-1">
                        Total: <strong className="text-theme-secondary">{sectorDetalle.embalsesDetalle.length}</strong> embalses activos
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Panel derecho: Generación por fuente */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="mb-3">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                Generación por Fuente
              </span>
              <p className="text-[10px] text-theme-muted mt-0.5">Últimos 7 días · promedio diario</p>
            </div>

            <div className="relative h-[200px]">
              <ResponsivePie
                data={sectorDetalle.generacionPorFuente}
                theme={T}
                margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
                innerRadius={0.65}
                padAngle={2}
                cornerRadius={3}
                activeOuterRadiusOffset={6}
                colors={{ datum: "data.color" }}
                borderWidth={0}
                enableArcLinkLabels={true}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#94A3B8"
                arcLinkLabelsThickness={1}
                arcLinkLabelsColor={{ from: "color" }}
                arcLabelsSkipAngle={15}
                arcLabelsTextColor="#fff"
                arcLabelsRadiusOffset={0.75}
                tooltip={({ datum }) => (
                  <div className="nt">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                    {datum.label}: <strong>{datum.value}%</strong>
                    <br />
                    <span className="text-theme-muted text-[10px]">{datum.data.generacionGwh?.toFixed(1)} GWh</span>
                  </div>
                )}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-theme-primary leading-none">
                  {sectorSnapshot.generacionGwh.toFixed(1)}
                </span>
                <span className="text-[9px] text-theme-secondary">GWh</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
              {sectorDetalle.generacionPorFuente.map((f) => (
                <div key={f.id} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                  <span className="text-[10px] text-theme-muted truncate">
                    {f.label} <strong className="text-theme-secondary">{f.value}%</strong>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Row 3: Precio de Bolsa + Aportes Hídricos ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

          {/* Precio de Bolsa Histórico */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="mb-3">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                Precio de Bolsa · Histórico
              </span>
              <p className="text-[10px] text-theme-muted mt-0.5">
                {(() => {
                  const data = sectorDetalle.precioBolsaSeries[0]?.data;
                  if (!data || data.length === 0) return "Tendencia mes actual";
                  const primera = new Date(data[0].fecha || Date.now());
                  const ultima = new Date(data[data.length - 1].fecha || Date.now());
                  const formato = (f: Date) =>
                    f.toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
                  return `${formato(primera)} - ${formato(ultima)} ${ultima.getFullYear()}`;
                })()}
              </p>
            </div>

            <div className="h-[220px]">
              <ResponsiveLine
                data={sectorDetalle.precioBolsaSeries}
                theme={T}
                margin={{ top: 10, right: 10, bottom: 40, left: 45 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="catmullRom"
                enablePoints={false}
                enableGridX={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 10,
                  tickRotation: -45,
                  tickValues: "every 3 days",
                  format: (value) => {
                    const dataPoint = sectorDetalle.precioBolsaSeries[0]?.data.find(
                      (d) => d.x === value
                    );
                    if (dataPoint?.fecha) {
                      return String(new Date(dataPoint.fecha).getDate());
                    }
                    return value;
                  },
                }}
                axisLeft={{ tickSize: 0, tickValues: 5, tickPadding: 8 }}
                colors={["#F59E0B"]}
                lineWidth={2.5}
                enableArea
                areaOpacity={0.15}
                useMesh
                tooltip={({ point }) => {
                  const dataPoint = sectorDetalle.precioBolsaSeries[0]?.data.find(
                    (d) => d.x === point.data.x
                  );
                  const fecha = dataPoint?.fecha
                    ? new Date(dataPoint.fecha).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : point.data.xFormatted;
                  return (
                    <div className="nt">
                      <div className="text-theme-muted mb-0.5">{fecha}</div>
                      <div className="text-amber-400 font-bold">
                        ${Number(point.data.y).toFixed(2)} COP/kWh
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </motion.div>

          {/* Capacidad de Embalses — Stacked Area + Históricos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="mb-3">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                Capacidad de Embalses
              </span>
              <p className="text-[10px] text-theme-muted mt-0.5">
                Energía almacenada por región (GWh) · % SIN vs histórico
              </p>
            </div>

            {capacidadEmbalseData && !capacidadEmbalseData.error ? (
              <div className="h-[280px]">
                <CapacidadEmbalseChart
                  data={capacidadEmbalseData}
                  height={280}
                />
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-theme-muted text-sm">
                {capacidadEmbalseLoading
                  ? "Cargando capacidad de embalses…"
                  : "Sin datos de embalses disponibles"}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Row 4: Tabla detallada de embalses ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-dash-chip rounded-xl p-5 border border-white/5"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                Detalle de Embalses
              </span>
              <p className="text-[10px] text-theme-muted mt-0.5">
                Todos los embalses monitoreados · ordenados por % volumen útil
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-theme-muted">
                Promedio nacional: <strong className="text-amber-400">{sectorSnapshot.pctEmbalses.toFixed(2)}%</strong>
              </span>
            </div>
          </div>

          {sectorDetalle.embalsesDetalle.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider py-2 px-3">
                      Embalse
                    </th>
                    <th className="text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider py-2 px-3">
                      Departamento
                    </th>
                    <th className="text-right text-[10px] font-bold text-theme-muted uppercase tracking-wider py-2 px-3">
                      % Volumen
                    </th>
                    <th className="text-right text-[10px] font-bold text-theme-muted uppercase tracking-wider py-2 px-3">
                      Capacidad (GWh)
                    </th>
                    <th className="text-center text-[10px] font-bold text-theme-muted uppercase tracking-wider py-2 px-3">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...sectorDetalle.embalsesDetalle]
                    .sort((a, b) => b.porcentaje - a.porcentaje)
                    .map((e, i) => {
                      const depto =
                        Object.entries(embalseDepartamento).find(
                          ([codigo]) => codigo === e.codigo
                        )?.[1] ?? "—";
                      const color = getEmbalseColor(e.porcentaje);
                      return (
                        <tr
                          key={e.codigo}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: color }}
                              />
                              <span className="text-xs text-theme-primary font-medium">
                                {e.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs text-theme-muted">{depto}</span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-xs font-bold" style={{ color }}>
                              {e.porcentaje.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-xs text-theme-muted">
                              {e.capacidadGwh ? e.capacidadGwh.toFixed(1) : "—"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                background: `${color}20`,
                                color,
                                border: `1px solid ${color}40`,
                              }}
                            >
                              {riesgoLabel(e.porcentaje).toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-theme-muted text-sm">
              {loading ? "Cargando datos de embalses…" : "Sin datos de embalses disponibles"}
            </div>
          )}
        </motion.div>

        {/* ── Row 5: Aportes por Departamento (si hay datos) ────────── */}
        {aportesPorDepto && Object.keys(aportesPorDepto).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="mb-4">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
                Aportes Hídricos por Departamento
              </span>
              <p className="text-[10px] text-theme-muted mt-0.5">
                Agregado de ríos por región
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(aportesPorDepto)
                .sort(([, a], [, b]) => b.porcentaje - a.porcentaje)
                .map(([depto, data]) => {
                  const color = getEmbalseColor(data.porcentaje);
                  return (
                    <div
                      key={depto}
                      className="bg-theme-primary/40 rounded-lg p-3 border border-white/5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-theme-secondary truncate">
                          {depto}
                        </span>
                        <span className="text-[9px] font-bold" style={{ color }}>
                          {data.porcentaje.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-xs text-theme-muted">
                          {data.actualGwh.toFixed(1)} GWh
                        </span>
                        <span className="text-[8px] text-theme-muted">
                          / {data.historicoGwh.toFixed(1)} hist.
                        </span>
                      </div>
                      <div className="h-1.5 bg-theme-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(data.porcentaje, 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[8px] text-theme-muted">
                        {data.rios.length} río{data.rios.length > 1 ? "s" : ""} monitoreado{data.rios.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
