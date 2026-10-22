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
  codigoBaseSql,
  nombreNormalizadoSql,
  mapaEmpresasCte,
  consultaMapaEmpresas,
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
    expect(codigoBaseSql("sp")).toContain("'-F$', ''");
    expect(empresaKeySql("sp")).toContain("'-F$', ''");
  });


});

describe("mapa de empresas", () => {
  test("la consulta solo toma filas que sí traen código", () => {
    const q = consultaMapaEmpresas();

    expect(q).toContain("IS NOT NULL");
    expect(q).toContain("subsidios.subsidios_pagos");
    expect(q).toContain("subsidios.subsidios_validaciones");
  });

  test("deja un solo código por nombre y descarta el nombre vacío", () => {
    expect(consultaMapaEmpresas()).toContain("DISTINCT ON (nom)");
    expect(consultaMapaEmpresas()).toContain("nom <> ''");
  });

  test("la CTE recibe el mapa ya resuelto como arreglos", () => {
    // Reconstruirlo dentro de cada consulta costaba 625 ms, y había diez.
    const cte = mapaEmpresasCte("$1", "$2");

    expect(cte).toContain("unnest($1::text[], $2::text[])");
    expect(cte).toContain("t(nom, cod)");
    // Sin MATERIALIZED, PostgreSQL inserta la CTE y reevalúa el unnest por
    // cada fila exterior: 2.979 ms en la consulta de opciones de empresa.
    expect(cte).toContain("AS MATERIALIZED");
  });
});

describe("empresaKeySql: rescate sin JOIN", () => {
  test("el rescate por nombre es una subconsulta dentro de COALESCE", () => {
    // COALESCE corta en el primer valor no nulo, así que la subconsulta solo
    // se evalúa en las filas sin código: 24 ms en vez de 1.040 ms con JOIN.
    const sql = empresaKeySql("sv");

    expect(sql).toContain("COALESCE(");
    expect(sql).toContain("SELECT m.cod FROM mapa_empresa m");
    expect(sql).not.toContain("JOIN");
  });

  test("el código propio va antes que el rescate y que el respaldo", () => {
    const sql = empresaKeySql("sv");
    const posCodigo = sql.indexOf("codigo_sui");
    const posRescate = sql.indexOf("m.cod");
    const posRespaldo = sql.indexOf("'NOM:'");

    expect(posCodigo).toBeLessThan(posRescate);
    expect(posRescate).toBeLessThan(posRespaldo);
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
