import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

interface CurvaSPoint {
  fecha: string;
  programado: number;
  real: number;
}

interface ProyectoCurva {
  nombre: string;
  departamento: string;
  usuariosTotales: number;
  programado: CurvaSPoint[];
  real: CurvaSPoint[];
}

function parseFecha(fechaStr: string): string {
  const [d, m, y] = fechaStr.split("/");
  return `${y}-${m}-${d}`;
}

function procesarHoja(
  workbook: XLSX.WorkBook,
  sheetName: string
): { proyectos: string[]; fechas: string[]; datos: number[][]; usuarios: number[]; departamentos: string[] } {
  const ws = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  if (json.length < 2) {
    return { proyectos: [], fechas: [], datos: [], usuarios: [], departamentos: [] };
  }

  const header = json[0] as string[];
  const fechas = header.slice(7, 25).filter((f) => f && String(f).includes("/"));
  const fechaIndices = fechas.map((f) => header.indexOf(f));

  const proyectos: string[] = [];
  const datos: number[][] = [];
  const usuarios: number[] = [];
  const departamentos: string[] = [];

  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    if (!row || !row[0]) continue;
    const nombre = String(row[0]).trim();
    const departamento = row[1] ? String(row[1]) : "";
    const usuariosTotales = Number(row[6]) || 1;

    const valores = fechaIndices.map((idx) => Number(row[idx]) || 0);

    proyectos.push(nombre);
    departamentos.push(departamento);
    usuarios.push(usuariosTotales);
    datos.push(valores);
  }

  return { proyectos, fechas, datos, usuarios, departamentos };
}

export async function GET() {
  try {
    const filePath = path.resolve(process.cwd(), "data", "Colombia_Solar_OR.xlsx");
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const proj = procesarHoja(workbook, "Curva S_Proyectada");
    const rep = procesarHoja(workbook, "Curva S_Reportada");

    const fechas = proj.fechas.map(parseFecha).sort();
    const nProyectos = proj.proyectos.length;

    const globalProgramado: number[] = new Array(fechas.length).fill(0);
    const globalReal: number[] = new Array(fechas.length).fill(0);

    const proyectos: ProyectoCurva[] = [];

    for (let i = 0; i < nProyectos; i++) {
      const nombre = proj.proyectos[i];
      const usuariosTotales = proj.usuarios[i] || 1;
      const progPts: CurvaSPoint[] = [];

      for (let j = 0; j < fechas.length; j++) {
        const progVal = proj.datos[i][j] || 0;
        const realVal = rep.datos[i]?.[j] || 0;
        const progPct = (progVal / usuariosTotales) * 100;
        const realPct = (realVal / usuariosTotales) * 100;

        progPts.push({ fecha: fechas[j], programado: progPct, real: realPct });
        globalProgramado[j] += progPct;
        globalReal[j] += realPct;
      }

      proyectos.push({
        nombre,
        departamento: proj.departamentos[i] || "",
        usuariosTotales,
        programado: progPts,
        real: progPts,
      });
    }

    const promedioGlobal = fechas.map((f, i) => ({
      x: f,
      programado: nProyectos > 0 ? globalProgramado[i] / nProyectos : 0,
      real: nProyectos > 0 ? globalReal[i] / nProyectos : 0,
    }));

    return NextResponse.json({ promedioGlobal, proyectos, source: "excel" });
  } catch (err) {
    console.error("[api/colombia-solar/curva-s]", err);
    return NextResponse.json({ error: "Error al obtener datos de Curva S" }, { status: 500 });
  }
}
