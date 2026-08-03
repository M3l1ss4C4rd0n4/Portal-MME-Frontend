"use client";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, CircleMarker, Popup, ZoomControl, Marker } from "react-leaflet";
import L from "leaflet";
import {
  COL_BOUNDS,
  SAN_ANDRES_KEY,
  SA_LNG_OFFSET,
  shiftGeometryLng,
  applyJitter,
  computeDeptCentroids,
  MAP_TOOLTIP_STYLES,
} from "@/components/maps/mapUtils";
import DepartmentGeoJsonLayer from "@/components/maps/DepartmentGeoJsonLayer";

export interface CePunto {
  nombre: string;
  municipio: string;
  departamentoGeo: string;
  zona: string;
  lat: number;
  lng: number;
  capacidad: number | null;
  estado_actual?: string;
  tipo_ce?: string;
  fuentes_energia?: string;
  etnia?: string;
  ejecutor?: string;
  inversion_estimada?: number | null;
}

const ZONA_DOT: Record<string, string> = {
  SIN:              "#F59E0B",
  MIXTO:            "#06B6D4",
  ZNI:              "#8B5CF6",
  "Sin clasificar": "#475569",
};

interface DptoRow {
  departamento: string;
  departamentoGeo: string;
  count: number;
  capacidad: number;
  inversion: number;
}

interface DeptAvg {
  avgInv: number | null;
  sumUsu: number;
  sumBenef: number;
}

// Nota: #F59E0B (ámbar) está reservado para la leyenda de departamentos
// (sombreado "Alta" + selección) — no reutilizar aquí para evitar que un
// punto y un departamento del mismo color se confundan visualmente.
const ESTADO_DOT: Record<string, string> = {
  "OPERACIÓN":          "#22C55E",
  "INICIAL":            "#F97316",
  "INICIAL - PRÓRROGA": "#3B82F6",
  "SIN REGISTRAR":      "#64748B",
  "TRÁMITE":            "#64748B",
};
const ESTADO_FALLBACK = "#A78BFA"; // sin estado_actual registrado
// "TRÁMITE" comparte color con "SIN REGISTRAR" (mismo concepto, ver ESTADO_DOT)
// por eso ambos usan la misma etiqueta — evita dos entradas grises distintas en la leyenda.
const ESTADO_LABELS: Record<string, string> = {
  "OPERACIÓN":          "Operación",
  "INICIAL":            "Inicial",
  "INICIAL - PRÓRROGA": "Inicial - Prórroga",
  "SIN REGISTRAR":      "Sin registrar",
  "TRÁMITE":            "Sin registrar",
};

interface Props {
  geoData: object | null;
  puntos: CePunto[];
  selectedDept: string | null;
  isDark: boolean;
  deptColors: Record<string, string>;
  onSelectDept: (dept: string | null) => void;
  porDepartamento: DptoRow[];
  deptAvgs: Record<string, DeptAvg>;
}

