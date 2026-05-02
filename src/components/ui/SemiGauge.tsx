'use client';

import { motion } from 'framer-motion';

interface SemiGaugeProps {
  value?: number;
  rawValue?: number | string;
  label: string;
  color?: 'gold' | 'white' | 'muted' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  delay?: number;
}

export default function SemiGauge({ 
  value,
  rawValue, 
  label, 
  color = 'gold',
  size = 'md',
  delay = 0
}: SemiGaugeProps) {
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
  };

  const { width, height, stroke, font } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(numericValue, 100) / 100);

  const getStatusColor = () => {
    if (color !== 'gold') return colorMap[color];
    if (numericValue >= 80) return colorMap.success;
    if (numericValue >= 50) return colorMap.gold;
    if (numericValue >= 30) return colorMap.warning;
    return colorMap.danger;
  };

  const finalColor = getStatusColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <filter id={`glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
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
            stroke={`url(#gradient-${color})`}
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
            filter={`url(#glow-${color})`}
          />
        </svg>
        
        <motion.div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.5 }}
        >
          <span className={`${font} font-bold text-theme-primary drop-shadow-lg`}>
            {numericValue.toFixed(2)}%
          </span>
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
