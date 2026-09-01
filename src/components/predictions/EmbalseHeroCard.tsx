"use client";

import { motion } from "framer-motion";
import { Droplets, TrendingUp, TrendingDown, Minus, CloudSun, AlertCircle } from "lucide-react";
import { fmtDate, fmtShortDate } from "@/types/predictions";

interface Props {
  actual: { fecha: string; valor: number } | null;
  pico: { fecha: string; valor: number; dias_desde_hoy: number } | null;
  mape: number;
  confianza: number;
  coberturaCi?: number | null;
  mapeEsRiguroso?: boolean;
  nDiasBacktest?: number | null;
  mapeRangoMin?: number | null;
  mapeRangoMax?: number | null;
  mapeAniosEvaluados?: number[];
  generadoEn: string;
  oni: { actual: number | null; estado: string | null } | null;
}

export default function EmbalseHeroCard({
  actual,
  pico,
  mape,
  confianza,
  coberturaCi,
  mapeEsRiguroso,
  nDiasBacktest,
  mapeRangoMin,
  mapeRangoMax,
  mapeAniosEvaluados,
  generadoEn,
  oni,
}: Props) {
  // Fase 41 (2026-08-30): si hay más de un año de backtest corrido, el error
  // real varía bastante según el año (verificado: 2022→22.6%, 2024→9.3%) —
  // mostrar el rango en vez de un solo número evita transmitir más certeza
  // de la que hay evidencia real para respaldar.
  const hayRangoReal =
    mapeRangoMin != null && mapeRangoMax != null && mapeRangoMax > mapeRangoMin;
  const mapeTexto = hayRangoReal
    ? `${(mapeRangoMin * 100).toFixed(1)}%–${(mapeRangoMax * 100).toFixed(1)}%`
    : `${(mape * 100).toFixed(1)}%`;
  const hayPico = pico && actual;
  const diferencia = hayPico ? pico.valor - actual.valor : 0;
  const tendencia = diferencia > 1 ? "alta" : diferencia < -1 ? "baja" : "estable";

  const oniColor =
    oni?.estado === "EL NIÑO" ? "#F97316" : oni?.estado === "LA NIÑA" ? "#38BDF8" : "#94A3B8";

  const TendenciaIcon = tendencia === "alta" ? TrendingUp : tendencia === "baja" ? TrendingDown : Minus;
  const tendenciaColor = tendencia === "alta" ? "#22C55E" : tendencia === "baja" ? "#EF4444" : "#94A3B8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden bg-dash-chip rounded-xl p-6 md:p-8 border border-white/5 transition-shadow duration-500 hover:shadow-[0_0_60px_-20px_var(--glow-gold)]"
    >
      {/* Glow decorativo — reutiliza los tokens de marca ya definidos en globals.css */}
      <div
        className="pointer-events-none absolute -left-16 -top-16 w-80 h-80 rounded-full blur-3xl"
        style={{ background: "var(--glow-energia)" }}
      />
      <div
        className="pointer-events-none absolute -right-16 -bottom-16 w-80 h-80 rounded-full blur-3xl"
        style={{ background: "var(--glow-gold)" }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1.3fr] gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        {/* Izquierda: actual */}
        <div className="relative pb-6 lg:pb-0 lg:pr-8">
          <Droplets className="pointer-events-none hidden md:block absolute right-0 top-0 w-24 h-24 text-blue-400/[0.06]" />
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">
              Embalses hoy
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl md:text-6xl font-bold text-blue-400">
              {actual ? actual.valor.toFixed(2) : "—"}%
            </span>
            {actual && (
              <span className="text-xs text-theme-muted">
                {fmtShortDate(actual.fecha)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-theme-muted mt-1.5">
            Volumen útil nacional · XM
          </p>
        </div>

        {/* Centro: flecha + pico */}
        <div className="flex items-center gap-4 lg:gap-6 justify-start lg:justify-center py-2 lg:py-0 lg:px-4">
          <div className="hidden lg:flex flex-col items-center text-theme-muted">
            <TendenciaIcon className="w-8 h-8" style={{ color: tendenciaColor }} />
            <span className="text-[9px] uppercase mt-1" style={{ color: tendenciaColor }}>
              {tendencia}
            </span>
          </div>

          <div className="relative overflow-hidden bg-theme-primary/40 rounded-xl px-6 py-5 border border-white/5">
            <TrendingUp className="pointer-events-none absolute -right-3 -bottom-3 w-20 h-20 text-gold/[0.08]" />
            <div className="relative flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-widest text-gold uppercase">
                Pico proyectado
              </span>
            </div>
            <div className="relative flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-bold text-gold">
                {pico ? pico.valor.toFixed(2) : "—"}%
              </span>
            </div>
            <p className="relative text-xs text-theme-secondary mt-1">
              {pico ? fmtDate(pico.fecha) : "—"}
            </p>
            {pico && (
              <p className="relative text-[10px] text-theme-muted mt-0.5">
                {pico.dias_desde_hoy} días desde hoy
              </p>
            )}
          </div>
        </div>

        {/* Derecha: señales */}
        <div className="space-y-3 pt-6 lg:pt-0 lg:pl-8">
          <div className="flex items-center justify-between bg-theme-primary/30 hover:bg-theme-primary/50 rounded-lg px-4 py-3 border border-white/5 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" style={{ color: oniColor }} />
              <span className="text-xs text-theme-secondary">Señal ONI</span>
            </div>
            <span className="text-xs font-bold" style={{ color: oniColor }}>
              {oni?.actual !== null && oni?.actual !== undefined ? `${oni.actual}°C` : "—"}
              {" "}
              <span className="text-[10px] font-medium text-theme-muted">
                {oni?.estado || ""}
              </span>
            </span>
          </div>

          <div
            className="flex items-center justify-between bg-theme-primary/30 hover:bg-theme-primary/50 rounded-lg px-4 py-3 border border-white/5 transition-colors duration-200"
            title={
              hayRangoReal
                ? `El error real varía según el año de corte usado para entrenar: ${mapeAniosEvaluados?.join(", ") ?? ""} dieron entre ${mapeTexto}. No es un solo número fijo — depende de qué tan parecidas fueron las condiciones climáticas del período validado a las del período de entrenamiento.`
                : mapeEsRiguroso
                ? `MAPE real: error observado al entrenar el modelo solo con datos hasta un año de corte y comparar sus pronósticos contra ${nDiasBacktest ?? "cientos de"} días reales que vinieron después (validación rigurosa, no un atajo optimista). Cobertura: de cada 100 de esos días, en cuántos el valor real cayó dentro del rango mostrado en el gráfico.`
                : "MAPE: error promedio en una prueba interna de 180 días. Cobertura: de cada 100 días de esa prueba, en cuántos el valor real cayó dentro del rango mostrado en el gráfico."
            }
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-theme-secondary">
                {hayRangoReal
                  ? "Precisión (rango histórico validado)"
                  : mapeEsRiguroso
                    ? "Precisión (validación rigurosa)"
                    : "Precisión (prueba interna)"}
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400">
              MAPE {mapeTexto}
              {!hayRangoReal && coberturaCi != null && ` · ${(coberturaCi * 100).toFixed(0)}% cobertura`}
            </span>
          </div>

          <p className="flex items-center justify-end gap-1.5 text-[9px] text-theme-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Actualizado: {new Date(generadoEn).toLocaleString("es-CO")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
