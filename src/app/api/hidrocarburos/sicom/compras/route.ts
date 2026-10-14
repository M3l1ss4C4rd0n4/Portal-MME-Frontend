import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCoberturaOlap, num } from "@/lib/sicom";

export const dynamic = "force-dynamic";

const T = "hidrocarburos.sicom_olap_compras";
const TOP_COMPRADORES = 15;
const SIN_UBICACION = "Sin ubicación en la fuente";

/**
 * Tablero COMPRAS SICOM — metodología §13. Fuente: cubo OLAP SBI-Compras.
 *
 * Dos diferencias de fondo respecto a la versión que venía del Excel:
 *
 * 1. **El proveedor se identifica por planta, no por agente.** El 30,8 % del
 *    volumen está registrado sin agente proveedor, y cruzar por esa dimensión
 *    descarta esas filas en silencio: es exactamente lo que hacía que el Excel
 *    perdiera el 25,4 % del volumen. Con la planta, el detalle concilia al
 *    0,0000 % contra el total del cubo.
 * 2. **Los mapas cruzan por código DANE**, que el cubo sí expone. Se acabó la
 *    heurística de nombres y los 67 municipios homónimos. Lo que queda sin
 *    ubicar no es ambigüedad nuestra: es que la fuente no registró la planta.
 */
export async function GET() {
  try {
    const pool = getPool();

    const mapaSQL = (dane: string, nombre: string) => `
      SELECT COALESCE(${nombre}, '${SIN_UBICACION}') AS departamento,
             ${dane} AS dane,
             SUM(volumen_comprado) AS volumen
      FROM ${T}
      GROUP BY 1, 2 ORDER BY 3 DESC`;

    const [kpis, porAnio, porAnioTipo, topCompradores, mapaComprador, mapaProveedor, cobertura] =
      await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(volumen_comprado), 0) AS volumen_total,
                  COALESCE(SUM(volumen_transito), 0) AS volumen_transito,
                  COUNT(DISTINCT codigo_sicom_agente_comprador) AS compradores,
                  COUNT(DISTINCT planta_agente_proveedor)       AS plantas,
                  COUNT(DISTINCT tipo_agente_comprador)         AS tipos_comprador,
                  COUNT(DISTINCT producto)                      AS productos,
                  MIN(anio_ciclo) AS anio_min, MAX(anio_ciclo) AS anio_max,
                  COALESCE(SUM(volumen_comprado) FILTER
                    (WHERE codigo_dane_departamento_planta_proveedor IS NOT NULL), 0)
                    AS volumen_geolocalizado
           FROM ${T}`
        ),
        pool.query(
          `SELECT anio_ciclo AS anio, SUM(volumen_comprado) AS volumen,
                  SUM(volumen_transito) AS transito
           FROM ${T} WHERE anio_ciclo IS NOT NULL
           GROUP BY 1 ORDER BY 1`
        ),
        pool.query(
          `SELECT anio_ciclo AS anio, tipo_agente_comprador AS tipo,
                  SUM(volumen_comprado) AS volumen
           FROM ${T}
           WHERE anio_ciclo IS NOT NULL AND tipo_agente_comprador IS NOT NULL
           GROUP BY 1,2`
        ),
        pool.query(
          `SELECT nombre_comercial_agente_comprador AS nombre,
                  tipo_agente_comprador AS tipo,
                  SUM(volumen_comprado) AS volumen
           FROM ${T} WHERE nombre_comercial_agente_comprador IS NOT NULL
           GROUP BY 1,2 ORDER BY 3 DESC LIMIT ${TOP_COMPRADORES}`
        ),
        pool.query(
          mapaSQL("codigo_dane_departamento_agente_comprador", "departamento_agente_comprador")
        ),
        pool.query(
          mapaSQL("codigo_dane_departamento_planta_proveedor", "departamento_planta_agente_proveedor")
        ),
        getCoberturaOlap("compras"),
      ]);

    const tiposAgente = [...new Set(porAnioTipo.rows.map((r) => r.tipo as string))].sort();
    const porAnioMap = new Map<number, Record<string, number>>();
    for (const r of porAnioTipo.rows) {
      const anio = num(r.anio);
      if (!porAnioMap.has(anio)) porAnioMap.set(anio, { anio });
      porAnioMap.get(anio)![r.tipo as string] = num(r.volumen);
    }
    const porAnioPorTipo = [...porAnioMap.values()].sort((a, b) => a.anio - b.anio);

    const mapear = (rows: Record<string, unknown>[]) =>
      rows.map((r) => ({
        departamento: r.departamento as string,
        codigoDane: (r.dane as string | null) ?? null,
        volumen: num(r.volumen),
      }));

    const k = kpis.rows[0];
    const volumenTotal = num(k.volumen_total);
    const geolocalizado = num(k.volumen_geolocalizado);

    return NextResponse.json({
      cobertura,
      kpis: {
        volumenTotal,
        volumenTransito: num(k.volumen_transito),
        compradores: num(k.compradores),
        plantas: num(k.plantas),
        tiposComprador: num(k.tipos_comprador),
        productos: num(k.productos),
        anioMin: num(k.anio_min),
        anioMax: num(k.anio_max),
        pctGeolocalizado: volumenTotal ? (geolocalizado / volumenTotal) * 100 : 0,
      },
      porAnio: porAnio.rows.map((r) => ({
        anio: num(r.anio),
        volumen: num(r.volumen),
        transito: num(r.transito),
      })),
      tiposAgente,
      porAnioPorTipo,
      topCompradores: topCompradores.rows.map((r) => ({
        nombre: r.nombre,
        tipo: r.tipo,
        volumen: num(r.volumen),
      })),
      mapaComprador: mapear(mapaComprador.rows),
      mapaProveedor: mapear(mapaProveedor.rows),
    });
  } catch (err) {
    console.error("[api/hidrocarburos/sicom/compras]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
