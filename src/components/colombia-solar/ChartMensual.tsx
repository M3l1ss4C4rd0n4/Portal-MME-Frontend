"use client";

import { useEffect, useState } from "react";
import { ResponsiveLine } from "@nivo/line";

interface Filters {
  programa: string[];
  departamento: string[];
  mes: string[];
  tipo: string[];
  contratista: string[];
}

interface MesRow {
  mes: string;
  planeado: number;
  ejecutado: number;
}

const nivoTheme = {
  background: "transparent" as const,
  text: { fill: "#94A3B8", fontSize: 11, fontFamily: "Inter, sans-serif" },
  axis: {
    domain: { line: { stroke: "#1E2D44", strokeWidth: 1 } },
    ticks: { line: { stroke: "#1E2D44", strokeWidth: 1 }, text: { fill: "#64748B", fontSize: 11 } },
    legend: { text: { fill: "#94A3B8", fontSize: 11, fontWeight: 600 } },
  },
  grid: { line: { stroke: "#1A2740", strokeWidth: 1 } },
  legends: { text: { fill: "#94A3B8", fontSize: 11 } },
  tooltip: {
    container: { background: "#1E293B", border: "1px solid #334155", borderRadius: "8px", color: "#E2E8F0", fontSize: "12px", padding: "8px 12px" },
  },
  crosshair: { line: { stroke: "rgba(232,168,56,0.3)", strokeWidth: 1 } },
};

export default function ChartMensual({ filters }: { filters: Filters }) {
  const [data, setData] = useState<MesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    filters.programa.forEach((v) => params.append("programa", v));
    filters.departamento.forEach((v) => params.append("departamento", v));
    filters.mes.forEach((v) => params.append("mes", v));
    filters.tipo.forEach((v) => params.append("tipo", v));
    filters.contratista.forEach((v) => params.append("contratista", v));

    fetch(`/api/chart-mensual?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((r) => { setData(r.data ?? []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [filters.programa, filters.departamento, filters.mes, filters.tipo, filters.contratista]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-sm text-[#64748B]">Cargando gráfica...</div></div>;
  if (error) return <div className="flex flex-col items-center justify-center h-full gap-2"><p className="text-sm text-red-400">Error: {error}</p></div>;
  if (data.length === 0) return <div className="flex items-center justify-center h-full"><p className="text-sm text-[#64748B]">Sin datos para los filtros seleccionados</p></div>;

  const safeData = data ?? [];
  const filteredData = safeData.filter((d) => String(d.mes ?? "").toLowerCase() !== "agosto");
  const nivoData = [
    { id: "PLANEADO", color: "#E8A838", data: filteredData.map((d) => ({ x: d.mes, y: Number(d.planeado) })) },
    { id: "EJECUTADO", color: "#10B981", data: filteredData.map((d) => ({ x: d.mes, y: Number(d.ejecutado) })) },
  ];

  return (
    <ResponsiveLine
      data={nivoData}
      theme={nivoTheme}
      margin={{ top: 20, right: 20, bottom: 70, left: 70 }}
      xScale={{ type: "point" }}
      yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
      curve="linear"
      colors={["#E8A838", "#10B981"]}
      lineWidth={2.5}
      enableArea
      areaOpacity={0.08}
      pointSize={7}
      pointColor={{ from: "color" }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "color", modifiers: [["darker", 0.5]] }}
      axisBottom={{ tickSize: 4, tickPadding: 8 }}
      axisLeft={{ tickSize: 4, tickPadding: 8, format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v), legend: "Usuarios", legendOffset: -58, legendPosition: "middle" }}
      enableGridX={false}
      gridYValues={5}
      legends={[{ anchor: "bottom", direction: "row", justify: false, translateX: 0, translateY: 56, itemWidth: 120, itemHeight: 14, itemsSpacing: 24, symbolSize: 10, symbolShape: "circle", itemTextColor: "#94A3B8" }]}
      useMesh
      crosshairType="x"
    />
  );
}
