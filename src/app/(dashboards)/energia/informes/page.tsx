"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FileText, Download, ChevronLeft, ChevronRight, AlertTriangle, CalendarDays, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ItemBoletin {
  nombre: string;
  fecha: string;
  driveId: string;
  itemId: string;
  tamano: number;
}

interface ItemXM {
  nombre: string;
  fecha: string;
  tipo: string | null;
  tipoLabel: string | null;
  driveId: string;
  itemId: string;
  tamano: number;
}

interface ListaResponse<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
}

type TabKey = "boletines" | "xm";
type TipoXM = "Todos" | "SeguimientoDespacho" | "VariablesOperativas" | "VariablesHidrologicas";

interface FechaRango {
  desde: string;
  hasta: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(s: string): string {
  if (!s) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  }
  return s;
}

function fmtTamano(bytes: number): string {
  if (!bytes) return "—";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function buildDescargarUrl(driveId: string, itemId: string): string {
  return `/api/informes/archivo?driveId=${encodeURIComponent(driveId)}&itemId=${encodeURIComponent(itemId)}`;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useLista<T>(url: string) {
  const [data, setData] = useState<ListaResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error || `Error ${res.status}`);
      setData(json as ListaResponse<T>);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error };
}

// ─── UI atoms ────────────────────────────────────────────────────────────────

function SkeletonRows({ cols, count = 5 }: { cols: number; count?: number }) {
  const widths = ["w-24", "w-48", "w-16", "w-20", "w-20"];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-theme-card animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3 px-4">
              <div className={`h-4 bg-dash-chip rounded ${widths[j] ?? "w-20"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TipoBadge({ tipo, label }: { tipo: string | null; label: string | null }) {
  const colors: Record<string, string> = {
    SeguimientoDespacho: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    VariablesOperativas: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    VariablesHidrologicas: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  };
  if (!tipo) return <span className="text-theme-muted text-xs">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs border font-medium ${colors[tipo] ?? "bg-dash-chip text-theme-muted border-theme-card"}`}>
      {label ?? tipo}
    </span>
  );
}

