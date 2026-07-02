"use client";

import { useEffect, useState } from "react";
import { formatCOP, formatNumber } from "@/lib/format";

interface Filters {
  programa: string[];
  departamento: string[];
  mes: string[];
  tipo: string[];
  contratista: string[];
}

interface Row {
  n: string;
  departamento: string;
  municipio: string;
  valor: string;
  n_ce: string;
  usuarios: string;
  potencia_mwp: string;
  or_generador: string;
  tipo_de_proyecto: string;
  zona: string;
}

interface Totals {
  total_valor: string;
  total_n_ce: string;
  total_usuarios: string;
  total_potencia_mwp: string;
}

const OR_COLORS: Record<string, string> = {
  ELECTROCAQUETA: "#3B82F6",
  GENSA: "#E8A838",
  DISPAC: "#8B5CF6",
  ENAM: "#EC4899",
};

const COLS = [
  { key: "n", label: "Nº", w: 50 },
  { key: "departamento", label: "Departamento", w: 130 },
  { key: "municipio", label: "Municipio", w: 200 },
  { key: "valor", label: "Valor", w: 150 },
  { key: "n_ce", label: "Nº CE", w: 80 },
  { key: "usuarios", label: "Usuarios", w: 90 },
  { key: "potencia_mwp", label: "Potencia (mWp)", w: 120 },
  { key: "or_generador", label: "OR / Generador", w: 160 },
  { key: "tipo_de_proyecto", label: "Tipo", w: 130 },
  { key: "zona", label: "Zona", w: 70 },
];

export default function TablaORInicial({ filters }: { filters: Filters }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => { setPage(1); }, [filters.departamento]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    filters.departamento.forEach((v) => params.append("departamento", v));

    fetch(`/api/tabla-or-inicial?${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((r) => { setRows(r.data ?? []); setTotal(r.total ?? 0); setTotals(r.totals ?? null); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [page, filters.departamento]);

  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="error-box flex items-center justify-between">
        <span>Error cargando tabla OR: {error}</span>
        <button onClick={() => setPage(1)} className="text-gold hover:text-gold font-semibold text-sm underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-theme-muted font-medium">{loading ? "Cargando…" : `${formatNumber(total)} registros`}</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${page === 1 ? "bg-white/5 text-theme-muted cursor-default" : "bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20"}`}>← Anterior</button>
            <span className="text-xs text-theme-muted font-mono">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${page === totalPages ? "bg-white/5 text-theme-muted cursor-default" : "bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20"}`}>Siguiente →</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-theme-primary">
        <table className="w-full text-xs" style={{ tableLayout: "fixed", minWidth: 1180 }}>
          <colgroup>
            {COLS.map((c) => <col key={c.key} style={{ width: c.w }} />)}
          </colgroup>
          <thead className="sticky top-0 bg-theme-secondary z-10">
            <tr className="border-b border-theme-card">
              {COLS.map((h) => (
                <th key={h.key} className="text-left px-3 text-theme-muted font-semibold" style={{ paddingTop: 14, paddingBottom: 14 }}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {COLS.map((__, j) => (
                    <td key={j} className="px-3" style={{ paddingTop: 14, paddingBottom: 14 }}>
                      <div className="animate-pulse rounded bg-white/[0.04] h-3 w-4/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={COLS.length} className="py-10 text-center text-theme-muted">No hay registros</td></tr>
            ) : (
              (rows ?? []).map((row, i) => (
                <tr key={i} className="border-b border-theme-card/50 hover:bg-theme-primary/30 transition-colors">
                  <td className="px-3 text-theme-secondary tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{row.n}</td>
                  <td className="px-3 text-theme-secondary" style={{ paddingTop: 14, paddingBottom: 14 }} title={row.departamento}>{row.departamento}</td>
                  <td className="px-3 text-theme-secondary" style={{ paddingTop: 14, paddingBottom: 14 }} title={row.municipio}>{row.municipio}</td>
                  <td className="px-3 text-gold font-semibold tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{row.valor ? formatCOP(Number(row.valor)) : "—"}</td>
                  <td className="px-3 text-right text-theme-secondary tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{formatNumber(Number(row.n_ce))}</td>
                  <td className="px-3 text-right text-theme-secondary tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{formatNumber(Number(row.usuarios))}</td>
                  <td className="px-3 text-right text-emerald-400 tabular-nums font-medium" style={{ paddingTop: 14, paddingBottom: 14 }}>{Number(row.potencia_mwp).toFixed(2)}</td>
                  <td className="px-3" style={{ paddingTop: 14, paddingBottom: 14 }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: OR_COLORS[row.or_generador] ?? "#60A5FA" }} />
                      <span className="text-theme-primary font-medium">{row.or_generador}</span>
                    </div>
                  </td>
                  <td className="px-3" style={{ paddingTop: 14, paddingBottom: 14 }}>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[0.7rem] font-semibold bg-dash-chip text-theme-secondary border border-theme-primary">{row.tipo_de_proyecto}</span>
                  </td>
                  <td className="px-3 text-theme-secondary" style={{ paddingTop: 14, paddingBottom: 14 }}>{row.zona}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && rows.length > 0 && totals && (
            <tfoot>
              <tr className="bg-amber-500/[0.06] border-t border-amber-500/20">
                <td colSpan={3} className="px-3 text-gold font-bold text-[10px] uppercase tracking-wider" style={{ paddingTop: 14, paddingBottom: 14 }}>TOTAL</td>
                <td className="px-3 text-gold font-bold tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{formatCOP(Number(totals.total_valor))}</td>
                <td className="px-3 text-right text-theme-primary font-bold tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{formatNumber(Number(totals.total_n_ce))}</td>
                <td className="px-3 text-right text-theme-primary font-bold tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{formatNumber(Number(totals.total_usuarios))}</td>
                <td className="px-3 text-right text-emerald-400 font-bold tabular-nums" style={{ paddingTop: 14, paddingBottom: 14 }}>{Number(totals.total_potencia_mwp).toFixed(2)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
