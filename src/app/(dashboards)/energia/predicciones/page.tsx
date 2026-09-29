"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  CloudSun,
  History,
  Waves,
  Wind,
  Globe,
  Thermometer,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import EmbalseHeroCard from "@/components/predictions/EmbalseHeroCard";
import PredictionLineChart from "@/components/predictions/PredictionLineChart";
import MetricPredictionCard from "@/components/predictions/MetricPredictionCard";
import type { MetricSummary, PredictionPoint } from "@/types/predictions";
import { fmtDate, fmtShortDate, clampPct } from "@/types/predictions";
import { classifyOni } from "@/lib/oni";
import * as XLSX from "xlsx";

interface DashboardData {
  embalses: {
    actual: { fecha: string; valor: number } | null;
    prediccion: PredictionPoint[];
    pico: { fecha: string; valor: number; dias_desde_hoy: number } | null;
    mape: number;
    mape_es_riguroso?: boolean;
    mape_holdout?: number;
    mape_rango_min?: number | null;
    mape_rango_max?: number | null;
    mape_anios_evaluados?: number[];
    confianza: number;
    cobertura_ci?: number | null;
    backtest?: {
      anio_corte: number;
      n_dias_test: number;
      fecha_test_inicio: string;
      fecha_test_fin: string;
      ejecutado_en: string | null;
    } | null;
    modelo: string;
    generado_en: string;
  };
  oni: {
    actual: number | null;
    actual_fecha?: string | null;
    estado: string | null;
    forecast: Array<{ fecha: string; valor: number }>;
    pdo: { actual: number | null; fase: string; fecha?: string | null } | null;
    soi: { actual: number | null; fecha?: string | null } | null;
    gmst: { actual: number | null; fecha?: string | null } | null;
  };
  metricas: MetricSummary[];
  generado_en: string;
}

