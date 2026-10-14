"use client";

import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import { fmtCompactNum, fmtNum } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";

/**
 * Gráfico combinado de columnas + línea con eje secundario.
 *
 * Replica el visual "columnas y línea" que el Informe de Metodología §12.4
 * describe para "Agentes por año": las columnas muestran la cantidad por
 * periodo y la línea la evolución acumulada.
 *
 * Nivo no trae un visual combinado, así que la línea se dibuja como capa
 * personalizada (`layers`) sobre ResponsiveBar, con su propia escala y su eje
 * a la derecha — no se reescala contra el eje de las columnas, que daría una
 * lectura falsa de la magnitud.
 */

export interface BarLinePunto {
  // Índice de cadena requerido por `BarDatum` de Nivo; sin él, ResponsiveBar
  // rechaza el tipo en tiempo de compilación.
  [clave: string]: string | number;
  etiqueta: string;
  barra: number;
  linea: number;
}

interface Props {
  data: BarLinePunto[];
  isDark: boolean;
  colorBarra?: string;
  colorLinea?: string;
  leyendaBarra: string;
  leyendaLinea: string;
  alto?: number;
}

export default function BarLineChart({
  data,
  isDark,
  colorBarra = "#D97706",
  colorLinea = "#06B6D4",
  leyendaBarra,
  leyendaLinea,
  alto = 300,
}: Props) {
  const T = getNivoTheme(isDark);

  if (!data.length) {
    return (
      <div style={{ height: alto }} className="flex items-center justify-center text-theme-muted text-sm">
        Sin datos
      </div>
    );
  }

  const maxLinea = Math.max(...data.map((d) => d.linea), 1);
  const colorEje = isDark ? "#94A3B8" : "#475569";

  /** Capa de la línea acumulada + su eje derecho. */
  const capaLinea = ({ bars, innerWidth, innerHeight }: BarCustomLayerProps<BarLinePunto>) => {
    if (!bars.length) return null;

    const puntos = bars.map((bar) => ({
      x: bar.x + bar.width / 2,
      y: innerHeight - (Number(bar.data.data.linea) / maxLinea) * innerHeight,
    }));
    const path = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const ticks = [0, 0.25, 0.5, 0.75, 1];

    return (
      <g>
        {/* eje derecho (acumulado) */}
        {ticks.map((t) => (
          <g key={t} transform={`translate(${innerWidth}, ${innerHeight - t * innerHeight})`}>
            <line x1={0} x2={5} stroke={colorEje} strokeWidth={1} />
            <text x={9} dy={3} fontSize={10} fill={colorEje}>
              {fmtCompactNum(maxLinea * t)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={colorLinea} strokeWidth={2.5} strokeLinejoin="round" />
        {puntos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={colorLinea} />
        ))}
      </g>
    );
  };

  return (
    <div style={{ height: alto }}>
      <ResponsiveBar<BarLinePunto>
        data={data}
        theme={T}
        keys={["barra"]}
        indexBy="etiqueta"
        margin={{ top: 24, right: 62, bottom: 44, left: 56 }}
        padding={0.25}
        colors={[colorBarra]}
        enableLabel={false}
        enableGridX={false}
        axisTop={null}
        axisRight={null}
        axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: data.length > 12 ? -45 : 0 }}
        axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtCompactNum(Number(v)) }}
        layers={["grid", "axes", "bars", capaLinea, "markers", "annotations"]}
        tooltip={({ data: d }) => (
          <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
            <p className="font-semibold text-sm">{d.etiqueta}</p>
            <p className="mt-0.5">
              {leyendaBarra}: <strong style={{ color: colorBarra }}>{fmtNum(d.barra)}</strong>
            </p>
            <p>
              {leyendaLinea}: <strong style={{ color: colorLinea }}>{fmtNum(d.linea)}</strong>
            </p>
          </div>
        )}
      />
      <div className="flex items-center justify-center gap-4 text-[10px] text-theme-muted -mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorBarra }} />
          {leyendaBarra}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded" style={{ background: colorLinea }} />
          {leyendaLinea} (eje derecho)
        </span>
      </div>
    </div>
  );
}
