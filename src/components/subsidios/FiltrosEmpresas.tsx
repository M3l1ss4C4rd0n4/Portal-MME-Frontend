"use client";

import { useMemo } from "react";
import MultiSelect from "@/components/dashboard/MultiSelect";
import type {
  FiltrosEmpresasState,
  FiltrosOpciones,
  Corte,
} from "@/types/subsidios-empresas";

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function etiquetaCorte(c: Corte): string {
  return `${MESES[c.mes] ?? c.mes} ${c.anio}`;
}

export function claveCorte(c: Corte): string {
  return `${c.anio}-${String(c.mes).padStart(2, "0")}`;
}

interface Props {
  valores: FiltrosEmpresasState;
  opciones: FiltrosOpciones;
  onChange: (key: keyof FiltrosEmpresasState, value: string[]) => void;
  onLimpiar: () => void;
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
  corte,
  cortes,
  onCorte,
}: Props) {
  // El dropdown mueve claves de empresa, pero muestra la razón social.
  const nombrePorKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of opciones.empresas) m.set(e.key, e.nombre);
    return m;
  }, [opciones.empresas]);

  const hayFiltros = Object.values(valores).some((v) => v.length > 0);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <MultiSelect
        label="Empresa"
        minWidth="200px"
        options={opciones.empresas.map((e) => e.key)}
        selected={valores.empresa}
        onChange={(v) => onChange("empresa", v)}
        renderLabel={(k) => nombrePorKey.get(k) ?? k}
      />
      <MultiSelect
        label="Año"
        options={opciones.anios.map(String)}
        selected={valores.anio}
        onChange={(v) => onChange("anio", v)}
      />
      <MultiSelect
        label="Trimestre"
        options={opciones.trimestres.map(String)}
        selected={valores.trimestre}
        onChange={(v) => onChange("trimestre", v)}
        renderLabel={(t) => `T${t}`}
      />
      <MultiSelect
        label="Fondo"
        options={opciones.fondos}
        selected={valores.fondo}
        onChange={(v) => onChange("fondo", v)}
      />
      <MultiSelect
        label="Área"
        options={opciones.areas}
        selected={valores.area}
        onChange={(v) => onChange("area", v)}
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
  );
}
