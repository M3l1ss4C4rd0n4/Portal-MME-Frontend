"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ResponsiveLine } from "@nivo/line";0
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";

import SemiGauge from "@/components/ui/SemiGauge";
import HomeSlider from "@/components/HomeSlider";
import type { TermicaSliderData } from "@/types/home-slider";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { homeDashboardData } from "@/mocks/home-data";
import {
  comunidadesCityColors,
  comunidadesEnergeticasPorDepto,
  contratosSupervisionDonut,
  getEmbalseColor,
  getEmbalseEstado,
} from "@/mocks/colombia-data";
import { embalseDepartamento } from "@/lib/embalses-coords";
import { fmtCortePresupuesto } from "@/lib/format";

// ─── Mapa embalses SVG (no SSR) ───────────────────────────────────────────
const MapaEmbalsesSVG = dynamic(
  () => import("@/components/MapaEmbalsesSVG"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-40 bg-dash-chip rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    ),
  }
);

// ─── Colombia SVG map (no SSR) ────────────────────────────────────────────
const ColombiaMap = dynamic(
  () => import("@react-map/colombia").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-40 bg-dash-chip rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    ),
  }
);

// ─── Nivo themes (dark & light) ──────────────────────────────────────────
const NIVO_DARK = {
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
      text: { fill: "#64748B", fontSize: 10 },
    },
    legend: { text: { fill: "#94A3B8", fontSize: 10 } },
  },
};

const NIVO_LIGHT = {
  background: "transparent" as const,
  text: { fill: "#475569", fontSize: 10 },
  tooltip: {
    container: {
      background: "#FFFFFF",
      border: "1px solid #CBD5E1",
      borderRadius: "8px",
      color: "#0F172A",
      fontSize: "12px",
    },
  },
  grid: { line: { stroke: "#E2E8F0", strokeWidth: 1 } },
  axis: {
    domain: { line: { stroke: "#CBD5E1" } },
    ticks: {
      line: { stroke: "#CBD5E1" },
      text: { fill: "#94A3B8", fontSize: 10 },
    },
    legend: { text: { fill: "#475569", fontSize: 10 } },
  },
};

