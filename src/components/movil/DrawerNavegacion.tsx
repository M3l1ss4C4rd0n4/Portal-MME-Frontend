'use client';

import { useEffect, useState, useSyncExternalStore, type ComponentType, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowTopRightOnSquareIcon, BoltIcon, BriefcaseIcon, ChevronDownIcon, FireIcon,
  HomeIcon, PencilSquareIcon, UserGroupIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import HistorialChats from '@/components/movil/HistorialChats';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTheme } from '@/providers/ThemeProvider';
import { visibleNavItems, type NavChild, type NavGrandchild } from '@/lib/navegacionPortal';
import { EVENTO_NUEVO_CHAT, RUTA_ASISTENTE, esRutaActiva } from '@/lib/navegacionMovil';
import { EVENTO_ABRIR_CHAT } from '@/lib/historialChats';

type Icono = ComponentType<SVGProps<SVGSVGElement>>;
type Rama = NavChild | NavGrandchild;

const ICONO_POR_SECCION: Record<string, Icono> = {
  'Sector energético': BoltIcon,
  'Dirección energía': BriefcaseIcon,
  'Comunidades Energéticas': UserGroupIcon,
  'Dirección de Hidrocarburos': FireIcon,
};

const CLASE_FILA =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors';
const esExterno = (href: string) => href.startsWith('http');
const tieneHijos = (r: Rama): r is NavChild & { children: NavGrandchild[] } =>
  'children' in r && !!r.children?.length;
const contieneRuta = (r: Rama, pathname: string): boolean =>
  esRutaActiva(pathname, r.href) || (tieneHijos(r) && r.children.some((h) => contieneRuta(h, pathname)));

function Enlace({ rama, pathname, onNavegar, Icono }: { rama: Rama; pathname: string; onNavegar: () => void; Icono?: Icono }) {
  const activo = !esExterno(rama.href) && esRutaActiva(pathname, rama.href);
  const clase = `${CLASE_FILA} ${activo ? 'bg-theme-hover font-semibold text-gold' : 'text-theme-secondary active:bg-theme-hover'}`;
  if (esExterno(rama.href)) {
    return (
      <a href={rama.href} target="_blank" rel="noopener noreferrer" onClick={onNavegar} className={clase}>
        <span className="flex-1">{rama.label}</span>
        <ArrowTopRightOnSquareIcon className="h-4 w-4 text-theme-muted" />
      </a>
    );
  }
  return (
    <Link href={rama.href} onClick={onNavegar} aria-current={activo ? 'page' : undefined} className={clase}>
      {Icono && <Icono className="h-5 w-5 text-gold" />}
      {rama.label}
    </Link>
  );
}

function Grupo({ rama, pathname, onNavegar, nivel }: {
  rama: NavChild & { children: NavGrandchild[] }; pathname: string; onNavegar: () => void; nivel: number;
}) {
  const [abierto, setAbierto] = useState(() => contieneRuta(rama, pathname));
  const Icono = nivel === 0 ? ICONO_POR_SECCION[rama.label] : undefined;
  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`${CLASE_FILA} ${nivel === 0 ? 'font-medium text-theme-primary' : 'text-theme-secondary'} active:bg-theme-hover`}
      >
        {Icono && <Icono className="h-5 w-5 text-gold" />}
        <span className="flex-1">{rama.label}</span>
        <ChevronDownIcon className={`h-4 w-4 text-theme-muted transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="ml-5 space-y-0.5 border-l border-theme-card pl-2">
          {rama.children.map((hijo) => (
            <Rama key={hijo.label} rama={hijo} pathname={pathname} onNavegar={onNavegar} nivel={nivel + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Rama({ rama, pathname, onNavegar, nivel }: { rama: Rama; pathname: string; onNavegar: () => void; nivel: number }) {
  return tieneHijos(rama)
    ? <Grupo rama={rama} pathname={pathname} onNavegar={onNavegar} nivel={nivel} />
    : <Enlace rama={rama} pathname={pathname} onNavegar={onNavegar} />;
}

/**
 * Cajón de navegación lateral izquierdo de la versión móvil: Asistente IA como
 * primera opción y, debajo, los tableros del portal agrupados por sección.
 */
export default function DrawerNavegacion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'light' ? 'logo-energia-negro.svg' : 'logo-energia-blanco.svg';

  // Cierra al cambiar de ruta, con Escape, y bloquea el desplazamiento de la página detrás.
  useEffect(() => { onCerrar(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alPulsar);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener('keydown', alPulsar);
    };
  }, [abierto, onCerrar]);

  const nuevoChat = () => {
    if (esRutaActiva(pathname, RUTA_ASISTENTE)) window.dispatchEvent(new Event(EVENTO_NUEVO_CHAT));
    else router.push(RUTA_ASISTENTE);
    onCerrar();
  };

  // Fuera de /asistente se navega con ?chat=<id>; la página lo abre al montarse.
  const abrirChat = (id: string) => {
    if (esRutaActiva(pathname, RUTA_ASISTENTE)) window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_CHAT, { detail: id }));
    else router.push(`${RUTA_ASISTENTE}?chat=${encodeURIComponent(id)}`);
    onCerrar();
  };

  // Se pinta directamente en <body>: así queda por encima de los mapas (Leaflet
  // usa z-index de hasta 1000) y del botón flotante, sin depender de la barra superior.
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!montado) return null;

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            key="fondo"
            className="fixed inset-0 z-[10000] bg-black/55 md:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCerrar}
            aria-hidden="true"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="fixed inset-y-0 left-0 z-[10001] flex w-[86vw] max-w-[320px] flex-col bg-theme-secondary shadow-2xl md:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/logos/${logo}`} alt="Ministerio de Minas y Energía" className="h-10 w-auto" />
              <button type="button" onClick={onCerrar} aria-label="Cerrar menú"
                className="flex h-11 w-11 items-center justify-center rounded-full text-theme-muted active:bg-theme-hover">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="px-3 pb-2">
              <button type="button" onClick={nuevoChat}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-theme-card px-3 text-[15px] font-medium text-theme-primary active:bg-theme-hover">
                <PencilSquareIcon className="h-5 w-5 text-gold" />
                Nuevo chat
              </button>
            </div>

            <nav aria-label="Secciones del portal" className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
              <HistorialChats activa={esRutaActiva(pathname, RUTA_ASISTENTE)} alAbrirChat={abrirChat} />
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-theme-muted">Tableros</p>
              <Link href="/" onClick={onCerrar}
                className={`${CLASE_FILA} ${pathname === '/' ? 'bg-theme-hover font-semibold text-gold' : 'text-theme-secondary active:bg-theme-hover'}`}>
                <HomeIcon className="h-5 w-5 text-gold" /> Inicio
              </Link>
              {visibleNavItems
                .filter((item) => item.children?.length)
                .map((item) => (
                  <Grupo key={item.label} rama={{ label: item.label, href: item.href, children: item.children as NavGrandchild[] }}
                    pathname={pathname} onNavegar={onCerrar} nivel={0} />
                ))}
            </nav>

            <div className="flex items-center justify-between gap-3 border-t border-theme-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-theme-primary">Dirección de Energía</p>
                <p className="truncate text-[11px] text-theme-muted">Ministerio de Minas y Energía</p>
              </div>
              <ThemeToggle />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
