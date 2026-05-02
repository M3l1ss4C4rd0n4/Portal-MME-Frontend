"use client";

import { ResponsivePie } from "@nivo/pie";

interface PieChartProps {
  data: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  isDark?: boolean;
}

export default function PieChart({ data, isDark = false }: PieChartProps) {
  return (
    <ResponsivePie
      data={data}
      margin={{ top: 20, right: 80, bottom: 20, left: 0 }}
      innerRadius={0.6}
      padAngle={2}
      cornerRadius={4}
      activeOuterRadiusOffset={8}
      colors={{ datum: "data.color" }}
      borderWidth={2}
      borderColor={isDark ? "#1A1A2E" : "#fff"}
      enableArcLinkLabels={true}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor={isDark ? "#9CA3AF" : "#6B7280"}
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: "color" }}
      arcLabelsSkipAngle={10}
      arcLabelsTextColor={isDark ? "#fff" : "#1F2937"}
      arcLabelsRadiusOffset={0.5}
      theme={{
        background: "transparent",
        text: {
          fill: isDark ? "#9CA3AF" : "#6B7280",
          fontSize: 11,
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
          anchor: "right",
          direction: "column",
          justify: false,
          translateX: 70,
          translateY: 0,
          itemsSpacing: 8,
          itemWidth: 60,
          itemHeight: 18,
          itemTextColor: isDark ? "#9CA3AF" : "#6B7280",
          itemDirection: "left-to-right",
          itemOpacity: 1,
          symbolSize: 10,
          symbolShape: "circle",
        },
      ]}
    />
  );
}
