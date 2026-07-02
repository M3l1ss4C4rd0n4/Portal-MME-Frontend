"use client";

import { useTheme } from "@/providers/ThemeProvider";

export interface MetricaTendencia {
  direccion: "alta" | "baja" | "estable" | "desconocida";
  cambio7d: number | null;
  label: "ALTA" | "BAJA" | "ESTABLE" | "S/D";
}

const CFG = {
  ALTA:    { color: "#22C55E", icon: "↑" },
  BAJA:    { color: "#EF4444", icon: "↓" },
  ESTABLE: { icon: "→" },
} as const;

// ESTABLE usa colores separados por tema — el gris claro solo funciona en fondo oscuro
const ESTABLE_DARK  = "#94A3B8";
const ESTABLE_LIGHT = "#475569";

export function getTrendColor(
  tendencia: MetricaTendencia,
  metrica: string,
  isDark = true,
): string {
  const estable = isDark ? ESTABLE_DARK : ESTABLE_LIGHT;
  let base: string;
  if (tendencia.label === "ESTABLE") {
    base = estable;
  } else {
    base = (CFG[tendencia.label as keyof typeof CFG] as { color?: string })?.color ?? estable;
  }
  if (metrica === "precio") {
    if (tendencia.label === "ALTA") return "#F97316";
    if (tendencia.label === "BAJA") return "#22C55E";
  }
  return base;
}

export function TrendArrow({
  tendencia,
  metrica = "valor",
  trendTitle,
}: {
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  trendTitle?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  if (!tendencia || tendencia.label === "S/D") return null;
  const icon = tendencia.label === "ESTABLE" ? CFG.ESTABLE.icon
    : (CFG[tendencia.label as keyof typeof CFG] as { icon: string })?.icon ?? CFG.ESTABLE.icon;
  return (
    <span style={{ color: getTrendColor(tendencia, metrica, isDark) }} title={trendTitle}>{icon}</span>
  );
}

export function TrendBadge({
  tendencia,
  metrica = "valor",
  size = "sm",
  title,
}: {
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  size?: "sm" | "md";
  title?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  if (!tendencia || tendencia.label === "S/D") return null;

  const color = getTrendColor(tendencia, metrica, isDark);
  const icon = tendencia.label === "ESTABLE" ? CFG.ESTABLE.icon
    : (CFG[tendencia.label as keyof typeof CFG] as { icon: string })?.icon ?? CFG.ESTABLE.icon;
  const cambioAbs = tendencia.cambio7d !== null ? Math.abs(tendencia.cambio7d) : null;
  const unidad = (metrica === "embalses" || metrica === "aportes") ? "pp" : "%";
  const textSize = size === "md" ? "text-[10px] xl:text-[11px]" : "text-[9px] xl:text-[10px]";

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${textSize}`}
      style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
      title={title ?? "Tendencia vs media últimos 7 días"}
    >
      <span className="text-[11px] leading-none">{icon}</span>
      <span>{tendencia.label}</span>
      {cambioAbs !== null && (
        <span className="opacity-70">{cambioAbs.toFixed(1)}{unidad}/7d</span>
      )}
    </div>
  );
}
