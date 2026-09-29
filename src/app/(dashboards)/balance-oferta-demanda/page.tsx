"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ResponsiveLine } from "@nivo/line";
import { Scale, Zap, AlertTriangle, Info, FlaskConical, ShieldCheck } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { getNivoTheme } from "@/lib/nivo-theme";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { SingleSlider } from "@/components/ui/SingleSlider";

// ─── Tipos (reflejan domain/services/balance_oferta_demanda_service.py) ────
interface BalancePunto {
  fecha: string;
  ofertaDeclaradaMw: number | null;
  demandaRealGwh: number | null;
  generacionRealGwh: number | null;
  enficcGwh: number | null;
  oefGwh: number | null;
  demandaMwPromedio: number | null;
  margenMw: number | null;
  margenPct: number | null;
  margenRegulatorioGwh: number | null;
  margenRegulatorioPct: number | null;
}
interface HistoricoResponse {
  serie: BalancePunto[];
  capacidadInstaladaActual: { fecha: string | null; capacidadMw: number | null; nota: string };
  coberturaDatos: {
    ofertaDeclaradaDesde: string; demandaRealDesde: string;
    generacionDesde: string; margenRegulatorioDesde: string;
  };
  notaMetodologica: string;
  notaRegulatoria: string;
}
interface ProyectoUpme {
  id: number;
  nombreProyecto: string;
  tipo: "GENERACION" | "TRANSMISION";
  tecnologia: string;
  capacidadMw: number | null;
  departamento: string | null;
  areaOperativa: string | null;
  fechaEntradaPlaneadaOriginal: string | null;
  fechaEntradaPlaneadaVigente: string | null;
  fechaEntradaReal: string | null;
  estado: "PLANEADO" | "EN_CONSTRUCCION" | "RETRASADO" | "OPERANDO" | "CANCELADO";
  diasRetraso: number | null;
  fuente: string;
  notas: string | null;
}
interface DemandaNoAtendidaPunto {
  fecha: string;
  areaOperativa: string;
  noAtendidaProgramadaGwh: number;
  noAtendidaNoProgramadaGwh: number;
}
interface CorrelacionResponse {
  serieMensual: Array<{
    mes: string; margenPct: number | null; margenRegulatorioPct: number | null;
    mwRetrasadoAcumulado: number;
  }>;
  coeficienteCorrelacion: number | null;
  coeficienteCorrelacionRegulatorio: number | null;
  nProyectos: number;
  advertencia: string;
}
interface ContrafactualResponse {
  serie: Array<{
    fecha: string; ofertaRealMw: number | null; ofertaContrafactualMw: number | null;
    mwExtraProyectosRetrasados: number; margenRealPct: number | null;
    margenContrafactualPct: number | null; diferenciaPuntosPorcentuales: number | null;
    margenRegulatorioRealPct: number | null; margenRegulatorioContrafactualPct: number | null;
    diferenciaPuntosPorcentualesRegulatorio: number | null;
  }>;
  proyectosIncluidos: Array<{ id: number; nombreProyecto: string; capacidadMw: number }>;
}

const ESTADO_COLOR: Record<ProyectoUpme["estado"], string> = {
  PLANEADO: "#64748B",
  EN_CONSTRUCCION: "#3B82F6",
  RETRASADO: "#F97316",
  OPERANDO: "#22C55E",
  CANCELADO: "#EF4444",
};

// El tablero solo pide (fetch) los últimos 5 años por defecto. La base de
// datos sí tiene historia completa desde 2000 (backfill verificado contra
// la API de XM), pero es para análisis propio del equipo — comparar ahí qué
// método de margen (operativo vs. regulatorio) representa mejor cada crisis
// histórica del SIN — no para renderizar en este tablero de una sola vez:
// 26 años de datos diarios (~9800 puntos por línea) hacían la página lenta.
// Dentro de esos 5 años, el usuario sí puede elegir cualquier rango exacto
// de días con el slider/campos de fecha de abajo.

function fechaHace5Anios(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().slice(0, 10);
}
const FECHA_INICIO_TABLERO = fechaHace5Anios();
const HOY_ISO = new Date().toISOString().slice(0, 10);

const UN_DIA_MS = 24 * 3600 * 1000;
function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / UN_DIA_MS);
}
function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function formatoCorto(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" });
}

// Elige como máximo `max` valores de x espaciados uniformemente, tomados
// directamente del dominio de datos — necesario porque xScale={type:"point"}
// solo acepta tickValues que existan en los datos, y sin esto Nivo intenta
// dibujar una etiqueta por cada punto (con cientos de puntos, el eje se ve
// como una mancha ilegible).
function elegirTicks(xs: string[], max: number = 10): string[] {
  if (xs.length <= max) return xs;
  const paso = Math.ceil(xs.length / max);
  const elegidos = xs.filter((_, i) => i % paso === 0);
  if (elegidos[elegidos.length - 1] !== xs[xs.length - 1]) elegidos.push(xs[xs.length - 1]);
  return elegidos;
}

// Formatea una etiqueta del eje horizontal. "YYYY-MM" (datos ya agregados
// por mes, ej. regional/correlación) se muestra tal cual. Fechas exactas se
// muestran como día+mes si el rango visible es corto (≤120 días — ahí el
// detalle diario es útil) o como mes+año si el rango es largo.
function formatearEjeFecha(v: string, spanDias: number): string {
  if (v.length === 7) return v;
  const d = new Date(v);
  return spanDias <= 120
    ? d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
    : v.slice(0, 7);
}

