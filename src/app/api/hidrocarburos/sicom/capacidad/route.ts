import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCoberturaOlap, num } from "@/lib/sicom";

export const dynamic = "force-dynamic";

const T = "hidrocarburos.sicom_olap_capacidad";
const TOP_PRODUCTOS = 12;
const TOP_DEPARTAMENTOS = 15;

/**
 * Tablero CAPACIDAD SICOM — metodología §15. Fuente: cubo OLAP SBI-Capacidad.
 *
 * Diferencia de fondo con la versión que venía del Excel: el cubo tiene
 * dimensión de **ciclo** (año y mes), que la exportación manual colapsaba. Por
 * eso el "total" que mostraba el tablero no era capacidad instalada sino la
 * acumulación de 17 años de declaraciones, y estaba dominado por unos pocos
 * ciclos atípicos. Aquí se devuelve también la serie por ciclo para que eso sea
 * visible en vez de quedar escondido en un agregado.
 */
export async function GET() {
  try {
    const pool = getPool();

    const [kpis, porCiclo, porProducto, porDeptoTipo, porTipo, cobertura] =
      await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(capacidad_operativa), 0)             AS capacidad_total,
                  COUNT(*)                                          AS registros,
                  COUNT(*) FILTER (WHERE capacidad_operativa = 0)   AS registros_en_cero,
                  COUNT(DISTINCT (anio_ciclo, mes_ciclo))           AS ciclos,
                  MIN(anio_ciclo) AS anio_min, MAX(anio_ciclo) AS anio_max,
                  COUNT(DISTINCT codigo_sicom_agente)               AS agentes,
                  COUNT(DISTINCT departamento_instalacion)          AS departamentos,
                  COUNT(DISTINCT municipio_instalacion)             AS municipios,
                  COUNT(DISTINCT descripcion_producto)              AS productos
           FROM ${T}`
        ),
        pool.query(
          `SELECT anio_ciclo AS anio, SUM(capacidad_operativa) AS capacidad,
                  COUNT(*) AS registros
           FROM ${T} WHERE anio_ciclo IS NOT NULL
           GROUP BY 1 ORDER BY 1`
        ),
        pool.query(
          `SELECT descripcion_producto AS producto, SUM(capacidad_operativa) AS capacidad
           FROM ${T} WHERE descripcion_producto IS NOT NULL
           GROUP BY 1 HAVING SUM(capacidad_operativa) > 0
           ORDER BY 2 DESC LIMIT ${TOP_PRODUCTOS}`
        ),
        pool.query(
          `SELECT departamento_instalacion AS departamento,
                  codigo_dane_departamento_instalacion AS dane,
                  tipo_agente,
                  SUM(capacidad_operativa) AS capacidad
           FROM ${T}
           WHERE departamento_instalacion IS NOT NULL AND tipo_agente IS NOT NULL
           GROUP BY 1,2,3 HAVING SUM(capacidad_operativa) > 0`
        ),
        pool.query(
          `SELECT tipo_agente AS tipo, SUM(capacidad_operativa) AS capacidad
           FROM ${T} WHERE tipo_agente IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC`
        ),
        getCoberturaOlap("capacidad"),
      ]);

    // ── Barras apiladas: una fila por departamento, una clave por tipo de agente
    const tiposAgente = [...new Set(porDeptoTipo.rows.map((r) => r.tipo_agente as string))].sort();
    const porDepto = new Map<string, { valores: Record<string, number>; dane: string | null }>();
    for (const r of porDeptoTipo.rows) {
      const key = r.departamento as string;
      if (!porDepto.has(key)) porDepto.set(key, { valores: {}, dane: r.dane });
      porDepto.get(key)!.valores[r.tipo_agente as string] = num(r.capacidad);
    }
    // Dos formas distintas a propósito: la barra apilada va a Nivo, cuyo tipo
    // BarDatum no admite valores nulos, y el código DANE puede serlo. El mapa
    // sí lo necesita, así que va en su propio arreglo.
    const porDepartamentoTodos = [...porDepto.entries()]
      .map(([departamento, { valores, dane }]) => ({
        ...valores,
        departamento,
        total: tiposAgente.reduce((a, t) => a + (valores[t] ?? 0), 0),
        _dane: dane,
      }))
      .sort((a, b) => b.total - a.total);

    const mapaDepartamento = porDepartamentoTodos.map((d) => ({
      departamento: d.departamento,
      codigoDane: d._dane,
      capacidad: d.total,
    }));

    const porDepartamentoBarras = porDepartamentoTodos.map(({ _dane, ...resto }) => {
      void _dane;
      return resto;
    });

    // ── Cascada §15.4: contribución acumulada de cada tipo de agente
    let acumulado = 0;
    const cascada = porTipo.rows.map((r) => {
      const valor = num(r.capacidad);
      const inicio = acumulado;
      acumulado += valor;
      return { tipo: r.tipo as string, valor, inicio, fin: acumulado };
    });

    // ── Concentración: qué parte del total aportan los ciclos mayores.
    // Es una descripción de los datos, no un criterio de exclusión: no se filtra
    // ningún ciclo, solo se cuantifica para poder advertirlo en el tablero.
    const ciclos = porCiclo.rows.map((r) => ({
      anio: num(r.anio),
      capacidad: num(r.capacidad),
      registros: num(r.registros),
    }));
    const totalCiclos = ciclos.reduce((a, c) => a + c.capacidad, 0);
    const top2 = [...ciclos].sort((a, b) => b.capacidad - a.capacidad).slice(0, 2);
    const concentracion = {
      anios: top2.map((c) => c.anio),
      pct: totalCiclos ? (top2.reduce((a, c) => a + c.capacidad, 0) / totalCiclos) * 100 : 0,
    };

    const k = kpis.rows[0];
    return NextResponse.json({
      cobertura,
      kpis: {
        capacidadTotal: num(k.capacidad_total),
        registros: num(k.registros),
        registrosEnCero: num(k.registros_en_cero),
        ciclos: num(k.ciclos),
        anioMin: num(k.anio_min),
        anioMax: num(k.anio_max),
        agentes: num(k.agentes),
        departamentos: num(k.departamentos),
        municipios: num(k.municipios),
        productos: num(k.productos),
      },
      porCiclo: ciclos,
      concentracion,
      porProducto: porProducto.rows.map((r) => ({
        producto: r.producto,
        capacidad: num(r.capacidad),
      })),
      tiposAgente,
      porDepartamento: porDepartamentoBarras.slice(0, TOP_DEPARTAMENTOS),
      mapaDepartamento,
      cascada,
      totalCascada: acumulado,
    });
  } catch (err) {
    console.error("[api/hidrocarburos/sicom/capacidad]", err);
    return NextResponse.json(
      { error: "Error interno", detail: String(err) },
      { status: 500 }
    );
  }
}
