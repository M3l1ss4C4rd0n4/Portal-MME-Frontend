"use client";

import { useMemo, useCallback } from "react";
import { ResponsiveLine } from "@nivo/line";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";

interface ChartPoint {
  x: string;
  y: number;
  pct?: number;
}

interface SeriesData {
  id: string;
  color: string;
  data: ChartPoint[];
}

export interface CapacidadEmbalseData {
  areas: SeriesData[];
  pctSin: SeriesData;
  hist2009: SeriesData;
  hist2014: SeriesData;
  hist2020: SeriesData;
  meta: {
    fechaInicio: string;
    fechaFin: string;
    capacidadTotalSinGwh: number;
    regiones: string[];
  };
}

interface Props {
  data: CapacidadEmbalseData;
  height?: number;
}

/* ═══════════════════════════════════════════════════════════════════════
   Colores exactos del gráfico XM "Capacidad embalse"
   ═══════════════════════════════════════════════════════════════════════ */
// Colores EXACTOS del gráfico XM "Capacidad embalse" (modo claro)
// Se usan tal cual, con mayor opacidad para fondo oscuro
const COLORS = {
  antioquia: "#8B5CF6",   // violeta saturado
  centro:    "#94A3B8",   // gris azulado visible
  oriente:   "#38BDF8",   // azul cielo brillante
  valle:     "#2DD4BF",   // turquesa brillante
  caribe:    "#84CC16",   // verde lima
  pctSin:    "#F97316",   // naranja vivo
  hist14:    "#F59E0B",   // dorado/ámbar
  hist09:    "#2563EB",   // azul cobalto/real
  hist20:    "#7E22CE",   // morado oscuro
};

const REGION_ORDER = ["Antioquia", "Centro", "Oriente", "Valle", "Caribe"];

/**
 * Leyenda personalizada estilo XM (símbolos mixtos: círculos para áreas, líneas para históricos)
 */
function LeyendaXM({
  areas,
  lines,
  isDark,
}: {
  areas: { id: string; color: string }[];
  lines: { id: string; color: string }[];
  isDark: boolean;
}) {
  const textColor = isDark ? "#94A3B8" : "#475569";
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-1.5 text-[9px] leading-tight">
      {/* % SIN: círculo verde oliva (mismo color que Caribe, como en XM) */}
      <div className="flex items-center gap-1">
        <span
          className="inline-block rounded-full"
          style={{ width: 7, height: 7, background: COLORS.pctSin }}
        />
        <span style={{ color: textColor }}>% SIN</span>
      </div>
      {/* Históricos: líneas punteadas simuladas con segmentos */}
      {lines.filter(l => l.id !== "% SIN").map((l) => (
        <div key={l.id} className="flex items-center gap-1">
          <span className="inline-flex gap-[2px]">
            <span className="inline-block" style={{ width: 8, height: 2, background: l.color }} />
            <span className="inline-block" style={{ width: 3, height: 2, background: "transparent" }} />
            <span className="inline-block" style={{ width: 4, height: 2, background: l.color }} />
          </span>
          <span style={{ color: textColor }}>{l.id}</span>
        </div>
      ))}
      {/* Áreas: círculos */}
      {areas.map((a) => (
        <div key={a.id} className="flex items-center gap-1">
          <span
            className="inline-block rounded-full"
            style={{ width: 7, height: 7, background: a.color }}
          />
          <span style={{ color: textColor }}>{a.id}</span>
        </div>
      ))}
    </div>
  );
}