export default function ComunidadesMap({ geoData, puntos, selectedDept, isDark, deptColors, onSelectDept, porDepartamento, deptAvgs }: Props) {
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

  const deptLabels = useMemo(() => computeDeptCentroids(transformedGeoData), [transformedGeoData]);

  // Leyenda de estado: solo muestra los colores que realmente aparecen entre
  // los puntos visibles — evita listar estados que no existen en la fuente actual.
  const estadoLegendItems = useMemo(() => {
    const coloresPresentes = new Set(
      puntos.map(p => ESTADO_DOT[p.estado_actual ?? ""] ?? ESTADO_FALLBACK)
    );
    const items: { label: string; c: string }[] = [];
    const usados = new Set<string>();
    for (const [estado, color] of Object.entries(ESTADO_DOT)) {
      if (coloresPresentes.has(color) && !usados.has(color)) {
        items.push({ label: ESTADO_LABELS[estado] ?? estado, c: color });
        usados.add(color);
      }
    }
    if (coloresPresentes.has(ESTADO_FALLBACK)) {
      items.push({ label: "Sin estado", c: ESTADO_FALLBACK });
    }
    return items;
  }, [puntos]);

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



  // ─── Legend ──────────────────────────────────────────────
  const LEGEND_ITEMS = [
    { label: "Alta (≥60)", c: "#F59E0B" },
    { label: "Media (20-59)", c: "#D97706" },
    { label: "Baja (<20)", c: "#7C3A0A" },
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
      <style>{MAP_TOOLTIP_STYLES}</style>
      <DepartmentGeoJsonLayer
        transformedGeoData={transformedGeoData}
        selectedDept={selectedDept}
        isDark={isDark}
        deptColors={deptColors}
        onSelectDept={onSelectDept}
        porDepartamento={porDepartamento}
        deptAvgs={deptAvgs}
      />
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
      {jittered.map((p, idx) => {
        const dotColor = ESTADO_DOT[p.estado_actual ?? ""] ?? ESTADO_FALLBACK;
        const zonaColor = ZONA_DOT[p.zona] ?? "#475569";
        return (
          <CircleMarker
            key={idx}
            center={[p.jLat, p.jLng]}
            radius={5.5}
            pathOptions={{ color: "#1E293B", weight: 1.2, fillColor: dotColor, fillOpacity: 0.95 }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: "1.5", minWidth: 190 }}>
                <strong style={{ display: "block", marginBottom: 3, fontSize: 13 }}>{p.nombre}</strong>
                <span style={{ color: "var(--text-secondary)" }}>{p.municipio}</span><br />
                <span style={{ color: "#64748B", fontSize: 11 }}>
                  {p.departamentoGeo.split(" ").map((w: string) => w[0] + w.slice(1).toLowerCase()).join(" ")}
                </span>
                {p.estado_actual && (
                  <><br /><span style={{ fontSize: 11 }}>Estado: <strong>{p.estado_actual}</strong></span></>
                )}
                {p.tipo_ce && (
                  <><br /><span style={{ fontSize: 11 }}>Tipo: <strong>{p.tipo_ce}</strong></span></>
                )}
                {p.fuentes_energia && (
                  <><br /><span style={{ fontSize: 11 }}>Fuente: <strong>{p.fuentes_energia}</strong></span></>
                )}
                {p.etnia && (
                  <><br /><span style={{ fontSize: 11 }}>Etnia: <strong>{p.etnia}</strong></span></>
                )}
                {p.ejecutor && (
                  <><br /><span style={{ fontSize: 11 }}>Ejecutor: <strong>{p.ejecutor}</strong></span></>
                )}
                <br /><span style={{ fontSize: 11 }}>Zona: </span><strong style={{ color: zonaColor, fontSize: 11 }}>{p.zona}</strong>
                {p.capacidad != null && (
                  <><br /><span style={{ fontSize: 11 }}>Capacidad: <strong>{p.capacidad} kWp</strong></span></>
                )}
                {p.inversion_estimada != null && (
                  <><br /><span style={{ fontSize: 11 }}>Inversión: <strong style={{ color: "#34D399" }}>
                    ${Math.round(p.inversion_estimada).toLocaleString("es-CO")}
                  </strong></span></>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
    {/* Leyenda flotante */}
    <div style={{
      position: "absolute",
      bottom: 12,
      left: 12,
      zIndex: 1000,
      display: "flex",
      flexDirection: "row",
      gap: 8,
      pointerEvents: "none",
    }}>
      <div style={{
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
      }}>
        <span style={{
          fontWeight: 600,
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: isDark ? "#94A3B8" : "#64748B",
          marginBottom: 2,
        }}>CEs por dpto.</span>
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
      {estadoLegendItems.length > 0 && (
        <div style={{
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
        }}>
          <span style={{
            fontWeight: 600,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: isDark ? "#94A3B8" : "#64748B",
            marginBottom: 2,
          }}>Estado (punto)</span>
          {estadoLegendItems.map(({ label, c }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: c,
                flexShrink: 0,
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              }} />
              <span style={{ color: isDark ? "#CBD5E1" : "#334155" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
}
