'use client';

import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';
import {
  ArrowTopRightOnSquareIcon, BoltIcon, BriefcaseIcon, FireIcon, SparklesIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { RUTA_ASISTENTE, seccionesInicio, type TarjetaInicio } from '@/lib/navegacionMovil';

type Icono = ComponentType<SVGProps<SVGSVGElement>>;

const ICONO_POR_SECCION: Record<string, Icono> = {
  'Sector energético': BoltIcon,
  'Dirección energía': BriefcaseIcon,
  'Comunidades Energéticas': UserGroupIcon,
  'Dirección de Hidrocarburos': FireIcon,
};

const CLASE_TARJETA =
  'flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-theme-card bg-theme-secondary px-4 py-3 text-sm font-medium leading-snug text-theme-primary transition-colors active:bg-theme-hover';

function Tarjeta({ tarjeta }: { tarjeta: TarjetaInicio }) {
  if (tarjeta.externo) {
    return (
      <a href={tarjeta.href} target="_blank" rel="noopener noreferrer" className={CLASE_TARJETA}>
        <span>{tarjeta.label}</span>
        <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-theme-muted" />
      </a>
    );
  }
  return <Link href={tarjeta.href} className={CLASE_TARJETA}><span>{tarjeta.label}</span></Link>;
}

/**
 * Inicio de la versión móvil: en lugar del tablero de presentación de escritorio,
 * un acceso directo al Asistente y las tarjetas de cada tablero del portal.
 */
export default function InicioMovil() {
  return (
    <main className="min-h-dvh bg-theme-primary px-4 pb-10 pt-[calc(var(--topbar-h)+1rem)]">
      <h1 className="text-xl font-semibold text-theme-primary">Portal Dirección de Energía</h1>
      <p className="mb-5 mt-1 text-sm text-theme-muted">Ministerio de Minas y Energía</p>

      <Link
        href={RUTA_ASISTENTE}
        className="mb-7 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)] p-4 text-[#2A2826] shadow-lg active:opacity-90"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/10">
          <SparklesIcon className="h-7 w-7" />
        </span>
        <span>
          <span className="block text-base font-semibold">Asistente IA</span>
          <span className="block text-sm opacity-80">Pregunte por los datos del portal</span>
        </span>
      </Link>

      {seccionesInicio().map((seccion) => {
        const Icono = ICONO_POR_SECCION[seccion.titulo];
        return (
          <section key={seccion.titulo} className="mb-7">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-muted">
              {Icono && <Icono className="h-4 w-4 text-gold" />}
              {seccion.titulo}
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {seccion.tarjetas.map((t) => <Tarjeta key={t.href + t.label} tarjeta={t} />)}
            </div>
          </section>
        );
      })}
    </main>
  );
}
