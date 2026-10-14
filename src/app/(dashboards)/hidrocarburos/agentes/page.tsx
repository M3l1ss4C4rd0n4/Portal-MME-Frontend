"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import CoberturaBanner from "@/components/dashboard/CoberturaBanner";
import FunnelChart from "@/components/dashboard/FunnelChart";
import TreemapChart from "@/components/dashboard/TreemapChart";
import BarLineChart from "@/components/dashboard/BarLineChart";
import { fmtNum } from "@/lib/format";
import type { CoberturaSicom } from "@/lib/sicom";

// ─── Types (misma forma que retorna /api/hidrocarburos/sicom/agentes) ──────
interface Kpis {
  agentes: number;
  activos: number;
  inactivos: number;
  tipos: number;
  subtipos: number;
  departamentos: number;
  municipios: number;
  banderas: number;
  proveedores: number;
  sinAnio: number;
}
interface ItemTipo { tipo: string; cantidad: number }
interface ItemProducto { producto: string; cantidad: number; pct: number }
interface ItemAnio { anio: number; cantidad: number; acumulado: number }
interface ItemSubtipo { subtipo: string; cantidad: number }
interface ItemDepto { departamento: string; codigoDane: string | null; cantidad: number }

const DEFAULT_KPIS: Kpis = {
  agentes: 0, activos: 0, inactivos: 0, tipos: 0, subtipos: 0,
  departamentos: 0, municipios: 0, banderas: 0, proveedores: 0, sinAnio: 0,
};

const COLORES_PRODUCTO = ["#D97706", "#06B6D4", "#F59E0B", "#8B5CF6", "#64748B"];

/** Ranking horizontal animado — mismo patrón que `TopRanking` de Exploración. */
function Ranking({ items, color }: { items: Array<{ nombre: string; valor: number }>; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.nombre} className="flex items-center gap-2 text-[11px]">
          <span className="w-40 text-right text-theme-muted truncate shrink-0" title={item.nombre}>
            {item.nombre}
          </span>
          <div className="flex-1 h-3 bg-theme-tertiary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.valor / max) * 100}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span className="w-14 text-theme-primary font-semibold tabular-nums shrink-0">
            {fmtNum(item.valor)}
          </span>
        </div>
      ))}
      {items.length === 0 && <div className="text-center text-theme-muted text-xs py-4">Sin datos</div>}
    </div>
  );
}

