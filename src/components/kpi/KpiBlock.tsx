"use client";

import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { StatusChip } from "./StatusChip";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface KpiBlockProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  date?: string | null;
  valueClass?: string;
  large?: boolean;
  chipLabel?: string;
  chipColor?: string;
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  /** Contenido del tooltip informativo (ReactNode para formato rico) */
  tooltip?: React.ReactNode;
}

export function KpiBlock({
  label, value, unit, date, valueClass = "text-gold", large = false,
  chipLabel, chipColor, tendencia, metrica, tooltip,
}: KpiBlockProps) {
  const strLen = typeof value === "string" || typeof value === "number" ? String(value).length : 12;
  let fontClass: string;

  if (strLen <= 8) {
    fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";
  } else if (strLen <= 12) {
    fontClass = "text-3xl xl:text-4xl 2xl:text-5xl";
  } else if (strLen <= 18) {
    fontClass = "text-2xl xl:text-3xl 2xl:text-4xl";
  } else {
    fontClass = "text-lg xl:text-xl 2xl:text-2xl";
  }

  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-4">
      <p className="text-slate-400 text-lg xl:text-xl 2xl:text-2xl uppercase tracking-[0.2em] font-medium inline-flex items-center gap-0.5">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </p>
      <div
        className={`inline-flex items-center gap-2 font-black leading-none break-all ${valueClass} ${fontClass}`}
        style={tendencia && tendencia.label !== "S/D" ? { color: getTrendColor(tendencia, metrica ?? "valor") } : undefined}
      >
        {value}
        <TrendArrow tendencia={tendencia} metrica={metrica} />
      </div>
      {(unit || date) && (
        <p className="text-slate-400 text-xs xl:text-sm 2xl:text-base mt-0.5">
          {unit}
          {unit && date && " · "}
          {date && `Dato: ${date}`}
        </p>
      )}
      <TrendBadge tendencia={tendencia} metrica={metrica} />
      {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} />}
    </div>
  );
}
