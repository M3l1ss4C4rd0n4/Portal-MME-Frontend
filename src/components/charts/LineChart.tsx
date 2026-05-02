"use client";

import { ResponsiveLine } from "@nivo/line";

interface LineChartProps {
  data: Array<{
    mes: string;
    generacion: number;
    consumo: number;
  }>;
  isDark?: boolean;
}

export default function LineChart({ data, isDark = false }: LineChartProps) {
  const chartData = [
    {
      id: "Generación",
      data: data.map((d) => ({ x: d.mes, y: d.generacion })),
    },
    {
      id: "Consumo",
      data: data.map((d) => ({ x: d.mes, y: d.consumo })),
    },
  ];

  return (
    <ResponsiveLine
      data={chartData}
      margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
      xScale={{ type: "point" }}
      yScale={{
        type: "linear",
        min: "auto",
        max: "auto",
        stacked: false,
      }}
      curve="catmullRom"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        legend: "",
        legendOffset: 36,
        legendPosition: "middle",
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        legend: "GWh",
        legendOffset: -40,
        legendPosition: "middle",
      }}
      colors={["#3B82F6", "#10B981"]}
      lineWidth={3}
      pointSize={6}
      pointColor={isDark ? "#1A1A2E" : "#fff"}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      pointLabelYOffset={-12}
      useMesh={true}
      enableArea={true}
      areaOpacity={0.1}
      theme={{
        background: "transparent",
        text: {
          fill: isDark ? "#9CA3AF" : "#6B7280",
          fontSize: 11,
        },
        axis: {
          domain: {
            line: {
              stroke: isDark ? "#374151" : "#E5E7EB",
            },
          },
          ticks: {
            line: {
              stroke: isDark ? "#374151" : "#E5E7EB",
            },
          },
        },
        grid: {
          line: {
            stroke: isDark ? "#374151" : "#E5E7EB",
            strokeDasharray: "4 4",
          },
        },
        crosshair: {
          line: {
            stroke: isDark ? "#9CA3AF" : "#6B7280",
            strokeWidth: 1,
            strokeDasharray: "6 6",
          },
        },
        tooltip: {
          container: {
            background: isDark ? "#1A1A2E" : "#fff",
            border: `1px solid ${isDark ? "#374151" : "#E5E7EB"}`,
            borderRadius: "8px",
            padding: "12px",
          },
        },
      }}
      legends={[
        {
          anchor: "bottom",
          direction: "row",
          justify: false,
          translateX: 0,
          translateY: 40,
          itemsSpacing: 20,
          itemDirection: "left-to-right",
          itemWidth: 80,
          itemHeight: 20,
          itemOpacity: 0.75,
          symbolSize: 10,
          symbolShape: "circle",
          symbolBorderColor: "rgba(0, 0, 0, .5)",
          itemTextColor: isDark ? "#9CA3AF" : "#6B7280",
        },
      ]}
    />
  );
}
