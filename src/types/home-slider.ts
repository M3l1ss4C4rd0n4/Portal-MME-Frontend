import type { MetricaTendencia } from "@/components/ui/TrendBadge";

export interface UmbralesRegulatorios {
  sendaReferenciaPct?: number;
  indiceNe?: string;
  indiceHsin?: string;
  indicePbp?: string;
  condicionSistema?: string;
  pei?: number;
  pe?: number;
  pes?: number;
  preciosOrigen?: string;
}

export interface AportesHidricosSnapshot {
  actualGwh: number;
  historicoGwh: number;
  /** HSIN oficial (4 semanas) — indicador regulatorio primario */
  pct?: number | null;
  hsinPct?: number | null;
  pctMtd?: number | null;
  indiceHsin?: string | null;
  dailyActualGwh?: number | null;
  dailyHistGwh?: number | null;
}

export interface NewsItem {
  titulo?: string;
  title?: string;
  resumen?: string;
  fuente?: string;
  url?: string;
  imagen?: string;
  image?: string;
  fecha?: string;
}

export interface TermicaSliderData {
  generacionTermica: {
    gwh: number;
    participacionPct: number;
    fecha: string | null;
    tendencia: MetricaTendencia;
  };
  precios: {
    escasez: {
      valor: number;
      fecha: string | null;
      variacion: number | null;
      tendencia: MetricaTendencia;
    };
    ppp: {
      valor: number;
      fecha: string | null;
      variacion: number | null;
      tendencia: MetricaTendencia;
    };
    mayor: "escasez" | "ppp";
  };
  plantas: Array<{
    codigo: string;
    nombre: string;
    generacionGwh: number;
    participacionPct: number;
  }>;
  evolucionTermica: Array<{
    id: string;
    color: string;
    data: Array<{ x: string; y: number; fecha?: Date }>;
  }>;
  evolucionTotal: Array<{
    id: string;
    color: string;
    data: Array<{ x: string; y: number; fecha?: Date }>;
  }>;
}

export interface HomeSliderProps {
  sectorData: {
    generacionGwh: number;
    precioBolsa: number;
    pctEmbalses: number;
    embalseGwh?: number | null;
    capacidadEmbalseGwh?: number | null;
    aportesHidricos?: AportesHidricosSnapshot;
    umbralesRegulatorios?: UmbralesRegulatorios | null;
    estadoSin?: string | null;
    colorSin?: string | null;
    tendencias?: {
      embalses?: MetricaTendencia | null;
      precio?: MetricaTendencia | null;
      generacion?: MetricaTendencia | null;
      aportes?: MetricaTendencia | null;
    } | null;
    fechaGeneracion?: string | null;
    fechaPrecio?: string | null;
    fechaEmbalse?: string | null;
    fechaAportes?: string | null;
    ultimaActualizacion?: string | null;
    ultimaEjecucionETL?: string | null;
  };
  sectorDetalle?: {
    generacionPorFuente: Array<{ id: string; label: string; value: number; color: string; generacionGwh: number }>;
    precioBolsaSeries: Array<{ id: string; color: string; data: Array<{ x: string; y: number; fecha?: Date }> }>;
    embalsesPromedio: number;
    embalses: Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh: number }>;
    aportesRios: Array<{ codigo: string; nombre: string; actualGwh: number; historicoGwh: number; porcentaje: number }>;
    sparklines: { embalses: Array<{ x: string; y: number }>; aportes: Array<{ x: string; y: number }> };
  };
  termicaData?: TermicaSliderData;
  presuData: {
    totales: {
      apropiacion: number;
      comprometido: number;
      pct_comprometido: number;
      obligados: number;
      pct_obligado: number;
    };
    ultimaActualizacion?: string | null;
  };
  cemData: { implementadas: number; inversionEstimada: number; capacidadKwp: number };
  cemDepts?: Array<{ name: string; count: number; capacidad?: number }>;
  orData: {
    nContratos: number;
    avanceGeneral: number;
    avanceFinanciero: number;
    nUsuarios: number;
    nCEs: number;
    inversionTotal: number;
    potenciaTotal: number;
  };
  supData: {
    nContratos: number;
    nProyectos: number;
    enEjecucion: number;
    enAOM: number;
    enLiquidacion: number;
    liquidados: number;
    perdidaCompetencia: number;
    avanceFisico: number;
    avanceFinanciero: number;
    avanceFisicoActivos: number;
    avanceFinancieroActivos: number;
    porFondo: { fondo: string; contratos: number }[];
  };
  subData: {
    deficitAcumulado: number;
    anio2025: { resoluciones: number; valorAsignado: number; pendiente: number; pagado: number };
    anio2026: { resoluciones: number; valorAsignado: number; pendiente: number; pagado: number };
    historico?: { anio: number; fondo: string; valor_asignado: number; pagado: number; pendiente: number }[];
    ultimaActualizacion?: string | null;
  };
  deficitFssri?: number;
  deficitSeries?: Array<{ x: string; y: number }>;
  subBarData?: Array<{ anio: string; Subsidios: number; Contribuciones: number }>;
}
