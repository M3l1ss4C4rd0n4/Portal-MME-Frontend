"use client";

import { useRef, useState } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  /** Valores por defecto — si valueMin/valueMax coinciden con estos, se oculta "Restablecer". */
  defaultMin?: number;
  defaultMax?: number;
  step?: number;
  /** Marcas de referencia bajo la pista (por defecto: min y max). */
  ticks?: number[];
  label?: string;
  formatValue?: (v: number) => string;
}

/**
 * Slider de rango de doble thumb — dos <input type="range"> nativos
 * superpuestos (opacity 0) sobre una pista dibujada a mano. Extraído de
 * YearRangeSlider (src/app/(dashboards)/supervision/page.tsx) para
 * reutilizarlo en otros tableros con el mismo estilo visual (thumb dorado,
 * pista ámbar) del portal.
 */
export function RangeSlider({
  min, max, valueMin, valueMax, onChange,
  defaultMin, defaultMax, step = 1, ticks, label,
  formatValue = (v) => String(v),
}: RangeSliderProps) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const isDefault = defaultMin !== undefined && defaultMax !== undefined
    && valueMin === defaultMin && valueMax === defaultMax;
  const displayTicks = ticks ?? [min, max];
  const trackRef = useRef<HTMLDivElement>(null);
  const [minOnTop, setMinOnTop] = useState(false);

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const cursor = min + ((e.clientX - rect.left) / rect.width) * (max - min);
    setMinOnTop(Math.abs(cursor - valueMin) <= Math.abs(cursor - valueMax));
  };

  return (
    <div className="px-1 mb-5">
      <div className="flex items-center gap-3 mb-2">
        {label && <span className="text-[10px] text-gold/70 uppercase tracking-widest font-bold">{label}</span>}
        <span className="font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {formatValue(valueMin)}
        </span>
        <div className="flex-1 h-px bg-amber-500/20" />
        <span className="font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {formatValue(valueMax)}
        </span>
        {!isDefault && defaultMin !== undefined && defaultMax !== undefined && (
          <button
            onClick={() => onChange(defaultMin, defaultMax)}
            className="text-[10px] text-theme-muted hover:text-red-400 transition-colors"
          >
            ✕ Restablecer
          </button>
        )}
      </div>
      <div ref={trackRef} className="relative h-7 flex items-center mx-1" onMouseMove={handleTrackMouseMove}>
        <div className="absolute w-full h-1.5 bg-theme-tertiary rounded-full pointer-events-none" />
        <div
          className="absolute h-1.5 bg-amber-500/70 rounded-full pointer-events-none"
          style={{ left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%` }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 shadow pointer-events-none ring-2 ring-amber-400/30"
          style={{ left: `calc(${pct(valueMin)}% - 7px)` }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 shadow pointer-events-none ring-2 ring-amber-400/30"
          style={{ left: `calc(${pct(valueMax)}% - 7px)` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMin}
          onChange={(e) => onChange(Math.min(+e.target.value, valueMax - step), valueMax)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: minOnTop ? 5 : 3 }}
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(+e.target.value, valueMin + step))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: minOnTop ? 3 : 5 }}
        />
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        {displayTicks.map((t) => (
          <span key={t} className="text-[8px] text-theme-muted/60">{formatValue(t)}</span>
        ))}
      </div>
    </div>
  );
}
