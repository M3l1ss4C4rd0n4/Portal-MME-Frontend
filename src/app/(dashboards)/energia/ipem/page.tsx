"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import KpiChip from "@/components/dashboard/KpiChip";
import { getNivoTheme } from "@/lib/nivo-theme";
import { formatNumber } from "@/lib/format";
import {
  ANIOS_IPEM,
  BANDAS_DEPARTAMENTAL,
  colorQuintil,
  distribucionPorQuintil,
  fmtIpemPct,
  fmtVariacionPp,
  ipemDe,
  quintilPublicado,
  variacionPp,
  type AnioIpem,
  type DepartamentoIpem,
  type KpisIpem,
  type MunicipioIpem,
} from "@/lib/ipem";
import TablaMunicipiosIpem, { type FilaMunicipioIpem } from "./TablaMunicipiosIpem";

const MapaCoropletaDepartamentos = dynamic(
  () => import("@/components/maps/MapaCoropletaDepartamentos"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-theme-muted text-xs">
        Cargando mapa…
      </div>
    ),
  },
);

const KPIS_VACIOS: KpisIpem = {
  promedioMunicipal2024: null,
  promedioMunicipal2025: null,
  promedioDepartamental2024: null,
  promedioDepartamental2025: null,
  municipios: 0,
  departamentos: 0,
  comparables: 0,
  variacionPromedioComparable: null,
  mejoran: 0,
  empeoran: 0,
  sinCambio: 0,
  sinDato: 0,
};

const TOP = 10;

/** Promedios de los KPI vienen ya en porcentaje; `fmtIpemPct` espera fracción. */
function pctDirecto(valor: number | null): string {
  return fmtIpemPct(valor === null ? null : valor / 100);
}

