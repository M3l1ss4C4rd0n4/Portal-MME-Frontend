"use client";

import { ResponsiveBar } from "@nivo/bar";

interface BarChartProps {
  data: Array<{
    sector: string;
    consumo: number;
    color: string;
  }>;
  isDark?: boolean;
}

export default function BarChart({ data, isDark = false }: BarChartProps) {
  return (
    <ResponsiveBar
      data={data}
      keys={["consumo"]}
      indexBy="sector"
      margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
      padding={0.4}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={({ data }) => data.color}
      borderRadius={6}
      borderWidth={0}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        legend: "",
        legendPosition: "middle",
        legendOffset: 32,
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        legend: "% Consumo",
        legendPosition: "middle",
        legendOffset: -40,
      }}
      enableGridY={true}
      gridYValues={5}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={isDark ? "#fff" : "#1F2937"}
      animate={true}
      motionConfig="stiff"
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
        tooltip: {
          container: {
            background: isDark ? "#1A1A2E" : "#fff",
            border: `1px solid ${isDark ? "#374151" : "#E5E7EB"}`,
            borderRadius: "8px",
            padding: "12px",
          },
        },
      }}
    />
  );
}
