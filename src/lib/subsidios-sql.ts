/**
 * Fragmentos SQL compartidos del esquema `subsidios`.
 *
 * Los tableros de Validaciones, Pagos y Detalle Empresas leen las mismas dos
 * tablas y necesitan normalizarlas igual. Tenerlo en un solo sitio evita que
 * cada endpoint clasifique los estados a su manera y muestre cifras distintas
 * para el mismo dato.
 *
 * Todas las funciones devuelven texto SQL y no interpolan nada que venga del
 * usuario: el `alias` lo fija el propio endpoint.
 */

/** Estados de validación, en el orden en que deben graficarse. */
export const ESTADOS_VALIDACION = [
  "e. VF",
  "d. VP",
  "b. VI",
  "c. VI SP",
  "a. Otros",
] as const;

export type EstadoValidacion = (typeof ESTADOS_VALIDACION)[number];

/** Etiqueta corta para ejes y leyendas, sin el prefijo de ordenamiento. */
export function etiquetaEstado(estado: string): string {
  return estado.replace(/^[a-e]\.\s*/, "");
}

/**
 * Clave estable de empresa.
 *
 * `nombre_prestador` no identifica una empresa: en `subsidios_pagos` hay 311
 * nombres distintos para solo 169 `codigo_sui`, porque la misma razón social
 * llega con puntuación y espacios distintos («CARIBEMAR DE LA COSTA S.A.S.
 * E.S.P.» aparece con tres grafías). Agrupar por nombre crudo parte las
 * empresas grandes en varias filas.
 *
 * Se usa `codigo_sui` cuando existe y, como respaldo, el nombre reducido a
 * letras y dígitos — necesario porque el 5 % de las filas de pagos no trae
 * código.
 *
 * Al código se le quita el sufijo `-F`: no es otra empresa, es la misma bajo
 * el fondo FOES. En el catálogo, `1411` y `1411-F` comparten razón social
 * (CARIBEMAR DE LA COSTA S.A.S. E.S.P.). Sin quitarlo, 17 empresas salen
 * duplicadas en la tabla.
 */
export function codigoBaseSql(alias: string): string {
  return `NULLIF(REGEXP_REPLACE(TRIM(${alias}.codigo_sui), '-F$', ''), '')`;
}

export function nombreNormalizadoSql(alias: string): string {
  return `UPPER(REGEXP_REPLACE(COALESCE(${alias}.nombre_prestador, ''), '[^A-Za-z0-9]+', '', 'g'))`;
}

/**
 * Consulta que arma el mapa nombre normalizado → código.
 *
 * El 5 % de las filas de pagos no trae `codigo_sui`, pero sí el nombre de una
 * empresa que en otras filas sí lo tiene. Se ejecuta UNA vez por petición (y
 * se cachea): recorre las dos tablas, así que cuesta ~600 ms y no debe
 * repetirse por consulta.
 */
export function consultaMapaEmpresas(): string {
  const fuente = (tabla: string, alias: string) => `
    SELECT ${nombreNormalizadoSql(alias)} AS nom, ${codigoBaseSql(alias)} AS cod
    FROM ${tabla} ${alias}
    WHERE ${codigoBaseSql(alias)} IS NOT NULL`;
  return `
    SELECT DISTINCT ON (nom) nom, cod FROM (${fuente("subsidios.subsidios_pagos", "mp")}
      UNION ALL${fuente("subsidios.subsidios_validaciones", "mv")}
    ) t
    WHERE nom <> ''
    ORDER BY nom, cod`;
}

/**
 * CTE con el mapa ya resuelto, recibido como dos arreglos.
 *
 * Se pasa desde el cliente en vez de recalcularlo dentro de cada consulta:
 * reconstruirlo costaba 625 ms por consulta y había diez por petición.
 */
export function mapaEmpresasCte(paramNom: string, paramCod: string, nombre = "mapa_empresa"): string {
  // El mapa se agrega a un único objeto jsonb para que la búsqueda por nombre
  // sea por clave y no un recorrido. Como CTE de filas, cada consulta lo
  // recorría entero por cada fila sin código: la consulta de opciones de
  // empresa tardaba 2.979 ms; con jsonb tarda 38 ms.
  //
  // MATERIALIZED evita que PostgreSQL vuelva a construir el objeto en cada
  // referencia (desde la versión 12 las CTE se insertan por defecto).
  return `${nombre} AS MATERIALIZED (
    SELECT jsonb_object_agg(nom, cod) AS j
    FROM unnest(${paramNom}::text[], ${paramCod}::text[]) AS t(nom, cod)
  )`;
}

