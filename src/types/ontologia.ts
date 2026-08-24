/**
 * Tipos de dominio centralizados para la capa de ontología (Fase 1/2 Palantir-IA).
 * Reflejan la respuesta real de los endpoints /v1/ontologia/* del backend FastAPI —
 * ver server/api/v1/routes/ontologia.py.
 */

export interface Departamento {
  codigo_dane_departamento: string;
  nombre_departamento: string;
  n_municipios: number;
}

export interface ResumenDepartamento {
  codigo_dane_departamento: string;
  nombre_departamento: string;
  n_comunidades: number;
  n_contratos_or_fisico: number;
  n_proyectos_fenoge: number;
  n_proyectos_colombia_solar: number;
  n_registros_subsidios_mapa: number;
  n_contratos_supervision: number;
}

export interface ResultadoBusquedaTexto {
  fuente: "contrato" | "informe";
  esquema_origen: string | null;
  tabla_origen: string | null;
  fila_id: number | null;
  campo: string | null;
  contenido: string;
  similitud: number;
  repeticiones: number;
  nombre_archivo: string | null;
  chunk_index: number | null;
}

/* ─── Catálogo de métricas (Fase 12/13) ─────────────────────────────────── */

export interface MetricaRelacion {
  relacion_id: number;
  tipo_relacion: "insumo_de" | "se_compara_con" | "compone_indice";
  descripcion: string;
  referencia_normativa: string | null;
  origen_id: number;
  origen_codigo: string;
  origen_nombre: string;
  destino_id: number;
  destino_codigo: string;
  destino_nombre: string;
}

export interface Metrica {
  metrica_id: number;
  codigo_tecnico: string;
  nombre_display: string;
  dominio: string;
  esquema_origen: string | null;
  tabla_origen: string | null;
  columna_origen: string | null;
  unidad: string | null;
  fuente: string;
  descripcion: string | null;
  es_indice_regulatorio: boolean;
  referencia_normativa: string | null;
  estado: "catalogado" | "pendiente_curacion";
  creado_en: string;
  relaciones?: MetricaRelacion[];
}

/* ─── Salud de datos / linaje (Fase 6) ──────────────────────────────────── */

export interface LineageRow {
  pipeline: string;
  paso: string;
  estado: "en_progreso" | "exito" | "error";
  filas_afectadas: number | null;
  detalle: string | null;
  iniciado_en: string;
  finalizado_en: string | null;
}

export interface SaludDatos {
  deuda_ontologia: {
    geografia_sin_resolver: number;
    empresas_sin_resolver: number;
  };
  lineage_reciente: LineageRow[];
  corridas_con_error_recientes: number;
}

/* ─── Grafo de relaciones (Fase 5) ──────────────────────────────────────── */

export interface Empresa {
  empresa_id: number;
  nit: string | null;
  nit_normalizado: string;
  codigo_sui: string | null;
  nombre_oficial: string;
  sigla: string | null;
  tipo_empresa: string | null;
  score?: number;
}

export interface ContratoSupervision {
  id: number;
  codcontrato: string | null;
  ejecutor: string;
  departamento: string;
  municipio: string;
  codigo_dane_departamento: number | null;
  codigo_dane_municipio: number | null;
  fondo: string | null;
  numero_bpin: string | null;
  estado_del_contrato: string | null;
  avance_contrato: number | string | null;
  link_secop: string | null;
}

export interface MencionNoVerificada {
  esquema: string;
  tabla: string;
  valor_original: string;
}

export interface ProyectoRelacionado {
  nombre_proyecto_id: string;
  departamento: string;
  municipio: string;
  avance: number | string | null;
  proyecto_id: number | null;
  metodo_empresa: string;
  confianza_empresa: number | string | null;
}

export interface EmpresaEnMismaZona {
  empresa_id: number;
  nombre_oficial: string;
  sigla: string | null;
  nit: string | null;
  n_contratos_en_zona: number;
}

export interface VecindarioEmpresa {
  empresa: Empresa;
  nodos: Array<{ tipo: string; id: string; datos: Record<string, unknown> }>;
  aristas: Array<{ origen: string; destino: string; tipo: string; confianza: string }>;
  contratos_verificados: number;
  total_contratos_verificados: number;
  proyectos_relacionados: ProyectoRelacionado[];
  empresas_en_misma_zona: EmpresaEnMismaZona[];
  menciones_no_verificadas: MencionNoVerificada[];
  nota: string;
}
