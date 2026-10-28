"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fmtCOP, fmtNum, formatPct } from "@/lib/format";
import { etiquetaEstado } from "@/lib/subsidios-sql";
import { SIN_VALIDACION } from "@/lib/subsidios-resumen-sql";
import type { FilaResumen, FilaDetalleEmpresa } from "@/types/subsidios-empresas";

type ColKey =
  | "anio" | "trimestre" | "fondo" | "estado"
  | "empresas" | "validaciones" | "resoluciones"
  | "valorResolucion" | "valorPagado" | "saldoPendiente" | "pctEjecucion";

interface Columna {
  key: ColKey;
  label: string;
  tipo: "texto" | "entero" | "dinero" | "pct";
  /** Título del grupo de cabecera, para separar validaciones de pagos. */
  grupo?: "validacion" | "pago";
  /** Qué significa la columna, al pasar el cursor por el encabezado. */
  ayuda?: string;
}

/*
 * Las etiquetas son las del área, no las de la base. `valor_resolucion` y
 * `saldo_pendiente` son nombres de columna de `subsidios_pagos` y no tienen por
 * qué asomar en pantalla; «Cuentas» es la palabra que ya usa el tablero de
 * Relación de Cuentas para lo mismo.
 */
const COLUMNAS: Columna[] = [
  { key: "anio", label: "Año", tipo: "texto" },
  { key: "trimestre", label: "Trimestre", tipo: "texto" },
  {
    key: "fondo", label: "Fondo", tipo: "texto",
    ayuda: "FOES: Fondo de Energía Social. FSSRI: Fondo de Solidaridad para Subsidios y Redistribución de Ingresos.",
  },
  {
    key: "estado", label: "Estado de validación", tipo: "texto", grupo: "validacion",
    ayuda: "Etapa en que el área dejó esa cuenta. «Sin validación» no es un estado de la fuente: son los pagos del período que no cruzan con ninguna cuenta del corte.",
  },
  {
    key: "empresas", label: "Empresas", tipo: "entero", grupo: "validacion",
    ayuda: "Empresas distintas que aparecen en esa fila.",
  },
  {
    key: "validaciones", label: "Cuentas", tipo: "entero", grupo: "validacion",
    ayuda: "Registros de validación del corte: normalmente uno por empresa, trimestre y fondo. Si supera al número de empresas, alguna tiene más de una cuenta en ese trimestre.",
  },
  {
    key: "resoluciones", label: "Resoluciones", tipo: "entero", grupo: "pago",
    ayuda: "Resoluciones distintas que pagaron en esa fila. No se suman hacia abajo: una misma puede pagar a empresas en estados distintos.",
  },
  {
    key: "valorResolucion", label: "Valor asignado", tipo: "dinero", grupo: "pago",
    ayuda: "Suma de lo que asignan las resoluciones de esa fila.",
  },
  {
    key: "valorPagado", label: "Valor pagado", tipo: "dinero", grupo: "pago",
    ayuda: "Suma de lo efectivamente girado.",
  },
  {
    key: "saldoPendiente", label: "Saldo pendiente", tipo: "dinero", grupo: "pago",
    ayuda: "Lo asignado que aún no se ha girado.",
  },
  {
    key: "pctEjecucion", label: "% de ejecución", tipo: "pct", grupo: "pago",
    ayuda: "Pagado sobre asignado. Se calcula de los montos, no de la columna pct_pagado de la fuente, que viene errada en algunas resoluciones.",
  },
];

/** Clave con la que una fila del resumen encuentra sus empresas. */
function claveGrupo(f: { anio: number; trimestre: number; fondo: string | null; estado: string }): string {
  return `${f.anio}|${f.trimestre}|${f.fondo ?? ""}|${f.estado}`;
}

/** «186» si es una sola, «186 – 235» si son varias, «—» si el grupo no tiene pagos. */
function rangoResoluciones(min: number | null, max: number | null): string {
  if (min === null || max === null) return "—";
  return min === max ? fmtNum(min) : `${fmtNum(min)} – ${fmtNum(max)}`;
}

function celda(fila: FilaResumen | FilaDetalleEmpresa, c: Columna): string {
  if (c.key === "trimestre") return `T${fila.trimestre}`;
  if (c.key === "estado") return etiquetaEstado(fila.estado);
  if (c.key === "fondo") return fila.fondo ?? "—";
  if (c.key === "anio") return String(fila.anio);
  // Un porcentaje sobre cero no es cero por ciento, es que no hay nada que
  // ejecutar: mostrarlo como 0,0 % hacía leer un incumplimiento inexistente.
  if (c.key === "pctEjecucion" && fila.valorResolucion === 0) return "—";
  const valor = (fila as unknown as Record<ColKey, number>)[c.key];
  if (valor === null || valor === undefined) return "—";
  if (c.tipo === "dinero") return valor === 0 ? "—" : fmtCOP(valor);
  if (c.tipo === "pct") return formatPct(valor, 1);
  return valor === 0 ? "—" : fmtNum(valor);
}

