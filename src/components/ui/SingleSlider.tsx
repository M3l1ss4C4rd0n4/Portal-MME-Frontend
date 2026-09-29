"use client";

interface SingleSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  label?: string;
  formatValue?: (v: number) => string;
}

/**
 * Slider de un solo valor — mismo lenguaje visual (thumb dorado, pista ámbar)
 * que RangeSlider, para controles donde solo hace falta un extremo (p. ej.
 * "cuántos proyectos incluir" en el simulador contrafactual).
 */
export function SingleSlider({
  min, max, value, onChange, step = 1, label,
  formatValue = (v) => String(v),
}: SingleSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="px-1 mb-5">
      <div className="flex items-center gap-3 mb-2">
        {label && <span className="text-[10px] text-gold/70 uppercase tracking-widest font-bold">{label}</span>}
        <span className="font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative h-7 flex items-center mx-1">
        <div className="absolute w-full h-1.5 bg-theme-tertiary rounded-full pointer-events-none" />
        <div
          className="absolute h-1.5 bg-amber-500/70 rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 shadow pointer-events-none ring-2 ring-amber-400/30"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[8px] text-theme-muted/60">{formatValue(min)}</span>
        <span className="text-[8px] text-theme-muted/60">{formatValue(max)}</span>
      </div>
    </div>
  );
}
