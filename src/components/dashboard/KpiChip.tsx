"use client";

export interface KpiChipProps {
  label: string;
  value: string | number;
  accent?: boolean;
  colorClass?: string;
  color?: string;
  subvalue?: string;
  pct?: string;
  note?: string;
  avg?: string;
  avgLabel?: string;
  dynamicSize?: boolean;
  valueSize?: "base" | "lg" | "sm";
  padding?: "sm" | "md" | "lg";
  container?: "chip" | "surface";
  centered?: boolean;
  className?: string;
}

export default function KpiChip({
  label,
  value,
  accent = false,
  colorClass,
  color,
  subvalue,
  pct,
  note,
  avg,
  avgLabel,
  dynamicSize = false,
  valueSize = "base",
  padding = "sm",
  container = "chip",
  centered = false,
  className = "",
}: KpiChipProps) {
  const containerClass =
    container === "surface" ? "bg-theme-secondary border border-theme-primary rounded-xl" : "bg-dash-chip rounded-xl";
  const paddingClass =
    padding === "lg" ? "px-4 py-3" : padding === "md" ? "px-3 py-3 hover:bg-dash-chip/80 transition-colors" : "px-3 py-2.5";

  const strLen = String(value).length;
  const dynamicFontClass = strLen <= 8 ? "text-xl" : strLen <= 13 ? "text-base" : "text-sm";
  const staticFontClass = valueSize === "lg" ? "text-lg" : valueSize === "sm" ? "text-2xs" : "text-base";
  const valueFontClass = dynamicSize ? dynamicFontClass : staticFontClass;
  const valueLeadingClass = dynamicSize ? "leading-tight break-all" : centered ? "" : "leading-none";
  const valueColorClass = color ? "" : (colorClass ?? (accent ? "text-gold" : "text-theme-primary"));

  const labelSizeClass = dynamicSize ? "text-2xs" : "text-3xs";
  const labelMarginClass = dynamicSize ? "mt-1.5" : padding === "md" ? "mt-0.5" : "mt-1";

  return (
    <div
      className={`${containerClass} ${paddingClass} ${centered ? "text-center min-w-[110px]" : ""} ${className}`}
    >
      <div className={`${valueFontClass} font-bold ${valueLeadingClass} ${valueColorClass}`} style={color ? { color } : undefined}>
        {value}
      </div>
      {pct && <div className="text-4xs text-theme-muted/70 mt-0.5 leading-none">{pct}</div>}
      {subvalue && <div className={`text-4xs mt-0.5 ${accent ? "text-gold/70" : "text-theme-muted"}`}>{subvalue}</div>}
      <div className={`${labelSizeClass} text-theme-muted ${labelMarginClass} leading-tight`}>{label}</div>
      {note && <div className="text-5xs text-gold/50 mt-0.5 leading-tight">{note}</div>}
      {avg && (
        <div className="mt-2 pt-2 border-t border-white/[0.07] flex items-baseline gap-1">
          <span className="text-3xs font-bold text-gold/90 leading-none">{avg}</span>
          <span className="text-4xs text-theme-muted leading-none">{avgLabel ?? "/ CE"}</span>
        </div>
      )}
    </div>
  );
}
