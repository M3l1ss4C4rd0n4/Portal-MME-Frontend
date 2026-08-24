"use client";

import { useMemo } from "react";
import { ResponsivePie } from "@nivo/pie";
import SemiGauge from "@/components/ui/SemiGauge";
import { fmtNum, fmtCOPShort } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";
import { SkeletonBlock } from "@/components/ui/Skeleton";

type EtapaChipProps = {
  label: string;
  value: number;
  pct?: string;
  color: string;
};

function EtapaChip({ label, value, pct, color }: EtapaChipProps) {
  return (
    <div className="flex flex-col items-center bg-card-glow-energia border border-card-energia rounded-xl px-5 py-2 flex-1">
      <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">{label}</span>
      <span className={`text-2xl xl:text-3xl font-bold leading-none ${color}`}>{fmtNum(value)}</span>
      {pct && <span className="text-[11px] text-slate-500 mt-0.5">{pct}</span>}
    </div>
  );
}

export function SlideSupervision({ d }: { d: HomeSliderProps["supData"] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const tot = d.nContratos || 1;
  const pct = (n: number) => `${((n / tot) * 100).toFixed(1)}%`;

  // Hallazgo: fondo que concentra más contratos supervisados.
  const fondoTop = useMemo(() => {
    if (!d.porFondo || d.porFondo.length === 0 || !d.nContratos) return null;
    const top = d.porFondo.slice().sort((a, b) => b.contratos - a.contratos)[0];
    return { nombre: top.fondo, pct: (top.contratos / d.nContratos) * 100, contratos: top.contratos };
  }, [d.porFondo, d.nContratos]);

  return (
    <div className="relative w-full h-full flex flex-col bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full max-w-6xl w-full mx-auto px-6 xl:px-10 py-4 justify-evenly gap-2">

        {/* Título */}
        <div className="text-center shrink-0">
          <SectionBadge label="Supervisión" dot="#3B82F6" titleColorClass="text-gradient-energia" category="energia" />
          <p className="text-slate-500 text-sm">Monitoreo y seguimiento de contratos · 2015–2026</p>
        </div>

        {/* KPIs principales — 2 col */}
        <div className="grid grid-cols-2 gap-4 shrink-0 max-w-2xl mx-auto w-full">
          <div className="bg-card-glow-energia border border-card-energia rounded-xl px-6 py-2 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Usuarios contratados</p>
            <p className="text-3xl xl:text-4xl font-bold text-theme-primary leading-tight">{fmtNum(d.usuarios.contratados)}</p>
            <p className="text-xs text-slate-500">beneficiarios ZNI/SIN</p>
          </div>
          <div className="bg-card-glow-energia border border-card-energia rounded-xl px-6 py-2 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Valor total portafolio</p>
            <p className="text-3xl xl:text-4xl font-bold text-chart-teal leading-tight">{fmtCOPShort(d.financiero.valorProyecto)}</p>
            <p className="text-xs text-slate-500">portafolio supervisado</p>
          </div>
        </div>

        {/* Etapas — 6 chips horizontales */}
        <div className="flex gap-2 shrink-0">
          <EtapaChip label="Contratos"   value={d.nContratos}         color="text-theme-primary"    />
          <EtapaChip label="Ejecución"   value={d.enEjecucion}         color="text-chart-teal" pct={pct(d.enEjecucion)} />
          <EtapaChip label="AOM"         value={d.enAOM}               color="text-theme-secondary"    pct={pct(d.enAOM)} />
          <EtapaChip label="Liquidación" value={d.enLiquidacion}       color="text-theme-secondary"   pct={pct(d.enLiquidacion)} />
          <EtapaChip label="Liquidados"  value={d.liquidados}           color="text-slate-300"   pct={pct(d.liquidados)} />
          {/* Excepción deliberada: resultado negativo real, se mantiene en rojo aunque las demás etapas usen la paleta decorativa neutral */}
          <EtapaChip label="Pérd. Comp." value={d.perdidaCompetencia}   color="text-danger"    pct={pct(d.perdidaCompetencia)} />
        </div>

        {/* Sección inferior: Gauges + Donut */}
        <div className="flex items-center justify-center gap-10 xl:gap-16">

          {/* Gauges */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] text-theme-muted uppercase tracking-widest">Avance portafolio</span>
            <div className="flex gap-8">
              <SemiGauge rawValue={d.avanceContrato}   label="General"    color="energia" size="xl" delay={0.25} />
              <SemiGauge rawValue={d.avanceFisico}     label="Físico"     color="energia" size="xl" delay={0.3}  />
              <SemiGauge rawValue={d.avanceFinanciero} label="Financiero" color="energia" size="xl" delay={0.35} />
            </div>
          </div>

          {/* Donut */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-theme-muted uppercase tracking-widest">Por fondo</span>
            <div className="w-[380px] h-[20vh] relative">
              {d.porFondo.length > 0 ? (
                <>
                  <ResponsivePie
                    data={d.porFondo.slice(0, 6).map((f, i) => ({
                      id: f.fondo,
                      label: f.fondo,
                      value: f.contratos,
                      color: ["#3B82F6", "#14B8A6", "#1D4ED8", "#94A3B8", "#64748B", "#334155"][i],
                    }))}
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 8, right: 105, bottom: 8, left: 8 }}
                    innerRadius={0.58}
                    padAngle={2}
                    cornerRadius={4}
                    activeOuterRadiusOffset={6}
                    colors={{ datum: "data.color" }}
                    borderWidth={0}
                    enableArcLinkLabels={false}
                    arcLabelsSkipAngle={14}
                    arcLabelsTextColor="#fff"
                    arcLabelsRadiusOffset={0.75}
                    legends={[{
                      anchor: "right" as const,
                      direction: "column" as const,
                      justify: false,
                      translateX: 95,
                      translateY: 0,
                      itemsSpacing: 7,
                      itemWidth: 90,
                      itemHeight: 18,
                      itemTextColor: "var(--text-secondary)",
                      itemDirection: "left-to-right" as const,
                      symbolSize: 9,
                      symbolShape: "circle" as const,
                    }]}
                    tooltip={({ datum }) => (
                      <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                        {datum.label}: <strong>{datum.value}</strong>
                      </div>
                    )}
                  />
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    style={{ paddingRight: 105 }}
                  >
                    <span className="text-2xl font-bold text-theme-primary leading-none">{d.nContratos}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">contratos</span>
                  </div>
                </>
              ) : (
                <SkeletonBlock className="h-full w-full" />
              )}
            </div>
          </div>

        </div>

        {fondoTop && (
          <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400 mx-auto">
            El fondo <strong className="text-title-energia">{fondoTop.nombre}</strong> concentra el{" "}
            <strong className="text-title-energia">{fondoTop.pct.toFixed(0)}%</strong> de los contratos supervisados ({fondoTop.contratos} de {d.nContratos}).
          </p>
        )}
      </div>
    </div>
  );
}
