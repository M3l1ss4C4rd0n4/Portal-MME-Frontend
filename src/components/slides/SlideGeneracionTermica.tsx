"use client";

import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar, type BarCustomLayerProps } from "@nivo/bar";
import { KpiBlock } from "@/components/kpi";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { TrendBadge, TrendArrow, getTrendColor } from "@/components/ui/TrendBadge";
import { estadoI3Termica, estadoPrecio, diagnosticoTermico } from "@/lib/kpi-logic";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import type { TermicaSliderData } from "@/types/home-slider";
import { TopAccent, SectionBadge, TooltipSection, TooltipField, TooltipDivider } from "./SlideUI";
import {
  PRECIO_ESCASEZ_PEI_REF_2026_01,
  PRECIO_ESCASEZ_PE_REF_2026_01,
  PRECIO_ESCASEZ_PES_REF_2026_01,
} from "@/lib/umbralesOficiales";


function PriceCard({
  label,
  valor,
  fecha,
  variacionLabel,
  variacion,
  tendencia,
  active,
  tooltip,
}: {
  label: string;
  valor: number;
  fecha?: string | null;
  variacionLabel: string;
  variacion: number | null;
  tendencia: TermicaSliderData["precios"]["escasez"]["tendencia"];
  active: boolean;
  tooltip?: React.ReactNode;
}) {
  const st = estadoPrecio(valor);
  const trendColor =
    tendencia && tendencia.label !== "S/D" ? getTrendColor(tendencia, "precio") : undefined;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border px-4 py-3 transition-all duration-300 ${
        active
          ? "border-teal-400/60 bg-teal-900/30 shadow-[0_0_24px_rgba(45,212,191,0.15)] opacity-100"
          : "border-theme-secondary bg-theme-secondary/20 opacity-40"
      }`}
    >
      <p className="text-theme-muted text-lg xl:text-xl uppercase tracking-[0.2em] font-medium inline-flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </p>
      <div
        className={`inline-flex items-center gap-2 font-black text-3xl xl:text-4xl leading-none mt-1 ${
          active ? "text-theme-primary" : "text-theme-muted"
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
  titleTooltip,
}: {
  data: TermicaSliderData["evolucionTotal"];
  maxTotalDiarioGwh: number;
  titleTooltip?: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  if (!data.length) {
    return (
      <div className="flex flex-col h-[18vh] xl:h-[20vh] items-center justify-center text-theme-muted text-sm">
        Sin datos
      </div>
    );
  }

  const yMax = maxTotalDiarioGwh > 0 ? maxTotalDiarioGwh : Math.max(...data.flatMap((s) => s.data.map((p) => p.y)));
  const gwhTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const toPct = (gwh: number) => (yMax > 0 ? (gwh / yMax) * 100 : 0);

  return (
    <div className="flex flex-col">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
        Generación por Fuente · 1 mes
        {titleTooltip && <InfoTooltip content={titleTooltip} />}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5 min-h-[14px]">
        {data.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 text-[9px] text-slate-400">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.id}
          </span>
        ))}
      </div>
      <div className="h-[18vh] xl:h-[20vh]">
        <ResponsiveLine
          data={data}
          theme={getNivoTheme(isDark)}
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
              <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
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
  titleTooltip,
}: {
  title: string;
  data: TermicaSliderData["evolucionTermica"];
  detalleRef?: TermicaSliderData["evolucionTermica"];
  titleTooltip?: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  if (!data.length) {
    return (
      <div className="flex flex-col h-[18vh] xl:h-[20vh] items-center justify-center text-theme-muted text-sm">
        Sin datos
      </div>
    );
  }
  const ref = detalleRef ?? data;
  return (
    <div className="flex flex-col">
      <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1 inline-flex items-center gap-1">
        {title}
        {titleTooltip && <InfoTooltip content={titleTooltip} />}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5 min-h-[14px]">
        {data.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 text-[9px] text-theme-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.id}
          </span>
        ))}
      </div>
      <div className="h-[18vh] xl:h-[20vh]">
        <ResponsiveLine
          data={data}
          theme={getNivoTheme(isDark)}
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
              <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const stTerm = estadoI3Termica(d.generacionTermica.participacionPct);
  const diagnostico = diagnosticoTermico(
    d.generacionTermica.participacionPct,
    d.precios.ppp.valor,
    d.precios.escasez.valor,
  );

  const barData = [...d.plantas]
    .sort((a, b) => b.generacionGwh - a.generacionGwh)
    .map((p) => ({
      planta: p.nombre.length > 18 ? `${p.nombre.slice(0, 16)}…` : p.nombre,
      generacion: p.generacionGwh,
      pct: p.participacionPct,
    }))
    .reverse();

  // ─── Tooltips ────────────────────────────────────────────────────────────

  const tooltipTermica = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Energía Térmica — Despacho SIN</p>
      <TooltipSection label="Definición">
        Generación eléctrica diaria de todas las plantas térmicas del SIN (carbón, gas, gas importado y líquidos), expresada en GWh/día.
      </TooltipSection>
      <TooltipSection label="Fuente">
        XM publica generación por tecnología con rezago de 1 a 3 días desde SIMEM.
      </TooltipSection>
      <TooltipDivider />
      <TooltipSection label="Índice I3 — Umbrales CND">
        <TooltipField label="≤ 15%" value="SOSTENIBLE — dentro del rango base del SIN." />
        <TooltipField label="≤ 25%" value="NORMAL — soporte complementario a la hidráulica." />
        <TooltipField label="≤ 35%" value="ALERTA MEDIA — presión sobre la generación hídrica." />
        <TooltipField label="> 35%" value="CRÍTICO — supera el umbral estructural (criterio CND)." />
      </TooltipSection>
      <TooltipDivider />
      <TooltipField label="Estado actual" value={stTerm.label} />
      <TooltipField label="Participación" value={`${d.generacionTermica.participacionPct.toFixed(1)}% del total generado en el SIN.`} />
    </div>
  );

  const pei = PRECIO_ESCASEZ_PEI_REF_2026_01;
  const pe = PRECIO_ESCASEZ_PE_REF_2026_01;
  const pes = PRECIO_ESCASEZ_PES_REF_2026_01;

  const tooltipEscasez = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Precio de Escasez (PE)</p>
      <TooltipSection label="Definición">
        Precio regulatorio por encima del cual se activan mecanismos de cargo por confiabilidad. Fijado por la CREG para garantizar la remuneración de la capacidad de respaldo del sistema.
      </TooltipSection>
      <TooltipSection label="Fuente">
        CREG 101 066/2024 — actualizado mensualmente con índice de precios de combustibles.
      </TooltipSection>
      <TooltipDivider />
      <TooltipField label="Valor actual" value={`$${d.precios.escasez.valor.toFixed(2)} COP/kWh`} />
      <TooltipField label="Referencia PEI" value={`${pei.toFixed(0)} COP/kWh — Precio de Escasez Inferior`} />
      <TooltipField label="Referencia PE" value={`${pe.toFixed(0)} COP/kWh — Precio de Escasez`} />
      <TooltipField label="Referencia PES" value={`${pes.toFixed(0)} COP/kWh — Precio de Escasez Superior`} />
      <TooltipDivider />
      <TooltipSection label="Interpretación">
        Cuando el PE es mayor que el PPP diario (precio de bolsa), significa que la energía en el mercado spot está por debajo del precio de escasez — condición favorable. Cuando el PPP supera el PE, el sistema está bajo presión de precio.
      </TooltipSection>
    </div>
  );

  const tooltipPPP = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">PPP Diario — Precio de Bolsa Nacional</p>
      <TooltipSection label="Definición">
        Precio ponderado al que se transa la energía en el mercado mayorista colombiano (COP/kWh). Refleja el equilibrio entre oferta y demanda hora a hora en el SIN.
      </TooltipSection>
      <TooltipSection label="Fuente">
        XM publica <span className="text-slate-400 font-mono text-[11px]">PrecBolsNaci</span> diariamente desde SIMEM.
      </TooltipSection>
      <TooltipDivider />
      <TooltipField label="Valor actual" value={`$${d.precios.ppp.valor.toFixed(2)} COP/kWh`} />
      <TooltipField label="Var. semanal" value={d.precios.ppp.variacion != null ? `${d.precios.ppp.variacion >= 0 ? "+" : ""}${d.precios.ppp.variacion.toFixed(2)} COP/kWh vs hace 7 días` : "Sin dato"} />
      <TooltipDivider />
      <TooltipSection label="Relación con el precio de escasez">
        Si el PPP supera el PE ({pe.toFixed(0)} COP/kWh), el Índice PBP acumula días en alerta (CREG 026/2014 Art. 3). Cuatro o más días en los últimos 7 activan nivel RIESGO en el diagnóstico del SIN.
      </TooltipSection>
    </div>
  );

  const tooltipPlantas = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Plantas Térmicas · Generación Diaria</p>
      <TooltipSection label="Qué muestra">
        Top 12 plantas térmicas del SIN ordenadas por generación del último día completo disponible. La barra muestra GWh generados y el porcentaje de participación sobre el total térmico.
      </TooltipSection>
      <TooltipSection label="Fuente">
        XM: generación por planta desde SIMEM. Rezago típico de 1 a 3 días.
      </TooltipSection>
      <TooltipDivider />
      <TooltipSection label="Tipos de combustible">
        <TooltipField label="Gas" value="Gas natural nacional — fuente principal (color verde)." />
        <TooltipField label="Gas Importado" value="GNL regasificado — terminal Cartagena, más costoso (color rojo)." />
        <TooltipField label="Carbón" value="Carbón mineral — Paipa, Gecelca, Termonorte (color gris)." />
        <TooltipField label="Líquidos" value="Fuel oil / diésel — respaldo de emergencia, costo alto (color morado)." />
      </TooltipSection>
      <p className="text-[10px] text-slate-500 italic mt-1">Pase el cursor sobre una barra para ver valores exactos.</p>
    </div>
  );

  const tooltipEvolucion = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Evolución Generación Térmica · 1 mes</p>
      <TooltipSection label="Qué muestra">
        Serie diaria de generación térmica del último mes, desglosada por tipo de combustible (carbón, gas, gas importado, líquidos). Permite ver cambios en la composición del despacho térmico.
      </TooltipSection>
      <TooltipField label="Fuente" value="XM: generación por tecnología desde SIMEM." />
      <TooltipDivider />
      <TooltipField label="Señal de alerta" value="Una subida sostenida del gas importado o líquidos indica escasez de gas nacional o sequía prolongada — ambos encarecen el despacho." />
      <TooltipField label="Umbral estructural" value="Si la suma total térmica supera el 35% del total SIN de forma sostenida, el sistema está en riesgo estructural (criterio CND)." />
      <p className="text-[10px] text-slate-500 italic mt-1">Pase el cursor sobre un punto para ver GWh por combustible.</p>
    </div>
  );

  const tooltipFuentes = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Generación por Fuente · 1 mes</p>
      <TooltipSection label="Qué muestra">
        Evolución diaria de la generación total del SIN por tipo de fuente (hidráulica, térmica, solar, eólica). El eje izquierdo muestra GWh y el eje derecho el porcentaje de participación sobre el total diario.
      </TooltipSection>
      <TooltipField label="Fuente" value="XM: generación por tecnología. Dato del último mes completo disponible." />
      <TooltipDivider />
      <TooltipField label="Matriz típica" value="~58% hidráulica, ~27% térmica, ~15% solar (Colombia, 2026)." />
      <TooltipField label="Alerta" value="Participación térmica mayor a 35% sostenida = riesgo estructural (criterio CND)." />
      <p className="text-[10px] text-slate-500 italic mt-1">Pase el cursor sobre un punto para ver GWh y % de participación.</p>
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full h-full max-w-7xl px-6 xl:px-8 py-4 justify-evenly">
        <div className="text-center">
          <SectionBadge label="Generación Térmica" pulse dot="#EF4444" />
          <p className="text-slate-300 text-sm xl:text-base font-medium">{diagnostico}</p>
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
            tooltip={tooltipTermica}
          />
          <PriceCard
            label="Precio Escasez"
            valor={d.precios.escasez.valor}
            fecha={d.precios.escasez.fecha}
            variacionLabel="Var. mensual"
            variacion={d.precios.escasez.variacion}
            tendencia={d.precios.escasez.tendencia}
            active={d.precios.mayor === "escasez"}
            tooltip={tooltipEscasez}
          />
          <PriceCard
            label="PPP Diario"
            valor={d.precios.ppp.valor}
            fecha={d.precios.ppp.fecha}
            variacionLabel="Var. semanal"
            variacion={d.precios.ppp.variacion}
            tendencia={d.precios.ppp.tendencia}
            active={d.precios.mayor === "ppp"}
            tooltip={tooltipPPP}
          />
          <div className="flex flex-col min-h-[20vh]">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
              Plantas Térmicas · Diaria
              <InfoTooltip content={tooltipPlantas} />
            </p>
            <div className="flex-1 min-h-[18vh]">
              {barData.length > 0 ? (
                <ResponsiveBar
                  data={barData}
                  keys={["generacion"]}
                  indexBy="planta"
                  layout="horizontal"
                  theme={getNivoTheme(isDark)}
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
                    <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
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
          <LineChartPanel
            title="Evolución Generación Térmica · 1 mes"
            data={d.evolucionTermica}
            titleTooltip={tooltipEvolucion}
          />
          <FuentesDualAxisChart
            data={d.evolucionTotal}
            maxTotalDiarioGwh={d.maxTotalDiarioGwh}
            titleTooltip={tooltipFuentes}
          />
        </div>
      </div>
    </div>
  );
}
