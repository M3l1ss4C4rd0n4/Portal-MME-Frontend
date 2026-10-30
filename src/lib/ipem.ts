/**
 * Lógica del IPEM — Índice de Pobreza Energética Multidimensional.
 *
 * Fuente: informe «Pobreza energética multidimensional en Colombia» del MME
 * (edición 2025, §5-1 y §5-2), y la entrega de datos del área en
 * `server/data/IPEM/IPEM.xlsx`.
 *
 * Dos cosas del método condicionan todo lo que hay aquí:
 *
 *  · El IPEM NO tiene umbral de corte. El informe dice explícitamente que «no se
 *    definieron estos puntos de corte, ya que se considera que la ausencia o carencia
 *    ya representa una privación». Es un índice continuo de privaciones ponderadas,
 *    así que no existe un «es pobre / no es pobre»: solo niveles de incidencia.
 *
 *  · Los quintiles que trae el Excel son RELATIVOS A CADA AÑO: cada etiqueta agrupa
 *    ~224 de los 1.121 municipios en ambos años, con rangos distintos por año. Por eso
 *    el cambio de etiqueta entre 2024 y 2025 NO significa cambio de situación, y la
 *    comparación entre años se hace con `variacionPp`, nunca comparando quintiles.
 *    Las bandas de abajo son las PUBLICADAS en el informe, que se usan solo para
 *    colorear el mapa de forma rastreable al documento.
 */

export type AnioIpem = "2024" | "2025";

export const ANIOS_IPEM: readonly AnioIpem[] = ["2024", "2025"] as const;

export type Quintil = "MUY BAJO" | "BAJO" | "MEDIO" | "ALTO" | "MUY ALTO";

/** De menor a mayor incidencia de pobreza energética. */
export const QUINTILES: readonly Quintil[] = [
  "MUY BAJO",
  "BAJO",
  "MEDIO",
  "ALTO",
  "MUY ALTO",
] as const;

export interface BandaQuintil {
  quintil: Quintil;
  /** Límite inferior en porcentaje, inclusive. */
  desdePct: number;
  /** Límite superior en porcentaje, inclusive. */
  hastaPct: number;
}

/**
 * Bandas departamentales publicadas en el informe 2025. Van de 12,87 % a 55,48 %,
 * que son exactamente el mínimo y el máximo de la columna departamental de 2025.
 */
export const BANDAS_DEPARTAMENTAL: readonly BandaQuintil[] = [
  { quintil: "MUY BAJO", desdePct: 12.87, hastaPct: 20.1 },
  { quintil: "BAJO", desdePct: 20.11, hastaPct: 23.93 },
  { quintil: "MEDIO", desdePct: 23.94, hastaPct: 30.82 },
  { quintil: "ALTO", desdePct: 30.83, hastaPct: 35.37 },
  { quintil: "MUY ALTO", desdePct: 35.38, hastaPct: 55.48 },
] as const;

/** Bandas municipales publicadas en el informe 2025 (12,87 % a 63,58 %). */
export const BANDAS_MUNICIPAL: readonly BandaQuintil[] = [
  { quintil: "MUY BAJO", desdePct: 12.87, hastaPct: 22.98 },
  { quintil: "BAJO", desdePct: 22.99, hastaPct: 25.9 },
  { quintil: "MEDIO", desdePct: 25.91, hastaPct: 29.26 },
  { quintil: "ALTO", desdePct: 29.27, hastaPct: 35.25 },
  { quintil: "MUY ALTO", desdePct: 35.26, hastaPct: 63.58 },
] as const;

/**
 * Rampa de color por nivel de incidencia, en la familia ámbar del portal y
 * ascendiendo hacia el rojo para que la severidad se lea sin consultar la leyenda.
 */
const COLOR_POR_QUINTIL: Record<Quintil, string> = {
  "MUY BAJO": "#FDE68A",
  BAJO: "#FBBF24",
  MEDIO: "#F59E0B",
  ALTO: "#EA580C",
  "MUY ALTO": "#B91C1C",
};

/** Color de relleno para una etiqueta de quintil; gris cuando no hay dato. */
export function colorQuintil(quintil: Quintil | null): string {
  return quintil ? COLOR_POR_QUINTIL[quintil] : "#64748B";
}

/**
 * Normaliza la etiqueta de quintil tal como viene del Excel (mayúsculas, con o sin
 * tildes, con espacios de sobra) a una de las cinco canónicas. Devuelve null si no
 * reconoce el texto, para no inventar una clasificación.
 */
export function normalizarQuintil(valor: string | null | undefined): Quintil | null {
  if (!valor) return null;
  const limpio = valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
  return QUINTILES.find((q) => q === limpio) ?? null;
}

/**
 * Quintil que le corresponde a un valor según las bandas PUBLICADAS del informe.
 *
 * El valor entra como fracción (0,1917), que es como lo entrega la fuente.
 *
 * Se clasifica por el LÍMITE SUPERIOR de cada banda, no comprobando que el valor
 * caiga dentro del par [desde, hasta]. Dos razones:
 *
 *  · El informe publica los límites con dos decimales, así que entre una banda y la
 *    siguiente queda un hueco de 0,01 (…30,82 % | 30,83 %…). Un valor que cae justo
 *    en ese hueco no pertenecería a ninguna banda.
 *  · Peor aún, `0.3082 * 100` da 30,819999999999997 en coma flotante, de modo que
 *    incluso un límite exacto se escapaba de su propia banda y acababa pintado como
 *    MUY ALTO. De ahí el redondeo a dos decimales antes de comparar, que es además
 *    la precisión con la que el informe define las bandas.
 *
 * Los valores por encima del techo caen en la última banda, y los que están por
 * debajo del piso en la primera, en lugar de quedar sin clasificar: las bandas se
 * fijaron con la distribución de un año y el otro se sale por abajo (el mínimo
 * municipal de 2024 es 15,17 %, bajo el piso de 12,87 %).
 */
