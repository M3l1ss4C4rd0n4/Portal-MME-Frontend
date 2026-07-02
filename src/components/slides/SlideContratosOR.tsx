"use client";

import SemiGauge from "@/components/ui/SemiGauge";
import { KpiBlock } from "@/components/kpi";
import { fmtNum } from "@/lib/format";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

export function SlideContratosOR({ d }: { d: HomeSliderProps["orData"] }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#8B5CF6" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 via-transparent to-violet-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-evenly">
        <div className="text-center">
          <SectionBadge label="Contratos OR 2025" dot="#8B5CF6" />
          <p className="text-slate-500 text-base xl:text-lg">
            Obras de Reconexión · Energía Rural Colombiana
          </p>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="Contratos Activos"
            value={fmtNum(d.nContratos)}
            valueClass="text-purple-400"
          />
          <KpiBlock
            label="Usuarios Beneficiados"
            value={fmtNum(d.nUsuarios)}
            unit="hogares"
            valueClass="text-gold"
          />
          <KpiBlock
            label="N° Comunidades"
            value={fmtNum(d.nCEs)}
            unit="CEs beneficiadas"
            valueClass="text-blue-400"
          />
        </div>

        <div className="flex justify-around w-full max-w-3xl">
          <SemiGauge rawValue={d.avanceFinanciero} label="Avance Financiero" color="gold" size="xl" delay={0.3} />
          <SemiGauge rawValue={d.avanceGeneral} label="Avance General" color="success" size="xl" delay={0.4} />
        </div>
      </div>
    </div>
  );
}
