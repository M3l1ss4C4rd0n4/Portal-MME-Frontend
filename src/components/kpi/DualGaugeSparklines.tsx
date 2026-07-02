"use client";

import { describeArc } from "@/lib/svg-math";

interface DualGaugeSparklinesProps {
  embalsesPct: number;
  aportesPct: number | null;
  sparklines: {
    embalses: Array<{ x: string; y: number }>;
    aportes: Array<{ x: string; y: number }>;
  };
}

function MiniSpark({ data, color, height = 28 }: {
  data: Array<{ x: string; y: number }>;
  color: string;
  height?: number;
}) {
  if (data.length < 2) return <div className="h-[28px]" />;
  const vals = data.map((d) => d.y);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 2;
  const w = 100;
  const h = height;
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.y - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[28px]" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.split(" ").pop()?.split(",")[0]} cy={points.split(" ").pop()?.split(",")[1]} r="2" fill={color} />
    </svg>
  );
}

export function DualGaugeSparklines({ embalsesPct, aportesPct, sparklines }: DualGaugeSparklinesProps) {
  const embColor = embalsesPct < 50 ? "#EF4444" : embalsesPct < 60 ? "#F97316" : embalsesPct < 70 ? "#F59E0B" : embalsesPct < 80 ? "#06B6D4" : "#22C55E";
  const apoColor = aportesPct === null ? "#94A3B8" : aportesPct < 80 ? "#EF4444" : aportesPct < 100 ? "#F59E0B" : "#22C55E";

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reservas y Aportes · Estado Actual</p>
      <div className="flex-1 flex gap-2">
        {/* Embalses Gauge */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full aspect-[2/1]">
            <svg viewBox="0 0 120 65" className="w-full h-full">
              <path d={describeArc(60, 60, 50, 0, 180)} fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
              <path d={describeArc(60, 60, 50, 0, (embalsesPct / 100) * 180)} fill="none" stroke={embColor} strokeWidth="10" strokeLinecap="round" />
              <text x="60" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{embalsesPct.toFixed(1)}%</text>
              <text x="60" y="62" textAnchor="middle" fill="currentColor" style={{ color: "var(--text-muted)" }} fontSize="7">Embalses</text>
            </svg>
          </div>
          <MiniSpark data={sparklines.embalses} color={embColor} />
        </div>
        {/* Aportes Gauge */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full aspect-[2/1]">
            <svg viewBox="0 0 120 65" className="w-full h-full">
              <path d={describeArc(60, 60, 50, 0, 180)} fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
              <path d={describeArc(60, 60, 50, 0, ((aportesPct ?? 0) / 100) * 180)} fill="none" stroke={apoColor} strokeWidth="10" strokeLinecap="round" />
              <text x="60" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{aportesPct !== null ? `${aportesPct.toFixed(1)}%` : "—"}</text>
              <text x="60" y="62" textAnchor="middle" fill="currentColor" style={{ color: "var(--text-muted)" }} fontSize="7">Aportes</text>
            </svg>
          </div>
          <MiniSpark data={sparklines.aportes} color={apoColor} />
        </div>
      </div>
    </div>
  );
}
