"use client";

import { ResponsiveLine } from "@nivo/line";
import type { NivoTheme } from "@/lib/nivo-theme";

// ─── Types ────────────────────────────────────────────────────────────────
export interface CurvaSPoint {
  fecha: string;
  programado: number;
  real: number | null;
}

export interface CurvaSProyecto {
  nombre: string;
  departamento: string;
  operadorDeRed: string;
  programado: CurvaSPoint[];
  realFuente?: "reportado" | "reportado_usuarios" | "sin_avance" | "sin_datos";
  usuarios?: number;
  potencia?: number;
}

export interface CurvaSCategoria {
  id: string;
  label: string;
  proyectos: CurvaSProyecto[];
}

export interface CurvaSData {
  categorias: CurvaSCategoria[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatFechaEje(iso: string): string {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  return `${d} ${MESES_CORTO[m - 1] ?? m}`;
}

function formatFechaTooltip(iso: string): string {
  const [y, m, d] = String(iso).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function pickTickValues(fechas: string[], maxTicks = 14): string[] {
  if (fechas.length <= maxTicks) return fechas;
  const indices = new Set<number>();
  for (let i = 0; i < maxTicks; i++) {
    const idx = Math.round((i * (fechas.length - 1)) / (maxTicks - 1));
    indices.add(idx);
  }
  return [...indices].sort((a, b) => a - b).map((i) => fechas[i]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function computeAverageLine(
  proyectos: CurvaSProyecto[],
  field: "programado" | "real"
): Array<{ x: string; y: number | null }> {
  // Collect values per fecha across all projects
  const map = new Map<string, number[]>();
  for (const proj of proyectos) {
    for (const point of proj.programado) {
      let val: number | null = null;
      if (field === "programado") {
        val = Number(point.programado) || 0;
      } else {
        val = point.real;
      }
      if (val != null) {
        const arr = map.get(point.fecha) ?? [];
        arr.push(val);
        map.set(point.fecha, arr);
      }
    }
  }
  // Sort dates and compute average
  const fechas = [...map.keys()].sort();
  return fechas.map((fecha) => {
    const vals = map.get(fecha)!;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { x: fecha, y: Number(avg.toFixed(2)) };
  });
}

function pickRealNota(proyectos: CurvaSProyecto[]): string | null {
  const fuentes = new Set<string>();
  for (const p of proyectos) {
    if (p.realFuente) fuentes.add(p.realFuente);
  }
  if (fuentes.has("reportado_usuarios")) return "Real: hoja Usuarios (sin reporte en esta dimensión)";
  if (fuentes.has("sin_avance")) return "Real: sin avance registrado aún";
  if (fuentes.has("sin_datos")) return "Real: sin reporte en Excel";
  return null;
}

// ─── Chart ────────────────────────────────────────────────────────────────
export default function CurvaSChart({
  title,
  proyectos,
  theme,
}: {
  title: string;
  proyectos: CurvaSProyecto[];
  theme: NivoTheme;
}) {
  if (!proyectos.length) {
    return (
      <div className="flex flex-col h-full min-h-[220px]">
        <span className="text-[11px] font-semibold text-theme-primary mb-2">{title}</span>
        <div className="flex-1 flex items-center justify-center text-[#64748B] text-xs">Sin datos</div>
      </div>
    );
  }

  const isMulti = proyectos.length > 1;
  const realNota = pickRealNota(proyectos);

  // Build series: always two lines – Programado (cyan) & Real (amber)
  const data: Array<{ id: string; color: string; data: Array<{ x: string; y: number | null }> }> = [];

  if (isMulti) {
    // Multi-project: average of all projects per date
    const progAvg = computeAverageLine(proyectos, "programado");
    const realAvg = computeAverageLine(proyectos, "real");
    data.push({ id: "Programado promedio", color: "#06B6D4", data: progAvg });
    data.push({ id: "Real", color: "#F59E0B", data: realAvg });
  } else {
    // Single project: exact values
    const p = proyectos[0];
    data.push({
      id: "Programado",
      color: "#06B6D4",
      data: p.programado.map((d) => ({
        x: d.fecha,
        y: Number((Number(d.programado) || 0).toFixed(2)),
      })),
    });
    data.push({
      id: "Real",
      color: "#F59E0B",
      data: p.programado.map((d) => ({
        x: d.fecha,
        y: d.real != null ? Number(d.real.toFixed(2)) : null,
      })),
    });
  }

  const fechas = data[0].data.map((d) => d.x);
  const tickValues = pickTickValues(fechas, 14);

  const chartTheme = {
    ...theme,
    axis: {
      ...theme.axis,
      ticks: {
        ...(theme.axis?.ticks ?? {}),
        text: {
          ...((theme.axis?.ticks as any)?.text ?? {}),
          fontSize: 8,
        },
      },
    },
  };

  return (
    <div className="flex flex-col h-full min-h-[220px]">
      <div className="mb-2">
        <span className="text-[11px] font-semibold text-theme-primary">{title}</span>
        {realNota && (
          <p className="text-[9px] text-gold/80 mt-0.5 leading-tight">{realNota}</p>
        )}
        {isMulti && (
          <p className="text-[9px] text-cyan-400/70 mt-0.5 leading-tight">
            Promedio de {proyectos.length} proyectos
          </p>
        )}
      </div>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveLine
          data={data}
          theme={chartTheme}
          margin={{ top: 8, right: 16, bottom: 48, left: 44 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: 100, stacked: false }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 6,
            tickRotation: -40,
            tickValues,
            format: (v) => formatFechaEje(String(v)),
          }}
          axisLeft={{
            tickSize: 4,
            tickPadding: 4,
            tickRotation: 0,
            legend: "%",
            legendOffset: -36,
            legendPosition: "middle",
            format: (v) => `${v}%`,
          }}
          colors={["#06B6D4", "#F59E0B"]}
          lineWidth={2}
          pointSize={4}
          pointColor={{ theme: "background" }}
          pointBorderWidth={2}
          pointBorderColor={{ from: "seriesColor" }}
          enableArea
          areaOpacity={0.12}
          useMesh
          enableGridX={false}
          tooltip={({ point }) => (
            <div className="px-3 py-2 rounded-lg border border-theme-primary bg-theme-secondary text-[11px] text-theme-primary">
              <div className="font-semibold mb-1">{formatFechaTooltip(String(point.data.x))}</div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: point.seriesColor }} />
                <span>
                  {point.seriesId}: <strong>{Number(point.data.y).toFixed(2)}%</strong>
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
