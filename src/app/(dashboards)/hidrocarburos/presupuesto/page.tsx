"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar } from "@nivo/bar";
import * as XLSX from "xlsx";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import SemiPieChart from "@/components/ui/SemiPieChart";
import BulletChart from "@/components/ui/BulletChart";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtCOP } from "@/lib/format";

function riskColor(pct: number): string {
  if (pct < 20) return "#EF4444";
  if (pct < 50) return "#F59E0B";
  return "#10B981";
}

// ─── Types (misma forma que retorna /api/hidrocarburos/presupuesto) ────────
interface Resumen {
  fecha_actualizacion: string | null;
  apropiacion_vigente: number;
  compromisos: number;
  obligaciones: number;
  por_comprometer: number;
  pct_compromisos: number;
  pct_obligaciones: number;
}
interface Proyecto {
  proyecto: string;
  apropiacion_vigente: number;
  compromisos: number;
  obligaciones: number;
  por_comprometer: number;
  pct_compromisos: number;
  pct_obligacion: number;
}

const DEFAULT_RESUMEN: Resumen = {
  fecha_actualizacion: null,
  apropiacion_vigente: 0,
  compromisos: 0,
  obligaciones: 0,
  por_comprometer: 0,
  pct_compromisos: 0,
  pct_obligaciones: 0,
};

export default function HidrocarburosPresupuestoPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");
  const [resumen, setResumen] = useState<Resumen>(DEFAULT_RESUMEN);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  useEffect(() => {
    fetch("/api/hidrocarburos/presupuesto")
      .then((r) => r.json())
      .then((json) => {
        if (!json?.error) {
          setResumen(json.resumen ?? DEFAULT_RESUMEN);
          setProyectos(json.proyectos ?? []);
        }
      })
      .catch(() => {});
  }, []);

  const pctComprometido = resumen.pct_compromisos * 100;
  const pctObligado = resumen.pct_obligaciones * 100;
  const pctDisponible = Math.max(0, 100 - pctComprometido);

  const fechaCorte = resumen.fecha_actualizacion
    ? new Date(resumen.fecha_actualizacion).toLocaleDateString("es-CO")
    : "—";

  const barData = proyectos
    .slice()
    .sort((a, b) => a.pct_obligacion - b.pct_obligacion)
    .map((p) => ({
      proyecto: p.proyecto.length > 22 ? p.proyecto.slice(0, 22) + "…" : p.proyecto,
      proyectoCompleto: p.proyecto,
      "% Obligación": +(p.pct_obligacion * 100).toFixed(1),
    }));

  return (
    <DashboardLayout
      title="Ejecución Presupuestal Hidrocarburos"
      subtitle={`Apropiación, compromisos y obligaciones — corte ${fechaCorte}`}
    >
      {/* ── Fila 1: KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Apropiación Vigente</div>
          <div className="text-xl font-bold text-gold truncate">{fmtCOP(resumen.apropiacion_vigente)}</div>
          <div className="text-[10px] text-theme-muted mt-1">Dirección de Hidrocarburos</div>
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Compromisos</div>
          <div className="text-xl font-bold text-gold truncate">{fmtCOP(resumen.compromisos)}</div>
          <div className="text-[10px] text-gold/70 mt-1">{pctComprometido.toFixed(1)}% ejecutado</div>
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Obligaciones</div>
          <div className="text-xl font-bold text-red-400 truncate">{fmtCOP(resumen.obligaciones)}</div>
          <div className="text-[10px] text-red-400/70 mt-1">{pctObligado.toFixed(1)}% ejecutado</div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Por Comprometer</div>
          <div className="text-xl font-bold text-emerald-400 truncate">{fmtCOP(resumen.por_comprometer)}</div>
          <div className="text-[10px] text-emerald-400/70 mt-1">{pctDisponible.toFixed(1)}% disponible</div>
        </Card>
      </div>

      {/* ── Fila 2: Resumen (SemiPie + BulletChart) + Ranking por proyecto ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.1} className="flex flex-col">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3">Resumen Ejecución Presupuestal</span>

          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4 mb-4">
            <div className="text-[10px] text-gold/70 uppercase tracking-wider mb-1">Apropiación Vigente</div>
            <div className="text-2xl font-bold text-gold">{fmtCOP(resumen.apropiacion_vigente)}</div>
            <div className="text-[10px] text-theme-muted mt-1">Dirección de Hidrocarburos</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-gold/70 uppercase tracking-wider mb-1">Comprometido</div>
              <div className="h-[80px] relative">
                <SemiPieChart value={pctComprometido} color="#F59E0B" delay={0.2} />
              </div>
              <div className="text-xl font-bold text-gold">{pctComprometido.toFixed(1)}%</div>
              <div className="text-[10px] text-gold/70">{fmtCOP(resumen.compromisos)}</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-red-400/70 uppercase tracking-wider mb-1">Obligado</div>
              <div className="h-[80px] relative">
                <SemiPieChart value={pctObligado} color="#EF4444" delay={0.3} />
              </div>
              <div className="text-xl font-bold text-red-400">{pctObligado.toFixed(1)}%</div>
              <div className="text-[10px] text-red-400/70">{fmtCOP(resumen.obligaciones)}</div>
            </div>
            <div className="bg-theme-tertiary border border-theme-secondary rounded-xl p-3 text-center">
              <div className="text-[9px] text-theme-muted uppercase tracking-wider mb-1">Disponible</div>
              <div className="h-[80px] relative">
                <SemiPieChart value={pctDisponible} color="#64748B" delay={0.4} />
              </div>
              <div className="text-xl font-bold text-slate-400">{pctDisponible.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400/70">{fmtCOP(resumen.por_comprometer)}</div>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-[10px] text-theme-muted uppercase tracking-wider">Comprometido / Obligado / Disponible</span>
            <div className="mt-2">
              <BulletChart comprometido={pctComprometido} obligado={pctObligado} disponible={pctDisponible} delay={0.4} />
            </div>
          </div>
        </Card>

        <Card delay={0.15} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">% Obligación por Proyecto</span>
            <span className="text-[10px] text-theme-muted">Peor desempeño primero</span>
          </div>
          <div className="h-[420px]">
            {barData.length > 0 ? (
              <ResponsiveBar
                data={barData}
                keys={["% Obligación"]}
                indexBy="proyecto"
                theme={T}
                layout="horizontal"
                margin={{ top: 4, right: 30, bottom: 30, left: 150 }}
                valueScale={{ type: "linear", min: 0, max: 100 }}
                indexScale={{ type: "band", round: true }}
                colors={(bar) => riskColor(Number(bar.data["% Obligación"]))}
                borderRadius={3}
                padding={0.3}
                enableLabel
                label={(bar) => `${bar.value}%`}
                labelPosition="end"
                labelSkipWidth={0}
                labelTextColor={resolvedTheme === "dark" ? "#E2E8F0" : "#1E293B"}
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
              <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Fila 3: Tabla detalle por proyecto ── */}
      <Card delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-gold font-bold uppercase tracking-widest text-[11px]">Detalle por Proyecto</span>
            <span className="text-[10px] text-theme-muted">{proyectos.length} proyectos activos</span>
          </div>
          <button
            onClick={() => {
              const exportData = proyectos.map((p) => ({
                Proyecto: p.proyecto,
                "Apropiación Vigente": p.apropiacion_vigente,
                Compromisos: p.compromisos,
                "% Compromisos": p.pct_compromisos,
                Obligaciones: p.obligaciones,
                "% Obligación": p.pct_obligacion,
                "Por Comprometer": p.por_comprometer,
              }));
              exportData.push({
                Proyecto: "TOTAL",
                "Apropiación Vigente": resumen.apropiacion_vigente,
                Compromisos: resumen.compromisos,
                "% Compromisos": resumen.pct_compromisos,
                Obligaciones: resumen.obligaciones,
                "% Obligación": resumen.pct_obligaciones,
                "Por Comprometer": resumen.por_comprometer,
              });
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Presupuesto Hidrocarburos");
              XLSX.writeFile(wb, `hidrocarburos_presupuesto_${new Date().toISOString().split("T")[0]}.xlsx`);
            }}
            className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-theme-muted text-left border-b border-theme-card">
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider">Proyecto</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-right">Apropiación</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-right">Compromisos</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-center" colSpan={2}>% Compromisos</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-right">Obligaciones</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-center" colSpan={2}>% Obligación</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-right">Por Comprometer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-card/50">
              {proyectos.map((p, i) => {
                const pctComp = p.pct_compromisos * 100;
                const pctObl = p.pct_obligacion * 100;
                return (
                  <motion.tr key={p.proyecto} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.03 }}
                    className="text-theme-secondary hover:bg-dash-chip/50 transition-colors">
                    <td className="py-3 pr-3 font-medium text-theme-primary">{p.proyecto}</td>
                    <td className="py-3 pr-3 text-right">{fmtCOP(p.apropiacion_vigente)}</td>
                    <td className="py-3 pr-3 text-right text-gold font-semibold">{fmtCOP(p.compromisos)}</td>
                    <td className="py-3 pr-2 w-24">
                      <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                        <motion.div style={{ width: `${Math.min(pctComp, 100)}%` }} className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${Math.min(pctComp, 100)}%` }} transition={{ duration: 0.5, delay: 0.4 + i * 0.03 }} />
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right"><span className="text-gold font-semibold tabular-nums">{pctComp.toFixed(1)}%</span></td>
                    <td className="py-3 pr-3 text-right text-red-400">{fmtCOP(p.obligaciones)}</td>
                    <td className="py-3 pr-2 w-24">
                      <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                        <motion.div style={{ width: `${Math.min(pctObl, 100)}%` }} className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${Math.min(pctObl, 100)}%` }} transition={{ duration: 0.5, delay: 0.4 + i * 0.03 }} />
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right"><span className="text-red-400 font-semibold tabular-nums">{pctObl.toFixed(1)}%</span></td>
                    <td className="py-3 text-right text-emerald-400 font-medium">{fmtCOP(p.por_comprometer)}</td>
                  </motion.tr>
                );
              })}
              {proyectos.length > 0 && (
                <tr className="font-bold text-theme-primary border-t-2 border-amber-500/30 bg-amber-500/5">
                  <td className="py-3 pr-3">TOTAL</td>
                  <td className="py-3 pr-3 text-right">{fmtCOP(resumen.apropiacion_vigente)}</td>
                  <td className="py-3 pr-3 text-right text-gold">{fmtCOP(resumen.compromisos)}</td>
                  <td className="py-3 pr-2 w-24">
                    <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                      <div style={{ width: `${Math.min(pctComprometido, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right text-gold">{pctComprometido.toFixed(1)}%</td>
                  <td className="py-3 pr-3 text-right text-red-400">{fmtCOP(resumen.obligaciones)}</td>
                  <td className="py-3 pr-2 w-24">
                    <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                      <div style={{ width: `${Math.min(pctObligado, 100)}%` }} className="h-full bg-red-400 rounded-full" />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right text-red-400">{pctObligado.toFixed(1)}%</td>
                  <td className="py-3 text-right text-emerald-400">{fmtCOP(resumen.por_comprometer)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {proyectos.length === 0 && (
            <div className="text-center text-theme-muted text-sm py-8">Cargando datos…</div>
          )}
        </div>
      </Card>

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Hidrocarburos · 2026
      </p>
    </DashboardLayout>
  );
}
