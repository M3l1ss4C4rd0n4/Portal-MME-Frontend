/** Clasificación de plantas térmicas por combustible (fuente: catálogo XM / operación SIN). */

export type CombustibleTermica = "Carbón" | "Gas" | "Gas Importado" | "Líquidos";

export const COMBUSTIBLE_COLORES: Record<CombustibleTermica, string> = {
  "Carbón": "#E2E8F0",
  Gas: "#14B8A6",
  "Gas Importado": "#1D4ED8",
  Líquidos: "#3B82F6",
};

/** Plantas carbón — centrales a carbón mineral. */
const CARBON = new Set([
  "PPA1", "PPA2", "PPA3", "PPA4", "GE32", "GEC3", "TBST", "TCDT", "TRN1",
  "2S8S", "3KL4", "TPD1", "TDR1",
]);

/** Regasificación GNL — terminal Cartagena. */
const GAS_IMPORTADO = new Set(["CTG1", "CTG2", "CTG3"]);

/** Combustibles líquidos — fuel oil / diésel. */
const LIQUIDOS = new Set([
  "2U91", "2U93", "2U8Y", "PRG1", "PRG2", "2WFN", "4YCN",
  "2XXR", "2YB9", "2S8I", "2S6Q", "2S6S", "2S8G", "2V25", "2V27",
  "3Q99", "3GJU", "3C3X", "3ADA", "3NNZ", "3KLQ", "3C4V", "2YWY",
  "3JNR", "4T6E", "4T6C", "4XP3", "ARG1", "3AXV", "PTR1", "2U5P",
  "5E69", "3ENA",
]);

export function clasificarCombustible(codigo: string, nombre?: string): CombustibleTermica {
  const code = codigo.toUpperCase();
  if (CARBON.has(code)) return "Carbón";
  if (GAS_IMPORTADO.has(code)) return "Gas Importado";
  if (LIQUIDOS.has(code)) return "Líquidos";

  const n = (nombre ?? "").toUpperCase();
  if (n.includes("CARTAGENA")) return "Gas Importado";
  if (
    n.includes("PAIPA") || n.includes("GECELCA") || n.includes("TEBSAB") ||
    n.includes("TERMOCANDELARIA") || n.includes("TERMONORTE") ||
    n.includes("DOÑA JUANA") || n.includes("DRUMMOND") || n.includes("TERMOPIEDRAS")
  ) {
    return "Carbón";
  }
  if (
    n.includes("AUTOG") || n.includes("MECHERO") || n.includes("PROELECTRICA") ||
    n.includes("PTAR") || n.includes("AGPE")
  ) {
    return "Líquidos";
  }
  return "Gas";
}

/** SQL CASE para clasificación en PostgreSQL. */
export const SQL_CASE_COMBUSTIBLE = `
  CASE
    WHEN c.codigo IN (${[...CARBON].map((c) => `'${c}'`).join(",")}) THEN 'Carbón'
    WHEN c.codigo IN (${[...GAS_IMPORTADO].map((c) => `'${c}'`).join(",")}) THEN 'Gas Importado'
    WHEN c.codigo IN (${[...LIQUIDOS].map((c) => `'${c}'`).join(",")}) THEN 'Líquidos'
    WHEN UPPER(c.nombre) LIKE '%CARTAGENA%' THEN 'Gas Importado'
    WHEN UPPER(c.nombre) ~ '(PAIPA|GECELCA|TEBSAB|TERMOCANDELARIA|TERMONORTE|DOÑA JUANA|DRUMMOND|TERMOPIEDRAS)' THEN 'Carbón'
    WHEN UPPER(c.nombre) ~ '(AUTOG|MECHERO|PROELECTRICA|PTAR|AGPE)' THEN 'Líquidos'
    ELSE 'Gas'
  END
`;
