"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import type { ColeccionGeoJSON } from "@/components/maps/mapUtils";
import { COL_BOUNDS, MAP_TOOLTIP_STYLES, SAN_ANDRES_KEY, SA_LNG_OFFSET, shiftGeometryLng } from "@/components/maps/mapUtils";
import { fmtNum } from "@/lib/format";

/**
 * Coropleta departamental de una sola métrica.
 *
 * Sustituye los visuales de Azure Maps del Power BI de SICOM (metodología
 * §13.4, §13.5 y §15.5). Se hace coropleta por departamento, no puntos por
 * municipio, porque las bases traen el municipio sin coordenadas ni código
 * DANE: la resolución municipio → departamento se hace en SQL
 * (hidrocarburos.v_dane_municipio_unico) y solo para nombres inequívocos.
 *
 * Es un componente aparte de DepartmentGeoJsonLayer porque aquél está acoplado
 * al dominio de Comunidades Energéticas (DptoRow con CEs/capacidad/inversión);
 * aquí el contrato es simplemente {departamento, valor}. Se reutiliza de
 * mapUtils lo que sí es común: límites del país, traslado de San Andrés al
 * inset y estilos de tooltip.
 */

export interface DatoDepartamento {
  departamento: string;
  valor: number;
  /**
   * Código DANE de departamento (2 dígitos). Cuando viene, el cruce con el
   * GeoJSON se hace por código y no por nombre: es exacto y evita toda la
   * heurística de tildes, «Bogotá D.C.» vs «Santafé de Bogotá», etc.
   */
  codigoDane?: string | null;
}

/** Clave de un feature del GeoJSON: código DANE si lo trae, si no el nombre. */
function claveFeature(props: { DPTO?: string; NOMBRE_DPT?: string } | undefined): string {
  const dane = props?.DPTO?.trim();
  if (dane) return dane.padStart(2, "0");
  return claveDepartamento(props?.NOMBRE_DPT ?? "");
}

/** Clave canónica de departamento por nombre (repliegue cuando no hay DANE). */
export function claveDepartamento(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
  // El GeoJSON del portal nombra Bogotá "SANTAFE DE BOGOTA D.C"; SICOM usa
  // "BOGOTA D.C." y el DANE "Bogotá, D.C.".
  if (base.startsWith("SANTAFE DE BOGOTA") || base.startsWith("BOGOTA")) return "BOGOTA";
  return base;
}

/**
 * Reajusta el mapa a los límites del país cuando el contenedor cambia de
 * tamaño. Sin esto, Leaflet mide el contenedor antes de que la rejilla CSS lo
 * dimensione y el país queda diminuto en una esquina.
 */
function AjustarALimites() {
  const map = useMap();

  useEffect(() => {
    const ajustar = () => {
      map.invalidateSize();
      map.fitBounds(COL_BOUNDS, { padding: [8, 8] });
    };
    ajustar();
    const t = setTimeout(ajustar, 180);

    const contenedor = map.getContainer();
    const observer = new ResizeObserver(ajustar);
    observer.observe(contenedor);

    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

interface Props {
  geoData: object | null;
  datos: DatoDepartamento[];
  isDark: boolean;
  unidad?: string;
  /** Rampa de color de menor a mayor valor. */
  rampa?: string[];
  etiquetaValor?: string;
}

const RAMPA_HIDROCARBUROS = ["#78350F", "#92400E", "#B45309", "#D97706", "#F59E0B", "#FCD34D"];

export default function MapaCoropletaDepartamentos({
  geoData,
  datos,
  isDark,
  unidad,
  rampa = RAMPA_HIDROCARBUROS,
  etiquetaValor = "Valor",
}: Props) {
  const geoTransformado = useMemo(() => {
    if (!geoData) return null;
    const clone = JSON.parse(JSON.stringify(geoData)) as ColeccionGeoJSON;
    for (const feat of clone.features ?? []) {
      if (feat.properties?.NOMBRE_DPT === SAN_ANDRES_KEY) {
        shiftGeometryLng(feat.geometry, SA_LNG_OFFSET);
      }
    }
    return clone;
  }, [geoData]);

  /** Valor y color por clave de departamento. Escala por cuantiles: los
   *  volúmenes de combustibles están muy sesgados y una escala lineal dejaría
   *  todo el país del mismo color salvo uno o dos departamentos. */
  const { valorPorDepto, colorPorDepto, nombrePorDepto } = useMemo(() => {
    const valores = new Map<string, number>();
    const nombres = new Map<string, string>();
    for (const d of datos) {
      const k = d.codigoDane
        ? String(d.codigoDane).padStart(2, "0")
        : claveDepartamento(d.departamento);
      valores.set(k, (valores.get(k) ?? 0) + d.valor);
      if (!nombres.has(k)) nombres.set(k, d.departamento);
    }
    const ordenados = [...valores.values()].filter((v) => v > 0).sort((a, b) => a - b);
    const cortes = rampa.map(
      (_, i) => ordenados[Math.floor((ordenados.length - 1) * ((i + 1) / rampa.length))] ?? 0
    );
    const colores = new Map<string, string>();
    for (const [k, v] of valores) {
      if (v <= 0) continue;
      const idx = cortes.findIndex((c) => v <= c);
      colores.set(k, rampa[idx === -1 ? rampa.length - 1 : idx]);
    }
    return { valorPorDepto: valores, colorPorDepto: colores, nombrePorDepto: nombres };
  }, [datos, rampa]);

  if (!geoTransformado) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    );
  }

  const fillBase = isDark ? "#152840" : "#CBD5E1";
  const strokeCol = isDark ? "#475569" : "#64748B";

  return (
    <>
      <style>{MAP_TOOLTIP_STYLES}</style>
      <MapContainer
        bounds={COL_BOUNDS}
        boundsOptions={{ padding: [8, 8] }}
        // zoomSnap por defecto es 1: fitBounds redondea hacia abajo al entero
        // más cercano y el país queda dibujado a la mitad del contenedor.
        zoomSnap={0.1}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "0.75rem",
          background: isDark ? "#060B14" : "#EEF2F9",
        }}
      >
        <AjustarALimites />
        <ZoomControl position="bottomright" />
        <GeoJSON
          key={`coropleta-${String(isDark)}-${colorPorDepto.size}`}
          data={geoTransformado as never}
          style={(feature?: { properties?: { DPTO?: string; NOMBRE_DPT?: string } }) => {
            const k = claveFeature(feature?.properties);
            const color = colorPorDepto.get(k);
            return {
              fillColor: color ?? fillBase,
              fillOpacity: color ? 0.85 : isDark ? 0.5 : 0.7,
              color: strokeCol,
              weight: 1.5,
            };
          }}
          onEachFeature={(feature, layer) => {
            const props = feature.properties as { DPTO?: string; NOMBRE_DPT?: string };
            const raw = props?.NOMBRE_DPT ?? "";
            const k = claveFeature(props);
            const valor = valorPorDepto.get(k);
            const nombre =
              nombrePorDepto.get(k) ??
              raw.split(" ").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
            layer.bindTooltip(
              [
                `<strong style="font-size:13px">${nombre}</strong>`,
                valor != null
                  ? `${etiquetaValor}: <strong>${fmtNum(valor)}${unidad ? ` ${unidad}` : ""}</strong>`
                  : `<em>Sin registros</em>`,
              ].join("<br/>"),
              { sticky: true, direction: "top", className: "dept-tooltip" }
            );
          }}
        />
      </MapContainer>
    </>
  );
}
