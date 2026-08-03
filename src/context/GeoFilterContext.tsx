"use client";

/**
 * Filtro de departamento compartido entre dashboards (Fase 3 — infraestructura
 * aditiva). Ningún dashboard existente lo consume todavía: montar el Provider
 * no cambia el comportamiento de nada, solo deja el contexto disponible para
 * que futuros dashboards opten por sincronizar su selección de departamento
 * (ej. con el código DANE que ya expone /v1/ontologia/geografia).
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface GeoFilterContextValue {
  /** Código DANE de 2 dígitos del departamento seleccionado, o null si no hay selección. */
  codigoDaneDepartamento: string | null;
  setCodigoDaneDepartamento: (codigo: string | null) => void;
}

const GeoFilterContext = createContext<GeoFilterContextValue | undefined>(undefined);

export function GeoFilterProvider({ children }: { children: ReactNode }) {
  const [codigoDaneDepartamento, setCodigoDaneDepartamento] = useState<string | null>(null);

  const value = useMemo(
    () => ({ codigoDaneDepartamento, setCodigoDaneDepartamento }),
    [codigoDaneDepartamento]
  );

  return <GeoFilterContext.Provider value={value}>{children}</GeoFilterContext.Provider>;
}

/** Debe usarse dentro de <GeoFilterProvider> (montado en el layout raíz). */
export function useGeoFilter(): GeoFilterContextValue {
  const ctx = useContext(GeoFilterContext);
  if (!ctx) {
    throw new Error("useGeoFilter() debe usarse dentro de <GeoFilterProvider>");
  }
  return ctx;
}
