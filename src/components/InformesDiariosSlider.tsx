'use client';

import { useCallback, useEffect, useState } from 'react';

interface InformeItem {
  tipo: string;
  label: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  fechaIso: string;
  esDelDia: boolean;
  filename: string;
}

const ROTATE_MS = 6000;
const REFRESH_MS = 2 * 60 * 1000;

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.5 0 L6 14 H11 L8.5 32 L20 14 H14.5 Z" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4" aria-hidden="true">
      {dir === 'left' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

export default function InformesDiariosSlider() {
  const [informes, setInformes] = useState<InformeItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const res = await fetch(`/api/informes-diarios/catalogo?_=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Error al cargar');
        const data = await res.json() as { informes: InformeItem[] };
        if (!cancelled) {
          setInformes(data.informes ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Sin informes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadCatalog();
      }
    };

    loadCatalog();
    const refresh = setInterval(loadCatalog, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (informes.length <= 1 || paused || downloading) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % informes.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [informes.length, paused, downloading]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + informes.length) % informes.length);
  }, [informes.length]);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % informes.length);
  }, [informes.length]);

  const handleDownload = useCallback(async () => {
    const item = informes[current];
    if (!item || downloading) return;

    setDownloading(true);
    try {
      const res = await fetch(
        `/api/informes-diarios/descargar?tipo=${encodeURIComponent(item.tipo)}&_=${Date.now()}`,
        { cache: 'no-store', signal: AbortSignal.timeout(180_000) },
      );
      if (!res.ok) throw new Error('Error al descargar');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      const filename = match?.[1] ?? item.filename;

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
  }, [informes, current, downloading]);

  if (loading) {
    return (
      <div className="w-60 rounded-lg px-3 py-2 bg-theme-secondary border border-theme-primary animate-pulse">
        <div className="h-2.5 w-20 bg-theme-hover rounded mb-2" />
        <div className="h-3 w-full bg-theme-hover rounded" />
      </div>
    );
  }

  if (error && informes.length === 0) {
    return (
      <div className="w-60 rounded-lg px-3 py-2 bg-theme-secondary border border-theme-primary text-theme-secondary text-xs shadow-md">
        {error}
      </div>
    );
  }

  if (informes.length === 0) return null;

  const item = informes[current];

  return (
    <div
      className="w-60 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Mismo tratamiento dorado que el botón de herramientas — degradado
          gold + texto oscuro (#2A2826), para que ambos se vean uniformes */}
      <div className="rounded-xl px-3.5 py-3 shadow-lg bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)]">
        {/* Header: marca + flechas manuales */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <LightningIcon className="w-3 h-4 text-[#2A2826] shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-[#2A2826]/70 truncate flex-1">
            Informes XM
          </span>
          {informes.length > 1 && (
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={goPrev}
                className="p-0.5 rounded hover:bg-black/10 text-[#2A2826]/70"
                aria-label="Informe anterior"
              >
                <ChevronIcon dir="left" />
              </button>
              <span className="text-[10px] font-semibold text-[#2A2826]/70 px-0.5 tabular-nums">
                {current + 1}/{informes.length}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="p-0.5 rounded hover:bg-black/10 text-[#2A2826]/70"
                aria-label="Informe siguiente"
              >
                <ChevronIcon dir="right" />
              </button>
            </div>
          )}
        </div>

        {/* Título + fecha — clic descarga PDF. Solo lo esencial: nombre y fecha. */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full text-left disabled:opacity-70 disabled:cursor-wait hover:opacity-80 transition-opacity focus:outline-none"
          aria-label={`Descargar informe: ${item.label}`}
          title={`Clic para descargar — ${item.label}`}
        >
          <p className="text-sm font-bold text-[#2A2826] leading-tight line-clamp-2">
            {item.label}
          </p>
          <p className="text-xs font-semibold text-[#2A2826]/70 mt-0.5">
            {item.fecha}
            {downloading && <span className="ml-1">…</span>}
          </p>
        </button>
      </div>

      {/* Puntos — navegación manual */}
      {informes.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {informes.map((inf, i) => (
            <button
              key={inf.tipo}
              type="button"
              onClick={() => setCurrent(i)}
              className={[
                'rounded-full transition-all',
                i === current
                  ? 'w-3.5 h-1.5 bg-[var(--color-gold)]'
                  : 'w-1.5 h-1.5 bg-theme-muted/30 hover:bg-theme-muted/50',
              ].join(' ')}
              aria-label={`Ver informe: ${inf.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
