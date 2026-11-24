"use client";

import { useSyncExternalStore } from "react";

/**
 * Resultado de una media query de CSS, reactivo a cambios (rotar el teléfono,
 * redimensionar). Devuelve `null` en el servidor y en la primera pasada del
 * cliente, para no desajustar la hidratación; luego pasa a true/false.
 */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (aviso) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", aviso);
      return () => mq.removeEventListener("change", aviso);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
