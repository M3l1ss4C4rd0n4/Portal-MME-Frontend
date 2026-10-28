"use client";

import { useMemo } from "react";
import MultiSelect from "@/components/dashboard/MultiSelect";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { periodoLabel, periodoDesdeIndice } from "@/lib/subsidios-sql";
import type {
  FiltrosEmpresasState,
  FiltrosOpciones,
  RangoPeriodo,
  Corte,
} from "@/types/subsidios-empresas";

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Cuántas marcas se dibujan bajo la pista del deslizador. */
const MARCAS = 7;

function etiquetaCorte(c: Corte): string {
  return `${MESES[c.mes] ?? c.mes} ${c.anio}`;
}

export function claveCorte(c: Corte): string {
  return `${c.anio}-${String(c.mes).padStart(2, "0")}`;
}

/** «2026 T1» a partir del índice de trimestre con el que se mueve el slider. */
function etiquetaPeriodo(indice: number): string {
  const { anio, trimestre } = periodoDesdeIndice(indice);
  return periodoLabel(anio, trimestre);
}

interface Props {
  valores: FiltrosEmpresasState;
  opciones: FiltrosOpciones;
  onChange: (key: keyof FiltrosEmpresasState, value: string[]) => void;
  onLimpiar: () => void;
  /** Período vigente y sus topes, en índice de trimestre. */
  periodo: { desde: number; hasta: number };
  periodoDisponible: RangoPeriodo;
  onPeriodo: (desde: number, hasta: number) => void;
  /** Corte de validaciones vigente y los disponibles. */
  corte: string | null;
  cortes: Corte[];
  onCorte: (corte: string) => void;
}

export default function FiltrosEmpresas({
  valores,
  opciones,
  onChange,
  onLimpiar,
  periodo,
  periodoDisponible,
  onPeriodo,
  corte,
  cortes,
  onCorte,
}: Props) {
  // El dropdown mueve claves de empresa, pero muestra la razón social. Lleva
  // detrás el código SUI y el NIT porque cinco pares de empresas comparten
  // nombre y, sin eso, el desplegable muestra dos entradas idénticas.
  const etiquetaPorKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of opciones.empresas) {
      const sufijo = [e.codigo, e.nit ? `NIT ${e.nit}` : null].filter(Boolean).join(" · ");
      m.set(e.key, sufijo ? `${e.nombre} · ${sufijo}` : e.nombre);
    }
    return m;
  }, [opciones.empresas]);

  const { min, max } = periodoDisponible;
  const marcas = useMemo(
    () => Array.from({ length: MARCAS }, (_, i) => Math.round(min + ((max - min) / (MARCAS - 1)) * i)),
    [min, max]
  );

  const hayFiltros =
    valores.empresa.length > 0 || periodo.desde !== min || periodo.hasta !== max;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <MultiSelect
          label="Empresa"
          minWidth="200px"
          buscable
          options={opciones.empresas.map((e) => e.key)}
          selected={valores.empresa}
          onChange={(v) => onChange("empresa", v)}
          renderLabel={(k) => etiquetaPorKey.get(k) ?? k}
        />

        {/* El corte no es un filtro más: la tabla de validaciones guarda una
            fotografía por mes y siempre hay que mirar una sola, o los conteos
            se suman entre cortes. */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-theme-muted uppercase font-semibold tracking-wide">
            Corte de validaciones
          </label>
          <select
            value={corte ?? ""}
            onChange={(e) => onCorte(e.target.value)}
            className="bg-theme-primary text-theme-primary text-xs border border-theme-card rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 transition-colors"
            style={{ minWidth: "150px" }}
          >
            {cortes.map((c) => (
              <option key={claveCorte(c)} value={claveCorte(c)}>
                {etiquetaCorte(c)}
              </option>
            ))}
          </select>
        </div>

        {hayFiltros && (
          <button
            type="button"
            onClick={onLimpiar}
            className="text-xs text-theme-muted hover:text-gold border border-theme-card rounded px-3 py-1.5 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Sustituye a los desplegables de año y trimestre: el mismo control que
          usan Supervisión y Balance Oferta-Demanda, sobre el eje de trimestres. */}
      <RangeSlider
        min={min}
        max={max}
        valueMin={periodo.desde}
        valueMax={periodo.hasta}
        onChange={onPeriodo}
        defaultMin={min}
        defaultMax={max}
        step={1}
        ticks={marcas}
        label="PERÍODO"
        formatValue={etiquetaPeriodo}
      />
    </div>
  );
}