/**
 * Clave estable de empresa.
 *
 * Orden de preferencia: el código propio de la fila, el código que le
 * corresponde a su nombre, y como último recurso el nombre normalizado.
 *
 * El rescate por nombre es una subconsulta dentro de `COALESCE`, no un JOIN,
 * **a propósito**: `COALESCE` evalúa de izquierda a derecha y se detiene en el
 * primer valor no nulo, así que la subconsulta y su expresión regular solo se
 * ejecutan en las filas que de verdad no traen código. Con JOIN, la misma
 * agregación tardaba 1.040 ms; así tarda 24 ms.
 */
export function empresaKeySql(alias: string, cte = "mapa_empresa"): string {
  const nom = nombreNormalizadoSql(alias);
  return `COALESCE(
    ${codigoBaseSql(alias)},
    (SELECT j ->> ${nom} FROM ${cte}),
    'NOM:' || ${nom}
  )`;
}

/**
 * Estado de validación normalizado.
 *
 * `estado_validacion_organizado` está en NULL en el 80 % de las filas, así que
 * el respaldo es `estado_validacion`, que llega sucio: variantes de caja
 * (`Vf`, `vf`), espacios al final (`'VI '`) y dos grafías para el mismo estado
 * (`VI_SP` y `VI SP`).
 *
 * El CASE anterior —en el endpoint de validaciones— comparaba contra el texto
 * crudo, así que 1.622 filas caían en «Otros» sin serlo.
 */
export function estadoValidacionSql(alias: string): string {
  const crudo = `TRIM(UPPER(COALESCE(${alias}.estado_validacion, '')))`;
  return `CASE
    WHEN ${alias}.estado_validacion_organizado IS NOT NULL THEN ${alias}.estado_validacion_organizado
    WHEN ${crudo} = 'VF' THEN 'e. VF'
    WHEN ${crudo} = 'VP' THEN 'd. VP'
    WHEN ${crudo} = 'VI' THEN 'b. VI'
    WHEN ${crudo} IN ('VI SP', 'VI_SP') THEN 'c. VI SP'
    ELSE 'a. Otros'
  END`;
}

/**
 * Área normalizada: las filas de FOES llegan con `area` nula o 'NA' y
 * corresponden al SIN. Mismo criterio que ya aplica el tablero de Validaciones.
 */
export function areaSql(alias: string): string {
  return `CASE
    WHEN (${alias}.area = 'NA' OR ${alias}.area IS NULL) AND ${alias}.fondo = 'FOES' THEN 'SIN'
    ELSE ${alias}.area
  END`;
}

/**
 * Año y trimestre de una fila de pagos.
 *
 * No se usa la columna `trimestre` de `subsidios_pagos`: viene nula en el 34 %
 * de las filas. `anio_trimestre_resolucion` sí está completa y con formato
 * `YYYY/TN` en el 100 % de los registros.
 */
export function anioPagosSql(alias: string): string {
  return `LEFT(${alias}.anio_trimestre_resolucion, 4)::int`;
}

export function trimestrePagosSql(alias: string): string {
  return `RIGHT(${alias}.anio_trimestre_resolucion, 1)::int`;
}

/**
 * Identidad de una resolución, para `COUNT(DISTINCT ...)`.
 *
 * El número solo no basta: se repite entre años (la resolución 1463 aparece
 * en ocho años distintos, de 2017 a 2024). Contando solo el número salen 586
 * resoluciones cuando hay 610.
 *
 * El año que identifica es el de la propia resolución, no el del pago: por el
 * año de pago salen 781 porque una resolución se paga a lo largo de varios
 * años. Que `anio_trimestre_resolucion` y `fecha_resolucion` den exactamente
 * el mismo conteo (610) confirma cuál es el correcto.
 */
export function resolucionDistintaSql(alias: string): string {
  return `(${alias}.no_resolucion, LEFT(${alias}.anio_trimestre_resolucion, 4))`;
}

/** Etiqueta de periodo para el eje de las gráficas: «2026 T1». */
export function periodoLabel(anio: number, trimestre: number): string {
  return `${anio} T${trimestre}`;
}

/**
 * Porcentaje de ejecución de un monto pagado sobre el asignado.
 *
 * No se acota a 100: en la fuente hay resoluciones con `pct_pagado` de hasta
 * 1,34, es decir pagos por encima del valor de la resolución. Recortarlo
 * escondería un dato que el área debe poder ver.
 */
export function pctEjecucion(valorPagado: number, valorResolucion: number): number {
  if (!valorResolucion) return 0;
  return (valorPagado / valorResolucion) * 100;
}
