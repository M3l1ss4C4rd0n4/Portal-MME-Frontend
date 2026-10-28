/** Formas que devuelve `GET /api/subsidios/empresas-detalle`. */

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

/** Medidas comunes al resumen y a su despliegue por empresa. */
interface MedidasPeriodo {
  anio: number;
  trimestre: number;
  fondo: string | null;
  /** Estado con prefijo de orden («e. VF», «z. Sin validación»). */
  estado: string;
  validaciones: number;
  resoluciones: number;
  /** Extremos del número de resolución; nulos si el grupo no tiene pagos. */
  resMin: number | null;
  resMax: number | null;
  valorResolucion: number;
  valorPagado: number;
  saldoPendiente: number;
  pctEjecucion: number;
}

/** Una fila de la tabla: año, trimestre, fondo y estado de validación. */
export interface FilaResumen extends MedidasPeriodo {
  empresas: number;
}

/** Una empresa dentro de una fila del resumen. */
export interface FilaDetalleEmpresa extends MedidasPeriodo {
  empresaKey: string;
  nombre: string;
  /** Código SUI, o null cuando la clave se resolvió por nombre. */
  codigo: string | null;
  /**
   * Códigos SUI distintos de esa empresa en el grupo. Más de uno significa
   * que opera en el SIN y en las ZNI, y que SUI le dio un código por mercado.
   */
  codigos: number;
  nit: string | null;
}

export interface OpcionEmpresa {
  key: string;
  nombre: string;
  /** Código SUI y NIT: distinguen las empresas que comparten razón social. */
  codigo: string | null;
  nit: string | null;
}

export interface FiltrosOpciones {
  empresas: OpcionEmpresa[];
}

export interface Corte {
  anio: number;
  mes: number;
}

/** Extremos del período disponible, en índice de trimestre. */
export interface RangoPeriodo {
  min: number;
  max: number;
}

export interface EmpresasDetalleData {
  corte: string | null;
  cortesDisponibles: Corte[];
  /** Fecha de la carga de validaciones que se muestra del corte elegido. */
  cargaValidaciones: string | null;
  fechaCarga: string | null;
  kpis: KpisEmpresas;
  validacionPorTrimestre: PuntoValidacion[];
  pagosPorTrimestre: PuntoPago[];
  resumen: FilaResumen[];
  /** Despliegue por empresa de cada fila del resumen, ya resuelto. */
  detalle: FilaDetalleEmpresa[];
  periodoDisponible: RangoPeriodo;
  filtrosOpciones: FiltrosOpciones;
}

/**
 * Selección vigente de los filtros.
 *
 * Quedan dos: la empresa (multivalor, un arreglo vacío significa «Todas») y el
 * período, que viaja como índice de trimestre y siempre tiene valor. Fondo y
 * área salieron del filtro a pedido del área; siguen siendo columnas de la
 * tabla.
 */
export interface FiltrosEmpresasState {
  empresa: string[];
}

export const FILTROS_VACIOS: FiltrosEmpresasState = {
  empresa: [],
};
