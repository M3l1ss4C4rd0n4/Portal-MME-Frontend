"use client";

import { motion } from "framer-motion";
import { TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { StatusChip } from "./StatusChip";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Sparkline } from "@/components/ui/Sparkline";

interface KpiBlockProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  date?: string | null;
  valueClass?: string;
  large?: boolean;
  /** Clase de tamaño de fuente para la etiqueta — usar en tarjetas angostas con etiquetas largas */
  labelSizeClass?: string;
  /** Cuando el valor ES un porcentaje (0-100), muestra la barra de progreso con degradado y
      escala 0%/100% — igual que en Reservas/Aportes/Proyección Embalses del lado de Energía. */
  progressPct?: number;
  chipLabel?: string;
  chipColor?: string;
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  /** Contenido del tooltip informativo (ReactNode para formato rico) */
  tooltip?: React.ReactNode;
  /** Serie histórica para la mini gráfica de tendencia — se omite si no hay datos suficientes */
  sparklineData?: number[];
  sparklineColor?: string;
}

export function KpiBlock({
  label, value, unit, date, valueClass = "text-gold", large = false,
  labelSizeClass = "text-xs xl:text-sm",
  progressPct,
  chipLabel, chipColor, tendencia, metrica, tooltip,
  sparklineData, sparklineColor,
}: KpiBlockProps) {
  const strLen = typeof value === "string" || typeof value === "number" ? String(value).length : 12;
  let fontClass: string;

  if (large) {
    if (strLen <= 8) {
      fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";
    } else if (strLen <= 12) {
      fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
    } else if (strLen <= 18) {
      fontClass = "text-2xl xl:text-3xl 2xl:text-4xl";
    } else {
      fontClass = "text-lg xl:text-xl 2xl:text-2xl";
    }
  } else {
    if (strLen <= 8) {
      fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
    } else if (strLen <= 12) {
      fontClass = "text-2xl xl:text-3xl 2xl:text-4xl";
    } else if (strLen <= 18) {
      fontClass = "text-xl xl:text-2xl 2xl:text-3xl";
    } else {
      fontClass = "text-lg xl:text-xl 2xl:text-2xl";
    }
  }

  const trendColor = tendencia && tendencia.label !== "S/D" ? getTrendColor(tendencia, metrica ?? "valor") : undefined;
  const trendUnit = metrica === "embalses" || metrica === "aportes" ? "pp" : "%";

  return (
    <div className="flex flex-col text-center gap-1.5 w-full min-w-0">
      {/* Encabezado: título a la izquierda, estado como badge arriba a la derecha */}
      <div className="flex items-start justify-between gap-2">
        <p className={`text-theme-muted ${labelSizeClass} uppercase tracking-[0.14em] font-semibold flex flex-wrap items-center gap-0.5 [overflow-wrap:anywhere] text-left min-w-0`}>
          {label}
          {tooltip && <InfoTooltip content={tooltip} />}
        </p>
        {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} />}
      </div>

      {/* Valor principal + tendencia — la mini-tendencia (si hay) va a la izquierda del valor */}
      <div className="flex items-center justify-center gap-2.5">
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} color={sparklineColor ?? "var(--color-gold)"} className="w-10 xl:w-12 shrink-0" />
        )}
        <div className="inline-flex items-baseline gap-2 flex-wrap">
          <span
            className={`font-black leading-none break-all ${valueClass} ${fontClass}`}
            style={trendColor ? { color: trendColor } : undefined}
          >
            {value}
          </span>
          {tendencia && tendencia.label !== "S/D" && (
            <span
              className="inline-flex items-center gap-0.5 text-xs xl:text-sm font-bold"
              style={{ color: trendColor }}
            >
              <TrendArrow tendencia={tendencia} metrica={metrica} />
              {tendencia.cambio7d !== null && `${Math.abs(tendencia.cambio7d).toFixed(1)}${trendUnit}/7d`}
            </span>
          )}
        </div>
      </div>

      {(unit || date) && (
        <p className="text-slate-400 text-xs xl:text-sm font-medium">
          {unit}
          {unit && date && " · "}
          {date && `Dato: ${date}`}
        </p>
      )}

      {/* Barra de progreso con degradado — solo cuando el valor es un porcentaje real */}
      {progressPct != null && (
        <div>
          <div className="w-full h-1.5 rounded-full bg-theme-tertiary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #FCD34D, #92400E)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPct, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 leading-none mt-0.5">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
}