function BtnDescargar({ nombre, href }: { nombre: string; href: string }) {
  return (
    <a
      href={href}
      download
      aria-label={`Descargar ${nombre}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-gold border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
    >
      <Download className="w-3.5 h-3.5" />
      Descargar PDF
    </a>
  );
}

function Paginacion({ pagina, total, limite, onChange }: {
  pagina: number; total: number; limite: number; onChange: (p: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-theme-muted">
      <button
        onClick={() => onChange(pagina - 1)}
        disabled={pagina <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-card hover:border-amber-500/30 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" /> Anterior
      </button>
      <span>Página {pagina} de {totalPaginas} · {total} archivos</span>
      <button
        onClick={() => onChange(pagina + 1)}
        disabled={pagina >= totalPaginas}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-card hover:border-amber-500/30 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Siguiente <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-400 py-4">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {msg}
    </div>
  );
}

function FiltroFechas({
  rango,
  onChange,
  onLimpiar,
}: {
  rango: FechaRango;
  onChange: (r: FechaRango) => void;
  onLimpiar: () => void;
}) {
  const hayFiltro = rango.desde || rango.hasta;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <CalendarDays className="w-4 h-4 text-theme-muted flex-shrink-0" />
      <label className="text-xs text-theme-muted">Desde</label>
      <input
        type="date"
        value={rango.desde}
        onChange={(e) => onChange({ ...rango, desde: e.target.value })}
        className="bg-dash-chip border border-theme-card text-theme-primary text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50 cursor-pointer [color-scheme:dark]"
      />
      <label className="text-xs text-theme-muted">Hasta</label>
      <input
        type="date"
        value={rango.hasta}
        onChange={(e) => onChange({ ...rango, hasta: e.target.value })}
        className="bg-dash-chip border border-theme-card text-theme-primary text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50 cursor-pointer [color-scheme:dark]"
      />
      {hayFiltro && (
        <button
          onClick={onLimpiar}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-theme-muted hover:text-gold border border-theme-card hover:border-amber-500/30 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" /> Limpiar
        </button>
      )}
    </div>
  );
}

// ─── Tab Boletines ────────────────────────────────────────────────────────────

const LIMITE = 30;

const FECHA_VACIA: FechaRango = { desde: "", hasta: "" };

function buildFechaParams(rango: FechaRango): string {
  const parts = [
    rango.desde ? `fechaDesde=${rango.desde}` : "",
    rango.hasta ? `fechaHasta=${rango.hasta}` : "",
  ].filter(Boolean);
  return parts.length ? `&${parts.join("&")}` : "";
}

function TabBoletines() {
  const [pagina, setPagina] = useState(1);
  const [rango, setRango] = useState<FechaRango>(FECHA_VACIA);

  const { data, loading, error } = useLista<ItemBoletin>(
    `/api/informes/boletines/lista?pagina=${pagina}&limite=${LIMITE}${buildFechaParams(rango)}`,
  );

  const handleRango = (r: FechaRango) => { setRango(r); setPagina(1); };
  const limpiar = () => { setRango(FECHA_VACIA); setPagina(1); };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <p className="text-sm text-theme-muted">Boletines energéticos publicados por el Ministerio.</p>
        <a
          href="/api/informe-diario"
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-gold border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" /> Descargar más reciente
        </a>
      </div>
      <FiltroFechas rango={rango} onChange={handleRango} onLimpiar={limpiar} />

      {error && <ErrorMsg msg={error} />}

      <div className="rounded-xl border border-theme-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dash-chip text-theme-muted text-xs uppercase tracking-wide">
              <th className="text-left py-2.5 px-4">Fecha</th>
              <th className="text-left py-2.5 px-4">Nombre</th>
              <th className="text-left py-2.5 px-4 hidden sm:table-cell">Tamaño</th>
              <th className="py-2.5 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={4} />
            ) : (data?.items ?? []).length === 0 && !error ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-theme-muted">No se encontraron boletines.</td>
              </tr>
            ) : (
              (data?.items ?? []).map((item) => (
                <tr key={item.itemId} className="border-b border-theme-card last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-theme-secondary whitespace-nowrap">{fmtFecha(item.fecha)}</td>
                  <td className="py-3 px-4 text-theme-primary max-w-xs">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="truncate" title={item.nombre}>{item.nombre}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-theme-muted hidden sm:table-cell">{fmtTamano(item.tamano)}</td>
                  <td className="py-3 px-4 text-right">
                    <BtnDescargar nombre={item.nombre} href={buildDescargarUrl(item.driveId, item.itemId)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && <Paginacion pagina={pagina} total={data.total} limite={LIMITE} onChange={setPagina} />}
    </div>
  );
}

// ─── Tab XM ──────────────────────────────────────────────────────────────────

const TIPO_CHIPS: { key: TipoXM; label: string }[] = [
  { key: "Todos", label: "Todos" },
  { key: "SeguimientoDespacho", label: "Seguimiento despacho" },
  { key: "VariablesOperativas", label: "Variables operativas" },
  { key: "VariablesHidrologicas", label: "Variables hidrológicas" },
];

function TabXM() {
  const [pagina, setPagina] = useState(1);
  const [tipoFiltro, setTipoFiltro] = useState<TipoXM>("Todos");
  const [rango, setRango] = useState<FechaRango>(FECHA_VACIA);

  const tipoParam = tipoFiltro === "Todos" ? "" : `&tipo=${tipoFiltro}`;
  const { data, loading, error } = useLista<ItemXM>(
    `/api/informes/xm/lista?pagina=${pagina}&limite=${LIMITE}${tipoParam}${buildFechaParams(rango)}`,
  );

  const handleTipo = (t: TipoXM) => { setTipoFiltro(t); setPagina(1); };
  const handleRango = (r: FechaRango) => { setRango(r); setPagina(1); };
  const limpiar = () => { setRango(FECHA_VACIA); setPagina(1); };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <p className="text-sm text-theme-muted">Informes diarios de XM: seguimiento al despacho, variables operativas e hidrológicas.</p>
        <a
          href="/api/informes-diarios"
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-gold border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" /> Descargar pack del día
        </a>
      </div>

      <FiltroFechas rango={rango} onChange={handleRango} onLimpiar={limpiar} />

      <div className="flex flex-wrap gap-2 mb-4">
        {TIPO_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => handleTipo(chip.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              tipoFiltro === chip.key
                ? "bg-amber-500/15 text-gold border-amber-500/40"
                : "bg-theme-secondary text-theme-secondary border-theme-card hover:border-amber-500/30 hover:text-theme-primary"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error && <ErrorMsg msg={error} />}

      <div className="rounded-xl border border-theme-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dash-chip text-theme-muted text-xs uppercase tracking-wide">
              <th className="text-left py-2.5 px-4">Fecha</th>
              <th className="text-left py-2.5 px-4 hidden md:table-cell">Tipo</th>
              <th className="text-left py-2.5 px-4">Nombre</th>
              <th className="text-left py-2.5 px-4 hidden sm:table-cell">Tamaño</th>
              <th className="py-2.5 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={5} count={6} />
            ) : (data?.items ?? []).length === 0 && !error ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-theme-muted">No se encontraron informes para el filtro seleccionado.</td>
              </tr>
            ) : (
              (data?.items ?? []).map((item) => (
                <tr key={item.itemId} className="border-b border-theme-card last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-theme-secondary whitespace-nowrap">{fmtFecha(item.fecha)}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <TipoBadge tipo={item.tipo} label={item.tipoLabel} />
                  </td>
                  <td className="py-3 px-4 text-theme-primary max-w-xs">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="truncate" title={item.nombre}>{item.nombre}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-theme-muted hidden sm:table-cell">{fmtTamano(item.tamano)}</td>
                  <td className="py-3 px-4 text-right">
                    <BtnDescargar nombre={item.nombre} href={buildDescargarUrl(item.driveId, item.itemId)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && <Paginacion pagina={pagina} total={data.total} limite={LIMITE} onChange={setPagina} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const MAIN_TABS: { key: TabKey; label: string }[] = [
  { key: "boletines", label: "Boletines Energéticos" },
  { key: "xm", label: "Informes XM (diarios)" },
];

export default function InformesEnergeticosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("boletines");

  return (
    <DashboardLayout
      title="Informes energéticos"
      subtitle="Repositorio de informes del sector eléctrico colombiano. Descargue boletines y reportes diarios de XM."
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {MAIN_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                active
                  ? "bg-amber-500/15 text-gold border-amber-500/40"
                  : "bg-theme-secondary text-theme-secondary border-theme-card hover:border-amber-500/30 hover:text-theme-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-theme-secondary border border-theme-card rounded-2xl p-5 hover:border-amber-500/30 transition-colors"
      >
        {activeTab === "boletines" ? <TabBoletines /> : <TabXM />}
      </motion.div>

      <p className="mt-5 text-xs text-theme-muted/70">
        Archivos publicados por XM y el Ministerio de Minas y Energía. Para validación oficial descargue el documento original.
      </p>
    </DashboardLayout>
  );
}
