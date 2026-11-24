import { describe, expect, test } from 'vitest';
import { nombreSeguro } from '../descargasNativas';

describe('nombreSeguro', () => {
  test('conserva un nombre normal', () => {
    expect(nombreSeguro('Informe_energia_2026-11-24.pdf')).toBe('Informe_energia_2026-11-24.pdf');
  });

  test('reemplaza separadores de ruta y caracteres reservados', () => {
    const nombre = nombreSeguro('../../etc/pass:wd?.xlsx');
    expect(nombre).toBe('_.._etc_pass_wd_.xlsx');
    expect(nombre).not.toMatch(/[\\/]/);
  });

  test('no deja nombres que empiecen con punto ni vacíos', () => {
    expect(nombreSeguro('.oculto.pdf')).toBe('oculto.pdf');
    expect(nombreSeguro('   ')).toBe('archivo-portal');
  });
});
