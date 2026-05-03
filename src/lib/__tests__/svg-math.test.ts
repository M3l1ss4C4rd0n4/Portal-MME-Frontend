import { describe, it, expect } from "vitest";
import { polarToCartesian, describeArc } from "../svg-math";

describe("polarToCartesian", () => {
  it("calcula correctamente 0° (izquierda, offset -180)", () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(50, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });

  it("calcula correctamente 90° (arriba)", () => {
    const p = polarToCartesian(100, 100, 50, 90);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });

  it("calcula correctamente 180° (derecha)", () => {
    const p = polarToCartesian(100, 100, 50, 180);
    expect(p.x).toBeCloseTo(150, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });

  it("calcula correctamente 270° (abajo)", () => {
    const p = polarToCartesian(100, 100, 50, 270);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(150, 5);
  });
});

describe("describeArc", () => {
  it("genera un string SVG path válido para arco pequeño", () => {
    const d = describeArc(100, 100, 50, 0, 90);
    expect(d).toMatch(/^M\s+[\d.]+\s+[\d.]+\s+A\s+50\s+50\s+0\s+0\s+0\s+[\d.]+\s+[\d.]+$/);
  });

  it("usa large-arc-flag=1 para arcos mayores a 180°", () => {
    const d = describeArc(100, 100, 50, 0, 200);
    expect(d).toContain("1");
  });

  it("usa large-arc-flag=0 para arcos menores o iguales a 180°", () => {
    const d = describeArc(100, 100, 50, 0, 180);
    expect(d).toContain("0");
  });

  it("genera coordenadas consistentes para arco de 0-180°", () => {
    const d = describeArc(0, 0, 10, 0, 180);
    // start = polarToCartesian(0,0,10,180) = (10,0)
    // end   = polarToCartesian(0,0,10,0)   = (-10,0)
    expect(d).toMatch(/M\s+10\s+0/);
    expect(d).toMatch(/-10\s+[\d.e+-]+/);
  });
});
