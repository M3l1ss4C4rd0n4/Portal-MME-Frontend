import { useMemo } from "react";
import {
  SAN_ANDRES_KEY,
  SA_LNG_OFFSET,
  shiftGeometryLng,
  applyJitter,
  computeDeptCentroids,
} from "@/components/maps/mapUtils";

/**
 * Preparación de datos geográficos compartida por ComunidadesMap y
 * FenogeCEMap: traslada San Andrés a la posición de inset (en el GeoJSON de
 * departamentos y en los puntos), aplica jitter a puntos con coordenadas
 * repetidas, y calcula los centroides para las etiquetas de departamento.
 * Verificado que esta lógica era byte-idéntica en ambos archivos antes de
 * extraerla. El JSX de cada mapa (orden de capas, leyendas) NO se unificó
 * aquí porque tiene diferencias reales entre los dos mapas, no solo
 * duplicación accidental.
 */
export function useDepartmentMapGeo<P extends { departamentoGeo: string; lat: number; lng: number }>(
  geoData: object | null,
  puntos: P[]
) {
  const transformedGeoData = useMemo(() => {
    if (!geoData) return null;
    const clone = JSON.parse(JSON.stringify(geoData));
    for (const feat of (clone as any).features) {
      if (feat.properties?.NOMBRE_DPT === SAN_ANDRES_KEY) {
        shiftGeometryLng(feat.geometry, SA_LNG_OFFSET);
      }
    }
    return clone;
  }, [geoData]);

  const jittered = useMemo(() => {
    const adjusted = puntos.map((p) =>
      p.departamentoGeo === SAN_ANDRES_KEY ? { ...p, lng: p.lng + SA_LNG_OFFSET } : p
    );
    return applyJitter(adjusted);
  }, [puntos]);

  const deptLabels = useMemo(() => computeDeptCentroids(transformedGeoData), [transformedGeoData]);

  return { transformedGeoData, jittered, deptLabels };
}
