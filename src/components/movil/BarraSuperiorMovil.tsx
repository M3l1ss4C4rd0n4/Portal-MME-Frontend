'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bars3BottomLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import DrawerNavegacion from './DrawerNavegacion';
import {
  EVENTO_NUEVO_CHAT, RUTA_ASISTENTE, esRutaActiva, tituloDeRuta,
} from '@/lib/navegacionMovil';

const CLASE_BOTON =
  'flex h-11 w-11 items-center justify-center rounded-full text-theme-primary transition-colors active:bg-theme-hover';

/**
 * Barra superior de la versión móvil (< 768 px): reemplaza al Header de escritorio.
 * A la izquierda abre el cajón de navegación; en el Asistente, a la derecha
 * permite empezar un chat nuevo.
 */
export default function BarraSuperiorMovil() {
  const pathname = usePathname() ?? '/';
  const [cajonAbierto, setCajonAbierto] = useState(false);
  const barraRef = useRef<HTMLElement>(null);
  const cerrar = useCallback(() => setCajonAbierto(false), []);
  const enAsistente = esRutaActiva(pathname, RUTA_ASISTENTE);

  // Publica su alto real como --header-height (lo usan las páginas para no quedar tapadas).
  useEffect(() => {
    const el = barraRef.current;
    if (!el) return;
    const publicar = () => {
      if (el.offsetHeight === 0) return; // oculta en pantallas anchas: manda el Header
      document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    };
    publicar();
    const observer = new ResizeObserver(publicar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        ref={barraRef}
        className="fixed inset-x-0 top-0 z-50 border-b border-theme-card backdrop-blur-md md:hidden print:hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
        }}
      >
        <div className="flex h-14 items-center justify-between px-2">
          <button type="button" onClick={() => setCajonAbierto(true)} aria-label="Abrir menú" className={CLASE_BOTON}>
            <Bars3BottomLeftIcon className="h-6 w-6" />
          </button>
          <p className="min-w-0 flex-1 truncate px-2 text-center text-base font-semibold text-theme-primary">
            {tituloDeRuta(pathname)}
          </p>
          {enAsistente ? (
            <button type="button" aria-label="Nuevo chat" className={CLASE_BOTON}
              onClick={() => window.dispatchEvent(new Event(EVENTO_NUEVO_CHAT))}>
              <PencilSquareIcon className="h-6 w-6" />
            </button>
          ) : (
            <span className="h-11 w-11" aria-hidden="true" />
          )}
        </div>
      </header>
      <DrawerNavegacion abierto={cajonAbierto} onCerrar={cerrar} />
    </>
  );
}
