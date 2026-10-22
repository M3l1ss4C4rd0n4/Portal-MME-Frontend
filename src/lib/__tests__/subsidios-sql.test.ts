import { describe, test, expect } from "vitest";
import {
  ESTADOS_VALIDACION,
  etiquetaEstado,
  empresaKeySql,
  estadoValidacionSql,
  areaSql,
  anioPagosSql,
  trimestrePagosSql,
  resolucionDistintaSql,
  periodoLabel,
  pctEjecucion,
} from "../subsidios-sql";

describe("etiquetaEstado", () => {
  test("quita el prefijo de ordenamiento", () => {
    expect(etiquetaEstado("e. VF")).toBe("VF");
    expect(etiquetaEstado("c. VI SP")).toBe("VI SP");
    expect(etiquetaEstado("a. Otros")).toBe("Otros");
  });

  test("deja intacto un estado sin prefijo", () => {
    expect(etiquetaEstado("VF")).toBe("VF");
  });

  test("todos los estados declarados quedan con etiqueta legible", () => {
    const etiquetas = ESTADOS_VALIDACION.map(etiquetaEstado);
    expect(etiquetas).toEqual(["VF", "VP", "VI", "VI SP", "Otros"]);
  });
});

describe("empresaKeySql", () => {
  test("prefiere codigo_sui y cae al nombre normalizado", () => {
    const sql = empresaKeySql("sp");

    expect(sql).toContain("TRIM(sp.codigo_sui)");
    expect(sql).toMatch(/NULLIF\([\s\S]*sp\.codigo_sui/);
    expect(sql).toContain("'NOM:'");
    expect(sql).toContain("sp.nombre_prestador");
  });

  test("normaliza quitando todo lo que no sea letra o dígito", () => {
    // Es lo que colapsa las tres grafías de CARIBEMAR en una sola empresa.
    expect(empresaKeySql("sp")).toContain("'[^A-Za-z0-9]+', '', 'g'");
  });

  test("respeta el alias que recibe", () => {
    expect(empresaKeySql("sv")).toContain("sv.codigo_sui");
    expect(empresaKeySql("sv")).not.toContain("sp.");
  });

  test("quita el sufijo -F, que marca el fondo y no otra empresa", () => {
    // 1411 (FSSRI) y 1411-F (FOES) son la misma CARIBEMAR en el catálogo.
    expect(empresaKeySql("sp")).toContain("'-F$', ''");
  });
});

describe("resolucionDistintaSql", () => {
  test("identifica la resolución por número y año de la resolución", () => {
    expect(resolucionDistintaSql("sp")).toBe(
      "(sp.no_resolucion, LEFT(sp.anio_trimestre_resolucion, 4))"
    );
  });

  test("no usa el año de pago", () => {
    // Por año de pago salen 781 resoluciones: una misma se paga en varios años.
    expect(resolucionDistintaSql("sp")).not.toContain("sp.anio,");
    expect(resolucionDistintaSql("sp")).not.toMatch(/sp\.anio\b(?!_)/);
  });
});

describe("estadoValidacionSql", () => {
  test("da prioridad a la columna ya organizada", () => {
    const sql = estadoValidacionSql("sv");
    const posOrganizado = sql.indexOf("estado_validacion_organizado");
    const posCrudo = sql.indexOf("'VF'");

    expect(posOrganizado).toBeGreaterThanOrEqual(0);
    expect(posOrganizado).toBeLessThan(posCrudo);
  });

  test("compara contra el texto limpio, no contra el crudo", () => {
    // Sin esto, 'VI ' (con espacio) y las variantes de caja caen en Otros.
    expect(estadoValidacionSql("sv")).toContain("TRIM(UPPER(COALESCE(sv.estado_validacion, '')))");
  });

  test("trata VI_SP y VI SP como el mismo estado", () => {
    // La regresión concreta: 1.595 filas con guion bajo salían clasificadas como Otros.
    expect(estadoValidacionSql("sv")).toContain("IN ('VI SP', 'VI_SP')");
  });

  test("cubre los cinco estados declarados", () => {
    const sql = estadoValidacionSql("sv");
    for (const estado of ESTADOS_VALIDACION) {
      expect(sql).toContain(`'${estado}'`);
    }
  });
});

describe("areaSql", () => {
  test("manda a SIN las filas de FOES sin área", () => {
    const sql = areaSql("sv");

    expect(sql).toContain("sv.area = 'NA' OR sv.area IS NULL");
    expect(sql).toContain("sv.fondo = 'FOES'");
    expect(sql).toContain("THEN 'SIN'");
  });
});

describe("periodo de pagos", () => {
  test("lee el año y el trimestre de anio_trimestre_resolucion", () => {
    // La columna `trimestre` de subsidios_pagos viene nula en el 34% de las filas.
    expect(anioPagosSql("sp")).toBe("LEFT(sp.anio_trimestre_resolucion, 4)::int");
    expect(trimestrePagosSql("sp")).toBe("RIGHT(sp.anio_trimestre_resolucion, 1)::int");
  });

  test("ninguno usa la columna trimestre", () => {
    expect(anioPagosSql("sp")).not.toContain("sp.trimestre");
    expect(trimestrePagosSql("sp")).not.toContain("sp.trimestre");
  });
});

describe("periodoLabel", () => {
  test("arma la etiqueta del eje", () => {
    expect(periodoLabel(2026, 1)).toBe("2026 T1");
    expect(periodoLabel(2024, 4)).toBe("2024 T4");
  });
});

describe("pctEjecucion", () => {
  test("calcula el porcentaje pagado sobre el asignado", () => {
    expect(pctEjecucion(50, 100)).toBe(50);
    expect(pctEjecucion(100, 100)).toBe(100);
  });

  test("no recorta por encima de 100", () => {
    // En la fuente hay resoluciones con pct_pagado de 1,34.
    expect(pctEjecucion(134, 100)).toBeCloseTo(134);
  });

  test("devuelve 0 cuando no hay valor asignado, sin dividir por cero", () => {
    expect(pctEjecucion(500, 0)).toBe(0);
    expect(Number.isFinite(pctEjecucion(500, 0))).toBe(true);
  });
});
