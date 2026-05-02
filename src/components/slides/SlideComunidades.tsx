"use client";

import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { KpiBlock } from "@/components/kpi";
import { fmtNum, fmtFull } from "@/lib/format";
import { NIVO_SLIDER } from "@/lib/nivo-theme";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge } from "./SlideUI";

export function SlideComunidades({ d, depts }: { d: HomeSliderProps["cemData"]; depts?: HomeSliderProps["cemDepts"] }) {
  const barData = useMemo(() => {
    if (!depts || depts.length === 0) return [];
    return depts
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((d) => ({
        dept: d.name.length > 18 ? d.name.slice(0, 18) + "…" : d.name,
        "CEs": d.count,
        "kWp (÷10)": +((d.capacidad ?? 0) / 10).toFixed(0),
      }))
      .reverse();
  }, [depts]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060B14] overflow-hidden">
      <TopAccent color="#10B981" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/15 via-transparent to-teal-900/10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[25%] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full h-full max-w-7xl px-4 xl:px-8 py-4 overflow-y-auto flex flex-col items-center justify-center gap-5">
        <div className="text-center">
          <SectionBadge label="Comunidades Energéticas" dot="#10B981" />
          <p className="text-slate-500 text-base xl:text-lg">
            Transición energética · Acceso a energía limpia
          </p>
        </div>

        <div className="grid grid-cols-3 w-full divide-x divide-white/5">
          <KpiBlock
            label="CE Implementadas"
            value={fmtNum(d.implementadas)}
            unit="Comunidades"
            valueClass="text-emerald-400"
          />
          <KpiBlock
            label="Inversión Estimada"
            value={fmtFull(d.inversionEstimada)}
            unit="En proyectos activos"
            valueClass="text-amber-400"
          />
          <KpiBlock
            label="Capacidad Instalada"
            value={Math.round(d.capacidadKwp).toLocaleString("es-CO")}
            unit="kWp instalados"
            valueClass="text-teal-400"
          />
        </div>

        <div className="w-full max-w-3xl">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 text-center">
            CEs por departamento (Top 12)
          </p>
          <div className="h-[220px]">
            {barData.length > 0 ? (
              <ResponsiveBar
                data={barData}
                keys={["CEs", "kWp (÷10)"]}
                indexBy="dept"
                theme={NIVO_SLIDER}
                groupMode="grouped"
                layout="horizontal"
                margin={{ top: 4, right: 16, bottom: 20, left: 130 }}
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#F59E0B", "#06B6D4"]}
                borderRadius={3}
                padding={0.25}
                enableLabel={false}
                enableGridX
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                axisBottom={{ tickSize: 0, tickPadding: 5 }}
                tooltip={({ id, value, indexValue }) => (
                  <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                    <strong>{indexValue}</strong> — {id}: <strong style={{ color: id === "CEs" ? "#F59E0B" : "#06B6D4" }}>{value}</strong>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-slate-500 text-sm">Cargando…</span>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {[{ label: "N° CEs", c: "#F59E0B" }, { label: "kWp instalados ÷10", c: "#06B6D4" }].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
