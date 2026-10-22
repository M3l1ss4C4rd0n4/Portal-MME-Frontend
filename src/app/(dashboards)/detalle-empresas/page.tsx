"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import BarLineChart, { type BarLinePunto } from "@/components/dashboard/BarLineChart";
import FiltrosEmpresas from "@/components/subsidios/FiltrosEmpresas";
import TablaEmpresas from "@/components/subsidios/TablaEmpresas";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtCOP, fmtCompactNum, fmtNum, formatPct } from "@/lib/format";
import {
  FILTROS_VACIOS,
  type EmpresasDetalleData,
  type FiltrosEmpresasState,
} from "@/types/subsidios-empresas";

const ESTADOS = ["VF", "VP", "VI", "VI SP", "Otros"] as const;

/** VF cierra el ciclo, VI apenas lo abre: la escala de color va de ahí. */
const COLOR_ESTADO: Record<(typeof ESTADOS)[number], string> = {
  VF: "#10B981",
  VP: "#F59E0B",
  VI: "#3B82F6",
  "VI SP": "#8B5CF6",
  Otros: "#64748B",
};

function Kpi({ label, valor, nota, color }: { label: string; valor: string; nota?: string; color?: string }) {
  return (
    <Card className="flex flex-col justify-center">
      <div className="text-[10px] text-theme-muted uppercase tracking-wide font-semibold">{label}</div>
      <div
        className="text-2xl font-bold tabular-nums mt-1 leading-tight"
        style={{ color: color ?? "var(--color-gold)" }}
      >
        {valor}
      </div>
      {nota && <div className="text-[10px] text-theme-muted mt-1">{nota}</div>}
    </Card>
  );
}

