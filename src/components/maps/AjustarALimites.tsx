"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { COL_BOUNDS } from "@/components/maps/mapUtils";

/**
 * Reajusta el mapa a los límites del país cuando el contenedor cambia de tamaño.
 *
 * Sin esto, Leaflet mide el contenedor antes de que la rejilla CSS lo dimensione y el
 * país queda diminuto en una esquina. Extraído de MapaCoropletaDepartamentos para
 * compartirlo con MapaCoropletaMunicipios: era el mismo componente en los dos.
 */
export default function AjustarALimites() {
  const map = useMap();

  useEffect(() => {
    const ajustar = () => {
      map.invalidateSize();
      map.fitBounds(COL_BOUNDS, { padding: [8, 8] });
    };
    ajustar();
    const t = setTimeout(ajustar, 180);

    const contenedor = map.getContainer();
    const observer = new ResizeObserver(ajustar);
    observer.observe(contenedor);

    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, [map]);

  return null;
}
