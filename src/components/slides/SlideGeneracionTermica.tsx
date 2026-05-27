"use client";

import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import { KpiBlock } from "@/components/kpi";
import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import { estadoI3Termica, estadoPrecio } from "@/lib/kpi-logic";
import { NIVO_SLIDER } from "@/lib/nivo-theme";
import type { TermicaSliderData } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

const BAR_THEME = NIVO_SLIDER;

function PriceCard({
  label,
  valor,
  fecha,
  variacionLabel,
  variacion,
  tendencia,
  active,
}: {
  label: string;
  valor: number;
  fecha?: string | null;
  variacionLabel: string;
  variacion: number | null;
  tendencia: TermicaSliderData["precios"]["escasez"]["tendencia"];
  active: boolean;
}) {
  const st = estadoPrecio(valor);
  const trendColor =
    tendencia && tendencia.label !== "S/D" ? getTrendColor(tendencia, "precio") : undefined;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border px-4 py-3 transition-all duration-300 ${
        active
          ? "border-teal-400/60 bg-teal-900/30 shadow-[0_0_24px_rgba(45,212,191,0.15)] opacity-100"
          : "border-white/5 bg-white/[0.02] opacity-40"
      }`}
    >
      <p className="text-slate-400 text-lg xl:text-xl uppercase tracking-[0.2em] font-medium">
        {label}
      </p>
      <div
        className={`inline-flex items-center gap-2 font-black text-3xl xl:text-4xl leading-none mt-1 ${
          active ? "text-white" : "text-slate-400"
        }`}
        style={trendColor ? { color: trendColor } : undefined}
      >
        ${valor.toFixed(2)}
        <TrendArrow tendencia={tendencia} metrica="precio" />
      </div>
      {fecha && (
        <p className="text-slate-400 text-xs xl:text-sm mt-0.5">
          COP/kWh · Dato: {fecha}
        </p>
      )}
      {variacion != null && (
        <p className={`text-xs mt-1 ${variacion < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {variacionLabel}: {variacion >= 0 ? "+" : ""}
          {variacion.toFixed(2)}
        </p>
      )}
      <div className="mt-2 flex flex-col items-center gap-1">
        <TrendBadge tendencia={tendencia} metrica="precio" />
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${st.color}22`, color: st.color }}
        >
          {st.label}
        </span>
      </div>
    </div>
  );
}

function FuentesDualAxisChart({
  data,
  maxTotalDiarioGwh,
}: {
  data: TermicaSliderData["evolucionTotal"];
  maxTotalDiarioGwh: number;
}) {
  if (!data.length) {
    return (
      <div className="flex flex-col h-[140px] xl:h-[160px] items-center justify-center text-slate-600 text-sm">
        Sin datos
      </div>
    );
  }

  const yMax = maxTotalDiarioGwh > 0 ? maxTotalDiarioGwh : Math.max(...data.flatMap((s) => s.data.map((p) => p.y)));
  const gwhTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const toPct = (gwh: number) => (yMax > 0 ? (gwh / yMax) * 100 : 0);

  return (
    <div className="flex flex-col">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
        Generación por Fuente · 1 mes
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5 min-h-[14px]">
        {data.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 text-[9px] text-slate-400">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.id}
          </span>
        ))}
      </div>
      <div className="h-[130px] xl:h-[150px]">
        <ResponsiveLine
          data={data}
          theme={NIVO_SLIDER}
          margin={{ top: 4, right: 40, bottom: 28, left: 36 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: yMax }}
          curve="catmullRom"
          enablePoints={false}
          enableGridX={false}
          enableGridY
          gridYValues={gwhTicks}
          axisTop={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 6,
            tickValues: "every 5 days",
            format: (value) => {
              const pt = data[0]?.data.find((d) => d.x === value);
              if (pt?.fecha) return String(new Date(pt.fecha).getDate());
              return value;
            },
          }}
          axisLeft={{
            tickSize: 0,
            tickValues: gwhTicks,
            tickPadding: 6,
            format: (v) => `${Math.round(Number(v))}`,
          }}
          axisRight={{
            tickSize: 0,
            tickValues: gwhTicks,
            tickPadding: 6,
            format: (v) => `${toPct(Number(v)).toFixed(0)}%`,
          }}
          colors={(s) => (s.color as string) ?? "#94A3B8"}
          lineWidth={2}
          useMesh
          tooltip={({ point }) => {
            const serie = data.find((s) => s.id === point.seriesId);
            const pt = serie?.data.find((d) => d.x === point.data.x);
            const fecha = pt?.fecha
              ? new Date(pt.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
              : point.data.xFormatted;
            const gwh = Number(point.data.y);
            const pct = pt?.pct ?? toPct(gwh);
            return (
              <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                {point.seriesId} · {fecha}:{" "}
                <strong>
                  {gwh.toFixed(2)} GWh · {pct.toFixed(1)}%
                </strong>
              </div>
            );
          }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-slate-600 mt-0.5 px-1">
        <span>← GWh</span>
        <span>% participación →</span>
      </div>
    </div>
  );
}

function LineChartPanel({
  title,
  data,
  detalleRef,
}: {
  title: string;
  data: TermicaSliderData["evolucionTermica"];
  detalleRef?: TermicaSliderData["evolucionTermica"];
}) {
  if (!data.length) {
    return (
      <div className="flex flex-col h-[140px] xl:h-[160px] items-center justify-center text-slate-600 text-sm">
        Sin datos
      </div>
    );
  }
  const ref = detalleRef ?? data;
  return (
    <div className="flex flex-col">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5 min-h-[14px]">
        {data.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 text-[9px] text-slate-400">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.id}
          </span>
        ))}
      </div>
      <div className="h-[130px] xl:h-[150px]">
        <ResponsiveLine
          data={data}
          theme={NIVO_SLIDER}
          margin={{ top: 4, right: 8, bottom: 28, left: 36 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto" }}
          curve="catmullRom"
          enablePoints={false}
          enableGridX={false}
          enableGridY
          gridYValues={4}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 6,
            tickValues: "every 5 days",
            format: (value) => {
              const pt = ref[0]?.data.find((d) => d.x === value);
              if (pt?.fecha) return String(new Date(pt.fecha).getDate());
              return value;
            },
          }}
          axisLeft={{ tickSize: 0, tickValues: 4, tickPadding: 6 }}
          colors={(s) => (s.color as string) ?? "#94A3B8"}
          lineWidth={2}
          useMesh
          tooltip={({ point }) => {
            const serie = ref.find((s) => s.id === point.seriesId);
            const pt = serie?.data.find((d) => d.x === point.data.x);
            const fecha = pt?.fecha
              ? new Date(pt.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
              : point.data.xFormatted;
            return (
              <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                {point.seriesId} · {fecha}: <strong>{Number(point.data.y).toFixed(1)} GWh</strong>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

function OutsideBarLabels({
  bars,
}: BarCustomLayerProps<{ planta: string; generacion: number; pct: number }>) {
  return (
    <g>
      {bars.map((bar) => {
        const row = bar.data.data;
        return (
          <text
            key={bar.key}
            x={bar.x + bar.width + 6}
            y={bar.y + bar.height / 2}
            fill="#CBD5E1"
            fontSize={9}
            dominantBaseline="central"
          >
            {`${row.generacion.toFixed(2)} GWh · ${row.pct}% part.`}
          </text>
        );
      })}
    </g>
  );
}

export function SlideGeneracionTermica({ d }: { d: TermicaSliderData }) {
  const stTerm = estadoI3Termica(d.generacionTermica.participacionPct);
  // API entrega DESC; Nivo horizontal pinta el primer ítem abajo → invertir para mayor arriba
  const barData = [...d.plantas]
    .sort((a, b) => b.generacionGwh - a.generacionGwh)
    .map((p) => ({
      planta: p.nombre.length > 18 ? `${p.nombre.slice(0, 16)}…` : p.nombre,
      generacion: p.generacionGwh,
      pct: p.participacionPct,
    }))
    .reverse();

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#EF4444" />
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/15 via-transparent to-amber-900/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-7xl px-6 xl:px-8 gap-3 xl:gap-4">
        <div className="text-center">
          <SectionBadge label="Generación Térmica" pulse dot="#EF4444" />
          <p className="text-slate-300 text-sm xl:text-base font-medium">
            Despacho térmico del SIN · participación {d.generacionTermica.participacionPct.toFixed(1)}% del total
          </p>
          <p className="text-slate-600 text-xs xl:text-sm mt-0.5">Datos XM · sector_energetico</p>
        </div>

        <div className="grid grid-cols-4 w-full gap-3">
          <KpiBlock
            label="Energía Térmica"
            value={d.generacionTermica.gwh.toFixed(2)}
            unit="GWh"
            date={d.generacionTermica.fecha}
            valueClass="text-red-400"
            chipLabel={stTerm.label}
            chipColor={stTerm.color}
            tendencia={d.generacionTermica.tendencia}
            metrica="generacion"
          />
          <PriceCard
            label="Precio Escasez"
            valor={d.precios.escasez.valor}
            fecha={d.precios.escasez.fecha}
            variacionLabel="Var. mensual"
            variacion={d.precios.escasez.variacion}
            tendencia={d.precios.escasez.tendencia}
            active={d.precios.mayor === "escasez"}
          />
          <PriceCard
            label="PPP Diario"
            valor={d.precios.ppp.valor}
            fecha={d.precios.ppp.fecha}
            variacionLabel="Var. semanal"
            variacion={d.precios.ppp.variacion}
            tendencia={d.precios.ppp.tendencia}
            active={d.precios.mayor === "ppp"}
          />
          <div className="flex flex-col min-h-[180px]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Plantas Térmicas · Diaria</p>
            <div className="flex-1 min-h-[160px]">
              {barData.length > 0 ? (
                <ResponsiveBar
                  data={barData}
                  keys={["generacion"]}
                  indexBy="planta"
                  layout="horizontal"
                  theme={BAR_THEME}
                  margin={{ top: 0, right: 132, bottom: 0, left: 92 }}
                  padding={0.25}
                  colors={["#EF4444"]}
                  borderRadius={2}
                  enableGridY={false}
                  axisTop={null}
                  axisRight={null}
                  axisLeft={{ tickSize: 0, tickPadding: 6 }}
                  axisBottom={null}
                  enableLabel={false}
                  layers={["grid", "axes", "bars", OutsideBarLabels, "markers", "legends", "annotations"]}
                  tooltip={({ indexValue, value, data }) => (
                    <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                      {indexValue}: <strong>{Number(value).toFixed(2)} GWh</strong> · {data.pct}% participación
                    </div>
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sin plantas</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 w-full gap-3 xl:gap-4">
          <LineChartPanel title="Evolución Generación Térmica · 1 mes" data={d.evolucionTermica} />
          <FuentesDualAxisChart data={d.evolucionTotal} maxTotalDiarioGwh={d.maxTotalDiarioGwh} />
        </div>
      </div>
    </div>
  );
}
