/** Formas que devuelve `GET /api/subsidios/empresas-detalle`. */

export interface EmpresaDetalle {
  key: string;
  nombre: string;
  nit: string | null;
  departamento: string;
  fondo: string | null;
  area: string | null;
  vf: number;
  vp: number;
  vi: number;
  viSp: number;
  otros: number;
  totalValidaciones: number;
  pagos: number;
  valorResolucion: number;
  valorPagado: number;
  saldoPendiente: number;
  pctEjecucion: number;
}

export interface PuntoValidacion {
  periodo: string;
  anio: number;
  trimestre: number;
  VF: number;
  VP: number;
  VI: number;
  "VI SP": number;
  Otros: number;
}

export interface PuntoPago {
  periodo: string;
  anio: number;
  trimestre: number;
  pagos: number;
  valorPagado: number;
}

export interface KpisEmpresas {
  totalPagos: number;
  valorResolucion: number;
  valorPagado: number;
  saldoPendiente: number;
  pctEjecucion: number;
  totalEmpresas: number;
  totalValidaciones: number;
}

export interface OpcionEmpresa {
  key: string;
  nombre: string;
}

export interface FiltrosOpciones {
  empresas: OpcionEmpresa[];
  anios: number[];
  trimestres: number[];
  fondos: string[];
  areas: string[];
}

export interface Corte {
  anio: number;
  mes: number;
}

export interface EmpresasDetalleData {
  corte: string | null;
  cortesDisponibles: Corte[];
  fechaCarga: string | null;
  kpis: KpisEmpresas;
  validacionPorTrimestre: PuntoValidacion[];
  pagosPorTrimestre: PuntoPago[];
  empresas: EmpresaDetalle[];
  filtrosOpciones: FiltrosOpciones;
}

/** Selección vigente de los cinco filtros. Un arreglo vacío significa "Todos". */
export interface FiltrosEmpresasState {
  empresa: string[];
  anio: string[];
  trimestre: string[];
  fondo: string[];
  area: string[];
}

export const FILTROS_VACIOS: FiltrosEmpresasState = {
  empresa: [],
  anio: [],
  trimestre: [],
  fondo: [],
  area: [],
};