// ─── UI helpers ───────────────────────────────────────────────────────────
function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5 hover:border-amber-500/40 transition-colors duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({
  title,
  link,
  warning,
  time,
  timeLabel = "Actualizado",
}: {
  title: string;
  link: string;
  warning?: boolean;
  time?: string;
  timeLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
            {title}
          </span>
          {warning && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        {time && (
          <p className="text-[10px] text-theme-muted mt-0.5">{timeLabel}: {time}</p>
        )}
      </div>
      <Link
        href={link}
        className="text-gold/30 hover:text-gold transition-colors mt-0.5"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </Link>
    </div>
  );
}

function KpiChip({
  label,
  value,
  accent = false,
  small = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-theme-secondary border border-theme-primary rounded-xl px-3 py-2.5">
      <div className={`font-bold leading-none ${small ? "text-[11px]" : "text-base"} ${accent ? "text-gold" : "text-theme-primary"}`}>
        {value}
      </div>
      <div className="text-[10px] text-theme-muted mt-1 leading-tight">{label}</div>
    </div>
  );
}

function StateRow({ dot, label, count, total }: { dot: string; label: string; count: number; total: number }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  const dotColors: Record<string, string> = {
    cyan: '#06B6D4', teal: '#14B8A6', amber: '#F59E0B', emerald: '#10B981', rose: '#F43F5E',
  };
  return (
    <div className="flex items-center justify-between bg-theme-secondary rounded-lg px-2 py-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColors[dot] ?? '#888' }} />
        <span className="text-[10px] text-theme-secondary leading-tight truncate">{label}</span>
      </div>
      <div className="flex-shrink-0 ml-1 text-right">
        <span className="text-[10px] font-bold text-theme-primary">{count.toLocaleString('es-CO')}</span>
        <span className="text-[9px] text-theme-muted ml-1">({pct}%)</span>
      </div>
    </div>
  );
}

// ─── GeoName → @react-map/colombia key ─────────────────────────────────────
const _CE_GEO_TO_MAP: Record<string, string> = {
  "AMAZONAS": "Amazonas",
  "ANTIOQUIA": "Antioquia",
  "ARAUCA": "Arauca",
  "ATLANTICO": "Atlántico",
  "BOLIVAR": "Bolívar",
  "BOYACA": "Boyacá",
  "CALDAS": "Caldas",
  "CAQUETA": "Caquetá",
  "CASANARE": "Casanare",
  "CAUCA": "Cauca",
  "CESAR": "Cesar",
  "CHOCO": "Chocó",
  "CORDOBA": "Córdoba",
  "CUNDINAMARCA": "Cundinamarca",
  "GUAINIA": "Guainía",
  "GUAVIARE": "Guaviare",
  "HUILA": "Huila",
  "LA GUAJIRA": "La Guajira",
  "MAGDALENA": "Magdalena",
  "META": "Meta",
  "NARINO": "Nariño",
  "NARIÑO": "Nariño",
  "NORTE DE SANTANDER": "Norte de Santander",
  "PUTUMAYO": "Putumayo",
  "QUINDIO": "Quindío",
  "RISARALDA": "Risaralda",
  "SANTANDER": "Santander",
  "SANTAFE DE BOGOTA D.C": "Distrito Capital de Bogotá",
  "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA": "San Andrés, Providencia y Santa Catalina",
  "SUCRE": "Sucre",
  "TOLIMA": "Tolima",
  "VALLE DEL CAUCA": "Valle del Cauca",
  "VAUPES": "Vaupés",
  "VICHADA": "Vichada",
};
function _ceToReactMapName(geo: string): string {
  // Normalize to NFC to handle Unicode mismatches (ej: Ñ vs N+tilde)
  const key = geo?.normalize?.("NFC") ?? geo;
  return _CE_GEO_TO_MAP[key] ?? geo;
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function Home() {
  const [embalseDepto, setEmbalseDepto] = useState<{
    name: string;
    pct: number;
    embalses: Array<{ nombre: string; porcentaje: number }>;
  } | null>(null);
  const [embalseDetallePorDepto, setEmbalseDetallePorDepto] = useState<
    Record<string, Array<{ nombre: string; porcentaje: number }>>
  >({});
  const [embalsesLista, setEmbalsesLista] = useState<Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh?: number }>>([]);
  const [ceDepto, setCeDepto] = useState<{ name: string; count: number } | null>(null);
  const [cemMunicipios, setCemMunicipios] = useState<Record<string, Array<{ municipio: string; count: number }>>>({});
  const { resolvedTheme } = useTheme();

  const T = resolvedTheme === "light" ? NIVO_LIGHT : NIVO_DARK;

  const { gestionSector, presupuesto, comunidades, contratosOR, supervision, subsidios } =
    homeDashboardData;

  // ── API live data (defaults = last known real values) ──────────────────
  const [sectorData, setSectorData] = useState({
    generacionGwh: 0, precioBolsa: 0, pctEmbalses: 0,
    embalseGwh: null as number | null,
    capacidadEmbalseGwh: null as number | null,
    ultimaActualizacion: null as string | null,
    ultimaEjecucionETL: null as string | null,
    aportesHidricos: {
      actualGwh: 0, historicoGwh: 0,
      pct: null as number | null,
      hsinPct: null as number | null,
      pctMtd: null as number | null,
      indiceHsin: null as string | null,
      dailyActualGwh: null as number | null,
      dailyHistGwh: null as number | null,
    },
    umbralesRegulatorios: null as {
      sendaReferenciaPct?: number;
      indiceNe?: string;
      indiceHsin?: string;
      indicePbp?: string;
      condicionSistema?: string;
      pei?: number;
      pe?: number;
      pes?: number;
      preciosOrigen?: string;
    } | null,
    estadoSin: null as string | null,
    colorSin: null as string | null,
    tendencias: null as {
      embalses?: MetricaTendencia | null;
      precio?: MetricaTendencia | null;
      generacion?: MetricaTendencia | null;
      aportes?: MetricaTendencia | null;
    } | null,
    fechaGeneracion: null as string | null,
    fechaPrecio: null as string | null,
    fechaEmbalse: null as string | null,
    fechaAportes: null as string | null,
    oniActual: null as number | null,
    oniClasificacion: null as string | null,
    oniProyeccionInicio: null as string | null,
  });
  
  // Datos detallados del sector energético (generación por fuente, precios históricos, embalses)
  const [sectorDetalle, setSectorDetalle] = useState<{
    generacionPorFuente: Array<{id: string; label: string; value: number; color: string; generacionGwh: number}>;
    precioBolsaSeries: Array<{id: string; color: string; data: Array<{x: string; y: number; fecha?: Date}>}>;
    embalsesPromedio: number;
    embalses: Array<{codigo: string; nombre: string; porcentaje: number; capacidadGwh: number}>;
    aportesRios: Array<{codigo: string; nombre: string; actualGwh: number; historicoGwh: number; porcentaje: number}>;
    sparklines: { embalses: Array<{x: string; y: number}>; aportes: Array<{x: string; y: number}> };
  }>({
    generacionPorFuente: [],
    precioBolsaSeries: [],
    embalsesPromedio: 0,
    embalses: [],
    aportesRios: [],
    sparklines: { embalses: [], aportes: [] },
  });
  const [termicaData, setTermicaData] = useState<TermicaSliderData | null>(null);
  const [presuData, setPresuData] = useState({
    totales: {
      apropiacion: 0, comprometido: 0,
      pct_comprometido: 0, obligados: 0, pct_obligado: 0,
    },
    ultimaActualizacion: "",
  });
  const [cemData, setCemData] = useState({
    implementadas: 0, inversionEstimada: 0, capacidadKwp: 0, ultimaActualizacion: "",
  });
  const [cemDepts, setCemDepts] = useState<Array<{name: string; count: number; capacidad: number}>>([]);
  const [fenData, setFenData] = useState({ totalCes: 0, totalKwp: 0, totalInversion: 0, ultimaActualizacion: "" });
  const [fenDepts, setFenDepts] = useState<Array<{name: string; count: number}>>([]);
  const [fenMunicipios, setFenMunicipios] = useState<Record<string, Array<{ municipio: string; count: number }>>>({});
  const [fenDepto, setFenDepto] = useState<{ name: string; count: number } | null>(null);
  const [orData, setOrData] = useState({
    nContratos: 0,
    avanceGeneral: 0,
    avanceFinanciero: 0,
    nUsuarios: 295911,
    nCEs: 2297,
    inversionTotal: 914360289397,
    potenciaTotal: 37,
    ultimaActualizacion: "",
  });
  const [supData, setSupData] = useState({
    nContratos: 0, nProyectos: 0,
    enEjecucion: 0, enAOM: 0, enLiquidacion: 0, liquidados: 0, perdidaCompetencia: 0,
    avanceFisico: 0, avanceFinanciero: 0, avanceContrato: 0,
    avanceFisicoActivos: 0, avanceFinancieroActivos: 0,
    financiero: { valorProyecto: 0, valorDesembolsado: 0, valorPorDesembolsar: 0, pctDesembolsado: 0 },
    usuarios: { contratados: 0, finales: 0 },
    nFotovoltaicos: 0,
    porFondo: [] as { fondo: string; contratos: number }[],
    ultimaActualizacion: "",
  });
  const [subData, setSubData] = useState({
    deficitAcumulado: 0,
    anio2025: { resoluciones: 0, valorAsignado: 0, pendiente: 0, pagado: 0 },
    anio2026: { resoluciones: 0, valorAsignado: 0, pendiente: 0, pagado: 0 },
    ultimaActualizacion: "",
  });
  const [cuData, setCuData] = useState({
    cuMayoristaLac: 0,
    cuUsuarioFinal: 0,
    fecha: "",
  });
  const [cuEvolucionData, setCuEvolucionData] = useState<{
    daily: {
      series: Array<{ id: string; color: string; data: Array<{ x: string; y: number }> }>;
      totalSeries: Array<{ id: string; color: string; data: Array<{ x: string; y: number }> }>;
    };
    latest: {
      fecha: string;
      cu_total: number;
      cu_usuario_final: number;
      componentes: Record<string, number | null>;
    } | null;
  } | null>(null);
  const [subDeficitFssri, setSubDeficitFssri] = useState(0);
  const [subDeficitSeries, setSubDeficitSeries] = useState<Array<{x: string; y: number}>>([]);
  const [subBarData, setSubBarData] = useState<Array<{anio: string; Subsidios: number; Contribuciones: number}>>([]);
  const [valData, setValData] = useState<{
    vf: number; vp: number; vi: number; viSp: number; otros: number; ultimaAct: string;
    porFondo: Record<string, { vf: number; vp: number; vi: number; viSp: number }>;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/sector').then(r => r.json()).catch(() => null),
      fetch('/api/sector/detalle').then(r => r.json()).catch(() => null),
      fetch('/api/sector/termica').then(r => r.json()).catch(() => null),
      fetch('/api/presupuesto').then(r => r.json()).catch(() => null),
      fetch('/api/comunidades').then(r => r.json()).catch(() => null),
      fetch('/api/contratos-or').then(r => r.json()).catch(() => null),
      fetch('/api/supervision?anoMin=2015').then(r => r.json()).catch(() => null),
      fetch('/api/subsidios').then(r => r.json()).catch(() => null),
      fetch('/api/subsidios/deficit-historico').then(r => r.json()).catch(() => null),
      fetch('/api/cu').then(r => r.json()).catch(() => null),
      fetch('/api/cu-evolucion').then(r => r.json()).catch(() => null),
      fetch('/api/subsidios/validaciones').then(r => r.json()).catch(() => null),
      fetch('/api/fenoge').then(r => r.json()).catch(() => null),
    ]).then(([s, sd, tm, p, c, o, sp, sb, sbh, cu, cue, val, fen]) => {
      if (s) setSectorData({
        generacionGwh: Number(s.generacionGwh ?? 0),
        precioBolsa: Number(s.precioBolsa ?? 0),
        pctEmbalses: Number(s.pctEmbalses ?? 0),
        embalseGwh: s.embalseGwh != null ? Number(s.embalseGwh) : null,
        capacidadEmbalseGwh: s.capacidadEmbalseGwh != null ? Number(s.capacidadEmbalseGwh) : null,
        ultimaActualizacion: s.ultimaActualizacion ?? null,
        ultimaEjecucionETL: s.ultimaEjecucionETL ?? null,
        aportesHidricos: {
          actualGwh: Number(s.aportesHidricos?.actualGwh ?? 0),
          historicoGwh: Number(s.aportesHidricos?.historicoGwh ?? 0),
          pct: s.aportesHidricos?.pct != null ? Number(s.aportesHidricos.pct) : null,
          hsinPct: s.aportesHidricos?.hsinPct != null ? Number(s.aportesHidricos.hsinPct) : null,
          pctMtd: s.aportesHidricos?.pctMtd != null ? Number(s.aportesHidricos.pctMtd) : null,
          indiceHsin: s.aportesHidricos?.indiceHsin ?? null,
          dailyActualGwh: s.aportesHidricos?.dailyActualGwh != null ? Number(s.aportesHidricos.dailyActualGwh) : null,
          dailyHistGwh: s.aportesHidricos?.dailyHistGwh != null ? Number(s.aportesHidricos.dailyHistGwh) : null,
        },
        umbralesRegulatorios: s.umbralesRegulatorios ?? null,
        estadoSin: s.estadoSin ?? null,
        colorSin: s.colorSin ?? null,
        tendencias: s.tendencias ?? null,
        fechaGeneracion: s.fechaGeneracion ?? null,
        fechaPrecio: s.fechaPrecio ?? null,
        fechaEmbalse: s.fechaEmbalse ?? null,
        fechaAportes: s.fechaAportes ?? null,
        oniActual: s.oniActual != null ? Number(s.oniActual) : null,
        oniClasificacion: s.oniClasificacion ?? null,
        oniProyeccionInicio: s.oniProyeccionInicio ?? null,
      });
      
      // Procesar datos detallados del sector (generación por fuente, precios, embalses)
      if (sd && !sd.error) {
        setSectorDetalle({
          generacionPorFuente: sd.generacionPorFuente?.length > 0
            ? sd.generacionPorFuente
            : [],
          precioBolsaSeries: sd.precioBolsa?.historico?.length > 0
            ? sd.precioBolsa.historico
            : [],
          embalsesPromedio: sd.embalses?.promedioNacional ?? 0,
          embalses: sd.embalses?.detalle?.length > 0
            ? sd.embalses.detalle
            : [],
          aportesRios: sd.aportes?.rios?.length > 0
            ? sd.aportes.rios
            : [],
          sparklines: sd.sparklines ?? { embalses: [], aportes: [] },
        });

        // Agrupar embalses reales por departamento para el mapa semáforo
        if (sd.embalses?.detalle?.length > 0) {
          const detalle = sd.embalses.detalle as Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh?: number }>;
          // Lista plana para MapaEmbalsesSVG
          setEmbalsesLista(detalle.map(e => ({ codigo: e.codigo, nombre: e.nombre, porcentaje: e.porcentaje, capacidadGwh: e.capacidadGwh })));
          // Agrupado por departamento para el panel de detalle
          const byDepto: Record<string, Array<{ nombre: string; porcentaje: number }>> = {};
          for (const e of detalle) {
            const dept = embalseDepartamento[e.codigo];
            if (dept) {
              if (!byDepto[dept]) byDepto[dept] = [];
              byDepto[dept].push({ nombre: e.nombre, porcentaje: e.porcentaje });
            }
          }
          setEmbalseDetallePorDepto(byDepto);
        }
      }

      if (tm && !tm.error) {
        setTermicaData({
          generacionTermica: tm.generacionTermica,
          precios: tm.precios,
          plantas: tm.plantas ?? [],
          evolucionTermica: tm.evolucionTermica ?? [],
          evolucionTotal: tm.evolucionTotal ?? [],
          maxTotalDiarioGwh: Number(tm.maxTotalDiarioGwh ?? 0),
        });
      }

      if (p) setPresuData({
        totales: {
          apropiacion: Number(p.totales?.apropiacion ?? 0),
          comprometido: Number(p.totales?.comprometido ?? 0),
          // Multiplicar por 100 porque la BD devuelve decimales (0.337 = 33.7%)
          pct_comprometido: Number(p.totales?.pct_comprometido ?? 0) * 100,
          obligados: Number(p.totales?.obligados ?? 0),
          pct_obligado: Number(p.totales?.pct_obligado ?? 0) * 100,
        },
        ultimaActualizacion: p.ultima_actualizacion ?? "",
      });
      if (c) {
        setCemData({
          implementadas: Number(c.implementadas ?? 0),
          inversionEstimada: Number(c.inversionEstimada ?? 0),
          capacidadKwp: Number(c.capacidadKwp ?? 0),
          ultimaActualizacion: c.ultima_actualizacion ?? "",
        });
        setCemDepts(
          (c.porDepartamento ?? []).map((d: any) => ({
            name: _ceToReactMapName(String(d.departamentoGeo)),
            count: Number(d.count) || 0,
            capacidad: Number(d.capacidad) || 0,
          }))
        );
        if (c.porMunicipio && c.porDepartamento) {
          const rekeyed: Record<string, Array<{ municipio: string; count: number }>> = {};
          for (const dept of c.porDepartamento) {
            const reactName = _ceToReactMapName(String(dept.departamentoGeo));
            const rawDept   = String(dept.departamento);
            if (c.porMunicipio[rawDept]) rekeyed[reactName] = c.porMunicipio[rawDept];
          }
          setCemMunicipios(rekeyed);
        }
      }
      if (o) setOrData({
        nContratos: Number(o.nContratos ?? 0),
        avanceGeneral: Number(o.avanceGeneral ?? 0),
        avanceFinanciero: Number(o.avanceFinanciero ?? 0),
        // Valores fijos de Contratos OR (no existen en BD, vienen de PowerBI)
        nUsuarios: 295911,
        nCEs: 2297,
        inversionTotal: 914360289397,
        potenciaTotal: 37,
        ultimaActualizacion: o.ultima_actualizacion ?? "",
      });
      if (sp) setSupData({
        nContratos:              Number(sp.nContratos              ?? 0),
        nProyectos:              Number(sp.nProyectos              ?? 0),
        enEjecucion:             Number(sp.enEjecucion             ?? 0),
        enAOM:                   Number(sp.enAOM                   ?? 0),
        enLiquidacion:           Number(sp.enLiquidacion           ?? 0),
        liquidados:              Number(sp.liquidados              ?? 0),
        perdidaCompetencia:      Number(sp.perdidaCompetencia      ?? 0),
        avanceFisico:            Number(sp.avanceFisico            ?? 0),
        avanceFinanciero:        Number(sp.avanceFinanciero        ?? 0),
        avanceContrato:          Number(sp.avanceContrato          ?? 0),
        avanceFisicoActivos:     Number(sp.avanceFisicoActivos     ?? 0),
        avanceFinancieroActivos: Number(sp.avanceFinancieroActivos ?? 0),
        financiero: {
          valorProyecto:       Number(sp.financiero?.valorProyecto       ?? 0),
          valorDesembolsado:   Number(sp.financiero?.valorDesembolsado   ?? 0),
          valorPorDesembolsar: Number(sp.financiero?.valorPorDesembolsar ?? 0),
          pctDesembolsado:     Number(sp.financiero?.pctDesembolsado     ?? 0),
        },
        usuarios: {
          contratados: Number(sp.usuarios?.contratados ?? 0),
          finales:     Number(sp.usuarios?.finales     ?? 0),
        },
        nFotovoltaicos: Number(sp.nFotovoltaicos ?? 0),
        porFondo:                sp.porFondo ?? [],
        ultimaActualizacion:     sp.ultima_actualizacion ?? "",
      });
      if (sb) setSubData({
        deficitAcumulado: Number(sb.deficitAcumulado ?? 0),
        anio2025: {
          resoluciones: Number(sb.anio2025?.resoluciones ?? 0),
          valorAsignado: Number(sb.anio2025?.valorAsignado ?? 0),
          pendiente: Number(sb.anio2025?.pendiente ?? 0),
          pagado: Number(sb.anio2025?.pagado ?? 0),
        },
        anio2026: {
          resoluciones: Number(sb.anio2026?.resoluciones ?? 0),
          valorAsignado: Number(sb.anio2026?.valorAsignado ?? 0),
          pendiente: Number(sb.anio2026?.pendiente ?? 0),
          pagado: Number(sb.anio2026?.pagado ?? 0),
        },
        ultimaActualizacion: sb.ultima_actualizacion ?? "",
      });
      if (sbh && sbh.data && Array.isArray(sbh.data)) {
        const last = sbh.data[sbh.data.length - 1];
        if (last && last.deficit_acumulado) {
          setSubDeficitFssri(Number(last.deficit_acumulado) * 1e6);
        }
        const series = sbh.data
          .filter((row: any) => row.deficit_acumulado != null)
          .map((row: any) => ({ x: String(row.anio), y: +(Number(row.deficit_acumulado) / 1e3).toFixed(1) }));
        setSubDeficitSeries(series);
        const bar = sbh.data
          .filter((row: any) => row.subsidios != null && row.contribuciones != null)
          .map((row: any) => ({
            anio: String(row.anio),
            Subsidios: +(Number(row.subsidios) / 1e3).toFixed(2),
            Contribuciones: +(Number(row.contribuciones) / 1e3).toFixed(2),
          }));
        setSubBarData(bar);
      }
      if (cu && !cu.error) {
        setCuData({
          cuMayoristaLac: Number(cu.cuMayoristaLac ?? 0),
          cuUsuarioFinal: Number(cu.cuUsuarioFinal ?? 0),
          fecha: cu.fecha ? new Date(cu.fecha).toISOString().split('T')[0] : "",
        });
      }
      if (cue && !cue.error) {
        setCuEvolucionData(cue);
        if (cue.latest) {
          setCuData({
            cuMayoristaLac: cue.latest.cu_total,
            cuUsuarioFinal: cue.latest.cu_usuario_final,
            fecha: cue.latest.fecha,
          });
        }
      }
      if (val && val.resumen) {
        const r = val.resumen as Record<string, number>;
        const porFondoRaw = (val.resumenPorFondo ?? {}) as Record<string, Record<string, number>>;
        
        const extractFondo = (fondoData: Record<string, number> | undefined) => ({
          vf:   fondoData?.["e. VF"]    ?? 0,
          vp:   fondoData?.["d. VP"]    ?? 0,
          vi:   fondoData?.["b. VI"]    ?? 0,
          viSp: fondoData?.["c. VI SP"] ?? 0,
        });
        
        setValData({
          vf:     r["e. VF"]    ?? 0,
          vp:     r["d. VP"]    ?? 0,
          vi:     r["b. VI"]    ?? 0,
          viSp:   r["c. VI SP"] ?? 0,
          otros:  r["a. Otros"] ?? 0,
          ultimaAct: val.ultimaActualizacion ?? "",
          porFondo: {
            FOES: extractFondo(porFondoRaw["FOES"]),
            ZNI:  extractFondo(porFondoRaw["ZNI"]),
            SIN:  extractFondo(porFondoRaw["SIN"]),
          },
        });
      }
      if (fen && !fen.error) {
        setFenData({
          totalCes:            Number(fen.totalCes       ?? 0),
          totalKwp:            Number(fen.totalKwp       ?? 0),
          totalInversion:      Number(fen.totalInversion ?? 0),
          ultimaActualizacion: fen.ultima_actualizacion ?? "",
        });
        setFenDepts(
          (fen.porDepartamento ?? []).map((d: any) => ({
            name:  _ceToReactMapName(String(d.departamentoGeo)),
            count: Number(d.count) || 0,
          }))
        );
        if (fen.porMunicipio && fen.porDepartamento) {
          const rekeyed: Record<string, Array<{ municipio: string; count: number }>> = {};
          for (const dept of fen.porDepartamento) {
            const reactName = _ceToReactMapName(String(dept.departamentoGeo));
            if (fen.porMunicipio[dept.departamentoGeo]) {
              rekeyed[reactName] = fen.porMunicipio[dept.departamentoGeo];
            }
          }
          setFenMunicipios(rekeyed);
        }
      }
    });
  }, []);

  // ── Formatters ───────────────────────────────────────────────────────
  const fmtM = (v: number) => `$${Math.round(v / 1e6).toLocaleString('es-CO')} M`;
  const fmtB = (v: number) => `$${Math.round(v / 1e9)} B`;
  const fmtFull = (v: number) => `$ ${Math.round(v).toLocaleString('es-CO')}`;

  // ── Computed chart data from real API ────────────────────────────────
  const supervisionDonut = supData.porFondo.length > 0
    ? supData.porFondo.slice(0, 6).map((f, i) => ({
        id: f.fondo, label: f.fondo, value: f.contratos,
        color: ['#F59E0B', '#8B5CF6', '#06B6D4', '#22C55E', '#EF4444', '#F97316'][i],
      }))
    : contratosSupervisionDonut;

  const avanceORChart = [
    { avance: 'Av. General', valor: orData.avanceGeneral },
    { avance: 'Av. Financiero', valor: orData.avanceFinanciero },
  ];

  const subsidiosResChart = [
    { año: '2025', Resoluciones: subData.anio2025.resoluciones },
    { año: '2026', Resoluciones: subData.anio2026.resoluciones },
  ];

  const subsidiosValChart = [
    {
      concepto: 'Asignado',
      '2025': Math.round(subData.anio2025.valorAsignado / 1e9),
      '2026': Math.round(subData.anio2026.valorAsignado / 1e9),
    },
    {
      concepto: 'Pendiente',
      '2025': Math.round(subData.anio2025.pendiente / 1e9),
      '2026': Math.round(subData.anio2026.pendiente / 1e9),
    },
  ];

  const presupuestoBar = [{
    categoria: 'Total',
    Comprometido: presuData.totales.pct_comprometido,
    Obligado: presuData.totales.pct_obligado,
    Disponible: Math.max(0, 100 - presuData.totales.pct_comprometido - presuData.totales.pct_obligado),
  }];

  // Embalses map: colores dinámicos por departamento (Opción A: peor embalse define color)
  const embalseSemaforoColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const [dept, embalses] of Object.entries(embalseDetallePorDepto)) {
      const minPct = Math.min(...embalses.map(e => e.porcentaje));
      colors[dept] = getEmbalseColor(minPct);
    }
    return colors;
  }, [embalseDetallePorDepto]);

  // Fenoge map: colores dinámicos por departamento
  const fenCityColors = useMemo(() => {
    if (!fenDepts.length) return {};
    return Object.fromEntries(fenDepts.map(d => [
      d.name,
      d.count >= 6 ? "#F59E0B" : d.count >= 3 ? "#D97706" : "#7C3A0A",
    ]));
  }, [fenDepts]);

  const fenDeptCounts = useMemo(() => Object.fromEntries(fenDepts.map(d => [d.name, d.count])), [fenDepts]);

  // Comunidades map: dynamic colors from real API data
  const cemCityColors = useMemo(() => {
    if (!cemDepts.length) return comunidadesCityColors;
    return Object.fromEntries(cemDepts.map(d => [
      d.name,
      d.count >= 60 ? "#F59E0B" : d.count >= 20 ? "#D97706" : "#7C3A0A",
    ]));
  }, [cemDepts]);

  const cemDeptCounts = useMemo(() => {
    if (!cemDepts.length) return comunidadesEnergeticasPorDepto;
    return Object.fromEntries(cemDepts.map(d => [d.name, d.count]));
  }, [cemDepts]);

  return (
    <div className="min-h-screen bg-theme-primary pt-20 pb-16">
      <HomeSlider
        sectorData={sectorData}
        sectorDetalle={sectorDetalle}
        termicaData={termicaData ?? undefined}
        presuData={presuData}
        cemData={cemData}
        cemDepts={cemDepts}
        orData={orData}
        supData={supData}
        subData={subData}
        deficitFssri={subDeficitFssri}
        deficitSeries={subDeficitSeries}
        subBarData={subBarData}
      />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">

        {/* ══════════════════════════════════════════════════
            ROW 1 · SECTOR ENERGÉTICO (SIN)
        ══════════════════════════════════════════════════ */}
        <div className="mb-5">
          <Card delay={0.05}>
            {/* Título grupal */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gold font-bold uppercase tracking-widest text-xs">SECTOR ENERGÉTICO (SIN)</span>
              <span className="text-[10px] text-theme-muted">{sectorData.ultimaEjecucionETL ?? sectorData.ultimaActualizacion ?? gestionSector.updateTime}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[13fr_7fr] gap-3">

              {/* GESTIÓN DEL SECTOR — 65% del ancho */}
              <div className="bg-dash-chip rounded-xl p-4">
                <CardHeader title="Gestión del sector" link="/energia" time={sectorData.ultimaEjecucionETL ?? sectorData.ultimaActualizacion ?? gestionSector.updateTime} timeLabel="ETL sector energético · última ejecución" />
            <div className="grid grid-cols-3 gap-5">

              {/* Panel 1 · Precio de bolsa → line chart */}
              <div>
                <p className="text-[11px] text-theme-secondary mb-1">Precio de Bolsa</p>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-2xl font-bold text-gold">${sectorData.precioBolsa.toFixed(2)}</span>
                  <span className="text-[10px] text-theme-muted">COP/kWh</span>
                </div>
                {sectorData.fechaPrecio && <p className="text-[9px] text-theme-muted mb-1.5">Dato: {sectorData.fechaPrecio}</p>}
                <div className="h-[130px]">
                  <ResponsiveLine
                    data={sectorDetalle.precioBolsaSeries}
                    theme={T}
                    margin={{ top: 6, right: 4, bottom: 38, left: 32 }}
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
                      tickRotation: -45, // ← Rotar 45 grados para aprovechar espacio
                      tickValues: 'every 5 days',
                      format: (value) => {
                        // Solo mostrar el número del día (1, 2, 3, 4...)
                        const dataPoint = sectorDetalle.precioBolsaSeries[0]?.data.find(d => d.x === value);
                        if (dataPoint?.fecha) {
                          return String(new Date(dataPoint.fecha).getDate());
                        }
                        return value;
                      }
                    }}
                    axisLeft={{ tickSize: 0, tickValues: 3, tickPadding: 6 }}
                    colors={["#F59E0B"]}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.18}
                    useMesh
                    tooltip={({ point }) => {
                      const dataPoint = sectorDetalle.precioBolsaSeries[0]?.data.find(d => d.x === point.data.x);
                      const fecha = dataPoint?.fecha 
                        ? new Date(dataPoint.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
                        : point.data.xFormatted;
                      return (
                        <div className="nt">
                          {fecha}:&nbsp;
                          <strong className="text-gold">${Number(point.data.y).toFixed(2)}</strong>
                        </div>
                      );
                    }}
                  />
                </div>
                <p className="text-[9px] text-theme-muted mt-1">
                  {(() => {
                    const data = sectorDetalle.precioBolsaSeries[0]?.data;
                    if (!data || data.length === 0) return 'Tendencia Marzo 2026';
                    const primera = new Date(data[0].fecha || Date.now());
                    const ultima = new Date(data[data.length - 1].fecha || Date.now());
                    const formato = (f: Date) => f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
                    return `${formato(primera)} - ${formato(ultima)} ${ultima.getFullYear()}`;
                  })()}
                </p>
              </div>

              {/* Panel 2 · Generación por fuente → donut */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[11px] text-theme-secondary">Energía Generada</p>
                  {sectorData.fechaGeneracion && <span className="text-[9px] text-theme-muted">Dato: {sectorData.fechaGeneracion}</span>}
                </div>
                <div className="relative h-[160px]">
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
                    enableArcLinkLabels={false}
                    arcLabelsSkipAngle={15}
                    arcLabelsTextColor="#fff"
                    arcLabelsRadiusOffset={0.75}
                    tooltip={({ datum }) => (
                      <div className="nt">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                        {datum.label}: <strong>{datum.value}%</strong>
                      </div>
                    )}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-theme-primary leading-none">{sectorData.generacionGwh.toFixed(1)}</span>
                    <span className="text-[9px] text-theme-secondary">GWh</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                  {sectorDetalle.generacionPorFuente.map((f) => (
                    <div key={f.id} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                      <span className="text-[9px] text-theme-muted truncate">{f.label} {f.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 3 · Embalses → Colombia map semáforo por departamento */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11px] text-theme-secondary">% Embalses</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: getEmbalseColor(sectorData.pctEmbalses),
                      color: sectorData.pctEmbalses >= 60 ? "#000" : "#fff",
                    }}
                  >
                    {sectorData.pctEmbalses.toFixed(2)}% · {getEmbalseEstado(sectorData.pctEmbalses)}
                  </span>
                </div>
                {sectorData.fechaEmbalse && <p className="text-[9px] text-theme-muted mb-1">Dato: {sectorData.fechaEmbalse}</p>}
                {/* Ficha aportes hídricos vs media histórica */}
                {sectorData.aportesHidricos.historicoGwh > 0 && (() => {
                  const pctAportes = sectorData.aportesHidricos.hsinPct
                    ?? sectorData.aportesHidricos.pct
                    ?? (sectorData.aportesHidricos.actualGwh / sectorData.aportesHidricos.historicoGwh) * 100;
                  const delta = pctAportes - 100;
                  const colorAportes = pctAportes >= 100 ? "#22C55E" : pctAportes >= 90 ? "#06B6D4" : "#EF4444";
                  return (
                    <div className="flex items-center justify-between mb-1.5 bg-theme-primary/30 rounded-lg px-2 py-1">
                      <div>
                        <span className="text-[9px] text-theme-muted">Aportes hídricos vs media hist.</span>
                        {sectorData.fechaAportes && <p className="text-[8px] text-theme-muted/60">Dato: {sectorData.fechaAportes}</p>}
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: colorAportes }}>
                        {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()}
                <div className="w-full flex justify-center">
                  <ColombiaMap
                    type="select-single"
                    size={160}
                    mapColor="#1E3A5F"
                    strokeColor="#0F172A"
                    strokeWidth={0.6}
                    hoverColor="#F97316"
                    selectColor="#F59E0B"
                    cityColors={embalseSemaforoColors}
                    onSelect={(name: string | null) => {
                      if (!name) { setEmbalseDepto(null); return; }
                      const lista = embalseDetallePorDepto[name] ?? [];
                      const minPct = lista.length ? Math.min(...lista.map(e => e.porcentaje)) : 0;
                      setEmbalseDepto({ name, pct: minPct, embalses: lista });
                    }}
                  />
                </div>
                {/* Leyenda riesgo + detalle departamento seleccionado */}
                {embalseDepto ? (
                  <div className="mt-1.5 bg-theme-primary/30 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-theme-secondary uppercase tracking-wider mb-1 truncate">{embalseDepto.name}</p>
                    <div className="flex flex-col gap-0.5 max-h-[72px] overflow-y-auto">
                      {embalseDepto.embalses.length > 0 ? embalseDepto.embalses.map((e) => (
                        <div key={e.nombre} className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getEmbalseColor(e.porcentaje) }} />
                            <span className="text-[8px] text-theme-muted truncate">{e.nombre}</span>
                          </div>
                          <span className="text-[8px] font-bold text-theme-secondary shrink-0">{e.porcentaje.toFixed(0)}%</span>
                        </div>
                      )) : (
                        <span className="text-[8px] text-theme-muted">Sin embalses registrados</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                    {[
                      { color: "#22C55E", label: "Normal" },
                      { color: "#06B6D4", label: "Estable" },
                      { color: "#F59E0B", label: "Alerta" },
                      { color: "#F97316", label: "Delicada" },
                      { color: "#EF4444", label: "Crítico" },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[8px] text-theme-muted">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </div>

              {/* PORTAL ENERGÉTICO — 35% del ancho */}
              <div className="bg-dash-chip rounded-xl p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gold font-bold uppercase tracking-widest text-[11px]">Portal Energético</span>
                    </div>
                    {cuEvolucionData?.latest?.fecha && (
                      <p className="text-[10px] text-theme-muted mt-0.5">Actualizado: {cuEvolucionData.latest.fecha}</p>
                    )}
                  </div>
                  <a
                    href="https://portalenergetico.minenergia.gov.co/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold/30 hover:text-gold transition-colors mt-0.5"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>

                {/* KPIs CU */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-lg px-3 py-2">
                    <p className="text-[8.5px] font-bold tracking-widest text-gold/70 uppercase leading-none mb-1">CU Mayorista LAC</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-gold leading-none">
                        {(cuEvolucionData?.latest?.cu_total ?? cuData.cuMayoristaLac).toFixed(1)}
                      </span>
                      <span className="text-[8px] text-gold/50">COP/kWh</span>
                    </div>
                  </div>
                  <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-lg px-3 py-2">
                    <p className="text-[8.5px] font-bold tracking-widest text-blue-400/70 uppercase leading-none mb-1">CU Usuario Final</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-300 leading-none">
                        {(cuEvolucionData?.latest?.cu_usuario_final ?? cuData.cuUsuarioFinal).toFixed(1)}
                      </span>
                      <span className="text-[8px] text-blue-400/50">COP/kWh</span>
                    </div>
                  </div>
                </div>

                {/* Gráfica evolución CU — últimos 30 días */}
                <div>
                  <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Evolución del Costo Unitario — últimos 30 días</p>
                  <div className="h-[120px]">
                    {(() => {
                      const series = cuEvolucionData?.daily?.series;
                      if (!series || series.length === 0) return (
                        <div className="h-full flex items-center justify-center text-theme-muted text-xs">Cargando evolución del CU…</div>
                      );
                      // Tomar solo los últimos 30 días de cada serie
                      const last30 = series.map(s => ({
                        ...s,
                        data: s.data.slice(-30),
                      }));
                      // Rango de fechas para mostrar debajo
                      const allDates = last30[0]?.data.map(d => String(d.x)) ?? [];
                      const firstDate = allDates[0] ? new Date(allDates[0]) : null;
                      const lastDate = allDates[allDates.length - 1] ? new Date(allDates[allDates.length - 1]) : null;
                      const mesesLabel = (() => {
                        if (!firstDate || !lastDate) return '';
                        const fmt = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
                        return `${fmt(firstDate)} - ${fmt(lastDate)} ${lastDate.getFullYear()}`;
                      })();
                      return (
                        <>
                          <ResponsiveLine
                            data={last30}
                            theme={T}
                            margin={{ top: 4, right: 4, bottom: 28, left: 36 }}
                            xScale={{ type: "point" }}
                            yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
                            curve="monotoneX"
                            enablePoints={false}
                            enableGridX={false}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                              tickSize: 0,
                              tickPadding: 4,
                              tickValues: 'every 10 days',
                              format: (value) => {
                                const d = new Date(String(value));
                                return isNaN(d.getTime()) ? String(value) : String(d.getDate());
                              }
                            }}
                            axisLeft={{ tickSize: 0, tickValues: 3, tickPadding: 6 }}
                            colors={{ datum: "color" }}
                            lineWidth={1}
                            enableArea
                            areaOpacity={0.5}
                            useMesh
                            tooltip={({ point }) => (
                              <div className="nt">
                                <div className="text-theme-muted mb-0.5">
                                  {new Date(String(point.data.x)).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                                <div className="text-gold font-bold">{point.seriesId}: {Number(point.data.y).toFixed(2)} COP/kWh</div>
                              </div>
                            )}
                            legends={[]}
                          />
                          {mesesLabel && (
                            <p className="text-[8px] text-theme-muted text-center mt-0.5">{mesesLabel}</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Leyenda componentes */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: "Generación", c: "#F59E0B" },
                    { label: "Transmisión", c: "#3B82F6" },
                    { label: "Distribución", c: "#10B981" },
                    { label: "Comercialización", c: "#8B5CF6" },
                    { label: "Pérdidas", c: "#EF4444" },
                    { label: "Restricciones", c: "#F97316" },
                  ].map(({ label, c }) => (
                    <div key={label} className="flex items-center gap-0.5">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: c }} />
                      <span className="text-[8px] text-theme-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════
            ROW 2 · COMUNIDADES ENERGÉTICAS
        ══════════════════════════════════════════════════ */}
        <div className="mb-5">
          <Card delay={0.15}>
            {/* Título grupal */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gold font-bold uppercase tracking-widest text-xs">COMUNIDADES ENERGÉTICAS</span>
              <span className="text-[10px] text-theme-muted">{cemData.ultimaActualizacion || comunidades.updateTime}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* COMUNIDADES ENERGÉTICAS */}
              {/* IMPLEMENTADAS */}
              <div className="bg-dash-chip rounded-xl p-4">
            <CardHeader title={comunidades.title} link={comunidades.link} time={cemData.ultimaActualizacion || comunidades.updateTime} />
            <div className="grid grid-cols-3 gap-2 mb-4">
              <KpiChip label="CE Impl." value={cemData.implementadas} accent />
              <KpiChip label="Inv. Estim." value={`$${cemData.inversionEstimada.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} small />
              <KpiChip label="kWp Inst." value={cemData.capacidadKwp.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})} />
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-theme-muted uppercase tracking-wider">CEs por departamento</p>
              {ceDepto && (
                <button onClick={() => setCeDepto(null)} className="text-[9px] text-theme-muted hover:text-theme-secondary underline">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex items-center justify-center">
              <ColombiaMap
                type="select-single"
                size={200}
                mapColor="#1E3A5F"
                strokeColor="#0F172A"
                strokeWidth={0.6}
                hoverColor="#F97316"
                selectColor="#F59E0B"
                cityColors={cemCityColors}
                onSelect={(name: string | null) => {
                  if (!name) return setCeDepto(null);
                  const count = cemDeptCounts[name];
                  if (count !== undefined) setCeDepto({ name, count });
                  else setCeDepto(null);
                }}
              />
            </div>
            {ceDepto ? (
              <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-theme-primary truncate font-semibold">{ceDepto.name}</span>
                  <span className="text-sm font-bold text-gold ml-2 shrink-0">{ceDepto.count} CEs</span>
                </div>
                {cemMunicipios[ceDepto.name] && (
                  <div className="flex flex-wrap gap-1">
                    {cemMunicipios[ceDepto.name].map(m => (
                      <span key={m.municipio} className="text-[9px] bg-amber-500/20 text-gold px-1.5 py-0.5 rounded-full">
                        {m.municipio} {m.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[9px] text-theme-muted text-center mt-2">Click en un departamento para ver detalles</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: "Alta (≥60)", c: "#F59E0B" }, { label: "Media (20-59)", c: "#B45309" },
                { label: "Baja (<20)", c: "#451A03" },
              ].map(({ label, c }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c }} />
                  <span className="text-[9px] text-theme-muted">{label}</span>
                </div>
              ))}
            </div>
              </div>

          {/* CONTRATOS OR 2025 */}
              {/* CONTRATOS OR */}
              <div className="bg-dash-chip rounded-xl p-4">
            <CardHeader title={contratosOR.title} link={contratosOR.link} time={orData.ultimaActualizacion || contratosOR.updateTime} />
            <div className="grid grid-cols-3 gap-2 mb-5">
              <KpiChip label="Contratos" value={orData.nContratos} accent />
              <KpiChip label="Usuarios" value={orData.nUsuarios.toLocaleString('es-CO')} />
              <KpiChip label="N° CEs" value={orData.nCEs.toLocaleString('es-CO')} />
            </div>
            <div className="flex justify-around mb-5">
              <SemiGauge value={orData.avanceFinanciero} label="Avance Financiero" color="gold" size="md" delay={0.22} />
              <SemiGauge value={orData.avanceGeneral} label="Avance General" color="white" size="md" delay={0.27} />
            </div>
            <div>
              <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-2">Comparativo avances (%)</p>
              <div className="h-[110px]">
                <ResponsiveBar
                  data={avanceORChart}
                  keys={["valor"]}
                  indexBy="avance"
                  theme={T}
                  margin={{ top: 4, right: 12, bottom: 24, left: 8 }}
                  padding={0.35}
                  valueScale={{ type: "linear", max: 100 }}
                  indexScale={{ type: "band", round: true }}
                  colors={["#F59E0B", "#8B5CF6"]}
                  colorBy="indexValue"
                  borderRadius={5}
                  enableLabel
                  label={(d) => `${d.value}%`}
                  labelSkipHeight={14}
                  labelTextColor="#fff"
                  enableGridY
                  gridYValues={[0, 25, 50, 75, 100]}
                  axisTop={null}
                  axisRight={null}
                  axisLeft={null}
                  axisBottom={{ tickSize: 0, tickPadding: 8 }}
                  tooltip={({ indexValue, value }) => (
                    <div className="nt">
                      {indexValue}: <strong className="text-gold">{value}%</strong>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-dash-chip rounded-xl p-2.5">
                <p className="text-[9px] text-theme-muted uppercase">Inversión total</p>
                <p className="text-xs font-bold text-theme-primary mt-0.5">${orData.inversionTotal.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-dash-chip rounded-xl p-2.5">
                <p className="text-[9px] text-theme-muted uppercase">Potencia a instalar</p>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">{orData.potenciaTotal.toLocaleString('es-CO', {minimumFractionDigits: 2})} mWp</p>
              </div>
            </div>
              </div>
              {/* FENOGE 1.0, 1.1 */}
              <div className="bg-dash-chip rounded-xl p-4">
                <CardHeader title="Fenoge 1.0, 1.1" link="/fenoge" time={fenData.ultimaActualizacion || undefined} />
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <KpiChip label="CEs Fenoge" value={fenData.totalCes} accent />
                  <KpiChip label="kWp Inst." value={`${Math.round(fenData.totalKwp).toLocaleString("es-CO")}`} />
                  <KpiChip label="Inv. Est." value={`$${(fenData.totalInversion/1e9).toFixed(1)}B`} small />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-theme-muted uppercase tracking-wider">CEs por departamento</p>
                  {fenDepto && (
                    <button onClick={() => setFenDepto(null)} className="text-[9px] text-theme-muted hover:text-theme-secondary underline">
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <ColombiaMap
                    type="select-single"
                    size={200}
                    mapColor="#1E3A5F"
                    strokeColor="#0F172A"
                    strokeWidth={0.6}
                    hoverColor="#F97316"
                    selectColor="#F59E0B"
                    cityColors={fenCityColors}
                    onSelect={(name: string | null) => {
                      if (!name) return setFenDepto(null);
                      const count = fenDeptCounts[name];
                      if (count !== undefined) setFenDepto({ name, count });
                      else setFenDepto(null);
                    }}
                  />
                </div>
                {fenDepto ? (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-theme-primary truncate font-semibold">{fenDepto.name}</span>
                      <span className="text-sm font-bold text-gold ml-2 shrink-0">{fenDepto.count} CEs</span>
                    </div>
                    {fenMunicipios[fenDepto.name] && (
                      <div className="flex flex-wrap gap-1">
                        {fenMunicipios[fenDepto.name].map(m => (
                          <span key={m.municipio} className="text-[9px] bg-amber-500/20 text-gold px-1.5 py-0.5 rounded-full">
                            {m.municipio} {m.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[9px] text-theme-muted text-center mt-2">Click en un departamento para ver detalles</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { label: "Alta (≥6)",  c: "#F59E0B" },
                    { label: "Media (3-5)", c: "#B45309" },
                    { label: "Baja (<3)",   c: "#451A03" },
                  ].map(({ label, c }) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c }} />
                      <span className="text-[9px] text-theme-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════
            ROW 3 · SUBSIDIOS
        ══════════════════════════════════════════════════ */}
        <div className="mb-5">
          <Card delay={0.3}>
            {/* Título grupal */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gold font-bold uppercase tracking-widest text-xs">SUBSIDIOS</span>
              <span className="text-[10px] text-theme-muted">{subData.ultimaActualizacion || subsidios.updateTime}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Panel 1 · Déficit + tendencia histórica */}
              {/* DÉFICIT HISTÓRICO */}
              <div className="bg-dash-chip rounded-xl p-4">
            <CardHeader title="Déficit Histórico" link="/subsidios" time={subData.ultimaActualizacion || subsidios.updateTime} />
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-[10px] text-red-400/70 uppercase tracking-wider">DÉFICIT ACUMULADO — Corte 1 de abril</p>
              <p className="text-xl font-bold text-red-400 mt-1 leading-none">{fmtFull(subDeficitFssri)}</p>
            </div>
            <div>
              <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-2">Evolución histórica del déficit</p>
              <div className="h-[150px]">
                {subDeficitSeries.length > 0 ? (
                  <ResponsiveLine
                    data={[{ id: 'Déficit acumulado', color: '#EF4444', data: subDeficitSeries }]}
                    theme={T}
                    margin={{ top: 8, right: 6, bottom: 28, left: 40 }}
                    xScale={{ type: 'point' }}
                    yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                    curve="monotoneX"
                    enablePoints
                    pointSize={4}
                    pointColor="#EF4444"
                    pointBorderWidth={1}
                    pointBorderColor="transparent"
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 3, format: (v) => `${(v as number).toFixed(0)}B` }}
                    axisBottom={{ tickSize: 0, tickPadding: 6, format: (v) => String(v).slice(-2) }}
                    colors={['#EF4444']}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.15}
                    useMesh
                    tooltip={({ point }) => {
                      const val = (point.data.y as number) * 1e9;
                      return (
                        <div className="nt">
                          {point.data.xFormatted}:&nbsp;
                          <strong className="text-red-400">{fmtFull(val)}</strong>
                        </div>
                      );
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-theme-muted text-xs">Cargando evolución del déficit…</div>
                )}
              </div>
            </div>
              </div>

          {/* Panel 2 · Resoluciones 2025 vs 2026 */}
              {/* DETALLE DE PAGOS */}
              <div className="bg-dash-chip rounded-xl p-4">
            <CardHeader title="Detalle de Pagos" link="/pagos" time={subData.ultimaActualizacion || subsidios.updateTime} />
            {/* Resoluciones 2026 */}
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-gold leading-none">{subData.anio2026.resoluciones}</div>
              <div className="text-sm text-theme-secondary mt-1">resoluciones expedidas</div>
            </div>
            {/* Filas Asignado / Pendiente / Pagado */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center bg-theme-tertiary rounded-lg px-3 py-2.5">
                <span className="text-xs text-theme-muted uppercase tracking-wider">Comprometido en Resoluciones</span>
                <span className="text-sm font-bold text-purple-400">{fmtFull(subData.anio2026.valorAsignado)}</span>
              </div>
              <div className="flex justify-between items-center bg-theme-tertiary rounded-lg px-3 py-2.5 relative group">
                <span className="text-xs text-theme-muted uppercase tracking-wider">Pendiente</span>
                <span className="text-sm font-bold text-red-400">{fmtFull(subData.anio2026.pendiente)} *</span>
                <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-theme-secondary border border-theme-primary rounded-lg px-2 py-1 text-[9px] text-theme-primary whitespace-nowrap z-10 shadow-lg">
                  Pendiente de desembolso por parte del Ministerio de Hacienda y Crédito Público
                </div>
              </div>
              <div className="flex justify-between items-center bg-theme-tertiary rounded-lg px-3 py-2.5">
                <span className="text-xs text-theme-muted uppercase tracking-wider">Pagado</span>
                <span className="text-sm font-bold text-emerald-400">{fmtFull(subData.anio2026.pagado)}</span>
              </div>
            </div>
            {/* Distribución comprometido en resoluciones 2026 */}
            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-2">Distribución comprometido en resoluciones 2026</p>
            {(() => {
              const asig = subData.anio2026.valorAsignado;
              const pag = subData.anio2026.pagado;
              const pend = subData.anio2026.pendiente;
              const pctPag = asig > 0 ? (pag / asig) * 100 : 0;
              const pctPend = asig > 0 ? (pend / asig) * 100 : 0;
              return (
                <>
                  <div className="h-3 bg-theme-tertiary rounded-full overflow-hidden flex mb-1.5">
                    <motion.div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500" initial={{ width: 0 }} animate={{ width: `${pctPag}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                    <motion.div className="h-full bg-gradient-to-r from-red-700 to-red-500" initial={{ width: 0 }} animate={{ width: `${pctPend}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                  </div>
                  <div className="flex justify-between text-[10px] mb-3">
                    <span className="text-emerald-400 font-semibold">{pctPag.toFixed(2)}% Pagado</span>
                    <span className="text-red-400 font-semibold">{pctPend.toFixed(2)}% Pendiente</span>
                  </div>

                </>
              );
            })()}
              </div>

          {/* Panel 3 · Tablero de Validaciones */}
              <div className="bg-dash-chip rounded-xl p-4">
            <CardHeader title="Tablero de Validaciones" link="/validaciones" time={valData?.ultimaAct ? new Date(valData.ultimaAct).toLocaleDateString("es-CO") : (subData.ultimaActualizacion || subsidios.updateTime)} />
            {valData ? (() => {
              // Función para crear datos de gráfico sin "Otros" y con etiquetas correctas
              const createPieData = (fondoData: { vf: number; vp: number; vi: number; viSp: number }) => [
                { id: "VF — Validación Final",                   label: "VF",    value: fondoData.vf,   color: "var(--color-gold)" },
                { id: "VP — Validación Pendiente",               label: "VP",    value: fondoData.vp,   color: "#F59E0B" },
                { id: "VI SP — Validación Inicial Saldos Pendientes", label: "VI SP", value: fondoData.viSp, color: "#78350F" },
                { id: "VI — Validación Inicial",                 label: "VI",    value: fondoData.vi,   color: "#B45309" },
              ].filter(d => d.value > 0);

              const PieChart = ({ data, title }: { data: ReturnType<typeof createPieData>; title: string }) => {
                const total = data.reduce((sum, d) => sum + d.value, 0);
                return (
                  <div className="flex-1 min-w-0">
                    <div className="text-center text-xs font-medium text-theme-muted mb-1">{title}</div>
                    <div className="relative h-[100px]">
                      {total > 0 ? (
                        <ResponsivePie
                          data={data}
                          theme={T}
                          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                          innerRadius={0.55}
                          padAngle={2}
                          cornerRadius={2}
                          activeOuterRadiusOffset={4}
                          colors={{ datum: "data.color" }}
                          borderWidth={0}
                          enableArcLinkLabels={false}
                          enableArcLabels={false}
                          tooltip={({ datum }) => {
                            const pct = total > 0 ? ((datum.value / total) * 100).toFixed(1) : "0.0";
                            return (
                              <div className="bg-theme-secondary border border-theme-primary rounded-lg px-2 py-1 text-xs text-theme-primary shadow-lg">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: datum.color }} />
                                  <span className="font-semibold">{datum.label}</span>
                                </div>
                                <div className="pl-3.5">
                                  <span className="text-gold font-bold">{datum.value.toLocaleString("es-CO")}</span>
                                  <span className="text-theme-secondary ml-1">({pct}%)</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-theme-muted">Sin datos</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-bold text-theme-primary leading-none">{total.toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                  </div>
                );
              };

              const foesData = createPieData(valData.porFondo.FOES);
              const zniData = createPieData(valData.porFondo.ZNI);
              const sinData = createPieData(valData.porFondo.SIN);

              // Totales para KPIs
              const totalVF = valData.porFondo.FOES.vf + valData.porFondo.ZNI.vf + valData.porFondo.SIN.vf;
              const totalVP = valData.porFondo.FOES.vp + valData.porFondo.ZNI.vp + valData.porFondo.SIN.vp;
              const totalVI = valData.porFondo.FOES.vi + valData.porFondo.ZNI.vi + valData.porFondo.SIN.vi;
              const totalViSp = valData.porFondo.FOES.viSp + valData.porFondo.ZNI.viSp + valData.porFondo.SIN.viSp;
              const totalCuentas = totalVF + totalVP + totalVI + totalViSp;

              const KpiItem = ({ label, value, color }: { label: string; value: string; color: string }) => (
                <div className="flex flex-col items-center px-2 py-1 bg-theme-primary/30 rounded-lg min-w-[70px]">
                  <span className="text-xs font-bold" style={{ color }}>{value}</span>
                  <span className="text-[9px] text-theme-muted text-center leading-tight">{label}</span>
                </div>
              );

              return (
                <>
                  <div className="flex gap-2 mb-3">
                    <PieChart data={foesData} title="FOES" />
                    <PieChart data={zniData} title="ZNI" />
                    <PieChart data={sinData} title="SIN" />
                  </div>
                  {/* KPIs */}
                  <div className="grid grid-cols-5 gap-1.5">
                    <KpiItem label="VF" value={totalVF.toLocaleString("es-CO")} color="var(--color-gold)" />
                    <KpiItem label="VP" value={totalVP.toLocaleString("es-CO")} color="#F59E0B" />
                    <KpiItem label="VI" value={totalVI.toLocaleString("es-CO")} color="#B45309" />
                    <KpiItem label="VI SP" value={totalViSp.toLocaleString("es-CO")} color="#78350F" />
                    <KpiItem label="Total" value={totalCuentas.toLocaleString("es-CO")} color="#94A3B8" />
                  </div>
                </>
              );
            })() : (
              <div className="flex items-center justify-center h-40 text-xs text-theme-muted">Cargando validaciones…</div>
            )}
              </div>
            </div>
          </Card>
        </div>


        {/* ══════════════════════════════════════════════════
            ROW 4 · PRESUPUESTO + SUPERVISIÓN
        ══════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-5 mb-5 items-stretch">
          {/* EJECUCIÓN PRESUPUESTAL 2026 */}
          <div className="lg:w-[35%]"><Card delay={0.1} className="h-full">
            <CardHeader title={presupuesto.title} link={presupuesto.link} time={presuData.ultimaActualizacion ? fmtCortePresupuesto(presuData.ultimaActualizacion) : presupuesto.updateTime} />
            <div className="bg-dash-chip rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-theme-muted uppercase tracking-wider">Apropiación Pptal DEE</p>
                  <p className="text-lg font-bold text-gold mt-0.5 leading-tight">{fmtFull(presuData.totales.apropiacion)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-theme-muted uppercase tracking-wider">Ejecución</p>
                  <p className="text-sm font-bold text-theme-primary mt-0.5">
                    {((presuData.totales.obligados / presuData.totales.apropiacion) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bullet Chart Compact */}
            <div className="mb-4">
              <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-2">Distribución presupuestal (%)</p>
              {(() => {
                const pctComp = presuData.totales.pct_comprometido;
                const pctObl = presuData.totales.pct_obligado;
                const pctNoObl = Math.max(0, pctComp - pctObl);
                const pctDisp = Math.max(0, 100 - pctComp);
                return (
                  <>
                    <div className="h-4 bg-theme-tertiary rounded-full overflow-hidden flex">
                      {/* Obligado primero (rojo) */}
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-700 to-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pctObl}%` }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                        title={`Obligado: ${pctObl.toFixed(2)}%`}
                      />
                      {/* Comprometido no obligado (naranja) */}
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${pctNoObl}%` }}
                        transition={{ duration: 0.8, delay: 0.25 }}
                        title={`Comprometido total: ${pctComp.toFixed(2)}% (incluye ${pctObl.toFixed(2)}% obligado)`}
                      />
                      {/* Disponible (gris) */}
                      <div 
                        className="h-full bg-slate-600 flex-1"
                        title={`Disponible: ${pctDisp.toFixed(2)}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] mt-1.5">
                      <span className="text-gold font-semibold">
                        {pctComp.toFixed(2)}% Comp. ({pctObl.toFixed(2)}% obl.)
                      </span>
                      <span className="text-slate-400">
                        {pctDisp.toFixed(2)}% Disponible
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Mini gauges */}
            <div className="flex justify-around mb-4">
              <SemiGauge rawValue={presuData.totales.pct_comprometido} label="% Comprometido" color="gold" size="sm" delay={0.15} />
              <SemiGauge rawValue={presuData.totales.pct_obligado} label="% Obligado" color="muted" size="sm" delay={0.2} />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-500/10 rounded-lg p-2">
                <p className="text-[9px] text-gold/70 uppercase">Comprometido</p>
                <p className="text-xs font-bold text-gold mt-0.5">{fmtFull(presuData.totales.comprometido)}</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2">
                <p className="text-[9px] text-red-400/70 uppercase">Obligado</p>
                <p className="text-xs font-bold text-red-400 mt-0.5">{fmtFull(presuData.totales.obligados)}</p>
              </div>
            </div>
          </Card></div>

          {/* SUPERVISIÓN */}
          <div className="lg:flex-1"><Card delay={0.25} className="h-full">
            <CardHeader title={supervision.title} link={supervision.link} time={supData.ultimaActualizacion || supervision.updateTime} />
            <div className="grid grid-cols-[44%_56%] gap-3">

              {/* COL 1 — Header KPIs + estado del portafolio */}
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <KpiChip label="Contratos" value={supData.nContratos} accent />
                  <KpiChip label="Proyectos" value={supData.nProyectos.toLocaleString('es-CO')} />
                </div>
                <p className="text-[9px] text-theme-muted uppercase tracking-wider mt-0.5">Estado del portafolio</p>
                <StateRow dot="cyan"    label="En Ejecución"    count={supData.enEjecucion}        total={supData.nContratos} />
                <StateRow dot="teal"    label="AOM"             count={supData.enAOM}              total={supData.nContratos} />
                <StateRow dot="amber"   label="En Liquidación"  count={supData.enLiquidacion}      total={supData.nContratos} />
                <StateRow dot="emerald" label="Liquidados"      count={supData.liquidados}         total={supData.nContratos} />
                <StateRow dot="rose"    label="Perdida Comp."   count={supData.perdidaCompetencia} total={supData.nContratos} />
              </div>

              {/* COL 2 — Gauges + Donut */}
              <div className="flex flex-col gap-2">
                {/* Portafolio gauges */}
                <div>
                  <p className="text-[9px] text-theme-muted uppercase tracking-wider mb-0.5">Portafolio</p>
                  <div className="flex justify-around">
                    <SemiGauge value={supData.avanceFisico}       label="Físico"      color="success" size="sm" delay={0.27} />
                    <SemiGauge value={supData.avanceFinanciero}   label="Financiero"  color="success" size="sm" delay={0.30} />
                  </div>
                </div>
                {/* En Ejecución gauges */}
                <div>
                  <p className="text-[9px] text-theme-muted uppercase tracking-wider mb-0.5">En Ejecución</p>
                  <div className="flex justify-around">
                    <SemiGauge value={supData.avanceFisicoActivos}       label="Físico"     color="gold" size="sm" delay={0.33} />
                    <SemiGauge value={supData.avanceFinancieroActivos}   label="Financiero" color="gold" size="sm" delay={0.36} />
                  </div>
                </div>
                {/* Donut por fondo */}
                <div>
                  <p className="text-[9px] text-theme-muted uppercase tracking-wider mb-0.5">Por fondo</p>
                  <div className="relative h-[105px]">
                    <ResponsivePie
                      data={supervisionDonut}
                      theme={T}
                      margin={{ top: 4, right: 78, bottom: 4, left: 4 }}
                      innerRadius={0.6}
                      padAngle={2}
                      cornerRadius={3}
                      activeOuterRadiusOffset={4}
                      colors={{ datum: "data.color" }}
                      borderWidth={0}
                      enableArcLinkLabels={false}
                      arcLabelsSkipAngle={20}
                      arcLabelsTextColor="#fff"
                      arcLabelsRadiusOffset={0.75}
                      legends={[{
                        anchor: "right" as const,
                        direction: "column" as const,
                        justify: false,
                        translateX: 74,
                        translateY: 0,
                        itemsSpacing: 4,
                        itemWidth: 70,
                        itemHeight: 13,
                        itemTextColor: "#94A3B8",
                        itemDirection: "left-to-right" as const,
                        symbolSize: 7,
                        symbolShape: "circle" as const,
                      }]}
                      tooltip={({ datum }) => (
                        <div className="nt">
                          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                          {datum.label}: <strong>{datum.value}</strong>
                        </div>
                      )}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingRight: 78 }}>
                      <span className="text-sm font-bold text-theme-primary">{supData.nContratos}</span>
                      <span className="text-[9px] text-theme-secondary">total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card></div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-theme-muted mt-10">
          Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
        </p>
      </main>
    </div>
  );
}
