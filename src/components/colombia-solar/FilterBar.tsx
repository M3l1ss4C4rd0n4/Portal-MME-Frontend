"use client";

import { useState, useRef, useEffect } from "react";

interface FilterOptions {
  programas: string[];
  departamentos: string[];
  meses: string[];
  tipos: string[];
  contratistas: string[];
}

interface FilterValues {
  programa: string[];
  departamento: string[];
  mes: string[];
  tipo: string[];
  contratista: string[];
}

interface FilterBarProps {
  values: FilterValues;
  onChange: (key: keyof FilterValues, value: string[]) => void;
  onClear: () => void;
}

const LABELS: Record<keyof FilterValues, string> = {
  programa: "Programa",
  departamento: "Departamento",
  mes: "Mes",
  tipo: "Tipo Solución",
  contratista: "Contratista / Entidad",
};

const KEYS: (keyof FilterValues)[] = ["programa", "departamento", "mes", "tipo", "contratista"];
const KEY_TO_OPTIONS: Record<keyof FilterValues, keyof FilterOptions> = {
  programa: "programas",
  departamento: "departamentos",
  mes: "meses",
  tipo: "tipos",
  contratista: "contratistas",
};

function FilterDropdown({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const safeOptions = options ?? [];
  const allSelected = selected.length === 0 || selected.length === safeOptions.length;

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([...safeOptions]);
    }
  };

  const toggleOne = (o: string) => {
    if (selected.includes(o)) {
      onChange(selected.filter((s) => s !== o));
    } else {
      onChange([...selected, o]);
    }
  };

  let displayLabel: string;
  if (selected.length === 0 || selected.length === safeOptions.length) {
    displayLabel = "Todos";
  } else if (selected.length === 1) {
    displayLabel = selected[0];
  } else {
    displayLabel = `${selected.length} seleccionados`;
  }

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[160px]" ref={ref}>
      <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full text-left text-xs border rounded-lg px-4 py-2.5 pr-8 outline-none transition-colors cursor-pointer ${
            selected.length > 0 && selected.length < safeOptions.length
              ? "border-amber-500/50 text-theme-primary"
              : "border-theme-primary text-theme-muted hover:border-theme-secondary"
          } focus:border-amber-500/70`}
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <span className="block truncate">{displayLabel}</span>
        </button>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[10px] pointer-events-none">
          ▾
        </span>

        {open && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg border border-theme-primary shadow-2xl max-h-72 overflow-y-auto"
            style={{ backgroundColor: "var(--bg-primary)", padding: 8 }}
          >
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2.5 px-3 rounded-md text-xs cursor-pointer transition-colors hover:bg-theme-hover w-full text-left" style={{paddingTop: 10, paddingBottom: 10}}
            >
              <span
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                  allSelected ? "bg-amber-500 border-amber-500" : "border-[#64748B]"
                }`}
              >
                {allSelected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className="text-theme-primary font-medium">Todos</span>
            </button>
            <div style={{ height: 1, background: "var(--border-secondary)", margin: "6px 0" }} />
            {safeOptions.map((o) => {
              const isSelected = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggleOne(o)}
                  className="flex items-center gap-2.5 px-3 rounded-md text-xs cursor-pointer transition-colors hover:bg-theme-hover w-full text-left" style={{paddingTop: 10, paddingBottom: 10}}
                >
                  <span
                    className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                      isSelected ? "bg-amber-500 border-amber-500" : "border-[#64748B]"
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="text-theme-primary">{o}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilterBar({ values, onChange, onClear }: FilterBarProps) {
  const [options, setOptions] = useState<FilterOptions>({
    programas: [],
    departamentos: [],
    meses: [],
    tipos: [],
    contratistas: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/filtros?_t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((r) => {
        setOptions({
          programas: r.programas ?? [],
          departamentos: r.departamentos ?? [],
          meses: r.meses ?? [],
          tipos: r.tipos ?? [],
          contratistas: r.contratistas ?? [],
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const hasFilter = Object.values(values).some((arr) => arr.length > 0);

  return (
    <div className="flex items-end gap-4 flex-wrap">
      {KEYS.map((key) => (
        <FilterDropdown
          key={key}
          label={LABELS[key]}
          selected={values[key]}
          options={options[KEY_TO_OPTIONS[key]]}
          onChange={(v) => onChange(key, v)}
        />
      ))}

      {hasFilter && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] opacity-0 select-none">x</span>
          <button
            onClick={onClear}
            className="text-[11px] text-gold border border-amber-700/40 rounded-lg px-4 py-3.5 hover:bg-amber-500/10 transition-colors whitespace-nowrap"
          >
            × Limpiar filtros
          </button>
        </div>
      )}

      {loading && (
        <div className="w-full text-xs text-[#64748B] py-1">Cargando opciones…</div>
      )}
      {error && (
        <div className="w-full text-xs text-red-400 py-1">Error cargando opciones: {error}</div>
      )}
    </div>
  );
}
