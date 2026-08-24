"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import * as XLSX from "xlsx";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import BaseKpiChip, { type KpiChipProps } from "@/components/dashboard/KpiChip";
import SemiGauge from "@/components/ui/SemiGauge";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtCOP, fmtCOPShort, fmtNum } from "@/lib/format";

// ─── Helpers ──────────────────────────────────────────────────────────────
function KpiChip(props: Omit<KpiChipProps, "padding" | "valueSize">) {
  return <BaseKpiChip padding="md" valueSize="lg" {...props} />;
}

// ─── Year Range Slider ────────────────────────────────────────────────────
const YEAR_MIN = 2003;
const YEAR_MAX = 2026;
const DEFAULT_ANO_MIN = 2015;

function YearRangeSlider({ anoMin, anoMax, onChange }: {
  anoMin: number; anoMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const pct = (v: number) => ((v - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
  const isDefault = anoMin === DEFAULT_ANO_MIN && anoMax === YEAR_MAX;
  const TICKS = [2003, 2006, 2009, 2012, 2015, 2018, 2021, 2024, 2026];
  const trackRef = useRef<HTMLDivElement>(null);
  const [minOnTop, setMinOnTop] = useState(false);

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const yearCursor = YEAR_MIN + ((e.clientX - rect.left) / rect.width) * (YEAR_MAX - YEAR_MIN);
    setMinOnTop(Math.abs(yearCursor - anoMin) <= Math.abs(yearCursor - anoMax));
  };

  return (
    <div className="px-1 mb-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] text-gold/70 uppercase tracking-widest font-bold">PERÍODO</span>
        <span className="font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{anoMin}</span>
        <div className="flex-1 h-px bg-amber-500/20" />
        <span className="font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{anoMax}</span>
        {!isDefault && (
          <button onClick={() => onChange(DEFAULT_ANO_MIN, YEAR_MAX)}
            className="text-[10px] text-theme-muted hover:text-red-400 transition-colors">
            ✕ Restablecer
          </button>
        )}
      </div>
      <div ref={trackRef} className="relative h-7 flex items-center mx-1" onMouseMove={handleTrackMouseMove}>
        <div className="absolute w-full h-1.5 bg-theme-tertiary rounded-full pointer-events-none" />
        <div className="absolute h-1.5 bg-amber-500/70 rounded-full pointer-events-none"
          style={{ left: `${pct(anoMin)}%`, width: `${pct(anoMax) - pct(anoMin)}%` }} />
        <div className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 shadow pointer-events-none ring-2 ring-amber-400/30"
          style={{ left: `calc(${pct(anoMin)}% - 7px)` }} />
        <div className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 shadow pointer-events-none ring-2 ring-amber-400/30"
          style={{ left: `calc(${pct(anoMax)}% - 7px)` }} />
        <input type="range" min={YEAR_MIN} max={YEAR_MAX} step={1} value={anoMin}
          onChange={e => onChange(Math.min(+e.target.value, anoMax - 1), anoMax)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: minOnTop ? 5 : 3 }} />
        <input type="range" min={YEAR_MIN} max={YEAR_MAX} step={1} value={anoMax}
          onChange={e => onChange(anoMin, Math.max(+e.target.value, anoMin + 1))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: minOnTop ? 3 : 5 }} />
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        {TICKS.map(y => (
          <span key={y} className="text-[8px] text-theme-muted/60">{y}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────
interface FondoRow   { fondo: string; contratos: number }
interface AnioRow    { anio: number; avg_avance_obra: number }
interface SankeyNode { valor: string; n: number }
interface TipoSolucionRow { tipo: string; proyectos: number }
interface SupervisionFinanciero {
  valorProyecto: number; valorDesembolsado: number; valorPorDesembolsar: number;
  pctDesembolsado: number; filasConValor: number; filasConDesembolso: number;
}
interface SupervisionUsuarios {
  contratados: number; finales: number; filasContratados: number; filasFinales: number;
}
interface SupervisionProyecto {
  anio: number | null; contrato: string | null; nombreProyecto: string | null;
  fondo: string | null; tipoSolucion: string | null; estado: string | null; etapa: string | null;
  ejecutor: string | null; departamento: string | null; municipio: string | null;
  usuariosContratados: number | null; usuariosFinales: number | null;
  valorProyecto: number | null; valorDesembolsado: number | null; valorPorDesembolsar: number | null;
  avanceObraPct: number; avanceFinancieroPct: number;
}
interface SupervisionData {
  nContratos: number; nProyectos: number;
  enEjecucion: number; enAOM: number; enLiquidacion: number;
  liquidados: number; perdidaCompetencia: number;
  avanceFisico: number; avanceFinanciero: number; avanceContrato: number;
  avanceFisicoActivos: number; avanceFinancieroActivos: number;
  financiero: SupervisionFinanciero;
  usuarios: SupervisionUsuarios;
  nFotovoltaicos: number;
  porTipoSolucion: TipoSolucionRow[];
  porFondo: FondoRow[]; avancePorAnio: AnioRow[];
  sankey: { fondo: SankeyNode[]; estado: SankeyNode[]; etapa: SankeyNode[]; departamento: SankeyNode[]; municipio: SankeyNode[] };
  ultimaActualizacion?: string;
}

const EMPTY_FIN: SupervisionFinanciero = {
  valorProyecto: 0, valorDesembolsado: 0, valorPorDesembolsar: 0,
  pctDesembolsado: 0, filasConValor: 0, filasConDesembolso: 0,
};
const EMPTY_USR: SupervisionUsuarios = {
  contratados: 0, finales: 0, filasContratados: 0, filasFinales: 0,
};

const EMPTY_SANKEY = { fondo: [], estado: [], etapa: [], departamento: [], municipio: [] };
const DEFAULT: SupervisionData = {
  nContratos: 840, nProyectos: 2422,
  enEjecucion: 295, enAOM: 219, enLiquidacion: 129, liquidados: 166, perdidaCompetencia: 22,
  avanceFisico: 87.49, avanceFinanciero: 88.43, avanceContrato: 73.95,
  avanceFisicoActivos: 30.48, avanceFinancieroActivos: 46.97,
  financiero: EMPTY_FIN, usuarios: EMPTY_USR,
  nFotovoltaicos: 0, porTipoSolucion: [],
  porFondo: [], avancePorAnio: [],
  sankey: EMPTY_SANKEY,
};
const COLORS = ["#F59E0B","#8B5CF6","#06B6D4","#22C55E","#EF4444","#F97316","#EC4899","#14B8A6","#6366F1","#84CC16","#0EA5E9"];

// ─── SankeyFlow ────────────────────────────────────────────────────────────
interface SankeyFilters {
  fondo: string | null; estado: string | null; etapa: string | null;
  departamento: string | null; municipio: string | null;
}

function SankeyFlow({
  sankey, totalContratos, filters, onFilter, onClearAll,
}: {
  sankey: SupervisionData["sankey"];
  totalContratos: number;
  filters: SankeyFilters;
  onFilter: (level: keyof SankeyFilters, valor: string | null) => void;
  onClearAll: () => void;
}) {
  const cols: Array<{ key: keyof SankeyFilters; label: string; nodes: SankeyNode[] }> = [
    { key: "fondo",        label: "FONDO",        nodes: sankey.fondo        },
    { key: "estado",       label: "ESTADO",       nodes: sankey.estado       },
    { key: "etapa",        label: "ETAPA",        nodes: sankey.etapa        },
    { key: "departamento", label: "DEPARTAMENTO", nodes: sankey.departamento },
    { key: "municipio",    label: "MUNICIPIO",    nodes: sankey.municipio    },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-0 min-w-[960px]">
        <div className="flex flex-col items-center justify-center w-28 shrink-0 pr-2">
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl px-3 py-3 text-center w-full">
            <div className="text-gold font-bold text-lg leading-none">{totalContratos}</div>
            <div className="text-[9px] text-theme-muted mt-1 leading-tight">N° DE<br/>CONTRATOS</div>
          </div>
        </div>
        <div className="flex items-center w-4 shrink-0">
          <div className="w-full h-px bg-amber-500/30" />
        </div>
        {cols.map(({ key, label, nodes }, colIdx) => {
          const activeVal = filters[key];
          const colMax = nodes.reduce((s, n) => s + n.n, 0) || 1;
          return (
            <div key={key} className="flex gap-0 items-stretch">
              <div className="flex flex-col gap-1.5 w-40 shrink-0">
                <div className="text-[9px] text-gold/70 font-bold uppercase tracking-widest mb-1 text-center">{label}</div>
                {nodes.map((node, ni) => {
                  const isActive = activeVal === node.valor;
                  const barPct = Math.max((node.n / colMax) * 100, 2);
                  const color = COLORS[ni % COLORS.length];
                  return (
                    <button key={node.valor}
                      onClick={() => onFilter(key, isActive ? null : node.valor)}
                      className={`relative rounded-lg px-2.5 py-1.5 text-left transition-all border text-[10px] ${
                        isActive ? "border-amber-500/60 bg-amber-500/15" : "border-theme-card bg-dash-chip hover:border-amber-500/30"
                      }`}>
                      <div className="absolute inset-y-0 left-0 rounded-l-lg opacity-20"
                        style={{ width: `${barPct}%`, background: color }} />
                      <div className="relative flex items-center justify-between gap-1">
                        <span className={`font-medium leading-tight truncate max-w-[90px] ${isActive ? "text-gold" : "text-theme-primary"}`}>
                          {node.valor.length > 14 ? node.valor.slice(0, 14) + "…" : node.valor}
                        </span>
                        <span className="font-bold shrink-0" style={{ color }}>{node.n}</span>
                      </div>
                    </button>
                  );
                })}
                {nodes.length === 0 && <div className="text-[9px] text-theme-muted text-center py-2 italic">—</div>}
              </div>
              {colIdx < cols.length - 1 && (
                <div className="flex items-center w-5 shrink-0">
                  <div className="w-full h-px bg-amber-500/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {Object.values(filters).some(Boolean) && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {(["fondo","estado","etapa","departamento","municipio"] as (keyof SankeyFilters)[]).map(k =>
            filters[k] ? (
              <span key={k} className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-gold px-2 py-0.5 rounded-full border border-amber-500/30">
                {filters[k]}
                <button onClick={() => onFilter(k, null)} className="ml-0.5 hover:text-red-400">✕</button>
              </span>
            ) : null
          )}
          <button
            onClick={onClearAll}
            className="text-[10px] text-theme-muted hover:text-red-400 transition-colors">
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function SupervisionPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");
  const isDark = resolvedTheme === "dark";
  const [data, setData] = useState<SupervisionData>(DEFAULT);
  const [filters, setFilters] = useState<SankeyFilters>({
    fondo: null, estado: null, etapa: null, departamento: null, municipio: null,
  });
  const [anoMin, setAnoMin] = useState(DEFAULT_ANO_MIN);
  const [anoMax, setAnoMax] = useState(YEAR_MAX);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const yearDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parseDashboard = useCallback((raw: Record<string, unknown>): SupervisionData => ({
    nContratos:              Number(raw.nContratos)              || 0,
    nProyectos:              Number(raw.nProyectos)              || 0,
    enEjecucion:             Number(raw.enEjecucion)             || 0,
    enAOM:                   Number(raw.enAOM)                   || 0,
    enLiquidacion:           Number(raw.enLiquidacion)           || 0,
    liquidados:              Number(raw.liquidados)              || 0,
    perdidaCompetencia:      Number(raw.perdidaCompetencia)      || 0,
    avanceFisico:            Number(raw.avanceFisico)            || 0,
    avanceFinanciero:        Number(raw.avanceFinanciero)        || 0,
    avanceContrato:          Number(raw.avanceContrato)          || 0,
    avanceFisicoActivos:     Number(raw.avanceFisicoActivos)     || 0,
    avanceFinancieroActivos: Number(raw.avanceFinancieroActivos) || 0,
    financiero: {
      valorProyecto:       Number((raw.financiero as SupervisionFinanciero)?.valorProyecto)       || 0,
      valorDesembolsado:   Number((raw.financiero as SupervisionFinanciero)?.valorDesembolsado)   || 0,
      valorPorDesembolsar: Number((raw.financiero as SupervisionFinanciero)?.valorPorDesembolsar) || 0,
      pctDesembolsado:     Number((raw.financiero as SupervisionFinanciero)?.pctDesembolsado)     || 0,
      filasConValor:       Number((raw.financiero as SupervisionFinanciero)?.filasConValor)       || 0,
      filasConDesembolso:  Number((raw.financiero as SupervisionFinanciero)?.filasConDesembolso)  || 0,
    },
    usuarios: {
      contratados:      Number((raw.usuarios as SupervisionUsuarios)?.contratados)      || 0,
      finales:          Number((raw.usuarios as SupervisionUsuarios)?.finales)          || 0,
      filasContratados: Number((raw.usuarios as SupervisionUsuarios)?.filasContratados) || 0,
      filasFinales:     Number((raw.usuarios as SupervisionUsuarios)?.filasFinales)     || 0,
    },
    nFotovoltaicos: Number(raw.nFotovoltaicos) || 0,
    porTipoSolucion: ((raw.porTipoSolucion as TipoSolucionRow[]) ?? []).map(r => ({
      tipo: String(r.tipo), proyectos: Number(r.proyectos) || 0,
    })),
    porFondo:      ((raw.porFondo as FondoRow[])      ?? []).map(r => ({ fondo: String(r.fondo), contratos: Number(r.contratos) })),
    avancePorAnio: ((raw.avancePorAnio as AnioRow[]) ?? []).map(r => ({ anio: Number(r.anio), avg_avance_obra: Number(r.avg_avance_obra) })),
    sankey: {
      fondo:    ((raw.sankey as { fondo?: SankeyNode[] })?.fondo    ?? []).map(n => ({ valor: String(n.valor), n: Number(n.n) })),
      estado:   ((raw.sankey as { estado?: SankeyNode[] })?.estado   ?? []).map(n => ({ valor: String(n.valor), n: Number(n.n) })),
      etapa:    ((raw.sankey as { etapa?: SankeyNode[] })?.etapa    ?? []).map(n => ({ valor: String(n.valor), n: Number(n.n) })),
      departamento: ((raw.sankey as { departamento?: SankeyNode[] })?.departamento ?? []).map(n => ({ valor: String(n.valor), n: Number(n.n) })),
      municipio:    ((raw.sankey as { municipio?: SankeyNode[] })?.municipio    ?? []).map(n => ({ valor: String(n.valor), n: Number(n.n) })),
    },
    ultimaActualizacion: String(raw.ultima_actualizacion ?? raw.ultimaActualizacion ?? ""),
  }), []);

  const buildParams = useCallback((f: SankeyFilters, yMin: number, yMax: number) => {
    const params = new URLSearchParams();
    if (f.fondo)        params.set("fondo",        f.fondo);
    if (f.estado)       params.set("estado",       f.estado);
    if (f.etapa)        params.set("etapa",        f.etapa);
    if (f.departamento) params.set("departamento", f.departamento);
    if (f.municipio)    params.set("municipio",    f.municipio);
    params.set("anoMin", String(yMin));
    params.set("anoMax", String(yMax));
    return params;
  }, []);

  const fetchData = useCallback((f: SankeyFilters, yMin: number, yMax: number) => {
    setLoading(true);
    const qs = buildParams(f, yMin, yMax);
    const url = `/api/supervision${qs.toString() ? "?" + qs.toString() : ""}`;
    fetch(url)
      .then(r => r.json())
      .then(raw => setData(parseDashboard(raw)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildParams, parseDashboard]);

  useEffect(() => {
    // Leer parámetros de URL (para capturas Playwright con filtros)
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const initialFilters: SankeyFilters = {
      fondo:        sp.get("fondo")        || null,
      estado:       sp.get("estado")       || null,
      etapa:        sp.get("etapa")        || null,
      departamento: sp.get("departamento") || null,
      municipio:    sp.get("municipio")    || null,
    };
    const yMin = sp.has("anoMin") ? Math.max(Number(sp.get("anoMin")), YEAR_MIN) : DEFAULT_ANO_MIN;
    const yMax = sp.has("anoMax") ? Math.min(Number(sp.get("anoMax")), YEAR_MAX) : YEAR_MAX;

    // Si hay filtros en la URL, actualizar estado y forzar fetch con esos valores
    const hasUrlFilters = [...Object.values(initialFilters)].some(Boolean) || sp.has("anoMin") || sp.has("anoMax");
    if (hasUrlFilters) {
      setFilters(initialFilters);
      setAnoMin(yMin);
      setAnoMax(yMax);
      fetchData(initialFilters, yMin, yMax);
    } else {
      fetchData({ fondo: null, estado: null, etapa: null, departamento: null, municipio: null }, DEFAULT_ANO_MIN, YEAR_MAX);
    }
  }, [fetchData]);

  const handleFilter = useCallback((level: keyof SankeyFilters, valor: string | null) => {
    const order: (keyof SankeyFilters)[] = ["fondo", "estado", "etapa", "departamento", "municipio"];
    const levelIdx = order.indexOf(level);
    setFilters(prev => {
      const next = { ...prev, [level]: valor };
      if (valor === null) {
        for (let i = levelIdx + 1; i < order.length; i++) next[order[i]] = null;
      }
      fetchData(next, anoMin, anoMax);
      return next;
    });
  }, [fetchData, anoMin, anoMax]);

  const handleClearAll = useCallback(() => {
    const cleared: SankeyFilters = { fondo: null, estado: null, etapa: null, departamento: null, municipio: null };
    setFilters(cleared);
    fetchData(cleared, anoMin, anoMax);
  }, [fetchData, anoMin, anoMax]);

  const handleYearChange = useCallback((min: number, max: number) => {
    setAnoMin(min);
    setAnoMax(max);
    if (yearDebounce.current) clearTimeout(yearDebounce.current);
    yearDebounce.current = setTimeout(() => fetchData(filters, min, max), 400);
  }, [fetchData, filters]);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const qs = buildParams(filters, anoMin, anoMax);
      const res = await fetch(`/api/supervision/detalle${qs.toString() ? "?" + qs.toString() : ""}`);
      const json = await res.json();
      const rows: SupervisionProyecto[] = json.proyectos ?? [];

      const exportData = rows.map(p => ({
        "Año": p.anio ?? "",
        "Contrato": p.contrato ?? "",
        "Proyecto": p.nombreProyecto ?? "",
        "Fondo": p.fondo ?? "",
        "Tipo de Solución": p.tipoSolucion ?? "",
        "Estado": p.estado ?? "",
        "Etapa": p.etapa ?? "",
        "Ejecutor": p.ejecutor ?? "",
        "Departamento": p.departamento ?? "",
        "Municipio": p.municipio ?? "",
        "Usuarios Contratados": p.usuariosContratados ?? "",
        "Usuarios Finales": p.usuariosFinales ?? "",
        "Valor por proyecto": p.valorProyecto ?? "",
        "Valor desembolsado": p.valorDesembolsado ?? "",
        "Valor por desembolsar": p.valorPorDesembolsar ?? "",
        "Avance Obra (%)": p.avanceObraPct != null ? p.avanceObraPct / 100 : "",
        "Avance Financiero (%)": p.avanceFinancieroPct != null ? p.avanceFinancieroPct / 100 : "",
      }));

      exportData.push({
        "Año": "",
        "Contrato": "TOTALES PORTAFOLIO",
        "Proyecto": `${rows.length} proyectos`,
        "Fondo": "",
        "Tipo de Solución": "",
        "Estado": "",
        "Etapa": "",
        "Ejecutor": "",
        "Departamento": "",
        "Municipio": "",
        "Usuarios Contratados": data.usuarios.contratados,
        "Usuarios Finales": data.usuarios.finales,
        "Valor por proyecto": data.financiero.valorProyecto,
        "Valor desembolsado": data.financiero.valorDesembolsado,
        "Valor por desembolsar": data.financiero.valorPorDesembolsar,
        "Avance Obra (%)": data.avanceFisico / 100,
        "Avance Financiero (%)": data.avanceFinanciero / 100,
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Supervisión");
      XLSX.writeFile(wb, `supervision_contratos_${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [buildParams, filters, anoMin, anoMax, data]);

  const fondoDonut = data.porFondo.slice(0, 10).map((f, i) => ({
    id: f.fondo, label: f.fondo, value: f.contratos, color: COLORS[i % COLORS.length],
  }));
  const avanceLine = data.avancePorAnio.length > 0 ? [{
    id: "Avance Obra", color: "#22C55E",
    data: data.avancePorAnio.map(a => ({ x: String(a.anio), y: +a.avg_avance_obra.toFixed(1) })),
  }] : [];

  const hasFilter = Object.values(filters).some(Boolean) || anoMin !== DEFAULT_ANO_MIN || anoMax !== YEAR_MAX;

  const filterNote = (() => {
    const parts: string[] = [];
    if (anoMin !== YEAR_MIN || anoMax !== YEAR_MAX) parts.push(`${anoMin}–${anoMax}`);
    if (filters.fondo) parts.push(`Fondo: ${filters.fondo}`);
    if (filters.estado) parts.push(`Estado: ${filters.estado}`);
    if (filters.etapa) parts.push(`Etapa: ${filters.etapa}`);
    if (filters.departamento) parts.push(`Depto: ${filters.departamento}`);
    if (filters.municipio) parts.push(`Mpio: ${filters.municipio}`);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  })();

  const yearNote = `${anoMin}–${anoMax}`;

  const canExport = !loading;

  return (
    <DashboardLayout title="Supervisión de Contratos"
      downloadTablero="supervision" subtitle={`Estado, avance y distribución de contratos y proyectos supervisados${data.ultimaActualizacion ? "  ·  Última actualización: " + data.ultimaActualizacion : ""}`}
      downloadParams={{ fondo: filters.fondo || '', estado: filters.estado || '', etapa: filters.etapa || '', departamento: filters.departamento || '', municipio: filters.municipio || '', anoMin: String(anoMin), anoMax: String(anoMax) }}>

      {/* ── Filtro general: flujo + período ── */}
      <Card delay={0.05} className="mb-5 ring-1 ring-amber-500/20">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <div>
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
              FLUJO DE CONTRATOS — FONDO › ESTADO › ETAPA › DEPARTAMENTO › MUNICIPIO
            </span>
            <p className="text-[10px] text-theme-muted mt-1 max-w-2xl">
              Filtro general del tablero. Seleccione fondo, estado, etapa, departamento o municipio; el resto de indicadores se actualiza con esa selección.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-theme-muted bg-dash-chip px-2 py-1 rounded-full border border-theme-card">
              Período {anoMin}–{anoMax}
            </span>
            {Object.values(filters).some(Boolean) && (
              <span className="text-[10px] text-gold/80 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/25">
                filtrado
              </span>
            )}
            {loading && <span className="text-[10px] text-theme-muted animate-pulse">actualizando…</span>}
            <button
              onClick={handleExportExcel}
              disabled={exporting || !canExport}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl
                bg-amber-500/15 border border-amber-500/40 text-gold
                hover:bg-amber-500/25 transition-colors disabled:opacity-40"
            >
              {exporting ? "Generando…" : "Exportar Excel"}
            </button>
          </div>
        </div>
        <YearRangeSlider anoMin={anoMin} anoMax={anoMax} onChange={handleYearChange} />
        <SankeyFlow
          sankey={data.sankey}
          totalContratos={data.nContratos}
          filters={filters}
          onFilter={handleFilter}
          onClearAll={handleClearAll}
        />
      </Card>

      {/* ── KPIs + Donut + Gauges (filtrados) ── */}
      <Card delay={0.08} className="mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* KPI chips — ciclo de vida completo del contrato */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-gold font-bold uppercase tracking-widest text-[11px]">INDICADORES CLAVE</span>
              {hasFilter && (
                <span className="text-[10px] text-gold/70 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">filtrado</span>
              )}
            </div>
            {filterNote && <p className="text-[9px] text-gold/60 mb-2">{filterNote}</p>}
            {(() => {
              const tot = data.nContratos || 1;
              const pct = (n: number) => `${((n / tot) * 100).toFixed(1)}% del total`;
              return (
                <div className="grid grid-cols-2 gap-3">
                  <KpiChip label="Contratos"          value={data.nContratos.toLocaleString("es-CO")}      accent note={yearNote} />
                  <KpiChip label="Proyectos"          value={data.nProyectos.toLocaleString("es-CO")}      colorClass="text-slate-300" note={yearNote} />
                  <KpiChip label="En Ejecución"       value={data.enEjecucion.toLocaleString("es-CO")}     colorClass="text-cyan-400"    pct={pct(data.enEjecucion)} note={yearNote} />
                  <KpiChip label="AOM"                value={data.enAOM.toLocaleString("es-CO")}           colorClass="text-teal-400"    pct={pct(data.enAOM)} note={yearNote} />
                  <KpiChip label="En Liquidación"     value={data.enLiquidacion.toLocaleString("es-CO")}   colorClass="text-gold"   pct={pct(data.enLiquidacion)} note={yearNote} />
                  <KpiChip label="Liquidados"         value={data.liquidados.toLocaleString("es-CO")}      colorClass="text-emerald-400" pct={pct(data.liquidados)} note={yearNote} />
                  <KpiChip label="Perdida Competencia" value={data.perdidaCompetencia.toLocaleString("es-CO")} colorClass="text-rose-400" pct={pct(data.perdidaCompetencia)} note={yearNote} />
                  <div className="bg-dash-chip/40 rounded-xl px-3 py-3 border border-dashed border-theme-card/60">
                    <div className="text-[10px] text-theme-muted leading-tight">Suma ciclo</div>
                    <div className="text-sm font-bold text-theme-secondary mt-0.5">
                      {(data.enEjecucion + data.enAOM + data.enLiquidacion + data.liquidados + data.perdidaCompetencia).toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Donut por fondo — ahora en el centro */}
          <div id="pie-contratos-fondo">
            <div className="flex items-center gap-3 mb-0.5">
              <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CONTRATOS POR FONDO</span>
            </div>
            {filterNote && <p className="text-[9px] text-gold/60 mb-1">{filterNote}</p>}
            <div className="relative h-[280px] mt-2">
              {fondoDonut.length > 0 ? (
                <>
                  <ResponsivePie
                    data={fondoDonut}
                    theme={T}
                    margin={{ top: 12, right: 100, bottom: 12, left: 12 }}
                    innerRadius={0.55}
                    padAngle={2}
                    cornerRadius={3}
                    activeOuterRadiusOffset={5}
                    colors={{ datum: "data.color" }}
                    borderWidth={0}
                    enableArcLinkLabels={false}
                    arcLabelsSkipAngle={14}
                    arcLabelsTextColor={isDark ? "#fff" : "#1E293B"}
                    arcLabelsRadiusOffset={0.75}
                    legends={[{
                      anchor: "right" as const, direction: "column" as const, justify: false,
                      translateX: 90, translateY: 0, itemsSpacing: 4, itemWidth: 86, itemHeight: 13,
                      itemTextColor: isDark ? "#94A3B8" : "#475569", itemDirection: "left-to-right" as const, symbolSize: 7, symbolShape: "circle" as const,
                    }]}
                    tooltip={({ datum }) => (
                      <div style={{ padding: "6px 10px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 11 }}>
                        <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: datum.color, marginRight: 5 }} />
                        {datum.label}: <strong>{datum.value}</strong>
                      </div>
                    )}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingRight: 90 }}>
                    <span className="text-lg font-bold text-theme-primary">{data.nContratos}</span>
                    <span className="text-[9px] text-theme-secondary">contratos</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-theme-muted text-sm">Cargando…</span>
                </div>
              )}
            </div>
          </div>

          {/* SemiGauges — portafolio total — ahora a la derecha */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-gold font-bold uppercase tracking-widest text-[11px]">AVANCE PORTAFOLIO</span>
              <span className="text-[9px] text-theme-muted">(todos los estados)</span>
            </div>
            {filterNote && <p className="text-[9px] text-gold/60 mb-2">{filterNote}</p>}
            <div className="flex flex-col items-center gap-1">
              <div className="flex justify-around w-full">
                <SemiGauge value={data.avanceFisico}     label="Físico"     color="success" size="md" delay={0.05} />
                <SemiGauge value={data.avanceFinanciero} label="Financiero" color="success" size="md" delay={0.1} />
              </div>
              <SemiGauge value={data.avanceContrato} label="General" color="gold" size="lg" delay={0.15} />
            </div>
          </div>

        </div>
      </Card>

      {/* ── Portafolio financiero, usuarios y tipo de solución (filtrados) ── */}
      <Card delay={0.1} className="mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">PORTAFOLIO FINANCIERO</span>
            <p className="text-[9px] text-theme-muted mt-0.5 mb-1">Suma del portafolio · {data.financiero.filasConValor.toLocaleString("es-CO")} proyectos con valor</p>
            {filterNote && <p className="text-[9px] text-gold/60 mb-2">{filterNote}</p>}
            <div className="grid grid-cols-3 gap-2">
              <KpiChip label="Valor total" value={fmtCOPShort(data.financiero.valorProyecto)} colorClass="text-gold" note={yearNote} />
              <KpiChip label="Valor desembolsado" value={fmtCOPShort(data.financiero.valorDesembolsado)} colorClass="text-emerald-400" note={yearNote} />
              <KpiChip label="Valor por desembolsar" value={fmtCOPShort(data.financiero.valorPorDesembolsar)} colorClass="text-cyan-400" note={yearNote} />
            </div>
            <p className="text-[9px] text-theme-muted/70 mt-2 leading-relaxed">
              Detalle: {fmtCOP(data.financiero.valorProyecto)} · {fmtCOP(data.financiero.valorDesembolsado)} · {fmtCOP(data.financiero.valorPorDesembolsar)}
            </p>
          </div>

          <div>
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">USUARIOS ENERGÉTICOS</span>
            <p className="text-[9px] text-theme-muted mt-0.5 mb-1">Beneficiarios ZNI/SIN según matriz de reparto</p>
            {filterNote && <p className="text-[9px] text-gold/60 mb-2">{filterNote}</p>}
            <div className="grid grid-cols-2 gap-2">
              <KpiChip label="Contratados" value={fmtNum(data.usuarios.contratados)} accent note={yearNote} />
              <KpiChip label="Finales" value={fmtNum(data.usuarios.finales)} colorClass="text-teal-400" note={yearNote} />
              <KpiChip label="Proyectos c/ usuarios cont." value={fmtNum(data.usuarios.filasContratados)} colorClass="text-slate-400" note={yearNote} />
              <KpiChip label="Proyectos c/ usuarios fin." value={fmtNum(data.usuarios.filasFinales)} colorClass="text-slate-400" note={yearNote} />
            </div>
          </div>

          <div>
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">TIPO DE SOLUCIÓN</span>
            <p className="text-[9px] text-theme-muted mt-0.5 mb-1">
              Parques solares/generadores: <span className="text-gold font-semibold">{data.nFotovoltaicos}</span> proyectos
            </p>
            {filterNote && <p className="text-[9px] text-gold/60 mb-2">{filterNote}</p>}
            <div className="space-y-2">
              {data.porTipoSolucion.map(t => (
                <div key={t.tipo} className="flex items-center justify-between bg-dash-chip rounded-lg px-3 py-2">
                  <span className="text-[11px] text-theme-secondary truncate pr-2">{t.tipo}</span>
                  <span className="text-sm font-bold text-theme-primary shrink-0">{t.proyectos.toLocaleString("es-CO")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Evolución avance (filtrada) ── */}
      {avanceLine.length > 0 && (
        <Card delay={0.12}>
          <div className="flex items-center gap-3 mb-0.5">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">EVOLUCIÓN DEL AVANCE DE OBRA PROMEDIO (%)</span>
          </div>
          {filterNote && <p className="text-[9px] text-gold/60 mb-2">{filterNote}</p>}
          <div className="h-[220px] mt-4">
            <ResponsiveLine
              data={avanceLine}
              theme={T}
              margin={{ top: 10, right: 20, bottom: 36, left: 44 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: 100 }}
              curve="monotoneX"
              enablePoints
              pointSize={6}
              pointColor="#22C55E"
              pointBorderWidth={1}
              pointBorderColor="transparent"
              enableGridX={false}
              axisTop={null}
              axisRight={null}
              axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 5, format: (v) => `${v}%` }}
              axisBottom={{ tickSize: 0, tickPadding: 8 }}
              colors={["#22C55E"]}
              lineWidth={2}
              enableArea
              areaOpacity={0.12}
              useMesh
              tooltip={({ point }) => (
                <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                  Año {point.data.xFormatted}: <strong style={{ color: "#22C55E" }}>{point.data.yFormatted}%</strong>
                </div>
              )}
            />
          </div>
        </Card>
      )}

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}
