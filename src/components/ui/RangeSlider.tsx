"use client";

import { useRef } from "react";

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
  const asaActiva = useRef<"min" | "max" | null>(null);

  // El arrastre se resuelve aquí (eventos de puntero) y no con los <input>
  // nativos: en pantallas táctiles no hay "mousemove" previo, así que el input
  // de la fecha final quedaba siempre encima y el dedo nunca alcanzaba el inicio.
  const valorEn = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return valueMin;
    const razon = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const crudo = min + razon * (max - min);
    return Math.min(max, Math.max(min, Math.round((crudo - min) / step) * step + min));
  };

  const mover = (asa: "min" | "max", valor: number) => {
    if (asa === "min") onChange(Math.min(valor, valueMax - step), valueMax);
    else onChange(valueMin, Math.max(valor, valueMin + step));
  };

  const alPresionar = (e: React.PointerEvent<HTMLDivElement>) => {
    const valor = valorEn(e.clientX);
    const asa = valueMin === valueMax
      ? (valor < valueMin ? "min" : "max")
      : Math.abs(valor - valueMin) <= Math.abs(valor - valueMax) ? "min" : "max";
    asaActiva.current = asa;
    e.currentTarget.setPointerCapture(e.pointerId);
    mover(asa, valor);
  };

  const alArrastrar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (asaActiva.current) mover(asaActiva.current, valorEn(e.clientX));
  };

  const alSoltar = () => { asaActiva.current = null; };

  return (
    <div className="px-1 mb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
        {label && <span className="text-[10px] text-gold/70 uppercase tracking-widest font-bold">{label}</span>}
        <span className="whitespace-nowrap font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {formatValue(valueMin)}
        </span>
        <div className="h-px min-w-4 flex-1 bg-amber-500/20 max-sm:hidden" />
        <span className="whitespace-nowrap font-mono text-gold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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
      <div
        ref={trackRef}
        className="relative mx-1 flex h-11 touch-pan-y items-center lg:h-7"
        onPointerDown={alPresionar}
        onPointerMove={alArrastrar}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
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
          aria-label="Inicio del período"
          className="pointer-events-none absolute inset-0 w-full opacity-0"
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(+e.target.value, valueMin + step))}
          aria-label="Fin del período"
          className="pointer-events-none absolute inset-0 w-full opacity-0"
        />
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        {displayTicks.map((t, i) => (
          <span
            key={t}
            className={`whitespace-nowrap text-[8px] text-theme-muted/60 ${i > 0 && i < displayTicks.length - 1 ? "max-sm:hidden" : ""}`}
          >
            {formatValue(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
