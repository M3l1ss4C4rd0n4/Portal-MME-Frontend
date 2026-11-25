"use client";

import { useEffect, useState } from "react";
import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import { useIsNarrow } from "@/hooks/useIsNarrow";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import { TooltipSeguro } from "@/components/ui/TooltipSeguro";

interface Filters {
  programa: string[];
  departamento: string[];
  mes: string[];
  tipo: string[];
  contratista: string[];
}

interface ProgramaRow {
  programa: string;
  planeado: number;
  ejecutado: number;
  eficiencia_pct: number;
}


type FilaBarra = { programa: string; "Eficiencia %": number; color: string };

const PROGRAM_COLORS: Record<string, string> = {
  "Colombia Solar": "#3B82F6",
  "Comunidades Energéticas OR": "#E8A838",
  "Fenoge 1.0 y 1.1": "#8B5CF6",
  "IPSE": "#EC4899",
};

function shortName(name: string, maxLen = 22): string {
  if (name.length <= maxLen) return name;
  return name.substring(0, maxLen - 2) + "…";
}

export default function BarEficienciaPrograma({ filters }: { filters: Filters }) {
  const isNarrow = useIsNarrow();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [data, setData] = useState<ProgramaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    filters.departamento.forEach((v) => params.append("departamento", v));
    filters.mes.forEach((v) => params.append("mes", v));
    filters.tipo.forEach((v) => params.append("tipo", v));
    filters.contratista.forEach((v) => params.append("contratista", v));

    fetch(`/api/eficiencia-programa?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((r) => { setData(r.data ?? []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [filters.departamento, filters.mes, filters.tipo, filters.contratista]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-sm text-[#64748B]">Cargando gráfica...</div></div>;
  if (error) return <div className="flex flex-col items-center justify-center h-full gap-2"><p className="text-sm text-red-400">Error: {error}</p></div>;
  if (data.length === 0) return <div className="flex items-center justify-center h-full"><p className="text-sm text-[#64748B]">Sin datos para los filtros seleccionados</p></div>;

  const barData = (data ?? [])
    .map((d) => ({ programa: shortName(d.programa, isNarrow ? 15 : 22), "Eficiencia %": Number(d.eficiencia_pct), color: PROGRAM_COLORS[d.programa] ?? "#60A5FA" }))
    .reverse();

  // En 360 px el margen de escritorio (160 px) deja las barras sin espacio.
  const base = getNivoTheme(isDark);
  const theme = {
    ...base,
    axis: {
      ...base.axis,
      ticks: { ...base.axis.ticks, line: { stroke: "transparent" }, text: { ...base.axis.ticks.text, fontSize: isNarrow ? 11 : 10 } },
    },
  };

  return (
    <ResponsiveBar
      data={barData}
      keys={["Eficiencia %"]}
      indexBy="programa"
      layout="horizontal"
      theme={theme}
      margin={isNarrow ? { top: 10, right: 52, bottom: 16, left: 108 } : { top: 10, right: 70, bottom: 20, left: 160 }}
      padding={0.35}
      valueScale={{ type: "linear", max: Math.max(...(barData ?? []).map((d) => d["Eficiencia %"]), 5) }}
      indexScale={{ type: "band", round: true }}
      colors={({ data: d }) => (d as { color: string }).color}
      borderRadius={4}
      axisTop={null}
      axisRight={null}
      axisBottom={null}
      axisLeft={{ tickSize: 0, tickPadding: isNarrow ? 6 : 10, tickValues: (barData ?? []).map((d) => d.programa) }}
      enableGridX={false}
      enableGridY={false}
      tooltip={({ indexValue, value }) => (
        <TooltipSeguro
          style={{
            padding: "8px 12px",
            background: isDark ? "#1E293B" : "#FFFFFF",
            border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
            borderRadius: 8,
            fontSize: 12,
            color: isDark ? "#F1F5F9" : "#0F172A",
          }}
        >
          <strong>{indexValue}</strong>: {Number(value).toFixed(2)}%
        </TooltipSeguro>
      )}
      enableLabel={false}
      layers={['grid', 'axes', 'bars', (capa: BarCustomLayerProps<FilaBarra>) => <LabelsLayer {...capa} isDark={isDark} />]}
    />
  );
}

function LabelsLayer(props: any) {
  const { bars, isDark } = props;
  return (
    <g>
      {bars.map((bar: any) => {
        const val = Number(bar.data.value) || 0;
        if (val <= 0) return null;
        const label = `${val.toFixed(2)}%`;
        const isSmall = bar.width < 45;
        const x = isSmall ? bar.x + bar.width + 6 : bar.x + bar.width / 2;
        const y = bar.y + bar.height / 2 + 4;
        const anchor = isSmall ? "start" : "middle";
        const color = isSmall ? (isDark ? "#94A3B8" : "#475569") : "#FFFFFF";
        return (
          <text key={bar.data.indexValue} x={x} y={y} textAnchor={anchor} fill={color} fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif">
            {label}
          </text>
        );
      })}
    </g>
  );
}
