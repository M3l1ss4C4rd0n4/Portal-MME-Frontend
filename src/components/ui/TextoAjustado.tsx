"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Hasta qué fracción del tamaño original se reduce el texto antes de permitir que baje de línea. */
const ESCALA_MINIMA = 0.55;
const MARGEN_DE_REDONDEO = 0.97;
const PASO_DE_REDUCCION = 0.96;
/** Segunda medida de seguridad, por si la primera ocurre antes de que la página se acomode. */
const TARDIO_MS = 600;

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Muestra una cifra completa en una sola línea: si no cabe en el ancho de su contenedor,
 * reduce el tamaño de letra lo necesario (sin cambiar el número). Solo si ni siquiera con
 * el tamaño mínimo cabe, deja que el texto baje de línea, para no perder dígitos jamás.
 */
export function TextoAjustado({ children, className = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const contenedor = el?.parentElement;
    if (!el || !contenedor) return;

    const ajustar = () => {
      el.style.fontSize = "";
      el.style.whiteSpace = "nowrap";
      el.style.overflowWrap = "";
      const tamanoBase = parseFloat(getComputedStyle(el).fontSize);
      const ancho = el.clientWidth;
      const necesario = el.scrollWidth;
      if (ancho <= 0 || necesario <= ancho) return;
      // El ancho del texto no escala de forma exacta con la letra (redondeos de píxel):
      // se reduce un poco más hasta que quepa o se llegue al mínimo.
      let escala = Math.max(ESCALA_MINIMA, (ancho / necesario) * MARGEN_DE_REDONDEO);
      el.style.fontSize = `${tamanoBase * escala}px`;
      while (el.scrollWidth > el.clientWidth && escala > ESCALA_MINIMA) {
        escala = Math.max(ESCALA_MINIMA, escala * PASO_DE_REDUCCION);
        el.style.fontSize = `${tamanoBase * escala}px`;
      }
      if (el.scrollWidth > el.clientWidth) {
        el.style.whiteSpace = "normal";
        el.style.overflowWrap = "anywhere";
      }
    };

    ajustar();
    let anchoPrevio = contenedor.clientWidth;
    const observador = new ResizeObserver(() => {
      if (contenedor.clientWidth === anchoPrevio) return;
      anchoPrevio = contenedor.clientWidth;
      ajustar();
    });
    observador.observe(contenedor);

    // La medida inicial puede hacerse antes de que cargue la tipografía o termine la
    // distribución de la página (sobre todo en el WebView del teléfono): se repite.
    let cancelado = false;
    const repetir = () => {
      if (!cancelado) ajustar();
    };
    void document.fonts?.ready.then(repetir);
    const tardio = window.setTimeout(repetir, TARDIO_MS);
    window.addEventListener("resize", repetir);
    return () => {
      cancelado = true;
      observador.disconnect();
      window.clearTimeout(tardio);
      window.removeEventListener("resize", repetir);
    };
  }, [children]);

  return (
    <div ref={ref} className={`min-w-0 whitespace-nowrap ${className}`} style={style}>
      {children}
    </div>
  );
}
