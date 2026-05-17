import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * API para obtener datos detallados del sector energético
 * - Generación por tipo de recurso (Hidráulica, Térmica, Solar, Eólica)
 * - Histórico de precios de bolsa
 * - Volumen útil de embalses
 */
export async function GET() {
  const pool = getPool();
  try {
    // 1. Obtener la fecha más reciente con datos
    const latestFecha = await pool.query<{ fecha: Date }>(`
      SELECT MAX(fecha) AS fecha 
      FROM sector_energetico.metrics 
      WHERE metrica = 'Gene' AND entidad = 'Sistema'
    `);
    const fecha = latestFecha.rows[0]?.fecha;

    if (!fecha) {
      return NextResponse.json({ error: "No hay datos disponibles" }, { status: 404 });
    }

    // 2. Generación total del sistema
    const generacionTotal = await pool.query<{ valor: number }>(`
      SELECT SUM(valor_gwh) AS valor
      FROM sector_energetico.metrics
      WHERE metrica = 'Gene' AND entidad = 'Sistema' AND recurso = 'Sistema' AND fecha = $1
    `, [fecha]);

    // 3. Generación por tipo de recurso (últimos 7 días para promedio)
    const generacionPorTipo = await pool.query<{
      tipo: string;
      generacion_gwh: number;
      porcentaje: number;
    }>(`
      WITH generacion_recursos AS (
        SELECT 
          c.tipo,
          SUM(m.valor_gwh) as total_gwh
        FROM sector_energetico.metrics m
        JOIN sector_energetico.catalogos c 
          ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos'
        WHERE m.metrica = 'Gene'
          AND m.fecha BETWEEN $1::date - INTERVAL '7 days' AND $1::date
          AND c.tipo IS NOT NULL
        GROUP BY c.tipo
      ),
      total AS (
        SELECT SUM(total_gwh) as suma_total FROM generacion_recursos
      )
      SELECT 
        tipo,
        ROUND(total_gwh::numeric, 2) as generacion_gwh,
        ROUND((total_gwh / NULLIF((SELECT suma_total FROM total), 0) * 100)::numeric, 1) as porcentaje
      FROM generacion_recursos
      ORDER BY total_gwh DESC
    `, [fecha]);

    // 4. Histórico de precios de bolsa (últimos 30 días)
    const precioBolsaHistorico = await pool.query<{
      fecha: Date;
      precio: number;
    }>(`
      SELECT 
        fecha,
        ROUND(valor_gwh::numeric, 2) as precio
      FROM sector_energetico.metrics
      WHERE metrica = 'PPPrecBolsNaci'
        AND entidad = 'Sistema'
        AND fecha >= CURRENT_DATE - INTERVAL '30 days'
        AND fecha <= CURRENT_DATE
      ORDER BY fecha ASC
    `);

    // 5. Embalses - volumen útil por embalse individual + capacidad útil
    const embalsesVolumen = await pool.query<{
      codigo: string;
      nombre: string;
      porcentaje: number;
      capacidadGwh: number;
    }>(`
      SELECT 
        m.recurso as codigo,
        COALESCE(c.nombre, m.recurso) as nombre,
        ROUND((m.valor_gwh * 100)::numeric, 1) as porcentaje,
        ROUND(COALESCE(cap.valor_gwh, 0)::numeric, 2) as "capacidadGwh"
      FROM sector_energetico.metrics m
      LEFT JOIN sector_energetico.catalogos c 
        ON m.recurso = c.codigo AND c.catalogo = 'ListadoEmbalses'
      LEFT JOIN sector_energetico.metrics cap
        ON cap.recurso = m.recurso 
        AND cap.metrica = 'CapaUtilDiarEner' 
        AND cap.entidad = 'Embalse'
        AND cap.fecha = (
          SELECT MAX(fecha) 
          FROM sector_energetico.metrics 
          WHERE metrica = 'CapaUtilDiarEner' AND entidad = 'Embalse'
        )
      WHERE m.metrica = 'PorcVoluUtilDiar'
        AND m.entidad = 'Embalse'
        AND m.fecha = (
          SELECT MAX(fecha) 
          FROM sector_energetico.metrics 
          WHERE metrica = 'PorcVoluUtilDiar' AND entidad = 'Embalse'
        )
      ORDER BY m.valor_gwh DESC
    `);

    // 6. Promedio nacional de embalses
    const embalsesNacional = await pool.query<{ promedio: number }>(`
      SELECT 
        ROUND((valor_gwh * 100)::numeric, 1) as promedio
      FROM sector_energetico.metrics
      WHERE metrica = 'PorcVoluUtilDiar'
        AND entidad = 'Sistema'
        AND fecha = (
          SELECT MAX(fecha) 
          FROM sector_energetico.metrics 
          WHERE metrica = 'PorcVoluUtilDiar' AND entidad = 'Sistema'
        )
    `);

    // 7. Aportes hidrológicos por río (actual, histórico, porcentaje)
    const latestAporteFecha = await pool.query<{ fecha: Date }>(`
      SELECT MAX(fecha) AS fecha 
      FROM sector_energetico.metrics 
      WHERE metrica = 'AporEner' AND entidad = 'Rio'
    `);
    const fechaAporte = latestAporteFecha.rows[0]?.fecha;

    let aportesPorRio: {
      codigo: string;
      nombre: string;
      actualGwh: number;
      historicoGwh: number;
      porcentaje: number;
    }[] = [];

    if (fechaAporte) {
      const aportesRes = await pool.query<{
        codigo: string;
        nombre: string;
        actualGwh: number;
        historicoGwh: number;
        porcentaje: number;
      }>(`
        WITH actual AS (
          SELECT recurso, valor_gwh
          FROM sector_energetico.metrics
          WHERE metrica = 'AporEner' AND entidad = 'Rio' AND fecha = $1
        ),
        historico AS (
          SELECT recurso, valor_gwh
          FROM sector_energetico.metrics
          WHERE metrica = 'AporEnerMediHist' AND entidad = 'Rio' AND fecha = $1
        ),
        porc AS (
          SELECT recurso, valor_gwh
          FROM sector_energetico.metrics
          WHERE metrica = 'PorcApor' AND entidad = 'Rio' AND fecha = $1
        )
        SELECT 
          a.recurso as codigo,
          COALESCE(c.nombre, a.recurso) as nombre,
          ROUND(a.valor_gwh::numeric, 2) as "actualGwh",
          ROUND(COALESCE(h.valor_gwh, 0)::numeric, 2) as "historicoGwh",
          ROUND(COALESCE(p.valor_gwh * 100, 0)::numeric, 1) as porcentaje
        FROM actual a
        LEFT JOIN historico h ON a.recurso = h.recurso
        LEFT JOIN porc p ON a.recurso = p.recurso
        LEFT JOIN sector_energetico.catalogos c ON a.recurso = c.codigo AND c.catalogo = 'ListadoRios'
        ORDER BY a.valor_gwh DESC
      `, [fechaAporte]);
      aportesPorRio = aportesRes.rows;
    }

    // 8. Series históricas para sparklines (últimos 7 días)
    const embalsesSparkline = await pool.query<{ fecha: Date; valor: number }>(`
      SELECT fecha, ROUND((valor_gwh * 100)::numeric, 1) as valor
      FROM sector_energetico.metrics
      WHERE metrica = 'PorcVoluUtilDiar' AND entidad = 'Sistema'
        AND fecha >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY fecha ASC
    `);

    const aportesSparkline = await pool.query<{ fecha: Date; valor: number }>(`
      SELECT fecha, ROUND((valor_gwh * 100)::numeric, 1) as valor
      FROM sector_energetico.metrics
      WHERE metrica = 'PorcApor' AND entidad = 'Sistema'
        AND fecha >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY fecha ASC
    `);

    // Formatear datos para gráfico de generación por fuente
    const coloresPorTipo: Record<string, string> = {
      'HIDRAULICA': '#3B82F6',
      'TERMICA': '#EF4444',
      'SOLAR': '#F59E0B',
      'EOLICA': '#10B981',
      'COGENERADOR': '#8B5CF6'
    };

    const generacionPorFuente = generacionPorTipo.rows.map(row => ({
      id: row.tipo,
      label: row.tipo.charAt(0) + row.tipo.slice(1).toLowerCase(),
      value: Number(row.porcentaje),
      color: coloresPorTipo[row.tipo] || '#6B7280',
      generacionGwh: Number(row.generacion_gwh)
    }));

    // Formatear histórico de precios para gráfico de líneas
    const precioBolsaSeries = precioBolsaHistorico.rows.map((row, index) => ({
      x: String(index + 1),
      y: Number(row.precio),
      fecha: row.fecha
    }));

    return NextResponse.json({
      fecha: fecha,
      generacionTotal: {
        gwh: parseFloat(generacionTotal.rows[0]?.valor?.toFixed(2) || "0"),
      },
      generacionPorFuente,
      precioBolsa: {
        actual: precioBolsaSeries.length > 0 ? precioBolsaSeries[precioBolsaSeries.length - 1].y : 0,
        historico: [{
          id: "COP/kWh",
          color: "#F59E0B",
          data: precioBolsaSeries
        }]
      },
      embalses: {
        promedioNacional: embalsesNacional.rows[0]?.promedio || 0,
        detalle: embalsesVolumen.rows.map(e => ({
          codigo: e.codigo,
          nombre: e.nombre,
          porcentaje: Number(e.porcentaje),
          capacidadGwh: Number(e.capacidadGwh)
        }))
      },
      aportes: {
        fecha: fechaAporte ?? null,
        rios: aportesPorRio.map(r => ({
          codigo: r.codigo,
          nombre: r.nombre,
          actualGwh: Number(r.actualGwh),
          historicoGwh: Number(r.historicoGwh),
          porcentaje: Number(r.porcentaje),
        }))
      },
      sparklines: {
        embalses: embalsesSparkline.rows.map(r => ({ x: r.fecha.toISOString().split('T')[0], y: Number(r.valor) })),
        aportes: aportesSparkline.rows.map(r => ({ x: r.fecha.toISOString().split('T')[0], y: Number(r.valor) })),
      }
    });

  } catch (err) {
    console.error("[api/sector/detalle]", err);
    return NextResponse.json({ error: "Error al obtener datos del sector" }, { status: 500 });
  }
}
