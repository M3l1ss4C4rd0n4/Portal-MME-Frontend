'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

interface SemiGaugeProps {
  value?: number;
  rawValue?: number | string;
  label: string;
  color?: 'gold' | 'white' | 'muted' | 'success' | 'warning' | 'danger' | 'energia' | 'hidrocarburos';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  delay?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

/** Interpola entre 2 tonos de la misma familia — el arco se vuelve más intenso a medida que sube el valor. */
function lerpColor(fromHex: string, toHex: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

/** rgba(color, alpha) — acepta hex (#RRGGBB) o rgb(r,g,b); las var() de tema caen a un halo neutro. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const [r, g, b] = hexToRgb(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }
  return `rgba(148, 163, 184, ${alpha})`;
}

// Rampa clara→intensa dentro de la MISMA familia de categoría — nunca cambia de matiz,
// solo de intensidad según el valor (0% = tono claro, 100% = tono profundo/saturado).
const CATEGORY_RAMPS: Record<'energia' | 'hidrocarburos', [string, string]> = {
  energia: ['#60A5FA', '#1D4ED8'],
  hidrocarburos: ['#F5C158', '#92400E'],
};

export default function SemiGauge({
  value,
  rawValue,
  label,
  color = 'gold',
  size = 'md',
  delay = 0
}: SemiGaugeProps) {
  const uid = useId();
  // Asegurar que el valor sea un número (soporta tanto 'value' como 'rawValue' para compatibilidad)
  const numericValue = value !== undefined
    ? value
    : (typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0);

  const colorMap: Record<string, string> = {
    gold: '#E8A838',
    white: 'var(--text-primary)',
    muted: 'var(--text-muted)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  const sizes = {
    sm: { width: 90, height: 50, stroke: 7, font: 'text-xs' },
    md: { width: 120, height: 65, stroke: 9, font: 'text-sm' },
    lg: { width: 150, height: 80, stroke: 11, font: 'text-base' },
    xl: { width: 200, height: 105, stroke: 14, font: 'text-4xl' },
    '2xl': { width: 260, height: 137, stroke: 18, font: 'text-5xl' },
  };

  const { width, height, stroke, font } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(numericValue, 100) / 100);

  const getStatusColor = () => {
    if (color === 'energia' || color === 'hidrocarburos') {
      const [from, to] = CATEGORY_RAMPS[color];
      return lerpColor(from, to, numericValue / 100);
    }
    if (color !== 'gold') return colorMap[color];
    if (numericValue >= 80) return colorMap.success;
    if (numericValue >= 50) return colorMap.gold;
    if (numericValue >= 30) return colorMap.warning;
    return colorMap.danger;
  };

  const finalColor = getStatusColor();
  // useId() incluye ":" — inválido en un fragment identifier url(#...) dentro de un atributo SVG.
  const safeUid = uid.replace(/:/g, '');
  const gradientId = `gauge-gradient-${safeUid}`;
  const glowId = `gauge-glow-${safeUid}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={finalColor} stopOpacity="0.8" />
              <stop offset="50%" stopColor={finalColor} stopOpacity="1" />
              <stop offset="100%" stopColor={finalColor} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          <path
            d={`M ${stroke/2} ${height} A ${radius} ${radius} 0 0 1 ${width - stroke/2} ${height}`}
            fill="none"
            stroke="var(--border-secondary)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          
          <motion.path
            d={`M ${stroke/2} ${height} A ${radius} ${radius} 0 0 1 ${width - stroke/2} ${height}`}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ 
              duration: 1.5, 
              ease: [0.22, 1, 0.36, 1], 
              delay: delay + 0.3 
            }}
            filter={`url(#${glowId})`}
          />
        </svg>
        
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.5 }}
        >
          <motion.span
            className={`${font} font-bold text-theme-primary`}
            initial={{ textShadow: `0 0 0px ${withAlpha(finalColor, 0)}` }}
            animate={{
              textShadow: [
                `0 0 6px ${withAlpha(finalColor, 0.35)}`,
                `0 0 14px ${withAlpha(finalColor, 0.65)}`,
                `0 0 6px ${withAlpha(finalColor, 0.35)}`,
              ],
            }}
            transition={{ delay: delay + 1, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            {numericValue.toFixed(2)}%
          </motion.span>
        </motion.div>
      </div>
      
      <motion.span 
        className="text-[10px] text-theme-muted mt-1.5 text-center max-w-[120px] leading-tight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.6 }}
      >
        {label}
      </motion.span>
    </div>
  );
}
