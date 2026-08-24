"use client";

import { useState, useEffect } from "react";

export interface DiagnosticoIA {
  texto: string;
  generadoEn: string;
}

export type DiagnosticosIAMap = Record<string, DiagnosticoIA>;

/**
 * Diagnósticos de HomeSlider generados por IA una vez al día (Fase 11),
 * cacheados en sector_energetico.diagnosticos_ia. Si la tarea diaria aún no
 * corrió o falló, devuelve un mapa vacío — el componente que use este hook
 * debe caer a su propio texto determinístico cuando la clave del slide no
 * está presente, nunca debe romper por esto.
 */
export function useDiagnosticosIA(): DiagnosticosIAMap {
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticosIAMap>({});

  useEffect(() => {
    fetch("/api/sector/diagnosticos-ia")
      .then((r) => r.json())
      .then((json) => {
        if (json?.diagnosticos) setDiagnosticos(json.diagnosticos);
      })
      .catch(() => undefined);
  }, []);

  return diagnosticos;
}
