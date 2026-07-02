"use client";

import { motion } from "framer-motion";
import { Droplets, TrendingUp, TrendingDown, Minus, CloudSun, AlertCircle } from "lucide-react";
import { fmtDate, fmtShortDate } from "@/types/predictions";

interface Props {
  actual: { fecha: string; valor: number } | null;
  pico: { fecha: string; valor: number; dias_desde_hoy: number } | null;
  mape: number;
  confianza: number;
  generadoEn: string;
  oni: { actual: number | null; estado: string | null } | null;
}

export default function EmbalseHeroCard({ actual, pico, mape, confianza, generadoEn, oni }: Props) {
  const hayPico = pico && actual;
  const diferencia = hayPico ? pico.valor - actual.valor : 0;
  const tendencia = diferencia > 1 ? "alta" : diferencia < -1 ? "baja" : "estable";

  const oniColor =
    oni?.estado === "EL NIÑO" ? "#F97316" : oni?.estado === "LA NIÑA" ? "#38BDF8" : "#94A3B8";

  const TendenciaIcon = tendencia === "alta" ? TrendingUp : tendencia === "baja" ? TrendingDown : Minus;
  const tendenciaColor = tendencia === "alta" ? "#22C55E" : tendencia === "baja" ? "#EF4444" : "#94A3B8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-dash-chip rounded-xl p-5 md:p-6 border border-white/5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Izquierda: actual */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">
              Embalses hoy
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-bold text-blue-400">
              {actual ? actual.valor.toFixed(2) : "—"}%
            </span>
            {actual && (
              <span className="text-xs text-theme-muted">
                {fmtShortDate(actual.fecha)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-theme-muted mt-1">
            Volumen útil nacional · XM
          </p>
        </div>

        {/* Centro: flecha + pico */}
        <div className="flex items-center gap-4 lg:gap-6 flex-1 justify-start lg:justify-center">
          <div className="hidden lg:flex flex-col items-center text-theme-muted">
            <TendenciaIcon className="w-8 h-8" style={{ color: tendenciaColor }} />
            <span className="text-[9px] uppercase mt-1" style={{ color: tendenciaColor }}>
              {tendencia}
            </span>
          </div>

          <div className="bg-theme-primary/40 rounded-xl px-5 py-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-widest text-gold uppercase">
                Pico proyectado
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-bold text-gold">
                {pico ? pico.valor.toFixed(2) : "—"}%
              </span>
            </div>
            <p className="text-xs text-theme-secondary mt-1">
              {pico ? fmtDate(pico.fecha) : "—"}
            </p>
            {pico && (
              <p className="text-[10px] text-theme-muted mt-0.5">
                {pico.dias_desde_hoy} días desde hoy
              </p>
            )}
          </div>
        </div>

        {/* Derecha: señales */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between bg-theme-primary/30 rounded-lg px-4 py-2.5 border border-white/5">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" style={{ color: oniColor }} />
              <span className="text-xs text-theme-secondary">Señal ONI</span>
            </div>
            <span className="text-xs font-bold" style={{ color: oniColor }}>
              {oni?.actual !== null && oni?.actual !== undefined ? `${oni.actual}°C` : "—"}
              {" "}
              <span className="text-[10px] font-medium text-theme-muted">
                {oni?.estado || ""}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between bg-theme-primary/30 rounded-lg px-4 py-2.5 border border-white/5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-theme-secondary">Confiabilidad</span>
            </div>
            <span className="text-xs font-bold text-emerald-400">
              MAPE {(mape * 100).toFixed(1)}% · {(confianza * 100).toFixed(0)}% IC
            </span>
          </div>

          <p className="text-[9px] text-theme-muted text-right">
            Actualizado: {new Date(generadoEn).toLocaleString("es-CO")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
