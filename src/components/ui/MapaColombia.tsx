"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MapContainer, GeoJSON, ZoomControl } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { DepartamentoData } from "@/mocks/colombia-data";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";

// Bounds para Colombia continental + inset San Andrés
const COL_BOUNDS: LatLngBoundsExpression = [[-4.2, -80.5], [13.6, -66.8]];

const SAN_ANDRES_KEY = "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA";
const SA_LNG_OFFSET  = 3.2;

// Mapeo id mock → NOMBRE_DPT del GeoJSON
const ID_TO_GEO: Record<string, string> = {
  BOG:  "SANTAFE DE BOGOTA D.C",
  ANT:  "ANTIOQUIA",
  VAL:  "VALLE DEL CAUCA",
  ATL:  "ATLANTICO",
  BOL:  "BOLIVAR",
  SANT: "SANTANDER",
  CUN:  "CUNDINAMARCA",
  COR:  "CORDOBA",
  NAR:  "NARINO",
  TOL:  "TOLIMA",
};

function getCoverageColor(cobertura: number): string {
  if (cobertura >= 98) return "#10B981";
  if (cobertura >= 95) return "#3B82F6";
  if (cobertura >= 90) return "#F59E0B";
  return "#EF4444";
}

function shiftGeometryLng(geom: any, offset: number): void {
  if (!geom) return;
  if (geom.type === "Point") { geom.coordinates[0] += offset; return; }
  if (geom.type === "MultiPoint" || geom.type === "LineString") {
    for (const c of geom.coordinates) c[0] += offset; return;
  }
  if (geom.type === "MultiLineString" || geom.type === "Polygon") {
    for (const ring of geom.coordinates) for (const c of ring) c[0] += offset; return;
  }
  if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) for (const ring of poly) for (const c of ring) c[0] += offset;
  }
}

interface MapaColombiaProps {
  departamentos: DepartamentoData[];
  departamentoSeleccionado: string | null;
  onSelectDepartamento: (id: string | null) => void;
  className?: string;
}

