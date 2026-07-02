'use client';

import { useCallback, useState } from 'react';

/**
 * TODO: Reemplazar ONE_DRIVE_URL cuando el informe de empalme esté listo.
 * El enlace será proporcionado por el equipo via OneDrive/SharePoint.
 */
const ONE_DRIVE_URL = ''; // <- Insertar aquí el link directo de descarga

export default function InformeEmpalmeFab() {
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (downloading) return;

    setDownloading(true);
    setNotice(null);

    try {
      // TODO: Cuando ONE_DRIVE_URL esté disponible, descomentar y usar descarga directa.
      // if (ONE_DRIVE_URL) {
      //   const anchor = document.createElement('a');
      //   anchor.href = ONE_DRIVE_URL;
      //   anchor.download = 'Informe_de_Empalme_MME.pdf';
      //   anchor.target = '_blank';
      //   anchor.rel = 'noopener noreferrer';
      //   document.body.appendChild(anchor);
      //   anchor.click();
      //   anchor.remove();
      //   return;
      // }

      setNotice('El informe de empalme estará disponible próximamente.');
      setTimeout(() => setNotice(null), 4000);
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
        'relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center',
        'transition-transform hover:scale-105 active:scale-95',
        'disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100',
        'pointer-events-auto overflow-hidden',
      ].join(' ')}
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0,0,0,0.25)',
      }}
      aria-label="Descargar informe de empalme MME"
      title={notice ?? 'Descargar informe de empalme'}
    >
      {/* Anillo tricolor de la bandera de Colombia — conic-gradient evita gaps */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, #FCD116 0deg 180deg, #003893 180deg 270deg, #CE1126 270deg 360deg)',
        }}
      />

      {/* Círculo interior blanco con el logo */}
      <span className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center z-10">
        <img
          src="/images/logo-empalme-v2.png"
          alt=""
          className="w-10 h-10 object-contain pointer-events-none drop-shadow-sm"
          draggable={false}
          loading="eager"
        />
      </span>

      {downloading && (
        <span className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center z-20">
          <svg
            className="w-6 h-6 animate-spin text-white drop-shadow-md"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </span>
      )}


    </button>
  );
}
