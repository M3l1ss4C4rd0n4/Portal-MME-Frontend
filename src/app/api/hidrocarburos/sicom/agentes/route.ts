import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCoberturaOlap, num } from "@/lib/sicom";

export const dynamic = "force-dynamic";

const T = "hidrocarburos.sicom_olap_agentes";

/**
 * Tablero AGENTES SICOM — réplica de la hoja "Agentes" del tablero Power BI
 * "Tablero Combustible SICOM.pbix" y de la metodología §12.
 *
 * Fuente: cubo OLAP SBI-Agentes (etl/etl_sicom_olap.py), no el Excel de OneDrive.
 *
 * ⚠️ Por qué todo cuenta con COUNT(DISTINCT codigo_sicom_agente) y no con
 * SUM(agente_cantidad): la medida del cubo es un **conteo distinto**. Al
 * desagregarla por atributos, un agente con dos proveedores se cuenta dos veces
 * (827 agentes están en esa situación) y el total sube de 8.907 a 10.666. Esa
 * suma inflada es la que mostraba el tablero cuando se alimentaba del Excel.
 * Verificado: el conteo distinto reproduce exactamente el total del cubo, y
 * desagregado por tipo, subtipo, departamento o producto vuelve a sumar 8.907
 * porque cada agente tiene un único valor en esos atributos.
 */
export async function GET() {
  try {
    const pool = getPool();

    const [kpis, porTipo, porProducto, porAnio, porSubtipo, porDepartamento, cobertura] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(DISTINCT codigo_sicom_agente)                                      AS agentes,
                  COUNT(DISTINCT codigo_sicom_agente) FILTER (WHERE nuevo_estado = 'ACTIVO')   AS activos,
                  COUNT(DISTINCT codigo_sicom_agente) FILTER (WHERE nuevo_estado = 'INACTIVO') AS inactivos,
                  COUNT(DISTINCT tipo_agente)                AS tipos,
                  COUNT(DISTINCT subtipo_agente)             AS subtipos,
                  COUNT(DISTINCT departamento_instalacion)   AS departamentos,
                  COUNT(DISTINCT municipio_instalacion)      AS municipios,
                  COUNT(DISTINCT bandera)                    AS banderas,
                  COUNT(DISTINCT nombre_comercial_proveedor) AS proveedores,
                  COUNT(DISTINCT codigo_sicom_agente) FILTER (WHERE anio_creacion IS NULL) AS sin_anio
           FROM ${T}`
        ),
        pool.query(
          `SELECT tipo_agente AS tipo, COUNT(DISTINCT codigo_sicom_agente) AS cantidad
           FROM ${T} WHERE tipo_agente IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC`
        ),
        pool.query(
          `SELECT producto_a_comercializar AS producto, COUNT(DISTINCT codigo_sicom_agente) AS cantidad
           FROM ${T} WHERE producto_a_comercializar IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC`
        ),
        pool.query(
          `SELECT anio_creacion AS anio,
                  COUNT(DISTINCT codigo_sicom_agente) AS cantidad,
                  SUM(COUNT(DISTINCT codigo_sicom_agente)) OVER (ORDER BY anio_creacion) AS acumulado
           FROM ${T} WHERE anio_creacion IS NOT NULL
           GROUP BY 1 ORDER BY 1`
        ),
        pool.query(
          `SELECT subtipo_agente AS subtipo, COUNT(DISTINCT codigo_sicom_agente) AS cantidad
           FROM ${T} WHERE subtipo_agente IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC`
        ),
        pool.query(
          `SELECT departamento_instalacion AS departamento,
                  codigo_dane_departamento_instalacion AS dane,
                  COUNT(DISTINCT codigo_sicom_agente) AS cantidad
           FROM ${T} WHERE departamento_instalacion IS NOT NULL
           GROUP BY 1,2 ORDER BY 3 DESC`
        ),
        getCoberturaOlap("agentes"),
      ]);

    const k = kpis.rows[0];
    const totalProducto = porProducto.rows.reduce((a, r) => a + num(r.cantidad), 0);

    return NextResponse.json({
      cobertura,
      kpis: {
        agentes: num(k.agentes),
        activos: num(k.activos),
        inactivos: num(k.inactivos),
        tipos: num(k.tipos),
        subtipos: num(k.subtipos),
        departamentos: num(k.departamentos),
        municipios: num(k.municipios),
        banderas: num(k.banderas),
        proveedores: num(k.proveedores),
        sinAnio: num(k.sin_anio),
      },
      porTipo: porTipo.rows.map((r) => ({ tipo: r.tipo, cantidad: num(r.cantidad) })),
      porProducto: porProducto.rows.map((r) => ({
        producto: r.producto,
        cantidad: num(r.cantidad),
        pct: totalProducto ? (num(r.cantidad) / totalProducto) * 100 : 0,
      })),
      porAnio: porAnio.rows.map((r) => ({
        anio: num(r.anio),
        cantidad: num(r.cantidad),
        acumulado: num(r.acumulado),
      })),
      porSubtipo: porSubtipo.rows.map((r) => ({
        subtipo: r.subtipo,
        cantidad: num(r.cantidad),
      })),
      porDepartamento: porDepartamento.rows.map((r) => ({
        departamento: r.departamento,
        codigoDane: r.dane,
        cantidad: num(r.cantidad),
      })),
    });
  } catch (err) {
    console.error("[api/hidrocarburos/sicom/agentes]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
