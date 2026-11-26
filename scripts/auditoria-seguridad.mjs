#!/usr/bin/env node
// Revisa las dependencias de producción contra la base de avisos de npm y falla si aparece
// un aviso que NO esté en la lista de excepciones conocidas de abajo.
// Uso:  npm run audit:seguridad
import { spawnSync } from 'node:child_process';

/** Avisos conocidos que no se pueden corregir hoy, con la razón. Revisar al actualizar Next.js. */
const EXCEPCIONES = {
  next: 'Quedan avisos con versión corregida inexistente en el registro (RCE en optimización de imágenes, `use cache`, next/og, servidores Windows). El portal no usa esas funciones: images.unoptimized, sin `use cache`, sin next/og, servidor Linux. Volver a mirar cuando salga una versión posterior a 16.3.0.',
  sharp: 'Todas las versiones tienen aviso; solo lo usa Next para optimizar imágenes (desactivada) y el script de íconos de la PWA, que se ejecuta a mano.',
  xlsx: 'Sin corrección publicada. Solo se lee un Excel interno fijo en el servidor (colombia-solar/curva-s); no se procesan archivos de usuarios.',
};

const salida = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
let vulnerabilidades;
try {
  vulnerabilidades = JSON.parse(salida.stdout).vulnerabilities ?? {};
} catch {
  console.error('No se pudo leer la respuesta de npm audit (¿sin conexión al registro?).');
  process.exit(2);
}

const nuevos = Object.entries(vulnerabilidades).filter(([nombre]) => !(nombre in EXCEPCIONES));
const conocidos = Object.entries(vulnerabilidades).filter(([nombre]) => nombre in EXCEPCIONES);

console.log(`Avisos conocidos (${conocidos.length}):`);
for (const [nombre, v] of conocidos) console.log(`  - ${nombre} [${v.severity}]: ${EXCEPCIONES[nombre]}`);

if (nuevos.length === 0) {
  console.log('\nSin avisos nuevos.');
  process.exit(0);
}
console.log(`\nAVISOS NUEVOS (${nuevos.length}) — hay que corregirlos o justificarlos:`);
for (const [nombre, v] of nuevos) {
  const titulo = v.via.find((x) => typeof x === 'object')?.title ?? '';
  console.log(`  - ${nombre} [${v.severity}] ${v.fixAvailable ? '(hay corrección)' : '(sin corrección)'} ${titulo}`);
}
process.exit(1);
