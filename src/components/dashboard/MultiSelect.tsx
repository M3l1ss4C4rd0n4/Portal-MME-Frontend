"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export interface MultiSelectProps {
  label: string;
  options: string[];
  /** Selección vigente. Un arreglo vacío significa "Todos". */
  selected: string[];
  onChange: (v: string[]) => void;
  /** Permite mostrar una etiqueta distinta al valor que viaja al backend. */
  renderLabel?: (v: string) => string;
  minWidth?: string;
  /** Añade un campo de búsqueda dentro del desplegable. */
  buscable?: boolean;
}

/** Cuántas opciones se pintan de una vez cuando hay búsqueda. */
const MAX_VISIBLES = 100;

/** Minúsculas y sin tildes, para que «nariño» encuentre «NARIÑO». */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Selector de varias opciones con casillas, usado por los filtros de los
 * tableros de Subsidios.
 *
 * Convención de la sección: `selected` vacío equivale a "Todos", así el
 * endpoint recibe el filtro ausente y no tiene que distinguir entre "nada
 * seleccionado" y "todo seleccionado".
 *
 * Vivía dentro de `src/app/(dashboards)/pagos/page.tsx`; se extrajo para que
 * el tablero de Detalle Empresas use exactamente el mismo control.
 */
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderLabel,
  minWidth = "88px",
  buscable = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Al cerrar se olvida la búsqueda: si no, al reabrir la lista aparece
  // recortada por un texto que el usuario ya no ve.
  useEffect(() => {
    if (!open) setBusqueda("");
  }, [open]);

  // Se filtra sobre la etiqueta y no sobre el valor: en el filtro de empresas
  // el valor es el código SUI y lo que el usuario escribe es la razón social.
  const coincidencias = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return options;
    return options.filter((o) => normalizar(renderLabel ? renderLabel(o) : o).includes(q));
  }, [options, busqueda, renderLabel]);

  const visibles = coincidencias.slice(0, MAX_VISIBLES);
  const ocultas = coincidencias.length - visibles.length;

  const isTodos = selected.length === 0;
  const btnLabel = isTodos
    ? "Todos"
    : selected.length === 1
    ? (renderLabel ? renderLabel(selected[0]) : selected[0])
    : `${selected.length} sel.`;

  const toggle = (v: string) => {
    if (isTodos) {
      // Desde "Todos", seleccionar solo este
      onChange([v]);
    } else {
      const next = selected.includes(v)
        ? selected.filter((s) => s !== v)
        : [...selected, v];
      onChange(next); // vacío = "Todos"
    }
  };

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-[10px] text-theme-muted uppercase font-semibold tracking-wide">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ minWidth }}
        className="bg-theme-primary text-theme-primary text-xs border border-theme-card rounded px-2 py-1.5 flex items-center gap-1 hover:border-amber-500/50 focus:outline-none focus:border-amber-500 transition-colors"
      >
        <span className="flex-1 text-left truncate">{btnLabel}</span>
        <span className="text-theme-muted text-[10px] shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-theme-primary border border-theme-primary rounded-lg shadow-2xl min-w-[170px] max-h-[240px] overflow-y-auto">
          {buscable && (
            // Pegado arriba: el panel tiene scroll y, sin esto, el campo se va
            // de la vista en cuanto el usuario baja por la lista.
            <div className="sticky top-0 bg-theme-primary p-2 border-b border-theme-secondary">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
                autoFocus
                className="w-full bg-theme-secondary text-theme-primary text-xs rounded px-2 py-1
                  border border-theme-card focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          )}
          {/* Todos */}
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-theme-hover cursor-pointer border-b border-theme-secondary text-xs select-none">
            <input
              type="checkbox"
              checked={isTodos}
              onChange={() => onChange([])}
              className="accent-amber-500 shrink-0"
            />
            <span className="text-gold font-semibold">Todos</span>
          </label>
          {visibles.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-theme-hover cursor-pointer text-xs select-none"
            >
              <input
                type="checkbox"
                checked={!isTodos && selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-amber-500 shrink-0"
              />
              <span className="text-slate-300 truncate max-w-[200px]">
                {renderLabel ? renderLabel(opt) : opt}
              </span>
            </label>
          ))}
          {coincidencias.length === 0 && (
            <p className="px-3 py-3 text-[11px] text-theme-muted">Ninguna coincidencia.</p>
          )}
          {ocultas > 0 && (
            <p className="px-3 py-2 text-[10px] text-theme-muted border-t border-theme-secondary">
              {ocultas} más — afina la búsqueda
            </p>
          )}
        </div>
      )}
    </div>
  );
}
