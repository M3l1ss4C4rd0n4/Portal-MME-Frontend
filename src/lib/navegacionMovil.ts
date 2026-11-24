import { visibleNavItems, type NavItem } from './navegacionPortal';

/** Evento de ventana: pide a la página del Asistente empezar una conversación nueva. */
export const EVENTO_NUEVO_CHAT = 'asistente:nuevo-chat';
export const RUTA_ASISTENTE = '/asistente/';
const TITULO_POR_DEFECTO = 'Portal Dirección de Energía';

export function normalizarRuta(ruta: string): string {
  return ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
}

/** ¿`pathname` es `prefijo` o una ruta hija suya? (con o sin barra final) */
export function esRutaActiva(pathname: string, prefijo: string): boolean {
  const ruta = normalizarRuta(pathname);
  const base = normalizarRuta(prefijo);
  return ruta === base || ruta.startsWith(`${base}/`);
}

interface Destino {
  href: string;
  label: string;
}

function aplanar(items: readonly NavItem[]): Destino[] {
  const destinos: Destino[] = [];
  const recorrer = (nodos: readonly { label: string; href: string; children?: readonly { label: string; href: string }[] }[]) => {
    for (const nodo of nodos) {
      if (nodo.href.startsWith('/')) destinos.push({ href: nodo.href, label: nodo.label });
      if (nodo.children) recorrer(nodo.children);
    }
  };
  recorrer(items);
  return destinos;
}

/**
 * Título de la barra superior móvil: la etiqueta del destino del menú que
 * mejor coincide con la ruta (el de href más largo); si no hay, el nombre del portal.
 */
export function tituloDeRuta(pathname: string, items: readonly NavItem[] = visibleNavItems): string {
  if (normalizarRuta(pathname) === '/') return 'Inicio';
  // En empate de href (el padre y su primer hijo comparten ruta) gana el hijo,
  // que se lista después: es la etiqueta más específica.
  const mejor = aplanar(items)
    .filter((d) => d.href !== '/' && esRutaActiva(pathname, d.href))
    .reduce<Destino | undefined>(
      (actual, d) => (!actual || d.href.length >= actual.href.length ? d : actual),
      undefined,
    );
  return mejor?.label ?? TITULO_POR_DEFECTO;
}
