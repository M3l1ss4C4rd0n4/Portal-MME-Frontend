"use client";

import { useState } from "react";
import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import { useIsNarrow } from "@/hooks/useIsNarrow";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { TooltipSeguro } from "@/components/ui/TooltipSeguro";

export type AvanceProyectoFila = {
  nombre: string;
  "Av. General": number;
  "Av. Financiero": number;
  "Av. Físico": number;
};

const CLAVES = ["Av. General", "Av. Financiero", "Av. Físico"] as const;
type Clave = (typeof CLAVES)[number];

const SERIES: ReadonlyArray<{ clave: Clave; etiqueta: string; color: string }> = [
  { clave: "Av. General", etiqueta: "Avance Documental", color: "#F59E0B" },
  { clave: "Av. Financiero", etiqueta: "Avance Financiero", color: "#8B5CF6" },
  { clave: "Av. Físico", etiqueta: "Avance Físico", color: "#10B981" },
];
const COLORES = SERIES.map((s) => s.color);
const ETIQUETA_POR_CLAVE = Object.fromEntries(SERIES.map((s) => [s.clave, s.etiqueta]));

/** Proyectos visibles a la vez en pantallas angostas: con más, las barras no se leen. */
const VENTANA_MOVIL = 6;
const ALTO_ESCRITORIO_PX = 520;
const ALTO_POR_PROYECTO_MOVIL_PX = 62;
const LARGO_NOMBRE_MOVIL = 16;

const recortar = (texto: string, largo: number): string =>
  texto.length > largo ? `${texto.slice(0, largo - 1)}…` : texto;

interface Props {
  data: AvanceProyectoFila[];
}

const CAPAS_MOVIL = ["grid", "axes", "bars", EtiquetasAlFinal] as const;

/** Etiqueta de valor al final de cada barra (horizontal): cabe aunque la barra sea corta. */
function EtiquetasAlFinal({ bars }: BarCustomLayerProps<AvanceProyectoFila>) {
  return (
    <g>
      {bars.map((barra) => (
        <text
          key={barra.key}
          x={barra.x + barra.width + 4}
          y={barra.y + barra.height / 2}
          dominantBaseline="central"
          fontSize={10}
          fontWeight={700}
          className="fill-current text-theme-primary"
        >
          {`${barra.data.value}%`}
        </text>
      ))}
    </g>
  );
}

/**
 * Avance por proyecto (documental, financiero, físico) con filtro de proyectos
 * (deslizador + flechas). En el celular se dibuja horizontal, con pocos proyectos a la vez,
 * para que las barras y sus etiquetas se lean sin apilarse.
 */
export default function AvancePorProyectoChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const theme = getNivoTheme(isDark);
  const isNarrow = useIsNarrow();

  const ultimo = Math.max(0, data.length - 1);
  const [rango, setRango] = useState<{ desde: number; hasta: number } | null>(null);
  const porDefecto = { desde: 0, hasta: isNarrow ? Math.min(ultimo, VENTANA_MOVIL - 1) : ultimo };
  const desde = Math.min(rango?.desde ?? porDefecto.desde, ultimo);
  const hasta = Math.min(rango?.hasta ?? porDefecto.hasta, ultimo);
  const visibles = data.slice(desde, hasta + 1);
  const esTodo = desde === 0 && hasta === ultimo;
  const tamano = hasta - desde + 1;

  const irA = (nuevoDesde: number) => {
    const inicio = Math.max(0, Math.min(nuevoDesde, ultimo - (tamano - 1)));
    setRango({ desde: inicio, hasta: inicio + tamano - 1 });
  };

  const boton =
    "min-h-9 rounded-full border px-3 text-[11px] font-semibold transition-colors max-sm:min-h-11 border-white/10 text-theme-muted hover:text-theme-primary disabled:opacity-40";

  return (
    <div>
      {data.length > 1 && (
        <div className="mb-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" className={boton} disabled={desde === 0} onClick={() => irA(desde - tamano)} aria-label="Proyectos anteriores">
              ‹ Anteriores
            </button>
            <button type="button" className={boton} disabled={hasta === ultimo} onClick={() => irA(desde + tamano)} aria-label="Proyectos siguientes">
              Siguientes ›
            </button>
            <button type="button" className={boton} disabled={esTodo} onClick={() => setRango({ desde: 0, hasta: ultimo })}>
              Todos
            </button>
          </div>
          <RangeSlider
            min={0}
            max={ultimo}
            valueMin={desde}
            valueMax={hasta}
            onChange={(a, b) => setRango({ desde: a, hasta: b })}
            defaultMin={0}
            defaultMax={ultimo}
            ticks={[0, ultimo]}
            formatValue={(i) => `N.º ${Math.min(i, ultimo) + 1}`}
            label="PROYECTOS"
          />
          <p className="mt-1 text-[10px] text-theme-muted">
            Mostrando {tamano} de {data.length} proyectos, ordenados de mayor a menor avance documental.
          </p>
        </div>
      )}

      <div style={{ height: isNarrow ? visibles.length * ALTO_POR_PROYECTO_MOVIL_PX + 36 : ALTO_ESCRITORIO_PX }}>
        <ResponsiveBar
          data={visibles}
          keys={[...CLAVES]}
          indexBy="nombre"
          theme={{ ...theme, labels: { text: { fontSize: 10, fontWeight: 700 } } }}
          groupMode="grouped"
          layout={isNarrow ? "horizontal" : "vertical"}
          margin={isNarrow ? { top: 4, right: 44, bottom: 28, left: 104 } : { top: 8, right: 20, bottom: 110, left: 55 }}
          valueScale={{ type: "linear", min: 0, max: 100 }}
          indexScale={{ type: "band", round: true }}
          colors={COLORES}
          borderRadius={3}
          padding={isNarrow ? 0.25 : 0.2}
          innerPadding={2}
          enableLabel={!isNarrow}
          layers={isNarrow ? [...CAPAS_MOVIL] : undefined}
          label={(d) => `${d.value}%`}
          labelSkipWidth={isNarrow ? 30 : 26}
          labelSkipHeight={isNarrow ? 11 : 16}
          labelTextColor={{ from: "color", modifiers: [["darker", 2.4]] }}
          enableGridY={!isNarrow}
          enableGridX={isNarrow}
          axisTop={null}
          axisRight={null}
          axisLeft={
            isNarrow
              ? { tickSize: 0, tickPadding: 6, format: (v) => recortar(String(v), LARGO_NOMBRE_MOVIL) }
              : { tickSize: 0, tickPadding: 6, format: (v) => `${v}%` }
          }
          axisBottom={
            isNarrow
              ? { tickSize: 0, tickPadding: 6, tickValues: [0, 25, 50, 75, 100], format: (v) => `${v}%` }
              : { tickSize: 0, tickPadding: 8, tickRotation: -45 }
          }
          tooltip={({ id, value, indexValue }) => (
            <TooltipSeguro
              style={{
                padding: "8px 12px",
                background: isDark ? "#1E293B" : "#FFFFFF",
                border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                borderRadius: 8,
                color: isDark ? "#E2E8F0" : "#0F172A",
                fontSize: 12,
              }}
            >
              <strong>{indexValue}</strong>
              <br />
              {ETIQUETA_POR_CLAVE[String(id)] ?? id}: <strong style={{ color: "#F59E0B" }}>{value}%</strong>
            </TooltipSeguro>
          )}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {SERIES.map(({ etiqueta, color }) => (
          <div key={etiqueta} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            <span className="text-[10px] text-theme-muted">{etiqueta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