// Fecha completa y legible para tooltips: "23 sep 2026" (dato diario/semanal)
// o "sep 2026" (dato ya agregado por mes, x = "YYYY-MM").
function formatearFechaLegible(x: string): string {
  if (x.length === 7) {
    return new Date(`${x}-01`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  }
  return new Date(x).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

interface PuntoTooltip {
  point: {
    data: { x: string | number; y: string | number | null };
    seriesId: string | number;
    seriesColor: string;
  };
}

// Tooltip legible para ResponsiveLine — el default de Nivo muestra
// "x: ..., y: ..." crudo, poco entendible. `unidad` se agrega al valor
// (ej. "MW", "%", "GWh"); `decimales` controla el redondeo mostrado.
function tooltipPunto(unidad: string, decimales: number = 1, isDark: boolean = true) {
  function TooltipRenderizado({ point }: PuntoTooltip) {
    return (
    <div
      style={{
        background: isDark ? "#1E293B" : "#FFFFFF",
        border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        color: isDark ? "#E2E8F0" : "#1E293B",
        boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatearFechaLegible(String(point.data.x))}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: point.seriesColor, flexShrink: 0 }} />
        <span>
          {point.seriesId}:{" "}
          <strong>
            {point.data.y == null ? "—" : Number(point.data.y).toLocaleString("es-CO", { maximumFractionDigits: decimales, minimumFractionDigits: 0 })}
            {" "}{unidad}
          </strong>
        </span>
      </div>
    </div>
    );
  }
  return TooltipRenderizado;
}

// Dato diario crudo sobre 5 años ≈ 1800 puntos por línea — entre el ciclo
// semanal de la demanda (entre semana vs. fin de semana) y el volumen de
// puntos, la línea se ve como ruido denso y no deja ver la tendencia.
// Se agrega a un punto por semana (reduce el volumen Y promedia el ciclo
// semanal en el mismo paso) — salvo que el usuario haya acotado el rango a
// ≤120 días, donde el dato diario ya es manejable y el detalle es útil.
function agregarSemanal<T extends { fecha: string }>(
  puntos: T[], campo: (p: T) => number | null, modo: "promedio" | "suma" = "promedio"
): Array<{ x: string; y: number | null }> {
  const buckets = new Map<number, { fecha: string; valores: number[] }>();
  for (const p of puntos) {
    const semana = Math.floor(new Date(p.fecha).getTime() / (7 * UN_DIA_MS));
    const entrada = buckets.get(semana) ?? { fecha: p.fecha, valores: [] };
    const v = campo(p);
    if (v != null) entrada.valores.push(v);
    buckets.set(semana, entrada);
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((b) => ({
      x: b.fecha,
      y: b.valores.length === 0 ? null
        : modo === "suma" ? b.valores.reduce((a, c) => a + c, 0)
        : b.valores.reduce((a, c) => a + c, 0) / b.valores.length,
    }));
}

function agregarAdaptativo<T extends { fecha: string }>(
  puntos: T[], campo: (p: T) => number | null
): Array<{ x: string; y: number | null }> {
  if (puntos.length === 0) return [];
  const spanDias = diasEntre(puntos[0].fecha, puntos[puntos.length - 1].fecha);
  if (spanDias <= 120) return puntos.map((p) => ({ x: p.fecha, y: campo(p) }));
  return agregarSemanal(puntos, campo);
}

// Demanda no atendida por área: la mayoría de los días no hay ningún
// evento (0 GWh) — con dato diario disperso, Nivo interpola una curva
// suave entre los pocos días con evento, y un pico aislado de un solo día
// se ve como una "colina" de varios meses (falso). Sumar por mes agrupa
// los eventos reales de forma honesta y de paso reduce ~1800 días a ~60
// meses.
function agregarMensualPorArea(
  puntos: DemandaNoAtendidaPunto[], areas: string[]
): Array<{ id: string; data: Array<{ x: string; y: number }> }> {
  return areas.map((area) => {
    const buckets = new Map<string, number>();
    for (const p of puntos) {
      if (p.areaOperativa !== area) continue;
      const mes = p.fecha.slice(0, 7); // "YYYY-MM"
      const total = p.noAtendidaProgramadaGwh + p.noAtendidaNoProgramadaGwh;
      buckets.set(mes, (buckets.get(mes) ?? 0) + total);
    }
    return {
      id: area.replace("AREA ", ""),
      data: Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, y]) => ({ x: mes, y })),
    };
  });
}

