import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { getPool } from "@/lib/db";
import {
  CURVA_S_CATEGORIAS,
  loadCurvaSFromDb,
  type CurvaSCategoria,
  type CurvaSPoint,
  type ProyectoCurva,
} from "@/lib/colombia-solar-curva-s";

export const dynamic = "force-dynamic";

type HojaParsed = {
  proyectos: string[];
  fechas: string[];
  datos: number[][];
  totales: number[];
  departamentos: string[];
};

function resolveExcelPath(): string {
  const candidates = [
    process.env.COLOMBIA_SOLAR_XLSX,
    path.resolve(process.cwd(), "../server/data/onedrive/Colombia_Solar_OR.xlsx"),
    "/home/admonctrlxm/server/data/onedrive/Colombia_Solar_OR.xlsx",
    path.resolve(process.cwd(), "data", "Colombia_Solar_OR.xlsx"),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return filePath;
  }
  throw new Error("Colombia_Solar_OR.xlsx no encontrado");
}

function parseFecha(fechaStr: string): string {
  const parts = String(fechaStr).trim().split("/");
  if (parts.length !== 3) return fechaStr;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function procesarHojaExcel(
  workbook: XLSX.WorkBook,
  sheetName: string,
  denom: "usuarios" | "potencia"
): HojaParsed {
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    return { proyectos: [], fechas: [], datos: [], totales: [], departamentos: [] };
  }

  const json = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: null,
  });
  if (json.length < 2) {
    return { proyectos: [], fechas: [], datos: [], totales: [], departamentos: [] };
  }

  const header = json[0] as (string | number | null)[];
  const dateCols = header
    .map((cell, idx) => ({ cell: String(cell ?? ""), idx }))
    .filter(({ cell, idx }) => idx >= 7 && cell.includes("/"));

  const fechas = dateCols.map(({ cell }) => cell);
  const fechaIndices = dateCols.map(({ idx }) => idx);

  const proyectos: string[] = [];
  const datos: number[][] = [];
  const totales: number[] = [];
  const departamentos: string[] = [];

  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    if (!row || !row[0]) continue;
    const nombre = String(row[0]).trim();
    if (!nombre || nombre.toUpperCase() === "TOTALES") continue;

    const total =
      denom === "potencia" ? Number(row[5]) || 1 : Number(row[6]) || 1;

    proyectos.push(nombre);
    departamentos.push(row[1] ? String(row[1]) : "");
    totales.push(total);
    datos.push(
      fechaIndices.map((idx) => {
        const raw = row[idx];
        if (raw === null || raw === "") return NaN;
        return Number(raw) || 0;
      })
    );
  }

  return { proyectos, fechas, datos, totales, departamentos };
}

function forwardFillPct(values: number[], total: number): number[] {
  let last = 0;
  return values.map((val) => {
    if (!Number.isNaN(val) && val > 0) last = val;
    return (last / total) * 100;
  });
}

function buildCategoriaExcel(
  workbook: XLSX.WorkBook,
  cfg: (typeof CURVA_S_CATEGORIAS)[number]
): CurvaSCategoria {
  const sheetMap: Record<string, string> = {
    proyectado_obras_civiles: "Proyectado Obras Civiles",
    reportado_obras_civiles: "Reportado Obras Civiles",
    proyectado_usuarios: "Proyectado Usuarios",
    reportado_usuarios: "Reportado Usuarios",
    proyectado_potencia: "Proyectado Potencia",
    reportado_potencia: "Reportado Potencia",
    proyectado_internas: "Proyectado Internas",
    reportado_internas: "Reportado Internas",
  };

  const projSheet = sheetMap[cfg.tablaProyectado] ?? cfg.tablaProyectado;
  const repSheet = sheetMap[cfg.tablaReportado] ?? cfg.tablaReportado;
  const projData = procesarHojaExcel(workbook, projSheet, cfg.denomProyectado);
  const repData = procesarHojaExcel(workbook, repSheet, cfg.denomReportado);

  const repByName = new Map<string, { datos: number[]; total: number }>();
  repData.proyectos.forEach((nombre, i) => {
    repByName.set(nombre, { datos: repData.datos[i], total: repData.totales[i] || 1 });
  });

  const allFechas = [...new Set([...projData.fechas, ...repData.fechas].map(parseFecha))].sort();
  const rawByIso = new Map(
    [...projData.fechas, ...repData.fechas].map((f) => [parseFecha(f), f])
  );

  const proyectos: ProyectoCurva[] = projData.proyectos.map((nombre, i) => {
    const totalProg = projData.totales[i] || 1;
    const repEntry = repByName.get(nombre);

    const progSeries = allFechas.map((iso) => {
      const rawFecha = rawByIso.get(iso) ?? iso;
      const projIdx = projData.fechas.indexOf(rawFecha);
      return projIdx >= 0 ? projData.datos[i][projIdx] : NaN;
    });

    const realSeries = allFechas.map((iso) => {
      if (!repEntry) return NaN;
      const rawFecha = rawByIso.get(iso) ?? iso;
      const repIdx = repData.fechas.indexOf(rawFecha);
      return repIdx >= 0 ? repEntry.datos[repIdx] : NaN;
    });

    const totalRep = repEntry?.total ?? totalProg;
    const progPct = forwardFillPct(progSeries, totalProg);
    const realPct = forwardFillPct(realSeries, totalRep);

    const programado: CurvaSPoint[] = allFechas.map((fecha, j) => ({
      fecha,
      programado: progPct[j],
      real: realPct[j],
    }));

    return {
      nombre,
      departamento: projData.departamentos[i] || "",
      programado,
    };
  });

  return { id: cfg.id, label: cfg.label, proyectos };
}

async function loadCurvaSFromExcel(): Promise<CurvaSCategoria[]> {
  const filePath = resolveExcelPath();
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return CURVA_S_CATEGORIAS.map((cfg) => buildCategoriaExcel(workbook, cfg)).filter(
    (c) => c.proyectos.length > 0
  );
}

export async function GET() {
  try {
    let categorias: CurvaSCategoria[] = [];
    let source = "postgresql";

    try {
      categorias = await loadCurvaSFromDb(getPool());
    } catch (dbErr) {
      console.warn("[api/colombia-solar/curva-s] BD no disponible, fallback Excel:", dbErr);
    }

    if (categorias.length === 0) {
      categorias = await loadCurvaSFromExcel();
      source = "excel";
    }

    if (categorias.length === 0) {
      return NextResponse.json(
        { error: "No hay datos de Curva S en BD ni en Excel" },
        { status: 404 }
      );
    }

    return NextResponse.json({ categorias, source });
  } catch (err) {
    console.error("[api/colombia-solar/curva-s]", err);
    return NextResponse.json({ error: "Error al obtener datos de Curva S" }, { status: 500 });
  }
}
