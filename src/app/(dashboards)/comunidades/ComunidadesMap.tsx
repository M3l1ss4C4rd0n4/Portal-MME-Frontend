"use client";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, GeoJSON, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

export interface CePunto {
  nombre: string;
  municipio: string;
  departamentoGeo: string;
  zona: string;
  lat: number;
  lng: number;
  capacidad: number | null;
}

const ZONA_DOT: Record<string, string> = {
  SIN:              "#F59E0B",
  MIXTO:            "#06B6D4",
  ZNI:              "#8B5CF6",
  "Sin clasificar": "#475569",
};

// Bounds para Colombia continental + inset San Andrés
const COL_BOUNDS: LatLngBoundsExpression = [[-4.2, -80.5], [13.6, -66.8]];

// San Andrés real: ~12.9°N, -81.6°W → se traslada +3.2° lng para inset cerca de la costa caribe
const SAN_ANDRES_KEY = "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA";
const SA_LNG_OFFSET  = 3.2;

// Desplaza todos los pares [lng, lat] de una geometría GeoJSON
function shiftGeometryLng(geom: any, offset: number): void {
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

interface Props {
  geoData: object | null;
  puntos: CePunto[];
  selectedDept: string | null;
  isDark: boolean;
  deptColors: Record<string, string>;
  onSelectDept: (dept: string | null) => void;
}

// Jitter determinístico para puntos que comparten coordenadas exactas
function applyJitter(puntos: CePunto[]): (CePunto & { jLat: number; jLng: number })[] {
  const countMap = new Map<string, number>();
  const idxMap   = new Map<string, number>();
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

export default function ComunidadesMap({ geoData, puntos, selectedDept, isDark, deptColors, onSelectDept }: Props) {
  // Clonar GeoJSON y trasladar San Andrés a posición de inset
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

  // Trasladar también los puntos de San Andrés por el mismo offset
  const jittered = useMemo(() => {
    const adjusted = puntos.map(p =>
      p.departamentoGeo === SAN_ANDRES_KEY
        ? { ...p, lng: p.lng + SA_LNG_OFFSET }
        : p
    );
    return applyJitter(adjusted);
  }, [puntos]);

  if (!transformedGeoData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    );
  }

  const fillBase  = isDark ? "#152840" : "#CBD5E1";
  const strokeCol = isDark ? "#0A1628" : "#94A3B8";
  const bgColor   = isDark ? "#0D1B2E" : "#F1F5F9";

  return (
    <MapContainer
      bounds={COL_BOUNDS}
      boundsOptions={{ padding: [8, 8] }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={true}
      dragging={true}
      style={{ height: "100%", width: "100%", background: bgColor, borderRadius: "0.5rem" }}
    >
      <ZoomControl position="bottomright" />
      <GeoJSON
        key={`geo-${selectedDept ?? "all"}-${String(isDark)}-${Object.keys(deptColors).length}`}
        data={transformedGeoData as any}
        style={(feature?: any) => {
          const nombre: string = feature?.properties?.NOMBRE_DPT ?? "";
          const isSelected = nombre === selectedDept;
          const dataColor  = deptColors[nombre];
          return {
            fillColor:   isSelected ? "#F59E0B" : (dataColor ?? fillBase),
            fillOpacity: isSelected ? 0.65 : (dataColor ? 0.55 : (isDark ? 0.75 : 0.8)),
            color:       strokeCol,
            weight:      0.8,
          };
        }}
        onEachFeature={(feature: any, layer: any) => {
          const nombre: string = feature?.properties?.NOMBRE_DPT ?? "";
          const dataColor = deptColors[nombre];
          const baseOpacity = dataColor ? 0.55 : (isDark ? 0.75 : 0.8);
          layer.on("click", () => onSelectDept(selectedDept === nombre ? null : nombre));
          layer.on("mouseover", (e: any) => {
            if (nombre !== selectedDept) e.target.setStyle({ fillOpacity: baseOpacity - 0.2 });
          });
          layer.on("mouseout", (e: any) => {
            if (nombre !== selectedDept) e.target.setStyle({ fillOpacity: baseOpacity });
          });
        }}
      />
      {jittered.map((p, idx) => {
        const color = ZONA_DOT[p.zona] ?? "#475569";
        return (
          <CircleMarker
            key={idx}
            center={[p.jLat, p.jLng]}
            radius={4.5}
            pathOptions={{ color: "#000", weight: 0.8, fillColor: color, fillOpacity: 1 }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: "1.5", minWidth: 170 }}>
                <strong style={{ display: "block", marginBottom: 3 }}>{p.nombre}</strong>
                <span>{p.municipio}</span><br />
                <span style={{ color: "#64748B" }}>
                  {p.departamentoGeo.split(" ").map((w: string) => w[0] + w.slice(1).toLowerCase()).join(" ")}
                </span><br />
                <span>Zona: </span><strong style={{ color }}>{p.zona}</strong>
                {p.capacidad != null && (
                  <><br /><span>Capacidad: <strong>{p.capacidad} kWp</strong></span></>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
