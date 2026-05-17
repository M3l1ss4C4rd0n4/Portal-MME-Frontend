import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Mapeo embalse → macro-región XM (5 regiones oficiales del gráfico de capacidad)
 * Fuente: fallback usado por el backend Python (server/interface/pages/hidrologia/tables.py)
 */
const EMBALSE_REGION_XM: Record<string, string> = {
  PENOL: "Antioquia",
  RIOGRANDE2: "Antioquia",
  "PORCE II": "Antioquia",
  "PORCE III": "Antioquia",
  MIRAFLORES: "Antioquia",
  PLAYAS: "Antioquia",
  TRONERAS: "Antioquia",
  PUNCHINA: "Antioquia",
  ITUANGO: "Antioquia",
  "AGREGADO BOGOTA": "Centro",
  CHUZA: "Centro",
  GUAVIO: "Centro",
  MUNA: "Centro",
  "SAN CARLOS": "Centro",
  BETANIA: "Centro",       // Huila → Centro (región operativa XM)
  "EL QUIMBO": "Centro",   // Huila → Centro
  CALIMA1: "Valle",
  ALTOANCHICAYA: "Valle",
  SALVAJINA: "Valle",      // Cauca → Valle
  "FLORIDA II": "Valle",   // Cauca → Valle
  URRA1: "Caribe",
  PRADO: "Centro",         // Tolima → Centro
  AMANI: "Centro",         // Caldas → Centro
  ESMERALDA: "Centro",     // Boyacá/Caldas → Centro
  "SAN LORENZO": "Centro", // Caldas → Centro
  TOPOCORO: "Oriente",     // Santander → Oriente
  CHIVOR: "Oriente",
  SOGAMOSO: "Oriente",     // Boyacá → Oriente
  BATA: "Oriente",         // Boyacá → Oriente
};

/**
 * API: Capacidad Histórica de Embalses (gráfico estilo XM)
 * 
 * Devuelve datos para un Stacked Area Chart con líneas históricas de % SIN:
 * - Áreas apiladas: energía almacenada (GWh) por región hidrológica XM
 * - Línea % SIN: porcentaje de volumen útil total del SIN
 * - Líneas históricas: promedios por día del año (2009-2021, 2014-2021, 2020-2021)
 */
