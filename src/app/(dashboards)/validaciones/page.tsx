"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar, BarDatum } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { getNivoTheme } from "@/lib/nivo-theme";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SeriItem {
  area: string;
  anio: number;
  trimestre: number;
  estado: string;
  conteo: number;
}

interface ValidacionesData {
  serie: SeriItem[];
  resumen: Record<string, number>;
  ultimaActualizacion: string | null;
  filtros: {
    fondos: string[];
    anios: number[];
    prestadores: string[];
    departamentos: string[];
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// "a. Otros" excluido — igual que Power BI: solo 4 estados válidos
const ESTADOS_VALIDOS = ["b. VI", "c. VI SP", "d. VP", "e. VF"] as const;
type EstadoKey = (typeof ESTADOS_VALIDOS)[number];

const COLORES: Record<string, string> = {
  "e. VF":    "#FDE68A",
  "d. VP":    "#78350F",
  "c. VI SP": "#B45309",
  "b. VI":    "#F59E0B",
};

const LABELS: Record<string, string> = {
  "e. VF":    "VF — Validación Final",
  "d. VP":    "VP — Validación Pendiente",
  "c. VI SP": "VI SP — Validación Inicial Saldos Pendientes",
  "b. VI":    "VI — Validación Inicial",
};

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Card({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5
        hover:border-amber-500/40 transition-colors duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function KpiChip({ label, value, color = "#F59E0B" }: {
  label: string; value: number | string; color?: string;
}) {
  return (
    <div className="bg-dash-chip rounded-xl px-4 py-3 text-center min-w-[110px]">
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-theme-muted mt-1 leading-tight">{label}</div>
    </div>
  );
}

function SelectFiltro({ label, value, onChange, options, minWidth = "140px" }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; minWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ minWidth }}>
      <label className="text-[10px] text-theme-muted uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-dash-chip border border-theme-card rounded-lg px-3 py-1.5 text-xs
          text-theme-primary focus:outline-none focus:border-amber-500/60 cursor-pointer"
      >
        <option value="">Todas</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Transformación de datos ──────────────────────────────────────────────────

type BarRow = BarDatum & { id: string };

function buildChartData(
  serie: SeriItem[],
  area: string,
  anioDesde: number,
  anioHasta: number,
  soloTrimestre: number | null,
): BarRow[] {
  const groups = new Map<string, Record<string, number>>();

  for (const item of serie) {
    if (item.area !== area) continue;
    if (item.anio < anioDesde || item.anio > anioHasta) continue;
    if (soloTrimestre !== null && item.trimestre !== soloTrimestre) continue;
    // Ignorar "a. Otros" — igual que Power BI
    if (!ESTADOS_VALIDOS.includes(item.estado as EstadoKey)) continue;

    const key = `${item.anio} T${item.trimestre}`;
    if (!groups.has(key)) groups.set(key, { _anio: item.anio, _trim: item.trimestre });
    groups.get(key)![item.estado] = item.conteo;
  }

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => a._anio !== b._anio ? a._anio - b._anio : a._trim - b._trim)
    .map(([id, obj]) => {
      // Denominador = solo los 4 estados válidos (idéntico a Power BI)
      const total = ESTADOS_VALIDOS.reduce((s, e) => s + (obj[e] ?? 0), 0);
      const row: BarRow = { id };
      for (const e of ESTADOS_VALIDOS) {
        const raw = obj[e] ?? 0;
        row[e] = total > 0 ? parseFloat((raw / total * 100).toFixed(2)) : 0;
        row[`_n_${e}`] = raw;   // conteo absoluto para el tooltip
      }
      row["_total"] = total;
      return row;
    });
}

// ─── Gráfico individual ───────────────────────────────────────────────────────

function ValidacionBar({
  data, title, isDark, selectedPeriod, onPeriodSelect,
}: {
  data: BarRow[];
  title: string;
  isDark: boolean;
  selectedPeriod: string | null;
  onPeriodSelect: (period: string) => void;
}) {
  const theme = getNivoTheme(isDark);

  // Si hay periodo seleccionado, filtrar a solo ese; si no, mostrar todo
  const displayData = selectedPeriod
    ? data.filter((r) => r.id === selectedPeriod)
    : data;

  if (displayData.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-semibold text-theme-primary mb-3">{title}</h3>
        <div className="flex-1 flex items-center justify-center text-xs text-theme-muted">
          Sin datos para el filtro seleccionado
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-theme-primary mb-1">{title}</h3>
      {selectedPeriod && (
        <p className="text-[10px] text-amber-400 mb-2">
          Periodo: <strong>{selectedPeriod}</strong> — haz clic nuevamente para ver todos
        </p>
      )}
      <div className="flex-1" style={{ minHeight: 320 }}>
        <ResponsiveBar
          data={displayData}
          keys={[...ESTADOS_VALIDOS]}
          indexBy="id"
          groupMode="stacked"
          layout="vertical"
          valueScale={{ type: "linear" }}
          indexScale={{ type: "band", round: true }}
          colors={(bar) => COLORES[bar.id as string] ?? "#94A3B8"}
          theme={theme}
          margin={{ top: 10, right: 10, bottom: selectedPeriod ? 40 : 60, left: 44 }}
          padding={selectedPeriod ? 0.6 : 0.25}
          borderRadius={2}
          axisBottom={{
            tickRotation: displayData.length > 12 ? -45 : 0,
            tickSize: 4,
            legend: "Trimestre",
            legendPosition: "middle",
            legendOffset: selectedPeriod ? 32 : 52,
          }}
          axisLeft={{
            tickValues: [0, 20, 40, 60, 80, 100],
            format: (v) => `${v}%`,
            legend: "% Recuento",
            legendPosition: "middle",
            legendOffset: -38,
          }}
          enableLabel={false}
          enableTotals={false}
          onClick={(bar) => {
            onPeriodSelect(String(bar.indexValue));
          }}
          tooltip={({ id, value, data: barData }) => {
            const raw = (barData as Record<string, unknown>)[`_n_${String(id)}`] as number ?? 0;
            const total = (barData as Record<string, unknown>)["_total"] as number ?? 0;
            return (
              <div className="bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#E2E8F0] shadow-lg">
                <div className="font-semibold mb-1 text-amber-300">{String(barData.id)}</div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORES[String(id)] }} />
                  <span>{LABELS[String(id)] ?? String(id)}</span>
                </div>
                <div className="pl-3.5 text-[11px]">
                  <span className="font-bold text-amber-400">{raw.toLocaleString("es-CO")}</span>
                  <span className="text-[#94A3B8] ml-1.5">({value}%)</span>
                </div>
                <div className="pl-3.5 text-[10px] text-[#64748B] mt-0.5">
                  Total periodo: {total.toLocaleString("es-CO")}
                </div>
                <div className="mt-1.5 pt-1 border-t border-[#334155] text-[9px] text-[#64748B]">
                  Click para aislar este periodo
                </div>
              </div>
            );
          }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ValidacionesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [data, setData] = useState<ValidacionesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros — por defecto 2021-2024 igual que Power BI
  const [fondo, setFondo] = useState("");
  const [prestador, setPrestador] = useState("");
  const [anioDesde, setAnioDesde] = useState<string>("2021");
  const [anioHasta, setAnioHasta] = useState<string>("2024");
  const [trimestre, setTrimestre] = useState<string>("");
  const [departamento, setDepartamento] = useState("");

  // Estado para aislar un periodo al hacer click en una barra
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fondo)        params.set("fondo", fondo);
    if (prestador)    params.set("prestador", prestador);
    if (anioDesde)    params.set("anioDesde", anioDesde);
    if (anioHasta)    params.set("anioHasta", anioHasta);
    if (departamento) params.set("departamento", departamento);

    setLoading(true);
    setSelectedPeriod(null); // reset al cambiar filtros
    fetch(`/api/subsidios/validaciones?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setError(null); })
      .catch(() => setError("No se pudo cargar el tablero de validaciones"))
      .finally(() => setLoading(false));
  }, [fondo, prestador, anioDesde, anioHasta, departamento]);

  const anioDesdeNum = anioDesde ? Number(anioDesde) : 2021;
  const anioHastaNum = anioHasta ? Number(anioHasta) : 2024;
  const trimestreNum = trimestre ? Number(trimestre) : null;

  const sinData = useMemo(
    () => data ? buildChartData(data.serie, "SIN", anioDesdeNum, anioHastaNum, trimestreNum) : [],
    [data, anioDesdeNum, anioHastaNum, trimestreNum]
  );

  const zniData = useMemo(
    () => data ? buildChartData(data.serie, "ZNI", anioDesdeNum, anioHastaNum, trimestreNum) : [],
    [data, anioDesdeNum, anioHastaNum, trimestreNum]
  );

  // Toggle: mismo periodo = deseleccionar; distinto = seleccionar
  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod((prev) => (prev === period ? null : period));
  };

  // KPIs solo sobre estados válidos (excluye "a. Otros")
  const resumenValidos = useMemo(() => {
    if (!data) return { vf: 0, vp: 0, vi: 0, viSp: 0, total: 0 };
    const r = data.resumen;
    const vf   = r["e. VF"]    ?? 0;
    const vp   = r["d. VP"]    ?? 0;
    const vi   = r["b. VI"]    ?? 0;
    const viSp = r["c. VI SP"] ?? 0;
    return { vf, vp, vi, viSp, total: vf + vp + vi + viSp };
  }, [data]);

  const ultimaAct = data?.ultimaActualizacion
    ? new Date(data.ultimaActualizacion).toLocaleDateString("es-CO", {
        year: "numeric", month: "2-digit", day: "2-digit",
      })
    : "—";

  const esFiltroDefecto = !fondo && !prestador && anioDesde === "2021" && anioHasta === "2024" && !trimestre && !departamento;

  return (
    <DashboardLayout title="Relación de Cuentas Subsidios" subtitle="Subsidios — Validaciones y controles">

      {/* KPIs */}
      <Card delay={0.05} className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-theme-muted uppercase tracking-wider">Última actualización</p>
            <p className="text-sm font-semibold text-amber-400">{ultimaAct}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <KpiChip label="VF — Validación Final"       value={loading ? "…" : resumenValidos.vf.toLocaleString("es-CO")}    color="#FDE68A" />
            <KpiChip label="VP — Validación Pendiente"   value={loading ? "…" : resumenValidos.vp.toLocaleString("es-CO")}    color="#F59E0B" />
            <KpiChip label="VI — Validación Inicial"     value={loading ? "…" : resumenValidos.vi.toLocaleString("es-CO")}    color="#B45309" />
            <KpiChip label="VI SP — Saldos Pendientes"   value={loading ? "…" : resumenValidos.viSp.toLocaleString("es-CO")}  color="#78350F" />
            <KpiChip label="Total cuentas (SIN + ZNI)"  value={loading ? "…" : resumenValidos.total.toLocaleString("es-CO")} />
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card delay={0.1} className="mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <SelectFiltro label="Fondo"           value={fondo}        onChange={setFondo}        options={data?.filtros.fondos ?? []} />
          <SelectFiltro label="Año desde"       value={anioDesde}    onChange={setAnioDesde}    options={(data?.filtros.anios ?? []).map(String)} />
          <SelectFiltro label="Año hasta"       value={anioHasta}    onChange={setAnioHasta}    options={(data?.filtros.anios ?? []).map(String)} />
          <SelectFiltro label="Trimestre"       value={trimestre}    onChange={setTrimestre}    options={["1","2","3","4"]} />
          <SelectFiltro label="Departamento"    value={departamento} onChange={setDepartamento} options={data?.filtros.departamentos ?? []} minWidth="200px" />
          <SelectFiltro label="Nombre del Prestador" value={prestador} onChange={setPrestador}  options={data?.filtros.prestadores ?? []} minWidth="260px" />
          {!esFiltroDefecto && (
            <button
              onClick={() => { setFondo(""); setPrestador(""); setAnioDesde("2021"); setAnioHasta("2024"); setTrimestre(""); setDepartamento(""); }}
              className="text-[10px] text-amber-400 hover:text-amber-300 underline underline-offset-2 self-end pb-1.5"
            >
              Restaurar vista por defecto
            </button>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Indicador de periodo seleccionado */}
      {selectedPeriod && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-xs text-amber-400">Mostrando periodo: <strong>{selectedPeriod}</strong></span>
          <button
            onClick={() => setSelectedPeriod(null)}
            className="text-[10px] text-amber-400/70 hover:text-amber-300 underline underline-offset-2"
          >
            Ver todos los periodos
          </button>
        </div>
      )}

      {/* Gráficos SIN y ZNI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card delay={0.15} className={loading ? "opacity-60 animate-pulse" : ""}>
          <ValidacionBar
            data={sinData}
            title="SIN — Sistema Interconectado Nacional"
            isDark={isDark}
            selectedPeriod={selectedPeriod}
            onPeriodSelect={handlePeriodSelect}
          />
        </Card>
        <Card delay={0.2} className={loading ? "opacity-60 animate-pulse" : ""}>
          <ValidacionBar
            data={zniData}
            title="ZNI — Zonas No Interconectadas"
            isDark={isDark}
            selectedPeriod={selectedPeriod}
            onPeriodSelect={handlePeriodSelect}
          />
        </Card>
      </div>

      {/* Leyenda inferior */}
      <Card delay={0.25}>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {ESTADOS_VALIDOS.slice().reverse().map((estado) => (
            <div key={estado} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORES[estado] }} />
              <span className="text-xs text-theme-muted">{LABELS[estado]}</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-[10px] text-theme-muted mt-8">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}
