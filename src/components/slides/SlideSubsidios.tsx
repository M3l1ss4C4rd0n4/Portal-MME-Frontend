"use client";

import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { KpiBlock } from "@/components/kpi";
import { fmtCOP, fmtNum, fmtFull } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

export function SlideSubsidios({
  d,
  deficitFssri,
  deficitSeries,
  subBarData,
}: {
  d: HomeSliderProps["subData"];
  deficitFssri?: number;
  deficitSeries?: Array<{ x: string; y: number }>;
  subBarData?: Array<{ anio: string; Subsidios: number; Contribuciones: number }>;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const asig = d.anio2026.valorAsignado;
  const pag = d.anio2026.pagado;
  const pend = d.anio2026.pendiente;
  const pctPag = asig > 0 ? (pag / asig) * 100 : 0;
  const pctPend = asig > 0 ? (pend / asig) * 100 : 0;
  const deficitPrincipal = deficitFssri ?? d.deficitAcumulado;

  const historicoPorAnio = (d.historico ?? []).reduce((acc, h) => {
    const a = h.anio;
    if (!acc[a]) acc[a] = { asignado: 0, pagado: 0, pendiente: 0 };
    acc[a].asignado += h.valor_asignado;
    acc[a].pagado += h.pagado;
    acc[a].pendiente += h.pendiente;
    return acc;
  }, {} as Record<number, { asignado: number; pagado: number; pendiente: number }>);

  const anios = Object.keys(historicoPorAnio).map(Number).sort((a, b) => a - b);
  const tieneHistorico = anios.length > 0;
  const mostrarGraficas = (subBarData && subBarData.length > 0) || (deficitSeries && deficitSeries.length > 0) || tieneHistorico;

  const lineData = [
    {
      id: "Asignado",
      color: "#8B5CF6",
      data: anios.map((a) => ({ x: String(a), y: +(historicoPorAnio[a].asignado / 1e9).toFixed(1) })),
    },
    {
      id: "Pagado",
      color: "#10B981",
      data: anios.map((a) => ({ x: String(a), y: +(historicoPorAnio[a].pagado / 1e9).toFixed(1) })),
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#EF4444" />
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/15 via-transparent to-rose-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-evenly">
        <div className="text-center">
          <SectionBadge label="Subsidios Energéticos" dot="#EF4444" />
          <p className="text-slate-500 text-base xl:text-lg">
            Seguimiento a la deuda del fondo de subsidios
          </p>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-sm xl:text-base uppercase tracking-[0.15em] font-medium mb-1">
            Déficit acumulado<span className="normal-case tracking-normal"> — Corte {d.ultimaActualizacion ?? "1 de abril de 2026"}</span>
          </p>
          <div className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-red-400 leading-none">
            {fmtFull(deficitPrincipal)}
          </div>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="Resoluciones 2026"
            value={fmtNum(d.anio2026.resoluciones)}
            unit="expedidas"
            valueClass="text-gold"
          />
          <KpiBlock
            label="Comprometido en Resoluciones 2026"
            value={fmtFull(asig)}
            unit={`${d.anio2026.resoluciones} resoluciones`}
            valueClass="text-purple-400"
          />
          <div className="flex flex-col items-center bg-dash-chip rounded-xl px-5 py-4 w-full">
            <div className="text-[11px] text-slate-400 uppercase tracking-widest">Pendiente de pago 2026</div>
            <div className="mt-2 inline-flex items-start gap-1 text-2xl xl:text-3xl font-bold text-red-400 leading-none">
              {fmtFull(pend)}
              <span className="relative group cursor-help text-lg xl:text-xl leading-none mt-1">
                *
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Pendiente de desembolso por parte del Ministerio de Hacienda y Crédito Público
                </span>
              </span>
            </div>
            <div className="w-full max-w-[280px] mt-3">
              <div className="h-3 bg-theme-tertiary rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-1000 shrink-0"
                  style={{ width: `${pctPag}%` }}
                  title={`Pagado: ${pctPag.toFixed(2)}%`}
                />
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 shrink-0"
                  style={{ width: `${pctPend}%` }}
                  title={`Pendiente: ${pctPend.toFixed(2)}%`}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs">
                <span className="text-emerald-400 font-semibold">{pctPag.toFixed(2)}% Pagado</span>
                <span className="text-red-400 font-semibold">{pctPend.toFixed(2)}% Pendiente</span>
              </div>
            </div>
          </div>
        </div>

        {mostrarGraficas && (
          <div className={`w-full grid ${deficitSeries && deficitSeries.length > 0 ? "grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl" : "max-w-4xl"}`}>
            {subBarData && subBarData.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
                  Subsidios (SIN+ZNI) y Contribuciones por Año
                </p>
                <div className="h-[16vh]">
                  <ResponsiveBar
                    data={subBarData}
                    keys={["Subsidios", "Contribuciones"]}
                    indexBy="anio"
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 6, right: 12, bottom: 28, left: 44 }}
                    groupMode="grouped"
                    valueScale={{ type: "linear" }}
                    indexScale={{ type: "band", round: true }}
                    colors={["#F59E0B", "#8B5CF6"]}
                    borderRadius={2}
                    padding={0.2}
                    innerPadding={2}
                    enableLabel={false}
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{ tickSize: 0, tickPadding: 6, format: (v: string) => String(v).slice(-2) }}
                    axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 4, format: (v: number) => `${v}B` }}
                    legends={[
                      {
                        dataFrom: "keys" as const,
                        anchor: "top" as const,
                        direction: "row" as const,
                        justify: false,
                        translateX: 0,
                        translateY: -16,
                        itemsSpacing: 12,
                        itemWidth: 90,
                        itemHeight: 12,
                        itemTextColor: "var(--text-secondary)",
                        itemDirection: "left-to-right" as const,
                        symbolSize: 8,
                        symbolShape: "circle" as const,
                      },
                    ]}
                    tooltip={({ id, indexValue, data }) => {
                      const exacto = (data as unknown as Record<string, number>)[`${id}_exacto`];
                      return (
                        <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary min-w-[200px]">
                          <p className="font-semibold mb-1 text-theme-secondary">Año {indexValue}</p>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: id === "Subsidios" ? "#F59E0B" : "#8B5CF6" }} />
                              <span>{id}</span>
                            </div>
                            <strong style={{ color: id === "Subsidios" ? "#F59E0B" : "#8B5CF6" }}>{fmtCOP(exacto || 0)}</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            {deficitSeries && deficitSeries.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
                  Déficit acumulado FSSRI (Miles M$)
                </p>
                <div className="h-[16vh]">
                  <ResponsiveLine
                    data={[{ id: "Déficit Acumulado", color: "#EF4444", data: deficitSeries }]}
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 6, right: 12, bottom: 28, left: 44 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: "auto", max: "auto" }}
                    curve="monotoneX"
                    enablePoints
                    pointSize={4}
                    pointBorderWidth={1}
                    pointBorderColor="transparent"
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{ tickSize: 0, tickPadding: 6 }}
                    axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 4, format: (v: number) => `${v}B` }}
                    colors={["#EF4444"]}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.12}
                    useMesh
                    enableSlices="x"
                    legends={[]}
                    sliceTooltip={({ slice }) => {
                      const year = slice.points[0]?.data.xFormatted ?? "";
                      const pt = slice.points[0];
                      return (
                        <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary min-w-[140px]">
                          <p className="font-semibold mb-1 text-theme-secondary">Año {year}</p>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                              <span>Déficit acumulado</span>
                            </div>
                            <strong className="text-red-400">${pt?.data.yFormatted}B</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
