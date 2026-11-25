"use client";

import { useMemo, useState } from "react";
import { RangeSlider } from "@/components/ui/RangeSlider";
import PredictionLineChart from "@/components/predictions/PredictionLineChart";
import type { PredictionPoint } from "@/types/predictions";

interface Props {
  prediccion: PredictionPoint[];
  height: number;
  peakDate?: string;
  threshold80Date?: string;
}

const ATAJOS: ReadonlyArray<{ etiqueta: string; dias: number | null }> = [
  { etiqueta: "30 días", dias: 30 },
  { etiqueta: "90 días", dias: 90 },
  { etiqueta: "6 meses", dias: 180 },
  { etiqueta: "Todo", dias: null },
];

const formatoCorto = (fecha: string): string =>
  new Date(`${fecha}T00:00:00`)
    .toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" })
    .replace(/\./g, "");

/**
 * Proyección de embalses con filtro de período (deslizador + atajos + fechas
 * «Desde/Hasta»), para poder leer un tramo corto en pantallas pequeñas.
 */
export default function ProyeccionConFiltro({ prediccion, height, peakDate, threshold80Date }: Props) {
  const ultimo = Math.max(0, prediccion.length - 1);
  const [rango, setRango] = useState<{ desde: number; hasta: number } | null>(null);
  const desde = Math.min(rango?.desde ?? 0, ultimo);
  const hasta = Math.min(rango?.hasta ?? ultimo, ultimo);

  const visibles = useMemo(() => prediccion.slice(desde, hasta + 1), [prediccion, desde, hasta]);
  const esTodo = desde === 0 && hasta === ultimo;

  const indiceDesdeFecha = (valor: string, lado: "desde" | "hasta"): number => {
    if (lado === "desde") {
      const i = prediccion.findIndex((p) => p.fecha >= valor);
      return i === -1 ? ultimo : i;
    }
    for (let i = ultimo; i >= 0; i--) if (prediccion[i].fecha <= valor) return i;
    return 0;
  };

  if (prediccion.length < 2) return <PredictionLineChart data={prediccion} height={height} peakDate={peakDate} threshold80Date={threshold80Date} />;

  const fechaMin = prediccion[0].fecha;
  const fechaMax = prediccion[ultimo].fecha;
  const claseFecha =
    "bg-theme-tertiary text-theme-primary text-[10px] rounded px-1.5 py-0.5 max-sm:min-h-[44px] border border-white/10";

  return (
    <div>
      <div className="mb-2 grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {ATAJOS.map(({ etiqueta, dias }) => {
          const hastaAtajo = dias === null ? ultimo : Math.min(ultimo, dias - 1);
          const activo = desde === 0 && hasta === hastaAtajo;
          return (
            <button
              key={etiqueta}
              type="button"
              onClick={() => setRango({ desde: 0, hasta: hastaAtajo })}
              aria-pressed={activo}
              className={`min-h-9 rounded-full border px-1 text-[11px] sm:px-3 font-semibold transition-colors max-sm:min-h-11 ${
                activo
                  ? "border-amber-500/60 bg-amber-500/15 text-gold"
                  : "border-white/10 text-theme-muted hover:text-theme-primary"
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      <RangeSlider
        min={0}
        max={ultimo}
        valueMin={desde}
        valueMax={hasta}
        onChange={(a, b) => setRango({ desde: a, hasta: b })}
        defaultMin={0}
        defaultMax={ultimo}
        ticks={[0, Math.round(ultimo / 2), ultimo]}
        formatValue={(i) => formatoCorto(prediccion[Math.min(i, ultimo)].fecha)}
        label="PERÍODO"
      />

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[10px] text-theme-muted">
          Desde
          <input
            type="date"
            value={prediccion[desde].fecha}
            min={fechaMin}
            max={prediccion[hasta].fecha}
            onChange={(e) => e.target.value && setRango({ desde: indiceDesdeFecha(e.target.value, "desde"), hasta })}
            className={claseFecha}
          />
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-theme-muted">
          Hasta
          <input
            type="date"
            value={prediccion[hasta].fecha}
            min={prediccion[desde].fecha}
            max={fechaMax}
            onChange={(e) => e.target.value && setRango({ desde, hasta: indiceDesdeFecha(e.target.value, "hasta") })}
            className={claseFecha}
          />
        </label>
        <span className="text-[10px] text-theme-muted">
          {visibles.length} {visibles.length === 1 ? "día" : "días"}{esTodo ? "" : " elegidos"}
        </span>
      </div>

      <PredictionLineChart
        data={visibles}
        height={height}
        peakDate={peakDate}
        threshold80Date={threshold80Date}
      />
    </div>
  );
}
