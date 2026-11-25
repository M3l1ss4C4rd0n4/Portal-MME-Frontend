"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MARGEN_PX = 6;
/** Cuadros que se siguen midiendo tras cada render: el tooltip de Nivo se anima hasta su sitio. */
const CUADROS_DE_AJUSTE = 24;

interface Limites {
  izquierda: number;
  derecha: number;
  arriba: number;
  abajo: number;
}

/** Alto de la barra superior fija del celular (0 en escritorio), definido por --topbar-h. */
function alturaBarraSuperior(): number {
  const sonda = document.createElement("div");
  sonda.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;height:var(--topbar-h, 0px)";
  document.body.appendChild(sonda);
  const alto = sonda.offsetHeight;
  sonda.remove();
  return alto;
}

/** Área donde el tooltip se ve entero: la ventana (sin la barra superior) recortada por cada contenedor con overflow. */
function limitesVisibles(el: HTMLElement, barraSuperior: number): Limites {
  const limites: Limites = {
    izquierda: 0,
    derecha: window.innerWidth,
    arriba: barraSuperior,
    abajo: window.innerHeight,
  };
  for (let padre = el.parentElement; padre && padre !== document.body; padre = padre.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(padre);
    if (overflowX === "visible" && overflowY === "visible") continue;
    const caja = padre.getBoundingClientRect();
    if (overflowX !== "visible") {
      limites.izquierda = Math.max(limites.izquierda, caja.left);
      limites.derecha = Math.min(limites.derecha, caja.right);
    }
    if (overflowY !== "visible") {
      limites.arriba = Math.max(limites.arriba, caja.top);
      limites.abajo = Math.min(limites.abajo, caja.bottom);
    }
  }
  return limites;
}

/** Desplazamiento que mete [inicio, fin] dentro de [min, max]; prioriza el borde inicial. */
function desplazamiento(inicio: number, fin: number, min: number, max: number): number {
  const minimo = min + MARGEN_PX;
  const maximo = max - MARGEN_PX;
  if (fin - inicio >= maximo - minimo) return minimo - inicio;
  if (fin > maximo) return maximo - fin;
  if (inicio < minimo) return minimo - inicio;
  return 0;
}

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Envuelve el contenido de un tooltip de Nivo para que no quede recortado por el borde
 * del gráfico, de la tarjeta o de la pantalla. Nivo coloca el tooltip sobre el punto sin
 * revisar esos bordes, y en el celular la etiqueta salía cortada.
 */
export function TooltipSeguro({ children, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const aplicado = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cuadro = 0;
    let id = 0;
    const barraSuperior = alturaBarraSuperior();

    const ajustar = () => {
      const caja = el.getBoundingClientRect();
      const limites = limitesVisibles(el, barraSuperior);
      // La caja medida ya incluye el desplazamiento aplicado: se resta para hallar la posición natural.
      const izquierda = caja.left - aplicado.current.x;
      const arriba = caja.top - aplicado.current.y;
      const x = desplazamiento(izquierda, izquierda + caja.width, limites.izquierda, limites.derecha);
      const y = desplazamiento(arriba, arriba + caja.height, limites.arriba, limites.abajo);
      if (x !== aplicado.current.x || y !== aplicado.current.y) {
        aplicado.current = { x, y };
        el.style.translate = `${x}px ${y}px`;
      }
      cuadro += 1;
      if (cuadro < CUADROS_DE_AJUSTE) id = requestAnimationFrame(ajustar);
    };

    id = requestAnimationFrame(ajustar);
    return () => cancelAnimationFrame(id);
  });

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
