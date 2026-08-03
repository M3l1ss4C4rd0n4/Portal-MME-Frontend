"use client";

import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { KpiBlock } from "@/components/kpi";
import { fmtCOPShort } from "@/lib/format";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";
import SemiGauge from "@/components/ui/SemiGauge";

const KPI_CARD = "bg-theme-secondary border border-card-hidrocarburos rounded-xl px-2 py-2 overflow-hidden";

function riskColor(pct: number): string {
  if (pct < 20) return "#EF4444";
  if (pct < 50) return "#F59E0B";
  return "#10B981";
}

export function SlideHidrocarburosPresupuesto({ d }: { d?: HomeSliderProps["hidroPresuData"] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const resumen = d?.resumen;
  const proyectos = d?.proyectos ?? [];

  const pctComprometido = (resumen?.pct_compromisos ?? 0) * 100;
  const pctObligado = (resumen?.pct_obligaciones ?? 0) * 100;
  const pctCompNoObl = Math.max(0, pctComprometido - pctObligado);
  const pctDisp = Math.max(0, 100 - pctComprometido);

  // Hallazgos: concentración del proyecto dominante y peor desempeño de ejecución.
  const dominante = useMemo(() => {
    if (!proyectos.length || !resumen?.apropiacion_vigente) return null;
    const top = proyectos.slice().sort((a, b) => b.apropiacion_vigente - a.apropiacion_vigente)[0];
    return { proyecto: top.proyecto, pct: (top.apropiacion_vigente / resumen.apropiacion_vigente) * 100 };
  }, [proyectos, resumen]);

  const peorDesempeno = useMemo(() => {
    if (!proyectos.length) return null;
    return proyectos.slice().sort((a, b) => a.pct_obligacion - b.pct_obligacion)[0];
  }, [proyectos]);

  const barData = useMemo(() => {
    return proyectos
      .slice()
      .sort((a, b) => a.pct_obligacion - b.pct_obligacion)
      .map((p) => ({
        proyecto: p.proyecto.length > 22 ? p.proyecto.slice(0, 22) + "…" : p.proyecto,
        proyectoCompleto: p.proyecto,
        "% Obligación": +(p.pct_obligacion * 100).toFixed(1),
      }))
      .reverse(); // ResponsiveBar horizontal renderiza el índice 0 abajo — invertir para que el peor quede arriba
  }, [proyectos]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#D97706" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-transparent to-orange-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 pt-3 pb-14 overflow-y-auto flex flex-col items-center justify-evenly gap-2">
        <div className="text-center">
          <SectionBadge label="Ejecución Presupuestal Hidrocarburos" dot="#D97706" titleColorClass="text-title-hidrocarburos" category="hidrocarburos" />
          <p className="text-slate-500 text-base xl:text-lg">
            {resumen?.fecha_actualizacion
              ? `Corte: ${new Date(resumen.fecha_actualizacion).toLocaleDateString("es-CO")}`
              : "Dirección de Hidrocarburos"}
          </p>
        </div>

        <div className="grid grid-cols-4 w-full gap-3">
          <div className={KPI_CARD}>
            <KpiBlock label="Apropiación Vigente" value={fmtCOPShort(resumen?.apropiacion_vigente ?? 0)} valueClass="text-gold" />
          </div>
          <div className={KPI_CARD}>
            <KpiBlock
              label="Compromisos"
              value={fmtCOPShort(resumen?.compromisos ?? 0)}
              unit={`${pctComprometido.toFixed(1)}% ejecutado`}
              valueClass="text-amber-400"
            />
          </div>
          <div className={KPI_CARD}>
            <KpiBlock
              label="Obligaciones"
              value={fmtCOPShort(resumen?.obligaciones ?? 0)}
              unit={`${pctObligado.toFixed(1)}% ejecutado`}
              valueClass="text-orange-400"
            />
          </div>
          <div className={KPI_CARD}>
            <KpiBlock label="Por Comprometer" value={fmtCOPShort(resumen?.por_comprometer ?? 0)} valueClass="text-slate-300" />
          </div>
        </div>

        {/* Barra segmentada + gauges — mismo patrón que "Ejecución Presupuestal 2026" */}
        <div className="w-full max-w-4xl">
          <div className="h-4 xl:h-5 bg-theme-tertiary rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 shrink-0"
              style={{ width: `${pctObligado}%` }}
              title={`Obligado (legalizado): ${pctObligado.toFixed(2)}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 shrink-0"
              style={{ width: `${pctCompNoObl}%` }}
              title={`Comprometido restante (aún no obligado): ${pctCompNoObl.toFixed(2)}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-slate-700 to-slate-500 transition-all duration-1000 shrink-0"
              style={{ width: `${pctDisp}%` }}
              title={`Disponible (sin compromiso): ${pctDisp.toFixed(2)}%`}
            />
          </div>
          <div className="flex justify-between mt-1 text-sm xl:text-base">
            <span className="text-gold font-semibold">
              {pctComprometido.toFixed(2)}% Comp. ({pctObligado.toFixed(1)}% obl.)
            </span>
            <span className="text-slate-500">{pctDisp.toFixed(2)}% Disponible</span>
          </div>
        </div>

        {/* Gauges + ejecución por proyecto en una sola fila — aprovecha el ancho disponible.
            % obligación (no monto absoluto: "Subsidios Gas por red" concentra 81% del
            presupuesto y aplastaría cualquier escala en $) */}
        <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-3 items-center">
          <div className="flex md:flex-col items-center justify-center gap-2">
            <SemiGauge rawValue={pctComprometido} label="% Comprometido" color="gold" size="md" delay={0.2} />
            <SemiGauge rawValue={pctObligado} label="% Obligado" color="muted" size="md" delay={0.3} />
          </div>

          <div className="md:col-span-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
              % Obligación por proyecto (peor desempeño primero)
            </p>
            <div className="h-[20vh]">
              {barData.length > 0 ? (
                <ResponsiveBar
                  data={barData}
                  keys={["% Obligación"]}
                  indexBy="proyecto"
                  theme={getNivoTheme(isDark)}
                  layout="horizontal"
                  margin={{ top: 4, right: 30, bottom: 20, left: 140 }}
                  valueScale={{ type: "linear", min: 0, max: 100 }}
                  indexScale={{ type: "band", round: true }}
                  colors={(bar) => riskColor(Number(bar.data["% Obligación"]))}
                  borderRadius={3}
                  padding={0.3}
                  enableLabel
                  label={(bar) => `${bar.value}%`}
                  labelPosition="end"
                  labelSkipWidth={0}
                  labelTextColor={isDark ? "#E2E8F0" : "#1E293B"}
                  enableGridX
                  enableGridY={false}
                  axisTop={null}
                  axisRight={null}
                  axisLeft={{ tickSize: 0, tickPadding: 6 }}
                  axisBottom={{ tickSize: 0, tickPadding: 5, format: (v) => `${v}%` }}
                  tooltip={({ data }) => (
                    <div className="px-2 py-1 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                      <strong>{data.proyectoCompleto as string}</strong>: {data["% Obligación"] as number}% obligado
                    </div>
                  )}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-slate-500 text-sm">Cargando…</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {(dominante || peorDesempeno) && (
          <p className="text-xs xl:text-sm text-center max-w-4xl text-slate-400">
            {dominante && (
              <>
                <strong className="text-amber-400">{dominante.proyecto}</strong> concentra el{" "}
                <strong className="text-amber-400">{dominante.pct.toFixed(0)}%</strong> del presupuesto total.{" "}
              </>
            )}
            {peorDesempeno && (
              <>
                Menor avance:{" "}
                <strong className="text-red-400">{peorDesempeno.proyecto}</strong> con solo{" "}
                <strong className="text-red-400">{(peorDesempeno.pct_obligacion * 100).toFixed(1)}%</strong> obligado.
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
