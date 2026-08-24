"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ResponsiveBar } from "@nivo/bar";
import * as XLSX from 'xlsx';
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import BaseKpiChip, { type KpiChipProps } from "@/components/dashboard/KpiChip";
import { useGeoFilter } from "@/context/GeoFilterContext";
import { fetchDepartamentos } from "@/services/apiService";
import { normDeptKey } from "@/lib/departamentos";
import type { DptoRow } from "@/types/mapa-departamentos";

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
function KpiChip(props: Omit<KpiChipProps, "padding" | "dynamicSize">) {
  return <BaseKpiChip padding="lg" dynamicSize {...props} />;
}

// ─── AccordionSection (collapsible filter panel) ─────────────────────────
function AccordionSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2.5 border-b border-white/[0.06] pb-2.5 last:border-0 last:pb-0 last:mb-0">
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left py-1.5 text-[11px] font-semibold text-theme-primary hover:text-gold transition-colors">
        <span>{title}</span>
        <span className="flex items-center gap-2">
          <span className="text-[10px] text-theme-muted font-normal">{count}</span>
          <svg className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}

function FilterItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
        active
          ? "bg-amber-500/15 text-gold border border-amber-500/30"
          : "text-theme-secondary hover:bg-dash-chip hover:text-theme-primary border border-transparent"
      }`}>
      <span className="truncate mr-2">{label}</span>
      <span className={`shrink-0 text-[10px] ${active ? 'text-gold' : 'text-theme-muted'}`}>{count}</span>
    </button>
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
interface EstadoRow {
  estado: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface TipoCERow {
  tipo: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface FuenteRow {
  fuente: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface ZonaRow {
  zona: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface EtniaRow {
  etnia: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface EjecutorRow {
  ejecutor: string;
  count: number;
  capacidad: number;
  inversion: number;
}
interface StatsFechas {
  min_registro: string | null;
  max_registro: string | null;
  min_operacion: string | null;
  max_operacion: string | null;
  con_registro: number;
  con_operacion: number;
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
  porEstado: EstadoRow[];
  porTipoCE: TipoCERow[];
  porFuenteEnergia: FuenteRow[];
  porZona: ZonaRow[];
  porEtnia: EtniaRow[];
  porEjecutor: EjecutorRow[];
  statsFechas: StatsFechas;
  puntos: CePunto[];
  porMunicipio: Record<string, MuniRow[]>;
  deptAvgs: Record<string, DeptAvg>;
}
const DEFAULT: ComunidadesData = {
  implementadas: 589,
  inversionEstimada: 268894557486.09,
  capacidadKwp: 81804.125,
  usuariosEquiv: 24716,
  beneficiariosEquiv: 263952.7,
  avgCapacidad: 138.89,
  avgUsuarios: 41.96,
  avgBeneficiarios: 448.14,
  avgInversion: 1018539990.48,
  porDepartamento: [],
  detalleZona: [],
  porEstado: [],
  porTipoCE: [],
  porFuenteEnergia: [],
  porZona: [],
  porEtnia: [],
  porEjecutor: [],
  statsFechas: { min_registro: null, max_registro: null, min_operacion: null, max_operacion: null, con_registro: 0, con_operacion: 0 },
  puntos: [],
  porMunicipio: {},
  deptAvgs: {},
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ComunidadesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const T = getNivoTheme(isDark);

  const [data, setData] = useState<ComunidadesData>(DEFAULT);
  const [geoData, setGeoData] = useState<object | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>("");

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
            estado_actual: String(p.estado_actual || ""),
            tipo_ce: String(p.tipo_ce || ""),
            fuentes_energia: String(p.fuentes_energia || ""),
            etnia: String(p.etnia || ""),
            ejecutor: String(p.ejecutor || ""),
            inversion_estimada: p.inversion_estimada != null ? Number(p.inversion_estimada) : null,
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
              normDeptKey(dept),
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
          porEstado: (raw.porEstado || []).map((e: any) => ({
            estado: String(e.estado || ""),
            count: Number(e.count) || 0,
            capacidad: Number(e.capacidad) || 0,
            inversion: Number(e.inversion) || 0,
          })),
          porTipoCE: (raw.porTipoCE || []).map((e: any) => ({
            tipo: String(e.tipo || ""),
            count: Number(e.count) || 0,
            capacidad: Number(e.capacidad) || 0,
            inversion: Number(e.inversion) || 0,
          })),
          porFuenteEnergia: (raw.porFuenteEnergia || []).map((e: any) => ({
            fuente: String(e.fuente || ""),
            count: Number(e.count) || 0,
            capacidad: Number(e.capacidad) || 0,
            inversion: Number(e.inversion) || 0,
          })),
          porZona: (raw.porZona || []).map((e: any) => ({
            zona: String(e.zona || ""),
            count: Number(e.count) || 0,
            capacidad: Number(e.capacidad) || 0,
            inversion: Number(e.inversion) || 0,
          })),
          porEtnia: (raw.porEtnia || []).map((e: any) => ({
            etnia: String(e.etnia || ""),
            count: Number(e.count) || 0,
            capacidad: Number(e.capacidad) || 0,
            inversion: Number(e.inversion) || 0,
          })),
          porEjecutor: (raw.porEjecutor || []).map((e: any) => ({
            ejecutor: String(e.ejecutor || ""),
            count: Number(e.count) || 0,
            capacidad: Number(e.capacidad) || 0,
            inversion: Number(e.inversion) || 0,
          })),
          statsFechas: {
            min_registro: raw.statsFechas?.min_registro ?? null,
            max_registro: raw.statsFechas?.max_registro ?? null,
            min_operacion: raw.statsFechas?.min_operacion ?? null,
            max_operacion: raw.statsFechas?.max_operacion ?? null,
            con_registro: Number(raw.statsFechas?.con_registro) || 0,
            con_operacion: Number(raw.statsFechas?.con_operacion) || 0,
          },
        });
      if (raw.ultima_actualizacion) setUltimaActualizacion(String(raw.ultima_actualizacion ?? ""));
      })
      .catch(() => {});
  }, []);

  // ─── Filtros activos ─────────────────────────────────────────────────────
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [selectedTipoCE, setSelectedTipoCE] = useState<string | null>(null);
  const [selectedFuente, setSelectedFuente] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState<string | null>(null);
  const [selectedEtnia, setSelectedEtnia] = useState<string | null>(null);
  const [selectedEjecutor, setSelectedEjecutor] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // Filtro de departamento compartido entre dashboards (Fase 3). Mapeo
  // nombre-normalizado <-> código DANE, para traducir entre el código que
  // usa el contexto y el nombre que ya usa el filtro local de esta página.
  const { codigoDaneDepartamento, setCodigoDaneDepartamento } = useGeoFilter();
  const [deptCodeByName, setDeptCodeByName] = useState<Record<string, string>>({});
  const [deptNameByCode, setDeptNameByCode] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDepartamentos()
      .then((data) => {
        const codeByName: Record<string, string> = {};
        const nameByCode: Record<string, string> = {};
        for (const d of data.departamentos) {
          const key = normDeptKey(d.nombre_departamento);
          codeByName[key] = d.codigo_dane_departamento;
          nameByCode[d.codigo_dane_departamento] = key;
        }
        setDeptCodeByName(codeByName);
        setDeptNameByCode(nameByCode);
      })
      .catch(() => {});
  }, []);

  // Selecciona/limpia el departamento localmente y sincroniza el código DANE
  // con el contexto compartido, para que otros dashboards que lo adopten
  // (ej. Vista Departamental) hereden la misma selección.
  function handleSelectDept(depto: string | null) {
    setSelectedDept(depto);
    if (depto === null) {
      setCodigoDaneDepartamento(null);
      return;
    }
    const codigo = deptCodeByName[normDeptKey(depto)];
    if (codigo) setCodigoDaneDepartamento(codigo);
  }

  // Leer parámetros de URL (para capturas Playwright con filtros)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("estado"))       setSelectedEstado(sp.get("estado")!);
    if (sp.has("tipo"))         setSelectedTipoCE(sp.get("tipo")!);
    if (sp.has("fuente"))       setSelectedFuente(sp.get("fuente")!);
    if (sp.has("zona"))         setSelectedZona(sp.get("zona")!);
    if (sp.has("etnia"))        setSelectedEtnia(sp.get("etnia")!);
    if (sp.has("ejecutor"))     setSelectedEjecutor(sp.get("ejecutor")!);
    if (sp.has("departamento")) setSelectedDept(sp.get("departamento")!);
  }, []);


  // ─── Datos filtrados (multi-filtro: estado, tipo, fuente, zona, etnia, ejecutor, depto) ─
  const filteredPuntos = useMemo(() => {
    let p = data.puntos;
    if (selectedEstado) p = p.filter(r => r.estado_actual === selectedEstado);
    if (selectedTipoCE) p = p.filter(r => r.tipo_ce === selectedTipoCE);
    if (selectedFuente) p = p.filter(r => r.fuentes_energia === selectedFuente);
    if (selectedZona) p = p.filter(r => r.zona === selectedZona);
    if (selectedEtnia) p = p.filter(r => r.etnia === selectedEtnia);
    if (selectedEjecutor) p = p.filter(r => r.ejecutor === selectedEjecutor);
    if (selectedDept) p = p.filter(r => r.departamentoGeo === selectedDept);
    return p;
  }, [data.puntos, selectedEstado, selectedTipoCE, selectedFuente, selectedZona, selectedEtnia, selectedEjecutor, selectedDept]);

  // KPIs desde puntos filtrados
  const kpiFiltrados = useMemo(() => {
    const len = filteredPuntos.length;
    const totalCap = filteredPuntos.reduce((s, r) => s + (r.capacidad ?? 0), 0);
    const totalInvEst = filteredPuntos.reduce((s, r) => s + (r.inversion_estimada ?? 0), 0);
    return { implementadas: len, capacidadKwp: totalCap, inversionEstimada: totalInvEst };
  }, [filteredPuntos]);

  const hayFiltros = selectedEstado !== null || selectedTipoCE !== null || selectedFuente !== null || selectedZona !== null || selectedEtnia !== null || selectedEjecutor !== null || selectedDept !== null;

  // KPIs a mostrar
  const displayKpi = useMemo(() => {
    if (!hayFiltros) return {
      implementadas: data.implementadas,
      inversionEstimada: data.inversionEstimada,
      capacidadKwp: data.capacidadKwp,
      usuariosEquiv: data.usuariosEquiv,
      beneficiariosEquiv: data.beneficiariosEquiv,
      avgInversion: data.avgInversion,
      avgCapacidad: data.avgCapacidad,
      avgUsuarios: data.avgUsuarios,
      avgBeneficiarios: data.avgBeneficiarios,
    };
    return {
      implementadas: kpiFiltrados.implementadas,
      inversionEstimada: kpiFiltrados.inversionEstimada,
      capacidadKwp: kpiFiltrados.capacidadKwp,
      usuariosEquiv: data.usuariosEquiv,
      beneficiariosEquiv: data.beneficiariosEquiv,
      avgInversion: data.avgInversion,
      avgCapacidad: data.avgCapacidad,
      avgUsuarios: data.avgUsuarios,
      avgBeneficiarios: data.avgBeneficiarios,
    };
  }, [data, kpiFiltrados, hayFiltros]);

  // Agregaciones para charts (desde puntos filtrados)
  const chartPorEstado = useMemo(() => {
    const map = new Map<string, { estado: string; count: number; capacidad: number; inversion: number }>();
    for (const p of filteredPuntos) {
      const key = p.estado_actual || "Sin estado";
      const prev = map.get(key);
      if (prev) { prev.count++; prev.capacidad += p.capacidad ?? 0; prev.inversion += p.inversion_estimada ?? 0; }
      else map.set(key, { estado: key, count: 1, capacidad: p.capacidad ?? 0, inversion: p.inversion_estimada ?? 0 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filteredPuntos]);

  const chartPorTipoCE = useMemo(() => {
    const map = new Map<string, { tipo: string; count: number; capacidad: number; inversion: number }>();
    for (const p of filteredPuntos) {
      const key = p.tipo_ce || "Sin tipo";
      const prev = map.get(key);
      if (prev) { prev.count++; prev.capacidad += p.capacidad ?? 0; prev.inversion += p.inversion_estimada ?? 0; }
      else map.set(key, { tipo: key, count: 1, capacidad: p.capacidad ?? 0, inversion: p.inversion_estimada ?? 0 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filteredPuntos]);

  const chartPorFuente = useMemo(() => {
    const map = new Map<string, { fuente: string; count: number; capacidad: number; inversion: number }>();
    for (const p of filteredPuntos) {
      const key = p.fuentes_energia || "Sin fuente";
      const prev = map.get(key);
      if (prev) { prev.count++; prev.capacidad += p.capacidad ?? 0; prev.inversion += p.inversion_estimada ?? 0; }
      else map.set(key, { fuente: key, count: 1, capacidad: p.capacidad ?? 0, inversion: p.inversion_estimada ?? 0 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filteredPuntos]);

  // Departamentos desde puntos filtrados; si no hay puntos con coords, usa porDepartamento del API
  const deptDesdePuntos = useMemo(() => {
    if (filteredPuntos.length > 0) {
      const map = new Map<string, DptoRow>();
      for (const p of filteredPuntos) {
        const gk = p.departamentoGeo;
        const prev = map.get(gk);
        if (prev) { prev.count++; prev.capacidad += p.capacidad ?? 0; prev.inversion += p.inversion_estimada ?? 0; }
        else map.set(gk, { departamento: gk, departamentoGeo: gk, count: 1, capacidad: p.capacidad ?? 0, inversion: p.inversion_estimada ?? 0 });
      }
      return [...map.values()].sort((a, b) => b.count - a.count);
    }
    return data.porDepartamento;
  }, [filteredPuntos, data.porDepartamento]);

  // Colores de departamento para el GeoJSON
  const deptColors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const d of deptDesdePuntos) {
      result[normDeptKey(d.departamentoGeo)] = d.count >= 60 ? "#F59E0B" : d.count >= 20 ? "#D97706" : "#7C3A0A";
    }
    return result;
  }, [deptDesdePuntos]);

  // Heredar el departamento del contexto compartido si esta página se abre sin
  // filtro propio (ni URL) y otro dashboard (ej. Vista Departamental) ya dejó
  // una selección activa. Busca el valor real de departamentoGeo (no el nombre
  // normalizado del DANE) para no romper el filtro exacto `===` de más arriba.
  useEffect(() => {
    if (selectedDept !== null || !codigoDaneDepartamento) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("departamento")) return;
    const nombreNormalizado = deptNameByCode[codigoDaneDepartamento];
    if (!nombreNormalizado) return;
    const match = deptDesdePuntos.find(d => normDeptKey(d.departamentoGeo) === nombreNormalizado);
    if (match) setSelectedDept(match.departamentoGeo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoDaneDepartamento, deptNameByCode, deptDesdePuntos]);

  // Top N para charts — usa puntos filtrados si existen, si no cae en datos pre-agregados del API
  // Remapeo a tipo anónimo para compatibilidad con BarDatum de Nivo (evita restricción de index signature)
  const TOP_N_EST = 6;
  const chartEstadoTop = useMemo(() => {
    const base = chartPorEstado.length > 0
      ? chartPorEstado
      : data.porEstado.map(({ estado, count, capacidad, inversion }) => ({ estado, count, capacidad, inversion }));
    if (base.length <= TOP_N_EST + 1) return base;
    const top = base.slice(0, TOP_N_EST);
    const otros = base.slice(TOP_N_EST);
    const sum = otros.reduce((s, r) => ({ estado: "Otros", count: s.count + r.count, capacidad: s.capacidad + r.capacidad, inversion: s.inversion + r.inversion }), { estado: "Otros", count: 0, capacidad: 0, inversion: 0 });
    return [...top, sum];
  }, [chartPorEstado, data.porEstado]);

  const TOP_N_TIPO = 8;
  const chartTipoTop = useMemo(() => {
    const base = chartPorTipoCE.length > 0
      ? chartPorTipoCE
      : data.porTipoCE.map(({ tipo, count, capacidad, inversion }) => ({ tipo, count, capacidad, inversion }));
    if (base.length <= TOP_N_TIPO + 1) return base;
    const top = base.slice(0, TOP_N_TIPO);
    const otros = base.slice(TOP_N_TIPO);
    const sum = otros.reduce((s, r) => ({ tipo: "Otros", count: s.count + r.count, capacidad: s.capacidad + r.capacidad, inversion: s.inversion + r.inversion }), { tipo: "Otros", count: 0, capacidad: 0, inversion: 0 });
    return [...top, sum];
  }, [chartPorTipoCE, data.porTipoCE]);

  const TOP_N_FUENTE = 8;
  const chartFuenteTop = useMemo(() => {
    const base = chartPorFuente.length > 0
      ? chartPorFuente
      : data.porFuenteEnergia.map(({ fuente, count, capacidad, inversion }) => ({ fuente, count, capacidad, inversion }));
    if (base.length <= TOP_N_FUENTE + 1) return base;
    const top = base.slice(0, TOP_N_FUENTE);
    const otros = base.slice(TOP_N_FUENTE);
    const sum = otros.reduce((s, r) => ({ fuente: "Otros", count: s.count + r.count, capacidad: s.capacidad + r.capacidad, inversion: s.inversion + r.inversion }), { fuente: "Otros", count: 0, capacidad: 0, inversion: 0 });
    return [...top, sum];
  }, [chartPorFuente, data.porFuenteEnergia]);

  // Tabla a nivel municipio (cuando se selecciona un dpto)
  const muniTableData = useMemo(() => {
    if (!selectedDept || !data.puntos) return null;
    const rows: Record<string, { count: number; capacidad: number; inversionEst: number }> = {};
    for (const p of data.puntos) {
      if (p.departamentoGeo !== selectedDept) continue;
      const mun = (p.municipio || "S/I").split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ");
      if (!rows[mun]) rows[mun] = { count: 0, capacidad: 0, inversionEst: 0 };
      rows[mun].count += 1;
      rows[mun].capacidad += p.capacidad ?? 0;
      rows[mun].inversionEst += p.inversion_estimada ?? 0;
    }
    return Object.entries(rows).map(([municipio, v]) => ({ municipio, ...v })).sort((a, b) => b.count - a.count);
  }, [selectedDept, data.puntos]);

  const selectedDeptLabel = selectedDept
    ? selectedDept.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")
    : null;

  return (
    <DashboardLayout title="Comunidades Energéticas"
      downloadTablero="comunidades" subtitle={`Soluciones energéticas implementadas en zonas no interconectadas${ultimaActualizacion ? "  ·  Última actualización: " + ultimaActualizacion : ""}`}
      downloadParams={{ estado: selectedEstado || '', tipo: selectedTipoCE || '', fuente: selectedFuente || '', zona: selectedZona || '', etnia: selectedEtnia || '', ejecutor: selectedEjecutor || '', departamento: selectedDept || '' }}>

      {/* ── Row 1: KPIs ── */}
      <Card delay={0.05} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">INDICADORES GENERALES</span>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {selectedEstado && (
              <span className="text-[10px] bg-sky-500/15 text-sky-400 px-2.5 py-1 rounded-full border border-sky-500/30">
                Estado: {selectedEstado}
              </span>
            )}
            {selectedTipoCE && (
              <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2.5 py-1 rounded-full border border-violet-500/30">
                Tipo: {selectedTipoCE}
              </span>
            )}
            {selectedFuente && (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Fuente: {selectedFuente.length > 20 ? selectedFuente.slice(0, 20) + '…' : selectedFuente}
              </span>
            )}
            {selectedZona && (
              <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/30">
                Zona: {selectedZona}
              </span>
            )}
            {selectedEtnia && (
              <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/30">
                Etnia: {selectedEtnia}
              </span>
            )}
            {selectedEjecutor && (
              <span className="text-[10px] bg-lime-500/15 text-lime-400 px-2.5 py-1 rounded-full border border-lime-500/30">
                Ejecutor: {selectedEjecutor.length > 20 ? selectedEjecutor.slice(0, 20) + '…' : selectedEjecutor}
              </span>
            )}
            {selectedDept && (
              <span className="flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-gold px-2.5 py-1 rounded-full border border-amber-500/30">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                {selectedDeptLabel}
              </span>
            )}
            {hayFiltros && (
              <button onClick={() => { setSelectedEstado(null); setSelectedTipoCE(null); setSelectedFuente(null); setSelectedZona(null); setSelectedEtnia(null); setSelectedEjecutor(null); handleSelectDept(null); }}
                className="text-[10px] text-theme-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                ✕ Limpiar filtros
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <KpiChip label="CEs Implementadas" value={displayKpi.implementadas.toLocaleString("es-CO")} accent />
          <KpiChip label="Inversión Estimada" value={fmtCOP(displayKpi.inversionEstimada)} accent
            avg={displayKpi.avgInversion != null ? fmtCOP(displayKpi.avgInversion) : undefined}
            avgLabel="promedio / CE" />
          <KpiChip label="Capacidad Instalada" value={`${Math.round(displayKpi.capacidadKwp).toLocaleString("es-CO")} kWp`}
            avg={displayKpi.avgCapacidad != null ? `${Math.round(displayKpi.avgCapacidad)} kWp` : undefined}
            avgLabel="promedio / CE" />
          <KpiChip label="Usuarios Equiv." value={`${Math.round(displayKpi.usuariosEquiv).toLocaleString("es-CO")} mil`}
            avg={displayKpi.avgUsuarios != null ? `${Math.round(displayKpi.avgUsuarios)} mil` : undefined}
            avgLabel="promedio / CE" />
          <KpiChip label="Beneficiarios" value={`${Math.round(displayKpi.beneficiariosEquiv).toLocaleString("es-CO")} mil`}
            avg={displayKpi.avgBeneficiarios != null ? `${Math.round(displayKpi.avgBeneficiarios)} mil` : undefined}
            avgLabel="promedio / CE" />
        </div>
        {(data.statsFechas.con_operacion > 0 || data.statsFechas.con_registro > 0) && (
          <div className="flex gap-3 mt-3 flex-wrap">
            <span className="text-[10px] text-theme-muted">
              {data.statsFechas.con_operacion} CEs con fecha de operación
            </span>
            <span className="text-[10px] text-theme-muted">
              {data.statsFechas.con_registro} CEs con fecha de registro
            </span>
          </div>
        )}
      </Card>

      {/* ── Row 2: Mapa + acordeón filtros ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">

        {/* Mapa Colombia */}
        <Card delay={0.1} className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CES — MAPA DE UBICACIÓN</span>
            {selectedDept && (
              <button onClick={() => handleSelectDept(null)}
                className="text-[10px] text-theme-muted hover:text-gold transition-colors">
                ← Ver todos
              </button>
            )}
          </div>
          <div className="h-[380px]">
            <ComunidadesMap
              geoData={geoData}
              puntos={filteredPuntos}
              selectedDept={selectedDept}
              isDark={isDark}
              deptColors={deptColors}
              onSelectDept={handleSelectDept}
              porDepartamento={data.porDepartamento}
              deptAvgs={data.deptAvgs}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] text-theme-muted italic">
              Click en dpto. para filtrar · {filteredPuntos.length} CEs mostrados
            </span>
          </div>
        </Card>

        {/* ── Acordeón de filtros ── */}
        <Card delay={0.12} className="lg:col-span-2">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] block mb-3">FILTROS</span>

          {/* Estado Actual */}
          <AccordionSection title="Estado Actual" count={data.porEstado.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.porEstado.map(e => (
                <FilterItem
                  key={e.estado}
                  label={e.estado}
                  count={e.count}
                  active={selectedEstado === e.estado}
                  onClick={() => setSelectedEstado(selectedEstado === e.estado ? null : e.estado)}
                />
              ))}
            </div>
          </AccordionSection>

          {/* Tipo CE */}
          <AccordionSection title="Tipo de CE" count={data.porTipoCE.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.porTipoCE.map(e => (
                <FilterItem
                  key={e.tipo}
                  label={e.tipo}
                  count={e.count}
                  active={selectedTipoCE === e.tipo}
                  onClick={() => setSelectedTipoCE(selectedTipoCE === e.tipo ? null : e.tipo)}
                />
              ))}
            </div>
          </AccordionSection>

          {/* Fuente Energía */}
          <AccordionSection title="Fuente de Energía" count={data.porFuenteEnergia.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.porFuenteEnergia.slice(0, 15).map(e => (
                <FilterItem
                  key={e.fuente}
                  label={e.fuente.length > 35 ? e.fuente.slice(0, 35) + '…' : e.fuente}
                  count={e.count}
                  active={selectedFuente === e.fuente}
                  onClick={() => setSelectedFuente(selectedFuente === e.fuente ? null : e.fuente)}
                />
              ))}
              {data.porFuenteEnergia.length > 15 && (
                <div className="text-[9px] text-theme-muted text-center pt-1">
                  +{data.porFuenteEnergia.length - 15} más (selecciona en mapa)
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Zona */}
          <AccordionSection title="Zona" count={data.porZona.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.porZona.map(e => (
                <FilterItem
                  key={e.zona}
                  label={e.zona}
                  count={e.count}
                  active={selectedZona === e.zona}
                  onClick={() => setSelectedZona(selectedZona === e.zona ? null : e.zona)}
                />
              ))}
            </div>
          </AccordionSection>

          {/* Etnia */}
          <AccordionSection title="Etnia" count={data.porEtnia.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.porEtnia.map(e => (
                <FilterItem
                  key={e.etnia}
                  label={e.etnia}
                  count={e.count}
                  active={selectedEtnia === e.etnia}
                  onClick={() => setSelectedEtnia(selectedEtnia === e.etnia ? null : e.etnia)}
                />
              ))}
            </div>
          </AccordionSection>

          {/* Ejecutor */}
          <AccordionSection title="Ejecutor" count={data.porEjecutor.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.porEjecutor.slice(0, 15).map(e => (
                <FilterItem
                  key={e.ejecutor}
                  label={e.ejecutor.length > 35 ? e.ejecutor.slice(0, 35) + '…' : e.ejecutor}
                  count={e.count}
                  active={selectedEjecutor === e.ejecutor}
                  onClick={() => setSelectedEjecutor(selectedEjecutor === e.ejecutor ? null : e.ejecutor)}
                />
              ))}
              {data.porEjecutor.length > 15 && (
                <div className="text-[9px] text-theme-muted text-center pt-1">
                  +{data.porEjecutor.length - 15} más
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Departamento */}
          <AccordionSection title="Departamento" count={deptDesdePuntos.length}>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {deptDesdePuntos.map(d => (
                <FilterItem
                  key={d.departamentoGeo}
                  label={d.departamentoGeo.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")}
                  count={d.count}
                  active={selectedDept != null && normDeptKey(selectedDept) === normDeptKey(d.departamentoGeo)}
                  onClick={() => handleSelectDept(selectedDept != null && normDeptKey(selectedDept) === normDeptKey(d.departamentoGeo) ? null : d.departamentoGeo)}
                />
              ))}
            </div>
          </AccordionSection>
        </Card>
      </div>

      {/* ── Row 3: Bar charts — Estado / Tipo CE / Fuente ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
        {/* Chart 1: Estado */}
        <Card delay={0.15}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CES POR ESTADO</span>
          <div className="h-[280px] mt-3">
            {chartEstadoTop.length > 0 ? (
              <ResponsiveBar
                data={chartEstadoTop}
                keys={["count"]}
                indexBy="estado"
                theme={T}
                margin={{ top: 8, right: 50, bottom: 20, left: 100 }}
                layout="horizontal"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#F59E0B"]}
                borderRadius={3}
                padding={0.3}
                enableLabel={false}
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                layers={["grid", "axes", "bars", "markers", "legends", "annotations", (props: any) => (
                  <g>{props.bars.map((bar: any) => (
                    <text key={bar.key} x={bar.x + bar.width + 5} y={bar.y + bar.height / 2}
                      textAnchor="start" dominantBaseline="central"
                      style={{ fill: isDark ? "#CBD5E1" : "#334155", fontSize: 10 }}>
                      {bar.data.value}
                    </text>
                  ))}</g>
                )]}
                tooltip={({ value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                    <strong>{indexValue}</strong>: <strong style={{ color: "#F59E0B" }}>{value} CEs</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center"><span className="text-theme-muted text-sm">Sin datos</span></div>
            )}
          </div>
        </Card>

        {/* Chart 2: Tipo CE */}
        <Card delay={0.18}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CES POR TIPO</span>
          <div className="h-[280px] mt-3">
            {chartTipoTop.length > 0 ? (
              <ResponsiveBar
                data={chartTipoTop}
                keys={["count"]}
                indexBy="tipo"
                theme={T}
                margin={{ top: 8, right: 50, bottom: 20, left: 100 }}
                layout="horizontal"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#06B6D4"]}
                borderRadius={3}
                padding={0.3}
                enableLabel={false}
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                layers={["grid", "axes", "bars", "markers", "legends", "annotations", (props: any) => (
                  <g>{props.bars.map((bar: any) => (
                    <text key={bar.key} x={bar.x + bar.width + 5} y={bar.y + bar.height / 2}
                      textAnchor="start" dominantBaseline="central"
                      style={{ fill: isDark ? "#CBD5E1" : "#334155", fontSize: 10 }}>
                      {bar.data.value}
                    </text>
                  ))}</g>
                )]}
                tooltip={({ value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                    <strong>{indexValue}</strong>: <strong style={{ color: "#06B6D4" }}>{value} CEs</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center"><span className="text-theme-muted text-sm">Sin datos</span></div>
            )}
          </div>
        </Card>

        {/* Chart 3: Fuente */}
        <Card delay={0.21}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CES POR FUENTE</span>
          <div className="h-[280px] mt-3">
            {chartFuenteTop.length > 0 ? (
              <ResponsiveBar
                data={chartFuenteTop}
                keys={["count"]}
                indexBy="fuente"
                theme={T}
                margin={{ top: 8, right: 50, bottom: 20, left: 100 }}
                layout="horizontal"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#8B5CF6"]}
                borderRadius={3}
                padding={0.3}
                enableLabel={false}
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                layers={["grid", "axes", "bars", "markers", "legends", "annotations", (props: any) => (
                  <g>{props.bars.map((bar: any) => (
                    <text key={bar.key} x={bar.x + bar.width + 5} y={bar.y + bar.height / 2}
                      textAnchor="start" dominantBaseline="central"
                      style={{ fill: isDark ? "#CBD5E1" : "#334155", fontSize: 10 }}>
                      {bar.data.value}
                    </text>
                  ))}</g>
                )]}
                tooltip={({ value, indexValue }) => (
                  <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                    <strong>{indexValue}</strong>: <strong style={{ color: "#8B5CF6" }}>{value} CEs</strong>
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
      <Card delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
              {selectedDept ? `DETALLE POR MUNICIPIO — ${selectedDeptLabel}` : "DETALLE POR DEPARTAMENTO"}
            </span>
            <span className="text-[10px] text-theme-muted">
              {selectedDept
                ? `${muniTableData?.length ?? 0} municipios`
                : `${deptDesdePuntos.length} departamentos`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDept && (
              <button onClick={() => handleSelectDept(null)}
                className="text-[10px] text-theme-muted hover:text-gold transition-colors">
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
                    'Capacidad (kWp)': Math.round(m.capacidad),
                    'Inversión Estimada ($)': m.inversionEst,
                  }));
                const totalCEs = muniTableData.reduce((s, m) => s + m.count, 0);
                const totalCap = muniTableData.reduce((s, m) => s + m.capacidad, 0);
                const totalInvEst = muniTableData.reduce((s, m) => s + m.inversionEst, 0);
                exportData.push({ 'Departamento': 'TOTAL', 'Municipio': '', 'N° CEs': totalCEs, 'Capacidad (kWp)': Math.round(totalCap), 'Inversión Estimada ($)': totalInvEst });
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Municipios');
                XLSX.writeFile(wb, `comunidades_municipios_${selectedDept.replace(/ /g,"_").toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
              } else {
                const exportData = [...deptDesdePuntos]
                  .sort((a, b) => b.count - a.count)
                  .map(d => ({
                    'Departamento': d.departamentoGeo.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" "),
                    'N° CEs': d.count,
                    'Capacidad (kWp)': Math.round(d.capacidad),
                    'Inversión Estimada ($)': d.inversion,
                  }));
                const totalCEs = deptDesdePuntos.reduce((sum, d) => sum + d.count, 0);
                const totalCapacidad = deptDesdePuntos.reduce((sum, d) => sum + d.capacidad, 0);
                const totalInversion = deptDesdePuntos.reduce((sum, d) => sum + d.inversion, 0);
                exportData.push({ 'Departamento': 'TOTAL', 'N° CEs': totalCEs, 'Capacidad (kWp)': Math.round(totalCapacidad), 'Inversión Estimada ($)': totalInversion });
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
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Inv. Estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-card">
                {muniTableData.map((m, i) => (
                  <motion.tr key={m.municipio} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.02 }}
                    className="text-theme-secondary">
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">{m.municipio}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden">
                          <div style={{ width: `${Math.min((m.count / (muniTableData[0]?.count || 1)) * 100, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="text-gold font-semibold w-8 text-right">{m.count}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-cyan-400">{Math.round(m.capacidad).toLocaleString("es-CO")}</td>
                    <td className="py-2.5 text-right text-purple-400">{fmtCOP(m.inversionEst)}</td>
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
                {deptDesdePuntos.sort((a, b) => b.count - a.count).map((d, i) => (
                  <motion.tr key={d.departamentoGeo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.02 }}
                    onClick={() => handleSelectDept(selectedDept != null && normDeptKey(selectedDept) === normDeptKey(d.departamentoGeo) ? null : d.departamentoGeo)}
                    className={`text-theme-secondary transition-colors cursor-pointer ${selectedDept != null && normDeptKey(selectedDept) === normDeptKey(d.departamentoGeo) ? "bg-amber-500/10" : "hover:bg-dash-chip"}`}>
                    <td className="py-2.5 pr-4 font-medium text-theme-primary">
                      {d.departamentoGeo.split(" ").map(w => w[0]+w.slice(1).toLowerCase()).join(" ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden">
                          <div style={{ width: `${Math.min((d.count / (deptDesdePuntos[0]?.count || 1)) * 100, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
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
          {!selectedDept && deptDesdePuntos.length === 0 && (
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

