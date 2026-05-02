"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar } from "@nivo/bar";
import * as XLSX from 'xlsx';
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import SemiGauge from "@/components/ui/SemiGauge";
import BulletChart from "@/components/ui/BulletChart";
import SemiPieChart from "@/components/ui/SemiPieChart";

import { getNivoTheme } from "@/lib/nivo-theme";

// ─── Local helpers ────────────────────────────────────────────────────────
function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5 hover:border-amber-500/40 transition-colors duration-300 ${className}`}>
      {children}
    </motion.div>
  );
}

function KpiChip({ label, value, accent = false, subvalue }: { label: string; value: string | number; accent?: boolean; subvalue?: string }) {
  return (
    <div className="bg-dash-chip rounded-xl px-3 py-2.5">
      <div className={`text-base font-bold leading-none ${accent ? "text-amber-400" : "text-theme-primary"}`}>{value}</div>
      {subvalue && <div className={`text-[9px] mt-0.5 ${accent ? "text-amber-400/70" : "text-theme-muted"}`}>{subvalue}</div>}
      <div className="text-[10px] text-theme-muted mt-1 leading-tight">{label}</div>
    </div>
  );
}

// ─── Progress Ring Component ──────────────────────────────────────────────
function ProgressRing({ 
  value, 
  max = 100, 
  size = 80, 
  stroke = 8, 
  color = "#F59E0B",
  label,
  sublabel,
  delay = 0
}: { 
  value: number; 
  max?: number; 
  size?: number; 
  stroke?: number; 
  color?: string;
  label?: string;
  sublabel?: string;
  delay?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-secondary)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-theme-primary">{value.toFixed(2)}%</span>
          {sublabel && <span className="text-[8px] text-theme-muted">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-[10px] text-theme-muted mt-1.5">{label}</span>}
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────
const fmtCOP = (v: number) => `$ ${Math.round(v).toLocaleString("es-CO")}`;
const fmtFull = fmtCOP;

// ─── Types ────────────────────────────────────────────────────────────────
interface Proyecto {
  proyecto: string;
  apropiacion: number;
  comprometido: number;
  pct_comprometido: number;
  obligados: number;
  pct_obligado: number;
  disponible: number;
}
interface PresupuestoData {
  proyectos: Proyecto[];
  totales: { apropiacion: number; comprometido: number; pct_comprometido: number; obligados: number; pct_obligado: number; disponible: number };
}

const DEFAULT: PresupuestoData = {
  proyectos: [],
  totales: { apropiacion: 0, comprometido: 0, pct_comprometido: 0, obligados: 0, pct_obligado: 0, disponible: 0 },
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function PresupuestoPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");
  const [data, setData] = useState<PresupuestoData>(DEFAULT);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null);

  useEffect(() => {
    fetch("/api/presupuesto")
      .then((r) => r.json())
      .then((raw) => {
        // Convertir strings a números (PostgreSQL retorna strings)
        // Multiplicar porcentajes por 100 porque la BD devuelve decimales (0.337 = 33.7%)
        const proyectos = (raw.proyectos || []).map((p: any) => ({
          proyecto: String(p.proyecto),
          apropiacion: Number(p.apropiacion) || 0,
          comprometido: Number(p.comprometido) || 0,
          pct_comprometido: (Number(p.pct_comprometido) || 0) * 100,
          obligados: Number(p.obligados) || 0,
          pct_obligado: (Number(p.pct_obligado) || 0) * 100,
          disponible: Number(p.disponible) || 0,
        }));
        const totales = {
          apropiacion: Number(raw.totales?.apropiacion) || DEFAULT.totales.apropiacion,
          comprometido: Number(raw.totales?.comprometido) || DEFAULT.totales.comprometido,
          pct_comprometido: (Number(raw.totales?.pct_comprometido) || 0) * 100,
          obligados: Number(raw.totales?.obligados) || 0,
          pct_obligado: (Number(raw.totales?.pct_obligado) || 0) * 100,
          disponible: Number(raw.totales?.disponible) || DEFAULT.totales.disponible,
        };
        setData({ proyectos, totales });
      })
      .catch(() => {});
  }, []);

  const barData = data.proyectos.map((p) => ({
    proyecto: p.proyecto.length > 20 ? p.proyecto.slice(0, 20) + "…" : p.proyecto,
    // Obligado está dentro del comprometido: se muestra como porción del comprometido no-obligado + obligado
    "Comp. no Obligado": +Math.max(0, p.pct_comprometido - p.pct_obligado).toFixed(2),
    "Obligado": +p.pct_obligado.toFixed(2),
    "Disponible": +Math.max(0, 100 - p.pct_comprometido).toFixed(2),
  }));

  // Disponible = todo lo no comprometido (obligado ya está dentro del comprometido)
  const dispTotal = Math.max(0, 100 - data.totales.pct_comprometido);

  return (
    <DashboardLayout title="Ejecución Presupuestal 2026" subtitle="Apropiación, compromisos y obligaciones — corte 1 de abril de 2026">

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Apropiación Total</div>
          <div className="text-xl font-bold text-amber-400 truncate">{fmtCOP(data.totales.apropiacion)}</div>
          <div className="text-[10px] text-theme-muted mt-1">Dirección de EE</div>
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Comprometido</div>
          <div className="text-xl font-bold text-amber-400 truncate">{fmtCOP(data.totales.comprometido)}</div>
          <div className="text-[10px] text-amber-400/70 mt-1">{data.totales.pct_comprometido.toFixed(2)}% del total</div>
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Obligado</div>
          <div className="text-xl font-bold text-red-400 truncate">{fmtCOP(data.totales.obligados)}</div>
          <div className="text-[10px] text-red-400/70 mt-1">{data.totales.pct_obligado.toFixed(2)}% del total</div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Disponible</div>
          <div className="text-xl font-bold text-emerald-400 truncate">{fmtCOP(data.totales.disponible)}</div>
          <div className="text-[10px] text-emerald-400/70 mt-1">{dispTotal.toFixed(2)}% del total</div>
        </Card>
      </div>

      {/* ── Row 2: Visual Charts - 2 Column Layout (1/3 + 2/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Col 1: Resumen Ejecución Presupuestal - Aprovechando todo el espacio */}
        <Card delay={0.1} className="flex flex-col">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px] mb-3">Resumen Ejecución Presupuestal</span>
          
          {/* Card de Apropiación Total */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4 mb-4">
            <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1">Apropiación Total 2026</div>
            <div className="text-2xl font-bold text-amber-400">{fmtCOP(data.totales.apropiacion)}</div>
            <div className="text-[10px] text-theme-muted mt-1">Dirección de Energía Eléctrica</div>
          </div>

          {/* Gráficos de Torta Semi-circulares */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {/* Comprometido - Semi Pie */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-amber-400/70 uppercase tracking-wider mb-1">Comprometido</div>
              <div className="h-[80px] relative">
                <SemiPieChart 
                  value={data.totales.pct_comprometido} 
                  color="#F59E0B" 
                  delay={0.2}
                />
              </div>
              <div className="text-xl font-bold text-amber-400">{data.totales.pct_comprometido.toFixed(2)}%</div>
              <div className="text-[10px] text-amber-400/70">{fmtCOP(data.totales.comprometido)}</div>
              <div className="text-[8px] text-theme-muted mt-1">Recursos con destino definido</div>
            </div>

            {/* Obligado - Semi Pie */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-red-400/70 uppercase tracking-wider mb-1">Obligado</div>
              <div className="h-[80px] relative">
                <SemiPieChart 
                  value={data.totales.pct_obligado} 
                  color="#EF4444" 
                  delay={0.3}
                />
              </div>
              <div className="text-xl font-bold text-red-400">{data.totales.pct_obligado.toFixed(2)}%</div>
              <div className="text-[10px] text-red-400/70">{fmtCOP(data.totales.obligados)}</div>
              <div className="text-[8px] text-theme-muted mt-1">del total apropiado</div>
            </div>

            {/* Disponible - Semi Pie */}
            <div className="bg-slate-500/5 border border-slate-500/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-slate-400/70 uppercase tracking-wider mb-1">Disponible</div>
              <div className="h-[80px] relative">
                <SemiPieChart 
                  value={dispTotal} 
                  color="#64748B" 
                  delay={0.4}
                />
              </div>
              <div className="text-xl font-bold text-slate-400">{dispTotal.toFixed(2)}%</div>
              <div className="text-[10px] text-slate-400/70">{fmtCOP(data.totales.disponible)}</div>
              <div className="text-[8px] text-theme-muted mt-1">Sin compromiso asignado</div>
            </div>
          </div>
          
          {/* Ejecución sobre Comprometido - Visual mejorado */}
          <div className="mt-4 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Ejecución sobre Comprometido</span>
                <div className="text-[9px] text-theme-muted mt-0.5">
                  De ${fmtCOP(data.totales.comprometido)} comprometidos
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-theme-primary">
                  {data.totales.comprometido > 0 ? ((data.totales.obligados / data.totales.comprometido) * 100).toFixed(2) : "0.00"}%
                </span>
                <div className="text-[9px] text-red-400/70">
                  ${fmtCOP(data.totales.obligados)} obligados
                </div>
              </div>
            </div>
            
            {/* Barra apilada: Obligado | Comp. restante | Disponible */}
            <div className="relative">
              <div className="h-4 bg-slate-700/30 rounded-full overflow-hidden flex">
                {/* Obligado — subconjunto del comprometido */}
                <motion.div
                  className="h-full bg-gradient-to-r from-red-700 to-red-500 relative group cursor-pointer shrink-0"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(data.totales.pct_obligado, 100)}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  title={`Obligado (legalizado): ${data.totales.pct_obligado.toFixed(2)}%\n$${fmtCOP(data.totales.obligados)}`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                {/* Comprometido restante (aún no obligado) */}
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative group cursor-pointer shrink-0"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, data.totales.pct_comprometido - data.totales.pct_obligado).toFixed(2)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  title={`Comprometido restante (aún no obligado): ${Math.max(0, data.totales.pct_comprometido - data.totales.pct_obligado).toFixed(2)}%\nTotal comprometido: ${data.totales.pct_comprometido.toFixed(2)}%`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                {/* Disponible (sin compromiso) */}
                <motion.div
                  className="h-full bg-gradient-to-r from-slate-700 to-slate-500 relative group cursor-pointer shrink-0"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, 100 - data.totales.pct_comprometido).toFixed(2)}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  title={`Disponible (sin compromiso): ${Math.max(0, 100 - data.totales.pct_comprometido).toFixed(2)}%\n$${fmtCOP(data.totales.disponible)}`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
              {/* Marcadores de porcentaje */}
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-slate-500">0%</span>
                <span className="text-[9px] text-slate-500">25%</span>
                <span className="text-[9px] text-slate-500">50%</span>
                <span className="text-[9px] text-slate-500">75%</span>
                <span className="text-[9px] text-slate-500">100%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Col 2-3: Comparativo por Proyecto (66%) - Más espacio para ver % Obligado */}
        <Card delay={0.15} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">Comparativo por Proyecto (%)</span>
            <span className="text-[10px] text-theme-muted">Distribución de ejecución</span>
          </div>
          
          {/* Barras horizontales custom — Opción A:
               [── Obligado ──][──── Comp. no Obl. (label=total comp%) ────][── Disponible ──]
               └──────────────── pct_comprometido ─────────────────────────┘
          */}
          <div className="space-y-[7px] mt-2 overflow-y-auto max-h-[400px] pr-1">
            {/* Cabecera de escala */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-28 shrink-0" />
              <div className="flex-1 flex justify-between text-[9px] text-theme-muted px-0.5">
                {[0,25,50,75,100].map(v => <span key={v}>{v}%</span>)}
              </div>
            </div>
            {data.proyectos.map((p, i) => {
              const pctObl    = p.pct_obligado;
              const pctComp   = p.pct_comprometido;
              const pctNoObl  = Math.max(0, pctComp - pctObl);
              const pctDisp   = Math.max(0, 100 - pctComp);
              const tipText   = `${p.proyecto}\nObligado (legalizado): ${pctObl.toFixed(2)}%\nComprometido total: ${pctComp.toFixed(2)}%  (no obl.: ${pctNoObl.toFixed(2)}%)\nDisponible (sin compromiso): ${pctDisp.toFixed(2)}%`;
              const isSelected = proyectoSeleccionado?.proyecto === p.proyecto;
              return (
                <motion.div
                  key={p.proyecto}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className={`flex items-center gap-3 cursor-pointer rounded transition-all ${isSelected ? "ring-1 ring-amber-500/50 bg-amber-500/5" : "hover:bg-white/[0.02]"}`}
                  onClick={() => setProyectoSeleccionado(p)}
                >
                  {/* Nombre del proyecto */}
                  <div className="w-28 text-right text-[11px] text-theme-secondary shrink-0 py-1 pr-1 truncate" title={p.proyecto}>
                    {p.proyecto}
                  </div>

                  {/* Barra */}
                  <div className="flex-1 h-6 rounded-full overflow-hidden flex">
                    {/* Obligado: subconjunto del comprometido */}
                    {pctObl > 0 && (
                      <div
                        style={{ width: `${pctObl}%` }}
                        className="h-full bg-gradient-to-r from-red-700 to-red-400 flex items-center justify-center shrink-0"
                        title={tipText}
                      >
                        {pctObl >= 5 && (
                          <span className="text-[9px] font-bold text-white leading-none px-1">{pctObl.toFixed(1)}%</span>
                        )}
                      </div>
                    )}
                    {/* Comp. no Obligado — label muestra el TOTAL comprometido */}
                    {pctNoObl > 0 && (
                      <div
                        style={{ width: `${pctNoObl}%` }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 flex items-center justify-center shrink-0"
                        title={tipText}
                      >
                        {pctNoObl >= 7 && (
                          <span className="text-[9px] font-bold text-black leading-none px-1">
                            {pctNoObl >= 12 ? `${pctComp.toFixed(0)}% comp.` : `${pctComp.toFixed(0)}%`}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Disponible */}
                    {pctDisp > 0 && (
                      <div
                        style={{ width: `${pctDisp}%` }}
                        className="h-full bg-gradient-to-r from-slate-700 to-slate-500 flex items-center justify-center shrink-0"
                        title={tipText}
                      >
                        {pctDisp >= 7 && (
                          <span className="text-[9px] text-slate-400 leading-none px-1">{pctDisp.toFixed(0)}%</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="flex gap-5 mt-4 justify-center">
            {[
              { label: "Obligado", c: "#DC2626", desc: "Ya legalizado (dentro del comprometido)" },
              { label: "Comprometido restante", c: "#FBBF24", desc: "Label = total comprometido. Comprometido aún no obligado" },
              { label: "Disponible", c: "#334155", desc: "Sin compromiso asignado" },
            ].map(({ label, c, desc }) => (
              <div key={label} className="flex items-center gap-2" title={desc}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c }} />
                <div>
                  <span className="text-[11px] text-theme-primary font-medium">{label}</span>
                  <span className="text-[9px] text-theme-muted block">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle del Proyecto Seleccionado - Simplificado a 4 cards */}
          {proyectoSeleccionado && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 pt-5 border-t border-theme-card"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-amber-400 font-bold uppercase tracking-widest text-[12px]">
                  Detalle del Proyecto: {proyectoSeleccionado.proyecto}
                </span>
                <button 
                  onClick={() => setProyectoSeleccionado(null)}
                  className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors px-3 py-1 rounded-full bg-theme-card hover:bg-theme-card/80"
                >
                  ✕ Cerrar
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {/* Apropiación */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-center">
                  <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-2">Apropiación</div>
                  <div className="text-xl font-bold text-amber-400">{fmtCOP(proyectoSeleccionado.apropiacion)}</div>
                  <div className="text-[9px] text-amber-400/60 mt-1">100% del proyecto</div>
                </div>
                
                {/* Comprometido - % con barra + valor */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-2 text-center">Comprometido</div>
                  <div className="h-3 bg-slate-700/30 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(proyectoSeleccionado.pct_comprometido, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-center text-lg font-bold text-amber-400 mt-2">{proyectoSeleccionado.pct_comprometido.toFixed(2)}%</div>
                  <div className="text-center text-[10px] text-amber-400/70">{fmtCOP(proyectoSeleccionado.comprometido)}</div>
                </div>
                
                {/* Obligado - % con barra + valor */}
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-2 text-center">Obligado</div>
                  <div className="h-3 bg-slate-700/30 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(proyectoSeleccionado.pct_obligado, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-center text-lg font-bold text-red-400 mt-2">{proyectoSeleccionado.pct_obligado.toFixed(2)}%</div>
                  <div className="text-center text-[10px] text-red-400/70">{fmtCOP(proyectoSeleccionado.obligados)}</div>
                </div>
                
                {/* Disponible - % con barra + valor (= 100% - comprometido, obligado está dentro del comprometido) */}
                <div className="bg-slate-500/5 border border-slate-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-slate-400/70 uppercase tracking-wider mb-2 text-center">Disponible</div>
                  <div className="h-3 bg-slate-700/30 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-slate-600 to-slate-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100 - proyectoSeleccionado.pct_comprometido, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-center text-lg font-bold text-slate-400 mt-2">
                    {Math.max(0, 100 - proyectoSeleccionado.pct_comprometido).toFixed(2)}%
                  </div>
                  <div className="text-center text-[10px] text-slate-400/70">{fmtCOP(proyectoSeleccionado.disponible)}</div>
                </div>
              </div>
            </motion.div>
          )}
        </Card>
      </div>

      {/* ── Row 4: Project table ── */}
      <Card delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">Detalle por Proyecto</span>
            <span className="text-[10px] text-theme-muted">{data.proyectos.length} proyectos activos</span>
          </div>
          {/* Botón Exportar a Excel */}
          <button
            onClick={() => {
              // Preparar datos para Excel
              const exportData = data.proyectos.map(p => ({
                'Proyecto': p.proyecto,
                'Apropiación': p.apropiacion,
                'Comprometido': p.comprometido,
                '% Comprometido': p.pct_comprometido / 100, // Como decimal para formato porcentaje en Excel
                'Obligado': p.obligados,
                '% Obligado': p.pct_obligado / 100, // Como decimal para formato porcentaje en Excel
                'Disponible': p.disponible
              }));
              
              // Agregar fila de totales
              exportData.push({
                'Proyecto': 'TOTAL',
                'Apropiación': data.totales.apropiacion,
                'Comprometido': data.totales.comprometido,
                '% Comprometido': data.totales.pct_comprometido / 100,
                'Obligado': data.totales.obligados,
                '% Obligado': data.totales.pct_obligado / 100,
                'Disponible': data.totales.disponible
              });
              
              // Crear workbook y worksheet
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto Proyectos');
              
              // Descargar archivo
              XLSX.writeFile(wb, `presupuesto_proyectos_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-right">Comprometido</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-center" colSpan={2}>% Comprometido</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-right">Obligado</th>
                <th className="pb-3 pr-3 font-semibold uppercase tracking-wider text-center" colSpan={2}>% Obligado</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-right">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-card/50">
              {data.proyectos.map((p, i) => (
                <motion.tr key={p.proyecto} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.03 }}
                  className="text-theme-secondary hover:bg-dash-chip/50 transition-colors group">
                  <td className="py-3 pr-3 font-medium text-theme-primary">{p.proyecto}</td>
                  <td className="py-3 pr-3 text-right">{fmtCOP(p.apropiacion)}</td>
                  <td className="py-3 pr-3 text-right text-amber-400 font-semibold">{fmtCOP(p.comprometido)}</td>
                  <td className="py-3 pr-2 w-24">
                    <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                      <motion.div 
                        style={{ width: `${Math.min(p.pct_comprometido, 100)}%` }} 
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(p.pct_comprometido, 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.4 + i * 0.03 }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span className="text-amber-400 font-semibold tabular-nums">{p.pct_comprometido.toFixed(2)}%</span>
                  </td>
                  <td className="py-3 pr-3 text-right text-red-400">{fmtCOP(p.obligados)}</td>
                  <td className="py-3 pr-2 w-24">
                    <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                      <motion.div 
                        style={{ width: `${Math.min(p.pct_obligado, 100)}%` }} 
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(p.pct_obligado, 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.4 + i * 0.03 }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span className="text-red-400 font-semibold tabular-nums">{p.pct_obligado.toFixed(2)}%</span>
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-medium">{fmtCOP(p.disponible)}</td>
                </motion.tr>
              ))}
              {/* Totals row */}
              {data.proyectos.length > 0 && (
                <tr className="font-bold text-theme-primary border-t-2 border-amber-500/30 bg-amber-500/5">
                  <td className="py-3 pr-3">TOTAL</td>
                  <td className="py-3 pr-3 text-right">{fmtCOP(data.totales.apropiacion)}</td>
                  <td className="py-3 pr-3 text-right text-amber-400">{fmtCOP(data.totales.comprometido)}</td>
                  <td className="py-3 pr-2 w-24">
                    <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                      <div style={{ width: `${Math.min(data.totales.pct_comprometido, 100)}%` }} className="h-full bg-amber-400 rounded-full" />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right text-amber-400">{data.totales.pct_comprometido.toFixed(2)}%</td>
                  <td className="py-3 pr-3 text-right text-red-400">{fmtCOP(data.totales.obligados)}</td>
                  <td className="py-3 pr-2 w-24">
                    <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                      <div style={{ width: `${Math.min(data.totales.pct_obligado, 100)}%` }} className="h-full bg-red-400 rounded-full" />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right text-red-400">{data.totales.pct_obligado.toFixed(2)}%</td>
                  <td className="py-3 text-right text-emerald-400">{fmtCOP(data.totales.disponible)}</td>
                </tr>
              )}
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
