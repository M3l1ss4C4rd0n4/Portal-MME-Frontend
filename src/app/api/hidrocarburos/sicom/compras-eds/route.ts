import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCoberturaOlap, num } from "@/lib/sicom";

export const dynamic = "force-dynamic";

const V = "hidrocarburos.v_sicom_olap_compras_eds";
const TOP_AGENTES = 10;
const TOP_PRODUCTOS_STACK = 5;

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
               "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Tablero COMPRAS EDS SICOM — metodología §14. Fuente: cubo OLAP SBI-Compras,
 * filtrado a estaciones de servicio por la vista v_sicom_olap_compras_eds.
 *
 * Ya no hay cobertura parcial: el extracto de Excel llegaba cortado en el
 * límite de filas y solo cubría los compradores de la A a la E. Desde el cubo
 * está completo.
 *
 * "Top proveedores" pasa a ser por **planta proveedora**: el 30,8 % del volumen
 * no tiene agente proveedor registrado y cruzar por él descartaría esas filas.
 */
export async function GET() {
  try {
    const pool = getPool();

    const [kpis, topCompradores, topPlantas, porProducto, porMesProducto, cobertura] =
      await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(volumen_comprado), 0) AS volumen_total,
                  COUNT(DISTINCT codigo_sicom_agente_comprador) AS compradores,
                  COUNT(DISTINCT planta_agente_proveedor)       AS plantas,
                  COUNT(DISTINCT producto)                      AS productos,
                  COUNT(DISTINCT subtipo_agente_comprador)      AS subtipos,
                  COUNT(*)                                      AS filas_eds,
                  MIN(anio_ciclo) AS anio_min, MAX(anio_ciclo) AS anio_max
           FROM ${V}`
        ),
        pool.query(
          `SELECT nombre_comercial_agente_comprador AS nombre, SUM(volumen_comprado) AS volumen
           FROM ${V} WHERE nombre_comercial_agente_comprador IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC LIMIT ${TOP_AGENTES}`
        ),
        pool.query(
          `SELECT planta_agente_proveedor AS nombre, SUM(volumen_comprado) AS volumen
           FROM ${V} WHERE planta_agente_proveedor IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC LIMIT ${TOP_AGENTES}`
        ),
        pool.query(
          `SELECT producto, SUM(volumen_comprado) AS volumen
           FROM ${V} WHERE producto IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC`
        ),
        pool.query(
          `SELECT mes_ciclo AS mes, producto, SUM(volumen_comprado) AS volumen
           FROM ${V} WHERE mes_ciclo BETWEEN 1 AND 12 AND producto IS NOT NULL
           GROUP BY 1,2`
        ),
        getCoberturaOlap("compras"),
      ]);

    const totalProducto = porProducto.rows.reduce((a, r) => a + num(r.volumen), 0);
    const topProductos = porProducto.rows
      .slice(0, TOP_PRODUCTOS_STACK)
      .map((r) => r.producto as string);
    const clavesProducto = [...topProductos, "Otros"];

    const porMesMap = new Map<number, Record<string, number | string>>();
    for (const r of porMesProducto.rows) {
      const mes = num(r.mes);
      if (!porMesMap.has(mes)) {
        porMesMap.set(mes, { mes, mesNombre: MESES[mes - 1] });
        for (const c of clavesProducto) porMesMap.get(mes)![c] = 0;
      }
      const clave = topProductos.includes(r.producto as string) ? (r.producto as string) : "Otros";
      porMesMap.get(mes)![clave] = (porMesMap.get(mes)![clave] as number) + num(r.volumen);
    }
    const porMes = [...porMesMap.values()].sort(
      (a, b) => (a.mes as number) - (b.mes as number)
    );

    const k = kpis.rows[0];
    // La fila de control es la de la carga de `compras` completa. Para este
    // tablero la cifra que importa es la de su propio subconjunto, no la de la
    // tabla entera, o la franja diría tres millones de registros donde hay 2,7.
    const coberturaEds = cobertura
      ? { ...cobertura, filasCargadas: num(k.filas_eds) }
      : null;

    return NextResponse.json({
      cobertura: coberturaEds,
      kpis: {
        volumenTotal: num(k.volumen_total),
        compradores: num(k.compradores),
        plantas: num(k.plantas),
        productos: num(k.productos),
        subtipos: num(k.subtipos),
        anioMin: num(k.anio_min),
        anioMax: num(k.anio_max),
      },
      topCompradores: topCompradores.rows.map((r) => ({
        nombre: r.nombre,
        volumen: num(r.volumen),
      })),
      topPlantas: topPlantas.rows.map((r) => ({
        nombre: r.nombre,
        volumen: num(r.volumen),
      })),
      porProducto: porProducto.rows.map((r) => ({
        producto: r.producto,
        volumen: num(r.volumen),
        pct: totalProducto ? (num(r.volumen) / totalProducto) * 100 : 0,
      })),
      clavesProducto,
      porMes,
    });
  } catch (err) {
    console.error("[api/hidrocarburos/sicom/compras-eds]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
