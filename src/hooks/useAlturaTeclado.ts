'use client';

import { useEffect, useState } from 'react';

/** La app Android (MainActivity) publica aquí la altura del teclado que tapa la vista web. */
declare global {
  interface Window { __tecladoNativoPx?: number }
}
export const EVENTO_TECLADO_NATIVO = 'teclado-nativo';

/**
 * Alto (px) que el teclado en pantalla le quita a la página, para subir la barra
 * de escritura junto con él. Combina dos fuentes y toma la mayor (no las suma):
 * el aviso nativo de la app y `visualViewport` del navegador.
 */
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    const calcular = () => {
      const nativo = Math.max(0, window.__tecladoNativoPx ?? 0);
      const visual = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      // Por debajo de 80 px no es un teclado (barras del navegador): se ignora.
      const mayor = Math.max(nativo, visual);
      setAltura(mayor >= 80 ? Math.round(mayor) : 0);
    };
    calcular();
    vv?.addEventListener('resize', calcular);
    vv?.addEventListener('scroll', calcular);
    window.addEventListener(EVENTO_TECLADO_NATIVO, calcular);
    return () => {
      vv?.removeEventListener('resize', calcular);
      vv?.removeEventListener('scroll', calcular);
      window.removeEventListener(EVENTO_TECLADO_NATIVO, calcular);
    };
  }, []);

  return altura;
}
