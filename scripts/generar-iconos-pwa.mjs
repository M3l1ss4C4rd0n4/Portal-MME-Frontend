// Genera los íconos de la PWA a partir del logo institucional (SVG).
// Uso: node scripts/generar-iconos-pwa.mjs
// Salida: public/icons/ (192, 512, maskable-512 y apple-touch-180).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const LOGO = join(RAIZ, 'public/images/logos/logo-energia-blanco.svg');
const SALIDA = join(RAIZ, 'public/icons');
const FONDO = '#060B14'; // mismo color que themeColor oscuro de layout.tsx

// proporción del lado ocupada por el logo; el ícono "maskable" deja la zona
// segura del 80 % central que exigen los lanzadores de Android.
const ICONOS = [
  { archivo: 'icon-192.png', lado: 192, proporcion: 0.7 },
  { archivo: 'icon-512.png', lado: 512, proporcion: 0.7 },
  { archivo: 'icon-maskable-512.png', lado: 512, proporcion: 0.55 },
  { archivo: 'apple-touch-icon.png', lado: 180, proporcion: 0.7 },
];

async function generar({ archivo, lado, proporcion }) {
  const ancho = Math.round(lado * proporcion);
  const logo = await sharp(LOGO, { density: 600 })
    .resize({ width: ancho, height: ancho, fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({
    create: { width: lado, height: lado, channels: 4, background: FONDO },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(SALIDA, archivo));
  console.log(`✔ ${archivo} (${lado}×${lado})`);
}

await mkdir(SALIDA, { recursive: true });
for (const icono of ICONOS) await generar(icono);
