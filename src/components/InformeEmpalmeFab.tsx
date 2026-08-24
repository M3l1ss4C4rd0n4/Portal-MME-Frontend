'use client';

import { useCallback, useState } from 'react';

export default function InformeEmpalmeFab() {
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (downloading) return;

    setDownloading(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/informe-empalme/?_=${Date.now()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        throw new Error('No se pudo descargar el informe de empalme');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      const filename = match?.[1] ?? 'Informe_de_Empalme_MME.pdf';

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setNotice('Error al descargar el informe de empalme');
      setTimeout(() => setNotice(null), 5000);
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
        notice ? 'ring-2 ring-red-500/80' : '',
      ].join(' ')}
      aria-label="Descargar informe de empalme MME"
      title={notice ?? 'Informe de Empalme'}
    >
      {/* Logo del ministerio — versión SVG en negro (misma que usa el header en
          tema claro): vectorial, se ve nítido en negro a este tamaño, a
          diferencia del PNG rasterizado que se veía borroso/gris */}
      <img
        src="/images/logos/logo-energia-negro.svg"
        alt=""
        className="w-8 h-8 object-contain pointer-events-none"
        draggable={false}
        loading="eager"
      />

      {downloading && (
        <span className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 animate-spin text-white drop-shadow-md" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </span>
      )}
    </button>
  );
}
