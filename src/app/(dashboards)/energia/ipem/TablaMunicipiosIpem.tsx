"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import MultiSelect from "@/components/dashboard/MultiSelect";
import {
  QUINTILES,
  colorQuintil,
  fmtIpemPct,
  fmtVariacionPp,
  normalizarQuintil,
  type MunicipioIpem,
} from "@/lib/ipem";

/** Fila del Excel ya enriquecida con la región y la variación entre años. */
export interface FilaMunicipioIpem extends MunicipioIpem {
  region: string;
  variacion: number | null;
}

/**
 * Cuántas filas se pintan a la vez. Los 1.121 municipios en el DOM hacen lento el
 * orden y el filtrado; con el buscador y los dos filtros, 200 alcanza para cualquier
 * consulta concreta y el pie dice cuántas quedaron fuera.
 */
const MAX_FILAS_VISIBLES = 200;

type Columna = "municipio" | "departamento" | "ipem2024" | "ipem2025" | "variacion";

/** Los filtros vigentes, tal como los ve el usuario. */
export interface FiltrosIpem {
  busqueda: string;
  regiones: string[];
  departamentos: string[];
  quintiles: string[];
}

interface Props {
  filas: FilaMunicipioIpem[];
  regiones: string[];
  departamentos: string[];
  /**
   * Espejo de los filtros hacia la página. El estado sigue viviendo aquí porque es
   * estado de esta interfaz; la página solo necesita leerlo para que el informe PDF
   * se genere con lo mismo que hay en pantalla. Debe ser una referencia estable
   * (un `setState` sirve), o el efecto se dispara en bucle.
   */
  onFiltrosChange?: (filtros: FiltrosIpem) => void;
}

/** Null siempre al final, sin importar la dirección del orden. */
function comparar(a: number | null, b: number | null, asc: boolean): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return asc ? a - b : b - a;
}

function EtiquetaQuintil({ valor }: { valor: string | null }) {
  const q = normalizarQuintil(valor);
  if (!q) return <span className="text-theme-muted">—</span>;
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-900"
      style={{ backgroundColor: colorQuintil(q) }}
    >
      {q}
    </span>
  );
}

