import type { MetadataRoute } from 'next';

/**
 * Manifiesto de la PWA. El Asistente de IA es la pantalla de inicio de la app.
 * Colores: los del tema oscuro de layout.tsx (themeColor) y de los íconos
 * generados por scripts/generar-iconos-pwa.mjs.
 */
const COLOR_FONDO = '#060B14';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Portal Dirección de Energía – MinMinas',
    short_name: 'Energía MME',
    description:
      'Portal de la Dirección de Energía Eléctrica del Ministerio de Minas y Energía. Asistente de IA, supervisión, subsidios y comunidades energéticas.',
    lang: 'es-CO',
    start_url: '/asistente/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: COLOR_FONDO,
    theme_color: COLOR_FONDO,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
