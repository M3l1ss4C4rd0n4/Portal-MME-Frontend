"use client";

import { GeoJSON, Pane } from "react-leaflet";
import type { DptoRow } from "@/types/mapa-departamentos";

/**
 * Capa de departamentos (choropleth + hover/click + tooltip) compartida por
 * ComunidadesMap y FenogeCEMap — verificado que esta lógica era byte-idéntica
 * en ambos archivos (solo difería la indentación) antes de extraerla.
 */

interface DeptAvgConInversion {
  avgInv: number | null;
}

interface Props {
  transformedGeoData: any;
  selectedDept: string | null;
  isDark: boolean;
  deptColors: Record<string, string>;
  onSelectDept: (dept: string | null) => void;
  porDepartamento: DptoRow[];
  deptAvgs: Record<string, DeptAvgConInversion>;
  /**
   * Contenido del tooltip por departamento. Por defecto muestra CEs/capacidad/inversión
   * (dominio de Comunidades Energéticas). Pasar esta prop para dashboards con otro dominio
   * (ej. Vista Departamental, que agrega 6 esquemas distintos).
   */
  renderTooltip?: (dept: DptoRow, deptAvg?: DeptAvgConInversion) => string[];
}

export default function DepartmentGeoJsonLayer({
  transformedGeoData,
  selectedDept,
  isDark,
  deptColors,
  onSelectDept,
  porDepartamento,
  deptAvgs,
  renderTooltip,
}: Props) {
  const fillBase = isDark ? "#152840" : "#CBD5E1";
  const strokeCol = isDark ? "#475569" : "#64748B";

  return (
    <Pane name="departments" style={{ zIndex: 350 }}>
      <GeoJSON
        key={`geo-${selectedDept ?? "all"}-${String(isDark)}-${Object.keys(deptColors).length}`}
        data={transformedGeoData as any}
        style={(feature?: any) => {
          const rawName: string = feature?.properties?.NOMBRE_DPT ?? "";
          const nombre = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          const normSelected = selectedDept?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          const isSelected = normSelected != null && nombre === normSelected;
          const dataColor = deptColors[nombre];
          return {
            fillColor: isSelected ? "#F59E0B" : (dataColor ?? fillBase),
            fillOpacity: isSelected ? 0.7 : (dataColor ? 0.6 : (isDark ? 0.85 : 0.9)),
            color: isSelected ? "#F59E0B" : strokeCol,
            weight: isSelected ? 2.5 : 2,
          };
        }}
        onEachFeature={(feature: any, layer: any) => {
          const rawName: string = feature?.properties?.NOMBRE_DPT ?? "";
          const nombre = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          const normSelected = selectedDept?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
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
          const deptInfo = porDepartamento.find(
            (d) => d.departamentoGeo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === nombre
          );
          if (!deptInfo) return;
          const deptAvg = deptAvgs[nombre];
          const nomFormateado = rawName
            .split(" ")
            .map((w: string) => w[0] + w.slice(1).toLowerCase())
            .join(" ");
          const tooltipLines = renderTooltip
            ? [`<strong style="font-size:13px">${nomFormateado}</strong>`, ...renderTooltip(deptInfo, deptAvg)]
            : [
                `<strong style="font-size:13px">${nomFormateado}</strong>`,
                `CEs: <strong>${deptInfo.count}</strong>`,
                `Capacidad: <strong>${Math.round(deptInfo.capacidad).toLocaleString("es-CO")} kWp</strong>`,
                `Inversión: <strong>$${Math.round(deptInfo.inversion).toLocaleString("es-CO")}</strong>`,
                ...(deptAvg?.avgInv != null
                  ? [`Prom. inversión/CE: <strong>$${Math.round(deptAvg.avgInv).toLocaleString("es-CO")}</strong>`]
                  : []),
              ];
          layer.bindTooltip(tooltipLines.join("<br/>"), { sticky: true, direction: "top", className: "dept-tooltip" });
        }}
      />
    </Pane>
  );
}
