"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { getNivoTheme } from "@/lib/nivo-theme";

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Card({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-theme-secondary border border-theme-card rounded-2xl p-5
        hover:border-amber-500/40 transition-colors duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface LegendItem { key: string; color: string; isLine?: boolean; }

function ChartLegend({ items, hidden, onToggle }: {
  items: LegendItem[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 mb-2">
      {items.map(({ key, color, isLine }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          title={hidden.has(key) ? `Mostrar ${key}` : `Ocultar ${key}`}
          className={`flex items-center gap-1.5 transition-opacity cursor-pointer
            ${hidden.has(key) ? "opacity-30" : "opacity-100"}`}
        >
          {isLine ? (
            <svg width="18" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2.5" />
              <circle cx="9" cy="4" r="2.5" fill={color} />
            </svg>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          )}
          <span className="text-[10px] text-[#94A3B8]">{key}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmtNum = (v: number) =>
  v.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TOOLTIP_STYLE = {
  padding: "8px 12px", background: "#1E293B", border: "1px solid #334155",
  borderRadius: 8, color: "#E2E8F0", fontSize: 12,
};

// ─── Tipo de dato ─────────────────────────────────────────────────────────────

interface DeficitRow {
  anio: number;
  subsidios: number;
  contribuciones: number;
  deficit_anual: number;
  deficit_acumulado: number | null;
  apropiacion_pgn: number;
  recursos_faltantes: number | null;
}

// ─── Capa SVG de línea genérica (fuera del componente → sin hooks) ────────────
// getValue debe devolver el valor YA dividido por 1e6 (en "millones").
function buildLineLayer(
  sourceRows: DeficitRow[],
  getValue: (d: DeficitRow) => number | null,
  color: string,
  sw = 2.5
) {
  return function LineLayer({ bars, xScale, yScale }: any) {
    if (!yScale) return null;

    // Posición X central de cada año
    const cx: Record<string, number> = {};

    if (bars && bars.length > 0) {
      // Cuando hay barras, usamos su posición exacta
      bars.forEach((b: any) => {
        const yr = String(b.data.indexValue);
        if (cx[yr] === undefined) cx[yr] = b.x + b.width / 2;
      });
    } else if (xScale?.bandwidth) {
      // Fallback cuando las barras están ocultas (keys=[])
      sourceRows.forEach(d => {
        const x = xScale(String(d.anio));
        if (x !== undefined) cx[String(d.anio)] = x + xScale.bandwidth() / 2;
      });
    }

    const pts = sourceRows
      .map(d => {
        const x = cx[String(d.anio)];
        if (x === undefined) return null;
        const v = getValue(d);
        if (v === null || v === undefined) return null;
        return { x, y: yScale(v) };
      })
      .filter(Boolean) as { x: number; y: number }[];

    if (pts.length === 0) return null;
    if (pts.length === 1) {
      return (
        <g>
          <circle cx={pts[0].x} cy={pts[0].y} r={5} fill={color} stroke="#0F172A" strokeWidth={1.5} />
        </g>
      );
    }

    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    return (
      <g>
        <path d={pathD} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} stroke="#0F172A" strokeWidth={0.5} />
        ))}
      </g>
    );
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SubsidiosPage() {
  const { resolvedTheme } = useTheme();
  const T = getNivoTheme(resolvedTheme === "dark");

  // ── Estado (todos los hooks ANTES del early return) ──
  const [rows, setRows] = useState<DeficitRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("Todas");
  const [c1Hidden, setC1Hidden] = useState<Set<string>>(new Set());
  const [c2Hidden, setC2Hidden] = useState<Set<string>>(new Set());
  const [c3Hidden, setC3Hidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/subsidios/deficit-historico")
      .then(r => r.json())
      .then(raw => {
        if (Array.isArray(raw.data)) {
          setRows(raw.data.map((h: any) => ({
            anio: Number(h.anio),
            subsidios: Number(h.subsidios) || 0,
            contribuciones: Number(h.contribuciones) || 0,
            deficit_anual: Number(h.deficit_anual) || 0,
            deficit_acumulado: h.deficit_acumulado != null ? Number(h.deficit_acumulado) : null,
            apropiacion_pgn: Number(h.apropiacion_pgn) || 0,
            recursos_faltantes: h.recursos_faltantes != null ? Number(h.recursos_faltantes) : null,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // ── Early return (después de todos los hooks) ──
  if (rows.length === 0) {
    return (
      <DashboardLayout title="Histórico Déficit de Subsidios - FSSRI" subtitle="">
        <div className="flex items-center justify-center h-64 text-theme-muted">Cargando datos…</div>
      </DashboardLayout>
    );
  }

  // ── Funciones de toggle para leyendas ──
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (key: string) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleC1 = toggle(setC1Hidden);
  const toggleC2 = toggle(setC2Hidden);
  const toggleC3 = toggle(setC3Hidden);

  // ── Click en barra → filtrar por año ──
  const handleBarClick = (data: any) => {
    const year = String(data.indexValue);
    setSelectedYear(prev => prev === year ? "Todas" : year);
  };

  // ── Datos filtrados ──
  const chartRows = selectedYear === "Todas"
    ? rows
    : rows.filter(d => String(d.anio) === selectedYear);

  // ── KPIs ──
  const kpis = chartRows.reduce(
    (acc, d) => ({
      necesidad: acc.necesidad + d.deficit_anual,
      apropiacion: acc.apropiacion + d.apropiacion_pgn,
      deficit_acumulado: acc.deficit_acumulado + (d.deficit_acumulado ?? 0),
      subsidios: acc.subsidios + d.subsidios,
      contribuciones: acc.contribuciones + d.contribuciones,
    }),
    { necesidad: 0, apropiacion: 0, deficit_acumulado: 0, subsidios: 0, contribuciones: 0 }
  );

  const years = rows.map(d => String(d.anio));
  const xTicks = years.filter(y => Number(y) % 5 === 0);

  // ────────────────────────────────────────────────────────────────────────────
  // GRÁFICA 1: Subsidios vs Contribuciones (barras agrupadas)
  // ────────────────────────────────────────────────────────────────────────────
  const C1_SERIES = [
    { key: "Suma de Subsidios (SIN+ZNI)", color: "#F59E0B" },
    { key: "Suma de Contribuciones",       color: "#D97706" },
  ];
  const chart1Data = chartRows.map(d => ({
    anio: String(d.anio),
    "Suma de Subsidios (SIN+ZNI)": +(d.subsidios / 1e6).toFixed(3),
    "Suma de Contribuciones":       +(d.contribuciones / 1e6).toFixed(3),
  }));
  const c1Keys = C1_SERIES.map(s => s.key).filter(k => !c1Hidden.has(k));
  const c1Colors = C1_SERIES.filter(s => !c1Hidden.has(s.key)).map(s => s.color);

  // ────────────────────────────────────────────────────────────────────────────
  // GRÁFICA 2 COMBO:
  //   Barras  = Suma de Déficit acumulado  (#F59E0B, solo desde 2014)
  //   Línea 1 = Suma de Déficit Año        (#F5F0DC, crema/blanco, la más alta)
  //   Línea 2 = Suma de Apropiación PGN    (#B8860B, dorado oscuro)
  // ────────────────────────────────────────────────────────────────────────────
  const C2_SERIES = [
    { key: "Suma de Deficit acumulado", color: "#F59E0B", isLine: false },
    { key: "Suma de Déficit Año",       color: "#F5F0DC", isLine: true  },
    { key: "Suma de Apropiación PGN",   color: "#B8860B", isLine: true  },
  ];

  // Los datos para las barras: incluimos TODOS los años (0 cuando no hay déficit)
  const chart2Data = chartRows.map(d => ({
    anio: String(d.anio),
    "Suma de Deficit acumulado": d.deficit_acumulado != null && d.deficit_acumulado > 0
      ? +(d.deficit_acumulado / 1e6).toFixed(3)
      : 0,
  }));

  // maxValue: el más alto de las tres series para escalar el eje Y correctamente
  const chart2MaxY = Math.max(
    ...chartRows.map(d => (d.deficit_acumulado ?? 0) / 1e6),
    ...chartRows.map(d => d.deficit_anual / 1e6),
    ...chartRows.map(d => d.apropiacion_pgn / 1e6),
    0.5
  ) * 1.08;

  const c2BarKeys = c2Hidden.has("Suma de Deficit acumulado")
    ? [] : ["Suma de Deficit acumulado"];

  // Líneas: buildLineLayer recibe getValue que devuelve valor ya en millones
  const deficitAnualLayer = buildLineLayer(
    chartRows, d => d.deficit_anual / 1e6, "#F5F0DC", 2.5
  );
  const pgnLayer = buildLineLayer(
    chartRows, d => d.apropiacion_pgn / 1e6, "#B8860B", 2.5
  );

  const chart2Layers: any[] = ["grid", "axes", "bars"];
  if (!c2Hidden.has("Suma de Déficit Año"))     chart2Layers.push(deficitAnualLayer);
  if (!c2Hidden.has("Suma de Apropiación PGN")) chart2Layers.push(pgnLayer);
  chart2Layers.push("markers");

  // ────────────────────────────────────────────────────────────────────────────
  // GRÁFICA 3: Apropiación PGN + A-1 (barras apiladas)
  // ────────────────────────────────────────────────────────────────────────────
  const C3_SERIES = [
    { key: "Suma de Apropiación PGN", color: "#F59E0B" },
    { key: "Suma de A-1",             color: "#D97706" },
  ];
  const chart3Data = chartRows.map(d => {
    const prev = rows.find(p => p.anio === d.anio - 1);
    return {
      anio: String(d.anio),
      "Suma de Apropiación PGN": +(d.apropiacion_pgn / 1e6).toFixed(3),
      "Suma de A-1": prev && prev.deficit_acumulado != null && prev.deficit_acumulado > 0
        ? +(prev.deficit_acumulado / 1e6).toFixed(3)
        : 0,
    };
  });
  const c3Keys   = C3_SERIES.map(s => s.key).filter(k => !c3Hidden.has(k));
  const c3Colors = C3_SERIES.filter(s => !c3Hidden.has(s.key)).map(s => s.color);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title="Histórico Déficit de Subsidios de Energía Eléctrica - FSSRI"
      subtitle=""
    >
      {/* ── BARRA KPI ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-6 bg-[#2D1A00] border border-amber-700/40 rounded-xl mb-4 overflow-hidden"
      >
        <div className="flex flex-col justify-center p-3 border-r border-amber-700/30">
          <div className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wide">Año</div>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="mt-1.5 bg-[#3D2500] text-amber-300 text-sm font-bold border border-amber-600/50
              rounded px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="Todas">Todas</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {[
          { label: "Necesidad Presupuestal",   value: kpis.necesidad },
          { label: "Apropiación PPGN",          value: kpis.apropiacion },
          { label: "Déficit acumulado",          value: kpis.deficit_acumulado },
          { label: "Subsidios agregados",        value: kpis.subsidios },
          { label: "Contribuciones agregados",   value: kpis.contribuciones },
        ].map(({ label, value }, i) => (
          <div key={label}
            className={`p-3 text-center ${i < 4 ? "border-r border-amber-700/30" : ""}`}
          >
            <div className="text-sm font-extrabold text-white leading-none tabular-nums">
              {label === "Déficit acumulado" && kpis.deficit_acumulado === 0
                ? "(En blanco)"
                : fmtNum(value)}
            </div>
            <div className="text-[10px] text-amber-400 mt-1.5 leading-tight">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Indicador de filtro activo ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 min-h-[20px]">
        {selectedYear !== "Todas" ? (
          <>
            <span className="text-xs text-amber-400">
              Filtrando: <strong>{selectedYear}</strong>
            </span>
            <button
              onClick={() => setSelectedYear("Todas")}
              className="text-[10px] text-amber-400/60 hover:text-amber-400 border
                border-amber-700/40 rounded px-2 py-0.5 transition-colors"
            >
              × limpiar
            </button>
          </>
        ) : (
          <span className="text-[10px] text-theme-muted">
            Clic en una barra para filtrar · Clic en leyenda para mostrar/ocultar serie
          </span>
        )}
      </div>

      {/* ── FILA 2: Gráfica 1 (izq) + Gráfica 2 combo (der) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">
          <Card delay={0.1}>
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
              Suma de Subsidios (SIN+ZNI) y Suma de Contribuciones por Año
            </span>
            <ChartLegend items={C1_SERIES} hidden={c1Hidden} onToggle={toggleC1} />
            <div className="h-[250px]">
              <ResponsiveBar
                data={chart1Data}
                keys={c1Keys}
                indexBy="anio"
                theme={T}
                margin={{ top: 8, right: 20, bottom: 50, left: 65 }}
                groupMode="grouped"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={c1Colors}
                padding={0.25} innerPadding={1}
                enableLabel={false} enableGridX={false}
                axisTop={null} axisRight={null}
                axisLeft={{ tickSize: 0, tickPadding: 6, format: v => `${v} mill.` }}
                axisBottom={{
                  tickSize: 0, tickPadding: 8, tickRotation: -45,
                  tickValues: selectedYear === "Todas" ? xTicks : undefined,
                }}
                onClick={handleBarClick}
                tooltip={({ id, indexValue }) => {
                  const row = rows.find(d => String(d.anio) === indexValue);
                  const v = row
                    ? (id === "Suma de Subsidios (SIN+ZNI)" ? row.subsidios : row.contribuciones)
                    : 0;
                  return (
                    <div style={TOOLTIP_STYLE}>
                      Año {indexValue} — {id}:<br /><strong>{fmtNum(v)}</strong>
                    </div>
                  );
                }}
              />
            </div>
          </Card>

          <Card delay={0.12}>
            <p className="text-sm text-theme-secondary leading-relaxed">
              Los subsidios de energía eléctrica se pagan principalmente con las contribuciones de los
              usuarios de los estratos 5 y 6, usuarios comerciales e industriales. Desde 2002, los subsidios
              han sido superiores a las contribuciones, constituyendo así la{" "}
              <strong className="text-white">Necesidad presupuestal de la vigencia</strong>{" "}
              para cada año.{" "}
              (<strong className="text-white">Necesidad de la vigencia</strong> = Subsidios − Contribuciones).
            </p>
          </Card>
        </div>

        {/* Columna derecha: combo */}
        <Card delay={0.14}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            Suma de Déficit acumulado, Suma de Apropiación PGN y Suma de Déficit Año por Año
          </span>
          <ChartLegend items={C2_SERIES} hidden={c2Hidden} onToggle={toggleC2} />
          <div className="h-[370px]">
            <ResponsiveBar
              data={chart2Data}
              keys={c2BarKeys}
              indexBy="anio"
              theme={T}
              margin={{ top: 8, right: 20, bottom: 50, left: 65 }}
              groupMode="grouped"
              valueScale={{ type: "linear", max: chart2MaxY }}
              indexScale={{ type: "band", round: true }}
              colors={["#F59E0B"]}
              padding={0.4}
              enableLabel={false} enableGridX={false}
              axisTop={null} axisRight={null}
              axisLeft={{
                tickSize: 0, tickPadding: 6,
                legend: "Suma de Déficit acumulado",
                legendOffset: -55, legendPosition: "middle" as const,
                format: v => `${v} mill.`,
              }}
              axisBottom={{
                tickSize: 0, tickPadding: 8, tickRotation: -45,
                tickValues: selectedYear === "Todas" ? xTicks : undefined,
              }}
              layers={chart2Layers}
              onClick={handleBarClick}
              tooltip={({ indexValue }) => {
                const row = rows.find(d => String(d.anio) === indexValue);
                const v = row ? (row.deficit_acumulado ?? 0) : 0;
                return (
                  <div style={TOOLTIP_STYLE}>
                    Año {indexValue} — Déficit acumulado:<br /><strong>{fmtNum(v)}</strong>
                  </div>
                );
              }}
            />
          </div>
        </Card>
      </div>

      {/* ── FILA 3: Gráfica 3 (izq) + Textos (der) ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        <Card delay={0.16}>
          <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px]">
            Suma de Apropiación PGN y Suma de A-1 por Año
          </span>
          <ChartLegend items={C3_SERIES} hidden={c3Hidden} onToggle={toggleC3} />
          <div className="h-[265px]">
            <ResponsiveBar
              data={chart3Data}
              keys={c3Keys}
              indexBy="anio"
              theme={T}
              margin={{ top: 8, right: 20, bottom: 50, left: 65 }}
              groupMode="stacked"
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={c3Colors}
              padding={0.25}
              enableLabel={false} enableGridX={false}
              axisTop={null} axisRight={null}
              axisLeft={{ tickSize: 0, tickPadding: 6, format: v => `${v} mill.` }}
              axisBottom={{
                tickSize: 0, tickPadding: 8, tickRotation: -45,
                tickValues: selectedYear === "Todas" ? xTicks : undefined,
              }}
              onClick={handleBarClick}
              tooltip={({ id, indexValue }) => {
                const row = rows.find(d => String(d.anio) === indexValue);
                const prev = rows.find(d => d.anio === Number(indexValue) - 1);
                const v = row
                  ? (id === "Suma de Apropiación PGN"
                    ? row.apropiacion_pgn
                    : (prev?.deficit_acumulado ?? 0))
                  : 0;
                return (
                  <div style={TOOLTIP_STYLE}>
                    Año {indexValue} — {id}:<br /><strong>{fmtNum(v)}</strong>
                  </div>
                );
              }}
            />
          </div>
        </Card>

        <Card delay={0.18}>
          <div className="text-sm text-theme-secondary leading-relaxed space-y-4">
            <p>
              La necesidad de la vigencia usualmente es cubierta con recursos del Presupuesto General de la Nación.
              Lo que no es cubierto por estos, deriva en el{" "}
              <strong className="text-white">Déficit de la Vigencia</strong>.{" "}
              (Déficit de la vigencia = Recursos PGN − Déficit de la vigencia)
            </p>
            <p>
              Desde el 2014 se ha venido presentando déficit en las vigencias, por lo que los saldos pendientes se
              trasladan al año siguiente para su pago. Este evento repetitivo se conoce como el{" "}
              <strong className="text-amber-400">déficit acumulado</strong>.{" "}
              (Déficit acumulado<sub>a</sub> = Déficit de la vigencia<sub>a</sub> + Déficit de la vigencia<sub>a-1</sub>)
            </p>
            <p>
              Con los recursos apropiados se pagan en primera medida saldos pendientes de la vigencia anterior
              (Déficit acumulado) y su diferencia en la anualidad en curso. Para 2025, se tiene proyectado pagar valores
              pendientes de 2024 por alrededor de 1,7 o 1,8 billones y 1,36 para trimestres de 2025.
            </p>
          </div>
        </Card>
      </div>

      <p className="text-center text-[10px] text-theme-muted mt-10">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}
