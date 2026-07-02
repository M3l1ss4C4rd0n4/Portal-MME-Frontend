"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Zap, DollarSign, Droplets, Factory } from "lucide-react";
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
      className="w-full text-left bg-dash-chip rounded-xl p-4 border border-white/5 hover:border-amber-400/30 transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-theme-muted group-hover:text-gold transition-colors" />
          <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase">
            {metric.nombre}
          </span>
        </div>
        <TendenciaIcon className="w-4 h-4" style={{ color }} />
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-bold text-theme-primary">
          {formatValue(metric.actual)}
        </span>
        <span className="text-[10px] text-theme-muted">{metric.unidad}</span>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-theme-muted">
          7 días: <strong className="text-theme-secondary">{formatValue(metric.prediccion_7d)}</strong>
        </span>
        <span className="text-emerald-400">
          MAPE {(metric.mape * 100).toFixed(1)}%
        </span>
      </div>
    </motion.button>
  );
}
