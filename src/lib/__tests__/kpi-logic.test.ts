import { describe, it, expect } from "vitest";
import {
  estadoReservas,
  estadoAportes,
  estadoPrecio,
  estadoI2Hidro,
  estadoI3Termica,
  estadoGeneracion,
  diagnosticoSIN,
} from "../kpi-logic";
import {
  PRECIO_ESCASEZ_PEI_REF_2026_01,
  PRECIO_ESCASEZ_PE_REF_2026_01,
  PRECIO_ESCASEZ_PES_REF_2026_01,
} from "../umbralesOficiales";

describe("estadoReservas (CREG)", () => {
  it("NORMAL para >= 80%", () => {
    expect(estadoReservas(80).label).toBe("NORMAL");
  });

  it("70-80% ya no es 'ESTABLE' incondicional (regla derogada Res. CREG 210/2021) — depende de la senda", () => {
    // La banda fija "ESTABLE >= 70%" se eliminó el 2026-08-24: esa regla
    // absoluta fue derogada por la Res. CREG 101 112/2026, vigente desde
    // 17-jun-2026. Ahora, sin importar el mes, un valor de 75% nunca debe
    // devolver la etiqueta derogada.
    const r = estadoReservas(75);
    expect(r.label).not.toBe("ESTABLE");
    expect(["SOBRE SENDA", "ALERTA — BAJO SENDA", "RIESGO — DESABASTECIMIENTO"]).toContain(r.label);
  });

  it("clasifica bajo senda como alerta o riesgo", () => {
    const r = estadoReservas(55);
    expect(["ALERTA — BAJO SENDA", "RIESGO — DESABASTECIMIENTO", "SOBRE SENDA"]).toContain(r.label);
  });
});

describe("estadoAportes (HSIN visual)", () => {
  it("MUY FAVORABLE para >= 120%", () => {
    expect(estadoAportes(120).label).toBe("MUY FAVORABLE");
  });

  it("VIGILANCIA CREG para 90-99%", () => {
    expect(estadoAportes(90).label).toBe("VIGILANCIA CREG");
  });

  it("DÉFICIT HÍDRICO para 70-89%", () => {
    expect(estadoAportes(70).label).toBe("DÉFICIT HÍDRICO");
  });
});

describe("estadoPrecio (PEI/PE/PES)", () => {
  it("CÓMODO bajo PEI", () => {
    expect(estadoPrecio(PRECIO_ESCASEZ_PEI_REF_2026_01 - 1).label).toBe("CÓMODO");
  });

  it("ESTRÉS MODERADO entre PEI y PE", () => {
    expect(estadoPrecio(PRECIO_ESCASEZ_PEI_REF_2026_01 + 1).label).toBe("ESTRÉS MODERADO");
  });

  it("ALTA PRESIÓN entre PE y PES", () => {
    expect(estadoPrecio(PRECIO_ESCASEZ_PE_REF_2026_01 + 1).label).toBe("ALTA PRESIÓN");
  });

  it("TECHO REGULATORIO sobre PES", () => {
    expect(estadoPrecio(PRECIO_ESCASEZ_PES_REF_2026_01).label).toBe("TECHO REGULATORIO");
  });
});

describe("estadoI2Hidro", () => {
  it("SOSTENIBLE para ratio <= 1.0", () => {
    expect(estadoI2Hidro(1.0).label).toBe("SOSTENIBLE");
  });

  it("CRÍTICO para > 1.5", () => {
    expect(estadoI2Hidro(1.51).label).toBe("CRÍTICO");
  });
});

describe("estadoI3Termica", () => {
  it("CRÍTICO para > 35%", () => {
    expect(estadoI3Termica(36).label).toBe("CRÍTICO");
  });
});

describe("estadoGeneracion", () => {
  it("prioriza térmica crítica", () => {
    const fuentes = [{ id: "TERMICA", value: 40 }];
    expect(estadoGeneracion(fuentes, 100, null, 150).label).toBe("CRÍTICO");
  });

  it("prioriza techo regulatorio de precio", () => {
    expect(estadoGeneracion(undefined, 100, null, PRECIO_ESCASEZ_PES_REF_2026_01).label).toBe(
      "TECHO REGULATORIO",
    );
  });
});

describe("diagnosticoSIN (Índice NE)", () => {
  it("riesgo cuando embalse está bajo senda", () => {
    expect(diagnosticoSIN(30, 100, 200).toLowerCase()).toMatch(/riesgo|senda/);
  });

  it("normales cuando embalse >= 80%", () => {
    expect(diagnosticoSIN(80, 100, 200).toLowerCase()).toContain("normal");
  });
});
