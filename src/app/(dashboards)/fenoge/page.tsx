"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import * as XLSX from "xlsx";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { getNivoTheme } from "@/lib/nivo-theme";
import type { FenogePunto } from "./FenogeCEMap";

const FenogeCEMap = dynamic(() => import("./FenogeCEMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-dash-chip rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-theme-muted text-xs">Cargando mapa…</span>
    </div>
  ),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5 hover:border-amber-500/40 transition-colors duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function KpiChip({ label, value, avg, avgLabel, accent = false }: {
  label: string; value: string | number; avg?: string; avgLabel?: string; accent?: boolean;
}) {
  const strLen = String(value).length;
  const fontClass = strLen <= 8 ? "text-xl" : strLen <= 13 ? "text-base" : "text-sm";
  return (
    <div className="bg-dash-chip rounded-xl px-4 py-3">
      <div className={`${fontClass} font-bold leading-tight break-all ${accent ? "text-gold" : "text-theme-primary"}`}>{value}</div>
      <div className="text-[11px] text-theme-muted mt-1.5 leading-tight">{label}</div>
      {avg && (
        <div className="mt-2 pt-2 border-t border-white/[0.07] flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-gold/90 leading-none">{avg}</span>
          <span className="text-[9px] text-theme-muted leading-none">{avgLabel ?? "/ CE"}</span>
        </div>
      )}
    </div>
  );
}

const fmtCOP = (v: number) => `$ ${Math.round(v).toLocaleString("es-CO")}`;

const _GEO_TO_MAP: Record<string, string> = {
  "AMAZONAS": "Amazonas", "ANTIOQUIA": "Antioquia", "ARAUCA": "Arauca",
  "ATLANTICO": "Atlántico", "BOLIVAR": "Bolívar", "BOYACA": "Boyacá",
  "CALDAS": "Caldas", "CAQUETA": "Caquetá", "CASANARE": "Casanare",
  "CAUCA": "Cauca", "CESAR": "Cesar", "CHOCO": "Chocó", "CORDOBA": "Córdoba",
  "CUNDINAMARCA": "Cundinamarca", "GUAINIA": "Guainía", "GUAVIARE": "Guaviar",
  "HUILA": "Huila", "LA GUAJIRA": "La Guajira", "MAGDALENA": "Magdalena",
  "META": "Meta", "NARINO": "Nariño", "NORTE DE SANTANDER": "Norte de Santander",
  "PUTUMAYO": "Putumayo", "QUINDIO": "Quindío", "RISARALDA": "Risaralda",
  "SANTANDER": "Santander", "SANTAFE DE BOGOTA D.C": "Distrito Capital de Bogotá",
  "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA": "San Andrés, Providencia y Santa Catalina",
  "SUCRE": "Sucre", "TOLIMA": "Tolima", "VALLE DEL CAUCA": "Valle del Cauca",
  "VAUPES": "Vaupés", "VICHADA": "Vichada",
};

// ─── Fase colors ──────────────────────────────────────────────────────────────
const FASE_COLORS: Record<string, string> = {
  "1_0": "#F59E0B",
  "1_1": "#06B6D4",
  "CE":  "#8B5CF6",
  "Sin clasificar": "#475569",
};
const FASE_LABELS: Record<string, string> = {
  "1_0": "Fenoge 1.0", "1_1": "Fenoge 1.1", "CE": "CE",
};
type FaseFilter = "TODOS" | "1_0" | "1_1" | "CE";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DetalleFase {
  departamento: string;
  departamentoGeo: string;
  fase: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface DptoRow {
  departamento: string;
  departamentoGeo: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface MuniRow {
  municipio: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface DeptAvg {
  avgKwp: number | null;
  avgBenef: number | null;
  avgInv: number | null;
  sumBenef: number;
}
interface FenogeMapa {
  totalCes: number;
  totalKwp: number;
  avgKwp: number | null;
  totalBenef: number;
  avgBenef: number | null;
  totalInversion: number;
  avgInversion: number | null;
  porDepartamento: DptoRow[];
  detalleFase: DetalleFase[];
  puntos: FenogePunto[];
  porMunicipio: Record<string, MuniRow[]>;
  deptAvgs: Record<string, DeptAvg>;
}
interface SegRow {
  region: string;
  contrato: string;
  comunidad: string;
  fecha: string;
  realAcum: number | null;
  programadoAcum: number | null;
  usuarios: number;
  potencia: number;
}
interface SegData {
  regiones: string[];
  contratos: string[];
  comunidades: string[];
  data: SegRow[];
}

/** Último mes visible en la curva S (debe coincidir con backend) */
const SEGUIMIENTO_FECHA_CORTE = "2026-08-01";

const DEFAULT_MAPA: FenogeMapa = {
  totalCes: 61, totalKwp: 20645, avgKwp: null,
  totalBenef: 11939, avgBenef: null,
  totalInversion: 126271165180, avgInversion: null,
  porDepartamento: [], detalleFase: [], puntos: [], porMunicipio: {}, deptAvgs: {},
};
const DEFAULT_SEG: SegData = { regiones: [], contratos: [], comunidades: [], data: [] };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FenogePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const T = getNivoTheme(isDark);

  const [mapa, setMapa]       = useState<FenogeMapa>(DEFAULT_MAPA);
  const [seg, setSeg]         = useState<SegData>(DEFAULT_SEG);
  const [geoData, setGeoData] = useState<object | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>("");
  const [selectedDept, setSelectedDept]   = useState<string | null>(null);
  const [selectedFase, setSelectedFase]   = useState<FaseFilter>("TODOS");
  const [segRegion, setSegRegion]         = useState<string>("TODOS");
  const [segContrato, setSegContrato]     = useState<string>("TODOS");
  const [segComunidad, setSegComunidad]   = useState<string>("TODOS");

  // Leer parámetros de URL (para capturas Playwright con filtros)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("departamento")) setSelectedDept(sp.get("departamento")!);
    if (sp.has("fase"))        setSelectedFase(sp.get("fase")! as FaseFilter);
    if (sp.has("region"))      setSegRegion(sp.get("region")!);
    if (sp.has("contrato"))    setSegContrato(sp.get("contrato")!);
    if (sp.has("comunidad"))   setSegComunidad(sp.get("comunidad")!);
  }, []);

  useEffect(() => {
    fetch("/departamentos_colombia.geojson").then(r => r.json()).then(setGeoData).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/fenoge")
      .then(r => r.json())
      .then((raw) => {
        if (raw.error) return;
        setMapa({
          totalCes:       Number(raw.totalCes)       || 0,
          totalKwp:       Number(raw.totalKwp)       || 0,
          avgKwp:         raw.avgKwp != null ? Number(raw.avgKwp) : null,
          totalBenef:     Number(raw.totalBenef)     || 0,
          avgBenef:       raw.avgBenef != null ? Number(raw.avgBenef) : null,
          totalInversion: Number(raw.totalInversion) || 0,
          avgInversion:   raw.avgInversion != null ? Number(raw.avgInversion) : null,
          porDepartamento: (raw.porDepartamento ?? []).map((d: any) => ({
            departamento: String(d.departamento), departamentoGeo: String(d.departamentoGeo),
            count: Number(d.count) || 0, capacidad: Number(d.capacidad) || 0, inversion: Number(d.inversion) || 0,
          })),
          detalleFase: (raw.detalleFase ?? []).map((d: any) => ({
            departamento: String(d.departamento), departamentoGeo: String(d.departamentoGeo),
            fase: String(d.fase), count: Number(d.count) || 0,
            capacidad: Number(d.capacidad) || 0, inversion: Number(d.inversion) || 0,
          })),
          puntos: (raw.puntos ?? []).map((p: any) => ({
            nombre: String(p.nombre || ""), municipio: String(p.municipio || ""),
            departamentoGeo: String(p.departamentoGeo || ""),
            fase: String(p.fase || "Sin clasificar"),
            lat: Number(p.lat), lng: Number(p.lng),
            capacidad: p.capacidad != null ? Number(p.capacidad) : null,
          })),
          porMunicipio: Object.fromEntries(
            Object.entries(raw.porMunicipio ?? {}).map(([dept, munis]: [string, any]) => [
              dept,
              (munis as any[]).map((m: any) => ({
                municipio: String(m.municipio || ""),
                count: Number(m.count) || 0,
                capacidad: Number(m.capacidad) || 0,
                inversion: Number(m.inversion) || 0,
              })),
            ])
          ),
          deptAvgs: Object.fromEntries(
            Object.entries(raw.deptAvgs ?? {}).map(([dept, v]: [string, any]) => [
              dept,
              {
                avgKwp:   v.avgKwp   != null ? Number(v.avgKwp)   : null,
                avgBenef: v.avgBenef != null ? Number(v.avgBenef) : null,
                avgInv:   v.avgInv   != null ? Number(v.avgInv)   : null,
                sumBenef: Number(v.sumBenef) || 0,
              },
            ])
          ),
        });
      if (raw.ultima_actualizacion) setUltimaActualizacion(String(raw.ultima_actualizacion ?? ""));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/fenoge/seguimiento", { cache: "no-store", signal: ctrl.signal })
      .then(r => r.json())
      .then((raw) => {
        if (raw.error) return;
        setSeg({
          regiones:    raw.regiones    ?? [],
          contratos:   raw.contratos   ?? [],
          comunidades: raw.comunidades ?? [],
          data: (raw.data ?? []).map((d: Record<string, unknown>) => ({
            region:         String(d.region ?? ""),
            contrato:       String(d.contrato ?? ""),
            comunidad:      String(d.comunidad ?? ""),
            fecha:          String(d.fecha ?? ""),
            realAcum:       d.realAcum != null ? Number(d.realAcum) : null,
            programadoAcum: d.programadoAcum != null ? Number(d.programadoAcum) : null,
            usuarios:       Number(d.usuarios) || 0,
            potencia:       Number(d.potencia) || 0,
          })),
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  // ─── Filtrado principal (fase + dept) ────────────────────────────────────────
  const filteredDetalle = useMemo(() => {
    let d = mapa.detalleFase;
    if (selectedFase !== "TODOS") d = d.filter(r => r.fase === selectedFase);
    if (selectedDept) d = d.filter(r => r.departamentoGeo === selectedDept);
    return d;
  }, [mapa.detalleFase, selectedDept, selectedFase]);

  const kpiFiltered = useMemo(() => {
    if (!selectedDept && selectedFase === "TODOS") return null;
    return {
      totalCes:       filteredDetalle.reduce((s, r) => s + r.count,     0),
      totalKwp:       filteredDetalle.reduce((s, r) => s + r.capacidad, 0),
      totalInversion: filteredDetalle.reduce((s, r) => s + r.inversion, 0),
    };
  }, [filteredDetalle, selectedDept, selectedFase]);

  const filteredByDept = useMemo(() => {
    let src = mapa.detalleFase;
    if (selectedFase !== "TODOS") src = src.filter(r => r.fase === selectedFase);
    const m = new Map<string, DptoRow>();
    for (const r of src) {
      const prev = m.get(r.departamentoGeo);
      if (prev) { prev.count += r.count; prev.capacidad += r.capacidad; prev.inversion += r.inversion; }
      else m.set(r.departamentoGeo, { departamento: r.departamento, departamentoGeo: r.departamentoGeo, count: r.count, capacidad: r.capacidad, inversion: r.inversion });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [mapa.detalleFase, selectedFase]);

  const puntosFiltered = useMemo(() => {
    let p = mapa.puntos;
    if (selectedFase !== "TODOS") p = p.filter(r => r.fase === selectedFase);
    if (selectedDept) p = p.filter(r => r.departamentoGeo === selectedDept);
    return p;
  }, [mapa.puntos, selectedFase, selectedDept]);

  const deptColors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const d of filteredByDept) {
      result[d.departamentoGeo] = d.count >= 10 ? "#F59E0B" : d.count >= 4 ? "#D97706" : "#7C3A0A";
    }
    return result;
  }, [filteredByDept]);

  const top12 = selectedDept
    ? filteredByDept.filter(d => d.departamentoGeo === selectedDept)
    : filteredByDept.slice(0, 12);

  const barDataCE = top12.slice().sort((a, b) => b.count - a.count)
    .map(d => ({
      dept: d.departamentoGeo.length > 18 ? d.departamentoGeo.slice(0, 18) + "…" : d.departamentoGeo,
      "CEs": d.count,
      "kWp (÷10)": +(d.capacidad / 10).toFixed(0),
    })).reverse();

  const top12inv = selectedDept
    ? filteredByDept.filter(d => d.departamentoGeo === selectedDept)
    : [...filteredByDept].sort((a, b) => b.inversion - a.inversion).slice(0, 12);

  const barDataInv = top12inv.slice().sort((a, b) => b.inversion - a.inversion)
    .map(d => ({
      dept: d.departamentoGeo.length > 18 ? d.departamentoGeo.slice(0, 18) + "…" : d.departamentoGeo,
      "Inversión B$": d.inversion,
    })).reverse();

  const muniTableData: MuniRow[] | null = selectedDept ? (mapa.porMunicipio[selectedDept] ?? []) : null;
  const tableData = selectedDept ? filteredByDept.filter(d => d.departamentoGeo === selectedDept) : filteredByDept;

  const faseCounts = useMemo(() => {
    const base = selectedDept ? mapa.detalleFase.filter(d => d.departamentoGeo === selectedDept) : mapa.detalleFase;
    return Object.fromEntries(["1_0","1_1","CE"].map(f => [f, base.filter(d => d.fase === f).reduce((s,r) => s+r.count, 0)]));
  }, [mapa.detalleFase, selectedDept]);

  const displayKpi = {
    totalCes:       kpiFiltered?.totalCes       ?? mapa.totalCes,
    totalKwp:       kpiFiltered?.totalKwp       ?? mapa.totalKwp,
    totalInversion: kpiFiltered?.totalInversion ?? mapa.totalInversion,
    totalBenef:     selectedDept ? (mapa.deptAvgs[selectedDept]?.sumBenef ?? mapa.totalBenef) : mapa.totalBenef,
  };

  const activeAvgKwp  = selectedDept ? (mapa.deptAvgs[selectedDept]?.avgKwp  ?? mapa.avgKwp)  : mapa.avgKwp;
  const activeAvgBenef= selectedDept ? (mapa.deptAvgs[selectedDept]?.avgBenef?? mapa.avgBenef) : mapa.avgBenef;
  const activeAvgInv  = selectedDept ? (mapa.deptAvgs[selectedDept]?.avgInv  ?? mapa.avgInversion) : mapa.avgInversion;

  const selectedDeptLabel = selectedDept
    ? selectedDept.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")
    : null;

  // ─── Seguimiento chart ────────────────────────────────────────────────────────
  const contratosEnRegion = useMemo(() => {
    if (segRegion === "TODOS") return seg.contratos;
    const enRegion = new Set(
      seg.data
        .filter(d => d.region === segRegion && (d.realAcum !== null || d.programadoAcum !== null))
        .map(d => d.contrato)
    );
    return seg.contratos.filter(c => enRegion.has(c));
  }, [seg, segRegion]);

  const comunidadesEnContrato = useMemo(() => {
    let rows = seg.data;
    if (segRegion !== "TODOS") rows = rows.filter(d => d.region === segRegion);
    if (segContrato !== "TODOS") rows = rows.filter(d => d.contrato === segContrato);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.comunidad && (r.realAcum !== null || r.programadoAcum !== null)) set.add(r.comunidad);
    }
    return [...set].sort();
  }, [seg, segRegion, segContrato]);

  useEffect(() => {
    if (segComunidad === "TODOS") return;
    if (!comunidadesEnContrato.includes(segComunidad)) {
      setSegComunidad("TODOS");
    }
  }, [segComunidad, comunidadesEnContrato]);

  const seguimientoSeries = useMemo(() => {
    let filtered = seg.data.filter(d => !d.fecha || d.fecha <= SEGUIMIENTO_FECHA_CORTE);
    if (segRegion    !== "TODOS") filtered = filtered.filter(d => d.region    === segRegion);
    if (segContrato  !== "TODOS") filtered = filtered.filter(d => d.contrato  === segContrato);
    if (segComunidad !== "TODOS") filtered = filtered.filter(d => d.comunidad === segComunidad);

    const allDates = [...new Set(filtered.map(d => d.fecha).filter((f): f is string => !!f))].sort();
    const n = allDates.length;
    const dateIdx = new Map(allDates.map((d, i) => [d, i] as const));

    // Series por contrato/comunidad para poder forward-fillear cada una por separado
    const byKey = new Map<string, { real: (number | null)[]; prog: (number | null)[] }>();
    for (const row of filtered) {
      if (!row.fecha) continue;
      const key = `${row.contrato}||${row.comunidad}`;
      if (!byKey.has(key)) byKey.set(key, { real: Array<number | null>(n).fill(null), prog: Array<number | null>(n).fill(null) });
      const e = byKey.get(key)!;
      const i = dateIdx.get(row.fecha)!;
      e.real[i] = row.realAcum;
      e.prog[i] = row.programadoAcum;
    }

    // realAcum es acumulado → máximo monotónico + forward-fill de nulls.
    // null ANTES del primer reporte: excluir del promedio (contrato no ha empezado).
    // null DESPUÉS del primer reporte: mantener último valor (el avance acumulado no retrocede).
    for (const e of byKey.values()) {
      let lr: number | null = null, lp: number | null = null;
      for (let i = 0; i < n; i++) {
        const r = e.real[i], p = e.prog[i];
        if (r !== null) { lr = lr === null ? r : Math.max(lr, r); e.real[i] = lr; }
        else if (lr !== null) { e.real[i] = lr; }
        if (p !== null) { lp = lp === null ? p : Math.max(lp, p); e.prog[i] = lp; }
        else if (lp !== null) { e.prog[i] = lp; }
      }
    }

    // Promediar por fecha solo los contratos que tienen dato en esa fecha
    const contracts = [...byKey.values()];
    const realData = allDates.flatMap((d, i) => {
      const vals = contracts.map(c => c.real[i]).filter((v): v is number => v !== null);
      return vals.length > 0 ? [{ x: d, y: +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) }] : [];
    });
    const progData = allDates.flatMap((d, i) => {
      const vals = contracts.map(c => c.prog[i]).filter((v): v is number => v !== null);
      return vals.length > 0 ? [{ x: d, y: +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) }] : [];
    });

    return [
      { id: "Avance Programado Acumulado", color: "#06B6D4", data: progData },
      { id: "Avance Real Acumulado",       color: "#F59E0B", data: realData },
    ];
  }, [seg, segRegion, segContrato, segComunidad]);

  /** KPIs dinámicos de usuarios y potencia filtrados por los mismos criterios que la curva S */
  const segKpiFiltered = useMemo(() => {
    let filtered = seg.data.filter(d => !d.fecha || d.fecha <= SEGUIMIENTO_FECHA_CORTE);
    if (segRegion    !== "TODOS") filtered = filtered.filter(d => d.region    === segRegion);
    if (segContrato  !== "TODOS") filtered = filtered.filter(d => d.contrato  === segContrato);
    if (segComunidad !== "TODOS") filtered = filtered.filter(d => d.comunidad === segComunidad);

    // Tomar el valor MAX de usuarios/potencia por contrato+comunidad (evitar filas con 0)
    const maxByKey = new Map<string, { usuarios: number; potencia: number }>();
    for (const row of filtered) {
      const key = `${row.contrato}||${row.comunidad}`;
      const prev = maxByKey.get(key);
      if (!prev) {
        maxByKey.set(key, { usuarios: row.usuarios, potencia: row.potencia });
      } else {
        if (row.usuarios > prev.usuarios) prev.usuarios = row.usuarios;
        if (row.potencia > prev.potencia) prev.potencia = row.potencia;
      }
    }
    let totalUsuarios = 0;
    let totalPotencia = 0;
    for (const val of maxByKey.values()) {
      totalUsuarios += val.usuarios;
      totalPotencia += val.potencia;
    }
    return { totalUsuarios, totalPotencia };
  }, [seg, segRegion, segContrato, segComunidad]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Fenoge 1.0, 1.1"
      downloadTablero="fenoge" subtitle={`Comunidades energéticas — Programa Fenoge${ultimaActualizacion ? "  ·  Última actualización: " + ultimaActualizacion : ""}`}
      downloadParams={{ departamento: selectedDept || '', fase: selectedFase, region: segRegion, contrato: segContrato, comunidad: segComunidad }}>

      {/* ── Row 1: KPIs ── */}
      <Card delay={0.05} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">INDICADORES GENERALES</span>
          <div className="flex items-center gap-2">
            {selectedDept && (
              <span className="flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-gold px-2.5 py-1 rounded-full border border-amber-500/30">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                {selectedDeptLabel}
              </span>
            )}
            {selectedFase !== "TODOS" && (
              <span className="text-[10px] px-2.5 py-1 rounded-full border" style={{ background: FASE_COLORS[selectedFase]+"22", color: FASE_COLORS[selectedFase], borderColor: FASE_COLORS[selectedFase]+"55" }}>
                {FASE_LABELS[selectedFase] ?? selectedFase}
              </span>
            )}
            {(selectedDept || selectedFase !== "TODOS") && (
              <button onClick={() => { setSelectedDept(null); setSelectedFase("TODOS"); }}
                className="text-[10px] text-theme-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiChip label="CEs Fenoge" value={displayKpi.totalCes.toLocaleString("es-CO")} accent />
          <KpiChip label="Inversión Estimada" value={fmtCOP(displayKpi.totalInversion)}
            avg={activeAvgInv != null ? fmtCOP(activeAvgInv) : undefined} avgLabel="promedio / CE" />
          <KpiChip label="Capacidad Instalada" value={`${Math.round(displayKpi.totalKwp).toLocaleString("es-CO")} kWp`}
            avg={activeAvgKwp != null ? `${activeAvgKwp.toFixed(1)} kWp` : undefined} avgLabel="promedio / CE" />
          <KpiChip label="Beneficiarios" value={displayKpi.totalBenef.toLocaleString("es-CO")}
            avg={activeAvgBenef != null ? `${activeAvgBenef.toFixed(0)}` : undefined} avgLabel="promedio / CE" />
        </div>
      </Card>

      {/* ── Row 2: Mapa + filtro fase ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">

        {/* Mapa Colombia */}
        <Card delay={0.1} className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CES — MAPA DE UBICACIÓN</span>
            {selectedDept && (
              <button onClick={() => setSelectedDept(null)} className="text-[10px] text-theme-muted hover:text-gold transition-colors">← Ver todos</button>
            )}
          </div>
          <div className="h-[380px]">
            <FenogeCEMap
              geoData={geoData}
              puntos={puntosFiltered}
              selectedDept={selectedDept}
              isDark={isDark}
              deptColors={deptColors}
              onSelectDept={setSelectedDept}
              porDepartamento={mapa.porDepartamento}
              deptAvgs={mapa.deptAvgs}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-3">
              {[
                { label: "Fenoge 1.0", c: "#F59E0B" },
                { label: "Fenoge 1.1", c: "#06B6D4" },
                { label: "CE",         c: "#8B5CF6" },
              ].map(({ label, c }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  <span className="text-[9px] text-theme-muted">{label}</span>
                </div>
              ))}
            </div>
            <span className="text-[9px] text-theme-muted italic">Click en dpto. para filtrar</span>
          </div>
        </Card>

        {/* Panel filtro fase */}
        <Card delay={0.12} className="lg:col-span-2">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] block mb-3">FILTRO POR FASE</span>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([
              { key: "TODOS", label: "Todos" },
              { key: "1_0",   label: "Fenoge 1.0" },
              { key: "1_1",   label: "Fenoge 1.1" },
              { key: "CE",    label: "CE" },
            ] as { key: FaseFilter; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setSelectedFase(key)}
                className={`rounded-xl px-3 py-2.5 text-left transition-all border ${
                  selectedFase === key
                    ? "border-amber-500/60 bg-amber-500/15"
                    : "border-theme-card bg-dash-chip hover:border-amber-500/30"
                }`}>
                <div className={`text-xs font-bold ${selectedFase === key ? "text-gold" : "text-theme-primary"}`}>{label}</div>
                {key !== "TODOS" && (
                  <div className="text-[10px] text-theme-muted mt-0.5">
                    {(faseCounts as any)[key] ?? 0} CEs
                  </div>
                )}
                {key === "TODOS" && (
                  <div className="text-[10px] text-theme-muted mt-0.5">{displayKpi.totalCes} CEs</div>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {(["1_0","1_1","CE"] as const).map(fase => {
              const rows = mapa.detalleFase.filter(d =>
                d.fase === fase && (!selectedDept || d.departamentoGeo === selectedDept)
              );
              const tot = rows.reduce((s, r) => s + r.count, 0);
              const kwp = rows.reduce((s, r) => s + r.capacidad, 0);
              const inv = rows.reduce((s, r) => s + r.inversion, 0);
              const pct = (tot / (displayKpi.totalCes || 1)) * 100;
              const c   = FASE_COLORS[fase];
              return (
                <div key={fase} className="bg-dash-chip rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: c }}>{FASE_LABELS[fase] ?? fase}</span>
                    <span className="text-[11px] font-bold text-theme-primary">{tot} <span className="text-theme-muted font-normal">CEs</span></span>
                  </div>
                  <div className="h-1.5 bg-theme-secondary rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-theme-muted">
                    <span>{Math.round(kwp).toLocaleString("es-CO")} kWp</span>
                    <span>{fmtCOP(inv)}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Bar charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.15}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
            {selectedDept ? `CEs — ${selectedDeptLabel}` : "CES POR DEPARTAMENTO"}
          </span>
          <div className="h-[300px] mt-3">
            {barDataCE.length > 0 ? (
              <ResponsiveBar
                data={barDataCE}
                keys={["CEs", "kWp (÷10)"]}
                indexBy="dept"
                theme={T}
                groupMode="grouped"
                margin={{ top: 8, right: 20, bottom: 20, left: 130 }}
                layout="horizontal"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#F59E0B", "#06B6D4"]}
                borderRadius={3}
                padding={0.25}
                enableLabel={false}
                enableGridX enableGridY={false}
                axisTop={null} axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                tooltip={({ id, value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                    <strong>{indexValue}</strong> — {id}: <strong style={{ color: "#F59E0B" }}>{value}</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center"><span className="text-theme-muted text-sm">Sin datos</span></div>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            {[{ label: "N° CEs", c: "#F59E0B" }, { label: "kWp instalados ÷10", c: "#06B6D4" }].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-theme-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.18}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
            {selectedDept ? `INVERSIÓN — ${selectedDeptLabel}` : "INVERSIÓN POR DEPARTAMENTO"}
          </span>
          <div className="h-[300px] mt-3">
            {barDataInv.length > 0 ? (
              <ResponsiveBar
                data={barDataInv}
                keys={["Inversión B$"]}
                indexBy="dept"
                theme={T}
                margin={{ top: 8, right: 20, bottom: 20, left: 130 }}
                layout="horizontal"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#8B5CF6"]}
                borderRadius={3}
                padding={0.3}
                enableLabel
                label={(d) => `$${Number(d.value).toLocaleString("es-CO")}`}
                labelSkipWidth={80}
                labelTextColor="#fff"
                enableGridX enableGridY={false}
                axisTop={null} axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5, format: (v) => `$${(Number(v) / 1e9).toFixed(0)}B` }}
                tooltip={({ value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                    <strong>{indexValue}</strong>: <strong style={{ color: "#8B5CF6" }}>${Number(value).toLocaleString("es-CO")}</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center"><span className="text-theme-muted text-sm">Sin datos</span></div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 4: Tabla ── */}
      <Card delay={0.2} className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
              {selectedDept ? `DETALLE POR MUNICIPIO — ${selectedDeptLabel}` : "DETALLE POR DEPARTAMENTO"}
            </span>
            <span className="text-[10px] text-theme-muted">
              {selectedDept ? `${muniTableData?.length ?? 0} municipios` : `${tableData.length} departamentos`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDept && (
              <button onClick={() => setSelectedDept(null)} className="text-[10px] text-theme-muted hover:text-gold transition-colors">← Ver todos</button>
            )}
            <button
              onClick={() => {
                if (selectedDept && muniTableData) {
                  const exportData = [...muniTableData].sort((a,b) => b.count-a.count).map(m => ({
                    "Departamento": selectedDept, "Municipio": m.municipio,
                    "N° CEs": m.count, "Capacidad (kWp)": m.capacidad, "Inversión Estimada ($)": m.inversion,
                  }));
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Fenoge Municipios");
                  XLSX.writeFile(wb, `fenoge_municipios_${selectedDept.replace(/ /g,"_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.xlsx`);
                } else {
                  const exportData = [...tableData].sort((a,b) => b.count-a.count).map(d => ({
                    "Departamento": d.departamentoGeo, "N° CEs": d.count,
                    "Capacidad (kWp)": d.capacidad, "Inversión Estimada ($)": d.inversion,
                  }));
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Fenoge");
                  XLSX.writeFile(wb, `fenoge_comunidades_${new Date().toISOString().split("T")[0]}.xlsx`);
                }
              }}
              className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {selectedDept && muniTableData ? (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-theme-muted text-left">
                  <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Municipio</th>
                  <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">N° CEs</th>
                  <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">Capacidad (kWp)</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Inversión estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-card">
                {[...muniTableData].sort((a,b) => b.count-a.count).map((m) => (
                  <tr key={m.municipio} className="text-theme-secondary">
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">
                      {m.municipio.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden">
                          <div style={{ width: `${Math.min((m.count/(muniTableData[0]?.count||1))*100, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="text-gold font-semibold w-8 text-right">{m.count}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-cyan-400">{Math.round(m.capacidad).toLocaleString("es-CO")}</td>
                    <td className="py-2.5 text-right text-purple-400">{fmtCOP(m.inversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-theme-muted text-left">
                  <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Departamento</th>
                  <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">N° CEs</th>
                  <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">Capacidad (kWp)</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Inversión estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-card">
                {tableData.sort((a,b) => b.count-a.count).map((d) => (
                  <motion.tr key={d.departamentoGeo}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => setSelectedDept(prev => prev === d.departamentoGeo ? null : d.departamentoGeo)}
                    className={`text-theme-secondary transition-colors cursor-pointer ${selectedDept === d.departamentoGeo ? "bg-amber-500/10" : "hover:bg-dash-chip"}`}>
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">
                      {d.departamentoGeo.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden">
                          <div style={{ width: `${Math.min((d.count/(tableData[0]?.count||1))*100, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="text-gold font-semibold w-8 text-right">{d.count}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-cyan-400">{Math.round(d.capacidad).toLocaleString("es-CO")}</td>
                    <td className="py-2.5 text-right text-purple-400">{fmtCOP(d.inversion)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
          {!selectedDept && tableData.length === 0 && (
            <div className="text-center text-theme-muted text-sm py-8">Sin datos para el filtro seleccionado</div>
          )}
        </div>
      </Card>

      {/* ── Row 5: Seguimiento ── */}
      <Card delay={0.25}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <span className="text-gold font-bold uppercase tracking-widest text-[11px] block">
              AVANCE DE OBRA — SEGUIMIENTO ACUMULADO
            </span>
            <span className="text-[10px] text-theme-muted mt-0.5">
              Avance de obra real vs programado acumulado (%) · Datos hasta agosto 2026
              {segComunidad !== "TODOS"
                ? ` · ${segComunidad}`
                : segContrato !== "TODOS"
                  ? ` · Contrato: ${segContrato}`
                  : segRegion !== "TODOS"
                    ? ` · Región: ${segRegion}`
                    : " · Todos los contratos (promedio)"}
            </span>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-theme-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                Programado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                Real
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* KPIs dinámicos de usuarios y potencia */}
            <KpiChip label="Número de usuarios" value={segKpiFiltered.totalUsuarios.toLocaleString("es-CO")} />
            <KpiChip label="Potencia total instalada" value={`${segKpiFiltered.totalPotencia.toLocaleString("es-CO")} kWp`} accent />
            <div className="w-px h-8 bg-white/10 mx-1" />
            {/* Filtro región */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-theme-muted">Región:</span>
              <select
                value={segRegion}
                onChange={e => { setSegRegion(e.target.value); setSegContrato("TODOS"); setSegComunidad("TODOS"); }}
                className="text-[10px] bg-dash-chip border border-theme-card text-theme-primary rounded-lg px-2 py-1 cursor-pointer hover:border-amber-500/40 transition-colors"
              >
                <option value="TODOS">Todas</option>
                {seg.regiones.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {/* Filtro contrato */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-theme-muted">Contrato:</span>
              <select
                value={segContrato}
                onChange={e => { setSegContrato(e.target.value); setSegComunidad("TODOS"); }}
                className="text-[10px] bg-dash-chip border border-theme-card text-theme-primary rounded-lg px-2 py-1 cursor-pointer hover:border-amber-500/40 transition-colors max-w-[200px]"
              >
                <option value="TODOS">Todos</option>
                {contratosEnRegion.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Filtro comunidad */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-theme-muted">Comunidad:</span>
              <select
                value={segComunidad}
                onChange={e => setSegComunidad(e.target.value)}
                className="text-[10px] bg-dash-chip border border-theme-card text-theme-primary rounded-lg px-2 py-1 cursor-pointer hover:border-amber-500/40 transition-colors max-w-[220px]"
                disabled={comunidadesEnContrato.length === 0}
              >
                <option value="TODOS">Todas</option>
                {comunidadesEnContrato.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(segRegion !== "TODOS" || segContrato !== "TODOS" || segComunidad !== "TODOS") && (
              <button onClick={() => { setSegRegion("TODOS"); setSegContrato("TODOS"); setSegComunidad("TODOS"); }}
                className="text-[10px] text-theme-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="h-[320px]">
          {seguimientoSeries[0].data.length > 0 || seguimientoSeries[1].data.length > 0 ? (
            <ResponsiveLine
              data={seguimientoSeries}
              theme={T}
              margin={{ top: 12, right: 20, bottom: 44, left: 52 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto" }}
              curve="monotoneX"
              enablePoints={false}
              enableGridX={false}
              enableGridY
              axisTop={null}
              axisRight={null}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickValues: 5,
                format: (v) => `${(v as number).toFixed(0)}%`,
                legend: "% Acumulado",
                legendOffset: -44,
                legendPosition: "middle",
              }}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: -35,
                tickValues: seguimientoSeries[0].data.map(d => d.x as string),
                format: (v) => {
                  const [y, m, day] = String(v).split("-").map(Number);
                  const d = new Date(y, m - 1, day);
                  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
                },
              }}
              colors={{ datum: "color" }}
              lineWidth={2.5}
              enableArea
              areaOpacity={0.08}
              useMesh
              tooltip={({ point }) => {
                const [y, m, day] = String(point.data.x).split("-").map(Number);
                const d = new Date(y, m - 1, day);
                const fecha = isNaN(d.getTime())
                  ? String(point.data.x)
                  : d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
                return (
                  <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                    <div className="text-theme-muted text-[10px] mb-1">{fecha}</div>
                    <div style={{ color: point.seriesColor }}>
                      <strong>{point.seriesId}</strong>: {Number(point.data.y).toFixed(2)}%
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-theme-muted text-sm">Sin datos para el filtro seleccionado</span>
            </div>
          )}
        </div>

        {/* Botones rápidos por región */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-theme-card">
          <span className="text-[10px] text-theme-muted self-center">Acceso rápido por región:</span>
          {["TODOS", ...seg.regiones].map(r => (
            <button key={r}
              onClick={() => { setSegRegion(r); setSegContrato("TODOS"); setSegComunidad("TODOS"); }}
              className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                segRegion === r
                  ? "bg-amber-500/15 border-amber-500/40 text-gold"
                  : "bg-dash-chip border-theme-card text-theme-muted hover:border-amber-500/30"
              }`}>
              {r === "TODOS" ? "Todas las regiones" : r}
            </button>
          ))}
        </div>
      </Card>

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}
