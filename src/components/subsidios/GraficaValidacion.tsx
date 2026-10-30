"use client";

import { ResponsiveBar, type BarCustomLayerProps, type BarTooltipProps } from "@nivo/bar";
import { fmtCompactNum, fmtNum } from "@/lib/format";
import type { PuntoValidacion } from "@/types/subsidios-empresas";

/** Estados en el orden en que se apilan y se leen en la leyenda. */
export const ESTADOS = ["VF", "VP", "VI", "VI SP", "Otros"] as const;

type Estado = (typeof ESTADOS)[number];

/** VF cierra el ciclo, VI apenas lo abre: la escala de color va de ahí. */
export const COLOR_ESTADO: Record<Estado, string> = {
  VF: "#10B981",
  VP: "#F59E0B",
  VI: "#3B82F6",
  "VI SP": "#8B5CF6",
  Otros: "#64748B",
};

/** Qué significa cada sigla, para que el tooltip no obligue a saberlo. */
const GLOSARIO: Record<Estado, string> = {
  VF: "Validación final",
  VP: "Validación parcial",
  VI: "Validación inicial",
  "VI SP": "Validación inicial · saldos pendientes",
  Otros: "Sin clasificar en los cuatro estados",
};

const FONDO_LARGO: Record<string, string> = {
  FOES: "Fondo de Energía Social",
  FSSRI: "Fondo de Solidaridad para Subsidios y Redistribución de Ingresos",
};

/**
 * A partir de cuántas barras se dejan de escribir los fondos sobre ellas.
 *
 * Con el período completo son 51 trimestres por dos fondos: las etiquetas se
 * pisan unas a otras y estorban más de lo que explican. El deslizador de
 * período es el que deja ver menos.
 */
const MAX_ETIQUETAS = 28;

type Fila = PuntoValidacion & Record<string, string | number>;

/**
 * Capa que escribe el fondo encima de cada grupo de barras.
 *
 * Es una capa propia y no la etiqueta de Nivo porque la etiqueta se pinta una
 * vez por barra —hasta cinco por grupo, todas con el mismo texto— y además
 * dentro de la barra, que es donde no se lee.
 */
function CapaFondo({ bars }: BarCustomLayerProps<Fila>) {
  const grupos = new Map<string, { x1: number; x2: number; y: number; fondo: string }>();
  for (const bar of bars) {
    if (bar.height <= 0) continue;
    const fondo = String((bar.data.data as Fila).fondo ?? "");
    const previo = grupos.get(bar.data.indexValue as string);
    grupos.set(bar.data.indexValue as string, {
      x1: Math.min(previo?.x1 ?? bar.x, bar.x),
      x2: Math.max(previo?.x2 ?? bar.x + bar.width, bar.x + bar.width),
      y: Math.min(previo?.y ?? bar.y, bar.y),
      fondo,
    });
  }
  if (grupos.size === 0 || grupos.size > MAX_ETIQUETAS) return null;

  return (
    <g>
      {[...grupos.entries()].map(([clave, g]) => (
        <text
          key={clave}
          x={(g.x1 + g.x2) / 2}
          y={g.y - 6}
          textAnchor="middle"
          style={{ fontSize: 9, fontWeight: 600, fill: "#94A3B8", pointerEvents: "none" }}
        >
          {g.fondo}
        </text>
      ))}
    </g>
  );
}

/** Tooltip con el período, el fondo, qué significa el estado y cuánto pesa. */
function Tooltip({ id, value, color, data }: BarTooltipProps<Fila>) {
  const estado = String(id) as Estado;
  const fila = data as Fila;
  const total = ESTADOS.reduce((a, e) => a + Number(fila[e] ?? 0), 0);
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="bg-theme-primary border border-theme-card rounded-lg shadow-2xl px-3 py-2 text-xs max-w-[280px]">
      <div className="font-semibold text-theme-primary">{fila.periodo}</div>
      <div className="text-[10px] text-theme-muted mb-2">
        {fila.fondo} — {FONDO_LARGO[fila.fondo] ?? "fondo sin identificar"}
      </div>

      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
        <span className="text-theme-primary font-semibold">{estado}</span>
        <span className="ml-auto tabular-nums text-theme-primary font-semibold">
          {fmtNum(value)}
        </span>
      </div>
      <div className="text-[10px] text-theme-muted pl-[18px]">{GLOSARIO[estado] ?? ""}</div>

      <div className="border-t border-theme-secondary/60 mt-2 pt-1.5 text-[10px] text-theme-muted">
        {fmtNum(value)} de {fmtNum(total)} cuentas del trimestre en este fondo
        <span className="text-theme-secondary"> · {pct.toFixed(1)} %</span>
      </div>
    </div>
  );
}

export default function GraficaValidacion({
  datos,
  nivoTheme,
}: {
  datos: PuntoValidacion[];
  nivoTheme: Parameters<typeof ResponsiveBar>[0]["theme"];
}) {
  return (
    <ResponsiveBar<Fila>
      data={datos as Fila[]}
      keys={[...ESTADOS]}
      indexBy="id"
      groupMode="grouped"
      innerPadding={1}
      padding={0.25}
      margin={{ top: 22, right: 10, bottom: 72, left: 56 }}
      colors={ESTADOS.map((e) => COLOR_ESTADO[e])}
      theme={nivoTheme}
      // El eje repite el período en las dos barras del trimestre; lo que las
      // distingue es el fondo, que va escrito encima de cada grupo.
      axisBottom={{ tickRotation: -45, format: (v: string) => String(v).split(" · ")[0] }}
      axisLeft={{ format: (v: number) => fmtCompactNum(v) }}
      enableLabel={false}
      tooltip={Tooltip}
      layers={["grid", "axes", "bars", CapaFondo, "markers", "legends"]}
      legends={[
        {
          dataFrom: "keys",
          anchor: "bottom",
          direction: "row",
          translateY: 64,
          itemWidth: 68,
          itemHeight: 16,
          symbolSize: 10,
        },
      ]}
    />
  );
}
