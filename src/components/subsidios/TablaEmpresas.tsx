"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fmtCOP, fmtNum, formatPct } from "@/lib/format";
import type { EmpresaDetalle } from "@/types/subsidios-empresas";

type ColKey = keyof Pick<
  EmpresaDetalle,
  | "nombre" | "departamento" | "fondo" | "area"
  | "vf" | "vp" | "vi" | "viSp" | "otros" | "totalValidaciones"
  | "pagos" | "valorResolucion" | "valorPagado" | "saldoPendiente" | "pctEjecucion"
>;

interface Columna {
  key: ColKey;
  label: string;
  tipo: "texto" | "entero" | "dinero" | "pct";
  /** Título del grupo de cabecera, para separar validaciones de pagos. */
  grupo?: "validacion" | "pago";
}

const COLUMNAS: Columna[] = [
  { key: "nombre", label: "Empresa", tipo: "texto" },
  { key: "departamento", label: "Departamento", tipo: "texto" },
  { key: "fondo", label: "Fondo", tipo: "texto" },
  { key: "area", label: "Área", tipo: "texto" },
  { key: "vf", label: "VF", tipo: "entero", grupo: "validacion" },
  { key: "vp", label: "VP", tipo: "entero", grupo: "validacion" },
  { key: "vi", label: "VI", tipo: "entero", grupo: "validacion" },
  { key: "viSp", label: "VI SP", tipo: "entero", grupo: "validacion" },
  { key: "otros", label: "Otros", tipo: "entero", grupo: "validacion" },
  { key: "pagos", label: "Resoluciones", tipo: "entero", grupo: "pago" },
  { key: "valorResolucion", label: "Valor asignado", tipo: "dinero", grupo: "pago" },
  { key: "valorPagado", label: "Valor pagado", tipo: "dinero", grupo: "pago" },
  { key: "saldoPendiente", label: "Saldo pendiente", tipo: "dinero", grupo: "pago" },
  { key: "pctEjecucion", label: "% ejecución", tipo: "pct", grupo: "pago" },
];

function formatear(valor: EmpresaDetalle[ColKey], tipo: Columna["tipo"]): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (tipo === "texto") return String(valor);
  if (tipo === "dinero") return fmtCOP(Number(valor));
  if (tipo === "pct") return formatPct(Number(valor), 1);
  return fmtNum(Number(valor));
}

export default function TablaEmpresas({
  empresas,
  loading,
}: {
  empresas: EmpresaDetalle[];
  loading: boolean;
}) {
  const [orden, setOrden] = useState<{ col: ColKey; desc: boolean }>({
    col: "valorPagado",
    desc: true,
  });

  const ordenadas = useMemo(() => {
    // Copia: ordenar in situ mutaría el arreglo que viene del estado.
    return [...empresas].sort((a, b) => {
      const va = a[orden.col];
      const vb = b[orden.col];
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""), "es");
      }
      return orden.desc ? -cmp : cmp;
    });
  }, [empresas, orden]);

  const totales = useMemo(() => {
    return empresas.reduce(
      (acc, e) => ({
        vf: acc.vf + e.vf,
        vp: acc.vp + e.vp,
        vi: acc.vi + e.vi,
        viSp: acc.viSp + e.viSp,
        otros: acc.otros + e.otros,
        valorResolucion: acc.valorResolucion + e.valorResolucion,
        valorPagado: acc.valorPagado + e.valorPagado,
        saldoPendiente: acc.saldoPendiente + e.saldoPendiente,
      }),
      { vf: 0, vp: 0, vi: 0, viSp: 0, otros: 0, valorResolucion: 0, valorPagado: 0, saldoPendiente: 0 }
    );
  }, [empresas]);

  const alternarOrden = (col: ColKey) => {
    setOrden((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: true }));
  };

  const exportar = () => {
    const filas = ordenadas.map((e) => ({
      Empresa: e.nombre,
      NIT: e.nit ?? "",
      Departamento: e.departamento,
      Fondo: e.fondo ?? "",
      "Área": e.area ?? "",
      VF: e.vf, VP: e.vp, VI: e.vi, "VI SP": e.viSp, Otros: e.otros,
      "Total validaciones": e.totalValidaciones,
      Resoluciones: e.pagos,
      "Valor asignado": e.valorResolucion,
      "Valor pagado": e.valorPagado,
      "Saldo pendiente": e.saldoPendiente,
      "% ejecución": Number(e.pctEjecucion.toFixed(2)),
    }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), "Detalle empresas");
    XLSX.writeFile(libro, `detalle-empresas-subsidios.xlsx`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-theme-tertiary/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <p className="text-sm text-theme-muted py-8 text-center">
        Ninguna empresa coincide con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-theme-muted">
          {fmtNum(empresas.length)} empresa{empresas.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={exportar}
          className="text-xs text-theme-secondary hover:text-gold border border-theme-card rounded px-3 py-1.5 transition-colors"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="overflow-auto max-h-[520px] rounded-lg border border-theme-card">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-theme-secondary">
            <tr>
              {COLUMNAS.map((c) => {
                const activa = orden.col === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => alternarOrden(c.key)}
                    scope="col"
                    aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                    className={`px-3 py-2 whitespace-nowrap cursor-pointer select-none border-b border-theme-card transition-colors hover:text-gold ${
                      c.tipo === "texto" ? "text-left" : "text-right"
                    } ${activa ? "text-gold" : "text-theme-secondary"} ${
                      c.grupo === "validacion" ? "bg-sky-500/5" : c.grupo === "pago" ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    {c.label}
                    <span className="ml-1 text-[9px]">{activa ? (orden.desc ? "▼" : "▲") : "⇅"}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((e) => (
              <tr key={e.key} className="hover:bg-theme-hover border-b border-theme-secondary/40">
                {COLUMNAS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 whitespace-nowrap ${
                      c.tipo === "texto" ? "text-left text-theme-primary" : "text-right tabular-nums text-theme-secondary"
                    } ${c.key === "nombre" ? "max-w-[320px] truncate" : ""}`}
                    title={c.key === "nombre" ? e.nombre : undefined}
                  >
                    {formatear(e[c.key], c.tipo)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-theme-secondary">
            <tr className="border-t border-theme-card font-semibold text-theme-primary">
              <td className="px-3 py-2">Total</td>
              <td colSpan={3} />
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(totales.vf)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(totales.vp)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(totales.vi)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(totales.viSp)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(totales.otros)}</td>
              {/* Las resoluciones no se suman: una misma paga a varias empresas. */}
              <td className="px-3 py-2 text-right text-theme-muted" title="Una resolución puede pagar a varias empresas, así que la suma por fila no es el total de resoluciones">—</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCOP(totales.valorResolucion)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCOP(totales.valorPagado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCOP(totales.saldoPendiente)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatPct(
                  totales.valorResolucion > 0 ? (totales.valorPagado / totales.valorResolucion) * 100 : 0,
                  1
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
