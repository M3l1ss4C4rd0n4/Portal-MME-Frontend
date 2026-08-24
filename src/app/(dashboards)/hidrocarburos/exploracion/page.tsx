"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveLine } from "@nivo/line";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtNum } from "@/lib/format";

function formatVariacion(abs: number | null | undefined, pct: number | null | undefined): string {
  if (abs == null) return "";
  const flecha = abs >= 0 ? "▲" : "▼";
  const pctStr = pct != null ? ` (${Math.abs(pct).toFixed(2)}%)` : "";
  return `${flecha} US$${Math.abs(abs).toFixed(2)}${pctStr}`;
}

function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function tickValuesEspaciados(xs: string[]): string[] {
  if (xs.length <= 7) return xs;
  const step = Math.ceil(xs.length / 6);
  return xs.filter((_, i) => i % step === 0);
}

function TopRanking({ items, color }: { items: Array<{ nombre: string; valor: number }>; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.nombre} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 text-right text-theme-muted truncate shrink-0">{item.nombre}</span>
          <div className="flex-1 h-3 bg-theme-tertiary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.valor / max) * 100}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span className="w-16 text-theme-primary font-semibold tabular-nums shrink-0">{fmtNum(item.valor)}</span>
        </div>
      ))}
      {items.length === 0 && <div className="text-center text-theme-muted text-xs py-4">Sin datos</div>}
    </div>
  );
}

// ─── Types (misma forma que retorna /api/hidrocarburos/produccion) ─────────
interface ProduccionDia {
  fecha: string;
  petroleo_bbl: number;
  gas_fiscalizado_mpc: number;
  gas_comercializado_mpc: number;
}
interface Top5Item {
  mes: string;
  categoria: string;
  nombre: string;
  valor: number;
  unidad: string;
}
interface Commodity {
  valorUsd: number | null;
  variacionAbs: number | null;
  variacionPct: number | null;
  fecha: string | null;
  fechaCarga: string | null;
  historico: Array<{ fecha: string; valor: number }>;
}
interface Brecha {
  mpcd: number;
  pct: number | null;
}

