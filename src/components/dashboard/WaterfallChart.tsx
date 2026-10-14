"use client";

import { motion } from "framer-motion";
import { fmtNum } from "@/lib/format";

/**
 * Gráfico de cascada — réplica del visual "waterfall" de Power BI
 * (hoja CAPACIDAD §15.4, "Capacidad por tipo de agente": cómo cada tipo
 * contribuye al valor agregado total).
 *
 * El ETL entrega los tramos ya acumulados (inicio/fin) para no duplicar la
 * lógica de acumulación entre el servidor y el cliente.
 */

export interface WaterfallItem {
  tipo: string;
  valor: number;
  inicio: number;
  fin: number;
}

interface Props {
  data: WaterfallItem[];
  total: number;
  color?: string;
  colorTotal?: string;
  alto?: number;
  unidad?: string;
}

export default function WaterfallChart({
  data,
  total,
  color = "#D97706",
  colorTotal = "#F59E0B",
  alto = 300,
  unidad,
}: Props) {
  if (!data.length || total <= 0) {
    return (
      <div className="h-full flex items-center justify-center text-theme-muted text-sm">
        Sin datos
      </div>
    );
  }

  // Una columna por tipo + la columna final del total acumulado.
  const columnas = [...data, { tipo: "TOTAL", valor: total, inicio: 0, fin: total }];
  const anchoCol = 100 / columnas.length;

  return (
    <div className="w-full" style={{ height: alto }}>
      <div className="relative w-full" style={{ height: alto - 46 }}>
        {columnas.map((d, i) => {
          const esTotal = i === columnas.length - 1;
          const topPct = (1 - d.fin / total) * 100;
          const altoPct = ((d.fin - d.inicio) / total) * 100;
          return (
            <div
              key={d.tipo}
              className="absolute"
              style={{
                left: `${i * anchoCol}%`,
                width: `${anchoCol}%`,
                top: 0,
                height: "100%",
              }}
            >
              {/* conector hacia la columna siguiente */}
              {!esTotal && i < columnas.length - 2 && (
                <div
                  className="absolute border-t border-dashed border-theme-secondary/40"
                  style={{ top: `${topPct}%`, left: "60%", width: "80%" }}
                />
              )}
              <motion.div
                className="absolute rounded-sm"
                style={{
                  left: "20%",
                  width: "60%",
                  top: `${topPct}%`,
                  background: esTotal ? colorTotal : color,
                  opacity: esTotal ? 1 : 0.85,
                }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(altoPct, 0.4)}%` }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                title={`${d.tipo}: ${fmtNum(d.valor)}${unidad ? ` ${unidad}` : ""}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ height: 46 }}>
        {columnas.map((d, i) => (
          <div
            key={d.tipo}
            className="px-0.5 text-center"
            style={{ width: `${anchoCol}%` }}
          >
            <div
              className={`text-[9px] leading-tight truncate ${
                i === columnas.length - 1 ? "text-gold font-bold" : "text-theme-muted"
              }`}
              title={d.tipo}
            >
              {d.tipo}
            </div>
            <div className="text-[9px] tabular-nums text-theme-secondary">
              {((d.valor / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
