import { describe, expect, test } from 'vitest';
import { ITEMS_NAV_MOVIL, esRutaActiva, normalizarRuta } from '../navegacionMovil';

const prefijosDe = (id: string) => ITEMS_NAV_MOVIL.find((i) => i.id === id)!.prefijos;

describe('normalizarRuta', () => {
  test('quita la barra final salvo en la raíz', () => {
    expect(normalizarRuta('/asistente/')).toBe('/asistente');
    expect(normalizarRuta('/')).toBe('/');
  });
});

describe('esRutaActiva', () => {
  test('reconoce la ruta propia con y sin barra final', () => {
    expect(esRutaActiva('/asistente', prefijosDe('asistente'))).toBe(true);
    expect(esRutaActiva('/asistente/', prefijosDe('asistente'))).toBe(true);
  });

  test('reconoce rutas hijas del mismo grupo', () => {
    expect(esRutaActiva('/energia/predicciones/', prefijosDe('sector'))).toBe(true);
  });

  test('no confunde rutas que solo comparten el comienzo del nombre', () => {
    expect(esRutaActiva('/energiaX', prefijosDe('sector'))).toBe(false);
    expect(esRutaActiva('/comunidades-otra', prefijosDe('comunidades'))).toBe(false);
  });

  test('marca Dirección al estar en Supervisión o Subsidios', () => {
    expect(esRutaActiva('/supervision/', prefijosDe('direccion'))).toBe(true);
    expect(esRutaActiva('/subsidios/', prefijosDe('direccion'))).toBe(true);
  });

  test('ningún ítem queda activo en la portada', () => {
    const activos = ITEMS_NAV_MOVIL.filter((i) => esRutaActiva('/', i.prefijos));
    expect(activos).toHaveLength(0);
  });
});

describe('ITEMS_NAV_MOVIL', () => {
  test('el Asistente es el único destacado y todos los destinos llevan barra final', () => {
    expect(ITEMS_NAV_MOVIL.filter((i) => i.destacado).map((i) => i.id)).toEqual(['asistente']);
    expect(ITEMS_NAV_MOVIL.every((i) => i.href.endsWith('/'))).toBe(true);
  });
});
