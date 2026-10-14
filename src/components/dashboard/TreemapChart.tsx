"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { fmtNum } from "@/lib/format";

/**
 * Treemap — réplica del visual "treemap" de Power BI (hoja AGENTES §12.5,
 * "Agentes por departamento"). Implementado en SVG propio porque el portal no
 * trae @nivo/treemap; usa el algoritmo "squarified" de Bruls, Huizing y van
 * Wijk (2000), que es el mismo que usa Power BI, para que la distribución de
 * rectángulos sea equivalente a la del tablero original.
 */

export interface TreemapItem {
  label: string;
  valor: number;
}

interface Rect {
  label: string;
  valor: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Libre {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Peor relación de aspecto de una fila dado el lado corto disponible. */
function peorRatio(fila: number[], lado: number, escala: number): number {
  const suma = fila.reduce((a, v) => a + v, 0) * escala;
  if (suma === 0) return Infinity;
  const max = Math.max(...fila) * escala;
  const min = Math.min(...fila) * escala;
  return Math.max((lado * lado * max) / (suma * suma), (suma * suma) / (lado * lado * min));
}

function colocarFila(fila: TreemapItem[], libre: Libre, escala: number, salida: Rect[]): Libre {
  const sumaFila = fila.reduce((a, d) => a + d.valor, 0) * escala;
  const horizontal = libre.w >= libre.h;
  const grosor = horizontal ? sumaFila / libre.h : sumaFila / libre.w;

  let offset = 0;
  for (const d of fila) {
    const largo = (d.valor * escala) / (grosor || 1);
    salida.push(
      horizontal
        ? { ...d, x: libre.x, y: libre.y + offset, w: grosor, h: largo }
        : { ...d, x: libre.x + offset, y: libre.y, w: largo, h: grosor }
    );
    offset += largo;
  }

  return horizontal
    ? { x: libre.x + grosor, y: libre.y, w: libre.w - grosor, h: libre.h }
    : { x: libre.x, y: libre.y + grosor, w: libre.w, h: libre.h - grosor };
}

function squarify(items: TreemapItem[], ancho: number, alto: number): Rect[] {
  const datos = items.filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const total = datos.reduce((a, d) => a + d.valor, 0);
  if (!datos.length || total <= 0) return [];

  const escala = (ancho * alto) / total;
  const salida: Rect[] = [];
  let libre: Libre = { x: 0, y: 0, w: ancho, h: alto };
  let fila: TreemapItem[] = [];

  for (const d of datos) {
    const lado = Math.min(libre.w, libre.h);
    const actual = fila.map((f) => f.valor);
    const ampliada = [...actual, d.valor];

    if (fila.length && peorRatio(ampliada, lado, escala) > peorRatio(actual, lado, escala)) {
      libre = colocarFila(fila, libre, escala, salida);
      fila = [d];
    } else {
      fila.push(d);
    }
  }
  if (fila.length) colocarFila(fila, libre, escala, salida);

  return salida;
}

interface Props {
  data: TreemapItem[];
  /** Paleta cíclica; por defecto la escala ámbar/naranja de Hidrocarburos. */
  colores?: string[];
  alto?: number;
  unidad?: string;
}

const PALETA_HIDROCARBUROS = [
  "#D97706", "#EA580C", "#F59E0B", "#B45309",
  "#FB923C", "#FCD34D", "#92400E", "#FDBA74",
];

export default function TreemapChart({
  data,
  colores = PALETA_HIDROCARBUROS,
  alto = 300,
  unidad,
}: Props) {
  const ANCHO = 1000;
  const rects = useMemo(() => squarify(data, ANCHO, alto), [data, alto]);

  if (!rects.length) {
    return (
      <div className="h-full flex items-center justify-center text-theme-muted text-sm">
        Sin datos
      </div>
    );
  }

  const total = rects.reduce((a, r) => a + r.valor, 0);

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${alto}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: alto }}
      role="img"
      aria-label="Treemap"
    >
      {rects.map((r, i) => {
        // Con preserveAspectRatio="none" el eje X se estira: compensar el
        // tamaño de fuente para que el texto no salga deformado.
        const cabeLabel = r.w > 55 && r.h > 26;
        const cabeValor = r.w > 55 && r.h > 42;
        return (
          <motion.g
            key={r.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.02 }}
          >
            <rect
              x={r.x}
              y={r.y}
              width={Math.max(0, r.w - 2)}
              height={Math.max(0, r.h - 2)}
              fill={colores[i % colores.length]}
              fillOpacity={0.85}
              rx={3}
            >
              <title>
                {r.label}: {fmtNum(r.valor)}
                {unidad ? ` ${unidad}` : ""} ({((r.valor / total) * 100).toFixed(1)}%)
              </title>
            </rect>
            {cabeLabel && (
              <text
                x={r.x + 8}
                y={r.y + 18}
                fill="#0F172A"
                fontSize={13}
                fontWeight={700}
                style={{ pointerEvents: "none" }}
              >
                {r.label.length > Math.floor(r.w / 9)
                  ? r.label.slice(0, Math.max(3, Math.floor(r.w / 9))) + "…"
                  : r.label}
              </text>
            )}
            {cabeValor && (
              <text
                x={r.x + 8}
                y={r.y + 34}
                fill="#0F172A"
                fontSize={12}
                fillOpacity={0.75}
                style={{ pointerEvents: "none" }}
              >
                {fmtNum(r.valor)}
              </text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
