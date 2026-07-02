"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import * as XLSX from 'xlsx';
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
function KpiChip({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-dash-chip rounded-xl px-3 py-2.5">
      <div className={`text-base font-bold leading-none ${accent ? "text-gold" : "text-theme-primary"}`}>{value}</div>
      <div className="text-[10px] text-theme-muted mt-1 leading-tight">{label}</div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────
interface Proyecto {
  nombre: string;
  ejecutor: string;
  departamento: string;
  municipio: string;
  avanceGeneral: number;
  avanceFisico: number;
  avanceFinanciero: number;
  totalDesembolsos: number;
  pagosRealizados: number;
}
interface Desembolso {
  numero: number;
  actNecesarias: number;
  actCompletas: number;
  pctCompletado: number;
  proyectosPagados: number;
}
interface ContratosData {
  nContratos: number;
  avanceGeneral: number;
  avanceFinanciero: number;
  avanceFisico: number;
  pagosRealizados: number;
  pagosPosibles: number;
  pctPagosRealizados: number;
  desembolsos: Desembolso[];
  proyectos: Proyecto[];
}
const DEFAULT: ContratosData = {
  nContratos: 17,
  avanceGeneral: 16.1,
  avanceFinanciero: 50.0,
  avanceFisico: 0,
  pagosRealizados: 17,
  pagosPosibles: 68,
  pctPagosRealizados: 25.0,
  desembolsos: [],
  proyectos: [],
};

interface CurvaSPoint {
  fecha: string;
  programado: number;
  real: number | null;
}

interface CurvaSProyecto {
  nombre: string;
  departamento: string;
  operadorDeRed: string;
  programado: CurvaSPoint[];
  realFuente?: "reportado" | "reportado_usuarios" | "sin_avance" | "sin_datos";
  /** Número total de usuarios del proyecto */
  usuarios?: number;
  /** Potencia total instalada en MWp del proyecto */
  potencia?: number;
}

interface CurvaSCategoria {
  id: string;
  label: string;
  proyectos: CurvaSProyecto[];
}

interface CurvaSData {
  categorias: CurvaSCategoria[];
}

interface ActaItem {
  id: string;
  name: string;
  lastModified?: string;
  tipo?: "pdf" | "docx";
}

type NivoTheme = ReturnType<typeof getNivoTheme>;

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatFechaEje(iso: string): string {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  return `${d} ${MESES_CORTO[m - 1] ?? m}`;
}

function formatFechaTooltip(iso: string): string {
  const [y, m, d] = String(iso).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function pickTickValues(fechas: string[], maxTicks = 14): string[] {
  if (fechas.length <= maxTicks) return fechas;
  const indices = new Set<number>();
  for (let i = 0; i < maxTicks; i++) {
    const idx = Math.round((i * (fechas.length - 1)) / (maxTicks - 1));
    indices.add(idx);
  }
  return [...indices].sort((a, b) => a - b).map((i) => fechas[i]);
}

function computeAverageLine(
  proyectos: CurvaSProyecto[],
  field: "programado" | "real"
): Array<{ x: string; y: number | null }> {
  const map = new Map<string, number[]>();
  for (const proj of proyectos) {
    for (const point of proj.programado) {
      let val: number | null = null;
      if (field === "programado") {
        val = Number(point.programado) || 0;
      } else {
        val = point.real;
      }
      if (val != null) {
        const arr = map.get(point.fecha) ?? [];
        arr.push(val);
        map.set(point.fecha, arr);
      }
    }
  }
  const fechas = [...map.keys()].sort();
  return fechas.map((fecha) => {
    const vals = map.get(fecha)!;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { x: fecha, y: Number(avg.toFixed(2)) };
  });
}

function pickRealNota(proyectos: CurvaSProyecto[]): string | null {
  const fuentes = new Set<string>();
  for (const p of proyectos) {
    if (p.realFuente) fuentes.add(p.realFuente);
  }
  if (fuentes.has("reportado_usuarios")) return "Real: hoja Usuarios (sin reporte en esta dimensión)";
  if (fuentes.has("sin_avance")) return "Real: sin avance registrado aún";
  if (fuentes.has("sin_datos")) return "Real: sin reporte en Excel";
  return null;
}

function CurvaSChart({
  title,
  proyectos,
  theme,
}: {
  title: string;
  proyectos: CurvaSProyecto[];
  theme: NivoTheme;
}) {
  if (!proyectos.length) {
    return (
      <div className="flex flex-col h-full min-h-[220px]">
        <span className="text-[11px] font-semibold text-theme-primary mb-2">{title}</span>
        <div className="flex-1 flex items-center justify-center text-theme-muted text-xs">Sin datos</div>
      </div>
    );
  }

  const isMulti = proyectos.length > 1;
  const realNota = pickRealNota(proyectos);

  const data: Array<{ id: string; color: string; data: Array<{ x: string; y: number | null }> }> = [];

  if (isMulti) {
    const progAvg = computeAverageLine(proyectos, "programado");
    const realAvg = computeAverageLine(proyectos, "real");
    data.push({ id: "Programado promedio", color: "#06B6D4", data: progAvg });
    data.push({ id: "Real", color: "#F59E0B", data: realAvg });
  } else {
    const p = proyectos[0];
    data.push({
      id: "Programado",
      color: "#06B6D4",
      data: p.programado.map((d) => ({
        x: d.fecha,
        y: Number((Number(d.programado) || 0).toFixed(2)),
      })),
    });
    data.push({
      id: "Real",
      color: "#F59E0B",
      data: p.programado.map((d) => ({
        x: d.fecha,
        y: d.real != null ? Number(d.real.toFixed(2)) : null,
      })),
    });
  }

  const fechas = data[0].data.map((d) => d.x);
  const tickValues = pickTickValues(fechas, 14);
  const chartTheme: NivoTheme = {
    ...theme,
    axis: {
      ...theme.axis,
      ticks: {
        ...theme.axis?.ticks,
        text: {
          ...(theme.axis?.ticks?.text ?? {}),
          fontSize: 8,
        },
      },
    },
  };

  return (
    <div className="flex flex-col h-full min-h-[220px]">
      <div className="mb-2">
        <span className="text-[11px] font-semibold text-theme-primary">{title}</span>
        {realNota && (
          <p className="text-[9px] text-gold/80 mt-0.5 leading-tight">{realNota}</p>
        )}
        {isMulti && (
          <p className="text-[9px] text-cyan-400/70 mt-0.5 leading-tight">
            Promedio de {proyectos.length} proyectos
          </p>
        )}
      </div>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveLine
          data={data}
          theme={chartTheme}
          margin={{ top: 8, right: 16, bottom: 48, left: 44 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: 100, stacked: false }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 6,
            tickRotation: -40,
            tickValues,
            format: (v) => formatFechaEje(String(v)),
          }}
          axisLeft={{
            tickSize: 4,
            tickPadding: 4,
            tickRotation: 0,
            legend: "%",
            legendOffset: -36,
            legendPosition: "middle",
            format: (v) => `${v}%`,
          }}
          colors={["#06B6D4", "#F59E0B"]}
          lineWidth={2}
          pointSize={4}
          pointColor={{ theme: "background" }}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          enableArea
          areaOpacity={0.12}
          useMesh
          enableGridX={false}
          tooltip={({ point }) => (
            <div className="px-3 py-2 rounded-lg border border-theme-card bg-[#1E293B] text-[11px] text-theme-primary">
              <div className="font-semibold mb-1">{formatFechaTooltip(String(point.data.x))}</div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: point.seriesColor }} />
                <span>
                  {point.seriesId}: <strong>{Number(point.data.y).toFixed(2)}%</strong>
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ContratosORPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");
  const isDark = resolvedTheme === "dark";
  const [data, setData] = useState<ContratosData>(DEFAULT);
  const [curvaS, setCurvaS] = useState<CurvaSData | null>(null);
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<string>("");
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("");

  // Leer parámetros de URL (para capturas Playwright con filtros)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("operadorDeRed")) setOperadorSeleccionado(sp.get("operadorDeRed")!);
  }, []);

  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>("");
  const [actas, setActas] = useState<ActaItem[]>([]);
  const [actasLoading, setActasLoading] = useState(false);
  const [actasOpen, setActasOpen] = useState(false);
  const [downloadingActa, setDownloadingActa] = useState<string | null>(null);
  const actaRef = useRef<HTMLDivElement>(null);

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

  /** KPIs dinámicos de usuarios y potencia filtrados por operador de red y proyecto */
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

  useEffect(() => {
    fetch("/api/contratos-or")
      .then((r) => r.json())
      .then((raw) => {
        setData({
          nContratos: Number(raw.nContratos) || DEFAULT.nContratos,
          avanceGeneral: Number(raw.avanceGeneral) || DEFAULT.avanceGeneral,
          avanceFinanciero: Number(raw.avanceFinanciero) || DEFAULT.avanceFinanciero,
          avanceFisico: Number(raw.avanceFisico) || DEFAULT.avanceFisico,
          pagosRealizados: Number(raw.pagosRealizados) ?? DEFAULT.pagosRealizados,
          pagosPosibles: Number(raw.pagosPosibles) || DEFAULT.pagosPosibles,
          pctPagosRealizados: Number(raw.pctPagosRealizados) ?? DEFAULT.pctPagosRealizados,
          desembolsos: (raw.desembolsos || []).map((d: any) => ({
            numero: Number(d.numero),
            actNecesarias: Number(d.actNecesarias),
            actCompletas: Number(d.actCompletas),
            pctCompletado: Number(d.pctCompletado),
            proyectosPagados: Number(d.proyectosPagados),
          })),
          proyectos: (raw.proyectos || []).map((p: any) => ({
            nombre: String(p.nombre),
            ejecutor: String(p.ejecutor),
            departamento: String(p.departamento),
            municipio: String(p.municipio),
            avanceGeneral: Number(p.avanceGeneral) || 0,
            avanceFisico: Number(p.avanceFisico) || 0,
            avanceFinanciero: Number(p.avanceFinanciero) || 0,
            totalDesembolsos: Number(p.totalDesembolsos) || 4,
            pagosRealizados: Number(p.pagosRealizados) || 0,
          })),
        });
      if (raw.ultima_actualizacion) setUltimaActualizacion(String(raw.ultima_actualizacion ?? ""));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/colombia-solar/curva-s?programa=CE: Contratos OR")
      .then((r) => r.json())
      .then((raw) => {
        if (raw.categorias?.length > 0) {
          setCurvaS(raw as CurvaSData);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (proyectosCurvaFiltrados.length === 0) return;
    if (!proyectoSeleccionado) return; // "Todos los proyectos" es siempre válido
    const valido = proyectosCurvaFiltrados.some((p) => p.nombre === proyectoSeleccionado);
    if (!valido) {
      setProyectoSeleccionado(proyectosCurvaFiltrados[0].nombre);
    }
  }, [operadorSeleccionado, proyectosCurvaFiltrados, proyectoSeleccionado]);

  /** Extrae la fecha desde el nombre del archivo, ej: "… 4 de Junio …" → Date */
  function parseActaDateFromName(name: string): Date | null {
    const meses: Record<string, number> = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
    const m = name.match(/(\d+)\s+de\s+(\p{L}+)/iu);
    if (!m) return null;
    const dia = parseInt(m[1], 10);
    const mesStr = m[2].toLowerCase();
    const mes = meses[mesStr];
    if (mes === undefined || isNaN(dia)) return null;
    // El año no está en el nombre; usamos el año actual (2026)
    return new Date(2026, mes, dia);
  }

  function formatActaDate(name: string): string {
    const d = parseActaDateFromName(name);
    if (!d || isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-CO", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  // ─── Actas de seguimiento ─────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actaRef.current && !actaRef.current.contains(e.target as Node)) {
        setActasOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchActas = useCallback(async () => {
    if (actasLoading) return;
    setActasLoading(true);
    try {
      const res = await fetch("/api/contratos-or/actas/catalogo");
      const json = await res.json();
      if (json.actas) {
        const sorted = [...json.actas].sort((a: ActaItem, b: ActaItem) => {
          const dA = parseActaDateFromName(a.name);
          const dB = parseActaDateFromName(b.name);
          const tA = dA && !isNaN(dA.getTime()) ? dA.getTime() : 0;
          const tB = dB && !isNaN(dB.getTime()) ? dB.getTime() : 0;
          return tB - tA;
        });
        setActas(sorted);
      }
    } catch {
      // ignore
    } finally {
      setActasLoading(false);
    }
  }, [actasLoading]);

  useEffect(() => {
    fetchActas();
    const interval = setInterval(fetchActas, 120_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownloadActa(itemId: string, fileName: string) {
    setDownloadingActa(itemId);
    try {
      const res = await fetch(`/api/contratos-or/actas/descargar?itemId=${encodeURIComponent(itemId)}`);
      if (!res.ok) throw new Error("Error al descargar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setDownloadingActa(null);
    }
  }

  const headerActions = (
    <div className="relative" ref={actaRef}>
      <button
        onClick={() => { setActasOpen(!actasOpen); if (!actasOpen && actas.length === 0) fetchActas(); }}
        disabled={actasLoading && actas.length === 0}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl
          bg-amber-500/15 border border-amber-500/40 text-gold
          hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-wait
          shrink-0"
        title="Actas de seguimiento"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>ACTAS DE SEGUIMIENTO</span>
        <svg className={`w-3 h-3 transition-transform ${actasOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {actasOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl
          bg-[#1E293B] border border-amber-500/30 shadow-2xl z-50 py-1">
          {actasLoading && actas.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-theme-muted">
              <svg className="w-5 h-5 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cargando actas…
            </div>
          ) : actas.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-theme-muted">
              No se encontraron actas
            </div>
          ) : (
            <>
              {actas.map((acta) => (
                <button
                  key={acta.id}
                  onClick={() => handleDownloadActa(acta.id, acta.name)}
                  disabled={downloadingActa === acta.id}
                  className="flex items-start gap-3 w-full px-4 py-2 text-left
                    hover:bg-amber-500/10 transition-colors disabled:opacity-40 group"
                >
                  {downloadingActa === acta.id ? (
                    <svg className="w-4 h-4 mt-0.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                      acta.tipo === "docx"
                        ? "text-sky-400 group-hover:text-sky-300"
                        : "text-gold group-hover:text-gold"
                    }`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-theme-primary truncate">{acta.name}</span>
                      <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        acta.tipo === "docx"
                          ? "bg-sky-500/15 text-sky-400"
                          : "bg-amber-500/15 text-gold"
                      }`}>
                        {acta.tipo === "docx" ? "DOCX" : "PDF"}
                      </span>
                    </div>
                    <div className="text-[10px] text-theme-muted mt-0.5">
                      {formatActaDate(acta.name)}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );

  const avanceBarData = [...data.proyectos]
    .sort((a, b) => b.avanceGeneral - a.avanceGeneral)
    .map((p) => ({
      nombre: p.nombre.length > 28 ? p.nombre.slice(0, 28) + "…" : p.nombre,
      "Av. General": p.avanceGeneral,
      "Av. Financiero": p.avanceFinanciero,
      "Av. Físico": p.avanceFisico,
    }));

  const byEjecutor = data.proyectos.reduce((acc, p) => {
    acc[p.ejecutor] = (acc[p.ejecutor] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title="Contratos OR 2025"
      downloadTablero="contratos-or" headerActions={headerActions}
      subtitle={`Seguimiento de contratos de operadores de red — avances físico y financiero${ultimaActualizacion ? "  ·  Última actualización: " + ultimaActualizacion : ""}`}
      downloadParams={{ operadorDeRed: operadorSeleccionado }}>

      {/* ── Row 1: KPIs + Gauges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.05}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">RESUMEN</span>
          <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
            <KpiChip label="N° Contratos" value={data.nContratos} accent />
            <KpiChip label="Ejecutores" value={Object.keys(byEjecutor).length} />
            <KpiChip label="Pagos Realizados" value={`${data.pagosRealizados}/${data.pagosPosibles}`} />
            <KpiChip label="% Pagos" value={`${data.pctPagosRealizados}%`} accent />
          </div>
          <div className="flex justify-around">
            <SemiGauge value={data.avanceFinanciero} label="Avance Financiero" color="gold" size="lg" delay={0.1} />
            <SemiGauge value={data.avanceGeneral} label="Avance General" color="white" size="lg" delay={0.15} />
          </div>
        </Card>

        <Card delay={0.1}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">PROGRESO POR DESEMBOLSO</span>
          <p className="text-[9px] text-theme-muted mt-0.5 mb-1.5">Actividades para liberar cada pago</p>
          <div className="flex flex-col">
            {/* Sección superior: Barras de progreso ultra compactas */}
            <div className="space-y-1">
              {(data.desembolsos.length > 0
                ? data.desembolsos
                : [{numero:1,actNecesarias:102,actCompletas:102,pctCompletado:100,proyectosPagados:17},
                   {numero:2,actNecesarias:136,actCompletas:16,pctCompletado:11.8,proyectosPagados:0},
                   {numero:3,actNecesarias:102,actCompletas:0,pctCompletado:0,proyectosPagados:0},
                   {numero:4,actNecesarias:119,actCompletas:0,pctCompletado:0,proyectosPagados:0}]
              ).map((d) => {
                const done = d.pctCompletado >= 100;
                const active = !done && d.pctCompletado > 0;
                const barColor = done ? "#22C55E" : active ? "#F59E0B" : "#334155";
                const textColor = done ? "text-green-400" : active ? "text-gold" : "text-theme-muted";
                return (
                  <div key={d.numero} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${textColor}`}>Desembolso {d.numero}</span>
                      {done && <span className="text-[7px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-semibold">OK</span>}
                      {active && <span className="text-[7px] bg-amber-500/20 text-gold px-1 py-0.5 rounded font-semibold">→</span>}
                    </div>
                    <div className="flex-1">
                      <div className="h-1.5 bg-dash-chip rounded-full overflow-hidden">
                        <div
                          style={{ width: `${d.pctCompletado}%`, backgroundColor: barColor, transition: "width 0.8s ease" }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-right w-16 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${textColor}`}>{d.pctCompletado}%</span>
                      <span className="text-[8px] text-theme-muted ml-0.5">{d.actCompletas}/{d.actNecesarias}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Sección inferior: Gauge Avance Físico desde la hoja Seguimiento_Avance_Fisico */}
            <div className="mt-1.5 pt-1.5 border-t border-theme-card flex justify-center">
              <SemiGauge value={data.avanceFisico} label="Avance físico" color="gold" size="md" delay={0.15} />
            </div>
          </div>
        </Card>

        <Card delay={0.15} className="flex flex-col">
          <div className="flex-1">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">IMPACTO ESTIMADO</span>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <KpiChip label="Usuarios Beneficiados" value={29911} accent />
              <KpiChip label="N° de CEs" value={2297} />
              <KpiChip label="Inversión Total" value="$968.268.668.130" />
              <KpiChip label="Potencia a Instalar" value="37 mWp" accent />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-theme-card">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">CONTRATOS POR EJECUTOR</span>
            <div className="mt-3 space-y-3">
              {Object.entries(byEjecutor).sort((a, b) => b[1] - a[1]).map(([ej, count]) => (
                <div key={ej}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-theme-primary font-medium">{ej}</span>
                    <span className="text-[11px] text-gold font-bold">{count} contrato{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-dash-chip rounded-full overflow-hidden">
                    <div style={{ width: `${(count / data.nContratos) * 100}%` }} className="h-full bg-amber-400 rounded-full" />
                  </div>
                </div>
              ))}
              {data.proyectos.length === 0 && <div className="text-center text-theme-muted text-sm mt-8">Cargando…</div>}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 2: Per-project avance bar chart ── */}
      {avanceBarData.length > 0 && (
        <Card delay={0.2} className="mb-5">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">AVANCE POR PROYECTO (%)</span>
          <div className="h-[520px] mt-4">
            <ResponsiveBar
              data={avanceBarData}
              keys={["Av. General", "Av. Financiero", "Av. Físico"]}
              indexBy="nombre"
              theme={T}
              groupMode="grouped"
              margin={{ top: 8, right: 20, bottom: 130, left: 55 }}
              layout="vertical"
              valueScale={{ type: "linear", max: 100 }}
              indexScale={{ type: "band", round: true }}
              colors={["#F59E0B", "#8B5CF6", "#10B981"]}
              borderRadius={3}
              padding={0.2}
              innerPadding={2}
              enableLabel
              label={(d) => `${d.value}%`}
              labelSkipHeight={22}
              labelTextColor="#fff"
              enableGridY
              enableGridX={false}
              axisTop={null}
              axisRight={null}
              axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => `${v}%` }}
              axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -45 }}
              legends={[{
                dataFrom: "keys" as const, anchor: "bottom" as const, direction: "row" as const,
                justify: false, translateX: 0, translateY: 120, itemsSpacing: 16,
                itemWidth: 110, itemHeight: 16, itemTextColor: isDark ? "#94A3B8" : "#475569",
                itemDirection: "left-to-right" as const, symbolSize: 8, symbolShape: "circle" as const,
              }]}
              tooltip={({ id, value, indexValue }) => (
                <div style={{ padding: "8px 12px", background: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #334155" : "1px solid #CBD5E1", borderRadius: 8, color: isDark ? "#E2E8F0" : "#0F172A", fontSize: 12 }}>
                  <strong>{indexValue}</strong><br />{id}: <strong style={{ color: "#F59E0B" }}>{value}%</strong>
                </div>
              )}
            />
          </div>
          <div className="flex gap-4 mt-2">
            {[{ label: "Avance General", c: "#F59E0B" }, { label: "Avance Financiero", c: "#8B5CF6" }, { label: "Avance Físico", c: "#10B981" }].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-theme-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Row 3: Project table ── */}
      <Card delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">DETALLE DE CONTRATOS</span>
            <span className="text-[10px] text-theme-muted">{data.proyectos.length} proyectos</span>
          </div>
          {/* Botón Exportar a Excel */}
          <button
            onClick={() => {
              // Preparar datos para Excel
              const exportData = data.proyectos.map(p => ({
                'Proyecto': p.nombre,
                'Ejecutor': p.ejecutor,
                'Departamento': p.departamento,
                'Municipio': p.municipio,
                'Avance General (%)': p.avanceGeneral / 100, // Como decimal para formato porcentaje en Excel
                'Avance Financiero (%)': p.avanceFinanciero / 100, // Como decimal
                'Avance Físico (%)': p.avanceFisico / 100, // Como decimal
                'Pagos Realizados': p.pagosRealizados,
                'Total Desembolsos': p.totalDesembolsos
              }));
              
              // Agregar fila de totales/promedios
              const avgAvanceObra = data.proyectos.length > 0 
                ? data.proyectos.reduce((sum, p) => sum + p.avanceGeneral, 0) / data.proyectos.length 
                : 0;
              const avgAvanceFisico = data.proyectos.length > 0 
                ? data.proyectos.reduce((sum, p) => sum + p.avanceFisico, 0) / data.proyectos.length 
                : 0;
              const avgAvanceFinanciero = data.proyectos.length > 0 
                ? data.proyectos.reduce((sum, p) => sum + p.avanceFinanciero, 0) / data.proyectos.length 
                : 0;
              const totalPagosRealizados = data.proyectos.reduce((sum, p) => sum + p.pagosRealizados, 0);
              const totalDesembolsos = data.proyectos.reduce((sum, p) => sum + p.totalDesembolsos, 0);
              
              exportData.push({
                'Proyecto': 'TOTALES / PROMEDIOS',
                'Ejecutor': '',
                'Departamento': '',
                'Municipio': '',
                'Avance General (%)': avgAvanceObra / 100,
                'Avance Financiero (%)': avgAvanceFinanciero / 100,
                'Avance Físico (%)': avgAvanceFisico / 100,
                'Pagos Realizados': totalPagosRealizados,
                'Total Desembolsos': totalDesembolsos
              });
              
              // Crear workbook y worksheet
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Contratos OR 2025');
              
              // Descargar archivo
              XLSX.writeFile(wb, `contratos_or_2025_${new Date().toISOString().split('T')[0]}.xlsx`);
            }}
            className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-theme-muted text-left">
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Proyecto</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Ejecutor</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Departamento</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Avance General</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Avance Financiero</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Avance Físico</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Pagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-card">
              {data.proyectos.map((p, i) => (
                <motion.tr key={p.nombre} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}
                  className="text-theme-secondary hover:bg-dash-chip transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-theme-primary">{p.nombre}</td>
                  <td className="py-2.5 pr-4 text-cyan-400">{p.ejecutor}</td>
                  <td className="py-2.5 pr-4">{p.departamento}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden flex-shrink-0">
                        <div style={{ width: `${Math.min(p.avanceGeneral, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                      </div>
                      <span className="text-gold font-semibold">{p.avanceGeneral.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden flex-shrink-0">
                        <div style={{ width: `${Math.min(p.avanceFinanciero, 100)}%` }} className="h-full bg-purple-400 rounded-full" />
                      </div>
                      <span className="text-purple-400 font-semibold">{p.avanceFinanciero.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden flex-shrink-0">
                        <div style={{ width: `${Math.min(p.avanceFisico, 100)}%` }} className="h-full bg-emerald-400 rounded-full" />
                      </div>
                      <span className="text-emerald-400 font-semibold">{p.avanceFisico.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="text-gold font-semibold">{p.pagosRealizados}/{p.totalDesembolsos}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {data.proyectos.length === 0 && (
            <div className="text-center text-theme-muted text-sm py-8">Cargando datos…</div>
          )}
        </div>
      </Card>

      {/* ── Row 4: Curvas S — 4 dimensiones por proyecto ── */}
      {curvaS && curvaS.categorias.length > 0 && (
        <Card delay={0.35}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
                CURVAS S POR PROYECTO
              </span>
              <p className="text-[9px] text-theme-muted mt-0.5">
                Avance programado vs real — obras civiles, usuarios, potencia e internas
              </p>
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
            <div className="flex items-center gap-2 flex-wrap">
              {/* KPIs dinámicos de usuarios y potencia */}
              <KpiChip label="Número de usuarios" value={curvaKpiFiltered.totalUsuarios.toLocaleString("es-CO")} />
              <KpiChip label="Potencia total instalada" value={`${curvaKpiFiltered.totalPotencia.toLocaleString("es-CO")} mWp`} accent />
              <div className="w-px h-8 bg-white/10 mx-1" />
              <div className="relative">
                <select
                  value={operadorSeleccionado}
                  onChange={(e) => setOperadorSeleccionado(e.target.value)}
                  className="appearance-none bg-[#0B1120] text-white border border-slate-600 rounded-lg pl-3 pr-8 py-1.5 text-[11px] focus:outline-none focus:border-amber-500/40 cursor-pointer min-w-[160px]"
                  style={{ backgroundColor: "#0B1120", color: "#ffffff" }}
                  aria-label="Operador de red"
                >
                  <option value="" style={{ backgroundColor: "#0B1120", color: "#ffffff" }}>
                    Todos los operadores
                  </option>
                  {operadoresRed.map((or) => (
                    <option key={or} value={or} style={{ backgroundColor: "#0B1120", color: "#ffffff" }}>
                      {or}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              <div className="relative">
                <select
                  value={proyectoSeleccionado}
                  onChange={(e) => setProyectoSeleccionado(e.target.value)}
                  className="appearance-none bg-[#0B1120] text-white border border-slate-600 rounded-lg pl-3 pr-8 py-1.5 text-[11px] focus:outline-none focus:border-amber-500/40 cursor-pointer min-w-[160px]"
                  style={{ backgroundColor: "#0B1120", color: "#ffffff" }}
                  aria-label="Proyecto"
                >
                  <option value="" style={{ backgroundColor: "#0B1120", color: "#ffffff" }}>
                    Todos los proyectos
                  </option>
                  {proyectosCurvaFiltrados.map((p) => (
                    <option
                      key={p.nombre}
                      value={p.nombre}
                      style={{ backgroundColor: "#0B1120", color: "#ffffff" }}
                    >
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {curvaS.categorias.map((cat) => {
              const proyecto = cat.proyectos.find((p) => p.nombre === proyectoSeleccionado) ?? cat.proyectos[0];
              return (
                <div
                  key={cat.id}
                  id={`curva-s-${cat.id}`}
                  className="rounded-xl border border-theme-card bg-dash-chip/30 p-3"
                >
                  <CurvaSChart
                    title={cat.label}
                    proyectos={proyectoSeleccionado ? [proyecto!] : cat.proyectos}
                    theme={T}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}

