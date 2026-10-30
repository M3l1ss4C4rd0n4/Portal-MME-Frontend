"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, GeoJSON, ZoomControl } from "react-leaflet";
import AjustarALimites from "@/components/maps/AjustarALimites";
import { COL_BOUNDS, MAP_TOOLTIP_STYLES, SA_LNG_OFFSET, shiftGeometryLng } from "@/components/maps/mapUtils";
import type { GeometriaGeoJSON } from "@/components/maps/mapUtils";

/**
 * Coropleta municipal de una sola métrica, a partir de
 * `public/municipios_colombia.geojson` (Marco Geoestadístico Nacional del DANE,
 * 1.121 municipios y áreas no municipalizadas, con el DIVIPOLA de 5 dígitos en la
 * propiedad `MPIO`).
 *
 * Es un componente aparte de MapaCoropletaDepartamentos, y no una generalización de
 * aquél, por tres diferencias que no son de configuración:
 *   · la clave de cruce es otra propiedad y aquí siempre hay código, así que no hace
 *     falta la heurística de nombres («Bogotá, D.C.» contra «Santafé de Bogotá»);
 *   · con 1.121 polígonos en vez de 33, la firma que fuerza el remonte tiene que ser
 *     un hash y no la lista de valores;
 *   · el color lo decide siempre quien llama, porque las bandas del IPEM las publica
 *     el informe y no se recalculan sobre los datos recibidos.
 */

export interface DatoMunicipio {
  /** DIVIPOLA de 5 dígitos. Es la única clave fiable: 65 nombres se repiten. */
  codMunicipio: string;
  municipio: string;
  departamento: string;
  valor: number;
}

interface PropsFeature {
  MPIO?: string;
  NOMBRE?: string;
  DPTO?: string;
}

interface Props {
  geoData: object | null;
  datos: DatoMunicipio[];
  isDark: boolean;
  /** Color de cada municipio. Devolver null deja el relleno base de «sin dato». */
  colorDe: (dato: DatoMunicipio) => string | null;
  etiquetaValor?: string;
  formatearValor?: (valor: number) => string;
}

/** Código de departamento del archipiélago, que se traslada al inset. */
const DPTO_SAN_ANDRES = "88";

/**
 * Hash de los datos para la `key` de la capa.
 *
 * react-leaflet solo reaplica `style` al cambiar las props: su `updateGeoJSON` no
 * vuelve a ejecutar `onEachFeature`, así que sin remontar la capa los tooltips se
 * quedan con los valores del primer render. Con 33 departamentos se puede concatenar
 * la lista entera; con 1.121 municipios eso sería una cadena de decenas de miles de
 * caracteres que React compara en cada render, así que se reduce a un entero.
 */
function firmaDe(datos: DatoMunicipio[], etiqueta: string): string {
  let h = 2166136261;
  const mezcla = (texto: string) => {
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  };
  mezcla(etiqueta);
  for (const d of datos) {
    mezcla(d.codMunicipio);
    mezcla(String(d.valor));
  }
  return `${datos.length}-${(h >>> 0).toString(36)}`;
}

export default function MapaCoropletaMunicipios({
  geoData,
  datos,
  isDark,
  colorDe,
  etiquetaValor = "Valor",
  formatearValor = (v) => String(v),
}: Props) {
  const geoTransformado = useMemo(() => {
    if (!geoData) return null;
    const clone = JSON.parse(JSON.stringify(geoData)) as {
      features?: Array<{ properties?: PropsFeature | null; geometry?: GeometriaGeoJSON | null }>;
    };
    // San Andrés y Providencia van al mismo inset que en el mapa departamental, para
    // que los dos mapas de la página muestren el país igual.
    for (const feat of clone.features ?? []) {
      if (feat.properties?.DPTO === DPTO_SAN_ANDRES) {
        shiftGeometryLng(feat.geometry, SA_LNG_OFFSET);
      }
    }
    return clone;
  }, [geoData]);

  const { porCodigo, colorPorCodigo } = useMemo(() => {
    const valores = new Map<string, DatoMunicipio>();
    const colores = new Map<string, string>();
    for (const d of datos) {
      const clave = d.codMunicipio.padStart(5, "0");
      valores.set(clave, d);
      const color = colorDe(d);
      if (color) colores.set(clave, color);
    }
    return { porCodigo: valores, colorPorCodigo: colores };
  }, [datos, colorDe]);

  const firma = useMemo(() => firmaDe(datos, etiquetaValor), [datos, etiquetaValor]);

  if (!geoTransformado) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando mapa…</span>
      </div>
    );
  }

  const fillBase = isDark ? "#152840" : "#CBD5E1";
  // Con 1.121 polígonos el borde tiene que ser muy fino: a 1,5 px el trazo tapa los
  // municipios pequeños y el mapa se ve gris en vez de mostrar el color del dato.
  const strokeCol = isDark ? "#334155" : "#94A3B8";

  return (
    <>
      <style>{MAP_TOOLTIP_STYLES}</style>
      <MapContainer
        bounds={COL_BOUNDS}
        boundsOptions={{ padding: [8, 8] }}
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
          key={`coropleta-mpio-${String(isDark)}-${firma}`}
          data={geoTransformado as never}
          style={(feature?: { properties?: PropsFeature }) => {
            const color = colorPorCodigo.get(feature?.properties?.MPIO ?? "");
            return {
              fillColor: color ?? fillBase,
              fillOpacity: color ? 0.9 : isDark ? 0.5 : 0.7,
              color: strokeCol,
              weight: 0.3,
            };
          }}
          onEachFeature={(feature, layer) => {
            const props = feature.properties as PropsFeature;
            const codigo = props?.MPIO ?? "";
            const dato = porCodigo.get(codigo);
            const nombre = dato?.municipio ?? props?.NOMBRE ?? codigo;
            layer.bindTooltip(
              [
                `<strong style="font-size:13px">${nombre}</strong>`,
                dato ? `<span style="opacity:.75">${dato.departamento}</span>` : "",
                dato
                  ? `${etiquetaValor}: <strong>${formatearValor(dato.valor)}</strong>`
                  : "<em>Sin dato</em>",
              ]
                .filter(Boolean)
                .join("<br/>"),
              { sticky: true, direction: "top", className: "dept-tooltip" }
            );
          }}
        />
      </MapContainer>
    </>
  );
}
