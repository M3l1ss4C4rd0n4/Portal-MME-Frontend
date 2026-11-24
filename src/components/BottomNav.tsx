'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import {
  BoltIcon, BriefcaseIcon, SparklesIcon, UserGroupIcon, Bars3Icon,
} from '@heroicons/react/24/outline';
import {
  EVENTO_ALTERNAR_MENU, ITEMS_NAV_MOVIL, esRutaActiva,
} from '@/lib/navegacionMovil';

type Icono = ComponentType<SVGProps<SVGSVGElement>>;

const ICONOS: Record<string, Icono> = {
  sector: BoltIcon,
  direccion: BriefcaseIcon,
  asistente: SparklesIcon,
  comunidades: UserGroupIcon,
};

const CLASE_ITEM =
  'flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors';

/**
 * Barra de navegación inferior para pantallas angostas (< 768 px). Su alto se
 * publica en la variable CSS --bottom-nav-h (globals.css): el separador de
 * abajo reserva ese espacio en el flujo y el botón flotante de ChatbotWidget
 * se desplaza por encima de la barra.
 */
export default function BottomNav() {
  const pathname = usePathname() ?? '/';

  return (
    <>
      <div aria-hidden="true" className="md:hidden print:hidden" style={{ height: 'var(--bottom-nav-h)' }} />
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-theme-card bg-theme-secondary md:hidden print:hidden"
        style={{ height: 'var(--bottom-nav-h)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid h-full grid-cols-5">
          {ITEMS_NAV_MOVIL.map((item) => {
            const Icon = ICONOS[item.id];
            const activo = esRutaActiva(pathname, item.prefijos);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={activo ? 'page' : undefined}
                  className={`${CLASE_ITEM} ${activo || item.destacado ? 'text-gold font-semibold' : 'text-theme-muted'}`}
                >
                  <Icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(EVENTO_ALTERNAR_MENU))}
              className={`${CLASE_ITEM} w-full text-theme-muted`}
            >
              <Bars3Icon className="h-6 w-6" />
              <span>Menú</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
