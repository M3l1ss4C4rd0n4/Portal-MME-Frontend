"use client";

import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import { StatusChip } from "./StatusChip";

interface HydroKpiBlockProps {
  label: string;
  pct: number;
  pctColor: string;
  gwh?: number | null;
  gwhRef?: number | null;
  gwhRefLabel?: string;
  dailyGwh?: number | null;
  dailyHistGwh?: number | null;
  date?: string | null;
  chipLabel?: string;
  chipColor?: string;
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
}

export function HydroKpiBlock({
  label, pct, pctColor,
  gwh, gwhRef, gwhRefLabel,
  dailyGwh, dailyHistGwh,
  date, chipLabel, chipColor, tendencia, metrica,
}: HydroKpiBlockProps) {
  const fmt = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  const fontClass = "text-4xl xl:text-5xl 2xl:text-6xl";

  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-3">
      <p className="text-slate-400 text-base xl:text-lg 2xl:text-xl uppercase tracking-[0.18em] font-medium">
        {label}
      </p>
      <div
        className={`inline-flex items-center gap-2 ${fontClass} font-black leading-none ${pctColor}`}
        style={tendencia && tendencia.label !== "S/D" ? { color: getTrendColor(tendencia, metrica ?? "valor") } : undefined}
      >
        {pct.toFixed(2)}%
        <TrendArrow tendencia={tendencia} metrica={metrica} />
      </div>
      {gwh != null && (
        <p className="text-slate-300 text-xs xl:text-sm font-semibold mt-0.5">
          {fmt(gwh)} GWh
          {gwhRef != null && (
            <span className="text-slate-500 font-normal"> · {gwhRefLabel ?? "ref."} {fmt(gwhRef)} GWh</span>
          )}
        </p>
      )}
      {dailyGwh != null ? (
        <p className="text-slate-500 text-[10px] xl:text-xs">
          {date ?? "hoy"}: {fmt(dailyGwh)} GWh
          {dailyHistGwh != null && (
            <span className="text-slate-600"> · media {fmt(dailyHistGwh)} GWh</span>
          )}
        </p>
      ) : (
        date && <p className="text-slate-500 text-[10px] xl:text-xs">{date}</p>
      )}
      <TrendBadge tendencia={tendencia} metrica={metrica} />
      {chipLabel && chipColor && <StatusChip label={chipLabel} color={chipColor} />}
    </div>
  );
}
