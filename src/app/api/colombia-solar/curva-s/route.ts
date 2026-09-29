import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { getPool } from "@/lib/db";
import {
  CURVA_S_CATEGORIAS,
  loadCurvaSFromDb,
  TODAY_ISO,
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
  operadores: string[];
  usuarios: number[];
  potencia: number[];
};

function resolveExcelPath(): string {
  // 1. Archivo actualizado por el sync automático del servidor (FUENTE PRINCIPAL)
  const serverSyncPath = "/home/admonctrlxm/server/data/onedrive/Colombia_Solar_OR.xlsx";
  if (fs.existsSync(serverSyncPath)) return serverSyncPath;

  // 2. Variable de entorno (para override manual)
  if (process.env.COLOMBIA_SOLAR_XLSX && fs.existsSync(process.env.COLOMBIA_SOLAR_XLSX)) {
    return process.env.COLOMBIA_SOLAR_XLSX;
  }

  // 3. Fallback relativo al servidor (mismo directorio)
  const relativeServerPath = path.resolve(process.cwd(), "../server/data/onedrive/Colombia_Solar_OR.xlsx");
  if (fs.existsSync(relativeServerPath)) return relativeServerPath;

  // 4. Último recurso: copia local del frontend (puede estar desactualizada)
  const localPath = path.resolve(process.cwd(), "data", "Colombia_Solar_OR.xlsx");
  if (fs.existsSync(localPath)) return localPath;

  throw new Error("Colombia_Solar_OR.xlsx no encontrado en ninguna ubicación");
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
    return { proyectos: [], fechas: [], datos: [], totales: [], departamentos: [], operadores: [], usuarios: [], potencia: [] };
  }

  const json = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: null,
  });
  if (json.length < 2) {
    return { proyectos: [], fechas: [], datos: [], totales: [], departamentos: [], operadores: [], usuarios: [], potencia: [] };
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
  const operadores: string[] = [];
  const usuarios: number[] = [];
  const potencia: number[] = [];

  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    if (!row || !row[0]) continue;
    const nombre = String(row[0]).trim();
    if (!nombre || nombre.toUpperCase() === "TOTALES") continue;

    const total =
      denom === "potencia" ? Number(row[5]) || 0 : Number(row[6]) || 0;

    proyectos.push(nombre);
    departamentos.push(row[1] ? String(row[1]) : "");
    operadores.push(row[3] ? String(row[3]).trim() : "");
    totales.push(total);
    usuarios.push(Number(row[6]) || 0);
    potencia.push(Number(row[5]) || 0);
    datos.push(
      fechaIndices.map((idx) => {
        const raw = row[idx];
        if (raw === null || raw === "") return NaN;
        return Number(raw) || 0;
      })
    );
  }

  return { proyectos, fechas, datos, totales, departamentos, operadores, usuarios, potencia };
}

function forwardFillPct(values: number[], total: number): number[] {
  let last = 0;
  return values.map((val) => {
    if (!Number.isNaN(val) && val > 0) last = Math.max(last, val);
    return Math.min((last / total) * 100, 100);
  });
}

function forwardFillPctReal(values: number[], total: number): (number | null)[] {
  // NaN intermedios (desfase de fechas entre hojas) → forward-fill.
  // NaN al final (contratista dejó de reportar) → cortar.
  let cumSum = 0;
  let hasStarted = false;
  const result: (number | null)[] = values.map((val) => {
    if (Number.isNaN(val)) return hasStarted ? Math.min((cumSum / total) * 100, 100) : null;
    cumSum += val;
    hasStarted = true;
    return Math.min((cumSum / total) * 100, 100);
  });
  let lastNonNaN = values.length - 1;
  while (lastNonNaN >= 0 && Number.isNaN(values[lastNonNaN])) lastNonNaN--;
  for (let i = lastNonNaN + 1; i < result.length; i++) result[i] = null;
  return result;
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
    repByName.set(nombre, { datos: repData.datos[i], total: repData.totales[i] });
  });

  // "Proyectado" define el horizonte real del proyecto. Una fecha de
  // "Reportado" posterior a ese horizonte es un encabezado corrupto en el
  // Excel (año mal digitado, ej. 2027/2028/2029 en vez de 2026) — se excluye
  // del eje compartido para que no lo estire ni desplace los ticks visibles.
  const projIsoFechas = projData.fechas.map(parseFecha);
  const maxProjIso = projIsoFechas.length ? projIsoFechas.reduce((a, b) => (b > a ? b : a)) : null;
  const repFechasFiltradas = maxProjIso
    ? repData.fechas.filter((f) => parseFecha(f) <= maxProjIso)
    : repData.fechas;

  const allFechas = [...new Set([...projData.fechas, ...repFechasFiltradas].map(parseFecha))].sort();
  const rawByIso = new Map(
    [...projData.fechas, ...repFechasFiltradas].map((f) => [parseFecha(f), f])
  );

  const maxPositiveExcel = (values: number[]) =>
    values.reduce((m, v) => (!Number.isNaN(v) && v > 0 ? Math.max(m, v) : m), 0);

  const proyectos: ProyectoCurva[] = projData.proyectos.map((nombre, i) => {
    const repEntry = repByName.get(nombre);

    const progSeries = allFechas.map((iso) => {
      const rawFecha = rawByIso.get(iso) ?? iso;
      const projIdx = projData.fechas.indexOf(rawFecha);
      return projIdx >= 0 ? projData.datos[i][projIdx] : NaN;
    });

    // "Real" son datos reportados: una fecha futura no puede tener un reporte real
    // (columnas corruptas por deduplicación de headers duplicados en el Excel, o fechas
    // mal digitadas) — se excluyen para que la línea "Real" no se arrastre más allá del
    // último reporte legítimo.
    const realSeries = allFechas.map((iso) => {
      if (!repEntry || iso > TODAY_ISO) return NaN;
      const rawFecha = rawByIso.get(iso) ?? iso;
      const repIdx = repData.fechas.indexOf(rawFecha);
      return repIdx >= 0 ? repEntry.datos[repIdx] : NaN;
    });

    // Si total=0 en Excel (celda vacía), derivar del máximo acumulado de la serie
    const rawTotalProg = projData.totales[i];
    const totalProg = rawTotalProg > 1 ? rawTotalProg : (maxPositiveExcel(progSeries) || 1);
    const rawTotalRep = repEntry?.total ?? rawTotalProg;
    const totalRep = rawTotalRep > 1 ? rawTotalRep : (maxPositiveExcel(realSeries) || totalProg);

    const progPct = forwardFillPct(progSeries, totalProg);
    const realPct = forwardFillPctReal(realSeries, totalRep);

    const hasPositiveReal = realSeries.some((v) => !Number.isNaN(v) && v > 0);
    const realFuente: ProyectoCurva["realFuente"] = !repEntry
      ? "sin_datos"
      : hasPositiveReal
      ? "reportado"
      : "sin_avance";

    const programado: CurvaSPoint[] = allFechas.map((fecha, j) => ({
      fecha,
      programado: progPct[j],
      real: realPct[j],
    }));

    return {
      nombre,
      departamento: projData.departamentos[i] || "",
      operadorDeRed: projData.operadores[i] || "",
      realFuente,
      usuarios: projData.usuarios[i] || 0,
      potencia: projData.potencia[i] || 0,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programa = searchParams.get("programa") || undefined;

    let categorias: CurvaSCategoria[] = [];
    let source = "postgresql";

    try {
      categorias = await loadCurvaSFromDb(getPool(), programa);
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
