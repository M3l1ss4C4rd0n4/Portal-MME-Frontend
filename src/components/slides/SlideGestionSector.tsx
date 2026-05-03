"use client";

import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { KpiBlock, HydroKpiBlock } from "@/components/kpi";
import { estadoReservas, estadoAportes, estadoPrecio, estadoGeneracion, diagnosticoSIN } from "@/lib/kpi-logic";
import { NIVO_SLIDER } from "@/lib/nivo-theme";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

export function SlideGestionSector({
  d,
  detalle,
}: {
  d: HomeSliderProps["sectorData"];
  detalle?: HomeSliderProps["sectorDetalle"];
}) {
  const hasDetalle = !!detalle && detalle.generacionPorFuente.length > 0;
  const hasPrecioSeries = !!detalle && detalle.precioBolsaSeries.length > 0 && detalle.precioBolsaSeries[0].data.length > 0;
  const aportes = d.aportesHidricos;
  const aportesPct = aportes?.pct ?? (aportes && aportes.historicoGwh > 0 ? (aportes.actualGwh / aportes.historicoGwh) * 100 : null);

  const stRes = estadoReservas(d.pctEmbalses);
  const stAp = aportesPct !== null ? estadoAportes(aportesPct) : null;
  const stPr = estadoPrecio(d.precioBolsa);
  const stGen = estadoGeneracion(
    detalle?.generacionPorFuente,
    d.generacionGwh,
    aportes?.dailyActualGwh,
    d.precioBolsa
  );
  const diagnostico = diagnosticoSIN(d.pctEmbalses, aportesPct, d.precioBolsa);

  const aportesColor = aportesPct === null
    ? "text-slate-400"
    : aportesPct >= 100
    ? "text-emerald-400"
    : aportesPct >= 80
    ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-amber-900/15 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-7xl px-6 xl:px-8 gap-4 xl:gap-6">
        <div className="text-center">
          <SectionBadge label="Gestión del Sector" pulse dot="#EF4444" />
          <p className="text-slate-300 text-sm xl:text-base font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-xs xl:text-sm mt-0.5">
            {d.ultimaEjecucionETL
              ? `ETL sector energético · última ejecución: ${d.ultimaEjecucionETL}`
              : d.ultimaActualizacion
              ? `Datos en tiempo real de XM · últimos datos: ${d.ultimaActualizacion}`
              : "Datos en tiempo real de XM"}
          </p>
        </div>

        <div className="grid grid-cols-4 w-full divide-x divide-white/5">
          <KpiBlock
            label="Precio de Bolsa (PPP)"
            value={`$${d.precioBolsa.toFixed(2)}`}
            unit="COP/kWh"
            date={d.fechaPrecio}
            valueClass="text-amber-400"
            chipLabel={stPr.label}
            chipColor={stPr.color}
            tendencia={d.tendencias?.precio}
            metrica="precio"
          />
          <KpiBlock
            label="Energía Generada"
            value={d.generacionGwh.toFixed(2)}
            unit="GWh"
            date={d.fechaGeneracion}
            valueClass="text-blue-400"
            chipLabel={stGen.label}
            chipColor={stGen.color}
            tendencia={d.tendencias?.generacion}
            metrica="generacion"
          />
          <HydroKpiBlock
            label="Reservas Hídricas"
            pct={d.pctEmbalses}
            pctColor={stRes.tw}
            gwh={d.embalseGwh}
            gwhRef={d.capacidadEmbalseGwh}
            gwhRefLabel="cap."
            date={d.fechaEmbalse}
            chipLabel={stRes.label}
            chipColor={stRes.color}
            tendencia={d.tendencias?.embalses}
            metrica="embalses"
          />
          {aportesPct !== null && stAp ? (
            <HydroKpiBlock
              label="Aportes Hídricos"
              pct={aportesPct}
              pctColor={aportesColor}
              gwh={aportes?.actualGwh}
              gwhRef={aportes?.historicoGwh}
              gwhRefLabel="hist."
              dailyGwh={aportes?.dailyActualGwh}
              dailyHistGwh={aportes?.dailyHistGwh}
              date={d.fechaAportes}
              chipLabel={stAp.label}
              chipColor={stAp.color}
              tendencia={d.tendencias?.aportes}
              metrica="aportes"
            />
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-slate-600 text-sm">Sin datos</p>
            </div>
          )}
        </div>

        {hasDetalle && (
          <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-3 xl:gap-4">
            {hasPrecioSeries && (
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Precio de Bolsa (PPP) · Tendencia</p>
                <div className="h-[120px] xl:h-[140px]">
                  <ResponsiveLine
                    data={detalle!.precioBolsaSeries}
                    theme={NIVO_SLIDER}
                    margin={{ top: 6, right: 12, bottom: 28, left: 36 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: "auto", max: "auto" }}
                    curve="catmullRom"
                    enablePoints={false}
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 6,
                      tickRotation: 0,
                      tickValues: "every 4 days",
                      format: (value) => {
                        const dataPoint = detalle!.precioBolsaSeries[0]?.data.find((d) => d.x === value);
                        if (dataPoint?.fecha) {
                          return String(new Date(dataPoint.fecha).getDate());
                        }
                        return value;
                      },
                    }}
                    axisLeft={{ tickSize: 0, tickValues: 3, tickPadding: 6 }}
                    colors={["#F59E0B"]}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.15}
                    useMesh
                    tooltip={({ point }) => {
                      const dataPoint = detalle!.precioBolsaSeries[0]?.data.find((d) => d.x === point.data.x);
                      const fecha = dataPoint?.fecha
                        ? new Date(dataPoint.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                        : point.data.xFormatted;
                      return (
                        <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                          {fecha}: <strong className="text-amber-400">${Number(point.data.y).toFixed(2)}</strong>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col items-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 self-start">Generación por Fuente</p>
              <div className="relative h-[120px] xl:h-[140px] w-full">
                <ResponsivePie
                  data={detalle!.generacionPorFuente}
                  theme={NIVO_SLIDER}
                  margin={{ top: 4, right: 35, bottom: 4, left: 4 }}
                  innerRadius={0.65}
                  padAngle={2}
                  cornerRadius={3}
                  activeOuterRadiusOffset={5}
                  colors={{ datum: "data.color" }}
                  borderWidth={0}
                  enableArcLinkLabels={false}
                  arcLabelsSkipAngle={12}
                  arcLabelsTextColor="#fff"
                  arcLabelsRadiusOffset={0.75}
                  legends={[
                    {
                      anchor: "right" as const,
                      direction: "column" as const,
                      justify: false,
                      translateX: 30,
                      translateY: 0,
                      itemsSpacing: 3,
                      itemWidth: 60,
                      itemHeight: 12,
                      itemTextColor: "#94A3B8",
                      itemDirection: "left-to-right" as const,
                      symbolSize: 7,
                      symbolShape: "circle" as const,
                    },
                  ]}
                  tooltip={({ datum }: { datum: { color: string; label: string | number; value: number } }) => (
                    <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                      {datum.label}: <strong>{datum.value}%</strong>
                    </div>
                  )}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-12">
                  <span className="text-base xl:text-lg font-bold text-white leading-none">{d.generacionGwh.toFixed(1)}</span>
                  <span className="text-[9px] text-slate-400">GWh</span>
                </div>
              </div>
            </div>

            {detalle?.aportesRios && detalle.aportesRios.length > 0 && (
              <div className="flex flex-col h-[120px] xl:h-[140px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Hidrología · Aportes y Embalses</p>
                <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Aportes · vs Hist.</p>
                    <div className="space-y-[1px]">
                      {detalle.aportesRios.slice(0, 15).map((rio) => {
                        const maxVal = Math.max(rio.actualGwh, rio.historicoGwh);
                        const pct = rio.porcentaje;
                        const pctColor = pct >= 100 ? "text-emerald-400" : pct >= 80 ? "text-amber-400" : "text-red-400";
                        const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
                        return (
                          <div key={rio.codigo} className="flex items-center gap-1 text-[9px] leading-none py-[1px]">
                            <span className="w-12 text-right text-slate-400 truncate" title={rio.nombre}>{rio.nombre}</span>
                            <div className="w-12 h-1.5 bg-slate-700/40 rounded-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 h-full bg-slate-600/30 rounded-sm" style={{ width: `${Math.min((rio.historicoGwh / maxVal) * 100, 100)}%` }} />
                              <div className={`absolute top-0 left-0 h-full ${barColor} rounded-sm`} style={{ width: `${Math.min((rio.actualGwh / maxVal) * 100, 100)}%` }} />
                            </div>
                            <span className={`w-5 text-right font-medium ${pctColor}`}>{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Embalses · % Actual</p>
                    <div className="space-y-[1px]">
                      {detalle.embalses
                        ?.slice()
                        .sort((a, b) => b.capacidadGwh - a.capacidadGwh)
                        .slice(0, 15)
                        .map((emb) => {
                          const embColor =
                            emb.porcentaje < 50
                              ? "bg-red-500"
                              : emb.porcentaje < 60
                              ? "bg-orange-500"
                              : emb.porcentaje < 70
                              ? "bg-amber-500"
                              : emb.porcentaje < 80
                              ? "bg-cyan-500"
                              : "bg-emerald-500";
                          return (
                            <div key={emb.codigo} className="flex items-center gap-1 text-[9px] leading-none py-[1px]">
                              <span className="w-12 text-right text-slate-400 truncate" title={emb.nombre}>{emb.nombre}</span>
                              <div className="w-12 h-1.5 bg-slate-700/40 rounded-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 h-full ${embColor} rounded-sm`} style={{ width: `${Math.min(emb.porcentaje, 100)}%` }} />
                              </div>
                              <span className="w-5 text-right font-medium text-slate-300">{emb.porcentaje.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
