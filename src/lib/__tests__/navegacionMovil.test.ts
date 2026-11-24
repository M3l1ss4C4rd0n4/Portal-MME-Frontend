import { describe, expect, test } from 'vitest';
import { esRutaActiva, normalizarRuta, seccionesInicio, tituloDeRuta } from '../navegacionMovil';
import type { NavItem } from '../navegacionPortal';

const MENU: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Sector',
    href: '/energia',
    children: [
      { label: 'Gestión del sector', href: '/energia' },
      { label: 'Predicciones SIN', href: '/energia/predicciones' },
      { label: 'Portal Energético', href: 'https://portalenergetico.minenergia.gov.co/' },
    ],
  },
  { label: 'Asistente IA', href: '/asistente' },
];

describe('normalizarRuta', () => {
  test('quita la barra final salvo en la raíz', () => {
    expect(normalizarRuta('/asistente/')).toBe('/asistente');
    expect(normalizarRuta('/')).toBe('/');
  });
});

describe('esRutaActiva', () => {
  test('reconoce la ruta propia con y sin barra final', () => {
    expect(esRutaActiva('/asistente/', '/asistente')).toBe(true);
    expect(esRutaActiva('/asistente', '/asistente/')).toBe(true);
  });

  test('reconoce rutas hijas', () => {
    expect(esRutaActiva('/energia/predicciones/', '/energia')).toBe(true);
  });

  test('no confunde rutas que solo comparten el comienzo del nombre', () => {
    expect(esRutaActiva('/energiaX', '/energia')).toBe(false);
  });
});

describe('tituloDeRuta', () => {
  test('usa la etiqueta del destino exacto', () => {
    expect(tituloDeRuta('/asistente/', MENU)).toBe('Asistente IA');
  });

  test('prefiere el destino más específico', () => {
    expect(tituloDeRuta('/energia/predicciones/', MENU)).toBe('Predicciones SIN');
    expect(tituloDeRuta('/energia/', MENU)).toBe('Gestión del sector');
  });

  test('la portada se llama Inicio y una ruta desconocida usa el nombre del portal', () => {
    expect(tituloDeRuta('/', MENU)).toBe('Inicio');
    expect(tituloDeRuta('/ruta-que-no-existe/', MENU)).toBe('Portal Dirección de Energía');
  });

  test('ignora los enlaces externos', () => {
    expect(tituloDeRuta('/https:', MENU)).toBe('Portal Dirección de Energía');
  });
});

describe('seccionesInicio', () => {
  const MENU_CON_SUBGRUPO: NavItem[] = [
    { label: 'Inicio', href: '/' },
    {
      label: 'Dirección',
      href: '/presupuesto',
      children: [
        { label: 'Presupuesto', href: '/presupuesto' },
        { label: 'Subsidios', href: '/subsidios', children: [
          { label: 'Déficit histórico', href: '/subsidios' },
          { label: 'Detalle de pagos', href: '/pagos' },
        ] },
        { label: 'Portal Energético', href: 'https://portalenergetico.minenergia.gov.co/' },
      ],
    },
    { label: 'Asistente IA', href: '/asistente' },
  ];

  test('omite los ítems sin hijos (Inicio, Asistente IA)', () => {
    expect(seccionesInicio(MENU_CON_SUBGRUPO).map((s) => s.titulo)).toEqual(['Dirección']);
  });

  test('aplana los subgrupos con el nombre del grupo como prefijo', () => {
    const [seccion] = seccionesInicio(MENU_CON_SUBGRUPO);
    expect(seccion.tarjetas.map((t) => t.label)).toEqual([
      'Presupuesto', 'Subsidios: Déficit histórico', 'Subsidios: Detalle de pagos', 'Portal Energético',
    ]);
  });

  test('marca como externos solo los enlaces absolutos', () => {
    const [seccion] = seccionesInicio(MENU_CON_SUBGRUPO);
    expect(seccion.tarjetas.map((t) => t.externo)).toEqual([false, false, false, true]);
  });
});
