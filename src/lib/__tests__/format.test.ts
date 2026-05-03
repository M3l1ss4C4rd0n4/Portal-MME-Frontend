import { describe, it, expect } from "vitest";
import { fmtCOP, fmtNum, fmtFull } from "../format";

describe("fmtCOP", () => {
  it("formatea enteros con símbolo $ y separadores es-CO", () => {
    expect(fmtCOP(1_234_567)).toBe("$ 1.234.567");
  });

  it("redondea decimales", () => {
    expect(fmtCOP(1_234_567.89)).toBe("$ 1.234.568");
    expect(fmtCOP(1_234_567.4)).toBe("$ 1.234.567");
  });

  it("maneja cero", () => {
    expect(fmtCOP(0)).toBe("$ 0");
  });

  it("maneja negativos", () => {
    expect(fmtCOP(-500)).toBe("$ -500");
  });
});

describe("fmtNum", () => {
  it("formatea sin símbolo de moneda", () => {
    expect(fmtNum(1_234_567)).toBe("1.234.567");
  });

  it("redondea decimales", () => {
    expect(fmtNum(99.9)).toBe("100");
  });
});

describe("fmtFull", () => {
  it("es idéntico a fmtCOP en implementación", () => {
    expect(fmtFull(1_234_567)).toBe(fmtCOP(1_234_567));
  });
});
