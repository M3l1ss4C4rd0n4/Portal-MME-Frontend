"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import CoberturaBanner from "@/components/dashboard/CoberturaBanner";
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

// ─── Types (misma forma que retorna /api/hidrocarburos/sicom/compras) ──────
interface Kpis {
  volumenTotal: number; volumenTransito: number; compradores: number;
  plantas: number; tiposComprador: number; productos: number;
  anioMin: number; anioMax: number; pctGeolocalizado: number;
}
interface ItemAnio { anio: number; volumen: number; transito: number }
interface FilaAnioTipo { anio: number; [tipo: string]: number }
interface ItemComprador { nombre: string; tipo: string; volumen: number }
interface ItemMapa { departamento: string; codigoDane: string | null; volumen: number }

const DEFAULT_KPIS: Kpis = {
  volumenTotal: 0, volumenTransito: 0, compradores: 0, plantas: 0,
  tiposComprador: 0, productos: 0, anioMin: 0, anioMax: 0, pctGeolocalizado: 0,
};

export default function HidrocarburosComprasPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const T = getNivoTheme(isDark);

  const [kpis, setKpis] = useState<Kpis>(DEFAULT_KPIS);
  const [porAnio, setPorAnio] = useState<ItemAnio[]>([]);
  const [porAnioPorTipo, setPorAnioPorTipo] = useState<FilaAnioTipo[]>([]);
  const [tiposAgente, setTiposAgente] = useState<string[]>([]);
  const [topCompradores, setTopCompradores] = useState<ItemComprador[]>([]);
  const [mapaComprador, setMapaComprador] = useState<ItemMapa[]>([]);
  const [mapaProveedor, setMapaProveedor] = useState<ItemMapa[]>([]);
  const [cobertura, setCobertura] = useState<CoberturaSicom | null>(null);
  const [geoData, setGeoData] = useState<object | null>(null);

  useEffect(() => {
    fetch("/api/hidrocarburos/sicom/compras")
      .then((r) => r.json())
      .then((json) => {
        if (json?.error) return;
        setKpis(json.kpis ?? DEFAULT_KPIS);
        setPorAnio(json.porAnio ?? []);
        setPorAnioPorTipo(json.porAnioPorTipo ?? []);
        setTiposAgente(json.tiposAgente ?? []);
        setTopCompradores(json.topCompradores ?? []);
        setMapaComprador(json.mapaComprador ?? []);
        setMapaProveedor(json.mapaProveedor ?? []);
        setCobertura(json.cobertura ?? null);
      })
      .catch(() => {});
    fetch("/departamentos_colombia.geojson").then((r) => r.json()).then(setGeoData).catch(() => {});
  }, []);

  const serieArea = useMemo(() => {
    if (!porAnio.length) return [];
    return [{
      id: "Volumen comprado",
      color: "#D97706",
      data: porAnio.map((a) => ({ x: String(a.anio), y: a.volumen })),
    }];
  }, [porAnio]);

  const maxComprador = Math.max(1, ...topCompradores.map((c) => c.volumen));

  const mapaCompradorDatos = useMemo(
    () => mapaComprador.map((m) => ({ departamento: m.departamento, codigoDane: m.codigoDane, valor: m.volumen })),
    [mapaComprador]
  );
  const mapaProveedorDatos = useMemo(
    () => mapaProveedor.map((m) => ({ departamento: m.departamento, codigoDane: m.codigoDane, valor: m.volumen })),
    [mapaProveedor]
  );

  return (
    <DashboardLayout
      title="Compras de Combustibles SICOM"
      subtitle="Volúmenes adquiridos, agentes participantes y distribución territorial · Fuente: SICOM (cubo Compras)"
    >
      <CoberturaBanner cobertura={cobertura} unidadMedida="unidades de volumen" />

      {/* ── Fila 1: KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
        <Card delay={0.05} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Volumen Comprado</div>
          <div className="text-xl font-bold text-gold truncate">{fmtNum(kpis.volumenTotal)}</div>
          <div className="text-[10px] text-emerald-400/90 mt-1">concilia con el total del cubo</div>
        </Card>
        <Card delay={0.08} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Volumen en Tránsito</div>
          <div className="text-xl font-bold text-cyan-400 truncate">{fmtNum(kpis.volumenTransito)}</div>
          <div className="text-[10px] text-theme-muted mt-1">
            {kpis.volumenTotal ? ((kpis.volumenTransito / kpis.volumenTotal) * 100).toFixed(1) : 0}% del comprado
          </div>
        </Card>
        <Card delay={0.11} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Compradores</div>
          <div className="text-xl font-bold text-amber-400 truncate">{fmtNum(kpis.compradores)}</div>
          <div className="text-[10px] text-theme-muted mt-1">agentes distintos</div>
        </Card>
        <Card delay={0.14} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Periodo</div>
          <div className="text-xl font-bold text-orange-400 truncate">
            {kpis.anioMin || "—"}–{kpis.anioMax || "—"}
          </div>
          <div className="text-[10px] text-theme-muted mt-1">años de ciclo</div>
        </Card>
        <Card delay={0.17} className="!p-4">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-1">Plantas Proveedoras</div>
          <div className="text-xl font-bold text-violet-400 truncate">{fmtNum(kpis.plantas)}</div>
          <div className="text-[10px] text-theme-muted mt-1">{kpis.productos} productos</div>
        </Card>
      </div>

      {/* ── Fila 2: áreas §13.1 + columnas por tipo §13.2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.15}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Volumen Comprado por Año
          </span>
          <div className="h-[300px]">
            {serieArea.length > 0 ? (
              <ResponsiveLine
                data={serieArea}
                theme={T}
                margin={{ top: 10, right: 20, bottom: 50, left: 70 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, max: "auto" }}
                curve="monotoneX"
                enableArea
                areaOpacity={0.2}
                enablePoints
                pointSize={5}
                enableGridX={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -45 }}
                axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtCompactNum(Number(v)) }}
                colors={{ datum: "color" }}
                lineWidth={2.5}
                useMesh
                tooltip={({ point }) => (
                  <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <p className="font-semibold text-sm">Año {String(point.data.x)}</p>
                    <p className="mt-0.5">Volumen: <strong className="text-amber-400">{fmtNum(Number(point.data.y))}</strong></p>
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
            Compras por Tipo de Agente
          </span>
          <div className="h-[300px]">
            {porAnioPorTipo.length > 0 && tiposAgente.length > 0 ? (
              <ResponsiveBar
                data={porAnioPorTipo}
                theme={T}
                keys={tiposAgente}
                indexBy="anio"
                margin={{ top: 10, right: 20, bottom: 50, left: 70 }}
                padding={0.25}
                colors={COLORES_TIPO}
                enableLabel={false}
                enableGridX={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -45 }}
                axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtCompactNum(Number(v)) }}
                tooltip={({ id, value, indexValue }) => (
                  <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary">
                    <p className="font-semibold">Año {String(indexValue)}</p>
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

      {/* ── Fila 3: top compradores §13.3 ── */}
      <Card delay={0.22} className="mb-5">
        <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
          Volumen de Compra por Agente · Top {topCompradores.length}
        </span>
        <div className="space-y-2">
          {topCompradores.map((c, i) => (
            <div key={`${c.nombre}-${c.tipo}`} className="flex items-center gap-2 text-[11px]">
              {/* El ranking agrupa por (agente, tipo): un mismo agente puede
                  comprar como refinador y como mayorista, y sin el tipo las
                  dos filas se leen como un duplicado. */}
              <span className="w-56 text-right shrink-0 truncate" title={`${c.nombre} · ${c.tipo}`}>
                <span className="text-theme-muted">{c.nombre}</span>
                <span className="text-theme-muted/60"> · {c.tipo.toLowerCase()}</span>
              </span>
              <div className="flex-1 h-3.5 bg-theme-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: COLORES_TIPO[tiposAgente.indexOf(c.tipo) % COLORES_TIPO.length] || "#D97706" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.volumen / maxComprador) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.02 }}
                />
              </div>
              <span className="w-28 text-theme-primary font-semibold tabular-nums shrink-0 text-right">
                {fmtNum(c.volumen)}
              </span>
            </div>
          ))}
          {topCompradores.length === 0 && (
            <div className="text-center text-theme-muted text-xs py-4">Cargando…</div>
          )}
        </div>
      </Card>

      {/* ── Fila 4: mapas §13.4 y §13.5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card delay={0.25}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Ubicación del Comprador
          </span>
          <div className="h-[340px]">
            <MapaCoropletaDepartamentos
              geoData={geoData}
              datos={mapaCompradorDatos}
              isDark={isDark}
              etiquetaValor="Volumen comprado"
            />
          </div>
        </Card>
        <Card delay={0.28}>
          <span className="text-gold font-bold uppercase tracking-widest text-[11px] mb-3 block">
            Municipio Planta del Proveedor
          </span>
          <div className="h-[340px]">
            <MapaCoropletaDepartamentos
              geoData={geoData}
              datos={mapaProveedorDatos}
              isDark={isDark}
              etiquetaValor="Volumen suministrado"
              rampa={["#164E63", "#155E75", "#0E7490", "#0891B2", "#06B6D4", "#67E8F9"]}
            />
          </div>
        </Card>
      </div>

      <p className="text-[10px] text-theme-muted text-center mb-2">
        Los mapas cruzan por <strong>código DANE</strong>, que el cubo sí expone: se acabó la
        ambigüedad de los 67 nombres de municipio repetidos entre departamentos que obligaba a
        estimar con la ruta anterior. Queda georreferenciado el{" "}
        <strong className="text-theme-primary">{kpis.pctGeolocalizado.toFixed(1)}%</strong> del
        volumen; el resto corresponde a compras cuya planta proveedora <strong>no está registrada
        en SICOM</strong> y aparece agrupada como «sin ubicación en la fuente». No es una
        limitación del cruce, es lo que la fuente no tiene.
      </p>

      <p className="text-center text-[10px] text-theme-muted mt-5">
        Ministerio de Minas y Energía · Dirección de Hidrocarburos · 2026
      </p>
    </DashboardLayout>
  );
}
