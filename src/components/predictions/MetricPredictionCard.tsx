"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Zap, DollarSign, Droplets, Factory, BadgeCheck } from "lucide-react";
import type { MetricSummary } from "@/types/predictions";

interface Props {
  metric: MetricSummary;
  index?: number;
  onClick?: () => void;
}

const ICONS: Record<string, React.ElementType> = {
  DEMANDA: Zap,
  PRECIO_BOLSA: DollarSign,
  APORTES_HIDRICOS: Droplets,
  GENE_TOTAL: Factory,
};

export default function MetricPredictionCard({ metric, index = 0, onClick }: Props) {
  const Icon = ICONS[metric.id] || Zap;
  const TendenciaIcon = metric.tendencia === "alta" ? TrendingUp : metric.tendencia === "baja" ? TrendingDown : Minus;
  const color =
    metric.tendencia === "alta" ? "#22C55E" : metric.tendencia === "baja" ? "#EF4444" : "#94A3B8";

  const formatValue = (v: number) => {
    if (metric.unidad === "$/kWh") return `$${v.toFixed(2)}`;
    return v.toFixed(1);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      onClick={onClick}
      className="w-full text-left bg-dash-chip rounded-xl p-5 border border-white/5 hover:border-amber-400/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-gold/15 transition-colors duration-200">
            <Icon className="w-4 h-4 text-theme-muted group-hover:text-gold transition-colors" />
          </span>
          <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">
            {metric.nombre}
          </span>
        </div>
        <TendenciaIcon className="w-4 h-4" style={{ color }} />
      </div>

      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-3xl font-bold text-theme-primary">
          {formatValue(metric.actual)}
        </span>
        <span className="text-[10px] text-theme-muted">{metric.unidad}</span>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-theme-muted">
          7 días: <strong className="text-theme-secondary">{formatValue(metric.prediccion_7d)}</strong>
        </span>
        <span
          className="inline-flex items-center gap-1 text-emerald-400"
          title={
            metric.mape_es_riguroso
              ? "Validación rigurosa (out-of-sample real), no una prueba interna optimista."
              : "MAPE de una prueba interna (holdout de entrenamiento)."
          }
        >
          MAPE {(metric.mape * 100).toFixed(1)}%
          {metric.mape_es_riguroso && <BadgeCheck className="w-3 h-3" aria-label="Validación rigurosa" />}
        </span>
      </div>
    </motion.button>
  );
}
