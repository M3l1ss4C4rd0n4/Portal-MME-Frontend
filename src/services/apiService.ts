/**
 * Capa de servicios para consumir las API Routes de Next.js.
 * Todas las funciones son cliente-safe (usan fetch global).
 */

import type { NewsItem } from "@/types/home-slider";
import type {
  Departamento,
  ResumenDepartamento,
  ResultadoBusquedaTexto,
  Empresa,
  VecindarioEmpresa,
  SaludDatos,
  Metrica,
} from "@/types/ontologia";

/* ─── Error estandarizado ───────────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public endpoint: string
  ) {
    super(`[${endpoint}] ${message}`);
    this.name = "ApiError";
  }
}

/* ─── Helpers internos ──────────────────────────────────────────────────── */

async function apiGet<T>(endpoint: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(res.status, text || `HTTP ${res.status}`, endpoint);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Tipos de respuesta ────────────────────────────────────────────────── */

export interface SectorSnapshot {
  generacionGwh: number;
  precioBolsa: number;
  pctEmbalses: number;
  embalseGwh?: number | null;
  capacidadEmbalseGwh?: number | null;
  aportesHidricos?: {
    actualGwh: number;
    historicoGwh: number;
    pct?: number | null;
    dailyActualGwh?: number | null;
    dailyHistGwh?: number | null;
  };
  tendencias?: Record<string, unknown> | null;
  oniActual?: number | null;
  oniClasificacion?: string | null;
  oniFecha?: string | null;
  oniProyeccionInicio?: string | null;
  fechaGeneracion?: string | null;
  fechaPrecio?: string | null;
  fechaEmbalse?: string | null;
  fechaAportes?: string | null;
  ultimaActualizacion?: string | null;
  ultimaEjecucionETL?: string | null;
}

export interface SectorDetalle {
  error?: string;
  generacionPorFuente: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
    generacionGwh: number;
  }>;
  precioBolsa: {
    actual: number;
    historico: Array<{
      id: string;
      color: string;
      data: Array<{ x: string; y: number; fecha?: Date }>;
    }>;
  };
  embalses: {
    promedioNacional: number;
    detalle: Array<{
      codigo: string;
      nombre: string;
      porcentaje: number;
      capacidadGwh: number;
    }>;
  };
  aportes: {
    fecha?: Date;
    rios: Array<{
      codigo: string;
      nombre: string;
      actualGwh: number;
      historicoGwh: number;
      porcentaje: number;
    }>;
  };
  sparklines: {
    embalses: Array<{ x: string; y: number }>;
    aportes: Array<{ x: string; y: number }>;
  };
}

export interface PresupuestoResumen {
  totales: {
    apropiacion: number;
    comprometido: number;
    pct_comprometido: number;
    obligados: number;
    pct_obligado: number;
  };
}

export interface ComunidadesData {
  implementadas: number;
  inversionEstimada: number;
  capacidadKwp: number;
  porDepartamento?: Array<{
    departamentoGeo: string;
    departamento: string;
    count: number;
    capacidad: number;
  }>;
  porMunicipio?: Record<string, Array<{ municipio: string; count: number }>>;
}

export interface ContratosORData {
  nContratos: number;
  avanceGeneral: number;
  avanceFinanciero: number;
  nUsuarios?: number;
  nCEs?: number;
  inversionTotal?: number;
  potenciaTotal?: number;
}

export interface SupervisionData {
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
  porFondo: Array<{ fondo: string; contratos: number }>;
}

export interface SubsidiosData {
  deficitAcumulado: number;
  anio2025: {
    resoluciones: number;
    valorAsignado: number;
    pendiente: number;
    pagado: number;
  };
  anio2026: {
    resoluciones: number;
    valorAsignado: number;
    pendiente: number;
    pagado: number;
  };
}

export interface SubsidiosDeficitHistorico {
  data?: Array<{
    anio: number;
    deficit_acumulado?: number;
    subsidios?: number;
    contribuciones?: number;
  }>;
}

export interface CUData {
  cuMayoristaLac: number;
  cuUsuarioFinal: number;
  fecha?: string;
  error?: string;
}

export interface CUEvolucionData {
  error?: string;
  daily: {
    series: Array<{
      id: string;
      color: string;
      data: Array<{ x: string; y: number }>;
    }>;
    totalSeries: Array<{
      id: string;
      color: string;
      data: Array<{ x: string; y: number }>;
    }>;
  };
  latest: {
    fecha: string;
    cu_total: number;
    cu_usuario_final: number;
    componentes: Record<string, number | null>;
  } | null;
}

