"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import {
  fetchDepartamentos,
  fetchResumenDepartamento,
} from "@/services/apiService";
import { useGeoFilter } from "@/context/GeoFilterContext";
import { normDeptKey } from "@/lib/departamentos";
import { useTheme } from "@/providers/ThemeProvider";
import type { Departamento, ResumenDepartamento } from "@/types/ontologia";
import type { DptoRow } from "@/types/mapa-departamentos";

const VistaDepartamentalMap = dynamic(() => import("./VistaDepartamentalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-theme-muted text-xs">Cargando mapa…</span>
    </div>
  ),
});

function KpiChip({
  label,
  value,
  delay = 0,
}: {
  label: string;
  value: number;
  delay?: number;
}) {
  return (
    <Card delay={delay} className="text-center">
      <div className="text-2xl font-bold text-gold leading-none">{value.toLocaleString("es-CO")}</div>
      <div className="text-[10px] text-theme-muted mt-2 leading-tight uppercase tracking-wide">
        {label}
      </div>
    </Card>
  );
}

export default function VistaDepartamentalPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const { codigoDaneDepartamento, setCodigoDaneDepartamento } = useGeoFilter();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const codigoSeleccionado = codigoDaneDepartamento ?? "";
  const setCodigoSeleccionado = setCodigoDaneDepartamento;
  const [resumen, setResumen] = useState<ResumenDepartamento | null>(null);
  const [loadingDeptos, setLoadingDeptos] = useState(true);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapa: geojson + resumen de los 33 departamentos (para el choropleth)
  const [geoData, setGeoData] = useState<object | null>(null);
  const [resumenesTodos, setResumenesTodos] = useState<ResumenDepartamento[]>([]);

  useEffect(() => {
    fetch("/departamentos_colombia.geojson").then((r) => r.json()).then(setGeoData).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDepartamentos()
      .then((data) => {
        setDepartamentos(data.departamentos);
        if (!codigoDaneDepartamento && data.departamentos.length > 0) {
          setCodigoDaneDepartamento(data.departamentos[0].codigo_dane_departamento);
        }
        return Promise.all(
          data.departamentos.map((d) =>
            fetchResumenDepartamento(d.codigo_dane_departamento).catch(() => null)
          )
        );
      })
      .then((resumenes) => {
        setResumenesTodos(resumenes.filter((r): r is ResumenDepartamento => r !== null));
      })
      .catch(() => setError("No se pudo cargar la lista de departamentos"))
      .finally(() => setLoadingDeptos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // departamentoGeo (nombre normalizado, casa con NOMBRE_DPT del geojson) <-> código DANE
  const deptNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of departamentos) map[d.codigo_dane_departamento] = normDeptKey(d.nombre_departamento);
    return map;
  }, [departamentos]);
  const deptCodeByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of departamentos) map[normDeptKey(d.nombre_departamento)] = d.codigo_dane_departamento;
    return map;
  }, [departamentos]);

  const resumenesPorDepto = useMemo(() => {
    const map: Record<string, ResumenDepartamento> = {};
    for (const r of resumenesTodos) map[normDeptKey(r.nombre_departamento)] = r;
    return map;
  }, [resumenesTodos]);

  const porDepartamento: DptoRow[] = useMemo(
    () =>
      resumenesTodos.map((r) => {
        const departamentoGeo = normDeptKey(r.nombre_departamento);
        const count =
          r.n_comunidades +
          r.n_contratos_or_fisico +
          r.n_proyectos_fenoge +
          r.n_proyectos_colombia_solar +
          r.n_registros_subsidios_mapa +
          r.n_contratos_supervision;
        return { departamento: departamentoGeo, departamentoGeo, count, capacidad: 0, inversion: 0 };
      }),
    [resumenesTodos]
  );

  // Buckets de color relativos a la distribución real (terciles sobre el máximo observado)
  const deptColors = useMemo(() => {
    const max = Math.max(0, ...porDepartamento.map((d) => d.count));
    const result: Record<string, string> = {};
    for (const d of porDepartamento) {
      if (max === 0) continue;
      const ratio = d.count / max;
      result[d.departamentoGeo] = ratio >= 0.66 ? "#F59E0B" : ratio >= 0.33 ? "#D97706" : "#7C3A0A";
    }
    return result;
  }, [porDepartamento]);

  const selectedDept = codigoSeleccionado ? deptNameByCode[codigoSeleccionado] ?? null : null;
  const handleSelectDeptFromMap = useCallback(
    (dept: string | null) => {
      if (dept === null) return;
      const codigo = deptCodeByName[dept];
      if (codigo) setCodigoSeleccionado(codigo);
    },
    [deptCodeByName, setCodigoSeleccionado]
  );

  const cargarResumen = useCallback((codigo: string) => {
    if (!codigo) return;
    setLoadingResumen(true);
    setError(null);
    fetchResumenDepartamento(codigo)
      .then(setResumen)
      .catch(() => setError("No se pudo cargar el resumen de este departamento"))
      .finally(() => setLoadingResumen(false));
  }, []);

  useEffect(() => {
    if (codigoSeleccionado) cargarResumen(codigoSeleccionado);
  }, [codigoSeleccionado, cargarResumen]);

  return (
    <DashboardLayout
      title="Vista Departamental"
      subtitle="Cruce de comunidades energéticas, contratos OR, FENOGE, Colombia Solar, subsidios y supervisión — Ontología unificada"
    >
      <div className="space-y-6">
        <Card delay={0}>
          <div style={{ height: 420 }}>
            <VistaDepartamentalMap
              geoData={geoData}
              selectedDept={selectedDept}
              isDark={isDark}
              deptColors={deptColors}
              onSelectDept={handleSelectDeptFromMap}
              porDepartamento={porDepartamento}
              resumenesPorDepto={resumenesPorDepto}
            />
          </div>
        </Card>

        <Card>
          <label className="text-[10px] text-theme-muted uppercase tracking-wide block mb-2">
            Departamento
          </label>
          <select
            value={codigoSeleccionado}
            onChange={(e) => setCodigoSeleccionado(e.target.value)}
            disabled={loadingDeptos}
            className="w-full sm:w-80 bg-dash-chip border border-theme-card rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-amber-500/50"
          >
            {loadingDeptos && <option>Cargando…</option>}
            {departamentos.map((d) => (
              <option key={d.codigo_dane_departamento} value={d.codigo_dane_departamento}>
                {d.nombre_departamento} ({d.n_municipios} municipios en la ontología)
              </option>
            ))}
          </select>
        </Card>

        {error && (
          <Card className="border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {resumen && !loadingResumen && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiChip label="Comunidades energéticas" value={resumen.n_comunidades} delay={0.05} />
              <KpiChip label="Contratos OR" value={resumen.n_contratos_or_fisico} delay={0.1} />
              <KpiChip label="Proyectos FENOGE" value={resumen.n_proyectos_fenoge} delay={0.15} />
              <KpiChip label="Colombia Solar" value={resumen.n_proyectos_colombia_solar} delay={0.2} />
              <KpiChip label="Registros subsidios" value={resumen.n_registros_subsidios_mapa} delay={0.25} />
              <KpiChip label="Contratos supervisión" value={resumen.n_contratos_supervision} delay={0.3} />
            </div>

            <Card delay={0.35}>
              <p className="text-xs text-theme-muted leading-relaxed">
                Este cruce combina 6 esquemas de base de datos que antes no tenían ninguna
                relación formal entre sí (sin foreign keys, sin catálogo geográfico
                compartido). La cobertura de la ontología es progresiva: departamentos y
                municipios se resuelven a medida que se cargan y curan nuevos datos —
                ver <code className="text-gold">/v1/ontologia/alias/pendientes</code> para
                el backlog de curación.
              </p>
            </Card>
          </>
        )}

        {loadingResumen && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-24 rounded-2xl bg-theme-secondary border border-theme-card"
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
