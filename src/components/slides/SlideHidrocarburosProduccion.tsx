"use client";

import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { KpiBlock } from "@/components/kpi";
import { fmtNum } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

const KPI_CARD = "bg-theme-secondary border border-card-hidrocarburos rounded-xl px-2 py-2 overflow-hidden";

function formatVariacion(abs: number | null | undefined, pct: number | null | undefined): string {
  if (abs == null) return "";
  const flecha = abs >= 0 ? "▲" : "▼";
  const pctStr = pct != null ? ` (${Math.abs(pct).toFixed(2)}%)` : "";
  return `${flecha} US$${Math.abs(abs).toFixed(2)}${pctStr}`;
}

function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function tickValuesEspaciados(xs: string[]): string[] {
  if (xs.length <= 7) return xs;
  const step = Math.ceil(xs.length / 6);
  return xs.filter((_, i) => i % step === 0);
}

function TopRanking({ title, items, color }: { title: string; items: Array<{ nombre: string; valor: number }>; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 text-center">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.nombre} className="flex items-center gap-1.5 text-[10px] leading-none">
            <span className="w-14 text-right text-slate-400 truncate">{item.nombre}</span>
            <div className="flex-1 h-2.5 bg-theme-tertiary rounded-sm overflow-hidden">
              <div className="h-full rounded-sm" style={{ width: `${(item.valor / max) * 100}%`, background: color }} />
            </div>
            <span className="w-12 text-slate-300 font-medium">{fmtNum(item.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SlideHidrocarburosProduccion({ d }: { d?: HomeSliderProps["hidroProdData"] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const wti = d?.commodities?.wti;
  const brent = d?.commodities?.brent;
  const produccionDiaria = d?.produccionDiaria ?? [];
  const ultimaProduccion = produccionDiaria[produccionDiaria.length - 1];
  const top5 = d?.top5 ?? [];
  const brecha = d?.brecha;

  const commodityLineData = useMemo(() => {
    const series: Array<{ id: string; color: string; data: Array<{ x: string; y: number }> }> = [];
    if (wti?.historico?.length) {
      series.push({ id: "WTI", color: "#D97706", data: wti.historico.map((p) => ({ x: p.fecha, y: p.valor })) });
    }
    if (brent?.historico?.length) {
      series.push({ id: "BRENT", color: "#FCD34D", data: brent.historico.map((p) => ({ x: p.fecha, y: p.valor })) });
    }
    return series;
  }, [wti, brent]);
  const commodityTickValues = useMemo(
    () => tickValuesEspaciados(commodityLineData[0]?.data.map((p) => p.x) ?? []),
    [commodityLineData]
  );

  const produccionLineData = useMemo(() => {
    if (!produccionDiaria.length) return [];
    return [{ id: "Petróleo", color: "#D97706", data: produccionDiaria.map((p) => ({ x: p.fecha, y: p.petroleo_bbl })) }];
  }, [produccionDiaria]);
  const produccionTickValues = useMemo(
    () => tickValuesEspaciados(produccionLineData[0]?.data.map((p) => p.x) ?? []),
    [produccionLineData]
  );

  const top5CamposPetroleo = useMemo(
    () => top5.filter((t) => t.categoria === "campos_petroleo").sort((a, b) => b.valor - a.valor).slice(0, 5),
    [top5]
  );
  const top5CamposGas = useMemo(
    () => top5.filter((t) => t.categoria === "campos_gas").sort((a, b) => b.valor - a.valor).slice(0, 5),
    [top5]
  );
  const top5Periodo = top5[0]?.mes;

  // Hallazgo: concentración del campo líder de gas sobre el total fiscalizado del mes.
  const concentracionGas = useMemo(() => {
    if (!top5CamposGas.length || !produccionDiaria.length) return null;
    const totalMensual = produccionDiaria.reduce((acc, p) => acc + p.gas_fiscalizado_mpc, 0);
    if (totalMensual <= 0) return null;
    const lider = top5CamposGas[0];
    return { nombre: lider.nombre, pct: (lider.valor / totalMensual) * 100 };
  }, [top5CamposGas, produccionDiaria]);

  const smallAxisTheme = useMemo(() => {
    const theme = getNivoTheme(isDark);
    return {
      ...theme,
      axis: {
        ...theme.axis,
        ticks: {
          ...theme.axis?.ticks,
          text: { ...theme.axis?.ticks?.text, fontSize: 8 },
        },
        legend: {
          ...theme.axis?.legend,
          text: { ...theme.axis?.legend?.text, fontSize: 8 },
        },
      },
    };
  }, [isDark]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#D97706" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-transparent to-orange-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 pt-3 pb-14 overflow-y-auto flex flex-col items-center justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Producción de Petróleo y Gas" dot="#D97706" titleColorClass="text-title-hidrocarburos" category="hidrocarburos" />
          <p className="text-slate-500 text-base xl:text-lg">
            {ultimaProduccion
              ? `Producción y gas · corte ${new Date(ultimaProduccion.fecha).toLocaleDateString("es-CO")} · Fuente: ANH (Dirección de Hidrocarburos)`
              : "Producción y gas · Fuente: ANH (Dirección de Hidrocarburos)"}
          </p>
        </div>

        <div className="grid grid-cols-3 w-full gap-3">
          <div className={KPI_CARD}>
            <KpiBlock
              label="Petróleo WTI"
              value={wti?.valorUsd != null ? `US$${wti.valorUsd.toFixed(2)}` : "—"}
              unit={formatVariacion(wti?.variacionAbs, wti?.variacionPct)}
              valueClass="text-amber-400"
            />
            {wti?.fechaCarga && (
              <p className="text-[11px] text-slate-500 mt-0.5 text-center">La República · act. {formatFechaHora(wti.fechaCarga)}</p>
            )}
          </div>
          <div className={KPI_CARD}>
            <KpiBlock
              label="Petróleo BRENT"
              value={brent?.valorUsd != null ? `US$${brent.valorUsd.toFixed(2)}` : "—"}
              unit={formatVariacion(brent?.variacionAbs, brent?.variacionPct)}
              valueClass="text-orange-400"
            />
            {brent?.fechaCarga && (
              <p className="text-[11px] text-slate-500 mt-0.5 text-center">La República · act. {formatFechaHora(brent.fechaCarga)}</p>
            )}
          </div>
          <div className={KPI_CARD}>
            <KpiBlock
              label="Producción Petróleo"
              value={ultimaProduccion ? fmtNum(ultimaProduccion.petroleo_bbl) : "—"}
              unit="bbl/día"
              valueClass="text-gold"
            />
          </div>
        </div>

        {/* KPIs de gas + rankings Top 5 en una sola fila — los rankings son compactos
            y caben cómodos junto a las 3 tarjetas */}
        <div className="grid grid-cols-5 w-full gap-3 items-stretch">
          <div className={KPI_CARD}>
            <KpiBlock
              label="Gas Fiscalizado"
              value={ultimaProduccion ? fmtNum(ultimaProduccion.gas_fiscalizado_mpc) : "—"}
              unit="Mpcd"
              valueClass="text-cyan-400"
              labelSizeClass="text-xs xl:text-sm 2xl:text-base"
            />
          </div>
          <div className={KPI_CARD}>
            <KpiBlock
              label="Gas Comercializado"
              value={ultimaProduccion ? fmtNum(ultimaProduccion.gas_comercializado_mpc) : "—"}
              unit="Mpcd"
              valueClass="text-teal-400"
              labelSizeClass="text-xs xl:text-sm 2xl:text-base"
            />
          </div>
          <div className={KPI_CARD}>
            <KpiBlock
              label="Brecha Fisc.-Comerc."
              value={brecha ? fmtNum(brecha.mpcd) : "—"}
              unit={brecha?.pct != null ? `Mpcd · ${brecha.pct.toFixed(0)}% no comerc.` : "Mpcd"}
              valueClass="text-red-400"
              labelSizeClass="text-xs xl:text-sm 2xl:text-base"
            />
          </div>
          <TopRanking title={`Top 5 Campos · Petróleo (BLS/mes)${top5Periodo ? ` · ${top5Periodo}` : ""}`} items={top5CamposPetroleo} color="#D97706" />
          <TopRanking title={`Top 5 Campos · Gas (MPC/mes)${top5Periodo ? ` · ${top5Periodo}` : ""}`} items={top5CamposGas} color="#06B6D4" />
        </div>

        {/* Gráficas de línea solas en su propia fila — necesitan más espacio horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-3">
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 text-center">
              WTI/BRENT (US$/bbl) · La República{(wti?.fechaCarga || brent?.fechaCarga) ? ` · act. ${formatFechaHora(wti?.fechaCarga ?? brent?.fechaCarga)}` : ""}
            </p>
            <div className="h-[20vh]">
              {commodityLineData.length > 0 ? (
                <ResponsiveLine
                  data={commodityLineData}
                  theme={smallAxisTheme}
                  margin={{ top: 6, right: 8, bottom: 32, left: 42 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: "auto", max: "auto" }}
                  curve="catmullRom"
                  enablePoints={false}
                  enableGridX={false}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 4,
                    tickValues: commodityTickValues,
                    format: (value) => new Date(String(value)).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", ""),
                    legend: "Fecha",
                    legendPosition: "middle",
                    legendOffset: 28,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickValues: 3,
                    tickPadding: 4,
                    legend: "US$/bbl",
                    legendPosition: "middle",
                    legendOffset: -34,
                  }}
                  colors={{ datum: "color" }}
                  lineWidth={2}
                  useMesh
                  tooltip={({ point }) => (
                    <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                      <p className="font-semibold text-theme-primary text-sm">
                        {new Date(String(point.data.x)).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="mt-0.5">
                        {point.seriesId}: <strong style={{ color: point.color }}>US${Number(point.data.y).toFixed(2)}</strong>
                      </p>
                    </div>
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-slate-500 text-xs">Cargando…</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 text-center">
              Producción Petróleo (bbl/d) · ANH{ultimaProduccion ? ` · ${new Date(ultimaProduccion.fecha).toLocaleDateString("es-CO")}` : ""}
            </p>
            <div className="h-[20vh]">
              {produccionLineData.length > 0 ? (
                <ResponsiveLine
                  data={produccionLineData}
                  theme={smallAxisTheme}
                  margin={{ top: 6, right: 8, bottom: 32, left: 50 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: "auto", max: "auto" }}
                  curve="catmullRom"
                  enablePoints={false}
                  enableGridX={false}
                  enableArea
                  areaOpacity={0.15}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 4,
                    tickValues: produccionTickValues,
                    format: (value) => new Date(String(value)).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", ""),
                    legend: "Fecha",
                    legendPosition: "middle",
                    legendOffset: 28,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickValues: 3,
                    tickPadding: 4,
                    format: (v) => fmtNum(Number(v)),
                    legend: "bbl/día",
                    legendPosition: "middle",
                    legendOffset: -42,
                  }}
                  colors={["#D97706"]}
                  lineWidth={2}
                  useMesh
                  tooltip={({ point }) => (
                    <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                      <p className="font-semibold text-theme-primary text-sm">
                        {new Date(String(point.data.x)).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="mt-0.5">
                        Petróleo: <strong className="text-amber-400">{fmtNum(Number(point.data.y))} bbl/día</strong>
                      </p>
                    </div>
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-slate-500 text-xs">Cargando…</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {concentracionGas && (
          <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400">
            <strong className="text-cyan-400">{concentracionGas.nombre}</strong> concentra el{" "}
            <strong className="text-cyan-400">{concentracionGas.pct.toFixed(0)}%</strong> de todo el gas fiscalizado nacional del mes.
          </p>
        )}
      </div>
    </div>
  );
}
