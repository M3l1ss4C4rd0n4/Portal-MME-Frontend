"use client";

import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import { classifyOni } from "@/lib/oni";
import type { PredictionPoint } from "@/types/predictions";

// Climate indicator normalization — all mapped to the lower 0-40% of the chart
// so they appear as context bands without a secondary axis.
// ONI: visual% = 20 + oni * 7.5  (ONI −2→5%, 0→20%, +2→35%)
const ONI_VISUAL_OFFSET = 20;
const ONI_VISUAL_SCALE = 7.5;
function oniToVisual(oni: number): number {
  return ONI_VISUAL_OFFSET + oni * ONI_VISUAL_SCALE;
}

// PDO: visual% = 20 + pdo * 5  (PDO −4→0%, 0→20%, +4→40%)
const PDO_VISUAL_OFFSET = 20;
const PDO_VISUAL_SCALE = 5;
function pdoToVisual(pdo: number): number {
  return Math.max(0, Math.min(100, PDO_VISUAL_OFFSET + pdo * PDO_VISUAL_SCALE));
}

// SOI: visual% = 20 + soi * 1.5  (SOI −30→−25%→clamp 0%, +30→65%→clamp 40%)
const SOI_VISUAL_OFFSET = 20;
const SOI_VISUAL_SCALE = 1.5;
function soiToVisual(soi: number): number {
  return Math.max(0, Math.min(40, SOI_VISUAL_OFFSET + soi * SOI_VISUAL_SCALE));
}

interface Props {
  data: PredictionPoint[];
  height?: number;
  peakDate?: string;
  threshold80Date?: string;
  showConfidence?: boolean;
}

