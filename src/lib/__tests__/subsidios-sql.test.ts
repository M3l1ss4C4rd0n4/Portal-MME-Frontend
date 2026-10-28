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
  consultaCortes,
  corteWhereSql,
  claveCorte,
  CODIGOS_UNIFICADOS,
  codigoNormalizadoSql,
  catalogoEmpresasCte,
  indiceTrimestre,
  periodoDesdeIndice,
  rangoPeriodoSql,
  rangoPeriodoPagosSql,
  clavePeriodoPagos,
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

    expect(sql).toContain("sp.codigo_sui");
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

  test("NO quita el sufijo -N: ahí sí hay dos empresas distintas", () => {
    // El catálogo da `1213-F` = CELSIA COLOMBIA y `1213-N` = CELSIA TOLIMA.
    expect(codigoBaseSql("sp")).not.toContain("-N$");
    expect(codigoBaseSql("sp")).not.toContain("-(F|N)$");
  });
});

describe("codigoBaseSql: normalización", () => {
  test("pasa a mayúsculas y quita los espacios internos", () => {
    // `34833s`/`34833S` y `67580 - 1757`/`67580-1757` eran dos empresas cada par.
    const sql = codigoBaseSql("sv");

    expect(sql).toContain("UPPER(");
    expect(sql).toContain("'\\s+', '', 'g'");
  });

  test("trata los marcadores de la fuente como código ausente", () => {
    const sql = codigoBaseSql("sv");

    // MUNICIPIO DE CUMBAL salía partido: `N.A.2-N` en validaciones, `N.A.-N` en pagos.
    expect(sql).toContain("'^N\\.A\\.'");
    expect(sql).toContain("= 'NAN'");
    // Un guion suelto tampoco es un código: bajo él la fuente mete tres
    // empresas que no tienen nada que ver entre sí.
    expect(sql).toContain("!~ '[A-Z0-9]'");
  });

  test("el catálogo se normaliza igual, y no duplica filas al cruzar", () => {
    // El catálogo guarda `1411` y `1411-F`: al reducirlos colapsan en la misma
    // clave, y sin DISTINCT ON el JOIN duplicaría esas 18 empresas.
    const cte = catalogoEmpresasCte();

    expect(cte).toContain("DISTINCT ON (cod)");
    expect(cte).toContain("subsidios.subsidios_empresas");
    expect(cte).toContain("NULLIF(se.nit, 'NaN')");
    // Entre dos entradas del mismo código gana la que trae NIT.
    expect(cte).toContain("ORDER BY cod, (nit IS NULL)");
  });

  test("normalizar el catálogo aplica el mismo criterio que a los datos", () => {
    const datos = codigoNormalizadoSql("sv.codigo_sui");
    const catalogo = codigoNormalizadoSql("se.codigo_sui");

    expect(catalogo).toBe(datos.replaceAll("sv.codigo_sui", "se.codigo_sui"));
  });

  test("unifica los códigos que SUI reparte entre el SIN y las ZNI", () => {
    expect(CODIGOS_UNIFICADOS["520"]).toBe("1239"); //  CEDENAR
    expect(CODIGOS_UNIFICADOS["1426"]).toBe("2170"); // SIGLO XXI
    // Viajan a SQL como un jsonb literal, no como una cadena de CASE a mano.
    expect(codigoBaseSql("sv")).toContain('{"520":"1239","1426":"2170"}');
  });

  test("ningún par unificado se apunta a sí mismo ni encadena", () => {
    // Un valor que fuera a su vez clave dejaría la unificación a medias.
    for (const [origen, destino] of Object.entries(CODIGOS_UNIFICADOS)) {
      expect(origen).not.toBe(destino);
      expect(CODIGOS_UNIFICADOS[destino]).toBeUndefined();
    }
  });
});