export default function CapacidadEmbalseChart({ data, height = 340 }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const nivoTheme = getNivoTheme(isDark);

  const capacidadTotal = data.meta.capacidadTotalSinGwh;

  /* ── Fechas ───────────────────────────────────────────────────────── */
  const fechas = useMemo(() => {
    const set = new Set<string>();
    data.areas.forEach((a) => a.data.forEach((d) => set.add(d.x)));
    data.pctSin.data.forEach((d) => set.add(d.x));
    return Array.from(set).sort();
  }, [data]);

  /* ── Áreas: orden de apilamiento fijo ─────────────────────────────── */
  const areaSeries = useMemo(() => {
    const mapped = data.areas.map((a) => ({
      id: a.id,
      color:
        a.id === "Antioquia"
          ? COLORS.antioquia
          : a.id === "Centro"
          ? COLORS.centro
          : a.id === "Oriente"
          ? COLORS.oriente
          : a.id === "Valle"
          ? COLORS.valle
          : a.id === "Caribe"
          ? COLORS.caribe
          : a.color,
      data: fechas.map((f) => ({
        x: f,
        y: a.data.find((d) => d.x === f)?.y ?? 0,
      })),
    }));
    return mapped.sort((a, b) => {
      const ia = REGION_ORDER.indexOf(a.id);
      const ib = REGION_ORDER.indexOf(b.id);
      return ia - ib;
    });
  }, [data.areas, fechas]);

  /* ── yMax común ───────────────────────────────────────────────────── */
  const yMax = useMemo(() => {
    const stackedMax = fechas.reduce((maxAcc, f) => {
      const stackedSum = areaSeries.reduce(
        (sum, s) => sum + (s.data.find((d) => d.x === f)?.y ?? 0),
        0
      );
      return Math.max(maxAcc, stackedSum);
    }, 0);
    const raw = Math.max(stackedMax, capacidadTotal);
    return Math.ceil(raw / 2000) * 2000;
  }, [areaSeries, fechas, capacidadTotal]);

  /* ── Líneas overlay en escala GWh (mismo eje que las áreas) ───────── */
  // y = pct/100 * yMax para quedar en el mismo sistema de coordenadas
  // El eje derecho muestra % = v/yMax*100, sincronizado con el eje GWh
  const lineSeries = useMemo(
    () => [
      {
        id: "% SIN",
        color: COLORS.pctSin,
        data: fechas.map((f) => ({
          x: f,
          y: (Number(data.pctSin.data.find((d) => d.x === f)?.y) || 0) / 100 * yMax,
        })),
      },
      {
        id: "Hist.(2014-2021)",
        color: COLORS.hist14,
        data: fechas.map((f) => ({
          x: f,
          y: (Number(data.hist2014.data.find((d) => d.x === f)?.y) || 0) / 100 * yMax,
        })),
      },
      {
        id: "Hist.(2009-2021)",
        color: COLORS.hist09,
        data: fechas.map((f) => ({
          x: f,
          y: (Number(data.hist2009.data.find((d) => d.x === f)?.y) || 0) / 100 * yMax,
        })),
      },
      {
        id: "Hist.(2020-2021)",
        color: COLORS.hist20,
        data: fechas.map((f) => ({
          x: f,
          y: (Number(data.hist2020.data.find((d) => d.x === f)?.y) || 0) / 100 * yMax,
        })),
      },
    ],
    [data, fechas, yMax]
  );

  /* ── Eje X: tick cada 7 días (semanal) ───────────────────────────── */
  const tickFechas = useMemo(
    () => fechas.filter((_, i) => i % 7 === 0 || i === fechas.length - 1),
    [fechas]
  );

  const formatDate = useCallback((v: string) => {
    const d = new Date(v + "T00:00:00");
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
  }, []);

  const margin = { top: 8, right: 56, bottom: 44, left: 56 };

  /* ── Lookups fecha → datos para tooltip unificado ───────────────── */
  const areaByDate = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const serie of areaSeries) {
      for (const pt of serie.data) {
        if (!map.has(pt.x)) map.set(pt.x, {});
        map.get(pt.x)![serie.id] = pt.y;
      }
    }
    return map;
  }, [areaSeries]);

  const lineByDate = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const serie of lineSeries) {
      for (const pt of serie.data) {
        if (!map.has(pt.x)) map.set(pt.x, {});
        map.get(pt.x)![serie.id] = pt.y;
      }
    }
    return map;
  }, [lineSeries]);

  /* ── Tooltip unificado — usa { point } de useMesh ───────────────── */
  // Recibe el punto más cercano al cursor y construye el tooltip completo
  // leyendo todas las variables del día desde lineByDate y areaByDate.
  const lineTooltip = useCallback(
    ({ point }: any) => {
      const fecha = point.data.x as string;
      const label = new Date(fecha + "T00:00:00").toLocaleDateString("es-CO", {
        day: "numeric", month: "long", year: "numeric",
      });

      const ld = lineByDate.get(fecha) ?? {};
      const sinGwh = ld["% SIN"] ?? 0;
      const regiones = areaByDate.get(fecha) ?? {};
      const totalGwh = Object.values(regiones).reduce((s, v) => s + v, 0);

      const pct = (gwh: number) =>
        yMax > 0 ? (gwh / yMax * 100).toFixed(2) + "%" : "—";
      const fmt = (n: number) =>
        Math.round(n).toLocaleString("es-CO");

      const bg      = isDark ? "#1E293B" : "#FFFFFF";
      const border  = isDark ? "#334155" : "#E2E8F0";
      const clr     = isDark ? "#E2E8F0" : "#1E293B";
      const muted   = isDark ? "#64748B" : "#94A3B8";
      const div     = `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`;

      const RCOL: Record<string, string> = {
        Antioquia: COLORS.antioquia, Centro: COLORS.centro,
        Oriente: COLORS.oriente, Valle: COLORS.valle, Caribe: COLORS.caribe,
      };

      return (
        <div className="rounded-lg border px-3 py-2 text-xs shadow-xl min-w-[230px]"
          style={{ background: bg, borderColor: border, color: clr }}>

          <div className="font-semibold mb-2 text-amber-400">{label}</div>

          {/* % SIN */}
          <div className="flex items-center gap-1.5 pb-1.5 mb-1.5" style={{ borderBottom: div }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS.pctSin }} />
            <span style={{ color: muted }}>% SIN actual:</span>
            <span className="font-bold ml-auto" style={{ color: COLORS.pctSin }}>{pct(sinGwh)}</span>
          </div>

          {/* Regiones */}
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: muted }}>
            Energía por región
          </div>
          {Object.entries(regiones).sort(([, a], [, b]) => b - a).map(([region, gwh]) => (
            <div key={region} className="flex items-center gap-1.5 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RCOL[region] ?? "#64748B" }} />
              <span style={{ color: muted }}>{region}:</span>
              <span className="font-semibold ml-auto">{fmt(gwh)} GWh</span>
            </div>
          ))}

          {/* Históricos */}
          <div className="text-[9px] uppercase tracking-wider mt-1.5 mb-1 pt-1.5"
            style={{ color: muted, borderTop: div }}>
            Histórico promedio
          </div>
          {[
            { id: "Hist.(2014-2021)", color: COLORS.hist14 },
            { id: "Hist.(2009-2021)", color: COLORS.hist09 },
            { id: "Hist.(2020-2021)", color: COLORS.hist20 },
          ].map(({ id, color }) => (
            <div key={id} className="flex items-center gap-1.5 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span style={{ color: muted }}>{id}:</span>
              <span className="font-semibold ml-auto">{pct(ld[id] ?? 0)}</span>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center gap-1 pt-1.5 mt-1.5" style={{ borderTop: div }}>
            <span style={{ color: muted }}>Total SIN:</span>
            <span className="font-bold text-amber-400 ml-auto">{fmt(totalGwh)} GWh</span>
            <span style={{ color: muted }}>
              · {capacidadTotal > 0 ? ((totalGwh / capacidadTotal) * 100).toFixed(2) : "—"}%
            </span>
          </div>
        </div>
      );
    },
    [isDark, yMax, lineByDate, areaByDate, capacidadTotal]
  );

  // Tooltip del gráfico de áreas (fallback, rara vez activo)
  const areaTooltip = lineTooltip;

  /* ── Custom layer: etiquetas % SIN ────────────────────────────────── */
  const SinLabelsLayer = useCallback(
    ({ points }: any) => {
      const sin = points.filter((p: any) => p.seriesId === "% SIN");
      if (!sin.length) return null;
      const labeled = sin.filter((_: any, i: number) => i % 21 === 0 || i === sin.length - 1);
      return (
        <g>
          {labeled.map((p: any, i: number) => (
            <text
              key={`lbl-${i}`}
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill="#64748B"
              fontSize={10}
              fontWeight={700}
            >
              {(Number(p.data.y) / yMax * 100).toFixed(2)}
            </text>
          ))}
        </g>
      );
    },
    [yMax]
  );

  /* ── Custom layer: líneas con estilos diferenciados ──────────────── */
  // Usa `points` (coords en píxeles ya calculadas por Nivo) para dibujar rutas SVG.
  // Orden de renderizado: históricos primero (fondo), % SIN al frente.
  const CustomLinesLayer = useCallback(
    ({ points, innerHeight }: any) => {
      const byId = new Map<string, any[]>();
      for (const p of points as any[]) {
        if (!byId.has(p.seriesId)) byId.set(p.seriesId, []);
        byId.get(p.seriesId)!.push(p);
      }

      type SerieStyle = { color: string; width: number; dash?: string; opacity: number; area: boolean };
      const SERIES_STYLE: Record<string, SerieStyle> = {
        "Hist.(2020-2021)": { color: COLORS.hist20, width: 1.5, dash: "3,3",  opacity: 0.9, area: false },
        "Hist.(2009-2021)": { color: COLORS.hist09, width: 1.5, dash: "6,3",  opacity: 0.9, area: false },
        "Hist.(2014-2021)": { color: COLORS.hist14, width: 2,   dash: "10,5", opacity: 0.9, area: false },
        "% SIN":            { color: COLORS.pctSin, width: 1.5,               opacity: 1,   area: true  },
      };

      return (
        <g>
          {Object.entries(SERIES_STYLE).map(([id, style]) => {
            const pts = byId.get(id);
            if (!pts || pts.length < 2) return null;

            const lineD = pts
              .map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ");

            const isSin = id === "% SIN";

            return (
              <g key={id}>
                {/* Área rellena semi-transparente para % SIN */}
                {isSin && (
                  <path
                    d={`${lineD} L ${(pts[pts.length - 1] as any).x} ${innerHeight} L ${(pts[0] as any).x} ${innerHeight} Z`}
                    fill={style.color}
                    fillOpacity={0.18}
                    stroke="none"
                  />
                )}
                {/* Línea de borde */}
                <path
                  d={lineD}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={style.width}
                  strokeDasharray={style.dash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={style.opacity}
                />
                {/* Círculos en % SIN */}
                {isSin &&
                  pts
                    .filter((_: any, i: number) => i % 21 === 0 || i === pts.length - 1)
                    .map((p: any, i: number) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill={style.color}
                        stroke={isDark ? "#0F172A" : "#FFFFFF"}
                        strokeWidth={1.5}
                      />
                    ))}
              </g>
            );
          })}
        </g>
      );
    },
    [isDark]
  );

  return (
    <div style={{ height }} className="relative w-full">
      {/* Leyenda manual estilo XM — áreas listadas de ARRIBA a ABAJO como en XM */}
      <LeyendaXM
        areas={[...areaSeries].reverse().map((a) => ({ id: a.id, color: a.color }))}
        lines={lineSeries.map((l) => ({ id: l.id, color: l.color }))}
        isDark={isDark}
      />

      {/* ── FONDO: Áreas apiladas ──────────────────────────────────── */}
      <div className="absolute inset-0" style={{ top: 22 }}>
        <ResponsiveLine
          data={areaSeries}
          theme={nivoTheme}
          margin={margin}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: yMax, stacked: true }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: -45,
            tickValues: tickFechas,
            format: formatDate,
            legend: "",
            legendOffset: 36,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            tickValues: 6,
            format: (v: number) => `${(v / 1000).toFixed(0)}k`,
            legend: "GWh",
            legendOffset: -50,
            legendPosition: "middle",
          }}
          colors={{ datum: "color" }}
          lineWidth={0.8}
          pointSize={0}
          enableArea={true}
          areaBaselineValue={0}
          areaOpacity={0.82}
          useMesh={true}
          crosshairType="x"
          tooltip={areaTooltip}
          legends={[]}
        />
      </div>

      {/* ── FRENTE: Líneas de % (transparente, solo líneas) ────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{ top: 22 }}>
        <div className="w-full h-full pointer-events-auto">
          <ResponsiveLine
            data={lineSeries}
            theme={nivoTheme}
            margin={margin}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: 0, max: yMax, stacked: false }}
            curve="monotoneX"
            axisTop={null}
            axisBottom={null}
            axisLeft={null}
            axisRight={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => v * yMax),
              format: (v: number) => `${Math.round((v / yMax) * 100)} %`,
              legend: "% Capacidad",
              legendOffset: 50,
              legendPosition: "middle",
            }}
            colors={{ datum: "color" }}
            lineWidth={0}
            pointSize={0}
            enableArea={false}
            enableGridX={false}
            enableGridY={false}
            useMesh={true}
            crosshairType="x"
            tooltip={lineTooltip}
            legends={[]}
            layers={[
              "grid",
              "markers",
              CustomLinesLayer,
              "mesh",
              "axes",
              SinLabelsLayer,
            ]}
          />
        </div>
      </div>
    </div>
  );
}
