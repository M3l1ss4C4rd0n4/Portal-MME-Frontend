"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import CoberturaBanner from "@/components/dashboard/CoberturaBanner";
import FunnelChart from "@/components/dashboard/FunnelChart";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtCompactNum, fmtNum } from "@/lib/format";
import type { CoberturaSicom } from "@/lib/sicom";

const TOP_PRODUCTOS_BARRA = 12;
const COLORES_PRODUCTO = [
  "#D97706", "#EA580C", "#F59E0B", "#06B6D4", "#8B5CF6", "#64748B",
];

// ─── Types (misma forma que retorna /api/hidrocarburos/sicom/compras-eds) ──
interface Kpis {
  volumenTotal: number; compradores: number; plantas: number;
  productos: number; subtipos: number; anioMin: number; anioMax: number;
}
interface ItemAgente { nombre: string; volumen: number }
interface ItemProducto { producto: string; volumen: number; pct: number }
interface FilaMes { mes: number; mesNombre: string; [producto: string]: string | number }

const DEFAULT_KPIS: Kpis = {
  volumenTotal: 0, compradores: 0, plantas: 0,
  productos: 0, subtipos: 0, anioMin: 0, anioMax: 0,
};

/** Acorta nombres largos de producto para ejes y leyendas. */
function corto(s: string, n = 26): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export default function HidrocarburosComprasEdsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const T = getNivoTheme(isDark);

  const [kpis, setKpis] = useState<Kpis>(DEFAULT_KPIS);
  const [topCompradores, setTopCompradores] = useState<ItemAgente[]>([]);
  const [topPlantas, setTopPlantas] = useState<ItemAgente[]>([]);
  const [porProducto, setPorProducto] = useState<ItemProducto[]>([]);
  const [porMes, setPorMes] = useState<FilaMes[]>([]);
  const [clavesProducto, setClavesProducto] = useState<string[]>([]);
  const [cobertura, setCobertura] = useState<CoberturaSicom | null>(null);

  useEffect(() => {
    fetch("/api/hidrocarburos/sicom/compras-eds")
      .then((r) => r.json())
      .then((json) => {
        if (json?.error) return;
        setKpis(json.kpis ?? DEFAULT_KPIS);
        setTopCompradores(json.topCompradores ?? []);
        setTopPlantas(json.topPlantas ?? []);
        setPorProducto(json.porProducto ?? []);
        setPorMes(json.porMes ?? []);
        setClavesProducto(json.clavesProducto ?? []);
        setCobertura(json.cobertura ?? null);
      })
      .catch(() => {});
  }, []);

  const embudoCompradores = useMemo(
    () => topCompradores.map((c) => ({ label: corto(c.nombre, 34), valor: c.volumen })),
    [topCompradores]
  );
  const embudoPlantas = useMemo(
    () => topPlantas.map((p) => ({ label: corto(p.nombre, 34), valor: p.volumen })),
    [topPlantas]
  );
  const barrasProducto = useMemo(
    () => porProducto.slice(0, TOP_PRODUCTOS_BARRA).map((p) => ({
      producto: corto(p.producto, 30),
      volumen: p.volumen,
    })),
    [porProducto]
  );
  const datosPie = useMemo(
    () => porProducto.slice(0, 6).map((p, i) => ({
      id: corto(p.producto, 24),
      label: corto(p.producto, 24),
      value: p.volumen,
      color: COLORES_PRODUCTO[i % COLORES_PRODUCTO.length],
    })),
    [porProducto]
  );

  return (
    <DashboardLayout
      title="Compras EDS SICOM"
      subtitle="Compras realizadas por Estaciones de Servicio: compradores, proveedores, productos y estacionalidad · Fuente: SICOM (cubo Compras EDS)"
    >
      <CoberturaBanner cobertura={cobertura} unidadMedida="unidades de volumen" />

      {/* ── Fila 1: KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Volumen Comprado</div>
          <div className="text-xl font-bold text-gold truncate">{fmtNum(kpis.volumenTotal)}</div>
          <div className="text-[10px] text-emerald-400/90 mt-1">cobertura completa</div>
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Compradores (EDS)</div>
          <div className="text-xl font-bold text-amber-400 truncate">{fmtNum(kpis.compradores)}</div>
          <div className="text-[10px] text-theme-muted mt-1">{kpis.subtipos} subtipos de estación</div>
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Plantas Proveedoras</div>
          <div className="text-xl font-bold text-orange-400 truncate">{fmtNum(kpis.plantas)}</div>
          <div className="text-[10px] text-theme-muted mt-1">puntos de suministro</div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Productos</div>
          <div className="text-xl font-bold text-cyan-400 truncate">{fmtNum(kpis.productos)}</div>
          <div className="text-[10px] text-theme-muted mt-1">referencias</div>
        </Card>
        <Card delay={0.17} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Periodo</div>
          <div className="text-xl font-bold text-violet-400 truncate">
            {kpis.anioMin || "—"}–{kpis.anioMax || "—"}
          </div>
          <div className="text-[10px] text-theme-muted mt-1">años de ciclo</div>
        </Card>
      </div>

      {/* ── Fila 2: embudos §14.2 y §14.3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.15}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Top Compradores
          </span>
          <FunnelChart data={embudoCompradores} color="#D97706" />
        </Card>
        <Card delay={0.18}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Top Plantas Proveedoras
          </span>
          <FunnelChart data={embudoPlantas} color="#06B6D4" />
        </Card>
      </div>

      {/* ── Fila 3: compras por mes §14.4 ── */}
      <Card delay={0.22} className="mb-5">
        <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
          Compras por Mes
        </span>
        <div className="h-[300px]">
          {porMes.length > 0 && clavesProducto.length > 0 ? (
            <ResponsiveBar
              data={porMes}
              theme={T}
              keys={clavesProducto}
              indexBy="mesNombre"
              margin={{ top: 10, right: 20, bottom: 40, left: 80 }}
              padding={0.3}
              colors={COLORES_PRODUCTO}
              enableLabel={false}
              enableGridX={false}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 6 }}
              axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtCompactNum(Number(v)) }}
              tooltip={({ id, value, indexValue }) => (
                <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                  <p className="font-semibold">{String(indexValue)}</p>
                  <p className="mt-0.5">{String(id)}: <strong>{fmtNum(value)}</strong></p>
                </div>
              )}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {clavesProducto.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5 text-[9px] text-theme-muted">
              <span className="w-2 h-2 rounded-sm" style={{ background: COLORES_PRODUCTO[i % COLORES_PRODUCTO.length] }} />
              {corto(c, 34)}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-theme-muted mt-2">
          Agregado de todos los años del extracto ({kpis.anioMin}–{kpis.anioMax}): muestra la
          estacionalidad del ciclo, no una serie temporal continua.
        </p>
      </Card>

      {/* ── Fila 4: producto — barras §14.5 + circular §14.6 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.25} className="lg:col-span-2">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Compras por Producto · Top {barrasProducto.length}
          </span>
          <div className="h-[340px]">
            {barrasProducto.length > 0 ? (
              <ResponsiveBar
                data={barrasProducto}
                theme={T}
                keys={["volumen"]}
                indexBy="producto"
                layout="horizontal"
                margin={{ top: 10, right: 30, bottom: 40, left: 220 }}
                padding={0.3}
                colors={["#EA580C"]}
                enableLabel={false}
                enableGridY={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 6, format: (v) => fmtCompactNum(Number(v)) }}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                tooltip={({ value, indexValue }) => (
                  <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <p className="font-semibold">{String(indexValue)}</p>
                    <p className="mt-0.5">Volumen: <strong className="text-orange-400">{fmtNum(value)}</strong></p>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
            )}
          </div>
        </Card>

        <Card delay={0.28}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Participación por Producto
          </span>
          <div className="h-[340px]">
            {datosPie.length > 0 ? (
              <ResponsivePie
                data={datosPie}
                theme={T}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                innerRadius={0.5}
                padAngle={1}
                cornerRadius={3}
                colors={{ datum: "data.color" }}
                borderWidth={0}
                enableArcLinkLabels={false}
                arcLabelsSkipAngle={14}
                arcLabel={(d) => `${((d.value / kpis.volumenTotal) * 100).toFixed(0)}%`}
                arcLabelsTextColor="#0F172A"
                tooltip={({ datum }) => (
                  <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <p className="font-semibold">{String(datum.id)}</p>
                    <p className="mt-0.5">
                      {fmtNum(datum.value)}{" "}
                      <span className="text-theme-muted">
                        ({((datum.value / kpis.volumenTotal) * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                )}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
            )}
          </div>
        </Card>
      </div>

      <p className="text-[10px] text-theme-muted text-center mb-2">
        El proveedor se identifica por <strong>planta</strong> y no por agente: el 30,8 % del
        volumen de compras está registrado sin agente proveedor, y cruzar por ese campo descartaría
        esas filas en silencio. Era justo lo que hacía que el extracto anterior perdiera volumen.
      </p>

      <p className="text-center text-[10px] text-theme-muted mt-5">
        Ministerio de Minas y Energía · Dirección de Hidrocarburos · 2026
      </p>
    </DashboardLayout>
  );
}
