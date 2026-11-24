/**
 * Navegación inferior de la versión móvil (PWA). El menú completo sigue siendo
 * el de Header.tsx: aquí solo van los cuatro destinos de uso frecuente y un
 * quinto botón («Menú») que abre ese menú.
 */
export interface ItemNavMovil {
  id: string;
  label: string;
  /** Destino al tocar (con barra final: el proyecto usa trailingSlash). */
  href: string;
  /** Rutas que marcan el ítem como activo (la propia y sus hijas). */
  prefijos: readonly string[];
  /** El Asistente es la pantalla principal de la app. */
  destacado?: boolean;
}

/** Evento de ventana con el que BottomNav le pide a Header abrir/cerrar su menú. */
export const EVENTO_ALTERNAR_MENU = 'portal:alternar-menu';

export const ITEMS_NAV_MOVIL: readonly ItemNavMovil[] = [
  {
    id: 'sector',
    label: 'Sector',
    href: '/energia/',
    prefijos: ['/energia', '/balance-oferta-demanda'],
  },
  {
    id: 'direccion',
    label: 'Dirección',
    href: '/supervision/',
    prefijos: [
      '/presupuesto', '/supervision', '/subsidios', '/pagos',
      '/validaciones', '/detalle-empresas', '/informe-direccion-energia',
    ],
  },
  {
    id: 'asistente',
    label: 'Asistente',
    href: '/asistente/',
    prefijos: ['/asistente'],
    destacado: true,
  },
  {
    // Se apunta a /comunidades (Next) y no a /colombia-solar: esta última la
    // sirve otra aplicación detrás de nginx y no lleva la barra inferior.
    id: 'comunidades',
    label: 'Comunidades',
    href: '/comunidades/',
    prefijos: ['/comunidades', '/colombia-solar', '/contratos-or', '/fenoge'],
  },
];

export function normalizarRuta(ruta: string): string {
  return ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
}

export function esRutaActiva(pathname: string, prefijos: readonly string[]): boolean {
  const ruta = normalizarRuta(pathname);
  return prefijos.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
}
