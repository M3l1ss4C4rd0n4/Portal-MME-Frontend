"use client";

import { useEffect, useState } from "react";
import { formatCOP, formatNumber } from "@/lib/format";
import * as XLSX from "xlsx";


interface Filters {
  programa: string[];
  departamento: string[];
  mes: string[];
  tipo: string[];
  contratista: string[];
}

interface Row {
  programa: string;
  contratista: string;
  departamento: string;
  municipio: string;
  tipo_solucion: string;
  inversion: string;
  mes: string;
  planeado_usuarios: string;
  ejecutado_usuarios: string;
  kwp_planeado: string;
  kwp_ejecutado: string;
}

interface Totals {
  planeado_usuarios: string;
  ejecutado_usuarios: string;
  kwp_planeado: string;
  kwp_ejecutado: string;
  inversion: string;
}

const PROGRAM_DOT: Record<string, string> = {
  "Colombia Solar": "#3B82F6",
  "Comunidades Energéticas OR": "#E8A838",
  "Fenoge 1.0 y 1.1": "#8B5CF6",
  "IPSE": "#EC4899",
};

function MiniBar({ value, max, color = "#E8A838" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-theme-tertiary rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function TablaDetalle({ filters }: { filters: Filters }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const limit = 20;

  useEffect(() => { setPage(1); }, [filters.programa, filters.departamento, filters.mes, filters.tipo, filters.contratista]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    filters.programa.forEach((v) => params.append("programa", v));
    filters.departamento.forEach((v) => params.append("departamento", v));
    filters.mes.forEach((v) => params.append("mes", v));
    filters.tipo.forEach((v) => params.append("tipo", v));
    filters.contratista.forEach((v) => params.append("contratista", v));

    fetch(`/api/tabla?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((r) => { setRows(r.data ?? []); setTotal(r.total ?? 0); setTotals(r.totals ?? null); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [page, filters.programa, filters.departamento, filters.mes, filters.tipo, filters.contratista]);

  const totalPages = Math.ceil(total / limit);
  const maxPlan = Math.max(...(rows ?? []).map((r) => Number(r.planeado_usuarios) || 0), 1);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "10000" });
      filters.programa.forEach((v) => params.append("programa", v));
      filters.departamento.forEach((v) => params.append("departamento", v));
      filters.mes.forEach((v) => params.append("mes", v));
      filters.tipo.forEach((v) => params.append("tipo", v));
      filters.contratista.forEach((v) => params.append("contratista", v));

      const res = await fetch(`/api/tabla?${params}`);
      if (!res.ok) throw new Error("Error al obtener datos");
      const json = await res.json();
      const data: Row[] = json.data ?? [];
      const totals: Totals = json.totals;

      const exportRows = data.map((r) => ({
        Programa: r.programa,
        Contratista: r.contratista,
        Departamento: r.departamento,
        Municipio: r.municipio,
        "Tipo de Solución": r.tipo_solucion,
        Inversión: Number(r.inversion),
        Mes: r.mes,
        "Planeado (usuarios)": Number(r.planeado_usuarios),
        "Ejecutado (usuarios)": Number(r.ejecutado_usuarios),
        "kWp Planeado": Number(r.kwp_planeado),
        "kWp Ejecutado": Number(r.kwp_ejecutado),
      }));

      if (totals) {
        exportRows.push({
          Programa: "TOTAL",
          Contratista: "",
          Departamento: "",
          Municipio: "",
          "Tipo de Solución": "",
          Inversión: Number(totals.inversion),
          Mes: "",
          "Planeado (usuarios)": Number(totals.planeado_usuarios),
          "Ejecutado (usuarios)": Number(totals.ejecutado_usuarios),
          "kWp Planeado": Number(totals.kwp_planeado),
          "kWp Ejecutado": Number(totals.kwp_ejecutado),
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Datos");
      XLSX.writeFile(wb, `Colombia_Solar_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      alert("Error exportando: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="error-box flex items-center justify-between">
        <span>Error cargando tabla: {error}</span>
        <button onClick={() => setPage(1)} className="text-gold hover:text-gold font-semibold text-sm underline">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <p className="text-xs text-theme-muted font-medium">
            {loading ? "Cargando…" : `${formatNumber(total)} registros`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exportando…" : "Exportar Excel"}
          </button>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  page === 1
                    ? "bg-white/5 text-theme-muted cursor-default"
                    : "bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20"
                }`}
              >
                ← Anterior
              </button>
              <span className="text-xs text-theme-muted font-mono">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  page === totalPages
                    ? "bg-white/5 text-theme-muted cursor-default"
                    : "bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20"
                }`}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-theme-primary">
        <table className="w-full text-xs" style={{ tableLayout: "fixed", minWidth: 1240 }}>
          <colgroup>
            <col style={{ width: 150 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
          </colgroup>
          <thead className="sticky top-0 bg-theme-secondary z-10">
            <tr className="border-b border-theme-card">
              {["Programa", "Contratista", "Departamento", "Municipio", "Tipo", "Inversión", "Mes", "Plan. Usuarios", "Ejec. Usuarios", "kWp Plan.", "kWp Ejec."].map((h) => (
                <th key={h} className="text-left px-3 text-theme-muted font-semibold" style={{paddingTop: 14, paddingBottom: 14}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <td key={j} className="px-3" style={{paddingTop: 14, paddingBottom: 14}}>
                      <div className="animate-pulse rounded bg-white/[0.04] h-3 w-4/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-theme-muted">
                  No hay registros para los filtros seleccionados
                </td>
              </tr>
            ) : (
              (rows ?? []).map((row, i) => {
                const plan = Number(row.planeado_usuarios) || 0;
                const exec = Number(row.ejecutado_usuarios) || 0;
                return (
                  <tr key={i} className="border-b border-theme-card/50 hover:bg-theme-primary/30 transition-colors">
                    <td className="px-3" style={{paddingTop: 14, paddingBottom: 14}}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PROGRAM_DOT[row.programa] ?? "#60A5FA" }} />
                        <span className="text-theme-primary font-medium">{row.programa}</span>
                      </div>
                    </td>
                    <td className="px-3 text-theme-secondary" style={{paddingTop: 14, paddingBottom: 14}} title={row.contratista}>{row.contratista}</td>
                    <td className="px-3 text-theme-secondary" style={{paddingTop: 14, paddingBottom: 14}}>{row.departamento}</td>
                    <td className="px-3 text-theme-secondary" style={{paddingTop: 14, paddingBottom: 14}} title={row.municipio}>{row.municipio}</td>
                    <td className="px-3" style={{paddingTop: 14, paddingBottom: 14}}>
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[0.7rem] font-semibold bg-dash-chip text-theme-secondary border border-theme-primary">{row.tipo_solucion}</span>
                    </td>
                    <td className="px-3 text-gold font-semibold tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{row.inversion ? formatCOP(Number(row.inversion)) : "—"}</td>
                    <td className="px-3 text-theme-secondary" style={{paddingTop: 14, paddingBottom: 14}}>{row.mes}</td>
                    <td className="px-3 text-right" style={{paddingTop: 14, paddingBottom: 14}}>
                      <div className="text-gold font-bold tabular-nums">{formatNumber(plan)}</div>
                      <MiniBar value={plan} max={maxPlan} color="var(--color-gold)" />
                    </td>
                    <td className="px-3 text-right" style={{paddingTop: 14, paddingBottom: 14}}>
                      <div className={`font-bold tabular-nums ${exec > 0 ? "text-emerald-400" : "text-theme-muted"}`}>{formatNumber(exec)}</div>
                      <MiniBar value={exec} max={maxPlan} color={exec > 0 ? "#10B981" : "#64748B"} />
                    </td>
                    <td className="px-3 text-right text-theme-secondary tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{Number(row.kwp_planeado).toFixed(1)}</td>
                    <td className="px-3 text-right text-emerald-400 tabular-nums font-medium" style={{paddingTop: 14, paddingBottom: 14}}>{Number(row.kwp_ejecutado).toFixed(1)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && rows.length > 0 && totals && (
            <tfoot>
              <tr className="bg-amber-500/[0.06] border-t border-amber-500/20">
                <td colSpan={5} className="px-3 text-gold font-bold text-[10px] uppercase tracking-wider" style={{paddingTop: 14, paddingBottom: 14}}>TOTAL</td>
                <td className="px-3 text-gold font-bold tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{formatCOP(Number(totals.inversion))}</td>
                <td className="px-3" style={{paddingTop: 14, paddingBottom: 14}} />
                <td className="px-3 text-right text-gold font-bold tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{formatNumber(Number(totals.planeado_usuarios))}</td>
                <td className="px-3 text-right text-emerald-400 font-bold tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{formatNumber(Number(totals.ejecutado_usuarios))}</td>
                <td className="px-3 text-right text-theme-primary font-bold tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{Number(totals.kwp_planeado).toFixed(1)}</td>
                <td className="px-3 text-right text-emerald-400 font-bold tabular-nums" style={{paddingTop: 14, paddingBottom: 14}}>{Number(totals.kwp_ejecutado).toFixed(1)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
