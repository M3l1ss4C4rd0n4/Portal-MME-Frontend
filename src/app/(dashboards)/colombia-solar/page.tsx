"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import Header from "@/components/Header";
import FilterBar from "@/components/colombia-solar/FilterBar";
import GaugeEficiencia from "@/components/colombia-solar/GaugeEficiencia";
import TablaDetalle from "@/components/colombia-solar/TablaDetalle";
import TablaORInicial from "@/components/colombia-solar/TablaORInicial";
import { formatNumber, formatKWp } from "@/lib/format";
import CurvaSChart, { type CurvaSData } from "@/components/colombia-solar/CurvaSChart";
import { getNivoTheme, type NivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";

const ChartMensual = dynamic(() => import("@/components/colombia-solar/ChartMensual"), { ssr: false, loading: () => <ChartSkeleton /> });
const BarEficienciaPrograma = dynamic(() => import("@/components/colombia-solar/BarEficienciaPrograma"), { ssr: false, loading: () => <ChartSkeleton /> });

function ChartSkeleton() {
  return <div className="animate-pulse h-full w-full rounded-xl bg-white/[0.03]" />;
}

interface FilterValues { programa: string[]; departamento: string[]; mes: string[]; tipo: string[]; contratista: string[]; }
interface FilterOptions { programas: string[]; departamentos: string[]; meses: string[]; tipos: string[]; contratistas: string[]; }
interface KPIData { planeado_usuarios: string; ejecutado_usuarios: string; kwp_planeado: string; kwp_ejecutado: string; eficiencia_pct: string; ultima_actualizacion: string | null; }

const EMPTY_FILTERS: FilterValues = { programa: [], departamento: [], mes: [], tipo: [], contratista: [] };

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const stack = error?.stack || "";
      return (
        <div className="min-h-screen bg-theme-primary text-[#F1F5F9] flex items-center justify-center p-8">
          <div className="bg-theme-secondary border border-red-500/30 rounded-2xl p-8 max-w-2xl w-full">
            <h2 className="text-red-400 font-bold text-lg mb-2">Error en el dashboard</h2>
            <p className="text-sm text-[#94A3B8] mb-4">{error?.message}</p>
            {stack && (
              <pre className="text-[10px] text-[#64748B] bg-black/30 rounded-lg p-4 mb-4 overflow-auto max-h-60">
                {stack}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ColombiaSolarDashboard() {
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [showORTable, setShowORTable] = useState(false);
  const [curvaS, setCurvaS] = useState<CurvaSData | null>(null);
  const [curvaPrograma, setCurvaPrograma] = useState<string>("");
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<string>("");
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("");

  useEffect(() => { setMounted(true); }, []);

  // Leer parámetros de URL (para capturas Playwright con filtros)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const nf: FilterValues = { programa: [], departamento: [], mes: [], tipo: [], contratista: [] };
    if (sp.has("programa"))     nf.programa     = sp.get("programa")!.split(",").filter(Boolean);
    if (sp.has("departamento")) nf.departamento = sp.get("departamento")!.split(",").filter(Boolean);
    if (sp.has("mes"))          nf.mes          = sp.get("mes")!.split(",").filter(Boolean);
    if (sp.has("tipo"))         nf.tipo         = sp.get("tipo")!.split(",").filter(Boolean);
    if (sp.has("contratista"))  nf.contratista  = sp.get("contratista")!.split(",").filter(Boolean);
    if (nf.programa.length || nf.departamento.length || nf.mes.length || nf.tipo.length || nf.contratista.length) {
      setFilters(nf);
    }
  }, []);

  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");

  useEffect(() => {
    setKpiLoading(true);
    setKpiError(null);
    const params = new URLSearchParams();
    filters.programa.forEach((v) => params.append("programa", v));
    filters.departamento.forEach((v) => params.append("departamento", v));
    filters.mes.forEach((v) => params.append("mes", v));
    filters.tipo.forEach((v) => params.append("tipo", v));
    filters.contratista.forEach((v) => params.append("contratista", v));

    fetch(`/api/kpis?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((r) => { setKpis(r.data); setKpiLoading(false); })
      .catch((err) => { setKpiError(err.message); setKpiLoading(false); });
  }, [filters.programa, filters.departamento, filters.mes, filters.tipo, filters.contratista]);

  const handleFilter = useCallback((key: keyof FilterValues, value: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClear = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const eficiencia = kpis ? Number(kpis.eficiencia_pct) : 0;

  // ── S-Curves ──────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (curvaPrograma.length > 0) {
      params.set("programa", curvaPrograma);
    }

    fetch(`/api/colombia-solar/curva-s?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((raw) => {
        if (raw.categorias?.length > 0) {
          setCurvaS(raw as CurvaSData);
        } else {
          setCurvaS(null);
        }
      })
      .catch((err) => {
        console.error("Error fetching Curva S:", err);
        setCurvaS(null);
      });
  }, [curvaPrograma]);

  const todosProyectosCurva = curvaS?.categorias[0]?.proyectos ?? [];

  const operadoresRed = useMemo(() => {
    const set = new Set<string>();
    for (const p of todosProyectosCurva) {
      if (p.operadorDeRed) set.add(p.operadorDeRed);
    }
    return [...set].sort();
  }, [todosProyectosCurva]);

  const proyectosCurvaFiltrados = useMemo(() => {
    if (!operadorSeleccionado) return todosProyectosCurva;
    return todosProyectosCurva.filter((p) => p.operadorDeRed === operadorSeleccionado);
  }, [todosProyectosCurva, operadorSeleccionado]);

  const curvaKpiFiltered = useMemo(() => {
    let totalUsuarios = 0;
    let totalPotencia = 0;
    for (const p of proyectosCurvaFiltrados) {
      if (proyectoSeleccionado && p.nombre !== proyectoSeleccionado) continue;
      totalUsuarios += p.usuarios ?? 0;
      totalPotencia += p.potencia ?? 0;
    }
    return { totalUsuarios, totalPotencia };
  }, [proyectosCurvaFiltrados, proyectoSeleccionado]);

  // Sync proyectoSeleccionado when operador changes
  useEffect(() => {
    if (proyectosCurvaFiltrados.length === 0) return;
    if (!proyectoSeleccionado) return; // "Todos los proyectos" es siempre válido
    const valido = proyectosCurvaFiltrados.some((p) => p.nombre === proyectoSeleccionado);
    if (!valido) {
      setProyectoSeleccionado(proyectosCurvaFiltrados[0].nombre);
    }
  }, [operadorSeleccionado, proyectosCurvaFiltrados, proyectoSeleccionado]);

  return (
    <ErrorBoundary>
    <Header />
    <DashboardLayout
      title="Comunidades Energéticas"
      subtitle="Seguimiento a la Implementación · Metas Cierre de Gobierno"
      downloadTablero="colombia-solar"
      downloadParams={{
        programa: filters.programa.join(','),
        departamento: filters.departamento.join(','),
        mes: filters.mes.join(','),
        tipo: filters.tipo.join(','),
        contratista: filters.contratista.join(','),
      }}
    >
      <div className="flex flex-col gap-6">
        {/* Fecha de actualización */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ fontSize: 11, color: "#64748B" }}>
            Datos actualizados al:
          </span>
          {kpiLoading ? (
            <div className="h-3.5 w-28 rounded animate-pulse bg-white/5" />
          ) : kpiError ? (
            <span style={{ fontSize: 11, color: "#EF4444" }}>Error</span>
          ) : (
            <span style={{ fontSize: 11, color: "var(--color-gold)", fontWeight: 600 }}>
              {kpis?.ultima_actualizacion
                ? new Date(kpis.ultima_actualizacion).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          )}
        </div>

        {/* KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Card>
            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              Usuarios Planeados
            </div>
            {kpiLoading ? (
              <div className="h-8 w-28 rounded-lg animate-pulse bg-white/5" />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-gold)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {kpis ? formatNumber(Number(kpis.planeado_usuarios)) : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>Meta total del programa</div>
          </Card>

          <Card>
            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              Usuarios Ejecutados
            </div>
            {kpiLoading ? (
              <div className="h-8 w-28 rounded-lg animate-pulse bg-white/5" />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 800, color: "#34D399", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {kpis ? formatNumber(Number(kpis.ejecutado_usuarios)) : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>Instalaciones completadas</div>
          </Card>

          <Card>
            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              kWp Planeado
            </div>
            {kpiLoading ? (
              <div className="h-8 w-28 rounded-lg animate-pulse bg-white/5" />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 800, color: "#FB923C", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {kpis ? formatKWp(Number(kpis.kwp_planeado)) : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>Potencia solar planificada</div>
          </Card>

          <Card>
            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              kWp Ejecutado
            </div>
            {kpiLoading ? (
              <div className="h-8 w-28 rounded-lg animate-pulse bg-white/5" />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 800, color: "#60A5FA", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {kpis ? formatKWp(Number(kpis.kwp_ejecutado)) : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>Potencia solar instalada</div>
          </Card>
        </div>

        {kpiError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm flex items-center justify-between">
            <span>Error cargando KPIs: {kpiError}</span>
            <button onClick={() => setFilters({ ...filters })} className="text-gold hover:text-gold font-semibold underline text-xs ml-4">Reintentar</button>
          </div>
        )}

        {/* FILTERS */}
        <Card>
          <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
            Filtros
          </div>
          <FilterBar values={filters} onChange={handleFilter} onClear={handleClear} />
        </Card>

        {/* CHARTS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Card style={{ display: "flex", flexDirection: "column", minHeight: 340 }}>
            <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              Planeado vs Ejecutado · Usuarios por Mes
            </div>
            <div style={{ flex: 1, minHeight: 260, overflow: "hidden" }}>
              {mounted && <ChartMensual filters={filters} />}
            </div>
          </Card>

          <Card style={{ display: "flex", flexDirection: "column", minHeight: 340 }}>
            <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              Eficiencia General
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }}>
              <GaugeEficiencia value={eficiencia} loading={kpiLoading} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--border-secondary)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-gold)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {kpis ? formatNumber(Number(kpis.planeado_usuarios)) : "—"}
                </div>
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Planeado</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#34D399", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {kpis ? formatNumber(Number(kpis.ejecutado_usuarios)) : "—"}
                </div>
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Ejecutado</div>
              </div>
            </div>
          </Card>

          <Card style={{ display: "flex", flexDirection: "column", minHeight: 340 }}>
            <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              Eficiencia por Programa
            </div>
            <div style={{ flex: 1, minHeight: 260, overflow: "hidden" }}>
              {mounted && <BarEficienciaPrograma filters={filters} />}
            </div>
          </Card>
        </div>

        {/* TABLE */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 6, height: 20, background: "var(--color-gold)", borderRadius: 4, flexShrink: 0 }} />
            <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Detalle por Contrato
            </div>
          </div>
          <TablaDetalle filters={filters} />
        </Card>

        {/* TOGGLE BUTTON OR TABLE */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => setShowORTable((s) => !s)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showORTable ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {showORTable ? "OCULTAR" : "VER"} TABLA DE OPERADORES DE RED INICIAL
          </button>
        </div>

        {/* OR TABLE */}
        {showORTable && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ width: 6, height: 20, background: "var(--color-gold)", borderRadius: 4, flexShrink: 0 }} />
              <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Operadores de Red Inicial
              </div>
            </div>
            <TablaORInicial filters={filters} />
          </Card>
        )}

        {/* ── CURVAS S ── */}
        {curvaS && curvaS.categorias.length > 0 && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--color-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  CURVAS S POR PROYECTO
                </div>
                <p style={{ fontSize: 9, color: "#64748B", marginTop: 4 }}>
                  Avance programado vs real — obras civiles, usuarios, potencia e internas
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, fontSize: 10, color: "#64748B" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: "#06B6D4", flexShrink: 0 }} />
                    Programado
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: "#F59E0B", flexShrink: 0 }} />
                    Real
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, padding: "8px 12px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-gold)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {curvaKpiFiltered.totalUsuarios.toLocaleString("es-CO")}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>Número de usuarios</div>
                </div>
                <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, padding: "8px 12px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FB923C", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {curvaKpiFiltered.totalPotencia.toLocaleString("es-CO")} mWp
                  </div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>Potencia total instalada</div>
                </div>
                <div style={{ width: 1, height: 32, background: "var(--border-primary)" }} />
                <select
                  value={curvaPrograma}
                  onChange={(e) => setCurvaPrograma(e.target.value)}
                  className="border border-theme-primary text-theme-primary rounded-lg px-3 py-1.5 text-[11px] cursor-pointer min-w-[160px]" style={{ backgroundColor: "var(--bg-secondary)" }}
                  aria-label="Programa"
                >
                  <option value="">Todos los programas</option>
                  <option value="CE: Contratos OR">CE: Contratos OR</option>
                  <option value="Colombia Solar">Colombia Solar</option>
                </select>
                <select
                  value={operadorSeleccionado}
                  onChange={(e) => setOperadorSeleccionado(e.target.value)}
                  className="border border-theme-primary text-theme-primary rounded-lg px-3 py-1.5 text-[11px] cursor-pointer min-w-[160px]" style={{ backgroundColor: "var(--bg-secondary)" }}
                  aria-label="Operador de red"
                >
                  <option value="">Todos los operadores</option>
                  {operadoresRed.map((or) => (
                    <option key={or} value={or}>{or}</option>
                  ))}
                </select>
                <select
                  value={proyectoSeleccionado}
                  onChange={(e) => setProyectoSeleccionado(e.target.value)}
                  className="border border-theme-primary text-theme-primary rounded-lg px-3 py-1.5 text-[11px] cursor-pointer min-w-[160px]" style={{ backgroundColor: "var(--bg-secondary)" }}
                  aria-label="Proyecto"
                >
                  <option value="">Todos los proyectos</option>
                  {proyectosCurvaFiltrados.map((p) => (
                    <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {curvaS.categorias.map((cat) => {
                const proyecto = cat.proyectos.find((p) => p.nombre === proyectoSeleccionado) ?? cat.proyectos[0];
                return (
                  <div
                    key={cat.id}
                    id={`curva-s-${cat.id}`}
                    style={{ borderRadius: 12, border: "1px solid var(--border-primary)", background: "var(--bg-primary)", padding: 12, overflow: "hidden" }}
                  >
                    {mounted && (
                      <CurvaSChart
                        title={cat.label}
                        proyectos={proyectoSeleccionado ? [proyecto!] : cat.proyectos}
                        theme={T}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#475569" }}>
          Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
        </p>
      </div>
    </DashboardLayout>
    </ErrorBoundary>
  );
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`bg-theme-secondary border border-theme-card rounded-2xl hover:border-amber-500/40 transition-colors duration-300 ${className}`}
      style={{ padding: 16, ...style }}
    >
      {children}
    </div>
  );
}
