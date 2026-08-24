'use client';

import { useCallback, useState } from 'react';

export default function ResumenEjecutivoFab() {
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
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      disabled={downloading}
      className={[
        'relative w-14 h-14 rounded-full flex items-center justify-center',
        'transition-colors hover:bg-black/10 active:bg-black/20',
        'disabled:opacity-70 disabled:cursor-wait',
        error ? 'ring-2 ring-red-500/80' : '',
      ].join(' ')}
      aria-label="Descargar resumen ejecutivo diario MME"
      title={error ?? 'Resumen Ejecutivo'}
    >
      {downloading ? (
        <svg className="w-6 h-6 animate-spin text-[#2A2826]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-[#2A2826] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
    </button>
  );
}
