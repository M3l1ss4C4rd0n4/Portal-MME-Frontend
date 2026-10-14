"use client";

import { motion } from "framer-motion";
import { fmtNum } from "@/lib/format";

/**
 * Gráfico de embudo — réplica del visual "funnel" de Power BI.
 *
 * Lo usan las hojas AGENTES (§12.3 "Agentes por tipo"), COMPRAS EDS
 * (§14.2 top compradores, §14.3 top proveedores) y CAPACIDAD (§15.2 por
 * producto). Se implementa en SVG propio en vez de añadir @nivo/funnel:
 * el portal ya resuelve así sus visuales no cubiertos por Nivo
 * (SemiPieChart, BulletChart, MapaEmbalsesSVG) y permite igualar la
 * proporción del embudo de Power BI y los tokens de color del tema.
 */

export interface FunnelItem {
  label: string;
  valor: number;
}

interface Props {
  data: FunnelItem[];
  /** Color base; cada tramo baja en opacidad hacia el final del embudo. */
  color?: string;
  /** Alto de cada tramo en px. */
  alturaTramo?: number;
  /** Separación entre tramos en px. */
  gap?: number;
  /** Sufijo de unidad para las etiquetas de valor. */
  unidad?: string;
}

export default function FunnelChart({
  data,
  color = "#D97706",
  alturaTramo = 34,
  gap = 3,
  unidad,
}: Props) {
  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-theme-muted text-sm">
        Sin datos
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.valor), 1);
  const total = data.reduce((a, d) => a + d.valor, 0);
  const alto = data.length * (alturaTramo + gap);
  const ANCHO = 100; // viewBox en unidades relativas; el SVG escala al contenedor

  return (
    <div className="w-full" style={{ height: alto }}>
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="Gráfico de embudo"
      >
        {data.map((d, i) => {
          // Barras centradas, no trapecios: es como dibuja Power BI el embudo,
          // y además no degenera en una punta cuando el primer valor domina
          // (p. ej. 85% de los agentes son distribuidores minoristas).
          const w = Math.max((d.valor / max) * ANCHO, ANCHO * 0.012);
          const y = i * (alturaTramo + gap);
          const opacidad = 0.9 - (i / data.length) * 0.4;

          return (
            <motion.rect
              key={d.label}
              x={(ANCHO - w) / 2}
              y={y}
              width={w}
              height={alturaTramo}
              fill={color}
              fillOpacity={opacidad}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
            />
          );
        })}
      </svg>

      {/* Etiquetas en HTML superpuesto: el SVG va con preserveAspectRatio="none"
          y deformaría el texto si fuera <text> dentro del propio SVG. */}
      <div className="relative" style={{ marginTop: -alto, height: alto }}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="absolute inset-x-0 flex items-center justify-center gap-2 px-2"
            style={{ top: i * (alturaTramo + gap), height: alturaTramo }}
          >
            <span className="text-[10px] font-semibold text-theme-primary truncate max-w-[55%] drop-shadow">
              {d.label}
            </span>
            <span className="text-[10px] tabular-nums text-theme-primary/90 shrink-0 drop-shadow">
              {fmtNum(d.valor)}
              {unidad ? ` ${unidad}` : ""}
              {total > 0 && (
                <span className="text-theme-muted ml-1">
                  ({((d.valor / total) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
