"use client";

import { useState, useEffect, useMemo } from "react";
import { ResponsiveBar, BarDatum } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import BaseKpiChip, { type KpiChipProps } from "@/components/dashboard/KpiChip";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useGeoFilter } from "@/context/GeoFilterContext";
import { fetchDepartamentos } from "@/services/apiService";
import { normDeptKey } from "@/lib/departamentos";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SeriItem {
  area: string;
  anio: number;
  trimestre: number;
  estado: string;
  conteo: number;
}

interface FechaActualizacion {
  anio: number;
  mes: number;
}

interface ValidacionesData {
  serie: SeriItem[];
  resumen: Record<string, number>;
  ultimaActualizacion: string | null;
  filtros: {
    fondos: string[];
    anios: number[];
    trimestres: string[];
    prestadores: string[];
    departamentos: string[];
    fechasActualizacion: FechaActualizacion[];
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// "a. Otros" excluido — igual que Power BI: solo 4 estados válidos
const ESTADOS_VALIDOS = ["b. VI", "c. VI SP", "d. VP", "e. VF"] as const;
type EstadoKey = (typeof ESTADOS_VALIDOS)[number];

const COLORES: Record<string, string> = {
  "e. VF":    "var(--color-gold)",
  "d. VP":    "#78350F",
  "c. VI SP": "#B45309",
  "b. VI":    "#F59E0B",
};

const LABELS: Record<string, string> = {
  "e. VF":    "VF — Validación Final",
  "d. VP":    "VP — Validación Pendiente",
  "c. VI SP": "VI SP — Validación Inicial Saldos Pendientes",
  "b. VI":    "VI — Validación Inicial",
};

const MESES_NOMBRE: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function KpiChip({ color = "#F59E0B", ...rest }: Omit<KpiChipProps, "padding" | "valueSize" | "centered">) {
  return <BaseKpiChip padding="lg" valueSize="lg" centered color={color} {...rest} />;
}

function SelectFiltro({ label, value, onChange, options, minWidth = "140px" }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; minWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ minWidth }}>
      <label className="text-[10px] text-theme-muted uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-dash-chip border border-theme-card rounded-lg px-3 py-1.5 text-xs
          text-theme-primary focus:outline-none focus:border-amber-500/60 cursor-pointer"
      >
        <option value="">Todas</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/** Selector de Fecha de Actualización con optgroups por año.
 *  NO tiene opción "Todas" — siempre debe seleccionarse una fecha. */
function SelectFechaActualizacion({
  label,
  value,
  onChange,
  fechas,
  minWidth = "180px",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fechas: FechaActualizacion[];
  minWidth?: string;
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, FechaActualizacion[]>();
    for (const f of fechas) {
      if (!map.has(f.anio)) map.set(f.anio, []);
      map.get(f.anio)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [fechas]);

  return (
    <div className="flex flex-col gap-1" style={{ minWidth }}>
      <label className="text-[10px] text-theme-muted uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-dash-chip border border-theme-card rounded-lg px-3 py-1.5 text-xs
          text-theme-primary focus:outline-none focus:border-amber-500/60 cursor-pointer"
      >
        {grouped.map(([anio, meses]) => (
          <optgroup key={anio} label={String(anio)}>
            {meses.map((m) => {
              const val = `${anio}-${String(m.mes).padStart(2, "0")}`;
              return (
                <option key={val} value={val}>
                  {MESES_NOMBRE[m.mes]} {anio}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ─── Transformación de datos ──────────────────────────────────────────────────

type BarRow = BarDatum & { id: string };

function buildChartData(
  serie: SeriItem[],
  area: string,
  anioDesde: number,
  anioHasta: number,
  soloTrimestre: number | null,
): BarRow[] {
  const groups = new Map<string, Record<string, number>>();

  for (const item of serie) {
    if (item.area !== area) continue;
    if (item.anio < anioDesde || item.anio > anioHasta) continue;
    if (soloTrimestre !== null && item.trimestre !== soloTrimestre) continue;
    // Ignorar "a. Otros" — igual que Power BI
    if (!ESTADOS_VALIDOS.includes(item.estado as EstadoKey)) continue;

    const key = `${item.anio} T${item.trimestre}`;
    if (!groups.has(key)) groups.set(key, { _anio: item.anio, _trim: item.trimestre });
    groups.get(key)![item.estado] = item.conteo;
  }

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => a._anio !== b._anio ? a._anio - b._anio : a._trim - b._trim)
    .map(([id, obj]) => {
      // Denominador = solo los 4 estados válidos (idéntico a Power BI)
      const total = ESTADOS_VALIDOS.reduce((s, e) => s + (obj[e] ?? 0), 0);
      const row: BarRow = { id };
      for (const e of ESTADOS_VALIDOS) {
        const raw = obj[e] ?? 0;
        row[e] = total > 0 ? parseFloat((raw / total * 100).toFixed(2)) : 0;
        row[`_n_${e}`] = raw;   // conteo absoluto para el tooltip
      }
      row["_total"] = total;
      return row;
    });
}

// ─── Gráfico individual ───────────────────────────────────────────────────────

function ValidacionBar({
  data, title, isDark, selectedPeriod, onPeriodSelect,
}: {
  data: BarRow[];
  title: string;
  isDark: boolean;
  selectedPeriod: string | null;
  onPeriodSelect: (period: string) => void;
}) {
  const theme = getNivoTheme(isDark);

  // Si hay periodo seleccionado, filtrar a solo ese; si no, mostrar todo
  const displayData = selectedPeriod
    ? data.filter((r) => r.id === selectedPeriod)
    : data;

  if (displayData.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-semibold text-theme-primary mb-3">{title}</h3>
        <div className="flex-1 flex items-center justify-center text-xs text-theme-muted">
          Sin datos para el filtro seleccionado
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-theme-primary mb-1">{title}</h3>
      {selectedPeriod && (
        <p className="text-[10px] text-gold mb-2">
          Periodo: <strong>{selectedPeriod}</strong> — haz clic nuevamente para ver todos
        </p>
      )}
      <div className="flex-1" style={{ minHeight: 320 }}>
        <ResponsiveBar
          data={displayData}
          keys={[...ESTADOS_VALIDOS]}
          indexBy="id"
          groupMode="stacked"
          layout="vertical"
          valueScale={{ type: "linear" }}
          indexScale={{ type: "band", round: true }}
          colors={(bar) => COLORES[bar.id as string] ?? "#94A3B8"}
          theme={theme}
          margin={{ top: 10, right: 10, bottom: selectedPeriod ? 40 : 60, left: 44 }}
          padding={selectedPeriod ? 0.6 : 0.25}
          borderRadius={2}
          axisBottom={{
            tickRotation: displayData.length > 12 ? -45 : 0,
            tickSize: 4,
            legend: "Trimestre",
            legendPosition: "middle",
            legendOffset: selectedPeriod ? 32 : 52,
          }}
          axisLeft={{
            tickValues: [0, 20, 40, 60, 80, 100],
            format: (v) => `${v}%`,
            legend: "% Recuento",
            legendPosition: "middle",
            legendOffset: -38,
          }}
          enableLabel={false}
          enableTotals={false}
          onClick={(bar) => {
            onPeriodSelect(String(bar.indexValue));
          }}
          tooltip={({ id, value, data: barData }) => {
            const raw = (barData as Record<string, unknown>)[`_n_${String(id)}`] as number ?? 0;
            const total = (barData as Record<string, unknown>)["_total"] as number ?? 0;
            return (
              <div className="bg-theme-secondary border border-theme-primary rounded-lg px-3 py-2 text-xs text-theme-primary shadow-lg">
                <div className="font-semibold mb-1 text-gold">{String(barData.id)}</div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORES[String(id)] }} />
                  <span>{LABELS[String(id)] ?? String(id)}</span>
                </div>
                <div className="pl-3.5 text-[11px]">
                  <span className="font-bold text-gold">{raw.toLocaleString("es-CO")}</span>
                  <span className="text-theme-secondary ml-1.5">({value}%)</span>
                </div>
                <div className="pl-3.5 text-[10px] text-theme-muted mt-0.5">
                  Total periodo: {total.toLocaleString("es-CO")}
                </div>
                <div className="mt-1.5 pt-1 border-t border-theme-primary text-[9px] text-theme-muted">
                  Click para aislar este periodo
                </div>
              </div>
            );
          }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ValidacionesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [data, setData] = useState<ValidacionesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros — por defecto sin restricción de año
  const [fondo, setFondo] = useState("");
  const [prestador, setPrestador] = useState("");
  const [anioDesde, setAnioDesde] = useState<string>("");
  const [anioHasta, setAnioHasta] = useState<string>("");
  const [trimestre, setTrimestre] = useState<string>("");
  const [departamento, setDepartamento] = useState("");

  // Filtro de departamento compartido entre dashboards (Fase 3). Mapeo
  // nombre-normalizado <-> código DANE, mismo patrón ya usado en
  // Comunidades/FENOGE, para traducir entre el código que usa el contexto y
  // el nombre que usa el <SelectFiltro> local de esta página.
  const { codigoDaneDepartamento, setCodigoDaneDepartamento } = useGeoFilter();
  const [deptCodeByName, setDeptCodeByName] = useState<Record<string, string>>({});
  const [deptNameByCode, setDeptNameByCode] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDepartamentos()
      .then((data) => {
        const codeByName: Record<string, string> = {};
        const nameByCode: Record<string, string> = {};
        for (const d of data.departamentos) {
          const key = normDeptKey(d.nombre_departamento);
          codeByName[key] = d.codigo_dane_departamento;
          nameByCode[d.codigo_dane_departamento] = key;
        }
        setDeptCodeByName(codeByName);
        setDeptNameByCode(nameByCode);
      })
      .catch(() => {});
  }, []);

  // Selecciona/limpia el departamento localmente y sincroniza el código DANE
  // con el contexto compartido, para que otros dashboards que lo adopten
  // hereden la misma selección.
  function handleSelectDepartamento(depto: string) {
    setDepartamento(depto);
    if (!depto) {
      setCodigoDaneDepartamento(null);
      return;
    }
    const codigo = deptCodeByName[normDeptKey(depto)];
    if (codigo) setCodigoDaneDepartamento(codigo);
  }

  // Fecha de actualización: se inicializa vacío, pero en cuanto cargamos
  // las fechas disponibles se setea automáticamente a la más reciente.
  const [fechaActualizacion, setFechaActualizacion] = useState("");

  // Estado para aislar un periodo al hacer click en una barra
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Carga inicial: leer parámetros de URL (para capturas Playwright con filtros)
  // y obtener fechas disponibles para setear el default
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    if (sp.has("fondo"))             setFondo(sp.get("fondo")!);
    if (sp.has("prestador"))         setPrestador(sp.get("prestador")!);
    if (sp.has("anioDesde"))         setAnioDesde(sp.get("anioDesde")!);
    if (sp.has("anioHasta"))         setAnioHasta(sp.get("anioHasta")!);
    if (sp.has("trimestre"))         setTrimestre(sp.get("trimestre")!);
    if (sp.has("departamento"))      setDepartamento(sp.get("departamento")!);

    // Si fechaActualizacion viene en la URL, usarla directamente
    if (sp.has("fechaActualizacion")) {
      setFechaActualizacion(sp.get("fechaActualizacion")!);
      return;
    }

    // Sino, obtener fechas disponibles para setear la más reciente
    fetch("/api/subsidios/validaciones/?fechaActualizacion=1970-01")
      .then((r) => r.json())
      .then((d: ValidacionesData) => {
        const fechas = d.filtros.fechasActualizacion;
        if (fechas.length > 0 && !fechaActualizacion) {
          const ultima = fechas[0];
          setFechaActualizacion(`${ultima.anio}-${String(ultima.mes).padStart(2, "0")}`);
        }
      })
      .catch(() => {
        // Silencioso: se maneja en el useEffect principal
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sigue la selección de departamento del contexto compartido (ej. si se
  // eligió en Comunidades/FENOGE) siempre que no haya override explícito por
  // URL y exista una opción que coincida en el filtro de este tablero.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("departamento")) return;
    if (!codigoDaneDepartamento) return;
    const nombreNormalizado = deptNameByCode[codigoDaneDepartamento];
    if (!nombreNormalizado) return;
    const match = (data?.filtros.departamentos ?? []).find(
      (d) => normDeptKey(d) === nombreNormalizado
    );
    if (match) setDepartamento(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoDaneDepartamento, deptNameByCode, data?.filtros.departamentos]);

  // Petición principal de datos (solo cuando fechaActualizacion ya está definida)
  useEffect(() => {
    if (!fechaActualizacion) return;

    const params = new URLSearchParams();
    params.set("fechaActualizacion", fechaActualizacion);
    if (fondo)        params.set("fondo", fondo);
    if (prestador)    params.set("prestador", prestador);
    if (anioDesde)    params.set("anioDesde", anioDesde);
    if (anioHasta)    params.set("anioHasta", anioHasta);
    if (trimestre)    params.set("trimestre", trimestre);
    if (departamento) params.set("departamento", departamento);

    setLoading(true);
    setSelectedPeriod(null); // reset al cambiar filtros
    fetch(`/api/subsidios/validaciones/?${params}`)
      .then((r) => r.json())
      .then((d: ValidacionesData) => {
        setData(d);
        setError(null);
      })
      .catch(() => setError("No se pudo cargar el tablero de validaciones"))
      .finally(() => setLoading(false));
  }, [fondo, prestador, anioDesde, anioHasta, trimestre, departamento, fechaActualizacion]);

  const anioDesdeNum = anioDesde ? Number(anioDesde) : 0;      // 0 = sin límite inferior
  const anioHastaNum = anioHasta ? Number(anioHasta) : 9999;    // 9999 = sin límite superior
  const trimestreNum = trimestre ? Number(trimestre) : null;

  const sinData = useMemo(
    () => data ? buildChartData(data.serie, "SIN", anioDesdeNum, anioHastaNum, trimestreNum) : [],
    [data, anioDesdeNum, anioHastaNum, trimestreNum]
  );

  const zniData = useMemo(
    () => data ? buildChartData(data.serie, "ZNI", anioDesdeNum, anioHastaNum, trimestreNum) : [],
    [data, anioDesdeNum, anioHastaNum, trimestreNum]
  );

  // Toggle: mismo periodo = deseleccionar; distinto = seleccionar
  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod((prev) => (prev === period ? null : period));
  };

  // KPIs solo sobre estados válidos (excluye "a. Otros")
  const resumenValidos = useMemo(() => {
    if (!data) return { vf: 0, vp: 0, vi: 0, viSp: 0, total: 0 };
    const r = data.resumen;
    const vf   = r["e. VF"]    ?? 0;
    const vp   = r["d. VP"]    ?? 0;
    const vi   = r["b. VI"]    ?? 0;
    const viSp = r["c. VI SP"] ?? 0;
    return { vf, vp, vi, viSp, total: vf + vp + vi + viSp };
  }, [data]);

  const ultimaAct = data?.ultimaActualizacion
    ? new Date(data.ultimaActualizacion).toLocaleDateString("es-CO", {
        year: "numeric", month: "2-digit", day: "2-digit",
      })
    : "—";

  const esFiltroDefecto =
    !fondo &&
    !prestador &&
    !anioDesde &&
    !anioHasta &&
    !trimestre &&
    !departamento;

  return (
    <DashboardLayout title="Relación de Cuentas Subsidios"
      downloadTablero="validaciones"
      subtitle="Subsidios — Validaciones y controles"
      downloadParams={{
        fondo: fondo || '',
        prestador: prestador || '',
        anioDesde: anioDesde || '',
        anioHasta: anioHasta || '',
        trimestre: trimestre || '',
        departamento: departamento || '',
        fechaActualizacion: fechaActualizacion || '',
      }}>

      {/* KPIs */}
      <Card delay={0.05} className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-theme-muted uppercase tracking-wider">Última actualización</p>
            <p className="text-sm font-semibold text-gold">{ultimaAct}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <KpiChip label="VF — Validación Final"       value={loading ? "…" : resumenValidos.vf.toLocaleString("es-CO")}    color="var(--color-gold)" />
            <KpiChip label="VP — Validación Pendiente"   value={loading ? "…" : resumenValidos.vp.toLocaleString("es-CO")}    color="#F59E0B" />
            <KpiChip label="VI — Validación Inicial"     value={loading ? "…" : resumenValidos.vi.toLocaleString("es-CO")}    color="#B45309" />
            <KpiChip label="VI SP — Saldos Pendientes"   value={loading ? "…" : resumenValidos.viSp.toLocaleString("es-CO")}  color="#78350F" />
            <KpiChip label="Total cuentas (SIN + ZNI)"  value={loading ? "…" : resumenValidos.total.toLocaleString("es-CO")} />
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card delay={0.1} className="mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <SelectFiltro
            label="Fondo"
            value={fondo}
            onChange={setFondo}
            options={data?.filtros.fondos ?? []}
          />
          <SelectFiltro
            label="Año desde"
            value={anioDesde}
            onChange={setAnioDesde}
            options={(data?.filtros.anios ?? []).map(String)}
          />
          <SelectFiltro
            label="Año hasta"
            value={anioHasta}
            onChange={setAnioHasta}
            options={(data?.filtros.anios ?? []).map(String)}
          />
          <SelectFiltro
            label="Trimestre"
            value={trimestre}
            onChange={setTrimestre}
            options={data?.filtros.trimestres ?? []}
          />
          <SelectFiltro
            label="Departamento"
            value={departamento}
            onChange={handleSelectDepartamento}
            options={data?.filtros.departamentos ?? []}
            minWidth="200px"
          />
          <SelectFiltro
            label="Nombre del Prestador"
            value={prestador}
            onChange={setPrestador}
            options={data?.filtros.prestadores ?? []}
            minWidth="260px"
          />
          <SelectFechaActualizacion
            label="Fecha de actualización"
            value={fechaActualizacion}
            onChange={setFechaActualizacion}
            fechas={data?.filtros.fechasActualizacion ?? []}
            minWidth="200px"
          />
          {!esFiltroDefecto && (
            <button
              onClick={() => {
                setFondo("");
                setPrestador("");
                setAnioDesde("");
                setAnioHasta("");
                setTrimestre("");
                handleSelectDepartamento("");
                // fechaActualizacion NO se resetea — siempre debe tener un valor
              }}
              className="text-[10px] text-gold hover:text-gold underline underline-offset-2 self-end pb-1.5"
            >
              Restaurar vista por defecto
            </button>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Indicador de periodo seleccionado */}
      {selectedPeriod && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-xs text-gold">Mostrando periodo: <strong>{selectedPeriod}</strong></span>
          <button
            onClick={() => setSelectedPeriod(null)}
            className="text-[10px] text-gold/70 hover:text-gold underline underline-offset-2"
          >
            Ver todos los periodos
          </button>
        </div>
      )}

      {/* Gráficos SIN y ZNI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card delay={0.15} className={loading ? "opacity-60 animate-pulse" : ""}>
          <ValidacionBar
            data={sinData}
            title="SIN — Sistema Interconectado Nacional"
            isDark={isDark}
            selectedPeriod={selectedPeriod}
            onPeriodSelect={handlePeriodSelect}
          />
        </Card>
        <Card delay={0.2} className={loading ? "opacity-60 animate-pulse" : ""}>
          <ValidacionBar
            data={zniData}
            title="ZNI — Zonas No Interconectadas"
            isDark={isDark}
            selectedPeriod={selectedPeriod}
            onPeriodSelect={handlePeriodSelect}
          />
        </Card>
      </div>

      {/* Leyenda inferior */}
      <Card delay={0.25}>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {ESTADOS_VALIDOS.slice().reverse().map((estado) => (
            <div key={estado} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORES[estado] }} />
              <span className="text-xs text-theme-muted">{LABELS[estado]}</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-[10px] text-theme-muted mt-8">
        Ministerio de Minas y Energía · Dirección de Energía Eléctrica · 2026
      </p>
    </DashboardLayout>
  );
}
