"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, CircleMarker, Popup, ZoomControl, Marker } from "react-leaflet";
import L from "leaflet";
import { COL_BOUNDS, MAP_TOOLTIP_STYLES } from "@/components/maps/mapUtils";
import DepartmentGeoJsonLayer from "@/components/maps/DepartmentGeoJsonLayer";
import { useDepartmentMapGeo } from "@/components/maps/useDepartmentMapGeo";
import type { DptoRow } from "@/types/mapa-departamentos";

export interface FenogePunto {
  nombre: string;
  municipio: string;
  departamentoGeo: string;
  fase: string;
  lat: number;
  lng: number;
  capacidad: number | null;
}

const FASE_DOT: Record<string, string> = {
  "1_0":           "#F59E0B",
  "1_1":           "#06B6D4",
  "CE":            "#8B5CF6",
  "Sin clasificar":"#475569",
};

export const FASE_LABELS: Record<string, string> = {
  "1_0": "Fenoge 1.0",
  "1_1": "Fenoge 1.1",
  "CE":  "CE",
};

interface DeptAvg {
  avgKwp: number | null;
  avgBenef: number | null;
  avgInv: number | null;
  sumBenef: number;
}

interface Props {
  geoData: object | null;
  puntos: FenogePunto[];
  selectedDept: string | null;
  isDark: boolean;
  deptColors: Record<string, string>;
  onSelectDept: (dept: string | null) => void;
  porDepartamento: DptoRow[];
  deptAvgs: Record<string, DeptAvg>;
}

export default function FenogeCEMap({ geoData, puntos, selectedDept, isDark, deptColors, onSelectDept, porDepartamento, deptAvgs }: Props) {
  const { transformedGeoData, jittered, deptLabels } = useDepartmentMapGeo(geoData, puntos);

  if (!transformedGeoData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    );
  }

  const fillBase  = isDark ? "#152840" : "#CBD5E1";
  const strokeCol = isDark ? "#475569" : "#64748B";
  const bgColor   = isDark ? "#0D1B2E" : "#F1F5F9";

  const LEGEND_ITEMS = [
    { label: "Fenoge 1.0", c: "#F59E0B" },
    { label: "Fenoge 1.1", c: "#06B6D4" },
    { label: "CE", c: "#8B5CF6" },
    { label: "Sin clasificar", c: "#475569" },
  ];

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <style>{MAP_TOOLTIP_STYLES}</style>
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
      <DepartmentGeoJsonLayer
        transformedGeoData={transformedGeoData}
        selectedDept={selectedDept}
        isDark={isDark}
        deptColors={deptColors}
        onSelectDept={onSelectDept}
        porDepartamento={porDepartamento}
        deptAvgs={deptAvgs}
      />
      {jittered.map((p, idx) => {
        const color = FASE_DOT[p.fase] ?? "#475569";
        const faseLabel = FASE_LABELS[p.fase] ?? p.fase;
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
                <span>Fase: </span><strong style={{ color }}>{faseLabel}</strong>
                {p.capacidad != null && (
                  <><br /><span>Capacidad: <strong>{p.capacidad} kWp</strong></span></>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Etiquetas de nombre de departamento */}
      {deptLabels.map((label) => (
        <Marker
          key={`label-${label.name}`}
          position={[label.lat, label.lng]}
          icon={L.divIcon({
            className: "dept-label-icon",
            html: `<span class="dept-label-text">${label.name}</span>`,
            iconSize: [100, 20],
            iconAnchor: [50, 10],
          })}
        />
      ))}
    </MapContainer>

    {/* Leyenda flotante */}
    <div style={{
      position: "absolute",
      bottom: 12,
      left: 12,
      zIndex: 1000,
      background: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(4px)",
      borderRadius: 8,
      padding: "6px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 3,
      border: `1px solid ${isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(203, 213, 225, 0.6)"}`,
      fontSize: 10,
      lineHeight: 1.4,
      pointerEvents: "none",
    }}>
      <span style={{
        fontWeight: 600,
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: isDark ? "#94A3B8" : "#64748B",
        marginBottom: 2,
      }}>Fases</span>
      {LEGEND_ITEMS.map(({ label, c }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: c,
            flexShrink: 0,
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          }} />
          <span style={{ color: isDark ? "#CBD5E1" : "#334155" }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
  );
}
