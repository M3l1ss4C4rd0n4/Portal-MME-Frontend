/**
 * Keywords compartidas para filtrar noticias del slider del home.
 * Energía (sector eléctrico) vs Hidrocarburos (petróleo, gas, combustibles).
 */

export const ENERGY_KEYWORDS = [
  "energía", "energético", "eléctric", "electricidad",
  "embalse", "hidroeléctric", "termoeléctr",
  "renovable", "eólic", "eólica", "fotovoltaic", "panel solar",
  "granja solar", "parque solar", "biomasa", "geotérm",
  "generación", "generacion", "transmisión", "transmision",
  "distribución eléctrica", "distribucion electrica",
  "sin", "sistema interconectado",
  "zni", "zona no interconectada",
  "creg", "upme", "xm", "isa", "celsia", "epm",
  "tarifa eléctric", "tarifa de energía",
  "racionamiento", "apagón", "apagon",
  "subsidio energétic", "subsidio de energía",
  "transición energética", "transicion energetica",
  "comunidad energética", "comunidad energetica",
  "hidroituango", "hidrógeno verde", "hidrogeno verde",
  "descarbonización", "descarbonizacion",
  "precio de energía", "precio de bolsa",
  "demanda de energía", "demanda electrica",
  "minminas", "minenergía", "minenergia",
  "fenómeno del niño", "fenomeno del niño",
  "sequía", "sequia",
  "térmica", "termica",
  "despacho de energía",
  "suministro eléctric",
  "interconexión eléctrica", "interconexion electrica",
  "comercio de energía",
  "venta de energía",
  "generador térmico", "planta térmica",
  "mercado de energía",
  "corte de energía",
  "hurto de energía",
];

// Nota: unión de los dos tiers usados en el backend (ver
// server/domain/services/news_keywords.py, fuente de verdad para el orden
// de prioridad). Este filtro del frontend solo actúa como red de seguridad
// final sobre el pool que ya devuelve el backend ordenado — no reordena,
// así que basta con reconocer ambos tiers, no con separarlos aquí también.
export const HYDRO_KEYWORDS = [
  // Tier 1 — petróleo/gas genuino
  "petróleo", "petroleo", "gas", "combustible", "gasolina", "acpm",
  "gas natural", "glp", "oleoducto", "gasoducto", "exploración",
  "exploracion", "refinación", "refinacion", "barril", "brent", "wti",
  "opep", "ecopetrol", "reficar", "yacimiento", "pozo petrolero",
  "hidrocarburo", "downstream", "upstream", "midstream",
  "regalías petroleras", "regalias petroleras",
  "diésel", "diesel", "fuel oil", "gas licuado", "gnl", "lng",
  "shale", "fracking", "offshore",
  "crudo", "precio del crudo", "crudo colombiano", "producción petrolera",
  "derivado del petróleo", "derivado del petroleo",
  "petroquímica", "petroquimica", "estación de servicio",
  "gasolinera", "gasocentro", "grifo",
  "anh",
  // Tier 2 — minería (relleno en el backend)
  "carbón", "carbon mineral", "minería", "mineria",
  "niquel", "litio", "cobre",
  "drummond", "cerrejón", "cerrejon", "prodeco",
  "exportación de carbón", "puerto de carbón",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Coincidencia por límite de palabra (Unicode-aware, respeta tildes) — un
 * `includes()` plano hace que keywords cortas como "gas" matcheen dentro de
 * nombres propios como "Promigas", clasificando mal noticias no relacionadas.
 */
function matchesWholeWord(text: string, keyword: string): boolean {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(keyword)}(?![\\p{L}\\p{N}])`, "iu");
  return pattern.test(text);
}

export function countKeywordHits(
  text: string,
  keywords: string[]
): number {
  let count = 0;
  for (const kw of keywords) {
    if (matchesWholeWord(text, kw)) count++;
  }
  return count;
}
