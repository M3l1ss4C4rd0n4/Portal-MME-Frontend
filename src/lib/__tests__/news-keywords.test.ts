import { describe, it, expect } from "vitest";
import {
  ENERGY_KEYWORDS,
  HYDRO_KEYWORDS,
  countKeywordHits,
  seleccionarNoticiasEnergia,
} from "../news-keywords";

const energia = {
  titulo: "XM reporta embalses al 77% y alerta sobre el precio de bolsa",
  resumen: "La generación hidráulica cubrió la demanda de energía eléctrica.",
};
const hidrocarburos = {
  titulo: "Ecopetrol aumenta la producción de crudo en el Magdalena Medio",
  resumen: "El barril de petróleo y el gas natural impulsan las reservas.",
};
const neutra = { titulo: "El clima en la costa", resumen: "Lluvias dispersas." };

describe("countKeywordHits", () => {
  it("cuenta los términos presentes en el texto", () => {
    expect(countKeywordHits("embalses y demanda de energía", ENERGY_KEYWORDS)).toBeGreaterThan(0);
  });

  it("devuelve cero cuando no hay ningún término del tema", () => {
    expect(countKeywordHits("lluvias dispersas en la costa", HYDRO_KEYWORDS)).toBe(0);
  });
});

describe("seleccionarNoticiasEnergia", () => {
  it("deja pasar las noticias de energía", () => {
    const { seleccionadas, usoRespaldo } = seleccionarNoticiasEnergia([energia, neutra]);

    expect(seleccionadas).toEqual([energia]);
    expect(usoRespaldo).toBe(false);
  });

  it("descarta las que pesan más hacia hidrocarburos", () => {
    const { seleccionadas } = seleccionarNoticiasEnergia([energia, hidrocarburos]);

    expect(seleccionadas).toEqual([energia]);
  });

  it("devuelve el pool sin filtrar antes que dejar el slider vacío", () => {
    // Era el caso que dejaba tres huecos en blanco en la portada.
    const { seleccionadas, usoRespaldo } = seleccionarNoticiasEnergia([hidrocarburos]);

    expect(seleccionadas).toEqual([hidrocarburos]);
    expect(usoRespaldo).toBe(true);
  });

  it("no marca respaldo cuando el pool venía vacío", () => {
    // Sin noticias no hay nada que rescatar: no es el mismo caso.
    const { seleccionadas, usoRespaldo } = seleccionarNoticiasEnergia([]);

    expect(seleccionadas).toEqual([]);
    expect(usoRespaldo).toBe(false);
  });

  it("corta en las tres que caben en el slider", () => {
    const { seleccionadas } = seleccionarNoticiasEnergia([energia, energia, energia, energia]);

    expect(seleccionadas).toHaveLength(3);
  });

  it("lee los nombres de campo en inglés que traen algunas fuentes", () => {
    const enIngles = {
      title: "Reservoir levels drop as electricity demand rises",
      description: "La generación de energía eléctrica y la demanda del SIN.",
    };

    const { seleccionadas, usoRespaldo } = seleccionarNoticiasEnergia([enIngles]);

    expect(seleccionadas).toEqual([enIngles]);
    expect(usoRespaldo).toBe(false);
  });

  it("no altera el arreglo que recibe", () => {
    const pool = [energia, hidrocarburos];
    const copia = [...pool];

    seleccionarNoticiasEnergia(pool);

    expect(pool).toEqual(copia);
  });
});