export default function HidrocarburosExploracionPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const T = getNivoTheme(isDark);

  const [produccionDiaria, setProduccionDiaria] = useState<ProduccionDia[]>([]);
  const [top5, setTop5] = useState<Top5Item[]>([]);
  const [commodities, setCommodities] = useState<Record<string, Commodity>>({});
  const [brecha, setBrecha] = useState<Brecha | null>(null);

  useEffect(() => {
    fetch("/api/hidrocarburos/produccion")
      .then((r) => r.json())
      .then((json) => {
        if (!json?.error) {
          setProduccionDiaria(json.produccionDiaria ?? []);
          setTop5(json.top5 ?? []);
          setCommodities(json.commodities ?? {});
          setBrecha(json.brecha ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const wti = commodities.wti;
  const brent = commodities.brent;
  const ultimaProduccion = produccionDiaria[produccionDiaria.length - 1];

  const commodityLineData = useMemo(() => {
    const series: Array<{ id: string; color: string; data: Array<{ x: string; y: number }> }> = [];
    if (wti?.historico?.length) series.push({ id: "WTI", color: "#D97706", data: wti.historico.map((p) => ({ x: p.fecha, y: p.valor })) });
    if (brent?.historico?.length) series.push({ id: "BRENT", color: "#FCD34D", data: brent.historico.map((p) => ({ x: p.fecha, y: p.valor })) });
    return series;
  }, [wti, brent]);
  const commodityTickValues = useMemo(
    () => tickValuesEspaciados(commodityLineData[0]?.data.map((p) => p.x) ?? []),
    [commodityLineData]
  );

  const produccionLineData = useMemo(() => {
    if (!produccionDiaria.length) return [];
    return [{ id: "Petróleo", color: "#D97706", data: produccionDiaria.map((p) => ({ x: p.fecha, y: p.petroleo_bbl })) }];
  }, [produccionDiaria]);
  const produccionTickValues = useMemo(
    () => tickValuesEspaciados(produccionLineData[0]?.data.map((p) => p.x) ?? []),
    [produccionLineData]
  );

  const top5CamposPetroleo = useMemo(
    () => top5.filter((t) => t.categoria === "campos_petroleo").sort((a, b) => b.valor - a.valor).slice(0, 5),
    [top5]
  );
  const top5CamposGas = useMemo(
    () => top5.filter((t) => t.categoria === "campos_gas").sort((a, b) => b.valor - a.valor).slice(0, 5),
    [top5]
  );
  const top5Periodo = top5[0]?.mes;

  const concentracionGas = useMemo(() => {
    if (!top5CamposGas.length || !produccionDiaria.length) return null;
    const totalMensual = produccionDiaria.reduce((acc, p) => acc + p.gas_fiscalizado_mpc, 0);
    if (totalMensual <= 0) return null;
    const lider = top5CamposGas[0];
    return { nombre: lider.nombre, pct: (lider.valor / totalMensual) * 100 };
  }, [top5CamposGas, produccionDiaria]);

  return (
    <DashboardLayout
      title="Producción de Petróleo y Gas"
      subtitle="Producción y gas · Fuente: ANH (Dirección de Hidrocarburos)"
    >
      {/* ── Fila 1: KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Petróleo WTI</div>
          <div className="text-xl font-bold text-amber-400 truncate">{wti?.valorUsd != null ? `US$${wti.valorUsd.toFixed(2)}` : "—"}</div>
          <div className="text-[10px] text-theme-muted mt-1">{formatVariacion(wti?.variacionAbs, wti?.variacionPct)}</div>
          {wti?.fechaCarga && <div className="text-[9px] text-theme-muted/70 mt-0.5">La República · act. {formatFechaHora(wti.fechaCarga)}</div>}
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Petróleo BRENT</div>
          <div className="text-xl font-bold text-orange-400 truncate">{brent?.valorUsd != null ? `US$${brent.valorUsd.toFixed(2)}` : "—"}</div>
          <div className="text-[10px] text-theme-muted mt-1">{formatVariacion(brent?.variacionAbs, brent?.variacionPct)}</div>
          {brent?.fechaCarga && <div className="text-[9px] text-theme-muted/70 mt-0.5">La República · act. {formatFechaHora(brent.fechaCarga)}</div>}
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Producción Petróleo</div>
          <div className="text-xl font-bold text-gold truncate">{ultimaProduccion ? fmtNum(ultimaProduccion.petroleo_bbl) : "—"}</div>
          <div className="text-[10px] text-theme-muted mt-1">bbl/día</div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Gas Fiscalizado</div>
          <div className="text-xl font-bold text-cyan-400 truncate">{ultimaProduccion ? fmtNum(ultimaProduccion.gas_fiscalizado_mpc) : "—"}</div>
          <div className="text-[10px] text-theme-muted mt-1">Mpcd</div>
        </Card>
        <Card delay={0.17} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Gas Comercializado</div>
          <div className="text-xl font-bold text-teal-400 truncate">{ultimaProduccion ? fmtNum(ultimaProduccion.gas_comercializado_mpc) : "—"}</div>
          <div className="text-[10px] text-theme-muted mt-1">Mpcd</div>
        </Card>
        <Card delay={0.2} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Brecha Fisc.-Comerc.</div>
          <div className="text-xl font-bold text-red-400 truncate">{brecha ? fmtNum(brecha.mpcd) : "—"}</div>
          <div className="text-[10px] text-theme-muted mt-1">{brecha?.pct != null ? `Mpcd · ${brecha.pct.toFixed(0)}% no comerc.` : "Mpcd"}</div>
        </Card>
      </div>

      {/* ── Fila 2: Series de tiempo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.15}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            WTI / BRENT (US$/bbl) · La República
          </span>
          <div className="h-[280px]">
            {commodityLineData.length > 0 ? (
              <ResponsiveLine
                data={commodityLineData}
                theme={T}
                margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="catmullRom"
                enablePoints={false}
                enableGridX={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 6,
                  tickValues: commodityTickValues,
                  format: (value) => new Date(String(value)).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", ""),
                }}
                axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => `US$${v}` }}
                colors={{ datum: "color" }}
                lineWidth={2}
                useMesh
                legends={[{ anchor: "top-right", direction: "row", translateY: -10, itemWidth: 60, itemHeight: 14, symbolSize: 8, data: commodityLineData.map((s) => ({ id: s.id, label: s.id, color: s.color })) }]}
                tooltip={({ point }) => (
                  <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <p className="font-semibold text-sm">{new Date(String(point.data.x)).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="mt-0.5">{point.seriesId}: <strong style={{ color: point.color }}>US${Number(point.data.y).toFixed(2)}</strong></p>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
            )}
          </div>
        </Card>

        <Card delay={0.18}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Producción Petróleo (bbl/día) · ANH
          </span>
          <div className="h-[280px]">
            {produccionLineData.length > 0 ? (
              <ResponsiveLine
                data={produccionLineData}
                theme={T}
                margin={{ top: 10, right: 20, bottom: 40, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="catmullRom"
                enablePoints={false}
                enableGridX={false}
                enableArea
                areaOpacity={0.15}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 6,
                  tickValues: produccionTickValues,
                  format: (value) => new Date(String(value)).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", ""),
                }}
                axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtNum(Number(v)) }}
                colors={["#D97706"]}
                lineWidth={2}
                useMesh
                tooltip={({ point }) => (
                  <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <p className="font-semibold text-sm">{new Date(String(point.data.x)).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="mt-0.5">Petróleo: <strong className="text-amber-400">{fmtNum(Number(point.data.y))} bbl/día</strong></p>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Fila 3: Top 5 campos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.22}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Top 5 Campos · Petróleo (bls/mes){top5Periodo ? ` · ${top5Periodo}` : ""}
          </span>
          <TopRanking items={top5CamposPetroleo} color="#D97706" />
        </Card>
        <Card delay={0.25}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Top 5 Campos · Gas (MPC/mes){top5Periodo ? ` · ${top5Periodo}` : ""}
          </span>
          <TopRanking items={top5CamposGas} color="#06B6D4" />
        </Card>
      </div>

      {concentracionGas && (
        <p className="text-xs text-center text-theme-muted mb-5">
          <strong className="text-cyan-400">{concentracionGas.nombre}</strong> concentra el{" "}
          <strong className="text-cyan-400">{concentracionGas.pct.toFixed(0)}%</strong> de todo el gas fiscalizado nacional del mes.
        </p>
      )}

      <p className="text-center text-[10px] text-theme-muted mt-5">
        Ministerio de Minas y Energía · Dirección de Hidrocarburos · 2026
      </p>
    </DashboardLayout>
  );
}
