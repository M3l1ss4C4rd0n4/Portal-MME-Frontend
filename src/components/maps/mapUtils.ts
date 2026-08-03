/**
 * Utilidades compartidas para los mapas Leaflet de Colombia (ComunidadesMap,
 * FenogeCEMap). Extraídas por ser código idéntico duplicado en ambos archivos —
 * solo lógica geométrica/pura, sin JSX, así que la extracción no cambia ningún
 * comportamiento visual (mismos valores, misma ejecución, un solo lugar).
 */

import type { LatLngBoundsExpression } from "leaflet";

/** Bounds para Colombia continental + inset San Andrés. */
export const COL_BOUNDS: LatLngBoundsExpression = [[-4.2, -80.5], [13.6, -66.8]];

/**
 * San Andrés real: ~12.9°N, -81.6°W → se traslada +3.2° lng para inset cerca de
 * la costa caribe (evita que quede fuera del recuadro visible del mapa).
 */
export const SAN_ANDRES_KEY = "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA";
export const SA_LNG_OFFSET = 3.2;

/** Desplaza todos los pares [lng, lat] de una geometría GeoJSON. */
export function shiftGeometryLng(geom: any, offset: number): void {
  if (!geom) return;
  if (geom.type === "Point") {
    geom.coordinates[0] += offset;
  } else if (geom.type === "MultiPoint" || geom.type === "LineString") {
    for (const c of geom.coordinates) c[0] += offset;
  } else if (geom.type === "MultiLineString" || geom.type === "Polygon") {
    for (const ring of geom.coordinates) for (const c of ring) c[0] += offset;
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) for (const ring of poly) for (const c of ring) c[0] += offset;
  }
}

/** Jitter determinístico para puntos que comparten coordenadas exactas. */
export function applyJitter<T extends { lat: number; lng: number }>(
  puntos: T[]
): (T & { jLat: number; jLng: number })[] {
  const countMap = new Map<string, number>();
  const idxMap = new Map<string, number>();
  for (const p of puntos) {
    const k = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
  }
  return puntos.map((p) => {
    const k = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    const n = countMap.get(k) ?? 1;
    const i = idxMap.get(k) ?? 0;
    idxMap.set(k, i + 1);
    if (n === 1) return { ...p, jLat: p.lat, jLng: p.lng };
    const angle = (i / n) * 2 * Math.PI;
    const r = 0.012; // ~1.3 km
    return { ...p, jLat: p.lat + r * Math.sin(angle), jLng: p.lng + r * Math.cos(angle) };
  });
}

/** Centroides aproximados (bbox-center) de cada departamento, para las etiquetas del mapa. */
export function computeDeptCentroids(geoData: any): Array<{ name: string; lat: number; lng: number }> {
  if (!geoData?.features) return [];
  const labels: Array<{ name: string; lat: number; lng: number }> = [];
  for (const feat of geoData.features) {
    const name = feat?.properties?.NOMBRE_DPT ?? "";
    if (!name || !feat.geometry) continue;
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    const extract = (geom: any) => {
      if (!geom) return;
      if (geom.type === "Point") {
        minLat = Math.min(minLat, geom.coordinates[1]);
        maxLat = Math.max(maxLat, geom.coordinates[1]);
        minLng = Math.min(minLng, geom.coordinates[0]);
        maxLng = Math.max(maxLng, geom.coordinates[0]);
      } else if (geom.type === "MultiPoint" || geom.type === "LineString") {
        for (const c of geom.coordinates) extract({ type: "Point", coordinates: c });
      } else if (geom.type === "MultiLineString" || geom.type === "Polygon") {
        for (const ring of geom.coordinates) extract({ type: "LineString", coordinates: ring });
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) for (const ring of poly) extract({ type: "LineString", coordinates: ring });
      }
    };
    extract(feat.geometry);
    if (minLat !== Infinity) labels.push({ name, lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 });
  }
  return labels;
}

/** CSS de tooltips/labels de departamento compartido entre ambos mapas. */
export const MAP_TOOLTIP_STYLES = `
  .dept-tooltip {
    background: #0F172A !important;
    color: #E2E8F0 !important;
    border: 1px solid rgba(100, 116, 139, 0.4) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
    font-family: inherit !important;
    font-size: 12px !important;
    line-height: 1.7 !important;
    padding: 8px 12px !important;
    border-radius: 8px !important;
    font-weight: 400 !important;
  }
  .dept-tooltip::before {
    border-top-color: rgba(100, 116, 139, 0.4) !important;
  }
  .dept-label-icon {
    background: none !important;
    border: none !important;
  }
  .dept-label-text {
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5);
    white-space: nowrap;
    pointer-events: none;
    font-family: inherit;
    line-height: 1.2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
`;
