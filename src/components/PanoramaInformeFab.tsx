'use client';

import { useCallback, useState } from 'react';

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

interface PanoramaInformeFabProps {
  /** Evita que el contenedor padre capture el evento de arrastre */
  onPointerDown?: (e: React.PointerEvent) => void;
}

export default function PanoramaInformeFab({ onPointerDown }: PanoramaInformeFabProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (downloading) return;

    setDownloading(true);
    setError(null);

    try {
      const res = await fetch(`/api/informe-diario?_=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('No se pudo descargar el informe');
      }

      const blob = await res.blob();
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
    } catch {
      setError('Error al descargar');
      setTimeout(() => setError(null), 4000);
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      onClick={handleDownload}
      disabled={downloading}
      className={[
        'w-14 h-14 rounded-full shadow-xl flex items-center justify-center',
        'transition-transform hover:scale-105 active:scale-95',
        'disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100',
        'bg-[#F5C518] hover:bg-[#FFCF2A]',
        'border border-[#E0AD00]/60',
        'relative pointer-events-auto',
      ].join(' ')}
      style={{
        boxShadow: '0 4px 20px rgba(245, 197, 24, 0.35), 0 2px 8px rgba(0,0,0,0.3)',
      }}
      aria-label="Descargar boletín energético Panorama Energético"
      title={error ?? 'Descargar boletín energético (Panorama Energético)'}
    >
      {downloading ? (
        <svg
          className="w-6 h-6 animate-spin text-[#2A2826]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        <LightningIcon className="w-5 h-7 text-[#2A2826] pointer-events-none" />
      )}
    </button>
  );
}
