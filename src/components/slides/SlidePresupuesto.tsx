"use client";

import SemiGauge from "@/components/ui/SemiGauge";
import { fmtFull } from "@/lib/format";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

export function SlidePresupuesto({ d }: { d: HomeSliderProps["presuData"] }) {
  const { apropiacion, pct_comprometido, obligados, pct_obligado } = d.totales;
  const pctDisp = Math.max(0, 100 - pct_comprometido);
  const pctCompNoObl = Math.max(0, pct_comprometido - pct_obligado);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#F59E0B" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-transparent to-slate-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Ejecución Presupuestal 2026" dot="#F59E0B" />
          <p className="text-slate-500 text-base xl:text-lg">
            Ejecución de proyectos DEE — corte 1 de abril de 2026
          </p>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-lg xl:text-xl uppercase tracking-[0.2em] font-medium mb-1">
            Apropiación Pptal DEE
          </p>
          <div className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-amber-400 leading-none">
            {fmtFull(apropiacion)}
          </div>
        </div>

        <div className="w-full max-w-4xl">
          <div className="h-4 xl:h-5 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pct_obligado}%` }}
              title={`Obligado (legalizado): ${pct_obligado.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pctCompNoObl}%` }}
              title={`Comprometido restante (aún no obligado): ${pctCompNoObl.toFixed(2)}%\nTotal comprometido: ${pct_comprometido.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div
              className="h-full bg-gradient-to-r from-slate-700 to-slate-500 transition-all duration-1000 relative group cursor-pointer shrink-0"
              style={{ width: `${pctDisp}%` }}
              title={`Disponible (sin compromiso): ${pctDisp.toFixed(2)}%`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm xl:text-base">
            <span className="text-amber-400 font-semibold">
              {pct_comprometido.toFixed(2)}% Comp. ({pct_obligado.toFixed(1)}% obl.)
            </span>
            <span className="text-slate-500">
              {pctDisp.toFixed(2)}% Disponible
            </span>
          </div>
        </div>

        <div className="flex justify-around w-full max-w-3xl">
          <SemiGauge rawValue={pct_comprometido} label="% Comprometido" color="gold" size="xl" delay={0.3} />
          <SemiGauge rawValue={pct_obligado} label="% Obligado" color="muted" size="xl" delay={0.4} />
        </div>
      </div>
    </div>
  );
}
