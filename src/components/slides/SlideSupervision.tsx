"use client";

import { ResponsivePie } from "@nivo/pie";
import SemiGauge from "@/components/ui/SemiGauge";
import { KpiBlock } from "@/components/kpi";
import { fmtNum, fmtCOPShort } from "@/lib/format";
import { NIVO_SLIDER } from "@/lib/nivo-theme";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

export function SlideSupervision({ d }: { d: HomeSliderProps["supData"] }) {
  const tot = d.nContratos || 1;
  const pct = (n: number) => `${((n / tot) * 100).toFixed(1)}%`;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#06B6D4" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Supervisión" dot="#06B6D4" />
          <p className="text-slate-500 text-base xl:text-lg">
            Monitoreo y seguimiento de contratos activos
          </p>
        </div>

        <div className="grid grid-cols-2 w-full max-w-3xl gap-4">
          <KpiBlock
            label="Usuarios contratados"
            value={fmtNum(d.usuarios.contratados)}
            valueClass="text-amber-400"
            unit="beneficiarios ZNI/SIN"
          />
          <KpiBlock
            label="Valor total"
            value={fmtCOPShort(d.financiero.valorProyecto)}
            valueClass="text-yellow-400"
            unit="portafolio supervisado"
          />
        </div>

        <div className="grid grid-cols-6 w-full divide-x divide-white/5">
          <KpiBlock label="Contratos" value={fmtNum(d.nContratos)} valueClass="text-cyan-400" unit="total portafolio" />
          <KpiBlock label="En Ejecución" value={fmtNum(d.enEjecucion)} valueClass="text-emerald-400" unit={pct(d.enEjecucion)} />
          <KpiBlock label="AOM" value={fmtNum(d.enAOM)} valueClass="text-teal-400" unit={`${pct(d.enAOM)} · Op. y mant.`} />
          <KpiBlock label="En Liquidación" value={fmtNum(d.enLiquidacion)} valueClass="text-amber-400" unit={pct(d.enLiquidacion)} />
          <KpiBlock label="Liquidados" value={fmtNum(d.liquidados)} valueClass="text-slate-300" unit={pct(d.liquidados)} />
          <KpiBlock label="Perdida Comp." value={fmtNum(d.perdidaCompetencia)} valueClass="text-rose-400" unit={pct(d.perdidaCompetencia)} />
        </div>

        {/* Gauges: portafolio total + solo activos + Donut */}
        <div className="flex justify-center items-end w-full gap-4 xl:gap-8">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-white/40 uppercase tracking-widest">Portafolio</span>
            <div className="flex gap-4">
              <SemiGauge rawValue={d.avanceFisico} label="Físico" color="success" size="lg" delay={0.3} />
              <SemiGauge rawValue={d.avanceFinanciero} label="Financiero" color="success" size="lg" delay={0.35} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-cyan-400/60 uppercase tracking-widest">En Ejecución</span>
            <div className="flex gap-4">
              <SemiGauge rawValue={d.avanceFisicoActivos} label="Físico" color="gold" size="lg" delay={0.4} />
              <SemiGauge rawValue={d.avanceFinancieroActivos} label="Financiero" color="gold" size="lg" delay={0.45} />
            </div>
          </div>
          <div className="w-[340px] h-[160px] relative">
            {d.porFondo.length > 0 ? (
              <>
                <ResponsivePie
                  data={d.porFondo.slice(0, 6).map((f, i) => ({
                    id: f.fondo,
                    label: f.fondo,
                    value: f.contratos,
                    color: ["#F59E0B", "#8B5CF6", "#06B6D4", "#22C55E", "#EF4444", "#F97316"][i],
                  }))}
                  theme={NIVO_SLIDER}
                  margin={{ top: 6, right: 90, bottom: 6, left: 6 }}
                  innerRadius={0.55}
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
                      translateX: 80,
                      translateY: 0,
                      itemsSpacing: 5,
                      itemWidth: 80,
                      itemHeight: 16,
                      itemTextColor: "#94A3B8",
                      itemDirection: "left-to-right" as const,
                      symbolSize: 8,
                      symbolShape: "circle" as const,
                    },
                  ]}
                  tooltip={({ datum }) => (
                    <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                      {datum.label}: <strong>{datum.value}</strong>
                    </div>
                  )}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingRight: 90 }}>
                  <span className="text-xl font-bold text-white leading-none">{d.nContratos}</span>
                  <span className="text-[9px] text-slate-400">total</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-slate-500 text-sm">Cargando…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
