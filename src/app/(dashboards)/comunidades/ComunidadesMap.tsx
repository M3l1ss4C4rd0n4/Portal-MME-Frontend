"use client";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, GeoJSON, CircleMarker, Popup, ZoomControl, Pane, Marker } from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";

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
  inversion_estimada?: number | null;
  inversion_final?: number | null;
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

const ESTADO_DOT: Record<string, string> = {
  "Operación":    "#22C55E",
  "Inicial":      "#F59E0B",
  "Sin registrar": "#64748B",
  "Desistida":    "#EF4444",
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
  porDepartamento: DptoRow[];
  deptAvgs: Record<string, DeptAvg>;
}

function computeDeptCentroids(geoData: any): Array<{ name: string; lat: number; lng: number }> {
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

  const tooltipStyles = `
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
      <style>{tooltipStyles}</style>
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
      <style>{tooltipStyles}</style>
      <Pane name="departments" style={{ zIndex: 350 }}>
        <GeoJSON
        key={`geo-${selectedDept ?? "all"}-${String(isDark)}-${Object.keys(deptColors).length}`}
        data={transformedGeoData as any}
        style={(feature?: any) => {
          const rawName: string = feature?.properties?.NOMBRE_DPT ?? "";
          const nombre = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const isSelected = selectedDept != null && nombre === selectedDept.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const dataColor  = deptColors[nombre];
          return {
            fillColor:   isSelected ? "#F59E0B" : (dataColor ?? fillBase),
            fillOpacity: isSelected ? 0.7 : (dataColor ? 0.6 : (isDark ? 0.85 : 0.9)),
            color:       isSelected ? "#F59E0B" : strokeCol,
            weight:      isSelected ? 2.5 : 2,
          };
        }}
        onEachFeature={(feature: any, layer: any) => {
          const rawName: string = feature?.properties?.NOMBRE_DPT ?? "";
          const nombre = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const normSelected = selectedDept?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          const dataColor = deptColors[nombre];
          const baseOpacity = dataColor ? 0.6 : (isDark ? 0.85 : 0.9);
          layer.on("click", () => onSelectDept(normSelected === nombre ? null : nombre));
          layer.on("mouseover", (e: any) => {
            if (nombre !== normSelected) e.target.setStyle({ fillOpacity: baseOpacity - 0.2 });
          });
          layer.on("mouseout", (e: any) => {
            if (nombre !== normSelected) e.target.setStyle({ fillOpacity: baseOpacity });
          });
          // Tooltip con info del departamento al hacer hover
          const deptInfo = porDepartamento.find(d =>
            d.departamentoGeo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === nombre
          );
          if (!deptInfo) return;
          const deptAvg = deptAvgs[nombre];
          const nomFormateado = rawName
            .split(" ")
            .map((w: string) => w[0] + w.slice(1).toLowerCase())
            .join(" ");
          const tooltipLines = [
            `<strong style="font-size:13px">${nomFormateado}</strong>`,
            `CEs: <strong>${deptInfo.count}</strong>`,
            `Capacidad: <strong>${Math.round(deptInfo.capacidad).toLocaleString("es-CO")} kWp</strong>`,
            `Inversión: <strong>$${Math.round(deptInfo.inversion).toLocaleString("es-CO")}</strong>`,
          ];
          if (deptAvg?.avgInv != null) {
            tooltipLines.push(`Prom. inversión/CE: <strong>$${Math.round(deptAvg.avgInv).toLocaleString("es-CO")}</strong>`);
          }
          layer.bindTooltip(tooltipLines.join("<br/>"), { sticky: true, direction: "top", className: "dept-tooltip" });
        }}
        />
      </Pane>
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
        const dotColor = ESTADO_DOT[p.estado_actual ?? ""] ?? "#A78BFA";
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
  </div>
  );
}