// XM suele publicar con 1-3 días de rezago, y no siempre todas las métricas
// del mismo día llegan a la vez — busca el último punto donde ESE campo en
// particular ya tiene dato, en vez de acoplar todos los KPIs a un único
// "último día" compartido (que podía dejar KPIs en blanco si esa métrica
// específica aún no había llegado ese día).
function ultimoNoNulo(
  serie: BalancePunto[], campo: (p: BalancePunto) => number | null
): { fecha: string; valor: number } | null {
  for (let i = serie.length - 1; i >= 0; i--) {
    const v = campo(serie[i]);
    if (v != null) return { fecha: serie[i].fecha, valor: v };
  }
  return null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export default function BalanceOfertaDemandaPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const T = getNivoTheme(isDark);

  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState<HistoricoResponse | null>(null);
  const [proyectos, setProyectos] = useState<ProyectoUpme[]>([]);
  const [regional, setRegional] = useState<DemandaNoAtendidaPunto[]>([]);
  const [correlacion, setCorrelacion] = useState<CorrelacionResponse | null>(null);
  const [notaProyectos, setNotaProyectos] = useState<string>("");

  const [fechaDesde, setFechaDesde] = useState(FECHA_INICIO_TABLERO);
  const [fechaHasta, setFechaHasta] = useState(HOY_ISO);

  const [contrafactual, setContrafactual] = useState<ContrafactualResponse | null>(null);
  const [contrafactualLoading, setContrafactualLoading] = useState(false);
  const contrafactualDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    const rango = `?fecha_inicio=${FECHA_INICIO_TABLERO}`;
    Promise.all([
      fetchJson<HistoricoResponse>(`/api/balance-oferta-demanda/historico/${rango}`),
      fetchJson<{ proyectos: ProyectoUpme[]; nota: string }>("/api/balance-oferta-demanda/proyectos-upme/"),
      fetchJson<{ serie: DemandaNoAtendidaPunto[] }>(`/api/balance-oferta-demanda/demanda-no-atendida-regional/${rango}`),
      fetchJson<CorrelacionResponse>(`/api/balance-oferta-demanda/correlacion-retraso/${rango}`),
    ]).then(([hist, proy, reg, corr]) => {
      setHistorico(hist);
      setProyectos(proy?.proyectos ?? []);
      setNotaProyectos(proy?.nota ?? "");
      setRegional(reg?.serie ?? []);
      setCorrelacion(corr);
      setLoading(false);
    });
  }, []);

  // ── Proyectos con capacidad y fecha planeada, elegibles para el simulador,
  //    ordenados por MW descendente (el slider elige "los N más grandes") ──
  const proyectosElegibles = useMemo(
    () =>
      proyectos
        .filter((p) => p.capacidadMw != null && p.fechaEntradaPlaneadaOriginal && p.fechaEntradaReal == null)
        .sort((a, b) => (b.capacidadMw ?? 0) - (a.capacidadMw ?? 0)),
    [proyectos]
  );
  const [kProyectos, setKProyectos] = useState(0);

  useEffect(() => {
    if (proyectosElegibles.length > 0 && kProyectos === 0) {
      setKProyectos(Math.min(3, proyectosElegibles.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectosElegibles.length]);

  useEffect(() => {
    if (contrafactualDebounce.current) clearTimeout(contrafactualDebounce.current);
    if (kProyectos <= 0 || proyectosElegibles.length === 0) {
      setContrafactual(null);
      return;
    }
    contrafactualDebounce.current = setTimeout(() => {
      const ids = proyectosElegibles.slice(0, kProyectos).map((p) => p.id);
      setContrafactualLoading(true);
      fetchJson<ContrafactualResponse>("/api/balance-oferta-demanda/simular-contrafactual/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyecto_ids: ids, fecha_inicio: fechaDesde, fecha_fin: fechaHasta }),
      }).then((data) => {
        setContrafactual(data);
        setContrafactualLoading(false);
      });
    }, 400);
    return () => {
      if (contrafactualDebounce.current) clearTimeout(contrafactualDebounce.current);
    };
  }, [kProyectos, proyectosElegibles, fechaDesde, fechaHasta]);

  // ── Serie filtrada por el período elegido (slider o campos de fecha) ────
  const serieFiltrada = useMemo(() => {
    if (!historico) return [];
    return historico.serie.filter((p) => p.fecha >= fechaDesde && p.fecha <= fechaHasta);
  }, [historico, fechaDesde, fechaHasta]);

  const spanDiasFiltrado = useMemo(() => diasEntre(fechaDesde, fechaHasta), [fechaDesde, fechaHasta]);

  const ultimaOferta = useMemo(
    () => (historico ? ultimoNoNulo(historico.serie, (p) => p.ofertaDeclaradaMw) : null),
    [historico]
  );
  const ultimaDemanda = useMemo(
    () => (historico ? ultimoNoNulo(historico.serie, (p) => p.demandaMwPromedio) : null),
    [historico]
  );
  const ultimoMargen = useMemo(
    () => (historico ? ultimoNoNulo(historico.serie, (p) => p.margenPct) : null),
    [historico]
  );
  // Dato original (no el equivalente en MW) para el subtítulo del KPI de demanda.
  const ultimaDemandaGwh = useMemo(() => {
    if (!historico) return null;
    return historico.serie.find((p) => p.fecha === ultimaDemanda?.fecha)?.demandaRealGwh ?? null;
  }, [historico, ultimaDemanda]);

  const chartOfertaDemanda = useMemo(() => [
    { id: "Oferta Declarada (MW)", data: agregarAdaptativo(serieFiltrada, (p) => p.ofertaDeclaradaMw) },
    { id: "Demanda equivalente (MW)", data: agregarAdaptativo(serieFiltrada, (p) => p.demandaMwPromedio) },
  ], [serieFiltrada]);

  const chartMargen = useMemo(
    () => [{
      id: "Margen de Reserva Operativo (%)",
      data: agregarAdaptativo(serieFiltrada, (p) => p.margenPct),
    }],
    [serieFiltrada]
  );

  // Regulatorio: mismo tratamiento que el operativo (panel al final de la
  // página, después del simulador — ver explicación ahí).
  const ultimoPuntoRegulatorio = useMemo(() => {
    if (!historico?.serie.length) return null;
    for (let i = historico.serie.length - 1; i >= 0; i--) {
      const p = historico.serie[i];
      if (p.enficcGwh != null && p.oefGwh != null) return p;
    }
    return null;
  }, [historico]);
  const chartEnficcOef = useMemo(() => [
    { id: "ENFICC — Energía Firme certificada (GWh)", data: agregarAdaptativo(serieFiltrada, (p) => p.enficcGwh) },
    { id: "OEF — Obligación de Energía Firme (GWh)", data: agregarAdaptativo(serieFiltrada, (p) => p.oefGwh) },
  ], [serieFiltrada]);
  const chartMargenRegulatorio = useMemo(
    () => [{
      id: "Margen Regulatorio (%)",
      data: agregarAdaptativo(serieFiltrada, (p) => p.margenRegulatorioPct),
    }],
    [serieFiltrada]
  );

  const areasRegionales = useMemo(
    () => Array.from(new Set(regional.map((r) => r.areaOperativa))).filter((a) => a !== "AREA NO DEFINIDA"),
    [regional]
  );
  const chartRegional = useMemo(
    () => agregarMensualPorArea(regional, areasRegionales),
    [regional, areasRegionales]
  );

  const chartCorrelacionMargen = useMemo(
    () => [{
      id: "Margen Operativo — % (mensual)",
      data: (correlacion?.serieMensual ?? [])
        .filter((p) => p.margenPct != null)
        .map((p) => ({ x: p.mes, y: p.margenPct })),
    }],
    [correlacion]
  );
  const chartCorrelacionMw = useMemo(
    () => [{
      id: "MW retrasados acumulados (mensual)",
      data: (correlacion?.serieMensual ?? []).map((p) => ({ x: p.mes, y: p.mwRetrasadoAcumulado })),
    }],
    [correlacion]
  );
  const chartCorrelacionMargenRegulatorio = useMemo(
    () => [{
      id: "Margen Regulatorio — % (mensual)",
      data: (correlacion?.serieMensual ?? [])
        .filter((p) => p.margenRegulatorioPct != null)
        .map((p) => ({ x: p.mes, y: p.margenRegulatorioPct })),
    }],
    [correlacion]
  );

  const chartContrafactual = useMemo(() => {
    if (!contrafactual) return [];
    return [
      { id: "Margen real (%)", data: agregarAdaptativo(contrafactual.serie, (p) => p.margenRealPct) },
      { id: "Margen contrafactual (%)", data: agregarAdaptativo(contrafactual.serie, (p) => p.margenContrafactualPct) },
    ];
  }, [contrafactual]);
  const chartContrafactualRegulatorio = useMemo(() => {
    if (!contrafactual) return [];
    return [
      { id: "Margen regulatorio real (%)", data: agregarAdaptativo(contrafactual.serie, (p) => p.margenRegulatorioRealPct) },
      { id: "Margen regulatorio contrafactual (%)", data: agregarAdaptativo(contrafactual.serie, (p) => p.margenRegulatorioContrafactualPct) },
    ];
  }, [contrafactual]);

  const diferenciaPromedio = useMemo(() => {
    if (!contrafactual || contrafactual.serie.length === 0) return null;
    const diffs = contrafactual.serie
      .map((p) => p.diferenciaPuntosPorcentuales)
      .filter((d): d is number => d != null);
    if (diffs.length === 0) return null;
    return diffs.reduce((a, b) => a + b, 0) / diffs.length;
  }, [contrafactual]);
  const diferenciaPromedioRegulatorio = useMemo(() => {
    if (!contrafactual || contrafactual.serie.length === 0) return null;
    const diffs = contrafactual.serie
      .map((p) => p.diferenciaPuntosPorcentualesRegulatorio)
      .filter((d): d is number => d != null);
    if (diffs.length === 0) return null;
    return diffs.reduce((a, b) => a + b, 0) / diffs.length;
  }, [contrafactual]);

  const chartAxisBottom = { tickSize: 0, tickPadding: 10, tickRotation: -35, legendOffset: 36 };

  const ticksPrincipal = useMemo(
    () => elegirTicks(chartOfertaDemanda[0]?.data.map((d) => d.x) ?? []),
    [chartOfertaDemanda]
  );
  const ticksRegulatorio = useMemo(
    () => elegirTicks(chartEnficcOef[0]?.data.map((d) => d.x) ?? []),
    [chartEnficcOef]
  );
  const ticksContrafactual = useMemo(
    () => elegirTicks(chartContrafactual[0]?.data.map((d) => d.x) ?? []),
    [chartContrafactual]
  );
  const ticksRegional = useMemo(
    () => elegirTicks(chartRegional[0]?.data.map((d) => d.x) ?? []),
    [chartRegional]
  );
  const ticksCorrelacion = useMemo(
    () => elegirTicks((correlacion?.serieMensual ?? []).map((p) => p.mes)),
    [correlacion]
  );

  const totalDiasDisponibles = diasEntre(FECHA_INICIO_TABLERO, HOY_ISO);
  const diaDesde = diasEntre(FECHA_INICIO_TABLERO, fechaDesde);
  const diaHasta = diasEntre(FECHA_INICIO_TABLERO, fechaHasta);

  return (
    <div className="min-h-screen bg-theme-primary pt-20" style={{ paddingTop: "var(--header-height, 5rem)" }}>
      {/* ── Título ─────────────────────────────────────────────────────── */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-theme-primary flex items-center gap-2">
              <Scale className="w-5 h-5 text-gold" /> Balance Oferta-Demanda del SIN
            </h1>
            <p className="text-xs text-theme-secondary">
              Sistema Interconectado Nacional · Evaluación de la hipótesis de retrasos en proyectos UPME
            </p>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            {loading ? "Cargando…" : "Datos reales de BD"}
          </span>
        </div>
      </div>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">

        {/* ── Nota de gobernanza metodológica (obligatoria) ───────────────── */}
        <div className="bg-dash-chip rounded-xl p-3 border border-amber-500/20 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-theme-secondary leading-relaxed">
            <strong className="text-amber-400">Margen de Reserva Operativo</strong> (panel principal) = cálculo
            propio del Portal, no oficial CREG. <strong className="text-blue-400">Margen Regulatorio</strong> (al
            final) = sí es oficial (ENFICC vs. OEF, Cargo por Confiabilidad). No confundir con NE/HSIN/PBP del
            tablero de Gestión del Sector. Correlación no implica causalidad.
          </p>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Oferta Declarada</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-theme-primary">
                {ultimaOferta?.valor.toFixed(0) ?? "—"}
              </span>
              <span className="text-[10px] text-theme-muted">MW</span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              Disponible hoy (subconjunto de la Capacidad Instalada →) · XM DispoDeclarada, {ultimaOferta?.fecha ?? "—"}
            </p>
          </div>
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Demanda Promedio (equivalente)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-theme-primary">
                {ultimaDemanda?.valor.toFixed(0) ?? "—"}
              </span>
              <span className="text-[10px] text-theme-muted">MW</span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              {ultimaDemandaGwh?.toFixed(1) ?? "—"} GWh consumidos en TODO el día ÷ 24h — promedio, no un valor
              horario · XM DemaReal, {ultimaDemanda?.fecha ?? "—"}
            </p>
          </div>
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Margen de Reserva Operativo</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className="text-2xl font-bold"
                style={{ color: (ultimoMargen?.valor ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}
              >
                {ultimoMargen?.valor != null ? `${ultimoMargen.valor.toFixed(1)}%` : "—"}
              </span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">(Oferta − Demanda) ÷ Demanda · cálculo propio, no oficial CREG</p>
          </div>
          <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
            <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">Capacidad Instalada</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-theme-primary">
                {historico?.capacidadInstaladaActual.capacidadMw?.toFixed(0) ?? "—"}
              </span>
              <span className="text-[10px] text-theme-muted">MW</span>
            </div>
            <p className="text-[9px] text-theme-muted mt-1">
              Máximo teórico (← Oferta Declarada es lo real disponible hoy: descuenta mantenimiento, plantas paradas,
              agua limitada) · XM CapEfecNeta, {historico?.capacidadInstaladaActual.fecha ?? ""}
            </p>
          </div>
        </motion.div>

        {/* ── Serie histórica: oferta vs demanda + slider de rango ────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-bold text-theme-primary">Oferta vs. Demanda Operativa — histórico nacional</h2>
          </div>
          <p className="text-[10px] text-theme-muted mb-3">
            <strong className="text-theme-secondary">Oferta Declarada</strong> = MW que los generadores declaran
            poder producir (XM DispoDeclarada). <strong className="text-theme-secondary">Demanda equivalente</strong>{" "}
            = consumo real del país en MW (XM DemaReal). Períodos &gt;120 días se promedian por semana; períodos
            cortos muestran el dato diario completo.
          </p>
          <RangeSlider
            min={0} max={totalDiasDisponibles} valueMin={diaDesde} valueMax={diaHasta}
            onChange={(a, b) => { setFechaDesde(sumarDias(FECHA_INICIO_TABLERO, a)); setFechaHasta(sumarDias(FECHA_INICIO_TABLERO, b)); }}
            defaultMin={0} defaultMax={totalDiasDisponibles}
            step={1}
            ticks={Array.from({ length: 7 }, (_, i) => Math.round((totalDiasDisponibles / 6) * i))}
            formatValue={(d) => formatoCorto(sumarDias(FECHA_INICIO_TABLERO, d))}
            label="PERÍODO"
          />
          <div className="flex flex-wrap items-center gap-3 mt-2 mb-1">
            <label className="text-[10px] text-theme-muted flex items-center gap-1.5">
              Desde
              <input
                type="date" value={fechaDesde} min={FECHA_INICIO_TABLERO} max={fechaHasta}
                onChange={(e) => e.target.value && setFechaDesde(e.target.value)}
                className="bg-theme-tertiary text-theme-primary text-[10px] rounded px-1.5 py-0.5 border border-white/10"
              />
            </label>
            <label className="text-[10px] text-theme-muted flex items-center gap-1.5">
              Hasta
              <input
                type="date" value={fechaHasta} min={fechaDesde} max={HOY_ISO}
                onChange={(e) => e.target.value && setFechaHasta(e.target.value)}
                className="bg-theme-tertiary text-theme-primary text-[10px] rounded px-1.5 py-0.5 border border-white/10"
              />
            </label>
            <span className="text-[10px] text-theme-muted">({spanDiasFiltrado} días elegidos)</span>
          </div>
          <p className="text-[10px] font-semibold text-theme-secondary mt-2 mb-1">Oferta y demanda (potencia)</p>
          <div style={{ height: 300 }}>
            <ResponsiveLine
              data={chartOfertaDemanda}
              margin={{ top: 10, right: 30, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="monotoneX"
              axisBottom={{ ...chartAxisBottom, tickValues: ticksPrincipal, format: (v) => formatearEjeFecha(v, spanDiasFiltrado) }}
              axisLeft={{ legend: "Potencia (MW)", legendOffset: -50, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
              colors={["#F59E0B", "#3B82F6"]}
              lineWidth={2}
              enablePoints={false}
              useMesh={true}
              enableArea={false}
              theme={T}
              tooltip={tooltipPunto("MW", 0, isDark)}
              legends={[{
                anchor: "top-left", direction: "row", translateY: -8, itemWidth: 230, itemHeight: 14,
                symbolSize: 8, symbolShape: "circle", itemTextColor: isDark ? "#CBD5E1" : "#475569",
              }]}
            />
          </div>
          <p className="text-[10px] font-semibold text-theme-secondary mt-3 mb-1">
            Margen de Reserva Operativo = (Oferta − Demanda) ÷ Demanda × 100 — línea roja punteada = 0% (déficit)
          </p>
          <div style={{ height: 180 }}>
            <ResponsiveLine
              data={chartMargen}
              margin={{ top: 10, right: 30, bottom: 40, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="monotoneX"
              axisBottom={{ ...chartAxisBottom, tickValues: ticksPrincipal, format: (v) => formatearEjeFecha(v, spanDiasFiltrado) }}
              axisLeft={{ legend: "Margen operativo (%)", legendOffset: -50, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
              colors={["#22C55E"]}
              lineWidth={2}
              enablePoints={false}
              useMesh={true}
              enableArea={true}
              areaOpacity={0.1}
              theme={T}
              tooltip={tooltipPunto("%", 1, isDark)}
              markers={[{ axis: "y", value: 0, lineStyle: { stroke: "#EF4444", strokeWidth: 1, strokeDasharray: "4 4" } }]}
            />
          </div>
        </div>

        {/* ── Regional: demanda no atendida por área ───────────────────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-theme-primary">Demanda No Atendida por Área Operativa</h2>
          </div>
          <p className="text-[10px] text-theme-muted mb-3">
            Energía que el sistema no pudo entregar (cortes/racionamiento), sumada por mes y área operativa de XM.
            Único desagregado regional disponible — no hay margen de reserva por región porque la oferta no tiene
            desagregación geográfica en la base.
          </p>
          <div style={{ height: 260 }}>
            <ResponsiveLine
              data={chartRegional}
              margin={{ top: 10, right: 100, bottom: 50, left: 65 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto" }}
              curve="linear"
              axisBottom={{ ...chartAxisBottom, tickValues: ticksRegional }}
              axisLeft={{ legend: "GWh no atendidos / mes", legendOffset: -55, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
              colors={{ scheme: "set2" }}
              lineWidth={2}
              enablePoints={false}
              useMesh={true}
              theme={T}
              tooltip={tooltipPunto("GWh", 2, isDark)}
              legends={[{
                anchor: "right", direction: "column", translateX: 90, itemWidth: 90, itemHeight: 16,
                symbolSize: 8, symbolShape: "circle", itemTextColor: isDark ? "#CBD5E1" : "#475569",
              }]}
            />
          </div>
        </div>

        {/* ── Proyectos UPME ────────────────────────────────────────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
          <h2 className="text-sm font-bold text-theme-primary mb-1">Proyectos de Expansión UPME</h2>
          <p className="text-[10px] text-theme-muted mb-3">
            {notaProyectos} Los proyectos de <strong className="text-theme-secondary">Transmisión</strong> (líneas,
            subestaciones) muestran &quot;—&quot; en MW porque no generan energía — su capacidad se mide en otras
            unidades (kV, longitud), no en MW; por eso tampoco entran en el simulador de abajo, que solo puede sumar
            MW de generación.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-theme-muted uppercase text-[9px] tracking-wider border-b border-white/10">
                  <th className="py-2 pr-3">Proyecto</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Tecnología</th>
                  <th className="py-2 pr-3 text-right">MW a suministrar</th>
                  <th className="py-2 pr-3">Depto.</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3 text-right">Retraso</th>
                  <th className="py-2 pr-3">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 text-theme-primary font-medium">{p.nombreProyecto}</td>
                    <td className="py-2 pr-3 text-theme-secondary">{p.tipo === "GENERACION" ? "Generación" : "Transmisión"}</td>
                    <td className="py-2 pr-3 text-theme-secondary">{p.tecnologia}</td>
                    <td className="py-2 pr-3 text-right text-theme-primary">{p.capacidadMw?.toFixed(0) ?? "—"}</td>
                    <td className="py-2 pr-3 text-theme-secondary">{p.departamento ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                        style={{ background: `${ESTADO_COLOR[p.estado]}22`, color: ESTADO_COLOR[p.estado] }}
                      >
                        {p.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-theme-secondary">
                      {p.diasRetraso != null && p.diasRetraso > 0 ? `${p.diasRetraso} días` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-theme-muted text-[10px] max-w-[220px] truncate" title={p.fuente}>
                      {p.fuente}
                    </td>
                  </tr>
                ))}
                {proyectos.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-theme-muted">
                    {loading ? "Cargando…" : "Aún no hay proyectos UPME cargados."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Correlación retraso-déficit ───────────────────────────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
          <h2 className="text-sm font-bold text-theme-primary mb-1">Correlación: MW Retrasados vs. Margen de Reserva Operativo</h2>
          <p className="text-[10px] text-theme-muted mb-1">
            Izquierda: margen operativo mensual. Derecha: MW de proyectos UPME retrasados (ya pasaron su fecha
            planeada sin entrar en operación).
          </p>
          <p className="text-[10px] text-theme-muted mb-1">
            Correlación (−1 a +1; negativo = a más MW retrasados, menor margen):{" "}
            <strong className="text-theme-primary">
              {correlacion?.coeficienteCorrelacion != null ? correlacion.coeficienteCorrelacion.toFixed(2) : "— (sin datos suficientes)"}
            </strong>
            {" "}· {correlacion?.nProyectos ?? 0} proyectos UPME en la base
          </p>
          <p className="text-[10px] text-amber-400/80 mb-3">{correlacion?.advertencia}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div style={{ height: 220 }}>
              <ResponsiveLine
                data={chartCorrelacionMargen}
                margin={{ top: 10, right: 20, bottom: 45, left: 55 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{ ...chartAxisBottom, tickValues: ticksCorrelacion }}
                axisLeft={{ legend: "Margen operativo (%)", legendOffset: -45, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
                colors={["#22C55E"]}
                lineWidth={2}
                enablePoints={false}
                useMesh={true}
                theme={T}
                tooltip={tooltipPunto("%", 1, isDark)}
              />
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveLine
                data={chartCorrelacionMw}
                margin={{ top: 10, right: 20, bottom: 45, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, max: "auto" }}
                axisBottom={{ ...chartAxisBottom, tickValues: ticksCorrelacion }}
                axisLeft={{ legend: "MW retrasados acumulados", legendOffset: -50, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
                colors={["#F97316"]}
                lineWidth={2}
                enablePoints={false}
                useMesh={true}
                theme={T}
                tooltip={tooltipPunto("MW", 0, isDark)}
              />
            </div>
          </div>
        </div>

        {/* ── Simulador contrafactual ───────────────────────────────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-theme-primary">Simulador: ¿y si los proyectos UPME hubieran entrado a tiempo?</h2>
          </div>
          <p className="text-[10px] text-theme-muted mb-3">
            Suma a la Oferta Declarada los MW de los proyectos elegidos desde su fecha planeada original, como si no
            se hubieran retrasado. Escenario exploratorio, no un pronóstico. Solo incluye proyectos de{" "}
            <strong className="text-theme-secondary">generación</strong> con MW y fecha planeada conocidos — por eso
            el máximo del slider ({proyectosElegibles.length}) es menor que el total de proyectos &quot;RETRASADO&quot;
            de la tabla de arriba (transmisión y proyectos sin fecha original documentada quedan fuera).
          </p>
          {proyectosElegibles.length === 0 ? (
            <p className="text-xs text-theme-muted py-4">
              No hay proyectos UPME con capacidad, fecha planeada y aún sin entrar en operación real para simular.
            </p>
          ) : (
            <>
              <SingleSlider
                min={0} max={proyectosElegibles.length} value={kProyectos} onChange={setKProyectos}
                label="PROYECTOS RETRASADOS INCLUIDOS (mayor MW primero)"
                formatValue={(v) => `${v} proyecto${v === 1 ? "" : "s"}`}
              />
              {contrafactual && contrafactual.proyectosIncluidos.length > 0 && (
                <p className="text-[10px] text-theme-secondary mb-3">
                  Incluye: {contrafactual.proyectosIncluidos.map((p) => `${p.nombreProyecto} (${p.capacidadMw.toFixed(0)} MW)`).join(", ")}
                </p>
              )}
              {diferenciaPromedio != null && (
                <p className="text-xs mb-3">
                  Diferencia promedio en el margen de reserva:{" "}
                  <strong style={{ color: diferenciaPromedio >= 0 ? "#22C55E" : "#EF4444" }}>
                    {diferenciaPromedio >= 0 ? "+" : ""}{diferenciaPromedio.toFixed(1)} puntos porcentuales
                  </strong>
                </p>
              )}
              <div style={{ height: 260 }}>
                <ResponsiveLine
                  data={chartContrafactual}
                  margin={{ top: 10, right: 30, bottom: 50, left: 55 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: "auto", max: "auto" }}
                  curve="monotoneX"
                  axisBottom={{ ...chartAxisBottom, tickValues: ticksContrafactual, format: (v) => formatearEjeFecha(v, spanDiasFiltrado) }}
                  axisLeft={{ legend: "Margen operativo (%)", legendOffset: -45, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
                  colors={["#94A3B8", "#8B5CF6"]}
                  lineWidth={2}
                  enablePoints={false}
                  useMesh={true}
                  theme={T}
                  tooltip={tooltipPunto("%", 1, isDark)}
                  legends={[{
                    anchor: "top-left", direction: "row", translateY: -8, itemWidth: 170, itemHeight: 14,
                    symbolSize: 8, symbolShape: "circle", itemTextColor: isDark ? "#CBD5E1" : "#475569",
                  }]}
                />
              </div>
              {contrafactualLoading && <p className="text-[10px] text-theme-muted mt-1">Recalculando…</p>}
            </>
          )}
        </div>

        {/* ── Margen Regulatorio oficial: ENFICC vs. OEF (Cargo por Confiabilidad) ── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-theme-primary">Margen Regulatorio Oficial — ENFICC vs. OEF</h2>
          </div>
          <p className="text-[10px] text-blue-400/90 mb-3 leading-relaxed">
            <strong>ENFICC</strong> = cuánta energía cada planta <em>garantiza por contrato</em> poder entregar en el
            peor escenario posible (sequía severa) — a cambio recibe un pago fijo (Cargo por Confiabilidad). No es lo
            mismo que la Oferta Declarada de hoy ni que la Capacidad Instalada: es una garantía regulatoria distinta.{" "}
            <strong>OEF</strong> = cuánta energía garantizada necesita el sistema, según la demanda proyectada.{" "}
            <strong>Cuando OEF supera a ENFICC (margen negativo), las garantías certificadas no alcanzan a cubrir lo
            que el sistema necesita asegurar</strong> — eso NO significa que falte luz hoy (para eso ver el panel
            principal), sino que ese &quot;seguro&quot; de largo plazo está corto. Cambia lento (solo sube con
            plantas nuevas certificadas). Correlación con MW retrasados de UPME:{" "}
            <strong className="text-theme-primary">
              {correlacion?.coeficienteCorrelacionRegulatorio != null ? correlacion.coeficienteCorrelacionRegulatorio.toFixed(2) : "—"}
            </strong>
            {" "}(más fuerte que el {correlacion?.coeficienteCorrelacion != null ? correlacion.coeficienteCorrelacion.toFixed(2) : "—"} del margen operativo).
          </p>
          <p className="text-[10px] font-semibold text-theme-secondary mt-2 mb-1">Energía firme certificada vs. obligación asignada</p>
          <div style={{ height: 240 }}>
            <ResponsiveLine
              data={chartEnficcOef}
              margin={{ top: 10, right: 30, bottom: 50, left: 55 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="monotoneX"
              axisBottom={{ ...chartAxisBottom, tickValues: ticksRegulatorio, format: (v) => formatearEjeFecha(v, spanDiasFiltrado) }}
              axisLeft={{ legend: "Energía firme (GWh)", legendOffset: -45, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
              colors={["#3B82F6", "#94A3B8"]}
              lineWidth={2}
              enablePoints={false}
              useMesh={true}
              theme={T}
              tooltip={tooltipPunto("GWh", 1, isDark)}
              legends={[{
                anchor: "top-left", direction: "row", translateY: -8, itemWidth: 260, itemHeight: 14,
                symbolSize: 8, symbolShape: "circle", itemTextColor: isDark ? "#CBD5E1" : "#475569",
              }]}
            />
          </div>
          <p className="text-[10px] font-semibold text-theme-secondary mt-3 mb-1">
            Margen Regulatorio = (ENFICC − OEF) ÷ OEF × 100 — línea roja punteada = 0% (obligación excede lo certificado)
          </p>
          <div style={{ height: 180 }}>
            <ResponsiveLine
              data={chartMargenRegulatorio}
              margin={{ top: 10, right: 30, bottom: 40, left: 55 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
              curve="monotoneX"
              axisBottom={{ ...chartAxisBottom, tickValues: ticksRegulatorio, format: (v) => formatearEjeFecha(v, spanDiasFiltrado) }}
              axisLeft={{ legend: "Margen regulatorio (%)", legendOffset: -45, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
              colors={["#3B82F6"]}
              lineWidth={2}
              enablePoints={false}
              useMesh={true}
              enableArea={true}
              areaOpacity={0.1}
              theme={T}
              tooltip={tooltipPunto("%", 1, isDark)}
              markers={[{ axis: "y", value: 0, lineStyle: { stroke: "#EF4444", strokeWidth: 1, strokeDasharray: "4 4" } }]}
            />
          </div>
          {ultimoPuntoRegulatorio && (
            <p className="text-[10px] text-theme-muted mt-2">
              Último dato disponible: {ultimoPuntoRegulatorio.fecha} · margen regulatorio{" "}
              {ultimoPuntoRegulatorio.margenRegulatorioPct != null ? `${ultimoPuntoRegulatorio.margenRegulatorioPct.toFixed(1)}%` : "—"}
            </p>
          )}
        </div>

        {/* ── Correlación retraso-déficit (margen regulatorio) ────────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-blue-500/20">
          <h2 className="text-sm font-bold text-theme-primary mb-1">Correlación: MW Retrasados vs. Margen Regulatorio (ENFICC/OEF)</h2>
          <p className="text-[10px] text-theme-muted mb-1">
            Mismo ejercicio del panel de correlación de arriba, pero contra el margen oficial CREG en vez del
            operativo. Izquierda: margen regulatorio mensual. Derecha: MW de proyectos UPME retrasados.
          </p>
          <p className="text-[10px] text-theme-muted mb-1">
            Correlación (−1 a +1; negativo = a más MW retrasados, menor margen):{" "}
            <strong className="text-theme-primary">
              {correlacion?.coeficienteCorrelacionRegulatorio != null ? correlacion.coeficienteCorrelacionRegulatorio.toFixed(2) : "— (sin datos suficientes)"}
            </strong>
            {" "}· {correlacion?.nProyectos ?? 0} proyectos UPME en la base
          </p>
          <p className="text-[10px] text-amber-400/80 mb-3">{correlacion?.advertencia}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div style={{ height: 220 }}>
              <ResponsiveLine
                data={chartCorrelacionMargenRegulatorio}
                margin={{ top: 10, right: 20, bottom: 45, left: 55 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{ ...chartAxisBottom, tickValues: ticksCorrelacion }}
                axisLeft={{ legend: "Margen regulatorio (%)", legendOffset: -45, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
                colors={["#3B82F6"]}
                lineWidth={2}
                enablePoints={false}
                useMesh={true}
                theme={T}
                tooltip={tooltipPunto("%", 1, isDark)}
                markers={[{ axis: "y", value: 0, lineStyle: { stroke: "#EF4444", strokeWidth: 1, strokeDasharray: "4 4" } }]}
              />
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveLine
                data={chartCorrelacionMw}
                margin={{ top: 10, right: 20, bottom: 45, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, max: "auto" }}
                axisBottom={{ ...chartAxisBottom, tickValues: ticksCorrelacion }}
                axisLeft={{ legend: "MW retrasados acumulados", legendOffset: -50, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
                colors={["#F97316"]}
                lineWidth={2}
                enablePoints={false}
                useMesh={true}
                theme={T}
                tooltip={tooltipPunto("MW", 0, isDark)}
              />
            </div>
          </div>
        </div>

        {/* ── Simulador contrafactual (margen regulatorio) ────────────────── */}
        <div className="bg-dash-chip rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-theme-primary">Simulador (Margen Regulatorio): ¿y si los proyectos UPME hubieran entrado a tiempo?</h2>
          </div>
          <p className="text-[10px] text-theme-muted mb-3">
            Mismo escenario del simulador de arriba, pero sobre ENFICC en vez de la Oferta Declarada: asume que toda
            la capacidad de los proyectos elegidos se certifica como energía firme desde su fecha planeada original.
            Simplificación adicional sobre el mecanismo real del Cargo por Confiabilidad — escenario exploratorio,
            no un pronóstico.
          </p>
          {proyectosElegibles.length === 0 ? (
            <p className="text-xs text-theme-muted py-4">
              No hay proyectos UPME con capacidad, fecha planeada y aún sin entrar en operación real para simular.
            </p>
          ) : (
            <>
              <SingleSlider
                min={0} max={proyectosElegibles.length} value={kProyectos} onChange={setKProyectos}
                label="PROYECTOS RETRASADOS INCLUIDOS (mayor MW primero)"
                formatValue={(v) => `${v} proyecto${v === 1 ? "" : "s"}`}
              />
              {contrafactual && contrafactual.proyectosIncluidos.length > 0 && (
                <p className="text-[10px] text-theme-secondary mb-3">
                  Incluye: {contrafactual.proyectosIncluidos.map((p) => `${p.nombreProyecto} (${p.capacidadMw.toFixed(0)} MW)`).join(", ")}
                </p>
              )}
              {diferenciaPromedioRegulatorio != null && (
                <p className="text-xs mb-3">
                  Diferencia promedio en el margen regulatorio:{" "}
                  <strong style={{ color: diferenciaPromedioRegulatorio >= 0 ? "#22C55E" : "#EF4444" }}>
                    {diferenciaPromedioRegulatorio >= 0 ? "+" : ""}{diferenciaPromedioRegulatorio.toFixed(1)} puntos porcentuales
                  </strong>
                </p>
              )}
              <div style={{ height: 260 }}>
                <ResponsiveLine
                  data={chartContrafactualRegulatorio}
                  margin={{ top: 10, right: 30, bottom: 50, left: 55 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: "auto", max: "auto" }}
                  curve="monotoneX"
                  axisBottom={{ ...chartAxisBottom, tickValues: ticksContrafactual, format: (v) => formatearEjeFecha(v, spanDiasFiltrado) }}
                  axisLeft={{ legend: "Margen regulatorio (%)", legendOffset: -45, legendPosition: "middle", tickSize: 0, tickPadding: 8 }}
                  colors={["#94A3B8", "#3B82F6"]}
                  lineWidth={2}
                  enablePoints={false}
                  useMesh={true}
                  theme={T}
                  tooltip={tooltipPunto("%", 1, isDark)}
                  markers={[{ axis: "y", value: 0, lineStyle: { stroke: "#EF4444", strokeWidth: 1, strokeDasharray: "4 4" } }]}
                  legends={[{
                    anchor: "top-left", direction: "row", translateY: -8, itemWidth: 200, itemHeight: 14,
                    symbolSize: 8, symbolShape: "circle", itemTextColor: isDark ? "#CBD5E1" : "#475569",
                  }]}
                />
              </div>
              {contrafactualLoading && <p className="text-[10px] text-theme-muted mt-1">Recalculando…</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
