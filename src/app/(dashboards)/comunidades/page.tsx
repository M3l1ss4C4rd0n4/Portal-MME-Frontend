"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ResponsiveBar } from "@nivo/bar";
import * as XLSX from 'xlsx';
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";

const ComunidadesMap = dynamic(() => import("./ComunidadesMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-dash-chip rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-theme-muted text-xs">Cargando mapa…</span>
    </div>
  ),
});
import type { CePunto } from "./ComunidadesMap";

import { getNivoTheme } from "@/lib/nivo-theme";

// ─── Helpers ──────────────────────────────────────────────────────────────
function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5 hover:border-amber-500/40 transition-colors duration-300 ${className}`}>
      {children}
    </motion.div>
  );
}
function KpiChip({ label, value, avg, avgLabel, accent = false }: { label: string; value: string | number; avg?: string; avgLabel?: string; accent?: boolean }) {
  const strLen = String(value).length;
  const fontClass = strLen <= 8 ? "text-xl" : strLen <= 13 ? "text-base" : "text-sm";
  return (
    <div className="bg-dash-chip rounded-xl px-4 py-3">
      <div className={`${fontClass} font-bold leading-tight break-all ${accent ? "text-amber-400" : "text-theme-primary"}`}>{value}</div>
      <div className="text-[11px] text-theme-muted mt-1.5 leading-tight">{label}</div>
      {avg && (
        <div className="mt-2 pt-2 border-t border-white/[0.07] flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-amber-400/90 leading-none">{avg}</span>
          <span className="text-[9px] text-theme-muted leading-none">{avgLabel ?? "/ CE"}</span>
        </div>
      )}
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────
const fmtCOP = (v: number) => `$ ${Math.round(v).toLocaleString("es-CO")}`;
const fmtFull = fmtCOP;

// ─── GeoName → @react-map/colombia key ───────────────────────────────────
const _GEO_TO_MAP: Record<string, string> = {
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
  "GUAVIARE": "Guaviar",
  "HUILA": "Huila",
  "LA GUAJIRA": "La Guajira",
  "MAGDALENA": "Magdalena",
  "META": "Meta",
  "NARINO": "Nariño",
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
function _toReactMapName(geo: string): string {
  return _GEO_TO_MAP[geo] ?? geo;
}

// ─── Types ────────────────────────────────────────────────────────────────
interface DetalleZona {
  departamento: string;
  departamentoGeo: string;
  zona: string;
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
  avgCap: number | null;
  avgUsu: number | null;
  avgBenef: number | null;
  avgInv: number | null;
  sumUsu: number;
  sumBenef: number;
}
interface DptoRow {
  departamento: string;
  departamentoGeo: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface ComunidadesData {
  implementadas: number;
  inversionEstimada: number;
  capacidadKwp: number;
  usuariosEquiv: number;
  beneficiariosEquiv: number;
  avgCapacidad: number | null;
  avgUsuarios: number | null;
  avgBeneficiarios: number | null;
  avgInversion: number | null;
  porDepartamento: DptoRow[];
  detalleZona: DetalleZona[];
  puntos: CePunto[];
  porMunicipio: Record<string, MuniRow[]>;
  deptAvgs: Record<string, DeptAvg>;
}
const DEFAULT: ComunidadesData = {
  implementadas: 469,
  inversionEstimada: 290379880159.74,
  capacidadKwp: 12837.12,
  usuariosEquiv: 16358,
  beneficiariosEquiv: 97112,
  avgCapacidad: 33.6,
  avgUsuarios: 35.8,
  avgBeneficiarios: 212.5,
  avgInversion: 772300000,
  porDepartamento: [],
  detalleZona: [],
  puntos: [],
  porMunicipio: {},
  deptAvgs: {},
};

type ZonaFilter = "TODOS" | "SIN" | "MIXTO" | "ZNI";
const ZONA_COLORS: Record<string, string> = {
  SIN: "#F59E0B",
  MIXTO: "#06B6D4",
  ZNI: "#8B5CF6",
  "Sin clasificar": "#475569",
};
const ZONA_LABELS: Record<string, string> = {
  TODOS: "Todos", SIN: "SIN", MIXTO: "MIXTO", ZNI: "ZNI",
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ComunidadesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const T = getNivoTheme(isDark);

  const [data, setData] = useState<ComunidadesData>(DEFAULT);
  const [selectedDept, setSelectedDept] = useState<string | null>(null); // NOMBRE_DPT del GeoJSON
  const [selectedZona, setSelectedZona] = useState<ZonaFilter>("TODOS");
  const [geoData, setGeoData] = useState<object | null>(null);

  // Cargar GeoJSON departamentos
  useEffect(() => {
    fetch("/departamentos_colombia.geojson").then(r => r.json()).then(setGeoData).catch(() => {});
  }, []);

  // Cargar datos API
  useEffect(() => {
    fetch("/api/comunidades/")
      .then((r) => r.json())
      .then((raw) => {
        setData({
          implementadas: Number(raw.implementadas) || DEFAULT.implementadas,
          inversionEstimada: Number(raw.inversionEstimada) || DEFAULT.inversionEstimada,
          capacidadKwp: Number(raw.capacidadKwp) || DEFAULT.capacidadKwp,
          usuariosEquiv: Number(raw.usuariosEquiv) || DEFAULT.usuariosEquiv,
          beneficiariosEquiv: Number(raw.beneficiariosEquiv) || DEFAULT.beneficiariosEquiv,
          avgCapacidad: raw.avgCapacidad != null ? Number(raw.avgCapacidad) : DEFAULT.avgCapacidad,
          avgUsuarios: raw.avgUsuarios != null ? Number(raw.avgUsuarios) : DEFAULT.avgUsuarios,
          avgBeneficiarios: raw.avgBeneficiarios != null ? Number(raw.avgBeneficiarios) : DEFAULT.avgBeneficiarios,
          avgInversion: raw.avgInversion != null ? Number(raw.avgInversion) : DEFAULT.avgInversion,
          porDepartamento: (raw.porDepartamento || []).map((d: any) => ({
            departamento: String(d.departamento),
            departamentoGeo: String(d.departamentoGeo),
            count: Number(d.count) || 0,
            capacidad: Number(d.capacidad) || 0,
            inversion: Number(d.inversion) || 0,
          })),
          detalleZona: (raw.detalleZona || []).map((d: any) => ({
            departamento: String(d.departamento),
            departamentoGeo: String(d.departamentoGeo),
            zona: String(d.zona),
            count: Number(d.count) || 0,
            capacidad: Number(d.capacidad) || 0,
            inversion: Number(d.inversion) || 0,
          })),
          puntos: (raw.puntos || []).map((p: any) => ({
            nombre: String(p.nombre || ""),
            municipio: String(p.municipio || ""),
            departamentoGeo: String(p.departamentoGeo || ""),
            zona: String(p.zona || "Sin clasificar"),
            lat: Number(p.lat),
            lng: Number(p.lng),
            capacidad: p.capacidad != null ? Number(p.capacidad) : null,
          })),
          porMunicipio: Object.fromEntries(
            Object.entries(raw.porMunicipio || {}).map(([dept, munis]: [string, any]) => [
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
            Object.entries(raw.deptAvgs || {}).map(([dept, v]: [string, any]) => [
              dept,
              {
                avgCap:   v.avgCap   != null ? Number(v.avgCap)   : null,
                avgUsu:   v.avgUsu   != null ? Number(v.avgUsu)   : null,
                avgBenef: v.avgBenef != null ? Number(v.avgBenef) : null,
                avgInv:   v.avgInv   != null ? Number(v.avgInv)   : null,
                sumUsu:   Number(v.sumUsu)   || 0,
                sumBenef: Number(v.sumBenef) || 0,
              },
            ])
          ),
        });
      })
      .catch(() => {});
  }, []);

  // ─── Datos filtrados (zona + dept) ───────────────────────────────────────
  const filteredDetalle = useMemo(() => {
    let d = data.detalleZona;
    if (selectedZona !== "TODOS") d = d.filter((r) => r.zona === selectedZona);
    if (selectedDept) d = d.filter((r) => r.departamentoGeo === selectedDept);
    return d;
  }, [data.detalleZona, selectedDept, selectedZona]);

  // KPIs filtrados
  const kpiFiltered = useMemo(() => {
    if (selectedDept === null && selectedZona === "TODOS") return null; // usar globales
    return {
      implementadas: filteredDetalle.reduce((s, r) => s + r.count, 0),
      capacidadKwp: filteredDetalle.reduce((s, r) => s + r.capacidad, 0),
      inversionEstimada: filteredDetalle.reduce((s, r) => s + r.inversion, 0),
    };
  }, [filteredDetalle, selectedDept, selectedZona]);

  // porDepartamento filtrado por zona (para barras y tabla)
  const filteredByDept = useMemo(() => {
    let src = data.detalleZona;
    if (selectedZona !== "TODOS") src = src.filter((r) => r.zona === selectedZona);
    // Agrupar por dpto
    const m = new Map<string, DptoRow>();
    for (const r of src) {
      const prev = m.get(r.departamentoGeo);
      if (prev) { prev.count += r.count; prev.capacidad += r.capacidad; prev.inversion += r.inversion; }
      else m.set(r.departamentoGeo, { departamento: r.departamento, departamentoGeo: r.departamentoGeo, count: r.count, capacidad: r.capacidad, inversion: r.inversion });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [data.detalleZona, selectedZona]);

  // Puntos filtrados para el mapa Leaflet
  const puntosFiltered = useMemo(() => {
    let p = data.puntos;
    if (selectedZona !== "TODOS") p = p.filter((r) => r.zona === selectedZona);
    if (selectedDept) p = p.filter((r) => r.departamentoGeo === selectedDept);
    return p;
  }, [data.puntos, selectedZona, selectedDept]);

  // Colores de departamento para el GeoJSON (mismo esquema que el mapa anterior)
  const deptColors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const d of filteredByDept) {
      result[d.departamentoGeo] = d.count >= 60 ? "#F59E0B" : d.count >= 20 ? "#D97706" : "#7C3A0A";
    }
    return result;
  }, [filteredByDept]);

  // Top 12 para barras
  const top12 = selectedDept
    ? filteredByDept.filter((d) => d.departamentoGeo === selectedDept)
    : filteredByDept.slice(0, 12);

  const barDataCE = top12
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((d) => ({
      dept: d.departamentoGeo.length > 18 ? d.departamentoGeo.slice(0, 18) + "…" : d.departamentoGeo,
      "CEs": d.count,
      "kWp (÷10)": +(d.capacidad / 10).toFixed(0),
    }))
    .reverse(); // Nivo horizontal dibuja de abajo hacia arriba; reverse para mayor arriba

  const top12inv = selectedDept
    ? filteredByDept.filter((d) => d.departamentoGeo === selectedDept)
    : [...filteredByDept].sort((a, b) => b.inversion - a.inversion).slice(0, 12);

  const barDataInv = top12inv
    .slice()
    .sort((a, b) => b.inversion - a.inversion)
    .map((d) => ({
      dept: d.departamentoGeo.length > 18 ? d.departamentoGeo.slice(0, 18) + "…" : d.departamentoGeo,
      "Inversión B$": +(d.inversion / 1e9).toFixed(1),
    }))
    .reverse();

  const muniTableData: MuniRow[] | null = selectedDept
    ? (data.porMunicipio[selectedDept] ?? [])
    : null;
  const tableData = selectedDept
    ? filteredByDept.filter((d) => d.departamentoGeo === selectedDept)
    : filteredByDept;

  // Conteo de zonas para badges del filtro
  const zonaCounts = useMemo(() => {
    const base = selectedDept
      ? data.detalleZona.filter((d) => d.departamentoGeo === selectedDept)
      : data.detalleZona;
    return { SIN: 0, MIXTO: 0, ZNI: 0, ...Object.fromEntries(["SIN","MIXTO","ZNI"].map(z => [z, base.filter(d => d.zona === z).reduce((s,r) => s+r.count, 0)])) };
  }, [data.detalleZona, selectedDept]);

  const displayKpi = {
    implementadas: kpiFiltered?.implementadas ?? data.implementadas,
    inversionEstimada: kpiFiltered?.inversionEstimada ?? data.inversionEstimada,
    capacidadKwp: kpiFiltered?.capacidadKwp ?? data.capacidadKwp,
    usuariosEquiv: selectedDept
      ? (data.deptAvgs[selectedDept]?.sumUsu ?? data.usuariosEquiv)
      : data.usuariosEquiv,
    beneficiariosEquiv: selectedDept
      ? (data.deptAvgs[selectedDept]?.sumBenef ?? data.beneficiariosEquiv)
      : data.beneficiariosEquiv,
  };

  // Promedios activos según filtro de departamento
  const activeAvgInv   = selectedDept ? (data.deptAvgs[selectedDept]?.avgInv   ?? data.avgInversion)     : data.avgInversion;
  const activeAvgCap   = selectedDept ? (data.deptAvgs[selectedDept]?.avgCap   ?? data.avgCapacidad)     : data.avgCapacidad;
  const activeAvgUsu   = selectedDept ? (data.deptAvgs[selectedDept]?.avgUsu   ?? data.avgUsuarios)      : data.avgUsuarios;
  const activeAvgBenef = selectedDept ? (data.deptAvgs[selectedDept]?.avgBenef ?? data.avgBeneficiarios) : data.avgBeneficiarios;

  const selectedDeptLabel = selectedDept
    ? selectedDept.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")
    : null;

  return (
    <DashboardLayout title="Comunidades Energéticas" subtitle="Soluciones energéticas implementadas en zonas no interconectadas">

      {/* ── Row 1: KPIs ── */}
      <Card delay={0.05} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">INDICADORES GENERALES</span>
          <div className="flex items-center gap-2">
            {selectedDept && (
              <span className="flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                {selectedDeptLabel}
              </span>
            )}
            {selectedZona !== "TODOS" && (
              <span className="text-[10px] px-2.5 py-1 rounded-full border" style={{ background: ZONA_COLORS[selectedZona]+"22", color: ZONA_COLORS[selectedZona], borderColor: ZONA_COLORS[selectedZona]+"55" }}>
                Zona {selectedZona}
              </span>
            )}
            {(selectedDept || selectedZona !== "TODOS") && (
              <button onClick={() => { setSelectedDept(null); setSelectedZona("TODOS"); }}
                className="text-[10px] text-theme-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiChip label="CEs Implementadas" value={displayKpi.implementadas.toLocaleString("es-CO")} accent />
          <KpiChip label="Inversión Estimada" value={fmtCOP(displayKpi.inversionEstimada)} accent
            avg={activeAvgInv != null ? fmtCOP(activeAvgInv) : undefined}
            avgLabel="promedio / CE" />
          <KpiChip label="Capacidad Instalada" value={`${Math.round(displayKpi.capacidadKwp).toLocaleString("es-CO")} kWp`}
            avg={activeAvgCap != null ? `${activeAvgCap.toFixed(1)} kWp` : undefined}
            avgLabel="promedio / CE (no nulos)" />
          <KpiChip label="Usuarios Equiv." value={`${displayKpi.usuariosEquiv.toLocaleString("es-CO")} mil`}
            avg={activeAvgUsu != null ? `${activeAvgUsu.toFixed(1)} mil` : undefined}
            avgLabel="promedio / CE (no nulos)" />
          <KpiChip label="Beneficiarios" value={`${displayKpi.beneficiariosEquiv.toLocaleString("es-CO")} mil`}
            avg={activeAvgBenef != null ? `${activeAvgBenef.toFixed(1)} mil` : undefined}
            avgLabel="promedio / CE (no nulos)" />
        </div>
      </Card>

      {/* ── Row 2: Mapa + filtro zona ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">

        {/* Mapa Colombia */}
        <Card delay={0.1} className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">CES — MAPA DE UBICACIÓN</span>
            {selectedDept && (
              <button onClick={() => setSelectedDept(null)}
                className="text-[10px] text-theme-muted hover:text-amber-400 transition-colors">
                ← Ver todos
              </button>
            )}
          </div>
          <div className="h-[380px]">
            <ComunidadesMap
              geoData={geoData}
              puntos={puntosFiltered}
              selectedDept={selectedDept}
              isDark={isDark}
              deptColors={deptColors}
              onSelectDept={setSelectedDept}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-3">
              {[{ label: "SIN", c: "#F59E0B" }, { label: "MIXTO", c: "#06B6D4" }, { label: "ZNI", c: "#8B5CF6" }].map(({ label, c }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  <span className="text-[9px] text-theme-muted">{label}</span>
                </div>
              ))}
            </div>
            <span className="text-[9px] text-theme-muted italic">Click en dpto. para filtrar</span>
          </div>
        </Card>

        {/* Panel zona + desglose */}
        <Card delay={0.12} className="lg:col-span-2">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px] block mb-3">FILTRO POR ZONA</span>

          {/* Botones zona */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["TODOS", "SIN", "MIXTO", "ZNI"] as ZonaFilter[]).map((z) => (
              <button key={z}
                onClick={() => setSelectedZona(z)}
                className={`rounded-xl px-3 py-2.5 text-left transition-all border ${
                  selectedZona === z
                    ? "border-amber-500/60 bg-amber-500/15"
                    : "border-theme-card bg-dash-chip hover:border-amber-500/30"
                }`}>
                <div className={`text-xs font-bold ${selectedZona === z ? "text-amber-400" : "text-theme-primary"}`}>
                  {ZONA_LABELS[z]}
                </div>
                {z !== "TODOS" && (
                  <div className="text-[10px] text-theme-muted mt-0.5">
                    {zonaCounts[z as keyof typeof zonaCounts] ?? 0} CEs
                  </div>
                )}
                {z === "TODOS" && (
                  <div className="text-[10px] text-theme-muted mt-0.5">
                    {displayKpi.implementadas} CEs
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Mini tabla zonas para el dpto seleccionado (o global) */}
          <div className="space-y-2">
            {["SIN", "MIXTO", "ZNI"].map((z) => {
              const rows = data.detalleZona.filter(d =>
                d.zona === z && (!selectedDept || d.departamentoGeo === selectedDept)
              );
              const tot = rows.reduce((s, r) => s + r.count, 0);
              const kwp = rows.reduce((s, r) => s + r.capacidad, 0);
              const inv = rows.reduce((s, r) => s + r.inversion, 0);
              const pct = (tot / (displayKpi.implementadas || 1)) * 100;
              return (
                <div key={z} className="bg-dash-chip rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: ZONA_COLORS[z] }}>{z}</span>
                    <span className="text-[11px] font-bold text-theme-primary">{tot} <span className="text-theme-muted font-normal">CEs</span></span>
                  </div>
                  <div className="h-1.5 bg-theme-secondary rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: ZONA_COLORS[z] }} />
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
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            {selectedDept ? `CEs — ${selectedDeptLabel}` : "CEs POR DEPARTAMENTO (TOP 12)"}
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
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                tooltip={({ id, value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }}>
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
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            {selectedDept ? `INVERSIÓN — ${selectedDeptLabel}` : "INVERSIÓN POR DEPARTAMENTO (TOP 12)"}
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
                label={(d) => `$${d.value}B`}
                labelSkipWidth={30}
                labelTextColor="#fff"
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5, format: (v) => `$${v}B` }}
                tooltip={({ value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }}>
                    <strong>{indexValue}</strong>: <strong style={{ color: "#8B5CF6" }}>${value}B</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center"><span className="text-theme-muted text-sm">Sin datos</span></div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 4: Detailed table ── */}
      <Card delay={0.2}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
              {selectedDept ? `DETALLE POR MUNICIPIO — ${selectedDeptLabel}` : "DETALLE POR DEPARTAMENTO"}
            </span>
            <span className="text-[10px] text-theme-muted">
              {selectedDept
                ? `${muniTableData?.length ?? 0} municipios`
                : `${tableData.length} departamentos`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDept && (
              <button onClick={() => setSelectedDept(null)}
                className="text-[10px] text-theme-muted hover:text-amber-400 transition-colors">
                ← Ver todos
              </button>
            )}
          <button
            onClick={() => {
              if (selectedDept && muniTableData) {
                const exportData = [...muniTableData]
                  .sort((a, b) => b.count - a.count)
                  .map(m => ({
                    'Departamento': selectedDept,
                    'Municipio': m.municipio,
                    'N° CEs': m.count,
                    'Capacidad (kWp)': m.capacidad,
                    'Inversión Estimada ($)': m.inversion,
                  }));
                const totalCEs = muniTableData.reduce((s, m) => s + m.count, 0);
                const totalCap = muniTableData.reduce((s, m) => s + m.capacidad, 0);
                const totalInv = muniTableData.reduce((s, m) => s + m.inversion, 0);
                exportData.push({ 'Departamento': 'TOTAL', 'Municipio': '', 'N° CEs': totalCEs, 'Capacidad (kWp)': totalCap, 'Inversión Estimada ($)': totalInv });
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Municipios');
                XLSX.writeFile(wb, `comunidades_municipios_${selectedDept.replace(/ /g,"_").toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
              } else {
                const exportData = [...tableData]
                  .sort((a, b) => b.count - a.count)
                  .map(d => ({
                    'Departamento': d.departamentoGeo,
                    'N° CEs': d.count,
                    'Capacidad (kWp)': d.capacidad,
                    'Inversión Estimada ($)': d.inversion,
                  }));
                const totalCEs = tableData.reduce((sum, d) => sum + d.count, 0);
                const totalCapacidad = tableData.reduce((sum, d) => sum + d.capacidad, 0);
                const totalInversion = tableData.reduce((sum, d) => sum + d.inversion, 0);
                exportData.push({ 'Departamento': 'TOTAL', 'N° CEs': totalCEs, 'Capacidad (kWp)': totalCapacidad, 'Inversión Estimada ($)': totalInversion });
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Comunidades Energeticas');
                XLSX.writeFile(wb, `comunidades_energeticas_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            /* ── Vista municipios ── */
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
                {[...muniTableData].sort((a, b) => b.count - a.count).map((m, i) => (
                  <motion.tr key={m.municipio} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.02 }}
                    className="text-theme-secondary">
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">
                      {m.municipio.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden">
                          <div style={{ width: `${Math.min((m.count / (muniTableData[0]?.count || 1)) * 100, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="text-amber-400 font-semibold w-8 text-right">{m.count}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-cyan-400">{Math.round(m.capacidad).toLocaleString("es-CO")}</td>
                    <td className="py-2.5 text-right text-purple-400">{fmtCOP(m.inversion)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── Vista departamentos ── */
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
                {tableData.sort((a, b) => b.count - a.count).map((d, i) => (
                  <motion.tr key={d.departamentoGeo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.02 }}
                    onClick={() => setSelectedDept(prev => prev === d.departamentoGeo ? null : d.departamentoGeo)}
                    className={`text-theme-secondary transition-colors cursor-pointer ${selectedDept === d.departamentoGeo ? "bg-amber-500/10" : "hover:bg-dash-chip"}`}>
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">
                      {d.departamentoGeo.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden">
                          <div style={{ width: `${Math.min((d.count / (tableData[0]?.count || 1)) * 100, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="text-amber-400 font-semibold w-8 text-right">{d.count}</span>
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

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}

