"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import CoberturaBanner from "@/components/dashboard/CoberturaBanner";
import FunnelChart from "@/components/dashboard/FunnelChart";
import WaterfallChart, { type WaterfallItem } from "@/components/dashboard/WaterfallChart";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtCompactNum, fmtNum } from "@/lib/format";
import type { CoberturaSicom } from "@/lib/sicom";

const MapaCoropletaDepartamentos = dynamic(
  () => import("@/components/maps/MapaCoropletaDepartamentos"),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-theme-muted text-xs">Cargando mapa…</div> }
);

const COLORES_TIPO = [
  "#D97706", "#EA580C", "#F59E0B", "#06B6D4", "#8B5CF6",
  "#10B981", "#FCD34D", "#64748B", "#F43F5E",
];

// ─── Types (misma forma que retorna /api/hidrocarburos/sicom/capacidad) ────
interface Kpis {
  capacidadTotal: number; registros: number; registrosEnCero: number;
  ciclos: number; anioMin: number; anioMax: number;
  agentes: number; departamentos: number; municipios: number; productos: number;
}
interface ItemCiclo { anio: number; capacidad: number; registros: number }
interface Concentracion { anios: number[]; pct: number }
interface ItemProducto { producto: string; capacidad: number }
interface FilaDepto {
  [tipo: string]: string | number;
  departamento: string;
  total: number;
}
interface ItemMapa { departamento: string; codigoDane: string | null; capacidad: number }

const DEFAULT_KPIS: Kpis = {
  capacidadTotal: 0, registros: 0, registrosEnCero: 0,
  ciclos: 0, anioMin: 0, anioMax: 0,
  agentes: 0, departamentos: 0, municipios: 0, productos: 0,
};

export default function HidrocarburosCapacidadPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const T = getNivoTheme(isDark);

  const [kpis, setKpis] = useState<Kpis>(DEFAULT_KPIS);
  const [porCiclo, setPorCiclo] = useState<ItemCiclo[]>([]);
  const [concentracion, setConcentracion] = useState<Concentracion | null>(null);
  const [porProducto, setPorProducto] = useState<ItemProducto[]>([]);
  const [porDepartamento, setPorDepartamento] = useState<FilaDepto[]>([]);
  const [tiposAgente, setTiposAgente] = useState<string[]>([]);
  const [cascada, setCascada] = useState<WaterfallItem[]>([]);
  const [totalCascada, setTotalCascada] = useState(0);
  const [mapa, setMapa] = useState<ItemMapa[]>([]);
  const [cobertura, setCobertura] = useState<CoberturaSicom | null>(null);
  const [geoData, setGeoData] = useState<object | null>(null);

  useEffect(() => {
    fetch("/api/hidrocarburos/sicom/capacidad")
      .then((r) => r.json())
      .then((json) => {
        if (json?.error) return;
        setKpis(json.kpis ?? DEFAULT_KPIS);
        setPorCiclo(json.porCiclo ?? []);
        setConcentracion(json.concentracion ?? null);
        setPorProducto(json.porProducto ?? []);
        setPorDepartamento(json.porDepartamento ?? []);
        setTiposAgente(json.tiposAgente ?? []);
        setCascada(json.cascada ?? []);
        setTotalCascada(json.totalCascada ?? 0);
        setMapa(json.mapaDepartamento ?? []);
        setCobertura(json.cobertura ?? null);
      })
      .catch(() => {});
    fetch("/departamentos_colombia.geojson").then((r) => r.json()).then(setGeoData).catch(() => {});
  }, []);

  const embudoProductos = useMemo(
    () => porProducto.map((p) => ({ label: p.producto, valor: p.capacidad })),
    [porProducto]
  );
  const mapaDatos = useMemo(
    () => mapa.map((m) => ({
      departamento: m.departamento,
      codigoDane: m.codigoDane,
      valor: m.capacidad,
    })),
    [mapa]
  );
  const datosCiclo = useMemo(
    () => porCiclo.map((c) => ({ anio: String(c.anio), capacidad: c.capacidad })),
    [porCiclo]
  );
  const concentracionMayorista = useMemo(() => {
    const may = cascada.find((c) => c.tipo === "DISTRIBUIDOR MAYORISTA");
    if (!may || !totalCascada) return null;
    return (may.valor / totalCascada) * 100;
  }, [cascada, totalCascada]);

  return (
    <DashboardLayout
      title="Capacidad Operativa SICOM"
      subtitle="Capacidad declarada por ciclo, producto, territorio y tipo de agente · Fuente: SICOM (cubo Capacidad)"
    >
      <CoberturaBanner cobertura={cobertura} unidadMedida="unidades de capacidad" />

      {/* ── Fila 1: KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Capacidad Declarada</div>
          <div className="text-xl font-bold text-gold truncate">{fmtCompactNum(kpis.capacidadTotal)}</div>
          <div className="text-[10px] text-amber-400/90 mt-1">acumulada, unidad sin documentar</div>
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Ciclos</div>
          <div className="text-xl font-bold text-amber-400 truncate">{fmtNum(kpis.ciclos)}</div>
          <div className="text-[10px] text-theme-muted mt-1">{kpis.anioMin}–{kpis.anioMax}</div>
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Registros</div>
          <div className="text-xl font-bold text-orange-400 truncate">{fmtNum(kpis.registros)}</div>
          <div className="text-[10px] text-theme-muted mt-1">
            {fmtNum(kpis.registrosEnCero)} en cero ({kpis.registros ? ((kpis.registrosEnCero / kpis.registros) * 100).toFixed(0) : 0}%)
          </div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Agentes</div>
          <div className="text-xl font-bold text-cyan-400 truncate">{fmtNum(kpis.agentes)}</div>
          <div className="text-[10px] text-theme-muted mt-1">con capacidad declarada</div>
        </Card>
        <Card delay={0.17} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Municipios</div>
          <div className="text-xl font-bold text-teal-400 truncate">{fmtNum(kpis.municipios)}</div>
          <div className="text-[10px] text-theme-muted mt-1">{kpis.departamentos} departamentos</div>
        </Card>
        <Card delay={0.2} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Productos</div>
          <div className="text-xl font-bold text-violet-400 truncate">{fmtNum(kpis.productos)}</div>
          <div className="text-[10px] text-theme-muted mt-1">categorías</div>
        </Card>
      </div>

      {/* ── Fila 2: la serie por ciclo, que el Excel no permitía ver ── */}
      <Card delay={0.13} className="mb-5">
        <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
          Capacidad Declarada por Año de Ciclo
        </span>
        <div className="h-[260px]">
          {datosCiclo.length > 0 ? (
            <ResponsiveBar
              data={datosCiclo}
              theme={T}
              keys={["capacidad"]}
              indexBy="anio"
              margin={{ top: 10, right: 20, bottom: 40, left: 80 }}
              padding={0.3}
              colors={["#D97706"]}
              enableLabel={false}
              enableGridX={false}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -45 }}
              axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtCompactNum(Number(v)) }}
              tooltip={({ value, indexValue }) => (
                <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                  <p className="font-semibold">Ciclo {String(indexValue)}</p>
                  <p className="mt-0.5">Capacidad: <strong className="text-amber-400">{fmtNum(value)}</strong></p>
                </div>
              )}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-theme-muted text-sm">Cargando…</div>
          )}
        </div>
        <p className="text-[10px] text-theme-muted mt-2">
          Esta serie no estaba disponible en la versión anterior del tablero: el archivo de Excel
          colapsaba todos los ciclos en una sola cifra. Vista así, la distribución entre años deja de
          ser homogénea y queda a la vista.
        </p>
      </Card>

      {/* ── Fila 3: embudo por producto + barras apiladas por departamento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card delay={0.15}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Capacidad por Producto
          </span>
          <FunnelChart data={embudoProductos} color="#EA580C" />
        </Card>

        <Card delay={0.18} className="lg:col-span-2">
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Capacidad por Departamento y Tipo de Agente · Top {porDepartamento.length}
          </span>
          <div className="h-[340px]">
            {porDepartamento.length > 0 && tiposAgente.length > 0 ? (
              <ResponsiveBar
                data={porDepartamento}
                theme={T}
                keys={tiposAgente}
                indexBy="departamento"
                margin={{ top: 10, right: 20, bottom: 96, left: 80 }}
                padding={0.3}
                colors={COLORES_TIPO}
                enableLabel={false}
                enableGridX={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -45 }}
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
            {tiposAgente.map((t, i) => (
              <span key={t} className="flex items-center gap-1.5 text-[9px] text-theme-muted">
                <span className="w-2 h-2 rounded-sm" style={{ background: COLORES_TIPO[i % COLORES_TIPO.length] }} />
                {t}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Fila 4: cascada + mapa ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.22}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Capacidad por Tipo de Agente (cascada)
          </span>
          <WaterfallChart data={cascada} total={totalCascada} alto={320} />
        </Card>

        <Card delay={0.25}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Capacidad por Ubicación
          </span>
          <div className="h-[320px]">
            <MapaCoropletaDepartamentos
              geoData={geoData}
              datos={mapaDatos}
              isDark={isDark}
              etiquetaValor="Capacidad"
            />
          </div>
          <p className="text-[10px] text-theme-muted mt-2">
            Cruce por código DANE de departamento, que el cubo sí expone.
          </p>
        </Card>
      </div>

      {/* ── Nota de calidad de datos ── */}
      <Card delay={0.28} className="mb-5 !border-amber-500/30">
        <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px] mb-2 block">
          Cómo leer la capacidad operativa
        </span>
        <ul className="text-[11px] text-theme-secondary space-y-1.5 list-disc pl-4">
          <li>
            La capacidad se declara <strong>por ciclo</strong>. La cifra agregada es la suma de{" "}
            {kpis.ciclos} ciclos entre {kpis.anioMin} y {kpis.anioMax}, es decir una acumulación de
            declaraciones: <strong className="text-amber-400">no es la capacidad instalada del
            país</strong>.
          </li>
          {concentracion && concentracion.anios.length > 0 && (
            <li>
              Los ciclos de <strong>{concentracion.anios.join(" y ")}</strong> concentran el{" "}
              <strong className="text-amber-400">{concentracion.pct.toFixed(1)}%</strong> del total,
              con magnitudes de tres órdenes por encima del resto. Están pendientes de explicación
              por parte de SICOM; no se excluyen del tablero porque esa decisión no nos corresponde.
            </li>
          )}
          {concentracionMayorista != null && (
            <li>
              El <strong className="text-amber-400">{concentracionMayorista.toFixed(1)}%</strong> lo
              aportan los registros de <em>distribuidor mayorista</em>, una fracción pequeña de las
              filas.
            </li>
          )}
          <li>
            El cubo <strong>no documenta la unidad de medida</strong>. El Informe de Metodología §17
            la lista entre los controles obligatorios, pero el valor no viene en la fuente.
          </li>
          <li>
            El {kpis.registros ? ((kpis.registrosEnCero / kpis.registros) * 100).toFixed(0) : 0}% de
            los registros tiene capacidad cero: cuentan como agente y municipio, pero no aportan al total.
          </li>
        </ul>
      </Card>

      <p className="text-center text-[10px] text-theme-muted mt-5">
        Ministerio de Minas y Energía · Dirección de Hidrocarburos · 2026
      </p>
    </DashboardLayout>
  );
}
