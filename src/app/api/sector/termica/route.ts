import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { MetricaTendencia } from "@/components/ui/TrendBadge";
import {
  COMBUSTIBLE_COLORES,
  SQL_CASE_COMBUSTIBLE,
  type CombustibleTermica,
} from "@/lib/termica-combustible";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtFecha(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getDate()} ${MESES[dt.getMonth()]} ${dt.getFullYear()}`;
}

function tendenciaPct(actual: number | null, ref: number | null, umbral = 5): MetricaTendencia {
  if (actual == null || ref == null || ref === 0) {
    return { direccion: "desconocida", cambio7d: null, label: "S/D" };
  }
  const cambio = ((actual - ref) / Math.abs(ref)) * 100;
  const label: MetricaTendencia["label"] =
    cambio > umbral ? "ALTA" : cambio < -umbral ? "BAJA" : "ESTABLE";
  return {
    direccion: label.toLowerCase() as MetricaTendencia["direccion"],
    cambio7d: Math.round(cambio * 10) / 10,
    label,
  };
}

const COLORES_TIPO: Record<string, string> = {
  HIDRAULICA: "#3B82F6",
  TERMICA: "#EF4444",
  SOLAR: "#F59E0B",
  EOLICA: "#10B981",
  COGENERADOR: "#8B5CF6",
};

const LABEL_TIPO: Record<string, string> = {
  HIDRAULICA: "Hidráulica",
  TERMICA: "Térmica",
  SOLAR: "Solar",
  EOLICA: "Eólica",
  COGENERADOR: "Cogenerador",
};

export async function GET() {
  const pool = getPool();
  try {
    const latest = await pool.query<{ fecha_gene: Date; fecha_precio: Date }>(`
      SELECT
        MAX(CASE WHEN metrica='Gene' AND entidad='Recurso' THEN fecha END) AS fecha_gene,
        MAX(CASE WHEN metrica IN ('PPPrecBolsNaci','PrecEsca') AND entidad='Sistema' THEN fecha END) AS fecha_precio
      FROM sector_energetico.metrics
    `);
    const fechaGene = latest.rows[0]?.fecha_gene;
    const fechaPrecio = latest.rows[0]?.fecha_precio;

    if (!fechaGene) {
      return NextResponse.json({ error: "No hay datos de generación térmica" }, { status: 404 });
    }

    const kpiRes = await pool.query(`
      WITH termica_dia AS (
        SELECT SUM(m.valor_gwh) AS gwh
        FROM sector_energetico.metrics m
        JOIN sector_energetico.catalogos c
          ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos' AND c.tipo = 'TERMICA'
        WHERE m.metrica = 'Gene' AND m.entidad = 'Recurso' AND m.fecha = $1
      ),
      total_dia AS (
        SELECT SUM(valor_gwh) AS gwh
        FROM sector_energetico.metrics
        WHERE metrica = 'Gene' AND entidad = 'Sistema' AND recurso = 'Sistema' AND fecha = $1
      ),
      termica_7d AS (
        SELECT AVG(daily.gwh) AS avg_gwh
        FROM (
          SELECT m.fecha, SUM(m.valor_gwh) AS gwh
          FROM sector_energetico.metrics m
          JOIN sector_energetico.catalogos c
            ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos' AND c.tipo = 'TERMICA'
          WHERE m.metrica = 'Gene' AND m.entidad = 'Recurso'
            AND m.fecha >= $1::date - INTERVAL '7 days' AND m.fecha < $1::date
          GROUP BY m.fecha
        ) daily
      )
      SELECT
        ROUND(t.gwh::numeric, 2) AS termica_gwh,
        ROUND(td.gwh::numeric, 2) AS total_gwh,
        ROUND((t.gwh / NULLIF(td.gwh, 0) * 100)::numeric, 1) AS pct_termica,
        t7.avg_gwh AS termica_7d
      FROM termica_dia t, total_dia td, termica_7d t7
    `, [fechaGene]);

    const kpi = kpiRes.rows[0];
    const termicaGwh = Number(kpi?.termica_gwh ?? 0);
    const pctTermica = Number(kpi?.pct_termica ?? 0);
    const termica7d = kpi?.termica_7d != null ? Number(kpi.termica_7d) : null;

    const preciosRes = await pool.query(`
      SELECT
        MAX(CASE WHEN metrica='PrecEsca' THEN valor_gwh END) AS escasez,
        MAX(CASE WHEN metrica='PPPrecBolsNaci' THEN valor_gwh END) AS ppp,
        MAX(fecha) AS fecha
      FROM sector_energetico.metrics
      WHERE entidad='Sistema' AND recurso='Sistema'
        AND metrica IN ('PrecEsca','PPPrecBolsNaci')
        AND fecha = COALESCE($1, (SELECT MAX(fecha) FROM sector_energetico.metrics WHERE metrica='PPPrecBolsNaci'))
    `, [fechaPrecio]);

    const escasez = Number(preciosRes.rows[0]?.escasez ?? 0);
    const ppp = Number(preciosRes.rows[0]?.ppp ?? 0);
    const fechaPrecioFmt = fmtFecha(preciosRes.rows[0]?.fecha);

    const varRes = await pool.query(`
      SELECT
        (SELECT valor_gwh FROM sector_energetico.metrics
         WHERE metrica='PrecEsca' AND entidad='Sistema' AND recurso='Sistema'
         ORDER BY fecha DESC LIMIT 1 OFFSET 30) AS escasez_mes,
        (SELECT valor_gwh FROM sector_energetico.metrics
         WHERE metrica='PPPrecBolsNaci' AND entidad='Sistema' AND recurso='Sistema'
         ORDER BY fecha DESC LIMIT 1 OFFSET 7) AS ppp_semana
    `);
    const escasezMesRef = varRes.rows[0]?.escasez_mes != null ? Number(varRes.rows[0].escasez_mes) : null;
    const pppSemRef = varRes.rows[0]?.ppp_semana != null ? Number(varRes.rows[0].ppp_semana) : null;

    const plantasRes = await pool.query(`
      WITH termica_total AS (
        SELECT SUM(m.valor_gwh) AS total
        FROM sector_energetico.metrics m
        JOIN sector_energetico.catalogos c
          ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos' AND c.tipo = 'TERMICA'
        WHERE m.metrica = 'Gene' AND m.entidad = 'Recurso' AND m.fecha = $1
      )
      SELECT
        m.recurso AS codigo,
        COALESCE(c.nombre, m.recurso) AS nombre,
        ROUND(m.valor_gwh::numeric, 2) AS generacion_gwh,
        ROUND((m.valor_gwh / NULLIF(t.total, 0) * 100)::numeric, 1) AS participacion_pct
      FROM sector_energetico.metrics m
      JOIN sector_energetico.catalogos c
        ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos' AND c.tipo = 'TERMICA'
      CROSS JOIN termica_total t
      WHERE m.metrica = 'Gene' AND m.entidad = 'Recurso' AND m.fecha = $1
        AND m.valor_gwh > 0
      ORDER BY m.valor_gwh DESC
      LIMIT 12
    `, [fechaGene]);

    const evolTermicaRes = await pool.query<{ fecha: Date; combustible: string; gwh: string }>(`
      SELECT
        m.fecha::date AS fecha,
        ${SQL_CASE_COMBUSTIBLE} AS combustible,
        ROUND(SUM(m.valor_gwh)::numeric, 2) AS gwh
      FROM sector_energetico.metrics m
      JOIN sector_energetico.catalogos c
        ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos' AND c.tipo = 'TERMICA'
      WHERE m.metrica = 'Gene' AND m.entidad = 'Recurso'
        AND m.fecha >= $1::date - INTERVAL '30 days' AND m.fecha <= $1::date
      GROUP BY m.fecha, combustible
      ORDER BY m.fecha ASC
    `, [fechaGene]);

    const evolTotalRes = await pool.query<{ fecha: Date; tipo: string; gwh: string }>(`
      SELECT
        m.fecha::date AS fecha,
        c.tipo,
        ROUND(SUM(m.valor_gwh)::numeric, 2) AS gwh
      FROM sector_energetico.metrics m
      JOIN sector_energetico.catalogos c
        ON m.recurso = c.codigo AND c.catalogo = 'ListadoRecursos'
      WHERE m.metrica = 'Gene' AND m.entidad = 'Recurso'
        AND m.fecha >= $1::date - INTERVAL '30 days' AND m.fecha <= $1::date
        AND c.tipo IS NOT NULL
      GROUP BY m.fecha, c.tipo
      ORDER BY m.fecha ASC
    `, [fechaGene]);

    const termicaRows = evolTermicaRes.rows.map((r) => ({
      fecha: r.fecha.toISOString().split("T")[0],
      combustible: r.combustible as CombustibleTermica,
      gwh: Number(r.gwh),
    }));

    const combustibles: CombustibleTermica[] = ["Carbón", "Gas", "Gas Importado", "Líquidos"];
    const fechasTermica = [...new Set(termicaRows.map((r) => r.fecha))].sort();
    const evolucionTermica = combustibles
      .map((comb) => {
        const byFecha = new Map(termicaRows.filter((r) => r.combustible === comb).map((r) => [r.fecha, r.gwh]));
        if (byFecha.size === 0) return null;
        return {
          id: comb,
          color: COMBUSTIBLE_COLORES[comb],
          data: fechasTermica.map((f, i) => ({
            x: String(i + 1),
            y: byFecha.get(f) ?? 0,
            fecha: new Date(f),
          })),
        };
      })
      .filter(Boolean);

    const totalRows = evolTotalRes.rows.map((r) => ({
      fecha: r.fecha.toISOString().split("T")[0],
      tipo: r.tipo,
      gwh: Number(r.gwh),
    }));
    const tipos = [...new Set(totalRows.map((r) => r.tipo))];
    const fechasTotal = [...new Set(totalRows.map((r) => r.fecha))].sort();
    const evolucionTotal = tipos.map((tipo) => {
      const byFecha = new Map(totalRows.filter((r) => r.tipo === tipo).map((r) => [r.fecha, r.gwh]));
      return {
        id: LABEL_TIPO[tipo] ?? tipo,
        color: COLORES_TIPO[tipo] ?? "#6B7280",
        data: fechasTotal.map((f, i) => ({
          x: String(i + 1),
          y: byFecha.get(f) ?? 0,
          fecha: new Date(f),
        })),
      };
    });

    return NextResponse.json({
      generacionTermica: {
        gwh: termicaGwh,
        participacionPct: pctTermica,
        fecha: fmtFecha(fechaGene),
        tendencia: tendenciaPct(termicaGwh, termica7d),
      },
      precios: {
        escasez: {
          valor: escasez,
          fecha: fechaPrecioFmt,
          variacion: escasezMesRef != null ? Math.round((escasez - escasezMesRef) * 100) / 100 : null,
          tendencia: tendenciaPct(escasez, escasezMesRef),
        },
        ppp: {
          valor: ppp,
          fecha: fechaPrecioFmt,
          variacion: pppSemRef != null ? Math.round((ppp - pppSemRef) * 100) / 100 : null,
          tendencia: tendenciaPct(ppp, pppSemRef),
        },
        mayor: escasez >= ppp ? "escasez" : "ppp",
      },
      plantas: plantasRes.rows.map((p) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        generacionGwh: Number(p.generacion_gwh),
        participacionPct: Number(p.participacion_pct),
      })),
      evolucionTermica,
      evolucionTotal,
    });
  } catch (err) {
    console.error("[api/sector/termica]", err);
    return NextResponse.json({ error: "Error al obtener datos térmicos" }, { status: 500 });
  }
}