export async function GET(request: NextRequest) {
  const pool = getPool();
  
  try {
    // ── Parámetros de fecha ───────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const dias = parseInt(searchParams.get("dias") ?? "120", 10);
    
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() - 1); // ayer
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() - dias);
    
    const fInicioStr = fechaInicio.toISOString().split("T")[0];
    const fFinStr = fechaFin.toISOString().split("T")[0];

    // ── 1. Capacidad total del SIN (para proyectar % a GWh) ───────────────
    const capacidadRes = await pool.query<{ capacidad_total: number }>(`
      SELECT SUM(valor_gwh) as capacidad_total
      FROM sector_energetico.metrics
      WHERE metrica = 'CapaUtilDiarEner'
        AND entidad = 'Embalse'
        AND fecha = (
          SELECT MAX(fecha) 
          FROM sector_energetico.metrics 
          WHERE metrica = 'CapaUtilDiarEner' AND entidad = 'Embalse'
        )
    `);
    const capacidadTotalSin = capacidadRes.rows[0]?.capacidad_total ?? 15500;

    // ── 2. Áreas apiladas por región (energía almacenada en GWh) ──────────
    // Usamos mapeo manual a 5 regiones XM (el catálogo devuelve regiones granulares)
    const areasRes = await pool.query<{
      fecha: Date;
      recurso: string;
      energia_gwh: number;
    }>(`
      SELECT 
        m.fecha,
        m.recurso,
        ROUND(m.valor_gwh::numeric, 2) as energia_gwh
      FROM sector_energetico.metrics m
      WHERE m.metrica = 'VoluUtilDiarEner'
        AND m.entidad = 'Embalse'
        AND m.fecha >= $1
        AND m.fecha <= $2
      ORDER BY m.fecha, m.recurso
    `, [fInicioStr, fFinStr]);

    // ── 3. % SIN actual (línea principal) ─────────────────────────────────
    const pctSinRes = await pool.query<{
      fecha: Date;
      pct_sin: number;
    }>(`
      SELECT 
        fecha,
        ROUND((valor_gwh * 100)::numeric, 2) as pct_sin
      FROM sector_energetico.metrics
      WHERE metrica = 'PorcVoluUtilDiar'
        AND entidad = 'Sistema'
        AND fecha >= $1
        AND fecha <= $2
      ORDER BY fecha ASC
    `, [fInicioStr, fFinStr]);

    // ── 4. Históricos por día del año ─────────────────────────────────────
    const histRes = await pool.query<{
      dia_del_anio: number;
      hist_2009_2021: number | null;
      hist_2014_2021: number | null;
      hist_2020_2021: number | null;
    }>(`
      WITH pct_sin_diario AS (
        SELECT 
          fecha,
          valor_gwh * 100 as pct_sin
        FROM sector_energetico.metrics
        WHERE metrica = 'PorcVoluUtilDiar'
          AND entidad = 'Sistema'
          AND fecha >= '2009-01-01'
          AND fecha <= '2021-12-31'
      )
      SELECT 
        EXTRACT(DOY FROM fecha)::int as dia_del_anio,
        ROUND(AVG(CASE WHEN fecha BETWEEN '2009-01-01' AND '2021-12-31' THEN pct_sin END)::numeric, 2) as hist_2009_2021,
        ROUND(AVG(CASE WHEN fecha BETWEEN '2014-01-01' AND '2021-12-31' THEN pct_sin END)::numeric, 2) as hist_2014_2021,
        ROUND(AVG(CASE WHEN fecha BETWEEN '2020-01-01' AND '2021-12-31' THEN pct_sin END)::numeric, 2) as hist_2020_2021
      FROM pct_sin_diario
      GROUP BY EXTRACT(DOY FROM fecha)
      ORDER BY dia_del_anio
    `);

    // ── 5. Formatear para Nivo ────────────────────────────────────────────
    
    // Agrupar por fecha y región XM mapeada
    // Normalizar recurso igual que el servicio Python: strip + uppercase
    const areasMap = new Map<string, Map<string, number>>();
    for (const row of areasRes.rows) {
      const f = row.fecha.toISOString().split("T")[0];
      const recursoNorm = (row.recurso as string ?? "").trim().toUpperCase();
      const region = EMBALSE_REGION_XM[recursoNorm] ?? "Otros";
      if (!areasMap.has(f)) areasMap.set(f, new Map());
      const current = areasMap.get(f)!.get(region) ?? 0;
      areasMap.get(f)!.set(region, current + Number(row.energia_gwh));
    }

    // Regiones únicas (solo las 5 principales de XM)
    const regionesSet = new Set<string>();
    for (const fechaMap of areasMap.values()) {
      for (const region of fechaMap.keys()) {
        regionesSet.add(region);
      }
    }
    const regiones = Array.from(regionesSet).sort();

    // Fechas únicas
    const fechasSet = new Set<string>();
    for (const f of areasMap.keys()) fechasSet.add(f);
    for (const row of pctSinRes.rows) {
      fechasSet.add(row.fecha.toISOString().split("T")[0]);
    }
    const fechas = Array.from(fechasSet).sort();

    // Mapeo fecha -> % SIN
    const pctSinMap = new Map<string, number>();
    for (const row of pctSinRes.rows) {
      const f = row.fecha.toISOString().split("T")[0];
      pctSinMap.set(f, Number(row.pct_sin));
    }

    // Mapeo día del año -> históricos
    const histMap = new Map<number, { h09: number; h14: number; h20: number }>();
    for (const row of histRes.rows) {
      histMap.set(row.dia_del_anio, {
        h09: row.hist_2009_2021 ?? 0,
        h14: row.hist_2014_2021 ?? 0,
        h20: row.hist_2020_2021 ?? 0,
      });
    }

    // Colores por región (estilo XM) — keys en PascalCase igual que EMBALSE_REGION_XM
    const regionColors: Record<string, string> = {
      'Antioquia': '#9B8FC7',   // morado/lila
      'Centro':    '#C8C8C8',   // gris claro
      'Oriente':   '#B8D4E8',   // azul celeste
      'Valle':     '#7EC8D0',   // turquesa
      'Caribe':    '#8FA84A',   // verde oliva
    };

    // Orden de apilamiento de abajo hacia arriba (igual que en XM visual)
    // Keys en PascalCase para coincidir con los valores de EMBALSE_REGION_XM
    const regionOrder = ['Antioquia', 'Centro', 'Oriente', 'Valle', 'Caribe'];
    const regionesOrdenadas = regionOrder.filter(r => regiones.includes(r));
    // Agregar regiones no mapeadas al final (defensivo)
    regiones.forEach(r => { if (!regionesOrdenadas.includes(r) && r !== 'Otros') regionesOrdenadas.push(r); });

    // Construir series de áreas apiladas
    const areaSeries = regionesOrdenadas.map(region => ({
      id: region,
      regionKey: region,
      color: regionColors[region] ?? '#64748B',
      data: fechas.map(f => ({
        x: f,
        y: areasMap.get(f)?.get(region) ?? 0,
      })),
    }));

    // Línea % SIN — y = porcentaje directo (0-100), escala independiente del eje derecho
    const pctSinSeries = {
      id: '% SIN',
      color: '#D07050',
      data: fechas.map(f => ({
        x: f,
        y: pctSinMap.get(f) ?? 0,
      })),
    };

    // Helper DOY: día del año (1-366), igual que EXTRACT(DOY FROM fecha) en PostgreSQL
    const getDoy = (f: string): number => {
      const date = new Date(f + 'T00:00:00');
      return Math.floor(
        (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
      );
    };

    // Líneas históricas — y = porcentaje promedio histórico (0-100), mismo eje que % SIN
    const hist2009Series = {
      id: 'Hist.(2009-2021)',
      color: '#7EC8E0',
      data: fechas.map(f => ({ x: f, y: histMap.get(getDoy(f))?.h09 ?? 0 })),
    };

    const hist2014Series = {
      id: 'Hist.(2014-2021)',
      color: '#B8B8B8',
      data: fechas.map(f => ({ x: f, y: histMap.get(getDoy(f))?.h14 ?? 0 })),
    };

    const hist2020Series = {
      id: 'Hist.(2020-2021)',
      color: '#CC4455',
      data: fechas.map(f => ({ x: f, y: histMap.get(getDoy(f))?.h20 ?? 0 })),
    };

    // Metadatos
    const meta = {
      fechaInicio: fInicioStr,
      fechaFin: fFinStr,
      capacidadTotalSinGwh: Math.round(capacidadTotalSin),
      regiones: regionesOrdenadas,
      totalRegistros: areasRes.rows.length + pctSinRes.rows.length + histRes.rows.length,
    };

    return NextResponse.json({
      areas: areaSeries,
      pctSin: pctSinSeries,
      hist2009: hist2009Series,
      hist2014: hist2014Series,
      hist2020: hist2020Series,
      meta,
    });

  } catch (error) {
    console.error("[API /embalses/capacidad-historica] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener datos de capacidad histórica de embalses" },
      { status: 500 }
    );
  }
}
