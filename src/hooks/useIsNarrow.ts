"use client";

import { useEffect, useState } from "react";

/** Ancho de corte de Tailwind `lg:` — por debajo, la vista es móvil o tableta. */
const NARROW_QUERY = "(max-width: 1023px)";

/**
 * true cuando el viewport mide menos de 1024 px. Sirve para ajustar props de
 * Nivo (número de etiquetas de eje, márgenes) sin tocar la vista de escritorio.
 * Arranca en false para no romper la hidratación y se sincroniza al montar.
 */
export function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isNarrow;
}