describe("período como índice de trimestre", () => {
  test("avanza de uno en uno y da la vuelta al cambiar de año", () => {
    expect(indiceTrimestre(2026, 2) - indiceTrimestre(2026, 1)).toBe(1);
    expect(indiceTrimestre(2026, 1) - indiceTrimestre(2025, 4)).toBe(1);
  });

  test("periodoDesdeIndice es el inverso exacto", () => {
    for (const [anio, trimestre] of [[2014, 1], [2020, 3], [2026, 4]] as const) {
      expect(periodoDesdeIndice(indiceTrimestre(anio, trimestre))).toEqual({ anio, trimestre });
    }
  });

  test("el rango de validaciones compara por filas, para usar el índice", () => {
    // `anio * 4 + trimestre BETWEEN …` dejaría `idx_sv_anio_trim` sin usar.
    const sql = rangoPeriodoSql("sv", ["$3", "$4", "$5", "$6"]);

    expect(sql).toContain("(sv.anio, sv.trimestre) >= ($3::int, $4::int)");
    expect(sql).toContain("(sv.anio, sv.trimestre) <= ($5::int, $6::int)");
  });

  test("el de pagos compara el texto YYYY/TN, que ordena igual que la fecha", () => {
    expect(clavePeriodoPagos(2026, 1)).toBe("2026/T1");
    expect(clavePeriodoPagos(2014, 4) < clavePeriodoPagos(2015, 1)).toBe(true);
    expect(rangoPeriodoPagosSql("sp", "$3", "$4")).toBe(
      "sp.anio_trimestre_resolucion BETWEEN $3 AND $4"
    );
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
    // Un objeto jsonb se busca por clave; como CTE de filas, cada consulta la
    // recorría entera por fila sin código (2.979 ms contra 38 ms).
    expect(cte).toContain("jsonb_object_agg(nom, cod)");
    expect(cte).toContain("AS MATERIALIZED");
  });
});

describe("empresaKeySql: rescate sin JOIN", () => {
  test("el rescate por nombre es una subconsulta dentro de COALESCE", () => {
    // COALESCE corta en el primer valor no nulo, así que la subconsulta solo
    // se evalúa en las filas sin código: 24 ms en vez de 1.040 ms con JOIN.
    const sql = empresaKeySql("sv");

    expect(sql).toContain("COALESCE(");
    expect(sql).toContain("SELECT j ->>");
    expect(sql).toContain("FROM mapa_empresa");
    expect(sql).not.toContain("JOIN");
  });

  test("el código propio va antes que el rescate y que el respaldo", () => {
    const sql = empresaKeySql("sv");
    const posCodigo = sql.indexOf("codigo_sui");
    const posRescate = sql.indexOf("j ->>");
    const posRespaldo = sql.indexOf("'NOM:'");

    expect(posCodigo).toBeLessThan(posRescate);
    expect(posRescate).toBeLessThan(posRespaldo);
  });
});

describe("cortes de validaciones", () => {
  test("cada mes se resuelve a la fecha de su última carga", () => {
    // Un mes trae dos cargas, y cada una es un snapshot completo: filtrar por
    // el mes entero duplicaba los conteos (VI daba 3.068 contra 1.536 reales).
    const q = consultaCortes();

    expect(q).toContain("MAX(fecha_actualizacion)::date");
    expect(q).toContain("GROUP BY 1, 2");
    expect(q).toContain("ORDER BY anio DESC, mes DESC");
  });

  test("la restricción es un rango de un día, sin envolver la columna", () => {
    const sql = corteWhereSql("sv", "$3");

    expect(sql).toContain("sv.fecha_actualizacion >= $3::date");
    expect(sql).toContain("sv.fecha_actualizacion < $3::date + 1");
    // Envolver la columna en una función impediría usar un índice sobre ella.
    expect(sql).not.toContain("fecha_actualizacion::date =");
    expect(sql).not.toContain("EXTRACT");
  });

  test("no quedan cortes resueltos por mes", () => {
    expect(corteWhereSql("sv", "$1")).not.toContain("MONTH");
  });

  test("la clave del corte lleva el mes con dos dígitos", () => {
    expect(claveCorte({ anio: 2026, mes: 10 })).toBe("2026-10");
    expect(claveCorte({ anio: 2026, mes: 5 })).toBe("2026-05");
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