export default function IpemPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const T = getNivoTheme(isDark);

  const [kpis, setKpis] = useState<KpisIpem>(KPIS_VACIOS);
  const [departamentos, setDepartamentos] = useState<DepartamentoIpem[]>([]);
  const [municipios, setMunicipios] = useState<MunicipioIpem[]>([]);
  const [geoData, setGeoData] = useState<object | null>(null);
  const [anio, setAnio] = useState<AnioIpem>("2025");
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState(false);
  // Sin esto, los KPI muestran «0 municipios que mejoran» mientras carga y también si
  // la carga falla: un cero con aspecto de cifra real. Hasta que haya datos, van «—».
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    fetch("/api/energia/ipem")
      .then((r) => r.json())
      .then((json) => {
        if (json?.error) {
          setError("No se pudieron cargar los datos del IPEM.");
          return;
        }
        setKpis(json.kpis ?? KPIS_VACIOS);
        setDepartamentos(json.departamentos ?? []);
        setMunicipios(json.municipios ?? []);
        setCargado(true);
      })
      .catch(() => setError("No se pudieron cargar los datos del IPEM."));
    fetch("/departamentos_colombia.geojson")
      .then((r) => r.json())
      .then(setGeoData)
      // Antes esto era `.catch(() => {})`: si el geojson fallaba, el mapa se quedaba
      // en «Cargando mapa…» para siempre y nadie se enteraba.
      .catch(() => setGeoError(true));
  }, []);

  /** Conteos: «—» mientras no haya datos, para no mostrar ceros que parecen reales. */
  const cuenta = (n: number): string => (cargado ? formatNumber(n) : "—");

  const regionPorDepto = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const d of departamentos) mapa.set(d.codDepartamento, d.region);
    return mapa;
  }, [departamentos]);

  const filas = useMemo<FilaMunicipioIpem[]>(
    () =>
      municipios.map((m) => ({
        ...m,
        region: regionPorDepto.get(m.codDepartamento) ?? "Sin región",
        variacion: variacionPp(m.ipem2024, m.ipem2025),
      })),
    [municipios, regionPorDepto],
  );

  const regiones = useMemo(
    () => [...new Set(departamentos.map((d) => d.region))].sort((a, b) => a.localeCompare(b, "es")),
    [departamentos],
  );
  const nombresDepto = useMemo(
    () => [...new Set(municipios.map((m) => m.departamento))].sort((a, b) => a.localeCompare(b, "es")),
    [municipios],
  );

  const datosMapa = useMemo(
    () =>
      departamentos
        .map((d) => ({
          departamento: d.departamento,
          codigoDane: d.codDepartamento,
          valor: ipemDe(d, anio),
        }))
        .filter((d): d is { departamento: string; codigoDane: string; valor: number } =>
          d.valor !== null,
        ),
    [departamentos, anio],
  );

  const distribucion = useMemo(() => {
    const d2024 = distribucionPorQuintil(municipios, "2024");
    const d2025 = distribucionPorQuintil(municipios, "2025");
    return d2024.map((fila, i) => ({
      quintil: fila.quintil,
      "2024": fila.municipios,
      "2025": d2025[i].municipios,
    }));
  }, [municipios]);

  const mayorIncidencia = useMemo(
    () =>
      [...filas]
        .filter((f) => ipemDe(f, anio) !== null)
        .sort((a, b) => (ipemDe(b, anio) as number) - (ipemDe(a, anio) as number))
        .slice(0, TOP),
    [filas, anio],
  );

  const mayorReduccion = useMemo(
    () =>
      [...filas]
        .filter((f) => f.variacion !== null)
        .sort((a, b) => (a.variacion as number) - (b.variacion as number))
        .slice(0, TOP),
    [filas],
  );

  return (
    <DashboardLayout
      title="IPEM — Índice de Pobreza Energética Multidimensional"
      subtitle="Resultados 2024 y 2025 por departamento y municipio · Ministerio de Minas y Energía"
    >
      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiChip
          label="Promedio municipal 2024"
          value={pctDirecto(kpis.promedioMunicipal2024)}
          note={`${cuenta(kpis.municipios)} municipios`}
        />
        <KpiChip
          label="Promedio municipal 2025"
          value={pctDirecto(kpis.promedioMunicipal2025)}
          accent
          subvalue={fmtVariacionPp(kpis.variacionPromedioComparable)}
          note={`frente a 2024, en los ${cuenta(kpis.comparables)} municipios comparables`}
        />
        <KpiChip
          label="Municipios que mejoran"
          value={cuenta(kpis.mejoran)}
          color="#10B981"
          note={`de ${cuenta(kpis.comparables)} comparables`}
        />
        <KpiChip
          label="Municipios que empeoran"
          value={cuenta(kpis.empeoran)}
          color="#EF4444"
          note={`de ${cuenta(kpis.comparables)} comparables`}
        />
        <KpiChip
          label="Promedio departamental"
          value={pctDirecto(kpis.promedioDepartamental2025)}
          note={`${cuenta(kpis.departamentos)} departamentos · 2025`}
        />
      </div>

      {/* ── Nota metodológica ────────────────────────────────────────────── */}
      <Card delay={0.05} className="border-amber-500/40">
        <h3 className="text-sm font-semibold text-theme-primary mb-2">
          Cómo leer este tablero
        </h3>
        <ul className="space-y-1.5 text-xs text-theme-secondary leading-relaxed list-disc pl-4">
          <li>
            <strong className="text-theme-primary">
              Los quintiles se recalculan cada año.
            </strong>{" "}
            Cada etiqueta agrupa aproximadamente una quinta parte de los municipios en el año
            correspondiente, con rangos distintos entre 2024 y 2025. Por eso un municipio puede
            subir de quintil aunque su índice haya bajado: para comparar los dos años use la
            columna de variación, no el cambio de etiqueta.
          </li>
          <li>
            <strong className="text-theme-primary">El índice no tiene umbral de corte.</strong>{" "}
            El informe no define puntos de corte por variable ni un umbral agregado, porque
            considera que la ausencia o carencia ya representa una privación. El IPEM mide
            niveles de incidencia, no una población clasificada como pobre o no pobre.
          </li>
          <li>
            <strong className="text-theme-primary">El dato municipal es una estimación.</strong>{" "}
            La Encuesta de Calidad de Vida del DANE no tiene representatividad municipal; los
            valores por municipio se obtienen aplicando su factor de expansión.
          </li>
          <li>
            <strong className="text-theme-primary">
              Las cifras municipales y departamentales no se agregan entre sí.
            </strong>{" "}
            Son dos estimaciones independientes de la misma encuesta: el promedio simple de
            los municipios de un departamento no reproduce su valor departamental, con
            diferencias de 3,5 puntos porcentuales en promedio y hasta 10,7 en Amazonas,
            Guainía y Vichada, y en ambos sentidos. Por eso el promedio municipal y el
            departamental de esta franja no coinciden, y no deben sumarse ni compararse
            entre sí.
          </li>
          <li>
            Método Alkire-Foster sobre tres dimensiones: acceso a energía eléctrica y preparación
            de alimentos (36 %), vivienda funcional (32 %) y aprender y comunicarse (32 %).
            Fuentes: DANE (ECV) y UPME (ICEE). Un valor más alto significa más privación.
          </li>
          <li>
            De las {cuenta(kpis.municipios)} filas territoriales, 19 son áreas no
            municipalizadas (marcadas «(CD)» en la fuente) y 1.102 son municipios. El
            código DIVIPOLA es la única clave segura: 65 nombres de municipio se repiten
            entre departamentos.
          </li>
          {kpis.sinDato > 0 && (
            <li>
              {kpis.sinDato === 1
                ? "Un municipio llegó sin valor de 2024 en la fuente, así que no entra en la variación ni en los conteos de mejora."
                : `${formatNumber(kpis.sinDato)} municipios llegaron sin valor de 2024 en la fuente, así que no entran en la variación ni en los conteos de mejora.`}
            </li>
          )}
        </ul>
      </Card>

      {/* ── Mapa + distribución ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card delay={0.1} className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-theme-primary">
              IPEM por departamento
            </h3>
            <div className="flex gap-1 rounded-lg bg-theme-primary p-1">
              {ANIOS_IPEM.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAnio(a)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    anio === a
                      ? "bg-amber-500 text-slate-900"
                      : "text-theme-secondary hover:text-theme-primary"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[420px]">
            {geoError ? (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs text-red-400">
                  No se pudo cargar el mapa de departamentos. Las cifras de la tabla y
                  de los indicadores no están afectadas.
                </p>
              </div>
            ) : (
            <MapaCoropletaDepartamentos
              geoData={geoData}
              datos={datosMapa}
              isDark={isDark}
              etiquetaValor={`IPEM ${anio}`}
              formatearValor={(v) => fmtIpemPct(v)}
              colorDe={(d) => colorQuintil(quintilPublicado(d.valor, "departamental"))}
            />
            )}
          </div>
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-theme-muted mb-1.5">
              Niveles de incidencia publicados (escala departamental)
            </p>
            <p className="text-[11px] text-theme-muted mb-1.5 normal-case">
              Bandas fijas del informe, iguales para los dos años, para que el color sea
              comparable entre 2024 y 2025. No son los quintiles relativos de cada año
              que muestra la tabla.
            </p>
            <div className="flex flex-wrap gap-2">
              {BANDAS_DEPARTAMENTAL.map((b) => (
                <span key={b.quintil} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ backgroundColor: colorQuintil(b.quintil) }}
                  />
                  <span className="text-theme-secondary">
                    {b.quintil} ({b.desdePct.toLocaleString("es-CO")} –{" "}
                    {b.hastaPct.toLocaleString("es-CO")} %)
                  </span>
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card delay={0.15} className="flex flex-col">
          <h3 className="text-sm font-semibold text-theme-primary mb-1">
            Municipios por quintil
          </h3>
          <p className="text-xs text-theme-muted mb-3">
            Clasificación oficial de la fuente. Los dos años tienen un reparto parecido por
            construcción: son quintiles de cada año, no bandas fijas.
          </p>
          <div className="h-[420px]">
            <ResponsiveBar
              data={distribucion}
              keys={["2024", "2025"]}
              indexBy="quintil"
              groupMode="grouped"
              margin={{ top: 10, right: 20, bottom: 70, left: 50 }}
              padding={0.25}
              innerPadding={3}
              colors={["#64748B", "#F59E0B"]}
              theme={T}
              axisBottom={{ tickRotation: -25 }}
              axisLeft={{ legend: "Municipios", legendOffset: -42, legendPosition: "middle" }}
              enableLabel={false}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom",
                  direction: "row",
                  translateY: 60,
                  itemWidth: 70,
                  itemHeight: 16,
                  symbolSize: 10,
                },
              ]}
              tooltip={({ id, value, indexValue }) => (
                <div className="bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-slate-600">
                  {indexValue} · {id}: <strong>{formatNumber(value)}</strong> municipios
                </div>
              )}
            />
          </div>
        </Card>
      </div>

      {/* ── Rankings ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card delay={0.2}>
          <h3 className="text-sm font-semibold text-theme-primary mb-3">
            Mayor incidencia — {anio}
          </h3>
          <ol className="space-y-1.5">
            {mayorIncidencia.map((f, i) => (
              <li
                key={f.codMunicipio}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-theme-secondary truncate">
                  <span className="text-theme-muted tabular-nums mr-1.5">{i + 1}.</span>
                  {f.municipio}
                  <span className="text-theme-muted"> · {f.departamento}</span>
                </span>
                <span className="tabular-nums font-semibold text-theme-primary shrink-0">
                  {fmtIpemPct(ipemDe(f, anio))}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card delay={0.25}>
          <h3 className="text-sm font-semibold text-theme-primary mb-3">
            Mayor reducción 2024 → 2025
          </h3>
          <ol className="space-y-1.5">
            {mayorReduccion.map((f, i) => (
              <li
                key={f.codMunicipio}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-theme-secondary truncate">
                  <span className="text-theme-muted tabular-nums mr-1.5">{i + 1}.</span>
                  {f.municipio}
                  <span className="text-theme-muted"> · {f.departamento}</span>
                </span>
                <span className="tabular-nums font-semibold text-emerald-500 shrink-0">
                  {fmtVariacionPp(f.variacion)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* ── Tabla municipal ──────────────────────────────────────────────── */}
      <Card delay={0.3}>
        <h3 className="text-sm font-semibold text-theme-primary mb-3">
          Detalle municipal
        </h3>
        <TablaMunicipiosIpem
          filas={filas}
          regiones={regiones}
          departamentos={nombresDepto}
        />
      </Card>
    </DashboardLayout>
  );
}
