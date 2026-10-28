/**
 * Consultas del resumen por período del tablero Detalle Empresas.
 *
 * La tabla del tablero se agrupa por año, trimestre, fondo y estado de
 * validación. Eso obliga a cruzar dos tablas de grano distinto:
 * `subsidios_validaciones` aporta el estado y no tiene ninguna columna de
 * dinero; `subsidios_pagos` aporta el dinero y no sabe nada de estados.
 *
 * Viven aquí y no en `subsidios-sql.ts` porque son consultas completas, no
 * fragmentos reutilizables: ese archivo guarda los trozos que comparten los
 * tres tableros de subsidios.
 */

import {
  catalogoEmpresasCte,
  conteoValidacionesSql,
  empresaKeySql,
  estadoValidacionSql,
  anioPagosSql,
  trimestrePagosSql,
} from "./subsidios-sql";

/** Estado de las filas de pago que no cruzan con ninguna validación del corte. */
export const SIN_VALIDACION = "z. Sin validación";

/**
 * Un solo estado por empresa y período, para repartir el dinero.
 *
 * Una empresa puede tener varias validaciones en el mismo trimestre y fondo, y
 * en 6 de 3.487 grupos (0,17 %) no coinciden en estado. Si el pago se asignara
 * a todas, el dinero se contaría dos veces y la tabla dejaría de cuadrar con el
 * KPI. Se toma `MIN`, que por el prefijo de orden es el estado menos avanzado:
 * un trimestre no está validado del todo mientras le quede una cuenta sin VF.
 *
 * El conteo de validaciones NO usa esta reducción: ahí sí se cuentan todas las
 * filas, que es lo que suma 3.576 en el corte de octubre.
 */
function cteEstadoEmpresa(whereVal: string): string {
  return `estado_empresa AS (
    SELECT ${empresaKeySql("sv")} AS empresa_key,
           sv.anio, sv.trimestre, sv.fondo,
           MIN(${estadoValidacionSql("sv")}) AS estado
    FROM subsidios.subsidios_validaciones sv
    WHERE ${whereVal}
    GROUP BY 1, 2, 3, 4
  )`;
}

/** Cruce de una fila de pago con el estado de su empresa en ese período. */
function joinEstadoEmpresa(): string {
  return `LEFT JOIN estado_empresa ee
      ON ee.empresa_key = ${empresaKeySql("sp")}
     AND ee.anio        = ${anioPagosSql("sp")}
     AND ee.trimestre   = ${trimestrePagosSql("sp")}
     AND ee.fondo       = sp.fondo`;
}

/** Montos y resoluciones, iguales en los dos niveles de agregación. */
const MEDIDAS_PAGO = `
    COUNT(DISTINCT sp.no_resolucion)      AS resoluciones,
    MIN(sp.no_resolucion)                 AS res_min,
    MAX(sp.no_resolucion)                 AS res_max,
    COALESCE(SUM(sp.valor_resolucion), 0) AS valor_resolucion,
    COALESCE(SUM(sp.valor_pagado), 0)     AS valor_pagado,
    COALESCE(SUM(sp.saldo_pendiente), 0)  AS saldo_pendiente`;

/**
 * Resumen: una fila por año, trimestre, fondo y estado.
 *
 * El `FULL OUTER JOIN` es lo que hace que la tabla cuadre con los KPIs. Con un
 * `LEFT JOIN` desde validaciones se perdería el 70,3 % del dinero pagado —23,5
 * de los 33,4 billones—, que corresponde a pagos sin validación en el corte y
 * que aquí aparece en la fila «Sin validación».
 */
