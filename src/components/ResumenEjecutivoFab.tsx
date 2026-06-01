'use client';

import { useCallback, useState } from 'react';

interface ResumenEjecutivoFabProps {
  onPointerDown?: (e: React.PointerEvent) => void;
}

export default function ResumenEjecutivoFab({ onPointerDown }: ResumenEjecutivoFabProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (downloading) return;

    setDownloading(true);
    setError(null);

    try {
      const res = await fetch(`/api/resumen-ejecutivo/?_=${Date.now()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        throw new Error('No se pudo descargar el informe ejecutivo');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      const filename = match?.[1] ?? 'Informe_Ejecutivo_MME.pdf';

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
      setTimeout(() => setError(null), 5000);
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
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      disabled={downloading}
      className={[
        'w-14 h-14 rounded-full shadow-xl flex flex-col items-center justify-center',
        'transition-transform hover:scale-105 active:scale-95',
        'disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100',
        'border border-[#2A5A6E]/60 relative pointer-events-auto',
        error ? 'ring-2 ring-red-500/80' : '',
      ].join(' ')}
      style={{
        background: 'linear-gradient(145deg, #2A6B7C 0%, #1D3544 100%)',
        boxShadow: '0 4px 20px rgba(29, 53, 68, 0.45), 0 2px 8px rgba(0,0,0,0.3)',
      }}
      aria-label="Descargar resumen ejecutivo diario MME"
      title={error ?? 'Descargar informe ejecutivo diario (correo/Telegram)'}
    >
      {downloading ? (
        <svg
          className="w-5 h-5 animate-spin text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <>
          <span className="text-[7px] font-bold uppercase leading-none text-white/90 tracking-wide">
            Resumen
          </span>
          <span className="text-[7px] font-bold uppercase leading-none text-white tracking-wide">
            Ejecutivo
          </span>
        </>
      )}
    </button>
  );
}