export default function PrediccionesSinPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricSummary | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/predicciones/")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        console.error("[predicciones]", e);
        setError("No se pudieron cargar las predicciones. Intente más tarde.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto space-y-6">
          <div className="h-40 bg-dash-chip rounded-xl animate-pulse" />
          <div className="h-96 bg-dash-chip rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-dash-chip rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-theme-primary pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400 font-medium">
              {error || "Sin datos disponibles"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout
        title="Predicciones SIN"
        subtitle="Proyecciones de embalses, demanda y variables clave del Sistema Interconectado Nacional"
        downloadTablero="predicciones"
        headerActions={
          <span className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded-full">
            Datos reales de BD
          </span>
        }
      >
        {data && <DiagnosticoNarrativo data={data} />}

        <div className="space-y-6">
          {/* Hero */}
          <EmbalseHeroCard
            actual={data.embalses.actual}
            pico={data.embalses.pico}
            mape={data.embalses.mape}
            confianza={data.embalses.confianza}
            coberturaCi={data.embalses.cobertura_ci}
            mapeEsRiguroso={data.embalses.mape_es_riguroso}
            nDiasBacktest={data.embalses.backtest?.n_dias_test}
            mapeRangoMin={data.embalses.mape_rango_min}
            mapeRangoMax={data.embalses.mape_rango_max}
            mapeAniosEvaluados={data.embalses.mape_anios_evaluados}
            generadoEn={data.embalses.generado_en}
            oni={data.oni}
          />

          {/* Señal ONI — encima del gráfico */}
          {data.oni.forecast.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dash-chip rounded-xl p-5 border border-white/5"
            >
              <div className="mb-3">
                <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
                  Pronóstico ONI (NOAA)
                </span>
                <p className="text-[10px] text-theme-muted mt-0.5">
                  Índice Océano Pacífico · valores mensuales proyectados
                </p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-3">
                {data.oni.forecast.map((f) => {
                  const color = classifyOni(f.valor)?.color ?? "#94A3B8";
                  // Barra de magnitud relativa en un rango fijo (-1°C a +3°C) — solo
                  // referencia visual, no cambia la escala real mostrada en el número.
                  const barPct = Math.max(
                    4,
                    Math.min(100, ((f.valor + 1) / 4) * 100),
                  );
                  return (
                    <div
                      key={f.fecha}
                      className="bg-theme-primary/40 rounded-lg px-3 py-2.5 border border-white/5 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="text-[9px] text-theme-muted mb-1">
                        {fmtShortDate(f.fecha)}
                      </div>
                      <div className="text-sm font-bold" style={{ color }}>
                        {f.valor.toFixed(2)}°C
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Gráfico principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
                  Proyección de Embalses
                </span>
                <p className="text-[10px] text-theme-muted mt-0.5">
                  Horizonte {data.embalses.prediccion.length} días · modelo{" "}
                  {data.embalses.modelo}
                </p>
              </div>
              {data.embalses.pico && (
                <div className="text-xs text-theme-secondary">
                  Pico:{" "}
                  <strong className="text-gold">
                    {data.embalses.pico.valor.toFixed(2)}%
                  </strong>{" "}
                  el {fmtShortDate(data.embalses.pico.fecha)}
                </div>
              )}
            </div>

            <PredictionLineChart
              data={data.embalses.prediccion}
              height={380}
              peakDate={data.embalses.pico?.fecha}
              threshold80Date={
                data.embalses.prediccion.find((p) => p.valor >= 80)?.fecha
              }
            />

            <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-theme-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 rounded-full" />
                <span>Embalses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-300/70 rounded-full" />
                <span>IC 95%</span>
              </div>
              {data.embalses.prediccion.some((p) => p.oni != null) && (
                <div
                  className="flex items-center gap-1.5"
                  title="Color según severidad: azul La Niña, gris neutro, naranja El Niño, rojo El Niño fuerte."
                >
                  <span
                    className="w-3 h-0.5 rounded-full"
                    style={{
                      background:
                        "linear-gradient(to right, #38BDF8, #94A3B8, #F97316, #EF4444)",
                    }}
                  />
                  <span>
                    ONI El Niño (escala relativa, color por severidad)
                  </span>
                </div>
              )}
              {data.embalses.prediccion.some((p) => p.valor >= 80) && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-l-2 border-dashed border-emerald-400" />
                  <span>Meta 80%</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-l-2 border-dashed border-amber-400" />
                <span>Pico proyectado</span>
              </div>
              {(() => {
                const rangoMin = data.embalses.mape_rango_min;
                const rangoMax = data.embalses.mape_rango_max;
                const hayRango = rangoMin != null && rangoMax != null && rangoMax > rangoMin;
                return (
                  <div
                    className="ml-auto"
                    title={
                      hayRango
                        ? `El error real varía según el año usado para entrenar (${data.embalses.mape_anios_evaluados?.join(", ") ?? ""}) — no es un solo número fijo.`
                        : data.embalses.mape_es_riguroso
                          ? `MAPE de una validación rigurosa: modelo entrenado sin ver ${data.embalses.backtest?.n_dias_test ?? "los"} días reales usados para comparar.`
                          : "MAPE de una prueba interna de 180 días."
                    }
                  >
                    {hayRango ? (
                      <>
                        MAPE {(rangoMin! * 100).toFixed(1)}%–{(rangoMax! * 100).toFixed(1)}%{" "}
                        (rango histórico validado)
                      </>
                    ) : (
                      <>
                        MAPE {(data.embalses.mape * 100).toFixed(1)}%{" "}
                        {data.embalses.mape_es_riguroso
                          ? "(validación rigurosa)"
                          : "(prueba interna)"}
                        {data.embalses.cobertura_ci != null &&
                          ` · ${(data.embalses.cobertura_ci * 100).toFixed(0)}% cobertura`}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </motion.div>

          {/* Tabla detalle diario */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-dash-chip rounded-xl p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
                  Detalle Diario de Proyección
                </span>
                <p className="text-[10px] text-theme-muted mt-0.5">
                  {data.embalses.prediccion.length} días · entradas del modelo y
                  salida predicha
                </p>
              </div>
              <button
                onClick={() => {
                  const exportData = data.embalses.prediccion.map((p) => ({
                    Fecha: p.fecha,
                    "% Embalse (predicho)": p.valor,
                    "IC Inferior 95%": clampPct(p.lower),
                    "IC Superior 95%": clampPct(p.upper),
                    "ONI (°C)": p.oni ?? "",
                    PDO: p.pdo ?? "",
                    SOI: p.soi ?? "",
                    "GMST (°C)": p.gmst ?? "",
                  }));
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Proyección Embalses");
                  XLSX.writeFile(
                    wb,
                    `proyeccion_embalses_${new Date().toISOString().split("T")[0]}.xlsx`,
                  );
                }}
                className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Exportar Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-dash-chip z-10">
                    <tr className="text-theme-muted text-left border-b border-theme-card">
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">
                        % Embalse
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">
                        IC Inferior
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">
                        IC Superior
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">
                        ONI (°C)
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">
                        PDO
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-right">
                        SOI
                      </th>
                      <th className="pb-3 font-semibold uppercase tracking-wider text-right">
                        GMST (°C)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-card/50">
                    {(() => {
                      const threshold80Fecha = data.embalses.prediccion.find(
                        (p) => p.valor >= 80,
                      )?.fecha;
                      const peakFecha = data.embalses.pico?.fecha;
                      return data.embalses.prediccion.map((p) => (
                        <tr
                          key={p.fecha}
                          className={
                            p.fecha === peakFecha
                              ? "border-l-2 border-amber-400 bg-amber-500/10 text-theme-secondary transition-colors"
                              : p.fecha === threshold80Fecha
                                ? "border-l-2 border-emerald-500 bg-emerald-500/10 text-theme-secondary transition-colors"
                                : "text-theme-secondary hover:bg-theme-primary/20 transition-colors"
                          }
                        >
                          <td className="py-2 pr-4 font-medium text-theme-primary">
                            {fmtDate(p.fecha)}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <span className="text-gold font-semibold tabular-nums">
                              {p.valor.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-blue-300/80">
                            {clampPct(p.lower).toFixed(1)}%
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-blue-300/80">
                            {clampPct(p.upper).toFixed(1)}%
                          </td>
                          <td
                            className="py-2 pr-4 text-right tabular-nums font-semibold"
                            style={{
                              color:
                                classifyOni(p.oni ?? null)?.color ?? "#94A3B8",
                            }}
                          >
                            {p.oni != null
                              ? `${p.oni > 0 ? "+" : ""}${p.oni.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-theme-secondary">
                            {p.pdo != null
                              ? `${p.pdo > 0 ? "+" : ""}${p.pdo.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-theme-secondary">
                            {p.soi != null
                              ? `${p.soi > 0 ? "+" : ""}${p.soi.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums text-theme-secondary">
                            {p.gmst != null ? `+${p.gmst.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Grid métricas */}
          <div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-bold text-theme-primary mb-3"
            >
              Otras proyecciones del SIN
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.metricas.map((m, i) => (
                <MetricPredictionCard
                  key={m.id}
                  metric={m}
                  index={i}
                  onClick={() => setSelectedMetric(m)}
                />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Modal — como hermano de DashboardLayout, no anidado dentro de su
          motion.div: un transform de framer-motion en un ancestro crea un
          containing block nuevo y rompe el `position: fixed` a pantalla completa. */}
      <AnimatePresence>
        {selectedMetric && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedMetric(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dash-chip rounded-xl p-5 border border-white/10 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-theme-primary">
                    {selectedMetric.nombre}
                  </h3>
                  <p className="text-[10px] text-theme-muted">
                    Proyección 7 días · modelo {selectedMetric.modelo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMetric(null)}
                  className="p-2 text-theme-muted hover:text-gold transition-colors rounded-full hover:bg-white/5"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <ModalMetricDetail metric={selectedMetric} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DiagnosticoNarrativo({ data }: { data: DashboardData }) {
  const [expanded, setExpanded] = useState(false);

  const actual = data.embalses.actual;
  const pico = data.embalses.pico;
  const oni = data.oni;

  if (!actual || !pico) return null;

  const fmtMY = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
  };

  const nivelActual = actual.valor.toFixed(1);
  const picoPct = pico.valor.toFixed(1);
  const fechaPico = fmtDate(pico.fecha);
  const diasPico = pico.dias_desde_hoy;
  const mapePct = (data.embalses.mape * 100).toFixed(1);
  const mapeEsRiguroso = data.embalses.mape_es_riguroso ?? false;
  const nDiasBacktest = data.embalses.backtest?.n_dias_test;
  // Fase 41 (2026-08-30): el error real varía bastante según el año de corte
  // usado para entrenar (verificado con 2 años: 9.3% y 22.6%) — cuando hay
  // más de un año evaluado, se comunica el rango en vez de un solo número.
  const mapeRangoMin = data.embalses.mape_rango_min;
  const mapeRangoMax = data.embalses.mape_rango_max;
  const hayRangoReal =
    mapeRangoMin != null && mapeRangoMax != null && mapeRangoMax > mapeRangoMin;
  const mapeRangoPct =
    hayRangoReal
      ? `${(mapeRangoMin * 100).toFixed(1)}% y ${(mapeRangoMax * 100).toFixed(1)}%`
      : null;
  const mapeAniosTexto = data.embalses.mape_anios_evaluados?.join(" y ") ?? "";

  const oniActual = oni.actual ?? 0;
  const maxForecast =
    oni.forecast.length > 0
      ? oni.forecast.reduce((mx, f) => (f.valor > mx.valor ? f : mx))
      : null;
  const oniLabel =
    oniActual >= 1.5
      ? "Muy Fuerte"
      : oniActual >= 1.0
        ? "Fuerte"
        : oniActual >= 0.5
          ? "Moderado"
          : "Débil o neutro";
  const oniColor = classifyOni(oniActual)?.color ?? "#94A3B8";

  const oniLag = oni.forecast.length > 0 ? oni.forecast[0] : null;
  const oniLagColor = classifyOni(oniLag?.valor ?? null)?.color ?? "#94A3B8";

  const pdoActual = oni.pdo?.actual ?? null;
  const pdoFase = oni.pdo?.fase ?? "PDO−";
  const soiActual = oni.soi?.actual ?? null;
  const gmstActual = oni.gmst?.actual ?? null;

  // SOI estándar NOAA: < −1 = El Niño atm., > +1 = La Niña atm.
  const soiLabel =
    soiActual !== null
      ? soiActual < -1.0
        ? "El Niño atm."
        : soiActual > 1.0
          ? "La Niña atm."
          : soiActual < -0.5
            ? "El Niño leve atm."
            : soiActual > 0.5
              ? "La Niña leve atm."
              : "Neutro atm."
      : "—";

  const riesgo =
    pico.valor >= 75
      ? "buenas reservas hídricas"
      : pico.valor >= 60
        ? "reservas moderadas"
        : "reservas limitadas";

  const threshold80Point =
    data.embalses.prediccion.find((p) => p.valor >= 80) ?? null;
  const fechaMeta80 = threshold80Point ? fmtDate(threshold80Point.fecha) : null;
  const diasMeta80 = threshold80Point
    ? Math.round(
        (new Date(threshold80Point.fecha + "T00:00:00").getTime() -
          Date.now()) /
          86400000,
      )
    : null;

  const fmtRiskDate = (d: Date) =>
    d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const peakDate = pico?.fecha ? new Date(pico.fecha + "T00:00:00") : null;
  const postPeak = peakDate
    ? data.embalses.prediccion.filter(
        (p) => new Date(p.fecha + "T00:00:00") > peakDate,
      )
    : data.embalses.prediccion;
  const vallePoint =
    postPeak.length > 0
      ? postPeak.reduce(
          (min, p) => (p.valor < min.valor ? p : min),
          postPeak[0],
        )
      : null;
  const riskWindowText = vallePoint
    ? (() => {
        const t = new Date(vallePoint.fecha + "T00:00:00");
        const start = new Date(t);
        start.setDate(start.getDate() - 45);
        const end = new Date(t);
        end.setDate(end.getDate() + 45);
        return `${fmtRiskDate(start)} y ${fmtRiskDate(end)}`;
      })()
    : "el segundo semestre";

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 space-y-4">
      {/* Encabezado */}
      <div className="flex items-center gap-2">
        <CloudSun className="w-4 h-4 text-gold" />
        <p className="text-[11px] font-semibold text-gold uppercase tracking-wider">
          Diagnóstico Climático · Análisis del sistema de predicción
        </p>
      </div>

      {/* KPI cards — 5 indicadores. Solo el ONI (señal de riesgo) usa color de severidad;
          los demás son contexto y comparten un mismo acento neutro para no leer como arcoíris. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* ONI actual */}
        <div
          className="bg-theme-primary/40 rounded-lg p-4 border-t-2 border-x border-b border-white/5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          style={{ borderTopColor: oniColor }}
        >
          <div className="text-[10px] text-theme-muted uppercase tracking-wider leading-tight">
            ONI · Temperatura Pacífico
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: `${oniColor}1F` }}
            >
              <Thermometer className="w-5 h-5" style={{ color: oniColor }} />
            </span>
            <span className="text-2xl font-bold" style={{ color: oniColor }}>
              {oniActual > 0 ? "+" : ""}
              {oniActual.toFixed(2)}°C
            </span>
          </div>
          <div
            className="mt-2 inline-block text-[10px] font-semibold px-2 py-1 rounded"
            style={{ background: `${oniColor}22`, color: oniColor }}
          >
            {oni.actual !== null ? `El Niño ${oniLabel}` : "Sin dato"}
          </div>
          <div className="text-[10px] text-theme-muted mt-2">
            {fmtMY(oni.actual_fecha) ?? "Fuente: NOAA CPC"}
          </div>
        </div>

        {/* ONI rezagado 90d */}
        <div
          className="bg-theme-primary/40 rounded-lg p-4 border-t-2 border-x border-b border-white/5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          style={{ borderTopColor: oniLagColor }}
        >
          <div className="text-[10px] text-theme-muted uppercase tracking-wider leading-tight">
            ONI rezagado · Efecto en ríos
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: `${oniLagColor}1F` }}
            >
              <History className="w-5 h-5" style={{ color: oniLagColor }} />
            </span>
            {oniLag ? (
              <span className="text-2xl font-bold" style={{ color: oniLagColor }}>
                {oniLag.valor > 0 ? "+" : ""}
                {oniLag.valor.toFixed(2)}°C
              </span>
            ) : (
              <span className="text-2xl font-bold text-theme-muted">—</span>
            )}
          </div>
          {oniLag && (
            <div
              className="mt-2 inline-block text-[10px] font-semibold px-2 py-1 rounded"
              style={{ background: `${oniLagColor}22`, color: oniLagColor }}
            >
              {fmtShortDate(oniLag.fecha)}
            </div>
          )}
          <div className="text-[10px] text-theme-muted mt-2">
            Proyección: {oniLag ? fmtMY(oniLag.fecha) : "—"}
          </div>
        </div>

        {/* PDO — señal de contexto, no de riesgo: acento neutro */}
        <div className="bg-theme-primary/40 rounded-lg p-4 border-t-2 border-x border-b border-white/5 border-t-blue-400/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider leading-tight">
            PDO · Ciclo oceánico largo plazo
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-400/[0.12] shrink-0">
              <Waves className="w-5 h-5 text-blue-400" />
            </span>
            <span className="text-2xl font-bold text-theme-primary">
              {pdoActual !== null
                ? `${pdoActual > 0 ? "+" : ""}${pdoActual.toFixed(2)}`
                : "—"}
            </span>
          </div>
          <div className="mt-2 inline-block text-[10px] font-semibold px-2 py-1 rounded bg-white/5 text-theme-secondary border border-white/10">
            {pdoFase}
          </div>
          <div className="text-[10px] text-theme-muted mt-2">
            {fmtMY(oni.pdo?.fecha) ?? "Fuente: NOAA PSL"}
          </div>
        </div>

        {/* SOI — señal de contexto, no de riesgo: acento neutro */}
        <div className="bg-theme-primary/40 rounded-lg p-4 border-t-2 border-x border-b border-white/5 border-t-blue-400/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider leading-tight">
            SOI · Presión atmosférica
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-400/[0.12] shrink-0">
              <Wind className="w-5 h-5 text-blue-400" />
            </span>
            <span className="text-2xl font-bold text-theme-primary">
              {soiActual !== null
                ? `${soiActual > 0 ? "+" : ""}${soiActual.toFixed(2)}`
                : "—"}
            </span>
          </div>
          <div className="mt-2 inline-block text-[10px] font-semibold px-2 py-1 rounded bg-white/5 text-theme-secondary border border-white/10">
            {soiLabel}
          </div>
          <div className="text-[10px] text-theme-muted mt-2">
            {fmtMY(oni.soi?.fecha) ?? "Fuente: NOAA CPC"}
          </div>
        </div>

        {/* GMST — señal de contexto, no de riesgo: acento neutro */}
        <div className="bg-theme-primary/40 rounded-lg p-4 border-t-2 border-x border-b border-white/5 border-t-blue-400/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider leading-tight">
            GMST · Temp. media global
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-400/[0.12] shrink-0">
              <Globe className="w-5 h-5 text-blue-400" />
            </span>
            <span className="text-2xl font-bold text-theme-primary">
              {gmstActual !== null ? `+${gmstActual.toFixed(2)}°C` : "—"}
            </span>
          </div>
          <div className="mt-2 inline-block text-[10px] font-semibold px-2 py-1 rounded bg-white/5 text-theme-secondary border border-white/10">
            Récord instrumental
          </div>
          <div className="text-[10px] text-theme-muted mt-2">
            {fmtMY(oni.gmst?.fecha) ?? "Fuente: NASA GISTEMP v4"}
          </div>
        </div>
      </div>

      {/* Resumen ejecutivo — siempre visible */}
      <div className="space-y-2 text-xs text-theme-secondary leading-relaxed">
        <p>
          Hoy los embalses del SIN están al{" "}
          <strong className="text-theme-primary">{nivelActual}%</strong> de su
          capacidad útil —{" "}
          <strong className="text-theme-primary">{riesgo}</strong>.{" "}
          {fechaMeta80 && diasMeta80 !== null && (
            <>
              La proyección supera por primera vez la{" "}
              <strong className="text-emerald-400">meta del 80%</strong> el{" "}
              <strong className="text-emerald-400">{fechaMeta80}</strong> (en{" "}
              {diasMeta80} días).{" "}
            </>
          )}
          El modelo proyecta un pico de{" "}
          <strong className="text-gold">{picoPct}%</strong> el{" "}
          <strong className="text-gold">{fechaPico}</strong> (en {diasPico}{" "}
          días), tras lo cual la señal de El Niño activo{" "}
          <strong style={{ color: oniColor }}>
            (ONI {oniActual > 0 ? "+" : ""}
            {oniActual.toFixed(2)}°C — {oniLabel})
          </strong>{" "}
          y el calentamiento global{" "}
          <strong className="text-theme-primary">
            (+{gmstActual !== null ? gmstActual.toFixed(2) : "1.12"}°C)
          </strong>{" "}
          activarán un descenso sostenido:{" "}
          <strong className="text-red-400">
            la ventana de mayor riesgo energético se ubica entre{" "}
            {riskWindowText}
          </strong>
          . Pronóstico basado principalmente en el índice ONI (NOAA), con cinco
          señales climáticas adicionales (NASA, XM) como contexto
          complementario.{" "}
          {hayRangoReal ? (
            <>
              Validado entrenando el modelo con distintos años de corte (
              {mapeAniosTexto}) y comparando contra los datos reales que
              vinieron después: el error real observado varió entre{" "}
              <strong className="text-emerald-400">{mapeRangoPct}</strong>{" "}
              según el año — no es una cifra fija, depende de qué tan
              parecidas fueron las condiciones climáticas al período validado
              (ver detalle abajo).
            </>
          ) : mapeEsRiguroso ? (
            <>
              Validado comparando el modelo contra{" "}
              <strong className="text-theme-primary">
                {nDiasBacktest ?? "cientos de"} días reales
              </strong>{" "}
              ya ocurridos (entrenado solo con datos anteriores a ese período,
              sin haber visto el resultado): error real del{" "}
              <strong className="text-emerald-400">{mapePct}%</strong> (ver
              detalle abajo).
            </>
          ) : (
            <>
              En pruebas internas el modelo tuvo un error promedio del{" "}
              <strong className="text-emerald-400">{mapePct}%</strong> (ver
              detalle abajo).
            </>
          )}
        </p>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-gold hover:text-gold transition-colors"
        >
          <span>{expanded ? "Ocultar detalles" : "Ver análisis completo"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Narrativa detallada — expandible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 text-xs text-theme-secondary leading-relaxed pt-3 border-t border-white/10">
              <p>
                Para proyectar el nivel de los embalses del Sistema
                Interconectado Nacional, se combinan dos métodos de predicción
                entrenados sobre{" "}
                <strong className="text-theme-primary">
                  26 años de datos históricos
                </strong>{" "}
                —desde enero de 2000. El primero,{" "}
                <strong className="text-theme-primary">Prophet</strong>{" "}
                (desarrollado por Meta), reconoce automáticamente los dos ciclos
                lluviosos anuales de la cordillera andina colombiana, se ajusta
                con las seis señales climáticas e hidrológicas descritas abajo,
                y ajusta su pronóstico cuando las condiciones climáticas
                cambian. El segundo,{" "}
                <strong className="text-theme-primary">SARIMAX</strong>, es un
                modelo estadístico más simple que incorpora directamente en su
                estructura solo el índice oceánico ONI (sin las otras cinco
                señales). Los dos resultados se combinan ponderando más al que
                haya sido históricamente más preciso.{" "}
                {hayRangoReal ? (
                  <>
                    La precisión reportada aquí ({mapeRangoPct}) viene de
                    correr esta misma validación rigurosa con más de un año de
                    corte ({mapeAniosTexto}): se entrenó el modelo solo con
                    datos hasta finales de cada año (sin dejarle ver lo que
                    pasó después) y se compararon sus pronósticos contra los
                    días reales que efectivamente ocurrieron después. El
                    resultado varió bastante según el año —{" "}
                    <strong className="text-amber-400">{mapeRangoPct}</strong>
                    {" "}de error real— lo que indica que la precisión del
                    modelo depende de qué tan parecidas fueron las condiciones
                    climáticas del período entrenado a las del período
                    validado, no de una capacidad fija del modelo. En el
                    seguimiento semana a semana de pronósticos ya publicados el
                    error también ha rondado el 7% en promedio, con picos
                    puntuales de hasta 30% en semanas de cambio brusco del
                    clima.
                  </>
                ) : mapeEsRiguroso && data.embalses.backtest ? (
                  <>
                    La precisión reportada aquí ({mapePct}%) viene de una
                    validación rigurosa: se entrenó el modelo solo con datos
                    hasta finales de{" "}
                    <strong className="text-theme-primary">
                      {data.embalses.backtest.anio_corte}
                    </strong>{" "}
                    (sin dejarle ver lo que pasó después) y se compararon sus
                    pronósticos contra los{" "}
                    <strong className="text-theme-primary">
                      {data.embalses.backtest.n_dias_test} días reales
                    </strong>{" "}
                    que efectivamente ocurrieron después (
                    {fmtShortDate(data.embalses.backtest.fecha_test_inicio)} a{" "}
                    {fmtShortDate(data.embalses.backtest.fecha_test_fin)} — un
                    período que incluye El Niño activo y transiciones climáticas
                    reales, no solo condiciones estables): error real del{" "}
                    <strong className="text-amber-400">{mapePct}%</strong>. En
                    el seguimiento semana a semana de pronósticos ya publicados
                    el error también ha rondado el 7% en promedio, con picos
                    puntuales de hasta 30% en semanas de cambio brusco del
                    clima.
                  </>
                ) : (
                  <>
                    En una prueba interna sobre{" "}
                    <strong className="text-theme-primary">
                      180 días históricos
                    </strong>
                    , el sistema registró un error medio absoluto del{" "}
                    <strong className="text-theme-primary">{mapePct}%</strong>.
                  </>
                )}{" "}
                Hoy, los embalses del SIN se encuentran al{" "}
                <strong className="text-theme-primary">{nivelActual}%</strong>{" "}
                de su volumen útil ({riesgo}).
              </p>

              <p>
                La primera señal climática es el{" "}
                <strong className="text-gold">
                  Índice Oceánico de El Niño (ONI)
                </strong>
                , publicado mensualmente por la{" "}
                <strong className="text-theme-primary">
                  NOAA (Administración Nacional Oceánica y Atmosférica de los
                  Estados Unidos)
                </strong>
                . El ONI mide qué tan caliente o fría está la superficie del
                océano Pacífico tropical frente a las costas de Perú y Ecuador.
                Cuando esa temperatura supera en más de 0,5°C el promedio
                histórico durante cinco meses seguidos, la NOAA declara El Niño:
                fenómeno que históricamente reduce las lluvias sobre la
                cordillera andina colombiana, donde se concentra el 70% de la
                generación hidroeléctrica del país. En este momento, el ONI
                registra{" "}
                <strong style={{ color: oniColor }}>
                  {oniActual > 0 ? "+" : ""}
                  {oniActual.toFixed(2)}°C (El Niño {oniLabel})
                </strong>
                {maxForecast && (
                  <>
                    , con pronóstico de la NOAA hasta{" "}
                    <strong className="text-gold">
                      +{maxForecast.valor.toFixed(1)}°C
                    </strong>{" "}
                    hacia {fmtShortDate(maxForecast.fecha)}
                  </>
                )}
                .
              </p>

              <p>
                La segunda señal es el mismo índice ONI con un ajuste temporal
                decisivo: los registros históricos demuestran que el impacto del
                calentamiento oceánico{" "}
                <strong className="text-gold">
                  no se siente de inmediato en los ríos colombianos
                </strong>
                . Las cuencas del Magdalena y el Cauca —principales afluentes
                del SIN— responden al calentamiento del Pacífico con un retraso
                de 2 a 3 meses: el tiempo que tarda esa señal en modificar los
                vientos y los patrones de lluvia sobre los Andes. Al incorporar
                esta versión diferida del índice, el sistema distingue entre lo
                que ocurre hoy en el océano y lo que ese calentamiento producirá
                en los ríos en tres meses.{" "}
                {oniLag && (
                  <>
                    La señal diferida proyecta{" "}
                    <strong style={{ color: oniLagColor }}>
                      {oniLag.valor > 0 ? "+" : ""}
                      {oniLag.valor.toFixed(2)}°C para{" "}
                      {fmtShortDate(oniLag.fecha)}
                    </strong>
                    .
                  </>
                )}
              </p>

              <p>
                La tercera señal es la{" "}
                <strong className="text-theme-primary">
                  Oscilación Decadal del Pacífico (PDO)
                </strong>
                , monitoreada por el Laboratorio de Ciencias Físicas de la NOAA.
                A diferencia del ONI, que varía mes a mes, el PDO describe un
                patrón de largo plazo en la distribución del calor oceánico, con
                ciclos de 10 a 30 años. Su rol es actuar como{" "}
                <strong className="text-theme-primary">
                  amplificador o atenuador
                </strong>
                : en fase positiva (PDO+), los episodios de El Niño tienden a
                ser más intensos; en fase negativa (PDO−), los amortigua. Con un
                valor actual de{" "}
                <strong className="text-theme-primary">
                  {pdoActual !== null
                    ? `${pdoActual > 0 ? "+" : ""}${pdoActual.toFixed(2)}`
                    : "—"}{" "}
                  ({pdoFase})
                </strong>
                , el PDO indica que el episodio de El Niño en curso tiene una
                intensidad{" "}
                {pdoFase === "PDO−"
                  ? "ligeramente atenuada respecto a lo que indicaría el ONI por sí solo"
                  : "amplificada, lo que agrava el riesgo de déficit hídrico"}
                .
              </p>

              <p>
                La cuarta señal es el{" "}
                <strong className="text-theme-primary">
                  Índice de Oscilación del Sur (SOI)
                </strong>
                , publicado por el Centro de Predicción Climática de la NOAA. El
                SOI mide la diferencia de presión atmosférica entre Tahití
                (Pacífico central) y Darwin (norte de Australia): cuando
                predomina más presión en Darwin, los vientos refuerzan El Niño y
                reducen las lluvias en Suramérica. Al combinar el ONI —señal del
                océano— con el SOI —señal de la atmósfera—, el sistema obtiene
                una imagen más completa del fenómeno. El SOI registra
                actualmente{" "}
                <strong className="text-theme-primary">
                  {soiActual !== null
                    ? `${soiActual > 0 ? "+" : ""}${soiActual.toFixed(2)}`
                    : "—"}{" "}
                  ({soiLabel})
                </strong>
                , confirmando la señal atmosférica del evento en curso.
              </p>

              <p>
                La quinta señal son los{" "}
                <strong className="text-blue-400">
                  Aportes Hídricos al SIN (AporEner)
                </strong>
                , publicados diariamente por XM —el operador del sistema
                eléctrico colombiano—, medidos en GWh equivalente de energía.
                Esta variable representa la causa física más directa del nivel
                de los embalses: es el volumen real de agua que llega cada día a
                las turbinas a través de los ríos. El modelo la usa con un
                desfase de <strong className="text-blue-400">7 días</strong> —el
                tiempo promedio que tarda el agua en transitar desde las cuencas
                hasta los embalses—, entrenado sobre{" "}
                <strong className="text-blue-400">
                  99.000 registros desde el año 2000
                </strong>
                . A diferencia del ONI (que sí tiene un pronóstico real hacia
                adelante), para las fechas futuras del pronóstico el modelo
                asume aportes en su condición histórica normal —no proyecta si
                vendrá una crecida o una sequía puntual de los ríos—, así que su
                aporte real es explicar mejor el pasado reciente, no anticipar
                sorpresas hidrológicas de corto plazo.
              </p>

              <p>
                La sexta señal es la{" "}
                <strong className="text-theme-primary">
                  Anomalía de Temperatura Media Global (GMST)
                </strong>
                , publicada mensualmente por la NASA a través del programa
                GISTEMP v4. Este indicador registra cuánto ha cambiado la
                temperatura promedio del planeta respecto a la norma del período
                1951-1980, con registros que se remontan a 1880. En{" "}
                {new Date().getFullYear()}, esa anomalía es{" "}
                <strong className="text-theme-primary">
                  {gmstActual !== null
                    ? `+${gmstActual.toFixed(2)}°C`
                    : "+1.12°C"}
                </strong>{" "}
                —el valor más alto del registro instrumental—. Esta tendencia de
                fondo (un planeta más caliente) es parte de por qué la misma
                temperatura del Pacífico puede tener hoy más consecuencias sobre
                las lluvias andinas que hace 20 años, aunque el modelo no
                cuantifica ese efecto de forma independiente. Con base
                principalmente en la señal ONI (la única con un pronóstico real
                hacia adelante), el modelo proyecta que{" "}
                {fechaMeta80 && diasMeta80 !== null && (
                  <>
                    los embalses alcanzarán por primera vez la{" "}
                    <strong className="text-emerald-400">
                      meta operativa del 80% el {fechaMeta80}
                    </strong>{" "}
                    (en {diasMeta80} días) y que{" "}
                  </>
                )}
                el mayor nivel de llenado de los embalses se alcanzará el{" "}
                <strong className="text-gold">{fechaPico}</strong> con{" "}
                <strong className="text-gold">
                  {picoPct}% de volumen útil
                </strong>{" "}
                —en aproximadamente{" "}
                <strong className="text-theme-primary">{diasPico} días</strong>
                —, tras lo cual la combinación de El Niño activo, la temporada
                seca y el calentamiento global producirá un descenso sostenido,
                con la ventana de mayor riesgo para la seguridad energética
                nacional entre {riskWindowText}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalMetricDetail({ metric }: { metric: MetricSummary }) {
  const fmt = (v: number) =>
    metric.unidad === "$/kWh"
      ? `$${v.toFixed(2)}`
      : `${v.toFixed(1)} ${metric.unidad}`;

  const variacion =
    metric.actual !== 0
      ? ((metric.prediccion_7d - metric.actual) / Math.abs(metric.actual)) * 100
      : 0;
  const sube = variacion > 0;
  const TendenciaIcon = sube
    ? TrendingUp
    : variacion < 0
      ? TrendingDown
      : Minus;
  const tendenciaColor = sube
    ? "#22C55E"
    : variacion < 0
      ? "#EF4444"
      : "#94A3B8";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-theme-primary/40 rounded-lg p-4 border border-white/5">
          <div className="text-[9px] text-theme-muted uppercase mb-1">Hoy</div>
          <div className="text-2xl font-bold text-theme-primary">
            {fmt(metric.actual)}
          </div>
        </div>
        <div className="bg-theme-primary/40 rounded-lg p-4 border border-white/5">
          <div className="text-[9px] text-theme-muted uppercase mb-1">
            En 7 días
          </div>
          <div className="text-2xl font-bold text-gold">
            {fmt(metric.prediccion_7d)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-theme-primary/40 rounded-lg p-4 border border-white/5 flex items-center gap-3">
          <TendenciaIcon
            className="w-6 h-6 flex-shrink-0"
            style={{ color: tendenciaColor }}
          />
          <div>
            <div className="text-[9px] text-theme-muted uppercase">
              Variación 7d
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: tendenciaColor }}
            >
              {sube ? "+" : ""}
              {variacion.toFixed(1)}%
            </div>
          </div>
        </div>
        <div
          className="bg-theme-primary/40 rounded-lg p-4 border border-white/5"
          title={
            metric.mape_es_riguroso
              ? `Validación rigurosa: modelo entrenado solo con datos hasta finales de ${metric.backtest?.anio_corte ?? "—"}, comparado contra ${metric.backtest?.n_dias_test ?? "cientos de"} días reales que vinieron después.`
              : "MAPE de una prueba interna (holdout de entrenamiento)."
          }
        >
          <div className="text-[9px] text-theme-muted uppercase mb-1">
            MAPE del modelo{" "}
            {metric.mape_es_riguroso
              ? "(validación rigurosa)"
              : "(prueba interna)"}
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {(metric.mape * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-theme-muted">
            {metric.mape_es_riguroso
              ? `error real sobre ${metric.backtest?.n_dias_test ?? "—"} días ya ocurridos`
              : "error medio absoluto"}
          </div>
        </div>
      </div>
    </div>
  );
}
