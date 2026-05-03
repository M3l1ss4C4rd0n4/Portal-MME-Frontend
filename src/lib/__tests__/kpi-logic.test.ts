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

describe("estadoReservas", () => {
  it("NORMAL para >= 80%", () => {
    const r = estadoReservas(80);
    expect(r.label).toBe("NORMAL");
    expect(r.tw).toBe("text-emerald-400");
  });

  it("ESTABLE para 70-79%", () => {
    const r = estadoReservas(75);
    expect(r.label).toBe("ESTABLE");
    expect(r.tw).toBe("text-cyan-400");
  });

  it("ALERTA TEMPRANA para 60-69%", () => {
    expect(estadoReservas(60).label).toBe("ALERTA TEMPRANA");
  });

  it("ALERTA ALTA para 50-59%", () => {
    expect(estadoReservas(55).label).toBe("ALERTA ALTA");
  });

  it("CRÍTICO para < 50%", () => {
    expect(estadoReservas(49).label).toBe("CRÍTICO");
    expect(estadoReservas(0).label).toBe("CRÍTICO");
  });
});

describe("estadoAportes", () => {
  it("MUY FAVORABLE para >= 120%", () => {
    expect(estadoAportes(120).label).toBe("MUY FAVORABLE");
  });

  it("NORMAL para 100-119%", () => {
    expect(estadoAportes(100).label).toBe("NORMAL");
  });

  it("VIGILANCIA para 90-99%", () => {
    expect(estadoAportes(90).label).toBe("VIGILANCIA");
  });

  it("DÉFICIT HÍDRICO para 70-89%", () => {
    expect(estadoAportes(70).label).toBe("DÉFICIT HÍDRICO");
  });

  it("CRÍTICO — SEQUÍA para < 70%", () => {
    expect(estadoAportes(69).label).toBe("CRÍTICO — SEQUÍA");
  });
});

describe("estadoPrecio", () => {
  it("CÓMODO para < 200", () => {
    expect(estadoPrecio(199).label).toBe("CÓMODO");
  });

  it("ESTRÉS MODERADO para 200-299", () => {
    expect(estadoPrecio(200).label).toBe("ESTRÉS MODERADO");
  });

  it("ALERTA para 300-399", () => {
    expect(estadoPrecio(300).label).toBe("ALERTA");
  });

  it("CRISIS ENERGÉTICA para >= 400", () => {
    expect(estadoPrecio(400).label).toBe("CRISIS ENERGÉTICA");
  });
});

describe("estadoI2Hidro", () => {
  it("SOSTENIBLE para ratio <= 1.0", () => {
    expect(estadoI2Hidro(1.0).label).toBe("SOSTENIBLE");
  });

  it("VIGILANCIA para 1.01-1.2", () => {
    expect(estadoI2Hidro(1.2).label).toBe("VIGILANCIA");
  });

  it("ALERTA para 1.21-1.5", () => {
    expect(estadoI2Hidro(1.5).label).toBe("ALERTA");
  });

  it("CRÍTICO para > 1.5", () => {
    expect(estadoI2Hidro(1.51).label).toBe("CRÍTICO");
  });
});

describe("estadoI3Termica", () => {
  it("SOSTENIBLE para <= 15%", () => {
    expect(estadoI3Termica(15).label).toBe("SOSTENIBLE");
  });

  it("NORMAL para 16-25%", () => {
    expect(estadoI3Termica(25).label).toBe("NORMAL");
  });

  it("ALERTA MEDIA para 26-35%", () => {
    expect(estadoI3Termica(35).label).toBe("ALERTA MEDIA");
  });

  it("CRÍTICO para > 35%", () => {
    expect(estadoI3Termica(36).label).toBe("CRÍTICO");
  });
});

describe("estadoGeneracion", () => {
  it("retorna estado del precio cuando no hay fuentes ni datos", () => {
    const r = estadoGeneracion(undefined, 100, null, 150);
    expect(r.label).toBe("CÓMODO"); // precio 150 → CÓMODO
  });

  it("prioriza precio cuando no hay fuentes", () => {
    const r = estadoGeneracion(undefined, 100, 50, 250);
    expect(r.label).toBe("ESTRÉS MODERADO");
  });

  it("considera térmica si está presente", () => {
    const fuentes = [{ id: "TERMICA", value: 40 }];
    const r = estadoGeneracion(fuentes, 100, null, 150);
    expect(r.label).toBe("CRÍTICO"); // térmica 40% > 35%
  });

  it("considera hidro+aportes si ambos existen", () => {
    // hidro 60% de generación, total 1000 GWh, aportes 400 GWh/día
    // ratio = (60/100)*1000/400 = 1.5 → ALERTA
    const fuentes = [
      { id: "HIDRAULICA", value: 60 },
      { id: "TERMICA", value: 30 },
    ];
    const r = estadoGeneracion(fuentes, 1000, 400, 150);
    // precio=150 → CÓMODO (prio 0)
    // térmica=30 → NORMAL (prio 0, label NORMAL no está en GEN_PRIO)
    // hidro ratio=1.5 → ALERTA (prio 3)
    expect(r.label).toBe("ALERTA");
  });

  it("prioriza crisis energética sobre todo lo demás", () => {
    const fuentes = [
      { id: "HIDRAULICA", value: 60 },
      { id: "TERMICA", value: 10 },
    ];
    const r = estadoGeneracion(fuentes, 1000, 400, 500);
    // precio=500 → CRISIS ENERGÉTICA (prio 4)
    expect(r.label).toBe("CRISIS ENERGÉTICA");
  });
});

describe("diagnosticoSIN", () => {
  it("crítico para reservas < 50%", () => {
    expect(diagnosticoSIN(49, 100, 200)).toContain("crítico");
  });

  it("alerta alta para reservas 50-59%", () => {
    expect(diagnosticoSIN(55, 100, 200)).toContain("alerta alta");
  });

  it("alerta temprana para reservas 60-69% con buenos aportes", () => {
    expect(diagnosticoSIN(65, 95, 200)).toContain("alerta temprana");
  });

  it("vigilancia para reservas 60-69% con malos aportes", () => {
    expect(diagnosticoSIN(65, 80, 200)).toContain("vigilancia");
  });

  it("estable para reservas 70-79%", () => {
    expect(diagnosticoSIN(75, 100, 200)).toContain("estable");
  });

  it("normales para reservas >= 80%", () => {
    expect(diagnosticoSIN(80, 100, 200)).toContain("normales");
  });

  it("maneja aportes nulos", () => {
    expect(diagnosticoSIN(65, null, 200)).toContain("alerta temprana");
  });
});
