"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { embalsesCoords, getEmbalseColor, getEmbalseRiesgo } from "@/lib/embalses-coords";

const ColombiaMap = dynamic(
  () => import("@react-map/colombia").then((m) => m.default),
  { ssr: false, loading: () => <div className="w-full h-full bg-dash-chip animate-pulse rounded-lg" /> }
);

export interface EmbalseData {
  codigo: string;
  nombre: string;
  porcentaje: number;
  capacidadGwh?: number;
}

interface MapaEmbalsesSVGProps {
  embalses: EmbalseData[];
  height?: string;
}

/**
 * Transforma coordenadas geográficas (lat, lng) a porcentajes (x, y)
 * dentro del contenedor del SVG de Colombia.
 *
 * El bounding box está calibrado visualmente para que los círculos
 * caigan aproximadamente sobre las regiones correctas del mapa.
 */
function geoToPercent(lat: number, lng: number): { x: number; y: number } {
  const minLng = -79.0;
  const maxLng = -66.5;
  const minLat = -4.5;
  const maxLat = 13.5;

  let x = ((lng - minLng) / (maxLng - minLng)) * 100;
  let y = ((maxLat - lat) / (maxLat - minLat)) * 100;

  // Ajustes finos para calzar con el SVG de @react-map/colombia
  x = x * 0.94 + 3;
  y = y * 0.90 + 5;

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

function calcRadius(capacidadGwh: number): number {
  if (!capacidadGwh || capacidadGwh <= 0) return 1.8;
  const base = Math.sqrt(capacidadGwh);
  return Math.max(1.8, Math.min(5.5, base * 0.12));
}

export default function MapaEmbalsesSVG({ embalses, height = "180px" }: MapaEmbalsesSVGProps) {
  const markers = useMemo(() => {
    return embalses
      .map((e) => {
        const coord = embalsesCoords[e.codigo];
        if (!coord) return null;
        const pos = geoToPercent(coord.lat, coord.lng);
        return {
          ...e,
          x: pos.x,
          y: pos.y,
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
        x: number;
        y: number;
        color: string;
        riesgo: string;
        radius: number;
      }>;
  }, [embalses]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ height }}>
      {/* Fondo: Mapa SVG de Colombia (estilo oscuro) */}
      <div className="absolute inset-0">
        <ColombiaMap
          type="select-single"
          size={320}
          mapColor="#1E3A5F"
          strokeColor="#0F172A"
          strokeWidth={0.6}
          hoverColor="transparent"
          selectColor="transparent"
          cityColors={{}}
          onSelect={() => {}}
        />
      </div>

      {/* Capa SVG superpuesta con círculos de embalse */}
      <svg
        className="absolute inset-0 w-full h-full z-10"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {markers.map((m) => (
          <g key={m.codigo}>
            {/* Círculo principal */}
            <circle
              cx={m.x}
              cy={m.y}
              r={m.radius}
              fill={m.color}
              fillOpacity={0.75}
              stroke={m.color}
              strokeWidth={0.4}
            />
            {/* Tooltip nativo SVG (title) */}
            <title>
              {`${m.nombre}\nVolumen útil: ${m.porcentaje}%\nRiesgo: ${m.riesgo}${m.capacidadGwh ? `\nCapacidad: ${m.capacidadGwh.toLocaleString("es-CO")} GWh` : ""}`}
            </title>
          </g>
        ))}
      </svg>

      {/* Leyenda de semáforo */}
      <div className="absolute bottom-1.5 left-1.5 z-20 bg-theme-secondary backdrop-blur-sm border border-theme-primary rounded-lg px-2 py-1.5 text-[9px]">
        <p className="font-bold text-theme-primary mb-0.5">Estado embalses (XM/UPME)</p>
        {[
          { color: "#22C55E", label: "Normal", range: "> 80%" },
          { color: "#06B6D4", label: "Estable", range: "70–80%" },
          { color: "#F59E0B", label: "Alerta temprana", range: "60–70%" },
          { color: "#F97316", label: "Situación delicada", range: "50–60%" },
          { color: "#EF4444", label: "Crítico", range: "< 50%" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1 mb-0.5 last:mb-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-theme-secondary">{item.label}</span>
            <span className="text-theme-muted ml-auto pl-1">{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
