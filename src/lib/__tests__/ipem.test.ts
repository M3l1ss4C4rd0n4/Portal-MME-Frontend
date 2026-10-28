import { describe, it, expect } from "vitest";
import {
  BANDAS_MUNICIPAL,
  BANDAS_DEPARTAMENTAL,
  QUINTILES,
  colorQuintil,
  distribucionPorQuintil,
  fmtIpemPct,
  fmtVariacionPp,
  ipemDe,
  normalizarQuintil,
  quintilDe,
  quintilPublicado,
  variacionPp,
  variacionPromedioComparable,
  type MunicipioIpem,
} from "../ipem";

function municipio(parcial: Partial<MunicipioIpem>): MunicipioIpem {
  return {
    codMunicipio: "05001",
    codDepartamento: "05",
    departamento: "Antioquia",
    municipio: "Medellín",
    ipem2024: null,
    ipem2025: null,
    quintil2024: null,
    quintil2025: null,
    ...parcial,
  };
}

describe("quintilPublicado — bandas del informe 2025", () => {
  it("clasifica los bordes exactos de cada banda municipal", () => {
    // Arrange / Act / Assert por banda: el borde es donde más fácil se cuela un
    // error de < contra <=, y el informe publica los límites inclusive.
    for (const banda of BANDAS_MUNICIPAL) {
      expect(quintilPublicado(banda.desdePct / 100, "municipal")).toBe(banda.quintil);
      expect(quintilPublicado(banda.hastaPct / 100, "municipal")).toBe(banda.quintil);
    }
  });

  it("clasifica los bordes exactos de cada banda departamental", () => {
    for (const banda of BANDAS_DEPARTAMENTAL) {
      expect(quintilPublicado(banda.desdePct / 100, "departamental")).toBe(banda.quintil);
      expect(quintilPublicado(banda.hastaPct / 100, "departamental")).toBe(banda.quintil);
    }
  });

  it("las bandas municipales y departamentales son distintas para un mismo valor", () => {
    // 21 % es BAJO entre departamentos pero MUY BAJO entre municipios: usar la
    // escala equivocada cambiaría el color de la mitad del mapa.
    expect(quintilPublicado(0.21, "departamental")).toBe("BAJO");
    expect(quintilPublicado(0.21, "municipal")).toBe("MUY BAJO");
  });

  it("asigna al extremo más cercano los valores que caen fuera de las bandas", () => {
    // Las bandas se fijaron con la distribución de un año; el mínimo municipal de
    // 2024 es 15,17 %, por debajo del piso de 12,87 %, y no debe quedar sin color.
    expect(quintilPublicado(0.05, "municipal")).toBe("MUY BAJO");
    expect(quintilPublicado(0.99, "municipal")).toBe("MUY ALTO");
  });

  it("devuelve null sin dato, en lugar de inventar una clasificación", () => {
    expect(quintilPublicado(null, "municipal")).toBeNull();
    expect(quintilPublicado(undefined, "municipal")).toBeNull();
    expect(quintilPublicado(Number.NaN, "municipal")).toBeNull();
  });
});

describe("variacionPp", () => {
  it("es negativa cuando el índice baja, porque el IPEM mide privación", () => {
    // Abriaquí: 27,30 % → 26,49 %. Mejora de 0,81 puntos porcentuales.
    const v = variacionPp(0.2730122060670371, 0.2648604170324295);
    expect(v).not.toBeNull();
    expect(v as number).toBeCloseTo(-0.8152, 3);
  });

  it("es null cuando falta uno de los dos años (caso Angelópolis, sin IPEM 2024)", () => {
    expect(variacionPp(null, 0.2496721823592163)).toBeNull();
    expect(variacionPp(0.25, null)).toBeNull();
    expect(variacionPp(undefined, undefined)).toBeNull();
  });

  it("es 0 cuando el valor no cambia", () => {
    expect(variacionPp(0.3, 0.3)).toBe(0);
  });
});

describe("el quintil del Excel puede subir aunque el IPEM baje", () => {
  it("reproduce el caso Abriaquí, que es la razón del aviso en el tablero", () => {
    // Arrange: fila real de la entrega del área.
    const abriaqui = municipio({
      codMunicipio: "05004",
      municipio: "Abriaquí",
      ipem2024: 0.2730122060670371,
      ipem2025: 0.2648604170324295,
      quintil2024: "BAJO",
      quintil2025: "MEDIO",
    });

    // Act
    const variacion = variacionPp(abriaqui.ipem2024, abriaqui.ipem2025);

    // Assert: el índice mejoró y sin embargo la etiqueta empeoró, porque los
    // quintiles del Excel son relativos a la distribución de cada año.
    expect(variacion as number).toBeLessThan(0);
    expect(quintilDe(abriaqui, "2024")).toBe("BAJO");
    expect(quintilDe(abriaqui, "2025")).toBe("MEDIO");
  });
});

