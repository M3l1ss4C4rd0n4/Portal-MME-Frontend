"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar } from "@nivo/bar";
import * as XLSX from 'xlsx';
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import SemiGauge from "@/components/ui/SemiGauge";

import { getNivoTheme } from "@/lib/nivo-theme";

// ─── Helpers ──────────────────────────────────────────────────────────────
function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5 hover:border-amber-500/40 transition-colors duration-300 ${className}`}>
      {children}
    </motion.div>
  );
}
function KpiChip({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-dash-chip rounded-xl px-3 py-2.5">
      <div className={`text-base font-bold leading-none ${accent ? "text-amber-400" : "text-theme-primary"}`}>{value}</div>
      <div className="text-[10px] text-theme-muted mt-1 leading-tight">{label}</div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────
interface Proyecto {
  nombre: string;
  ejecutor: string;
  departamento: string;
  municipio: string;
  avanceGeneral: number;
  avanceFinanciero: number;
  totalDesembolsos: number;
  pagosRealizados: number;
}
interface Desembolso {
  numero: number;
  actNecesarias: number;
  actCompletas: number;
  pctCompletado: number;
  proyectosPagados: number;
}
interface ContratosData {
  nContratos: number;
  avanceGeneral: number;
  avanceFinanciero: number;
  pagosRealizados: number;
  pagosPosibles: number;
  pctPagosRealizados: number;
  desembolsos: Desembolso[];
  proyectos: Proyecto[];
}
const DEFAULT: ContratosData = {
  nContratos: 17,
  avanceGeneral: 16.1,
  avanceFinanciero: 50.0,
  pagosRealizados: 17,
  pagosPosibles: 68,
  pctPagosRealizados: 25.0,
  desembolsos: [],
  proyectos: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ContratosORPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");
  const [data, setData] = useState<ContratosData>(DEFAULT);

  useEffect(() => {
    fetch("/api/contratos-or")
      .then((r) => r.json())
      .then((raw) => {
        setData({
          nContratos: Number(raw.nContratos) || DEFAULT.nContratos,
          avanceGeneral: Number(raw.avanceGeneral) || DEFAULT.avanceGeneral,
          avanceFinanciero: Number(raw.avanceFinanciero) || DEFAULT.avanceFinanciero,
          pagosRealizados: Number(raw.pagosRealizados) ?? DEFAULT.pagosRealizados,
          pagosPosibles: Number(raw.pagosPosibles) || DEFAULT.pagosPosibles,
          pctPagosRealizados: Number(raw.pctPagosRealizados) ?? DEFAULT.pctPagosRealizados,
          desembolsos: (raw.desembolsos || []).map((d: any) => ({
            numero: Number(d.numero),
            actNecesarias: Number(d.actNecesarias),
            actCompletas: Number(d.actCompletas),
            pctCompletado: Number(d.pctCompletado),
            proyectosPagados: Number(d.proyectosPagados),
          })),
          proyectos: (raw.proyectos || []).map((p: any) => ({
            nombre: String(p.nombre),
            ejecutor: String(p.ejecutor),
            departamento: String(p.departamento),
            municipio: String(p.municipio),
            avanceGeneral: Number(p.avanceGeneral) || 0,
            avanceFinanciero: Number(p.avanceFinanciero) || 0,
            totalDesembolsos: Number(p.totalDesembolsos) || 4,
            pagosRealizados: Number(p.pagosRealizados) || 0,
          })),
        });
      })
      .catch(() => {});
  }, []);

  const avanceBarData = data.proyectos.map((p) => ({
    nombre: p.nombre.length > 28 ? p.nombre.slice(0, 28) + "…" : p.nombre,
    "Av. General": p.avanceGeneral,
    "Av. Financiero": p.avanceFinanciero,
  }));

  const byEjecutor = data.proyectos.reduce((acc, p) => {
    acc[p.ejecutor] = (acc[p.ejecutor] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title="Contratos OR 2025" subtitle="Seguimiento de contratos de operadores de red — avances físico y financiero">

      {/* ── Row 1: KPIs + Gauges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.05}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">RESUMEN</span>
          <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
            <KpiChip label="N° Contratos" value={data.nContratos} accent />
            <KpiChip label="Ejecutores" value={Object.keys(byEjecutor).length} />
            <KpiChip label="Pagos Realizados" value={`${data.pagosRealizados}/${data.pagosPosibles}`} />
            <KpiChip label="% Pagos" value={`${data.pctPagosRealizados}%`} accent />
          </div>
          <div className="flex justify-around">
            <SemiGauge value={data.avanceFinanciero} label="Avance Financiero" color="gold" size="lg" delay={0.1} />
            <SemiGauge value={data.avanceGeneral} label="Avance General" color="white" size="lg" delay={0.15} />
          </div>
        </Card>

        <Card delay={0.1}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">PROGRESO POR DESEMBOLSO</span>
          <p className="text-[9px] text-theme-muted mt-0.5 mb-1.5">Actividades para liberar cada pago</p>
          <div className="flex flex-col">
            {/* Sección superior: Barras de progreso ultra compactas */}
            <div className="space-y-1">
              {(data.desembolsos.length > 0
                ? data.desembolsos
                : [{numero:1,actNecesarias:102,actCompletas:102,pctCompletado:100,proyectosPagados:17},
                   {numero:2,actNecesarias:136,actCompletas:16,pctCompletado:11.8,proyectosPagados:0},
                   {numero:3,actNecesarias:102,actCompletas:0,pctCompletado:0,proyectosPagados:0},
                   {numero:4,actNecesarias:119,actCompletas:0,pctCompletado:0,proyectosPagados:0}]
              ).map((d) => {
                const done = d.pctCompletado >= 100;
                const active = !done && d.pctCompletado > 0;
                const barColor = done ? "#22C55E" : active ? "#F59E0B" : "#334155";
                const textColor = done ? "text-green-400" : active ? "text-amber-400" : "text-theme-muted";
                return (
                  <div key={d.numero} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${textColor}`}>Desembolso {d.numero}</span>
                      {done && <span className="text-[7px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-semibold">OK</span>}
                      {active && <span className="text-[7px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-semibold">→</span>}
                    </div>
                    <div className="flex-1">
                      <div className="h-1.5 bg-dash-chip rounded-full overflow-hidden">
                        <div
                          style={{ width: `${d.pctCompletado}%`, backgroundColor: barColor, transition: "width 0.8s ease" }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-right w-16 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${textColor}`}>{d.pctCompletado}%</span>
                      <span className="text-[8px] text-theme-muted ml-0.5">{d.actCompletas}/{d.actNecesarias}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Sección inferior: Gauge Avance Físico */}
            <div className="mt-1.5 pt-1.5 border-t border-theme-card flex justify-center">
              {(() => {
                const desembolsosCompletos = (data.desembolsos.length > 0 ? data.desembolsos : [
                  {numero:1,pctCompletado:100},{numero:2,pctCompletado:11.8},{numero:3,pctCompletado:0},{numero:4,pctCompletado:0}
                ]).filter(d => d.pctCompletado >= 100).length;
                const avanceFisico = desembolsosCompletos === 0 ? 0 : desembolsosCompletos === 1 ? 0 : desembolsosCompletos === 2 ? 10 : desembolsosCompletos === 3 ? 60 : 100;
                return (
                  <SemiGauge value={avanceFisico} label="Avance físico" color="gold" size="md" delay={0.15} />
                );
              })()}
            </div>
          </div>
        </Card>

        <Card delay={0.15} className="flex flex-col">
          <div className="flex-1">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">IMPACTO (Datos Fijos)</span>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <KpiChip label="Usuarios Beneficiados" value={295911} accent />
              <KpiChip label="N° de CEs" value={2297} />
              <KpiChip label="Inversión Total" value="$914.360.289.397" />
              <KpiChip label="Potencia a Instalar" value="37 mWp" accent />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-theme-card">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">CONTRATOS POR EJECUTOR</span>
            <div className="mt-3 space-y-3">
              {Object.entries(byEjecutor).sort((a, b) => b[1] - a[1]).map(([ej, count]) => (
                <div key={ej}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-theme-primary font-medium">{ej}</span>
                    <span className="text-[11px] text-amber-400 font-bold">{count} contrato{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-dash-chip rounded-full overflow-hidden">
                    <div style={{ width: `${(count / data.nContratos) * 100}%` }} className="h-full bg-amber-400 rounded-full" />
                  </div>
                </div>
              ))}
              {data.proyectos.length === 0 && <div className="text-center text-theme-muted text-sm mt-8">Cargando…</div>}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 2: Per-project avance bar chart ── */}
      {avanceBarData.length > 0 && (
        <Card delay={0.2} className="mb-5">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">AVANCE POR PROYECTO (%)</span>
          <div className="h-[440px] mt-4">
            <ResponsiveBar
              data={avanceBarData}
              keys={["Av. General", "Av. Financiero"]}
              indexBy="nombre"
              theme={T}
              groupMode="grouped"
              margin={{ top: 8, right: 80, bottom: 20, left: 210 }}
              layout="horizontal"
              valueScale={{ type: "linear", max: 100 }}
              indexScale={{ type: "band", round: true }}
              colors={["#F59E0B", "#8B5CF6"]}
              borderRadius={3}
              padding={0.2}
              enableLabel
              label={(d) => `${d.value}%`}
              labelSkipWidth={24}
              labelTextColor="#fff"
              enableGridX
              enableGridY={false}
              axisTop={null}
              axisRight={null}
              axisLeft={{ tickSize: 0, tickPadding: 6 }}
              axisBottom={{ tickSize: 0, tickPadding: 5, format: (v) => `${v}%` }}
              legends={[{
                dataFrom: "keys" as const, anchor: "right" as const, direction: "column" as const,
                justify: false, translateX: 75, translateY: 0, itemsSpacing: 6,
                itemWidth: 70, itemHeight: 16, itemTextColor: "#94A3B8",
                itemDirection: "left-to-right" as const, symbolSize: 8, symbolShape: "circle" as const,
              }]}
              tooltip={({ id, value, indexValue }) => (
                <div style={{ padding: "8px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }}>
                  <strong>{indexValue}</strong><br />{id}: <strong style={{ color: "#F59E0B" }}>{value}%</strong>
                </div>
              )}
            />
          </div>
          <div className="flex gap-4 mt-2">
            {[{ label: "Avance General", c: "#F59E0B" }, { label: "Avance Financiero", c: "#8B5CF6" }].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-theme-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Row 3: Project table ── */}
      <Card delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">DETALLE DE CONTRATOS</span>
            <span className="text-[10px] text-theme-muted">{data.proyectos.length} proyectos</span>
          </div>
          {/* Botón Exportar a Excel */}
          <button
            onClick={() => {
              // Preparar datos para Excel
              const exportData = data.proyectos.map(p => ({
                'Proyecto': p.nombre,
                'Ejecutor': p.ejecutor,
                'Departamento': p.departamento,
                'Municipio': p.municipio,
                'Avance General (%)': p.avanceGeneral / 100, // Como decimal para formato porcentaje en Excel
                'Avance Financiero (%)': p.avanceFinanciero / 100, // Como decimal
                'Pagos Realizados': p.pagosRealizados,
                'Total Desembolsos': p.totalDesembolsos
              }));
              
              // Agregar fila de totales/promedios
              const avgAvanceObra = data.proyectos.length > 0 
                ? data.proyectos.reduce((sum, p) => sum + p.avanceGeneral, 0) / data.proyectos.length 
                : 0;
              const avgAvanceFinanciero = data.proyectos.length > 0 
                ? data.proyectos.reduce((sum, p) => sum + p.avanceFinanciero, 0) / data.proyectos.length 
                : 0;
              const totalPagosRealizados = data.proyectos.reduce((sum, p) => sum + p.pagosRealizados, 0);
              const totalDesembolsos = data.proyectos.reduce((sum, p) => sum + p.totalDesembolsos, 0);
              
              exportData.push({
                'Proyecto': 'TOTALES / PROMEDIOS',
                'Ejecutor': '',
                'Departamento': '',
                'Municipio': '',
                'Avance General (%)': avgAvanceObra / 100,
                'Avance Financiero (%)': avgAvanceFinanciero / 100,
                'Pagos Realizados': totalPagosRealizados,
                'Total Desembolsos': totalDesembolsos
              });
              
              // Crear workbook y worksheet
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Contratos OR 2025');
              
              // Descargar archivo
              XLSX.writeFile(wb, `contratos_or_2025_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              <tr className="text-theme-muted text-left">
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Proyecto</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Ejecutor</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Departamento</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Avance General</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Avance Financiero</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Pagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-card">
              {data.proyectos.map((p, i) => (
                <motion.tr key={p.nombre} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}
                  className="text-theme-secondary hover:bg-dash-chip transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-theme-primary">{p.nombre}</td>
                  <td className="py-2.5 pr-4 text-cyan-400">{p.ejecutor}</td>
                  <td className="py-2.5 pr-4">{p.departamento}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden flex-shrink-0">
                        <div style={{ width: `${Math.min(p.avanceGeneral, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                      </div>
                      <span className="text-amber-400 font-semibold">{p.avanceGeneral.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-dash-chip rounded-full w-16 overflow-hidden flex-shrink-0">
                        <div style={{ width: `${Math.min(p.avanceFinanciero, 100)}%` }} className="h-full bg-purple-400 rounded-full" />
                      </div>
                      <span className="text-purple-400 font-semibold">{p.avanceFinanciero.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="text-amber-400 font-semibold">{p.pagosRealizados}/{p.totalDesembolsos}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {data.proyectos.length === 0 && (
            <div className="text-center text-theme-muted text-sm py-8">Cargando datos…</div>
          )}
        </div>
      </Card>

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}