export default function PredictionLineChart({
  data,
  height = 380,
  peakDate,
  threshold80Date,
  showConfidence = true,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const theme = getNivoTheme(isDark);

  const hasOni = useMemo(() => data.some((d) => d.oni != null), [data]);

  const series = useMemo(() => {
    const base = data.map((d) => ({ x: d.fecha, y: d.valor }));

    const result: Array<{
      id: string;
      color: string;
      data: Array<{ x: string; y: number }>;
      dashed?: boolean;
    }> = [{ id: "Embalses", color: "#3B82F6", data: base }];

    if (showConfidence) {
      result.push(
        {
          id: "IC superior",
          color: isDark ? "#60A5FA" : "#93C5FD",
          dashed: true,
          data: data.map((d) => ({ x: d.fecha, y: Math.min(d.upper, 100) })),
        },
        {
          id: "IC inferior",
          color: isDark ? "#60A5FA" : "#93C5FD",
          dashed: true,
          data: data.map((d) => ({ x: d.fecha, y: d.lower })),
        }
      );
    }

    if (hasOni) {
      result.push({
        id: "ONI (El Niño)",
        color: "#14B8A6",
        data: data
          .filter((d) => d.oni != null)
          .map((d) => ({ x: d.fecha, y: oniToVisual(d.oni as number) })),
      });
    }

    return result;
  }, [data, isDark, showConfidence, hasOni]);

  const markers = useMemo(() => {
    const textStyle = { fill: isDark ? "#F1F5F9" : "#0F172A" };
    const list: Array<{
      axis: "x";
      value: string;
      lineStyle: object;
      legend?: string;
      textStyle: object;
    }> = [];
    if (threshold80Date) {
      list.push({
        axis: "x",
        value: threshold80Date,
        lineStyle: {
          stroke: "#10B981",
          strokeWidth: 2,
          strokeDasharray: "6,4",
        },
        legend: "Meta 80%",
        textStyle,
      });
    }
    if (peakDate) {
      list.push({
        axis: "x",
        value: peakDate,
        lineStyle: {
          stroke: "#1D4ED8",
          strokeWidth: 2,
          strokeDasharray: "6,4",
        },
        legend: "Pico proyectado",
        textStyle,
      });
    }
    return list;
  }, [peakDate, threshold80Date, isDark]);

  const tickValues = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 10));
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d) => d.fecha);
  }, [data]);

  const formatDate = (v: string) => {
    const d = new Date(v + "T00:00:00");
    return d
      .toLocaleDateString("es-CO", { day: "numeric", month: "short" })
      .replace(".", "");
  };

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={series}
        theme={theme}
        margin={{ top: 16, right: 16, bottom: 56, left: 48 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, max: 100, stacked: false }}
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 12,
          tickRotation: -45,
          tickValues,
          format: formatDate,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickValues: [0, 20, 40, 60, 80, 100],
          format: (v: number) => `${v}%`,
          legend: "% volumen útil",
          legendOffset: -40,
          legendPosition: "middle",
        }}
        colors={{ datum: "color" }}
        lineWidth={2.5}
        pointSize={0}
        enablePoints={false}
        enableGridX={false}
        enableArea
        areaBaselineValue={0}
        areaOpacity={1}
        defs={[
          {
            id: "gradienteEmbalses",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#3B82F6", opacity: 0.4 },
              { offset: 100, color: "#3B82F6", opacity: 0 },
            ],
          },
          {
            id: "sinRelleno",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "#000000", opacity: 0 },
              { offset: 100, color: "#000000", opacity: 0 },
            ],
          },
        ]}
        fill={[
          { match: { id: "Embalses" }, id: "gradienteEmbalses" },
          { match: "*", id: "sinRelleno" },
        ]}
        useMesh
        crosshairType="x"
        markers={markers}
        legends={[
          {
            anchor: "top-right",
            direction: "row",
            justify: false,
            translateX: 0,
            translateY: -16,
            itemsSpacing: 12,
            itemWidth: 110,
            itemHeight: 16,
            itemTextColor: isDark ? "#94A3B8" : "#475569",
            symbolSize: 10,
            symbolShape: "circle",
            data: [
              { id: "Embalses", label: "Embalses", color: "#3B82F6" },
              ...(hasOni ? [{ id: "ONI (El Niño)", label: "ONI El Niño", color: "#14B8A6" }] : []),
            ],
            effects: [
              {
                on: "hover",
                style: { itemTextColor: isDark ? "#E2E8F0" : "#0F172A" },
              },
            ],
          },
        ]}
        tooltip={({ point }) => {
          const d = data.find((x) => x.fecha === point.data.x);
          if (!d) return null;
          const fecha = new Date(d.fecha + "T00:00:00").toLocaleDateString(
            "es-CO",
            { day: "numeric", month: "long", year: "numeric" }
          );
          const oniClass = classifyOni(d.oni);
          const oniColor = oniClass?.color ?? "#94A3B8";
          const oniLabel = oniClass?.label ?? null;
          return (
            <div
              className="rounded-lg border px-3 py-2 text-xs shadow-xl min-w-[160px]"
              style={{
                background: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#E2E8F0",
                color: isDark ? "#E2E8F0" : "#0F172A",
              }}
            >
              <div className="font-semibold mb-1.5 text-gold">{fecha}</div>
              <div className="flex items-center justify-between gap-4">
                <span style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                  Embalses:
                </span>
                <span className="font-bold text-blue-400">
                  {d.valor.toFixed(2)}%
                </span>
              </div>
              {showConfidence && (
                <div className="flex items-center justify-between gap-4 text-[10px] mt-0.5">
                  <span style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                    IC 95%:
                  </span>
                  <span style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                    {d.lower.toFixed(1)}% – {Math.min(d.upper, 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {d.oni != null && (
                <div
                  className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t"
                  style={{ borderColor: isDark ? "#334155" : "#E2E8F0" }}
                >
                  <span style={{ color: oniColor }}>ONI:</span>
                  <span className="font-bold" style={{ color: oniColor }}>
                    {d.oni > 0 ? "+" : ""}
                    {d.oni.toFixed(2)}°C
                    {oniLabel && (
                      <span className="font-normal text-[10px] ml-1">
                        ({oniLabel})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {d.pdo != null && (
                <div
                  className="flex items-center justify-between gap-4 mt-0.5"
                >
                  <span style={{ color: "#94A3B8" }}>PDO:</span>
                  <span className="font-bold" style={{ color: "#94A3B8" }}>
                    {d.pdo > 0 ? "+" : ""}
                    {d.pdo.toFixed(2)}{" "}
                    <span className="font-normal text-[10px]">
                      ({d.pdo > 0 ? "PDO+" : "PDO−"})
                    </span>
                  </span>
                </div>
              )}
              {d.soi != null && (
                <div
                  className="flex items-center justify-between gap-4 mt-0.5"
                >
                  <span style={{ color: "#94A3B8" }}>SOI:</span>
                  <span className="font-bold" style={{ color: "#94A3B8" }}>
                    {d.soi > 0 ? "+" : ""}
                    {d.soi.toFixed(1)}
                  </span>
                </div>
              )}
              {d.gmst != null && (
                <div
                  className="flex items-center justify-between gap-4 mt-0.5"
                >
                  <span style={{ color: "#94A3B8" }}>GMST:</span>
                  <span className="font-bold" style={{ color: "#94A3B8" }}>
                    +{d.gmst.toFixed(2)}°C
                    <span className="font-normal text-[10px] ml-1">(anom. global)</span>
                  </span>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
