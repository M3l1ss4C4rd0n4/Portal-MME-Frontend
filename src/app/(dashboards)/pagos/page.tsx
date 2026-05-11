"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { getNivoTheme } from "@/lib/nivo-theme";
import SemiGauge from "@/components/ui/SemiGauge";

// ─── Helpers ──────────────────────────────────────────────────────────────
function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

const fmtCOP = (v: number) => `$ ${Math.round(v).toLocaleString("es-CO")}`;
const fmtFull = (v: number) => v.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── MultiSelect ──────────────────────────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderLabel,
  minWidth = "88px",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  renderLabel?: (v: string) => string;
  minWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isTodos = selected.length === 0;
  const btnLabel = isTodos
    ? "Todos"
    : selected.length === 1
    ? (renderLabel ? renderLabel(selected[0]) : selected[0])
    : `${selected.length} sel.`;

  const toggle = (v: string) => {
    if (isTodos) {
      // Desde "Todos", seleccionar solo este
      onChange([v]);
    } else {
      const next = selected.includes(v)
        ? selected.filter((s) => s !== v)
        : [...selected, v];
      onChange(next); // vacío = "Todos"
    }
  };

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-[10px] text-theme-muted uppercase font-semibold tracking-wide">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ minWidth }}
        className="bg-theme-primary text-theme-primary text-xs border border-theme-card rounded px-2 py-1.5 flex items-center gap-1 hover:border-amber-500/50 focus:outline-none focus:border-amber-500 transition-colors"
      >
        <span className="flex-1 text-left truncate">{btnLabel}</span>
        <span className="text-theme-muted text-[10px] shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#0F172A] border border-slate-700 rounded-lg shadow-2xl min-w-[170px] max-h-[240px] overflow-y-auto">
          {/* Todos */}
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer border-b border-slate-700/60 text-xs select-none">
            <input
              type="checkbox"
              checked={isTodos}
              onChange={() => onChange([])}
              className="accent-amber-500 shrink-0"
            />
            <span className="text-amber-400 font-semibold">Todos</span>
          </label>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-xs select-none"
            >
              <input
                type="checkbox"
                checked={!isTodos && selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-amber-500 shrink-0"
              />
              <span className="text-slate-300 truncate max-w-[200px]">
                {renderLabel ? renderLabel(opt) : opt}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────
interface Kpis {
  valorAsignado: number;
  valorPagado: number;
  valorPendiente: number;
  totalResoluciones: number;
  resolucionesPendientes: number;
  pctPagado: number;
}

interface TrimestreItem {
  periodo: string;
  anio: number;
  trimestre: number;
  pagado: number;
  pendiente: number;
}

interface ResolucionItem {
  noResolucion: number;
  anio: number;
  valorAsignado: number;
  valorPagado: number;
  saldoPendiente: number;
}

interface PrestadorItem {
  nombre: string;
  saldoPendiente: number;
}

interface FiltrosOpciones {
  prestadores: string[];
  aniosPago: number[];
  aniosExpedicion: number[];
  estadosPago: string[];
  resoluciones: number[];
  trimestres: number[];
  areas: string[];
  fondos: string[];
  departamentos: string[];
}

interface DashboardData {
  kpis: Kpis;
  trimestres: TrimestreItem[];
  resoluciones: ResolucionItem[];
  prestadoresPendientes: PrestadorItem[];
  filtrosOpciones: FiltrosOpciones;
}

interface FiltrosState {
  prestadores: string[];
  aniosPago: string[];
  aniosExp: string[];
  estadosPago: string[];
  resoluciones: string[];
  trimestres: string[];
  areas: string[];
  fondos: string[];
  departamentos: string[];
}

const FILTROS_VACIOS: FiltrosState = {
  prestadores: [],
  aniosPago: [],
  aniosExp: [],
  estadosPago: [],
  resoluciones: [],
  trimestres: [],
  areas: [],
  fondos: [],
  departamentos: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function PagosPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_VACIOS);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    filtros.prestadores.forEach((v)  => params.append("prestador",  v));
    filtros.aniosPago.forEach((v)    => params.append("anioPago",    v));
    filtros.aniosExp.forEach((v)     => params.append("anioExp",     v));
    filtros.estadosPago.forEach((v)  => params.append("estadoPago",  v));
    filtros.resoluciones.forEach((v) => params.append("resolucion",  v));
    filtros.trimestres.forEach((v)   => params.append("trimestre",   v));
    filtros.areas.forEach((v)        => params.append("area",        v));
    filtros.fondos.forEach((v)       => params.append("fondo",       v));
    filtros.departamentos.forEach((v)=> params.append("departamento",v));
    return params.toString();
  }, [filtros]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = buildQuery();
    fetch(`/api/subsidios/pagos-detalle${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((raw) => {
        if (cancelled) return;
        if (raw.error) { setError(raw.error); setData(null); }
        else setData(raw as DashboardData);
      })
      .catch((err) => { if (!cancelled) { setError(String(err)); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildQuery]);

  // Validar filtros seleccionados contra las opciones disponibles del backend
  // Si un filtro seleccionado ya no está disponible, se limpia automáticamente
  useEffect(() => {
    if (!data?.filtrosOpciones) return;

    const { filtrosOpciones } = data;

    setFiltros((prev) => {
      const next = { ...prev };

      // Validar prestadores
      const prestadoresValidos = new Set(filtrosOpciones.prestadores);
      next.prestadores = prev.prestadores.filter((p) => prestadoresValidos.has(p));

      // Validar años de pago
      const aniosPagoValidos = new Set(filtrosOpciones.aniosPago.map(String));
      next.aniosPago = prev.aniosPago.filter((a) => aniosPagoValidos.has(a));

      // Validar años de expedición
      const aniosExpValidos = new Set(filtrosOpciones.aniosExpedicion.map(String));
      next.aniosExp = prev.aniosExp.filter((a) => aniosExpValidos.has(a));

      // Validar estados de pago
      const estadosValidos = new Set(filtrosOpciones.estadosPago);
      next.estadosPago = prev.estadosPago.filter((e) => estadosValidos.has(e));

      // Validar resoluciones
      const resolucionesValidas = new Set(filtrosOpciones.resoluciones.map(String));
      next.resoluciones = prev.resoluciones.filter((r) => resolucionesValidas.has(r));

      // Validar trimestres
      const trimestresValidos = new Set(filtrosOpciones.trimestres.map(String));
      next.trimestres = prev.trimestres.filter((t) => trimestresValidos.has(t));

      // Validar áreas
      const areasValidas = new Set(filtrosOpciones.areas);
      next.areas = prev.areas.filter((a) => areasValidas.has(a));

      // Validar fondos
      const fondosValidos = new Set(filtrosOpciones.fondos);
      next.fondos = prev.fondos.filter((f) => fondosValidos.has(f));

      // Validar departamentos
      const deptosValidos = new Set(filtrosOpciones.departamentos);
      next.departamentos = prev.departamentos.filter((d) => deptosValidos.has(d));

      return next;
    });
  }, [data?.filtrosOpciones]);

  const hayFiltros = useMemo(
    () => Object.values(filtros).some((arr) => arr.length > 0),
    [filtros]
  );

  const set = (key: keyof FiltrosState) => (v: string[]) =>
    setFiltros((prev) => ({ ...prev, [key]: v }));

  if (loading && !data) {
    return (
      <DashboardLayout title="Detalle de pagos" subtitle="Relación de cuentas de subsidios por vigencia">
        <div className="flex items-center justify-center h-64 text-theme-muted">Cargando datos…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Detalle de pagos" subtitle="Relación de cuentas de subsidios por vigencia">
        <div className="flex items-center justify-center h-64 text-red-400">
          Error al cargar datos: {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Detalle de pagos" subtitle="Relación de cuentas de subsidios por vigencia">
        <div className="flex items-center justify-center h-64 text-theme-muted">Sin datos disponibles</div>
      </DashboardLayout>
    );
  }

  const { kpis, trimestres, resoluciones, prestadoresPendientes, filtrosOpciones } = data;

  const trimestreBarData = trimestres.map((t) => ({
    periodo: t.periodo,
    Pagado: +(t.pagado / 1e6).toFixed(1),
    Pendiente: +(t.pendiente / 1e6).toFixed(1),
  }));

  const prestadoresBarData = [...prestadoresPendientes]
    .reverse()
    .map((p) => ({
      prestador: p.nombre.length > 35 ? p.nombre.slice(0, 35) + "…" : p.nombre,
      Pendiente: +(p.saldoPendiente / 1e6).toFixed(1),
    }));

  const tooltipStyle = {
    padding: "8px 12px",
    background: "#1E293B",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#E2E8F0",
    fontSize: 12,
  };

  // Opciones convertidas a string para MultiSelect
  const optsAniosPago    = filtrosOpciones.aniosPago.map(String);
  const optsAniosExp     = filtrosOpciones.aniosExpedicion.map(String);
  const optsTrimestres   = filtrosOpciones.trimestres.map(String);
  const optsResoluciones = filtrosOpciones.resoluciones.map(String);

  return (
    <DashboardLayout title="Detalle de pagos" subtitle="Relación de cuentas de subsidios por vigencia">

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
        <Card delay={0.05}>
          <div className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wide">Valor Asignado</div>
          <div className="mt-1.5 text-lg font-extrabold text-theme-primary leading-none tabular-nums">
            {fmtCOP(kpis.valorAsignado)}
          </div>
        </Card>
        <Card delay={0.08}>
          <div className="text-[10px] text-emerald-400/80 font-semibold uppercase tracking-wide">Valor Pagado</div>
          <div className="mt-1.5 text-lg font-extrabold text-emerald-400 leading-none tabular-nums">
            {fmtCOP(kpis.valorPagado)}
          </div>
        </Card>
        <Card delay={0.11}>
          <div className="text-[10px] text-red-400/80 font-semibold uppercase tracking-wide">Valor Pendiente</div>
          <div className="mt-1.5 text-lg font-extrabold text-red-400 leading-none tabular-nums">
            {fmtCOP(kpis.valorPendiente)}
          </div>
        </Card>
        <Card delay={0.14}>
          <div className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wide">Res. Pendientes</div>
          <div className="mt-1.5 text-lg font-extrabold text-amber-400 leading-none tabular-nums">
            {kpis.resolucionesPendientes}
          </div>
        </Card>
        <Card delay={0.17}>
          <div className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wide">Total Resoluciones</div>
          <div className="mt-1.5 text-lg font-extrabold text-theme-primary leading-none tabular-nums">
            {kpis.totalResoluciones}
          </div>
        </Card>
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <Card delay={0.2} className="mb-5">
        <div className="flex flex-wrap items-end gap-3">

          <MultiSelect
            label="Prestador"
            options={filtrosOpciones.prestadores}
            selected={filtros.prestadores}
            onChange={set("prestadores")}
            renderLabel={(v) => v.length > 30 ? v.slice(0, 30) + "…" : v}
            minWidth="180px"
          />

          <MultiSelect
            label="Año Vigencia"
            options={optsAniosPago}
            selected={filtros.aniosPago}
            onChange={set("aniosPago")}
            minWidth="100px"
          />

          <MultiSelect
            label="Año Expedición"
            options={optsAniosExp}
            selected={filtros.aniosExp}
            onChange={set("aniosExp")}
            minWidth="110px"
          />

          <MultiSelect
            label="Estado Pago"
            options={filtrosOpciones.estadosPago}
            selected={filtros.estadosPago}
            onChange={set("estadosPago")}
          />

          <MultiSelect
            label="Resolución"
            options={optsResoluciones}
            selected={filtros.resoluciones}
            onChange={set("resoluciones")}
          />

          <MultiSelect
            label="Trimestre"
            options={optsTrimestres}
            selected={filtros.trimestres}
            onChange={set("trimestres")}
            renderLabel={(v) => `T${v}`}
          />

          <MultiSelect
            label="Área"
            options={filtrosOpciones.areas}
            selected={filtros.areas}
            onChange={set("areas")}
          />

          <MultiSelect
            label="Fondo"
            options={filtrosOpciones.fondos}
            selected={filtros.fondos}
            onChange={set("fondos")}
          />

          <MultiSelect
            label="Departamento"
            options={filtrosOpciones.departamentos}
            selected={filtros.departamentos}
            onChange={set("departamentos")}
            minWidth="160px"
          />

          {hayFiltros && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] opacity-0">x</span>
              <button
                onClick={() => setFiltros(FILTROS_VACIOS)}
                className="text-[11px] text-amber-400 border border-amber-700/40 rounded px-3 py-1.5 hover:bg-amber-500/10 transition-colors"
              >
                × Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ── Gráfico trimestres + Gauge ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.25} className="lg:col-span-2">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            Valores pagados y pendientes por trimestre
          </span>
          <div className="h-[280px] mt-4">
            <ResponsiveBar
              data={trimestreBarData}
              keys={["Pagado", "Pendiente"]}
              indexBy="periodo"
              theme={T}
              margin={{ top: 8, right: 20, bottom: 50, left: 70 }}
              groupMode="grouped"
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={["#F59E0B", "#EF4444"]}
              padding={0.25}
              innerPadding={2}
              enableLabel={false}
              enableGridX={false}
              axisTop={null}
              axisRight={null}
              axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => `${v}M` }}
              axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -30 }}
              tooltip={({ id, value, indexValue }) => (
                <div style={tooltipStyle}>
                  {indexValue} — {id}: <strong>{fmtCOP(value * 1e6)}</strong>
                </div>
              )}
            />
          </div>
        </Card>

        <Card delay={0.3} className="flex flex-col items-center justify-center">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px] mb-4">
            Porcentaje pagado
          </span>
          <SemiGauge value={kpis.pctPagado} label="Pagado / Asignado" size="lg" color="gold" />
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-theme-primary">
              {kpis.pctPagado.toFixed(2)}%
            </div>
            <div className="text-[10px] text-theme-muted">
              {fmtCOP(kpis.valorPagado)} / {fmtCOP(kpis.valorAsignado)}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tabla resoluciones + Prestadores pendientes ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.35}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            Resoluciones
          </span>
          <div className="mt-3 overflow-auto max-h-[320px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-theme-secondary z-10">
                <tr className="border-b border-theme-card">
                  <th className="text-left py-2 pr-3 text-theme-muted font-semibold">No.</th>
                  <th className="text-left py-2 pr-3 text-theme-muted font-semibold">Año</th>
                  <th className="text-right py-2 pr-3 text-theme-muted font-semibold">Asignado</th>
                  <th className="text-right py-2 pr-3 text-theme-muted font-semibold">Pagado</th>
                  <th className="text-right py-2 text-theme-muted font-semibold">Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {resoluciones.map((r) => (
                  <tr
                    key={r.noResolucion}
                    className="border-b border-theme-card/50 hover:bg-theme-primary/30 transition-colors"
                  >
                    <td className="py-2 pr-3 text-theme-primary font-medium">{r.noResolucion}</td>
                    <td className="py-2 pr-3 text-theme-secondary">{r.anio}</td>
                    <td className="py-2 pr-3 text-right text-amber-400 tabular-nums">{fmtFull(r.valorAsignado)}</td>
                    <td className="py-2 pr-3 text-right text-emerald-400 tabular-nums">{fmtFull(r.valorPagado)}</td>
                    <td className={`py-2 text-right tabular-nums ${r.saldoPendiente > 0 ? "text-red-400 font-semibold" : "text-theme-secondary"}`}>
                      {fmtFull(r.saldoPendiente)}
                    </td>
                  </tr>
                ))}
                {resoluciones.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-theme-muted">
                      No hay resoluciones para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card delay={0.4}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            Prestadores de servicio pendiente de pago
          </span>
          <div className="h-[320px] mt-4">
            <ResponsiveBar
              data={prestadoresBarData}
              keys={["Pendiente"]}
              indexBy="prestador"
              theme={T}
              layout="horizontal"
              margin={{ top: 8, right: 30, bottom: 30, left: 180 }}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={["#F59E0B"]}
              padding={0.3}
              enableLabel={true}
              label={(d) => `${Math.round(Number(d.value))}M`}
              labelTextColor="#fff"
              enableGridX={false}
              enableGridY={false}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 6, format: (v) => `${v}M` }}
              axisLeft={{ tickSize: 0, tickPadding: 8 }}
              tooltip={({ value, indexValue }) => (
                <div style={tooltipStyle}>
                  {indexValue}: <strong>{fmtCOP(value * 1e6)}</strong>
                </div>
              )}
            />
          </div>
        </Card>
      </div>

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}
