"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, ZoomControl, Marker } from "react-leaflet";
import L from "leaflet";
import { COL_BOUNDS, MAP_TOOLTIP_STYLES } from "@/components/maps/mapUtils";
import DepartmentGeoJsonLayer from "@/components/maps/DepartmentGeoJsonLayer";
import { useDepartmentMapGeo } from "@/components/maps/useDepartmentMapGeo";
import type { DptoRow } from "@/types/mapa-departamentos";
import type { ResumenDepartamento } from "@/types/ontologia";

interface Props {
  geoData: object | null;
  selectedDept: string | null;
  isDark: boolean;
  deptColors: Record<string, string>;
  onSelectDept: (dept: string | null) => void;
  porDepartamento: DptoRow[];
  /** Resúmenes completos (los 6 conteos), indexados por `departamentoGeo` normalizado. */
  resumenesPorDepto: Record<string, ResumenDepartamento>;
}

const CONTEO_LABELS: Array<{ key: keyof ResumenDepartamento; label: string }> = [
  { key: "n_comunidades", label: "Comunidades energéticas" },
  { key: "n_contratos_or_fisico", label: "Contratos OR" },
  { key: "n_proyectos_fenoge", label: "Proyectos FENOGÉ" },
  { key: "n_proyectos_colombia_solar", label: "Colombia Solar" },
  { key: "n_registros_subsidios_mapa", label: "Registros subsidios" },
  { key: "n_contratos_supervision", label: "Contratos supervisión" },
];

export default function VistaDepartamentalMap({
  geoData,
  selectedDept,
  isDark,
  deptColors,
  onSelectDept,
  porDepartamento,
  resumenesPorDepto,
}: Props) {
  const { transformedGeoData, deptLabels } = useDepartmentMapGeo(geoData, []);

  if (!transformedGeoData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    );
  }

  const bgColor = isDark ? "#0D1B2E" : "#F1F5F9";

  const LEGEND_ITEMS = [
    { label: "Alta actividad", c: "#F59E0B" },
    { label: "Media actividad", c: "#D97706" },
    { label: "Baja actividad", c: "#7C3A0A" },
    { label: "Sin datos", c: isDark ? "#152840" : "#CBD5E1" },
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
          deptAvgs={{}}
          renderTooltip={(dept) => {
            const resumen = resumenesPorDepto[dept.departamentoGeo];
            if (!resumen) return [`Actividad total: <strong>${dept.count}</strong>`];
            return CONTEO_LABELS.map(
              ({ key, label }) => `${label}: <strong>${resumen[key]}</strong>`
            );
          }}
        />
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
      <div
        style={{
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
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: isDark ? "#94A3B8" : "#64748B",
            marginBottom: 2,
          }}
        >
          Actividad total por depto.
        </span>
        {LEGEND_ITEMS.map(({ label, c }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: c,
                flexShrink: 0,
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              }}
            />
            <span style={{ color: isDark ? "#CBD5E1" : "#334155" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
