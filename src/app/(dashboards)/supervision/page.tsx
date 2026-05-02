"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import SemiGauge from "@/components/ui/SemiGauge";
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
function KpiChip({ label, value, accent = false, colorClass, pct }: { label: string; value: string | number; accent?: boolean; colorClass?: string; pct?: string }) {
  return (
    <div className="bg-dash-chip rounded-xl px-3 py-2.5">
      <div className={`text-base font-bold leading-none ${accent ? "text-amber-400" : colorClass ?? "text-theme-primary"}`}>{value}</div>
      {pct && <div className="text-[9px] text-theme-muted/70 mt-0.5 leading-none">{pct}</div>}
      <div className="text-[10px] text-theme-muted mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

// ─── Year Range Slider ────────────────────────────────────────────────────
const YEAR_MIN = 2003;
const YEAR_MAX = 2026;

function YearRangeSlider({ anoMin, anoMax, onChange }: {
  anoMin: number; anoMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const pct = (v: number) => ((v - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
  const isDefault = anoMin === YEAR_MIN && anoMax === YEAR_MAX;
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
        <span className="text-[10px] text-amber-400/70 uppercase tracking-widest font-bold">PERÍODO</span>
        <span className="font-mono text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{anoMin}</span>
        <div className="flex-1 h-px bg-amber-500/20" />
        <span className="font-mono text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{anoMax}</span>
        {!isDefault && (
          <button onClick={() => onChange(YEAR_MIN, YEAR_MAX)}
            className="text-[10px] text-theme-muted hover:text-red-400 transition-colors">
            ✕ Restablecer
          </button>
        )}
      </div>
      <div ref={trackRef} className="relative h-7 flex items-center mx-1" onMouseMove={handleTrackMouseMove}>
        <div className="absolute w-full h-1.5 bg-slate-700/60 rounded-full pointer-events-none" />
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
interface SupervisionData {
  nContratos: number; nProyectos: number;
  enEjecucion: number; enAOM: number; enLiquidacion: number;
  liquidados: number; perdidaCompetencia: number;
  avanceFisico: number; avanceFinanciero: number;
  avanceFisicoActivos: number; avanceFinancieroActivos: number;
  porFondo: FondoRow[]; avancePorAnio: AnioRow[];
  sankey: { fondo: SankeyNode[]; estado: SankeyNode[]; etapa: SankeyNode[]; ejecutor: SankeyNode[] };
}

const EMPTY_SANKEY = { fondo: [], estado: [], etapa: [], ejecutor: [] };
const DEFAULT: SupervisionData = {
  nContratos: 840, nProyectos: 2422,
  enEjecucion: 295, enAOM: 219, enLiquidacion: 129, liquidados: 166, perdidaCompetencia: 22,
  avanceFisico: 87.49, avanceFinanciero: 88.43,
  avanceFisicoActivos: 30.48, avanceFinancieroActivos: 46.97,
  porFondo: [], avancePorAnio: [],
  sankey: EMPTY_SANKEY,
};
const COLORS = ["#F59E0B","#8B5CF6","#06B6D4","#22C55E","#EF4444","#F97316","#EC4899","#14B8A6","#6366F1","#84CC16","#0EA5E9"];

// ─── SankeyFlow ────────────────────────────────────────────────────────────
interface SankeyFilters { fondo: string | null; estado: string | null; etapa: string | null; ejecutor: string | null }

function SankeyFlow({
  sankey, totalContratos, filters, onFilter,
}: {
  sankey: SupervisionData["sankey"];
  totalContratos: number;
  filters: SankeyFilters;
  onFilter: (level: keyof SankeyFilters, valor: string | null) => void;
}) {
  const cols: Array<{ key: keyof SankeyFilters; label: string; nodes: SankeyNode[] }> = [
    { key: "fondo",    label: "FONDO",    nodes: sankey.fondo    },
    { key: "estado",   label: "ESTADO",   nodes: sankey.estado   },
    { key: "etapa",    label: "ETAPA",    nodes: sankey.etapa    },
    { key: "ejecutor", label: "EJECUTOR", nodes: sankey.ejecutor },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-0 min-w-[700px]">
        <div className="flex flex-col items-center justify-center w-28 shrink-0 pr-2">
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl px-3 py-3 text-center w-full">
            <div className="text-amber-400 font-bold text-lg leading-none">{totalContratos}</div>
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
                <div className="text-[9px] text-amber-400/70 font-bold uppercase tracking-widest mb-1 text-center">{label}</div>
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
                        <span className={`font-medium leading-tight truncate max-w-[90px] ${isActive ? "text-amber-300" : "text-theme-primary"}`}>
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
        <div className="flex flex-wrap gap-2 mt-3">
          {(["fondo","estado","etapa","ejecutor"] as (keyof SankeyFilters)[]).map(k =>
            filters[k] ? (
              <span key={k} className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                {filters[k]}
                <button onClick={() => onFilter(k, null)} className="ml-0.5 hover:text-red-400">✕</button>
              </span>
            ) : null
          )}
          <button
            onClick={() => { onFilter("fondo",null); onFilter("estado",null); onFilter("etapa",null); onFilter("ejecutor",null); }}
            className="text-[10px] text-theme-muted hover:text-red-400 transition-colors">
            Limpiar todo
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
  const [data, setData] = useState<SupervisionData>(DEFAULT);
  const [filters, setFilters] = useState<SankeyFilters>({ fondo: null, estado: null, etapa: null, ejecutor: null });
  const [anoMin, setAnoMin] = useState(YEAR_MIN);
  const [anoMax, setAnoMax] = useState(YEAR_MAX);
  const [loading, setLoading] = useState(false);
  const yearDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback((f: SankeyFilters, yMin: number, yMax: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.fondo)    params.set("fondo",    f.fondo);
    if (f.estado)   params.set("estado",   f.estado);
    if (f.etapa)    params.set("etapa",    f.etapa);
    if (f.ejecutor) params.set("ejecutor", f.ejecutor);
    if (yMin !== YEAR_MIN) params.set("anoMin", String(yMin));
    if (yMax !== YEAR_MAX) params.set("anoMax", String(yMax));
    const url = `/api/supervision${params.toString() ? "?" + params.toString() : ""}`;
    fetch(url)
      .then(r => r.json())
      .then(raw => {
        setData({
          nContratos:              Number(raw.nContratos)              || 0,
          nProyectos:              Number(raw.nProyectos)              || 0,
          enEjecucion:             Number(raw.enEjecucion)             || 0,
          enAOM:                   Number(raw.enAOM)                   || 0,
          enLiquidacion:           Number(raw.enLiquidacion)           || 0,
          liquidados:              Number(raw.liquidados)              || 0,
          perdidaCompetencia:      Number(raw.perdidaCompetencia)      || 0,
          avanceFisico:            Number(raw.avanceFisico)            || 0,
          avanceFinanciero:        Number(raw.avanceFinanciero)        || 0,
          avanceFisicoActivos:     Number(raw.avanceFisicoActivos)     || 0,
          avanceFinancieroActivos: Number(raw.avanceFinancieroActivos) || 0,
          porFondo:      (raw.porFondo      || []).map((r: any) => ({ fondo: String(r.fondo), contratos: Number(r.contratos) })),
          avancePorAnio: (raw.avancePorAnio || []).map((r: any) => ({ anio: Number(r.anio), avg_avance_obra: Number(r.avg_avance_obra) })),
          sankey: {
            fondo:    (raw.sankey?.fondo    || []).map((n: any) => ({ valor: String(n.valor), n: Number(n.n) })),
            estado:   (raw.sankey?.estado   || []).map((n: any) => ({ valor: String(n.valor), n: Number(n.n) })),
            etapa:    (raw.sankey?.etapa    || []).map((n: any) => ({ valor: String(n.valor), n: Number(n.n) })),
            ejecutor: (raw.sankey?.ejecutor || []).map((n: any) => ({ valor: String(n.valor), n: Number(n.n) })),
          },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData({ fondo: null, estado: null, etapa: null, ejecutor: null }, YEAR_MIN, YEAR_MAX); }, []);

  const handleFilter = useCallback((level: keyof SankeyFilters, valor: string | null) => {
    const order: (keyof SankeyFilters)[] = ["fondo", "estado", "etapa", "ejecutor"];
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

  const handleYearChange = useCallback((min: number, max: number) => {
    setAnoMin(min);
    setAnoMax(max);
    if (yearDebounce.current) clearTimeout(yearDebounce.current);
    yearDebounce.current = setTimeout(() => fetchData(filters, min, max), 400);
  }, [fetchData, filters]);

  const fondoDonut = data.porFondo.slice(0, 10).map((f, i) => ({
    id: f.fondo, label: f.fondo, value: f.contratos, color: COLORS[i % COLORS.length],
  }));
  const avanceLine = data.avancePorAnio.length > 0 ? [{
    id: "Avance Obra", color: "#22C55E",
    data: data.avancePorAnio.map(a => ({ x: String(a.anio), y: +a.avg_avance_obra.toFixed(1) })),
  }] : [];

  const hasFilter = Object.values(filters).some(Boolean) || anoMin !== YEAR_MIN || anoMax !== YEAR_MAX;

  return (
    <DashboardLayout title="Supervisión de Contratos" subtitle="Estado, avance y distribución de contratos y proyectos supervisados">

      {/* ── Fila 1: KPIs + Gauges + Donut ── */}
      <Card delay={0.05} className="mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* KPI chips — ciclo de vida completo del contrato */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">INDICADORES CLAVE</span>
              {hasFilter && (
                <span className="text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">filtrado</span>
              )}
            </div>
            {(() => {
              const tot = data.nContratos || 1;
              const pct = (n: number) => `${((n / tot) * 100).toFixed(1)}% del total`;
              return (
                <div className="grid grid-cols-2 gap-2">
                  <KpiChip label="Contratos"          value={data.nContratos.toLocaleString("es-CO")}      accent />
                  <KpiChip label="Proyectos"          value={data.nProyectos.toLocaleString("es-CO")}      colorClass="text-slate-300" />
                  <KpiChip label="En Ejecución"       value={data.enEjecucion.toLocaleString("es-CO")}     colorClass="text-cyan-400"    pct={pct(data.enEjecucion)} />
                  <KpiChip label="AOM"                value={data.enAOM.toLocaleString("es-CO")}           colorClass="text-teal-400"    pct={pct(data.enAOM)} />
                  <KpiChip label="En Liquidación"     value={data.enLiquidacion.toLocaleString("es-CO")}   colorClass="text-amber-300"   pct={pct(data.enLiquidacion)} />
                  <KpiChip label="Liquidados"         value={data.liquidados.toLocaleString("es-CO")}      colorClass="text-emerald-400" pct={pct(data.liquidados)} />
                  <KpiChip label="Perdida Competencia" value={data.perdidaCompetencia.toLocaleString("es-CO")} colorClass="text-rose-400" pct={pct(data.perdidaCompetencia)} />
                  <div className="bg-dash-chip/40 rounded-xl px-3 py-2.5 border border-dashed border-theme-card/60">
                    <div className="text-[10px] text-theme-muted leading-tight">Suma ciclo</div>
                    <div className="text-xs font-bold text-theme-secondary mt-0.5">
                      {(data.enEjecucion + data.enAOM + data.enLiquidacion + data.liquidados + data.perdidaCompetencia).toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SemiGauges — portafolio total + solo activos */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">AVANCE PORTAFOLIO</span>
              <span className="text-[9px] text-theme-muted">(todos los estados)</span>
            </div>
            <div className="flex justify-around mb-3">
              <SemiGauge value={data.avanceFisico}     label="Físico"     color="success" size="md" delay={0.1} />
              <SemiGauge value={data.avanceFinanciero} label="Financiero" color="success" size="md" delay={0.15} />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyan-400 font-bold uppercase tracking-widest text-[11px]">AVANCE EN EJECUCIÓN</span>
              <span className="text-[9px] text-theme-muted">(solo activos)</span>
            </div>
            <div className="flex justify-around">
              <SemiGauge value={data.avanceFisicoActivos}     label="Físico"     color="gold" size="md" delay={0.2} />
              <SemiGauge value={data.avanceFinancieroActivos} label="Financiero" color="gold" size="md" delay={0.25} />
            </div>
          </div>

          {/* Donut por fondo */}
          <div>
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">CONTRATOS POR FONDO</span>
            <div className="relative h-[190px] mt-2">
              {fondoDonut.length > 0 ? (
                <>
                  <ResponsivePie
                    data={fondoDonut}
                    theme={T}
                    margin={{ top: 8, right: 92, bottom: 8, left: 8 }}
                    innerRadius={0.55}
                    padAngle={2}
                    cornerRadius={3}
                    activeOuterRadiusOffset={5}
                    colors={{ datum: "data.color" }}
                    borderWidth={0}
                    enableArcLinkLabels={false}
                    arcLabelsSkipAngle={14}
                    arcLabelsTextColor="#fff"
                    arcLabelsRadiusOffset={0.75}
                    legends={[{
                      anchor: "right" as const, direction: "column" as const, justify: false,
                      translateX: 90, translateY: 0, itemsSpacing: 4, itemWidth: 86, itemHeight: 13,
                      itemTextColor: "#94A3B8", itemDirection: "left-to-right" as const, symbolSize: 7, symbolShape: "circle" as const,
                    }]}
                    tooltip={({ datum }) => (
                      <div style={{ padding: "6px 10px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 11 }}>
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

        </div>
      </Card>

      {/* ── Fila 2: Flujo + Filtro de años ── */}
      <Card delay={0.1} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            FLUJO DE CONTRATOS — FONDO › ESTADO › ETAPA › EJECUTOR
          </span>
          {loading && <span className="text-[10px] text-theme-muted animate-pulse">actualizando…</span>}
        </div>
        <YearRangeSlider anoMin={anoMin} anoMax={anoMax} onChange={handleYearChange} />
        <SankeyFlow
          sankey={data.sankey}
          totalContratos={data.nContratos}
          filters={filters}
          onFilter={handleFilter}
        />
      </Card>

      {/* ── Fila 3: Línea evolución avance ── */}
      {avanceLine.length > 0 && (
        <Card delay={0.15}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">EVOLUCIÓN DEL AVANCE DE OBRA PROMEDIO (%)</span>
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
                <div style={{ padding: "8px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }}>
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