export default function TablaMunicipiosIpem({
  filas,
  regiones,
  departamentos,
  onFiltrosChange,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [regionesSel, setRegionesSel] = useState<string[]>([]);
  const [deptosSel, setDeptosSel] = useState<string[]>([]);
  const [quintilesSel, setQuintilesSel] = useState<string[]>([]);
  // Alfabético por defecto, a propósito. Ordenada por IPEM descendente, la tabla
  // abría con veinte filas «MUY ALTO» seguidas y daba una impresión del país más
  // grave que la que describen las cifras. El ranking de mayor incidencia ya está
  // arriba, y ahí sí tiene contexto.
  const [columna, setColumna] = useState<Columna>("municipio");
  const [asc, setAsc] = useState(true);

  useEffect(() => {
    onFiltrosChange?.({
      busqueda,
      regiones: regionesSel,
      departamentos: deptosSel,
      quintiles: quintilesSel,
    });
  }, [busqueda, regionesSel, deptosSel, quintilesSel, onFiltrosChange]);

  const filtradas = useMemo(() => {
    const texto = busqueda
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

    const resultado = filas.filter((f) => {
      if (regionesSel.length && !regionesSel.includes(f.region)) return false;
      if (deptosSel.length && !deptosSel.includes(f.departamento)) return false;
      if (quintilesSel.length) {
        const q = normalizarQuintil(f.quintil2025);
        if (!q || !quintilesSel.includes(q)) return false;
      }
      if (!texto) return true;
      const nombre = f.municipio
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
      return nombre.includes(texto) || f.codMunicipio.includes(texto);
    });

    return [...resultado].sort((a, b) => {
      if (columna === "municipio" || columna === "departamento") {
        const cmp = a[columna].localeCompare(b[columna], "es");
        return asc ? cmp : -cmp;
      }
      return comparar(a[columna], b[columna], asc);
    });
  }, [filas, busqueda, regionesSel, deptosSel, quintilesSel, columna, asc]);

  const visibles = filtradas.slice(0, MAX_FILAS_VISIBLES);

  /**
   * Exporta lo FILTRADO, no lo visible: el corte de 200 filas es para que el
   * navegador no se atasque, no un criterio de negocio. Sin filtros, salen los 1.121.
   *
   * Los porcentajes van como número, no como texto, para que en Excel se puedan
   * promediar y graficar. Las celdas sin dato quedan vacías en vez de en cero, que
   * se confundiría con una privación nula.
   */
  const exportarExcel = () => {
    const pct = (v: number | null) => (v === null ? "" : Number((v * 100).toFixed(4)));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(
        filtradas.map((f) => ({
          "Código DIVIPOLA": f.codMunicipio,
          Municipio: f.municipio,
          Departamento: f.departamento,
          Región: f.region,
          "IPEM 2024 (%)": pct(f.ipem2024),
          "IPEM 2025 (%)": pct(f.ipem2025),
          "Variación (pp)": f.variacion === null ? "" : Number(f.variacion.toFixed(4)),
          "Quintil 2024": f.quintil2024 ?? "",
          "Quintil 2025": f.quintil2025 ?? "",
        }))
      ),
      "IPEM municipal"
    );
    XLSX.writeFile(libro, "ipem-municipal.xlsx");
  };

  function ordenarPor(col: Columna) {
    if (col === columna) {
      setAsc(!asc);
      return;
    }
    setColumna(col);
    // Los nombres arrancan A→Z y los números de mayor a menor, que es la lectura
    // que interesa en un índice de privación.
    setAsc(col === "municipio" || col === "departamento");
  }

  const flecha = (col: Columna) => (col === columna ? (asc ? " ▲" : " ▼") : "");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="ipem-buscar"
            className="block text-[11px] uppercase tracking-wide text-theme-muted mb-1"
          >
            Buscar municipio
          </label>
          <input
            id="ipem-buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o código DIVIPOLA"
            className="w-full rounded-lg bg-theme-primary border border-theme-card px-3 py-2 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <MultiSelect
          label="Región"
          options={regiones}
          selected={regionesSel}
          onChange={setRegionesSel}
        />
        <MultiSelect
          label="Departamento"
          options={departamentos}
          selected={deptosSel}
          onChange={setDeptosSel}
          buscable
        />
        <MultiSelect
          label="Quintil 2025"
          options={[...QUINTILES]}
          selected={quintilesSel}
          onChange={setQuintilesSel}
        />
        <button
          type="button"
          onClick={exportarExcel}
          disabled={filtradas.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-theme-card bg-theme-primary px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:border-amber-500/60 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={`Descargar ${filtradas.length} municipios en Excel`}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Excel
        </button>
      </div>

      <div className="overflow-auto max-h-[520px] rounded-xl border border-theme-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-theme-secondary z-10">
            <tr className="text-left text-[11px] uppercase tracking-wide text-theme-muted">
              {(
                [
                  ["municipio", "Municipio"],
                  ["departamento", "Departamento"],
                  ["ipem2024", "IPEM 2024"],
                  ["ipem2025", "IPEM 2025"],
                  ["variacion", "Variación"],
                ] as Array<[Columna, string]>
              ).map(([col, titulo]) => (
                <th key={col} className="px-3 py-2 font-semibold">
                  <button
                    type="button"
                    onClick={() => ordenarPor(col)}
                    className="hover:text-amber-500 transition-colors"
                  >
                    {titulo}
                    {flecha(col)}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-semibold">Quintil 2024</th>
              <th className="px-3 py-2 font-semibold">Quintil 2025</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr
                key={f.codMunicipio}
                className="border-t border-theme-card hover:bg-amber-500/5"
              >
                <td className="px-3 py-2 text-theme-primary">{f.municipio}</td>
                <td className="px-3 py-2 text-theme-secondary">{f.departamento}</td>
                <td className="px-3 py-2 tabular-nums text-theme-secondary">
                  {fmtIpemPct(f.ipem2024)}
                </td>
                <td className="px-3 py-2 tabular-nums text-theme-primary font-medium">
                  {fmtIpemPct(f.ipem2025)}
                </td>
                <td
                  className={`px-3 py-2 tabular-nums font-medium ${
                    f.variacion === null
                      ? "text-theme-muted"
                      : f.variacion < 0
                        ? "text-emerald-500"
                        : f.variacion > 0
                          ? "text-red-500"
                          : "text-theme-secondary"
                  }`}
                >
                  {fmtVariacionPp(f.variacion)}
                </td>
                <td className="px-3 py-2">
                  <EtiquetaQuintil valor={f.quintil2024} />
                </td>
                <td className="px-3 py-2">
                  <EtiquetaQuintil valor={f.quintil2025} />
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-theme-muted">
                  Ningún municipio coincide con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-theme-muted">
        {filtradas.length > MAX_FILAS_VISIBLES
          ? `Mostrando ${MAX_FILAS_VISIBLES} de ${filtradas.length} municipios filtrados — afine la búsqueda o los filtros para ver el resto.`
          : `${filtradas.length} municipio${filtradas.length === 1 ? "" : "s"} de ${filas.length}.`}{" "}
        Variación negativa (verde) = el índice bajó, es decir mejoró. El botón Excel
        descarga todos los municipios que pasan el filtro, no solo los visibles.
      </p>
    </div>
  );
}
