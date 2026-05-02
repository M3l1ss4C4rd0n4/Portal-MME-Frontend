"use client";

export interface MetricaTendencia {
  direccion: "alta" | "baja" | "estable" | "desconocida";
  cambio7d: number | null;
  label: "ALTA" | "BAJA" | "ESTABLE" | "S/D";
}

// Colores base: ALTA=verde, BAJA=rojo, ESTABLE=gris
// Para PRECIO la lógica se invierte: bajar es bueno (verde), subir es malo (naranja)
const CFG = {
  ALTA:    { color: "#22C55E", icon: "↑" },
  BAJA:    { color: "#EF4444", icon: "↓" },
  ESTABLE: { color: "#94A3B8", icon: "→" },
} as const;

export function getTrendColor(
  tendencia: MetricaTendencia,
  metrica: string,
): string {
  const base = CFG[tendencia.label as keyof typeof CFG]?.color ?? CFG.ESTABLE.color;
  if (metrica === "precio") {
    if (tendencia.label === "ALTA") return "#F97316";
    if (tendencia.label === "BAJA") return "#22C55E";
  }
  return base;
}

export function TrendArrow({
  tendencia,
  metrica = "valor",
}: {
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
}) {
  if (!tendencia || tendencia.label === "S/D") return null;
  const icon = CFG[tendencia.label as keyof typeof CFG]?.icon ?? CFG.ESTABLE.icon;
  return (
    <span style={{ color: getTrendColor(tendencia, metrica) }}>{icon}</span>
  );
}

export function TrendBadge({
  tendencia,
  metrica = "valor",
  size = "sm",
}: {
  tendencia?: MetricaTendencia | null;
  metrica?: "precio" | "generacion" | "embalses" | "aportes" | "valor";
  size?: "sm" | "md";
}) {
  if (!tendencia || tendencia.label === "S/D") return null;

  const color = getTrendColor(tendencia, metrica);
  const icon = CFG[tendencia.label as keyof typeof CFG]?.icon ?? CFG.ESTABLE.icon;
  const cambioAbs = tendencia.cambio7d !== null ? Math.abs(tendencia.cambio7d) : null;
  const unidad = (metrica === "embalses" || metrica === "aportes") ? "pp" : "%";
  const textSize = size === "md" ? "text-[10px] xl:text-[11px]" : "text-[9px] xl:text-[10px]";

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${textSize}`}
      style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
      title="Tendencia vs media últimos 7 días"
    >
      <span className="text-[11px] leading-none">{icon}</span>
      <span>{tendencia.label}</span>
      {cambioAbs !== null && (
        <span className="opacity-70">{cambioAbs.toFixed(1)}{unidad}/7d</span>
      )}
    </div>
  );
}