export interface ValidacionesData {
  resumen?: Record<string, number>;
  ultimaActualizacion?: string;
}

export interface FenogeData {
  error?: string;
  totalCes: number;
  totalKwp: number;
  totalInversion: number;
  porDepartamento?: Array<{
    departamentoGeo: string;
    departamento: string;
    count: number;
  }>;
  porMunicipio?: Record<string, Array<{ municipio: string; count: number }>>;
}

export interface NoticiasResponse {
  noticias: NewsItem[];
}

/* ─── Servicios exportados ──────────────────────────────────────────────── */

export async function fetchSector(): Promise<SectorSnapshot> {
  return apiGet<SectorSnapshot>("/api/sector");
}

export async function fetchSectorDetalle(): Promise<SectorDetalle> {
  return apiGet<SectorDetalle>("/api/sector/detalle");
}

export async function fetchPresupuesto(): Promise<PresupuestoResumen> {
  return apiGet<PresupuestoResumen>("/api/presupuesto");
}

export async function fetchComunidades(): Promise<ComunidadesData> {
  return apiGet<ComunidadesData>("/api/comunidades");
}

export async function fetchContratosOR(): Promise<ContratosORData> {
  return apiGet<ContratosORData>("/api/contratos-or");
}

export async function fetchSupervision(): Promise<SupervisionData> {
  return apiGet<SupervisionData>("/api/supervision");
}

export async function fetchSubsidios(): Promise<SubsidiosData> {
  return apiGet<SubsidiosData>("/api/subsidios");
}

export async function fetchSubsidiosDeficitHistorico(): Promise<SubsidiosDeficitHistorico> {
  return apiGet<SubsidiosDeficitHistorico>("/api/subsidios/deficit-historico");
}

export async function fetchCU(): Promise<CUData> {
  return apiGet<CUData>("/api/cu");
}

export async function fetchCUEvolucion(): Promise<CUEvolucionData> {
  return apiGet<CUEvolucionData>("/api/cu-evolucion");
}

export async function fetchValidaciones(): Promise<ValidacionesData> {
  return apiGet<ValidacionesData>("/api/subsidios/validaciones");
}

export async function fetchFenoge(): Promise<FenogeData> {
  return apiGet<FenogeData>("/api/fenoge");
}

/* ─── Ontología (Fase 1/2 Palantir-IA) ──────────────────────────────────── */

export async function fetchDepartamentos(): Promise<{ departamentos: Departamento[] }> {
  return apiGet<{ departamentos: Departamento[] }>("/api/ontologia/geografia");
}

export async function fetchResumenDepartamento(
  codigoDaneDepartamento: string
): Promise<ResumenDepartamento> {
  return apiGet<ResumenDepartamento>(
    `/api/ontologia/geografia/${encodeURIComponent(codigoDaneDepartamento)}/resumen`
  );
}

export async function buscarTextoContratos(
  query: string,
  topK = 5
): Promise<{ consulta: string; resultados: ResultadoBusquedaTexto[] }> {
  return apiGet<{ consulta: string; resultados: ResultadoBusquedaTexto[] }>(
    `/api/ontologia/buscar-texto?q=${encodeURIComponent(query)}&top_k=${topK}`
  );
}

export async function buscarEmpresas(
  params: { nit?: string; nombre?: string }
): Promise<{ empresas: Empresa[] }> {
  const qs = params.nit
    ? `nit=${encodeURIComponent(params.nit)}`
    : `nombre=${encodeURIComponent(params.nombre ?? "")}`;
  return apiGet<{ empresas: Empresa[] }>(`/api/ontologia/empresas?${qs}`);
}

export async function fetchVecindarioEmpresa(
  empresaId: number,
  limit = 50
): Promise<VecindarioEmpresa> {
  return apiGet<VecindarioEmpresa>(
    `/api/ontologia/grafo/empresa/${empresaId}?limit=${limit}`
  );
}

export async function fetchSaludDatos(): Promise<SaludDatos> {
  return apiGet<SaludDatos>("/api/ontologia/salud");
}

export async function fetchCatalogoMetricas(): Promise<{ metricas: Metrica[] }> {
  return apiGet<{ metricas: Metrica[] }>("/api/ontologia/metricas");
}

export async function fetchNoticias(): Promise<NoticiasResponse> {
  return apiGet<NoticiasResponse>("/api/noticias");
}
