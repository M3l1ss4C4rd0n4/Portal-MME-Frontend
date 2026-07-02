"use client";

interface GaugeEficienciaProps {
  value: number;
  loading?: boolean;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function GaugeEficiencia({ value, loading }: GaugeEficienciaProps) {
  const cx = 110;
  const cy = 110;
  const r = 80;
  const startAngle = -150;
  const endAngle = 150;
  const pct = Math.min(Math.max(value, 0), 100);
  const displayPct = Math.max(pct, 3); // mínimo 3% visual para que se vea algo en el gauge
  const isTiny = pct < 3;
  const strokeW = isTiny ? 20 : 16;
  const valueAngle = startAngle + (displayPct / 100) * (endAngle - startAngle);

  const trackPath = arcPath(cx, cy, r, startAngle, endAngle);
  const valuePath = pct > 0 ? arcPath(cx, cy, r, startAngle, valueAngle) : "";

  const color = pct < 30 ? "#F97316" : pct < 70 ? "var(--color-gold)" : "#10B981";

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <svg viewBox="0 0 220 200" className="w-full max-w-[220px]">
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="50%" stopColor="#E8A838" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path d={trackPath} fill="none" stroke="#1E2D44" strokeWidth="16" strokeLinecap="round" />

        {!loading && pct > 0 && (
          <path d={valuePath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}

        {loading ? (
          <rect x={cx - 35} y={cy - 18} width={70} height={30} rx={6} fill="rgba(255,255,255,0.06)" />
        ) : (
          <>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="28" fontWeight="900" fill={color} fontFamily="Inter, sans-serif">
              {pct.toFixed(2)}%
            </text>
            <text x={cx} y={cy + 28} textAnchor="middle" fontSize="9" fill="#64748B" fontFamily="Inter, sans-serif" letterSpacing="2">
              EFICIENCIA
            </text>
          </>
        )}

        <text x="30" y="192" fontSize="8.5" fill="#475569" textAnchor="middle" fontFamily="Inter">0%</text>
        <text x={cx} y="38" fontSize="8.5" fill="#475569" textAnchor="middle" fontFamily="Inter">50%</text>
        <text x="190" y="192" fontSize="8.5" fill="#475569" textAnchor="middle" fontFamily="Inter">100%</text>
      </svg>
    </div>
  );
}
