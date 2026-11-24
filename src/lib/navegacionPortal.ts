import { HIDROCARBUROS_VISIBLE } from './featureFlags';

/** Estructura del menú del portal: la usan Header (escritorio) y el cajón móvil. */
export interface NavGrandchild {
  label: string;
  href: string;
}

export interface NavChild {
  label: string;
  href: string;
  children?: NavGrandchild[];
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
  highlight?: boolean;
  /** Solo se muestra si HIDROCARBUROS_VISIBLE está activo. */
  requiresHidrocarburos?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Sector energético',
    href: '/energia',
    children: [
      { label: 'Gestión del sector', href: '/energia' },
      { label: 'Balance Oferta-Demanda', href: '/balance-oferta-demanda' },
      { label: 'Predicciones SIN', href: '/energia/predicciones' },
      { label: 'Informes energéticos', href: '/energia/informes' },
      { label: 'IPEM', href: '/energia/ipem' },
      { label: 'Portal Energético', href: 'https://portalenergetico.minenergia.gov.co/' },
    ],
  },
  {
    label: 'Dirección energía',
    href: '/presupuesto',
    children: [
      { label: 'Informe semanal', href: '/informe-direccion-energia' },
      { label: 'Presupuesto', href: '/presupuesto' },
      { label: 'Supervisión', href: '/supervision' },
      {
        label: 'Subsidios',
        href: '/subsidios',
        children: [
          { label: 'Déficit histórico', href: '/subsidios' },
          { label: 'Detalle de pagos', href: '/pagos' },
          { label: 'Tablero de validaciones', href: '/validaciones' },
          { label: 'Detalle Empresas', href: '/detalle-empresas' },
        ],
      },
    ],
  },
  {
    label: 'Comunidades Energéticas',
    href: '/colombia-solar',
    children: [
      { label: 'Resumen', href: '/colombia-solar' },
      { label: 'CE_Implementadas', href: '/comunidades' },
      { label: 'CE_Contratos OR', href: '/contratos-or' },
      { label: 'CE_Fenoge 1.0, 1.1', href: '/fenoge' },
    ],
  },
  {
    label: 'Dirección de Hidrocarburos',
    href: '/hidrocarburos/presupuesto',
    // Oculto mientras HIDROCARBUROS_VISIBLE sea false (ver src/lib/featureFlags.ts).
    requiresHidrocarburos: true,
    children: [
      { label: 'Presupuesto', href: '/hidrocarburos/presupuesto' },
      { label: 'Exploración', href: '/hidrocarburos/exploracion' },
      { label: 'Agentes SICOM', href: '/hidrocarburos/agentes' },
      { label: 'Compras', href: '/hidrocarburos/compras' },
      { label: 'Compras EDS', href: '/hidrocarburos/compras-eds' },
      { label: 'Capacidad', href: '/hidrocarburos/capacidad' },
    ],
  },
  { label: 'Asistente IA', href: '/asistente', highlight: true },
];

// Lo que realmente se pinta: igual a navItems salvo las secciones apagadas por
// bandera. No se borra nada de navItems, solo se filtra.
export const visibleNavItems: NavItem[] = navItems.filter(
  (item) => !item.requiresHidrocarburos || HIDROCARBUROS_VISIBLE
);
