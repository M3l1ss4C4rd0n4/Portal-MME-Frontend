'use client';

import { useCallback, useState, useEffect } from 'react';

/** Icono rayo estilo logo Panorama Energético */
function LightningIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Cuerpo principal del rayo con relieve sutil */}
      <path d="M14.5 0 L6 14 H11 L8.5 32 L20 14 H14.5 Z" />
      <path
        d="M14.5 0 L6 14 H11 L8.5 32 L20 14 H14.5 Z"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressRing({
  progress,
  size = 28,
  stroke = 3,
  color = '#2A2826',
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, progress / 100)) * c;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        opacity={0.2}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 200ms linear' }}
      />
    </svg>
  );
}

interface PanoramaInformeFabProps {
  /** Evita que el contenedor padre capture el evento de arrastre */
  onPointerDown?: (e: React.PointerEvent) => void;
}

export default function PanoramaInformeFab({ onPointerDown }: PanoramaInformeFabProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Precarga el PDF en caché del backend tan pronto se monta el componente
  useEffect(() => {
    const prefetch = () => {
      try {
        fetch(`/api/informe-diario/?_=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(30_000),
        }).catch(() => {});
      } catch {
        // ignore
      }
    };
    prefetch();
    const t = setTimeout(prefetch, 2_000);
    return () => clearTimeout(t);
  }, []);

  const handleDownload = useCallback(async () => {
    if (downloading) return;

    setDownloading(true);
    setError(null);
    setProgress(0);

    // Simula avance visual mientras el backend responde (SharePoint ~2-10s)
    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p;
        const step = p < 30 ? 4 : p < 60 ? 2 : 0.8;
        return Math.min(85, p + step);
      });
    }, 250);

    try {
      const res = await fetch(`/api/informe-diario/?_=${Date.now()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) {
        throw new Error('No se pudo descargar el informe');
      }

      const blob = await res.blob();
      clearInterval(progressTimer);
      setProgress(100);

      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      const filename = match?.[1] ?? 'InformeDiario.pdf';

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setTimeout(() => setProgress(0), 400);
    } catch {
      clearInterval(progressTimer);
      setProgress(0);
      setError('Error al descargar (SharePoint lento)');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      disabled={downloading}
      className={[
        'w-14 h-14 rounded-full shadow-xl flex items-center justify-center',
        'transition-transform hover:scale-105 active:scale-95',
        'disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100',
        'bg-[#F5C518] hover:bg-[#FFCF2A]',
        'border border-[#E0AD00]/60',
        'relative pointer-events-auto',
        error ? 'ring-2 ring-red-500/80' : '',
      ].join(' ')}
      style={{
        boxShadow: '0 4px 20px rgba(245, 197, 24, 0.35), 0 2px 8px rgba(0,0,0,0.3)',
      }}
      aria-label="Descargar boletín energético Panorama Energético"
      title={error ?? 'Descargar boletín energético (Panorama Energético)'}
    >
      {downloading ? (
        <ProgressRing progress={progress} size={28} stroke={3} color="#2A2826" />
      ) : (
        <LightningIcon className="w-5 h-7 text-[#2A2826] pointer-events-none" />
      )}
    </button>
  );
}
