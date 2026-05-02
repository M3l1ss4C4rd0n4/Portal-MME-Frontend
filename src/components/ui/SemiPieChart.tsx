'use client';

import { motion } from 'framer-motion';

interface SemiPieChartProps {
  value: number; // 0-100
  color: string;
  size?: number;
  stroke?: number;
  delay?: number;
}

export default function SemiPieChart({ 
  value, 
  color,
  size = 70,
  stroke = 8,
  delay = 0
}: SemiPieChartProps) {
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(value, 100) / 100);

  return (
    <div className="flex justify-center">
      <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`}>
        {/* Background arc */}
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="var(--border-secondary)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <motion.path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, delay, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}
