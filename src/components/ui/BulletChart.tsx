'use client';

import { motion } from 'framer-motion';

interface BulletChartProps {
  comprometido: number; // 0-100
  obligado: number;     // 0-100
  disponible?: number;  // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  delay?: number;
}

export default function BulletChart({ 
  comprometido, 
  obligado, 
  disponible,
  size = 'md',
  showLegend = false,
  delay = 0
}: BulletChartProps) {
  const sizes = {
    sm: { height: 24, barHeight: 8, font: 'text-[9px]' },
    md: { height: 32, barHeight: 12, font: 'text-[10px]' },
    lg: { height: 48, barHeight: 16, font: 'text-xs' },
  };

  const { height, barHeight, font } = sizes[size];
  const disp = disponible ?? Math.max(0, 100 - comprometido - obligado);
  
  // Calcular anchos proporcionales (para que se vea bien incluso con valores pequeños)
  const total = comprometido + obligado + disp;
  const scale = total > 0 ? 100 / total : 1;
  
  const wComp = comprometido * scale;
  const wOblig = obligado * scale;
  const wDisp = disp * scale;

  return (
    <div className="w-full">
      <div 
        className="relative w-full bg-slate-700/30 rounded-full overflow-hidden flex"
        style={{ height: barHeight }}
      >
        {/* Obligado - Rojo */}
        <motion.div
          className="h-full bg-gradient-to-r from-red-700 to-red-500 relative group cursor-pointer"
          initial={{ width: 0 }}
          animate={{ width: `${wOblig}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] whitespace-nowrap">
              <span className="text-red-400 font-semibold">Obligado (legalizado):</span> {obligado.toFixed(2)}%
            </div>
          </div>
        </motion.div>

        {/* Comprometido restante - Ámbar */}
        <motion.div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative group cursor-pointer"
          initial={{ width: 0 }}
          animate={{ width: `${wComp}%` }}
          transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] whitespace-nowrap">
              <span className="text-amber-400 font-semibold">Comprometido restante:</span> {comprometido.toFixed(2)}%
            </div>
          </div>
        </motion.div>

        {/* Disponible - Azul oscuro/Gris */}
        <motion.div
          className="h-full bg-gradient-to-r from-slate-700 to-slate-500 relative group cursor-pointer"
          initial={{ width: 0 }}
          animate={{ width: `${wDisp}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] whitespace-nowrap">
              <span className="text-slate-400 font-semibold">Disponible (sin compromiso):</span> {disp.toFixed(2)}%
            </div>
          </div>
        </motion.div>
      </div>

      {/* Labels con valores — ordenados según la barra */}
      <div className={`flex justify-between mt-1.5 ${font}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400 font-semibold">{obligado.toFixed(2)}%</span>
            <span className="text-slate-500">Obl.</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-400 font-semibold">{comprometido.toFixed(2)}%</span>
            <span className="text-slate-500">Comp.</span>
          </span>
        </div>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-slate-400 font-semibold">{disp.toFixed(2)}%</span>
          <span className="text-slate-500">Disp.</span>
        </span>
      </div>
    </div>
  );
}