describe("normalizarQuintil", () => {
  it("acepta las cinco etiquetas canónicas", () => {
    for (const q of QUINTILES) {
      expect(normalizarQuintil(q)).toBe(q);
    }
  });

  it("tolera minúsculas, tildes y espacios de sobra del Excel", () => {
    expect(normalizarQuintil("  muy bajo ")).toBe("MUY BAJO");
    expect(normalizarQuintil("Muy  Alto")).toBe("MUY ALTO");
  });

  it("devuelve null ante una etiqueta desconocida o vacía", () => {
    expect(normalizarQuintil("QUINTIL 3")).toBeNull();
    expect(normalizarQuintil("")).toBeNull();
    expect(normalizarQuintil(null)).toBeNull();
  });
});

describe("ipemDe y distribucionPorQuintil", () => {
  it("ipemDe toma la columna del año pedido", () => {
    const m = municipio({ ipem2024: 0.31, ipem2025: 0.28 });
    expect(ipemDe(m, "2024")).toBe(0.31);
    expect(ipemDe(m, "2025")).toBe(0.28);
  });

  it("cuenta por quintil en el orden oficial y rellena con 0 los vacíos", () => {
    // Arrange
    const municipios = [
      municipio({ codMunicipio: "05001", quintil2025: "MUY BAJO" }),
      municipio({ codMunicipio: "05002", quintil2025: "MUY BAJO" }),
      municipio({ codMunicipio: "05004", quintil2025: "MEDIO" }),
    ];

    // Act
    const dist = distribucionPorQuintil(municipios, "2025");

    // Assert
    expect(dist.map((d) => d.quintil)).toEqual([...QUINTILES]);
    expect(dist.map((d) => d.municipios)).toEqual([2, 0, 1, 0, 0]);
  });

  it("no cuenta una fila cuya etiqueta no se reconoce", () => {
    const dist = distribucionPorQuintil([municipio({ quintil2025: "???" })], "2025");
    expect(dist.reduce((a, d) => a + d.municipios, 0)).toBe(0);
  });
});

describe("variacionPromedioComparable", () => {
  it("ignora los municipios que no tienen los dos años, para no mezclar composición", () => {
    // Arrange: dos municipios comparables que empeoran 2 pp cada uno, más uno que
    // solo tiene 2025 con un valor muy bajo. Si entrara en el promedio de 2025,
    // el delta saldría negativo y diría que la situación mejoró.
    const municipios = [
      municipio({ codMunicipio: "05001", ipem2024: 0.3, ipem2025: 0.32 }),
      municipio({ codMunicipio: "05002", ipem2024: 0.4, ipem2025: 0.42 }),
      municipio({ codMunicipio: "05036", ipem2024: null, ipem2025: 0.01 }),
    ];

    // Act
    const v = variacionPromedioComparable(municipios);

    // Assert
    expect(v as number).toBeCloseTo(2, 6);
  });

  it("es null cuando ningún municipio tiene los dos años", () => {
    expect(variacionPromedioComparable([municipio({ ipem2025: 0.3 })])).toBeNull();
    expect(variacionPromedioComparable([])).toBeNull();
  });
});

describe("formato", () => {
  it("fmtIpemPct escribe el porcentaje con coma decimal", () => {
    expect(fmtIpemPct(0.191734946253447)).toBe("19,17 %");
    expect(fmtIpemPct(0.6358)).toBe("63,58 %");
  });

  it("fmtIpemPct devuelve raya cuando no hay dato, nunca 0", () => {
    expect(fmtIpemPct(null)).toBe("—");
    expect(fmtIpemPct(undefined)).toBe("—");
  });

  it("fmtVariacionPp usa signo explícito y la unidad pp, no %", () => {
    expect(fmtVariacionPp(-0.8152)).toBe("−0,82 pp");
    expect(fmtVariacionPp(1.5)).toBe("+1,50 pp");
    expect(fmtVariacionPp(0)).toBe("0,00 pp");
    expect(fmtVariacionPp(null)).toBe("—");
  });
});

describe("colorQuintil", () => {
  it("da un color distinto a cada nivel", () => {
    const colores = QUINTILES.map((q) => colorQuintil(q));
    expect(new Set(colores).size).toBe(QUINTILES.length);
  });

  it("da gris cuando no hay quintil", () => {
    expect(colorQuintil(null)).toBe("#64748B");
  });
});
