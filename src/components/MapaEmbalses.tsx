"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { embalsesCoords, getEmbalseColor, getEmbalseRiesgo } from "@/lib/embalses-coords";

export interface EmbalseData {
  codigo: string;
  nombre: string;
  porcentaje: number;
  capacidadGwh?: number;
}

interface MapaEmbalsesProps {
  embalses: EmbalseData[];
  height?: string;
}

// Centro aproximado de Colombia
const COLOMBIA_CENTER: [number, number] = [4.5709, -74.2973];

// Radio base para círculos (ajustado por capacidad)
function calcRadius(capacidadGwh: number): number {
  if (!capacidadGwh || capacidadGwh <= 0) return 6;
  // Raíz cuadrada para que el área sea proporcional a la capacidad
  const base = Math.sqrt(capacidadGwh);
  // Escalar para que se vea bien en el mapa
  return Math.max(6, Math.min(28, base * 0.35));
}

export default function MapaEmbalses({ embalses, height = "300px" }: MapaEmbalsesProps) {
  const markers = useMemo(() => {
    return embalses
      .map((e) => {
        const coord = embalsesCoords[e.codigo];
        if (!coord) return null;
        return {
          ...e,
          lat: coord.lat,
          lng: coord.lng,
          color: getEmbalseColor(e.porcentaje),
          riesgo: getEmbalseRiesgo(e.porcentaje),
          radius: calcRadius(e.capacidadGwh ?? 0),
        };
      })
      .filter(Boolean) as Array<{
        codigo: string;
        nombre: string;
        porcentaje: number;
        capacidadGwh?: number;
        lat: number;
        lng: number;
        color: string;
        riesgo: string;
        radius: number;
      }>;
  }, [embalses]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ height }}>
      <MapContainer
        center={COLOMBIA_CENTER}
        zoom={6}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((m) => (
          <CircleMarker
            key={m.codigo}
            center={[m.lat, m.lng]}
            radius={m.radius}
            pathOptions={{
              fillColor: m.color,
              color: m.color,
              fillOpacity: 0.75,
              weight: 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -m.radius]} opacity={1} className="bg-slate-800 text-slate-100 border-slate-700">
              <div className="text-xs">
                <p className="font-bold">{m.nombre}</p>
                <p>
                  Volumen útil: <strong>{m.porcentaje}%</strong>
                </p>
                {m.capacidadGwh ? (
                  <p>Capacidad: {m.capacidadGwh.toLocaleString("es-CO")} GWh</p>
                ) : null}
                <p>
                  Riesgo: <span style={{ color: m.color }}>{m.riesgo}</span>
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Leyenda de semáforo */}
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-[10px]">
        <p className="font-bold text-slate-300 mb-1">Nivel de Riesgo</p>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
          <span className="text-slate-400">Riesgo BAJO</span>
        </div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span className="text-slate-400">Riesgo MEDIO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span className="text-slate-400">Riesgo ALTO</span>
        </div>
      </div>
    </div>
  );
}