export default function MapaColombia({
  departamentos,
  departamentoSeleccionado,
  onSelectDepartamento,
  className,
}: MapaColombiaProps) {
  const [geoData, setGeoData] = useState<object | null>(null);
  const { resolvedTheme, mounted } = useTheme();
  const isDark = !mounted || resolvedTheme === "dark";

  // Fetch GeoJSON
  useEffect(() => {
    fetch("/departamentos_colombia.geojson")
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);
  }, []);

  // geoName → DepartamentoData
  const deptoByGeo = useMemo(() => {
    const map: Record<string, DepartamentoData> = {};
    for (const d of departamentos) {
      const geoName = ID_TO_GEO[d.id];
      if (geoName) map[geoName] = d;
    }
    return map;
  }, [departamentos]);

  // id mock → nombre GeoJSON del seleccionado
  const selectedGeoName = useMemo(
    () => (departamentoSeleccionado ? (ID_TO_GEO[departamentoSeleccionado] ?? null) : null),
    [departamentoSeleccionado]
  );

  // Clonar GeoJSON y desplazar San Andrés como inset
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

  const bgColor   = isDark ? "#0D1B2E" : "#F1F5F9";
  const fillBase  = isDark ? "#1E3A5F" : "#CBD5E1";
  const strokeCol = isDark ? "#0A1628" : "#94A3B8";

  if (!transformedGeoData) {
    return (
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center",
          isDark ? "bg-[#0D1B2E]" : "bg-slate-100",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs text-theme-muted">Cargando mapa…</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative rounded-2xl overflow-hidden border",
        isDark ? "border-gray-800" : "border-gray-200",
        className
      )}
    >
      {/* Indicador de departamento seleccionado */}
      {departamentoSeleccionado && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute top-3 left-3 z-[400] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg border backdrop-blur-sm",
            isDark
              ? "bg-[#0F172A]/90 border-amber-500/30 text-amber-400"
              : "bg-white/90 border-amber-400/40 text-amber-600"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {departamentos.find((d) => d.id === departamentoSeleccionado)?.nombre}
          <button
            onClick={() => onSelectDepartamento(null)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity font-bold"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Leyenda */}
      <div
        className={cn(
          "absolute bottom-8 right-3 z-[400] backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg border",
          isDark ? "bg-[#0F172A]/90 border-gray-700/60" : "bg-white/90 border-gray-200"
        )}
      >
        <p className={cn("text-[10px] font-semibold mb-2 uppercase tracking-wide", isDark ? "text-gray-400" : "text-gray-500")}>
          Cobertura eléctrica
        </p>
        {[
          { color: "#10B981", label: "≥ 98%" },
          { color: "#3B82F6", label: "95-97%" },
          { color: "#F59E0B", label: "90-94%" },
          { color: "#EF4444", label: "< 90%" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color, opacity: 0.75 }} />
            <span className={cn("text-[11px]", isDark ? "text-gray-400" : "text-gray-600")}>{label}</span>
          </div>
        ))}
        <div className={cn("mt-2 pt-2 flex items-center gap-2 border-t", isDark ? "border-gray-700/50" : "border-gray-200")}>
          <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-amber-500" />
          <span className={cn("text-[11px]", isDark ? "text-gray-400" : "text-gray-600")}>Seleccionado</span>
        </div>
        <p className={cn("text-[10px] mt-2 italic", isDark ? "text-gray-600" : "text-gray-400")}>
          Sin datos: gris
        </p>
      </div>

      <MapContainer
        bounds={COL_BOUNDS}
        boundsOptions={{ padding: [10, 10] }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true}
        dragging={true}
        style={{ height: "100%", width: "100%", background: bgColor }}
      >
        <ZoomControl position="bottomright" />
        <GeoJSON
          key={`geo-${selectedGeoName ?? "all"}-${String(isDark)}-${Object.keys(deptoByGeo).length}`}
          data={transformedGeoData as any}
          style={(feature?: any) => {
            const nombre: string = feature?.properties?.NOMBRE_DPT ?? "";
            const isSelected = nombre === selectedGeoName;
            const depto = deptoByGeo[nombre];
            const dataColor = depto ? getCoverageColor(depto.energia.cobertura) : null;
            return {
              fillColor:   isSelected ? "#F59E0B" : (dataColor ?? fillBase),
              fillOpacity: isSelected ? 0.80 : (dataColor ? 0.60 : (isDark ? 0.55 : 0.70)),
              color:       isSelected ? "#F59E0B" : strokeCol,
              weight:      isSelected ? 2.5 : 0.8,
            };
          }}
          onEachFeature={(feature: any, layer: any) => {
            const geoName: string = feature?.properties?.NOMBRE_DPT ?? "";
            const depto = deptoByGeo[geoName];
            const dataColor = depto ? getCoverageColor(depto.energia.cobertura) : null;
            const baseOpacity = dataColor ? 0.60 : (isDark ? 0.55 : 0.70);

            layer.on("click", () => {
              if (!depto) return;
              onSelectDepartamento(departamentoSeleccionado === depto.id ? null : depto.id);
            });

            layer.on("mouseover", (e: any) => {
              if (geoName !== selectedGeoName) {
                e.target.setStyle({ fillOpacity: 0.85, weight: 1.5, color: isDark ? "#94A3B8" : "#475569" });
              }
            });

            layer.on("mouseout", (e: any) => {
              if (geoName !== selectedGeoName) {
                e.target.setStyle({ fillOpacity: baseOpacity, weight: 0.8, color: strokeCol });
              }
            });

            if (depto) {
              const color = getCoverageColor(depto.energia.cobertura);
              layer.bindPopup(
                `<div style="min-width:190px;padding:4px 2px;font-family:system-ui,sans-serif">
                  <strong style="font-size:13px;display:block;margin-bottom:8px;color:#0F172A">${depto.nombre}</strong>
                  <div style="display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:11.5px">
                    <span style="color:#64748B">Generación</span>
                    <span style="font-weight:600;color:#0F172A">${depto.energia.generacionGWh.toLocaleString("es-CO")} GWh</span>
                    <span style="color:#64748B">Cobertura</span>
                    <span style="font-weight:700;color:${color}">${depto.energia.cobertura}%</span>
                    <span style="color:#64748B">Usuarios</span>
                    <span style="font-weight:600;color:#0F172A">${(depto.energia.usuarios / 1e6).toFixed(2)}M</span>
                    <span style="color:#64748B">Cap. instalada</span>
                    <span style="font-weight:600;color:#0F172A">${depto.energia.capacidadInstalada.toLocaleString("es-CO")} MW</span>
                    <span style="color:#64748B">Comunidades E.</span>
                    <span style="font-weight:600;color:#0F172A">${depto.comunidadesEnergeticas}</span>
                  </div>
                  <div style="margin-top:8px;font-size:10px;color:#94A3B8;text-align:center">Click para seleccionar / deseleccionar</div>
                </div>`,
                { maxWidth: 240 }
              );
            }
          }}
        />
      </MapContainer>
    </motion.div>
  );
}