export function consultaResumenPeriodo(mapaCte: string, whereVal: string, wherePag: string): string {
  return `
    WITH ${mapaCte},
    ${cteEstadoEmpresa(whereVal)},
    val AS (
      SELECT sv.anio, sv.trimestre, sv.fondo,
             ${estadoValidacionSql("sv")}         AS estado,
             ${conteoValidacionesSql("sv")}       AS validaciones,
             COUNT(DISTINCT ${empresaKeySql("sv")}) AS empresas
      FROM subsidios.subsidios_validaciones sv
      WHERE ${whereVal}
      GROUP BY 1, 2, 3, 4
    ),
    pag AS (
      SELECT ${anioPagosSql("sp")}      AS anio,
             ${trimestrePagosSql("sp")} AS trimestre,
             sp.fondo,
             COALESCE(ee.estado, '${SIN_VALIDACION}') AS estado,
             COUNT(DISTINCT ${empresaKeySql("sp")})   AS empresas,
             ${MEDIDAS_PAGO}
      FROM subsidios.subsidios_pagos sp
      ${joinEstadoEmpresa()}
      WHERE ${wherePag}
      GROUP BY 1, 2, 3, 4
    )
    SELECT COALESCE(val.anio, pag.anio)           AS anio,
           COALESCE(val.trimestre, pag.trimestre) AS trimestre,
           COALESCE(val.fondo, pag.fondo)         AS fondo,
           COALESCE(val.estado, pag.estado)       AS estado,
           COALESCE(val.empresas, pag.empresas, 0) AS empresas,
           COALESCE(val.validaciones, 0)           AS validaciones,
           COALESCE(pag.resoluciones, 0)           AS resoluciones,
           pag.res_min, pag.res_max,
           COALESCE(pag.valor_resolucion, 0) AS valor_resolucion,
           COALESCE(pag.valor_pagado, 0)     AS valor_pagado,
           COALESCE(pag.saldo_pendiente, 0)  AS saldo_pendiente
    FROM val
    FULL OUTER JOIN pag
      ON  val.anio      = pag.anio
      AND val.trimestre = pag.trimestre
      AND val.fondo     = pag.fondo
      AND val.estado    = pag.estado
    ORDER BY 1 DESC, 2, 3, 4`;
}

/**
 * El mismo corte, un nivel más abajo: una fila por empresa dentro de cada
 * grupo. Es lo que se despliega al hacer clic en una fila del resumen.
 *
 * Viaja entero en la misma respuesta —3.493 filas en el corte completo— en vez
 * de pedirse por grupo: evita un segundo endpoint y un viaje por cada clic.
 */
export function consultaDetalleGrupos(mapaCte: string, whereVal: string, wherePag: string): string {
  return `
    WITH ${mapaCte},
    ${catalogoEmpresasCte()},
    ${cteEstadoEmpresa(whereVal)},
    val AS (
      SELECT ${empresaKeySql("sv")} AS empresa_key,
             sv.anio, sv.trimestre, sv.fondo,
             ${estadoValidacionSql("sv")} AS estado,
             MIN(sv.nombre_prestador)         AS nombre,
             ${conteoValidacionesSql("sv")}   AS validaciones,
             -- Para distinguir las dos razones por las que una empresa puede
             -- tener más de una cuenta: dos códigos SUI (opera en el SIN y en
             -- las ZNI) o la misma fila repetida en la fuente.
             COUNT(DISTINCT sv.codigo_sui)    AS codigos
      FROM subsidios.subsidios_validaciones sv
      WHERE ${whereVal}
      GROUP BY 1, 2, 3, 4, 5
    ),
    pag AS (
      SELECT ${empresaKeySql("sp")}    AS empresa_key,
             ${anioPagosSql("sp")}      AS anio,
             ${trimestrePagosSql("sp")} AS trimestre,
             sp.fondo,
             COALESCE(ee.estado, '${SIN_VALIDACION}') AS estado,
             MIN(sp.nombre_prestador) AS nombre,
             ${MEDIDAS_PAGO}
      FROM subsidios.subsidios_pagos sp
      ${joinEstadoEmpresa()}
      WHERE ${wherePag}
      GROUP BY 1, 2, 3, 4, 5
    ),
    unidas AS (
      SELECT COALESCE(val.empresa_key, pag.empresa_key) AS empresa_key,
             COALESCE(val.anio, pag.anio)               AS anio,
             COALESCE(val.trimestre, pag.trimestre)     AS trimestre,
             COALESCE(val.fondo, pag.fondo)             AS fondo,
             COALESCE(val.estado, pag.estado)           AS estado,
             COALESCE(val.nombre, pag.nombre)           AS nombre,
             COALESCE(val.validaciones, 0)      AS validaciones,
             COALESCE(val.codigos, 0)           AS codigos,
             COALESCE(pag.resoluciones, 0)      AS resoluciones,
             pag.res_min, pag.res_max,
             COALESCE(pag.valor_resolucion, 0)  AS valor_resolucion,
             COALESCE(pag.valor_pagado, 0)      AS valor_pagado,
             COALESCE(pag.saldo_pendiente, 0)   AS saldo_pendiente
      FROM val
      FULL OUTER JOIN pag
        ON  val.empresa_key = pag.empresa_key
        AND val.anio        = pag.anio
        AND val.trimestre   = pag.trimestre
        AND val.fondo       = pag.fondo
        AND val.estado      = pag.estado
    )
    SELECT u.*,
           COALESCE(cat.nombre_prestador, u.nombre) AS nombre_catalogo,
           cat.nit
    FROM unidas u
    LEFT JOIN catalogo_empresa cat ON cat.cod = u.empresa_key
    ORDER BY u.anio DESC, u.trimestre, u.fondo, u.estado, u.valor_pagado DESC NULLS LAST`;
}
