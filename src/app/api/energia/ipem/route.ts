import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  variacionPp,
  variacionPromedioComparable,
  type DepartamentoIpem,
  type KpisIpem,
  type MunicipioIpem,
} from "@/lib/ipem";

export const dynamic = "force-dynamic";

/**
 * Datos del IPEM para el tablero de Sector energético.
 *
 * Son dos tablas estáticas de 1.121 y 33 filas (sector_energetico.ipem_municipal e
 * ipem_departamental, migración 047), así que se consultan directo con getPool() sin
 * pasar por FastAPI y se devuelven completas en una sola respuesta: el municipal pesa
 * ~150 KB y paginarlo solo complicaría el buscador y el ranking del cliente.
 *
 * Los promedios nacionales son promedio simple de las filas con dato, que es como los
 * reporta el informe por escala, NO un agregado ponderado por población: no tenemos
 * población por municipio en estas tablas y ponderar cambiaría la cifra.
 */

/** NUMERIC de PostgreSQL llega como string por el driver `pg`. */
function num(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const s = String(valor).trim();
  return s || null;
}

interface FilaMunicipal {
  cod_municipio: string;
  cod_departamento: string;
  departamento: string;
  municipio: string;
  ipem_2024: string | null;
  ipem_2025: string | null;
  quintil_2024: string | null;
  quintil_2025: string | null;
}

interface FilaDepartamental {
  cod_departamento: string;
  departamento: string;
  region: string;
  ipem_2024: string | null;
  ipem_2025: string | null;
}

/** Promedio simple en porcentaje de los valores presentes, o null si no hay ninguno. */
function promedioPct(valores: Array<number | null>): number | null {
  const conDato = valores.filter((v): v is number => v !== null);
  if (conDato.length === 0) return null;
  return (conDato.reduce((a, v) => a + v, 0) / conDato.length) * 100;
}

function calcularKpis(
  municipios: MunicipioIpem[],
  departamentos: DepartamentoIpem[],
): KpisIpem {
  let mejoran = 0;
  let empeoran = 0;
  let sinCambio = 0;
  let sinDato = 0;

  for (const m of municipios) {
    const v = variacionPp(m.ipem2024, m.ipem2025);
    if (v === null) sinDato += 1;
    else if (v < 0) mejoran += 1;
    else if (v > 0) empeoran += 1;
    else sinCambio += 1;
  }

  return {
    promedioMunicipal2024: promedioPct(municipios.map((m) => m.ipem2024)),
    promedioMunicipal2025: promedioPct(municipios.map((m) => m.ipem2025)),
    promedioDepartamental2024: promedioPct(departamentos.map((d) => d.ipem2024)),
    promedioDepartamental2025: promedioPct(departamentos.map((d) => d.ipem2025)),
    municipios: municipios.length,
    departamentos: departamentos.length,
    comparables: municipios.length - sinDato,
    variacionPromedioComparable: variacionPromedioComparable(municipios),
    mejoran,
    empeoran,
    sinCambio,
    sinDato,
  };
}

export async function GET() {
  try {
    const pool = getPool();

    const [municipal, departamental] = await Promise.all([
      pool.query<FilaMunicipal>(`
        SELECT cod_municipio, cod_departamento, departamento, municipio,
               ipem_2024, ipem_2025, quintil_2024, quintil_2025
        FROM sector_energetico.ipem_municipal
        ORDER BY departamento, municipio
      `),
      pool.query<FilaDepartamental>(`
        SELECT cod_departamento, departamento, region, ipem_2024, ipem_2025
        FROM sector_energetico.ipem_departamental
        ORDER BY departamento
      `),
    ]);

    const municipios: MunicipioIpem[] = municipal.rows.map((r) => ({
      codMunicipio: r.cod_municipio.trim(),
      codDepartamento: r.cod_departamento.trim(),
      departamento: r.departamento,
      municipio: r.municipio,
      ipem2024: num(r.ipem_2024),
      ipem2025: num(r.ipem_2025),
      quintil2024: texto(r.quintil_2024),
      quintil2025: texto(r.quintil_2025),
    }));

    const departamentos: DepartamentoIpem[] = departamental.rows.map((r) => ({
      codDepartamento: r.cod_departamento.trim(),
      departamento: r.departamento,
      region: r.region,
      ipem2024: num(r.ipem_2024),
      ipem2025: num(r.ipem_2025),
    }));

    return NextResponse.json({
      kpis: calcularKpis(municipios, departamentos),
      departamentos,
      municipios,
    });
  } catch (err) {
    console.error("[api/energia/ipem]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