export default function DetalleEmpresasPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nivoTheme = useMemo(() => getNivoTheme(isDark), [isDark]);

  const [data, setData] = useState<EmpresasDetalleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosEmpresasState>(FILTROS_VACIOS);
  const [corte, setCorte] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    (Object.keys(filtros) as (keyof FiltrosEmpresasState)[]).forEach((k) => {
      filtros[k].forEach((v) => params.append(k, v));
    });
    if (corte) params.set("corte", corte);
    return params.toString();
  }, [filtros, corte]);

  // El estado de carga se marca al disparar el cambio, no dentro del efecto:
  // un setState síncrono en el cuerpo del efecto provoca un render extra.
  useEffect(() => {
    let cancelled = false;
    const qs = buildQuery();

    fetch(`/api/subsidios/empresas-detalle/${qs ? `?${qs}` : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: EmpresasDetalleData) => {
        if (cancelled) return;
        setData(json);
        // El backend decide el corte vigente la primera vez; se adopta tal cual
        // para que el selector muestre lo mismo que se está graficando.
        if (!corte && json.corte) setCorte(json.corte);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error desconocido");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildQuery, corte]);

  const marcarCargando = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const handleFiltro = useCallback(
    (key: keyof FiltrosEmpresasState, value: string[]) => {
      marcarCargando();
      setFiltros((prev) => ({ ...prev, [key]: value }));
    },
    [marcarCargando]
  );

  const handleLimpiar = useCallback(() => {
    marcarCargando();
    setFiltros(FILTROS_VACIOS);
  }, [marcarCargando]);

  const handleCorte = useCallback(
    (nuevo: string) => {
      marcarCargando();
      setCorte(nuevo);
    },
    [marcarCargando]
  );

  const datosPagos: BarLinePunto[] = useMemo(
    () =>
      (data?.pagosPorTrimestre ?? []).map((p) => ({
        etiqueta: p.periodo,
        barra: p.pagos,
        linea: p.valorPagado,
      })),
    [data]
  );

  const kpis = data?.kpis;

  return (
    <DashboardLayout
      title="Detalle Empresas"
      subtitle="Estado de validaciones y pagos de subsidios, empresa por empresa"
    >
      {error && (
        <Card className="mb-4">
          <p className="text-sm text-red-400">
            No se pudo cargar el detalle por empresa ({error}).
          </p>
        </Card>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi label="Empresas" valor={kpis ? fmtNum(kpis.totalEmpresas) : "—"} />
        <Kpi label="Resoluciones" valor={kpis ? fmtNum(kpis.totalPagos) : "—"} nota="números distintos por año" />
        <Kpi label="Valor pagado" valor={kpis ? fmtCompactNum(kpis.valorPagado) : "—"} color="#10B981" />
        <Kpi
          label="% ejecución"
          valor={kpis ? formatPct(kpis.pctEjecucion, 1) : "—"}
          nota={kpis ? `sobre ${fmtCompactNum(kpis.valorResolucion)} asignados` : undefined}
        />
        <Kpi label="Validaciones" valor={kpis ? fmtNum(kpis.totalValidaciones) : "—"} nota="del corte seleccionado" color="#3B82F6" />
      </div>

      {/* ── Filtros ── */}
      <Card className="mb-4">
        {data && (
          <FiltrosEmpresas
            valores={filtros}
            opciones={data.filtrosOpciones}
            onChange={handleFiltro}
            onLimpiar={handleLimpiar}
            corte={corte ?? data.corte}
            cortes={data.cortesDisponibles}
            onCorte={handleCorte}
          />
        )}
      </Card>

      {/* ── Los dos paneles ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="flex flex-col">
          <div className="mb-1">
            <h2 className="text-sm font-semibold text-theme-primary">Validación</h2>
            <p className="text-[11px] text-theme-muted">
              Validaciones por estado y trimestre
            </p>
          </div>
          <div style={{ height: 320 }}>
            {data && data.validacionPorTrimestre.length > 0 ? (
              <ResponsiveBar
                data={data.validacionPorTrimestre as unknown as Record<string, string | number>[]}
                keys={[...ESTADOS]}
                indexBy="periodo"
                groupMode="grouped"
                innerPadding={1}
                padding={0.25}
                margin={{ top: 10, right: 10, bottom: 64, left: 56 }}
                colors={ESTADOS.map((e) => COLOR_ESTADO[e])}
                theme={nivoTheme}
                axisBottom={{ tickRotation: -45 }}
                axisLeft={{ format: (v: number) => fmtCompactNum(v) }}
                enableLabel={false}
                legends={[
                  {
                    dataFrom: "keys",
                    anchor: "bottom",
                    direction: "row",
                    translateY: 56,
                    itemWidth: 68,
                    itemHeight: 16,
                    symbolSize: 10,
                  },
                ]}
              />
            ) : (
              <p className="text-xs text-theme-muted pt-8 text-center">Sin validaciones para los filtros aplicados.</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="mb-1">
            <h2 className="text-sm font-semibold text-theme-primary">Pagos</h2>
            {/* Conteo y monto no comparten escala: el monto va en el eje derecho
                como línea, en vez de como una barra que no se puede comparar. */}
            <p className="text-[11px] text-theme-muted">
              Resoluciones y valor pagado por trimestre
            </p>
          </div>
          <div style={{ height: 320 }}>
            {datosPagos.length > 0 ? (
              <BarLineChart
                data={datosPagos}
                isDark={isDark}
                leyendaBarra="Resoluciones"
                leyendaLinea="Valor pagado"
                alto={320}
              />
            ) : (
              <p className="text-xs text-theme-muted pt-8 text-center">Sin pagos para los filtros aplicados.</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Tabla por empresa ── */}
      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-theme-primary">Detalle por empresa</h2>
          <p className="text-[11px] text-theme-muted">
            Clic en cualquier encabezado para ordenar. Los valores de validación corresponden al corte
            seleccionado; los de pago, a todo el periodo filtrado.
          </p>
        </div>
        <TablaEmpresas empresas={data?.empresas ?? []} loading={loading} />
      </Card>

      {data?.fechaCarga && (
        <p className="text-[10px] text-theme-muted mt-4 text-right">
          Datos actualizados al {new Date(data.fechaCarga).toLocaleString("es-CO")} · Valor pagado total{" "}
          {kpis ? fmtCOP(kpis.valorPagado) : "—"}
        </p>
      )}
    </DashboardLayout>
  );
}