export default function HidrocarburosAgentesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [kpis, setKpis] = useState<Kpis>(DEFAULT_KPIS);
  const [porTipo, setPorTipo] = useState<ItemTipo[]>([]);
  const [porProducto, setPorProducto] = useState<ItemProducto[]>([]);
  const [porAnio, setPorAnio] = useState<ItemAnio[]>([]);
  const [porSubtipo, setPorSubtipo] = useState<ItemSubtipo[]>([]);
  const [porDepartamento, setPorDepartamento] = useState<ItemDepto[]>([]);
  const [cobertura, setCobertura] = useState<CoberturaSicom | null>(null);

  useEffect(() => {
    fetch("/api/hidrocarburos/sicom/agentes")
      .then((r) => r.json())
      .then((json) => {
        if (json?.error) return;
        setKpis(json.kpis ?? DEFAULT_KPIS);
        setPorTipo(json.porTipo ?? []);
        setPorProducto(json.porProducto ?? []);
        setPorAnio(json.porAnio ?? []);
        setPorSubtipo(json.porSubtipo ?? []);
        setPorDepartamento(json.porDepartamento ?? []);
        setCobertura(json.cobertura ?? null);
      })
      .catch(() => {});
  }, []);

  const datosAnio = useMemo(
    () => porAnio.map((a) => ({ etiqueta: String(a.anio), barra: a.cantidad, linea: a.acumulado })),
    [porAnio]
  );
  const treemapData = useMemo(
    () => porDepartamento.map((d) => ({ label: d.departamento, valor: d.cantidad })),
    [porDepartamento]
  );
  const embudoTipos = useMemo(
    () => porTipo.map((t) => ({ label: t.tipo, valor: t.cantidad })),
    [porTipo]
  );

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porTipo), "Por tipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porSubtipo), "Por subtipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porDepartamento), "Por departamento");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porAnio), "Por año");
    XLSX.writeFile(wb, `sicom_agentes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <DashboardLayout
      title="Agentes SICOM"
      subtitle="Caracterización de los agentes de la cadena de distribución de combustibles líquidos · Fuente: SICOM (cubo Agentes)"
    >
      <CoberturaBanner cobertura={cobertura} />

      {/* ── Fila 1: KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Agentes Registrados</div>
          <div className="text-xl font-bold text-gold truncate">{fmtNum(kpis.agentes)}</div>
          <div className="text-[10px] text-theme-muted mt-1">códigos SICOM únicos</div>
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Activos</div>
          <div className="text-xl font-bold text-emerald-400 truncate">{fmtNum(kpis.activos)}</div>
          <div className="text-[10px] text-theme-muted mt-1">
            {kpis.agentes ? ((kpis.activos / kpis.agentes) * 100).toFixed(1) : 0}% del total
          </div>
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Inactivos</div>
          <div className="text-xl font-bold text-red-400 truncate">{fmtNum(kpis.inactivos)}</div>
          <div className="text-[10px] text-theme-muted mt-1">
            {kpis.agentes ? ((kpis.inactivos / kpis.agentes) * 100).toFixed(1) : 0}% del total
          </div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Departamentos</div>
          <div className="text-xl font-bold text-cyan-400 truncate">{fmtNum(kpis.departamentos)}</div>
          <div className="text-[10px] text-theme-muted mt-1">{fmtNum(kpis.municipios)} municipios</div>
        </Card>
        <Card delay={0.17} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Banderas</div>
          <div className="text-xl font-bold text-teal-400 truncate">{fmtNum(kpis.banderas)}</div>
          <div className="text-[10px] text-theme-muted mt-1">marcas comerciales</div>
        </Card>
        <Card delay={0.2} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Proveedores</div>
          <div className="text-xl font-bold text-violet-400 truncate">{fmtNum(kpis.proveedores)}</div>
          <div className="text-[10px] text-theme-muted mt-1">mayoristas asociados</div>
        </Card>
      </div>

      {/* ── Fila 2: embudo por tipo + producto comercializado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.15} className="lg:col-span-1">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Agentes por Tipo
          </span>
          <FunnelChart data={embudoTipos} color="#D97706" />
        </Card>

        <Card delay={0.18} className="lg:col-span-2">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Producto Comercializado
          </span>
          {porProducto.length > 0 ? (
            <>
              <div className="flex w-full h-10 rounded-lg overflow-hidden mb-3">
                {porProducto.map((p, i) => (
                  <motion.div
                    key={p.producto}
                    className="h-full flex items-center justify-center"
                    style={{ background: COLORES_PRODUCTO[i % COLORES_PRODUCTO.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    title={`${p.producto}: ${fmtNum(p.cantidad)} (${p.pct.toFixed(2)}%)`}
                  >
                    {p.pct > 8 && (
                      <span className="text-[10px] font-bold text-slate-900">
                        {p.pct.toFixed(1)}%
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {porProducto.map((p, i) => (
                  <div key={p.producto} className="flex items-center gap-2 text-[10px]">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: COLORES_PRODUCTO[i % COLORES_PRODUCTO.length] }}
                    />
                    <span className="text-theme-secondary truncate">{p.producto}</span>
                    <span className="text-theme-primary font-semibold tabular-nums ml-auto">
                      {fmtNum(p.cantidad)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-theme-muted mt-3">
                Participación relativa de cada producto registrado sobre el total de agentes.
                Los códigos (N, S, CLDP, GNV) son los que emite el cubo de SICOM; su
                significado no está documentado en la metodología recibida.
              </p>
            </>
          ) : (
            <div className="h-24 flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
          )}
        </Card>
      </div>

      {/* ── Fila 3: agentes por año + treemap por departamento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.22}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Agentes por Año de Creación
          </span>
          <BarLineChart
            data={datosAnio}
            isDark={isDark}
            leyendaBarra="Agentes creados"
            leyendaLinea="Acumulado"
            alto={300}
          />
          {kpis.sinAnio > 0 && (
            <p className="text-[10px] text-theme-muted mt-1">
              {fmtNum(kpis.sinAnio)} agentes ({((kpis.sinAnio / kpis.agentes) * 100).toFixed(1)}%)
              no tienen año de creación en la fuente y quedan fuera de este gráfico.
            </p>
          )}
        </Card>

        <Card delay={0.25}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Agentes por Departamento
          </span>
          <TreemapChart data={treemapData} alto={300} unidad="agentes" />
        </Card>
      </div>

      {/* ── Fila 4: subtipos ── */}
      <Card delay={0.28} className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px]">
            Agentes por Subtipo
          </span>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
        </div>
        <Ranking items={porSubtipo.map((s) => ({ nombre: s.subtipo, valor: s.cantidad }))} color="#EA580C" />
      </Card>

      <p className="text-[10px] text-theme-muted text-center mb-2">
        Notas metodológicas. <strong>Conteo:</strong> la medida «agente cantidad» del cubo es un
        conteo distinto; sumarla por atributos infla la cifra (10.666 frente a 8.907 agentes
        reales), porque 827 agentes tienen más de un proveedor. Aquí todo se cuenta con códigos
        SICOM únicos, que reproducen exactamente el total del cubo.{" "}
        <strong>Gráfico por año:</strong> el visual del Power BI original usa una dispersión cuyo
        eje X es la <em>suma</em> de los años de creación, operación sin interpretación posible;
        se implementa la versión del Informe de Metodología §12.4, columnas por año más línea de
        acumulado.
      </p>

      <p className="text-center text-[10px] text-theme-muted mt-5">
        Ministerio de Minas y Energía · Dirección de Hidrocarburos · 2026
      </p>
    </DashboardLayout>
  );
}