export default function TablaResumenPeriodo({
  resumen,
  detalle,
  loading,
}: {
  resumen: FilaResumen[];
  detalle: FilaDetalleEmpresa[];
  loading: boolean;
}) {
  const [orden, setOrden] = useState<{ col: ColKey; desc: boolean } | null>(null);
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(new Set());

  const porGrupo = useMemo(() => {
    const m = new Map<string, FilaDetalleEmpresa[]>();
    for (const d of detalle) {
      const k = claveGrupo(d);
      // Copia en vez de push sobre el arreglo guardado: el acumulador no muta.
      m.set(k, [...(m.get(k) ?? []), d]);
    }
    return m;
  }, [detalle]);

  const ordenadas = useMemo(() => {
    // Sin orden explícito se respeta el del servidor: año descendente,
    // trimestre, fondo y estado, que es como se lee el informe.
    if (!orden) return resumen;
    return [...resumen].sort((a, b) => {
      const va = a[orden.col];
      const vb = b[orden.col];
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va ?? "").localeCompare(String(vb ?? ""), "es");
      return orden.desc ? -cmp : cmp;
    });
  }, [resumen, orden]);

  const totales = useMemo(
    () =>
      resumen.reduce(
        (acc, r) => ({
          validaciones: acc.validaciones + r.validaciones,
          valorResolucion: acc.valorResolucion + r.valorResolucion,
          valorPagado: acc.valorPagado + r.valorPagado,
          saldoPendiente: acc.saldoPendiente + r.saldoPendiente,
        }),
        { validaciones: 0, valorResolucion: 0, valorPagado: 0, saldoPendiente: 0 }
      ),
    [resumen]
  );

  const alternarOrden = (col: ColKey) =>
    setOrden((o) => (o?.col === col ? { col, desc: !o.desc } : { col, desc: true }));

  const alternarFila = (clave: string) =>
    setAbiertas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(clave)) siguiente.delete(clave);
      else siguiente.add(clave);
      return siguiente;
    });

  const exportar = () => {
    const base = (f: FilaResumen | FilaDetalleEmpresa) => ({
      "Año": f.anio,
      Trimestre: f.trimestre,
      Fondo: f.fondo ?? "",
      "Estado de validación": etiquetaEstado(f.estado),
      Cuentas: f.validaciones,
      Resoluciones: f.resoluciones,
      "N.º de resolución": rangoResoluciones(f.resMin, f.resMax),
      "Valor asignado": f.valorResolucion,
      "Valor pagado": f.valorPagado,
      "Saldo pendiente": f.saldoPendiente,
      "% de ejecución": Number(f.pctEjecucion.toFixed(2)),
    });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(ordenadas.map((r) => ({ ...base(r), Empresas: r.empresas }))),
      "Resumen por periodo"
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(
        detalle.map((d) => ({
          Empresa: d.nombre,
          "Código SUI": d.codigo ?? "",
          NIT: d.nit ?? "",
          ...base(d),
        }))
      ),
      "Detalle por empresa"
    );
    XLSX.writeFile(libro, "detalle-empresas-subsidios.xlsx");
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

  if (resumen.length === 0) {
    return (
      <p className="text-sm text-theme-muted py-8 text-center">
        Ningún período coincide con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-theme-muted">
          {fmtNum(resumen.length)} fila{resumen.length === 1 ? "" : "s"} · clic en una para ver sus
          empresas
        </span>
        <button
          type="button"
          onClick={exportar}
          className="text-xs text-theme-secondary hover:text-gold border border-theme-card rounded px-3 py-1.5 transition-colors"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="overflow-auto max-h-[560px] rounded-lg border border-theme-card">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-theme-secondary">
            <tr>
              <th className="w-6 border-b border-theme-card" />
              {COLUMNAS.map((c) => {
                const activa = orden?.col === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => alternarOrden(c.key)}
                    scope="col"
                    aria-sort={activa ? (orden.desc ? "descending" : "ascending") : "none"}
                    className={`px-3 py-2 whitespace-nowrap cursor-pointer select-none border-b border-theme-card transition-colors hover:text-gold ${
                      c.tipo === "texto" ? "text-left" : "text-right"
                    } ${activa ? "text-gold" : "text-theme-secondary"} ${
                      c.grupo === "validacion"
                        ? "bg-sky-500/5"
                        : c.grupo === "pago"
                          ? "bg-emerald-500/5"
                          : ""
                    }`}
                  >
                    <span title={c.ayuda} className={c.ayuda ? "border-b border-dotted border-theme-card" : ""}>
                      {c.label}
                    </span>
                    <span className="ml-1 text-[9px]">{activa ? (orden.desc ? "▼" : "▲") : "⇅"}</span>
                  </th>
                );
              })}
              <th
                className="px-3 py-2 text-right whitespace-nowrap border-b border-theme-card text-theme-secondary bg-emerald-500/5"
                title="Números de las resoluciones de esa fila. Cuando son varias se muestra el rango entre la menor y la mayor."
              >
                <span className="border-b border-dotted border-theme-card">N.º de resolución</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((r) => {
              const clave = claveGrupo(r);
              const abierta = abiertas.has(clave);
              const empresas = porGrupo.get(clave) ?? [];
              return (
                <FilaConDespliegue
                  key={clave}
                  fila={r}
                  abierta={abierta}
                  empresas={empresas}
                  onAlternar={() => alternarFila(clave)}
                />
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-theme-secondary">
            <tr className="border-t border-theme-card font-semibold text-theme-primary">
              <td />
              <td className="px-3 py-2">Total</td>
              <td colSpan={3} />
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(totales.validaciones)}</td>
              {/* Las resoluciones no se suman: 7 de las 18 de 2026 pagan a
                  empresas en estados distintos, así que aparecen en varias filas. */}
              <td
                className="px-3 py-2 text-right text-theme-muted"
                title="Una resolución puede pagar a empresas en estados distintos, así que la suma por fila no es el total de resoluciones"
              >
                —
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCOP(totales.valorResolucion)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCOP(totales.valorPagado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtCOP(totales.saldoPendiente)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatPct(
                  totales.valorResolucion > 0
                    ? (totales.valorPagado / totales.valorResolucion) * 100
                    : 0,
                  1
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function FilaConDespliegue({
  fila,
  abierta,
  empresas,
  onAlternar,
}: {
  fila: FilaResumen;
  abierta: boolean;
  empresas: FilaDetalleEmpresa[];
  onAlternar: () => void;
}) {
  const sinValidacion = fila.estado === SIN_VALIDACION;
  return (
    <>
      <tr
        onClick={onAlternar}
        className={`cursor-pointer hover:bg-theme-hover border-b border-theme-secondary/40 ${
          sinValidacion ? "text-theme-muted" : ""
        }`}
      >
        <td className="px-1 text-center text-[9px] text-theme-muted">{abierta ? "▼" : "▶"}</td>
        {COLUMNAS.map((c) => (
          <td
            key={c.key}
            className={`px-3 py-1.5 whitespace-nowrap ${
              c.tipo === "texto"
                ? "text-left text-theme-primary"
                : "text-right tabular-nums text-theme-secondary"
            }`}
            title={
              sinValidacion && c.key === "estado"
                ? "Pagos del período que no cruzan con ninguna validación del corte"
                : undefined
            }
          >
            {celda(fila, c)}
          </td>
        ))}
        <td className="px-3 py-1.5 text-right tabular-nums text-theme-secondary whitespace-nowrap">
          {rangoResoluciones(fila.resMin, fila.resMax)}
        </td>
      </tr>
      {abierta &&
        empresas.map((e) => (
          <tr key={e.empresaKey} className="bg-theme-secondary/30 border-b border-theme-secondary/20">
            <td />
            <td colSpan={4} className="pl-8 pr-3 py-1 text-left text-theme-secondary">
              <span className="truncate inline-block max-w-[340px] align-bottom" title={e.nombre}>
                {e.nombre}
              </span>
              <span className="ml-2 text-[10px] text-theme-muted">
                {[e.codigo, e.nit ? `NIT ${e.nit}` : null].filter(Boolean).join(" · ")}
              </span>
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-muted">—</td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary">
              {fmtNum(e.validaciones)}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary">
              {fmtNum(e.resoluciones)}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary">
              {fmtCOP(e.valorResolucion)}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary">
              {fmtCOP(e.valorPagado)}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary">
              {fmtCOP(e.saldoPendiente)}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary">
              {formatPct(e.pctEjecucion, 1)}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-theme-secondary whitespace-nowrap">
              {rangoResoluciones(e.resMin, e.resMax)}
            </td>
          </tr>
        ))}
    </>
  );
}