export function quintilPublicado(
  valorFraccion: number | null | undefined,
  escala: "municipal" | "departamental",
): Quintil | null {
  if (valorFraccion == null || !Number.isFinite(valorFraccion)) return null;
  const pct = Math.round(valorFraccion * 10000) / 100;
  const bandas = escala === "municipal" ? BANDAS_MUNICIPAL : BANDAS_DEPARTAMENTAL;
  return (bandas.find((b) => pct <= b.hastaPct) ?? bandas[bandas.length - 1]).quintil;
}

/**
 * Variación en puntos porcentuales entre dos años, o null si falta alguno de los dos
 * (es el caso de Angelópolis, sin IPEM 2024).
 *
 * Negativo = el índice bajó = MEJORA, porque el IPEM mide privación.
 */
export function variacionPp(
  desde: number | null | undefined,
  hasta: number | null | undefined,
): number | null {
  if (desde == null || hasta == null) return null;
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return null;
  return (hasta - desde) * 100;
}

/**
 * Variación del promedio entre los dos años, calculada SOLO sobre los municipios con
 * valor en ambos.
 *
 * Restar el promedio de 2024 (1.120 municipios) del de 2025 (1.121) mete un efecto de
 * composición: la diferencia incluiría la entrada de Angelópolis, que no estaba en
 * 2024. Son centésimas de punto, pero entonces el delta no mediría lo mismo que los
 * conteos de municipios que mejoran y empeoran, que sí son sobre los comparables.
 */
export function variacionPromedioComparable(
  municipios: Array<{ ipem2024: number | null; ipem2025: number | null }>,
): number | null {
  const pares = municipios.filter(
    (m): m is { ipem2024: number; ipem2025: number } =>
      m.ipem2024 !== null && m.ipem2025 !== null,
  );
  if (pares.length === 0) return null;
  const total2024 = pares.reduce((acc, m) => acc + m.ipem2024, 0);
  const total2025 = pares.reduce((acc, m) => acc + m.ipem2025, 0);
  return ((total2025 - total2024) / pares.length) * 100;
}

// ─── Formato ────────────────────────────────────────────────────────────────────

/**
 * El IPEM en porcentaje, con coma decimal. El valor entra como fracción, que es
 * como lo entrega la fuente y como viaja por la API.
 */
export function fmtIpemPct(
  valorFraccion: number | null | undefined,
  decimales = 2,
): string {
  if (valorFraccion == null || !Number.isFinite(valorFraccion)) return "—";
  const n = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valorFraccion * 100);
  return `${n} %`;
}

/**
 * Variación en puntos porcentuales, con signo explícito. Se escribe «pp» y no «%»
 * porque es una diferencia entre dos porcentajes, no un cambio relativo.
 */
export function fmtVariacionPp(pp: number | null | undefined, decimales = 2): string {
  if (pp == null || !Number.isFinite(pp)) return "—";
  const n = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Math.abs(pp));
  const signo = pp > 0 ? "+" : pp < 0 ? "−" : "";
  return `${signo}${n} pp`;
}

// ─── Formas que devuelve /api/energia/ipem ──────────────────────────────────────

export interface MunicipioIpem {
  codMunicipio: string;
  codDepartamento: string;
  departamento: string;
  municipio: string;
  ipem2024: number | null;
  ipem2025: number | null;
  quintil2024: string | null;
  quintil2025: string | null;
}

export interface DepartamentoIpem {
  codDepartamento: string;
  departamento: string;
  region: string;
  ipem2024: number | null;
  ipem2025: number | null;
}

export interface KpisIpem {
  /** Promedio simple de los municipios con dato, en porcentaje. */
  promedioMunicipal2024: number | null;
  promedioMunicipal2025: number | null;
  promedioDepartamental2024: number | null;
  promedioDepartamental2025: number | null;
  municipios: number;
  departamentos: number;
  /** Municipios comparables entre los dos años (los que tienen ambos valores). */
  comparables: number;
  /** Variación del promedio en pp, solo sobre los municipios comparables. */
  variacionPromedioComparable: number | null;
  mejoran: number;
  empeoran: number;
  sinCambio: number;
  sinDato: number;
}

export interface RespuestaIpem {
  kpis: KpisIpem;
  departamentos: DepartamentoIpem[];
  municipios: MunicipioIpem[];
}

/** El valor del año pedido, para no repetir el ternario en cada gráfica. */
export function ipemDe(
  fila: { ipem2024: number | null; ipem2025: number | null },
  anio: AnioIpem,
): number | null {
  return anio === "2024" ? fila.ipem2024 : fila.ipem2025;
}

/** La etiqueta de quintil del Excel para el año pedido, ya normalizada. */
export function quintilDe(fila: MunicipioIpem, anio: AnioIpem): Quintil | null {
  return normalizarQuintil(anio === "2024" ? fila.quintil2024 : fila.quintil2025);
}
