"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import BarLineChart, { type BarLinePunto } from "@/components/dashboard/BarLineChart";
import FiltrosEmpresas from "@/components/subsidios/FiltrosEmpresas";
import GraficaValidacion from "@/components/subsidios/GraficaValidacion";
import TablaResumenPeriodo from "@/components/subsidios/TablaResumenPeriodo";
import { getNivoTheme } from "@/lib/nivo-theme";
import { fmtCOP, fmtCompactNum, fmtNum, formatPct } from "@/lib/format";
import {
  FILTROS_VACIOS,
  type EmpresasDetalleData,
  type FiltrosEmpresasState,
} from "@/types/subsidios-empresas";

/**
 * Espera antes de recargar al mover el deslizador.
 *
 * El control dispara `onChange` en cada píxel; sin esto, arrastrarlo de un
 * extremo al otro lanzaría decenas de peticiones. Mismo valor que usa el
 * deslizador de años del tablero de Supervisión.
 */
const DEBOUNCE_PERIODO_MS = 400;

/** Período vigente. `null` significa «todo lo disponible», que fija el backend. */
interface Periodo {
  desde: number | null;
  hasta: number | null;
}

const PERIODO_COMPLETO: Periodo = { desde: null, hasta: null };

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
  // Dos estados para el período: `periodo` sigue al deslizador en cada píxel y
  // `periodoAplicado` es el que viaja al backend, ya con la espera cumplida.
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_COMPLETO);
  const [periodoAplicado, setPeriodoAplicado] = useState<Periodo>(PERIODO_COMPLETO);
  const esperaPeriodo = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    filtros.empresa.forEach((v) => params.append("empresa", v));
    if (periodoAplicado.desde !== null) params.set("desde", String(periodoAplicado.desde));
    if (periodoAplicado.hasta !== null) params.set("hasta", String(periodoAplicado.hasta));
    if (corte) params.set("corte", corte);
    return params.toString();
  }, [filtros, periodoAplicado, corte]);

  /* Los filtros se leen de la URL al montar, igual que en el tablero de Pagos.
   * Es lo que permite que la captura de Playwright del informe PDF abra la
   * página ya filtrada: sin esto el PDF saldría siempre con el tablero
   * completo, da igual lo que el usuario tuviera puesto. */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("empresa")) setFiltros({ empresa: sp.getAll("empresa") });
    if (sp.has("corte")) setCorte(sp.get("corte"));
    const num = (k: string) => {
      const v = sp.get(k);
      const n = Number(v);
      return v !== null && Number.isFinite(n) ? n : null;
    };
    const rango: Periodo = { desde: num("desde"), hasta: num("hasta") };
    if (rango.desde !== null || rango.hasta !== null) {
      setPeriodo(rango);
      setPeriodoAplicado(rango);
    }
  }, []);

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
    // `corte` ya viaja dentro de buildQuery; no se declara aparte para no
    // disparar la petición dos veces. El backend elige el corte vigente cuando
    // el estado está en null y el selector lo muestra desde la respuesta.
  }, [buildQuery]);

  useEffect(() => () => {
    if (esperaPeriodo.current) clearTimeout(esperaPeriodo.current);
  }, []);

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
    setPeriodo(PERIODO_COMPLETO);
    setPeriodoAplicado(PERIODO_COMPLETO);
  }, [marcarCargando]);

  const handleCorte = useCallback(
    (nuevo: string) => {
      marcarCargando();
      setCorte(nuevo);
    },
    [marcarCargando]
  );

  const handlePeriodo = useCallback(
    (desde: number, hasta: number) => {
      setPeriodo({ desde, hasta });
      if (esperaPeriodo.current) clearTimeout(esperaPeriodo.current);
      esperaPeriodo.current = setTimeout(() => {
        marcarCargando();
        setPeriodoAplicado({ desde, hasta });
      }, DEBOUNCE_PERIODO_MS);
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
  const disponible = data?.periodoDisponible;

  return (
    <DashboardLayout
      title="Detalle Empresas"
      subtitle="Estado de validaciones y pagos de subsidios, empresa por empresa"
      downloadTablero="detalle-empresas"
      downloadQueryString={buildQuery()}
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
        <Kpi label="Cuentas" valor={kpis ? fmtNum(kpis.totalValidaciones) : "—"} nota="empresa · trimestre · fondo · mercado" color="#3B82F6" />
      </div>

      {/* ── Filtros ── */}
      <Card className="mb-4">
        {data && disponible && (
          <FiltrosEmpresas
            valores={filtros}
            opciones={data.filtrosOpciones}
            onChange={handleFiltro}
            onLimpiar={handleLimpiar}
            periodo={{
              desde: periodo.desde ?? disponible.min,
              hasta: periodo.hasta ?? disponible.max,
            }}
            periodoDisponible={disponible}
            onPeriodo={handlePeriodo}
            corte={corte ?? data.corte}
            cortes={data.cortesDisponibles}
            onCorte={handleCorte}
          />
        )}
      </Card>

      {/* ── Los dos paneles ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Los `id` no son decorativos: son los selectores con los que el
            informe PDF fotografía estas dos tarjetas. Sus títulos, «Validación»
            y «Pagos», son demasiado genéricos para localizarlas por texto. */}
        <Card className="flex flex-col" id="grafico-validacion-trimestre">
          <div className="mb-1">
            <h2 className="text-sm font-semibold text-theme-primary">Validación</h2>
            <p className="text-[11px] text-theme-muted">
              Validaciones por estado y trimestre
            </p>
          </div>
          <div style={{ height: 320 }}>
            {data && data.validacionPorTrimestre.length > 0 ? (
              <GraficaValidacion datos={data.validacionPorTrimestre} nivoTheme={nivoTheme} />
            ) : (
              <p className="text-xs text-theme-muted pt-8 text-center">Sin validaciones para los filtros aplicados.</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col" id="grafico-pagos-trimestre">
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

      {/* ── Resumen por período ── */}
      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-theme-primary">Resumen por período</h2>
          <p className="text-[11px] text-theme-muted">
            Clic en una fila para ver sus empresas, o en un encabezado para ordenar. Los valores de
            validación corresponden a la última carga del corte seleccionado
            {data?.cargaValidaciones
              ? ` (${new Date(data.cargaValidaciones).toLocaleDateString("es-CO")})`
              : ""}
            . La fila «Sin validación» recoge los pagos del período que no cruzan con ninguna
            validación de ese corte: sin ella el total de la tabla no cuadraría con los KPIs.
          </p>
          {/* La diferencia entre empresa y cuenta no es evidente y el área la
              preguntó: va escrita, no solo en el título emergente. */}
          <p className="text-[11px] text-theme-muted mt-1">
            Una <strong className="text-theme-secondary">cuenta</strong> es cada registro de la hoja
            de validaciones: una empresa, en un trimestre, un fondo y un mercado —SIN o ZNI—, con el
            estado al que llegó. Las filas que la hoja trae repetidas, idénticas en sus quince
            columnas, no se cuentan dos veces. Queda la marca{" "}
            <span className="text-amber-500">+N</span> para las empresas que sí tienen varias
            cuentas, normalmente porque operan a la vez en el SIN y en las ZNI.
          </p>
        </div>
        <TablaResumenPeriodo
          resumen={data?.resumen ?? []}
          detalle={data?.detalle ?? []}
          loading={loading}
        />
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
