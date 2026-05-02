/**
 * Coordenadas aproximadas de los principales embalses de Colombia.
 * Fuente: ubicaciones geográficas públicas (aproximadas).
 * Usado para posicionar círculos en el mapa de embalses.
 */

export interface EmbalseCoord {
  codigo: string;
  lat: number;
  lng: number;
}

export const embalsesCoords: Record<string, EmbalseCoord> = {
  ITUANGO:       { codigo: "ITUANGO",       lat: 7.5319,  lng: -76.1986 },
  TRONERAS:      { codigo: "TRONERAS",      lat: 7.2333,  lng: -75.4000 },
  CALIMA1:       { codigo: "CALIMA1",       lat: 3.9000,  lng: -76.6000 },
  MIRAFLORES:    { codigo: "MIRAFLORES",    lat: 6.3333,  lng: -74.5500 },
  PLAYAS:        { codigo: "PLAYAS",        lat: 6.0000,  lng: -74.5000 },
  TOPOCORO:      { codigo: "TOPOCORO",      lat: 6.4500,  lng: -73.5000 },
  RIOGRANDE2:    { codigo: "RIOGRANDE2",    lat: 6.5500,  lng: -75.5000 },
  BETANIA:       { codigo: "BETANIA",       lat: 2.8167,  lng: -75.2833 },
  PENOL:         { codigo: "PENOL",         lat: 6.3167,  lng: -74.8000 },
  "SAN LORENZO": { codigo: "SAN LORENZO",   lat: 6.8333,  lng: -75.0000 },
  AMANI:         { codigo: "AMANI",         lat: 5.3167,  lng: -75.6000 },
  MUNA:          { codigo: "MUNA",          lat: 6.5333,  lng: -73.0333 },
  URRA1:         { codigo: "URRA1",         lat: 8.0333,  lng: -76.0000 },
  PRADO:         { codigo: "PRADO",         lat: 3.8333,  lng: -75.0000 },
  SALVAJINA:     { codigo: "SALVAJINA",     lat: 3.5000,  lng: -76.5000 },
  PUNCHINA:      { codigo: "PUNCHINA",      lat: 5.1333,  lng: -75.6000 },
  "PORCE II":    { codigo: "PORCE II",      lat: 6.5500,  lng: -75.3167 },
  "AGREGADO BOGOTA": { codigo: "AGREGADO BOGOTA", lat: 4.6500, lng: -74.0833 },
  "PORCE III":   { codigo: "PORCE III",     lat: 6.5500,  lng: -75.3167 },
  GUAVIO:        { codigo: "GUAVIO",        lat: 4.8167,  lng: -73.5000 },
  "EL QUIMBO":   { codigo: "EL QUIMBO",     lat: 2.4500,  lng: -75.7500 },
  ESMERALDA:     { codigo: "ESMERALDA",     lat: 5.5000,  lng: -72.5000 },
  CHUZA:         { codigo: "CHUZA",         lat: 6.5000,  lng: -72.5000 },
  ALTOANCHICAYA: { codigo: "ALTOANCHICAYA", lat: 3.5333,  lng: -76.6000 },
};

/**
 * Mapeo embalse → departamento (según ubicación geográfica real).
 */
export const embalseDepartamento: Record<string, string> = {
  ITUANGO:         "Antioquia",
  TRONERAS:        "Antioquia",
  CALIMA1:         "Valle del Cauca",
  MIRAFLORES:      "Antioquia",
  PLAYAS:          "Antioquia",
  TOPOCORO:        "Santander",
  RIOGRANDE2:      "Antioquia",
  BETANIA:         "Huila",
  PENOL:           "Antioquia",
  "SAN LORENZO":   "Antioquia",
  AMANI:           "Caldas",
  MUNA:            "Santander",
  URRA1:           "Córdoba",
  PRADO:           "Tolima",
  SALVAJINA:       "Valle del Cauca",
  PUNCHINA:        "Caldas",
  "PORCE II":      "Antioquia",
  "AGREGADO BOGOTA": "Cundinamarca",
  "PORCE III":     "Antioquia",
  GUAVIO:          "Cundinamarca",
  "EL QUIMBO":     "Huila",
  ESMERALDA:       "Boyacá",
  CHUZA:           "Boyacá",
  ALTOANCHICAYA:   "Valle del Cauca",
  "FLORIDA II":    "Valle del Cauca",
};

/**
 * Mapeo río → departamento (según ubicación geográfica de la represa/río).
 * Usado para desagregar aportes hidrológicos por departamento.
 */
export const rioDepartamento: Record<string, string> = {
  // ── Antioquia ──
  ITUANGO: "Antioquia",
  "ESCUELA DE MINAS": "Antioquia",
  "A. SAN LORENZO": "Antioquia",
  "NARE CP": "Antioquia",
  NARE: "Antioquia",
  GRANDE: "Antioquia",
  "CARLOS LLERAS": "Antioquia",
  GUATAPE: "Antioquia",
  "PORCE2 CP": "Antioquia",
  "SAN CARLOS": "Antioquia",
  GUADALUPE: "Antioquia",
  "PORCE III": "Antioquia",
  CONCEPCION: "Antioquia",
  "SAN MIGUEL": "Antioquia",
  "DESV. EEPPM (NEC,PAJ,DOL)": "Antioquia",
  TENCHE: "Antioquia",
  QUEBRADONA: "Antioquia",
  ESTRELLA: "Antioquia",
  // ── Valle del Cauca ──
  "CAUCA SALVAJINA": "Valle del Cauca",
  ALTOANCHICAYA: "Valle del Cauca",
  CALIMA: "Valle del Cauca",
  DIGUA: "Valle del Cauca",
  // ── Caldas ──
  CHINCHINA: "Caldas",
  "MIEL I": "Caldas",
  "SAN EUGENIO": "Caldas",
  CAMPOALEGRE: "Caldas",
  "DESV. GUARINO": "Caldas",
  "DESV. MANSO": "Caldas",
  // ── Cundinamarca ──
  "BOGOTA N.R.": "Cundinamarca",
  CUCUANA: "Cundinamarca",
  "SAN FRANCISCO": "Cundinamarca",
  "DESV. SAN MARCOS": "Cundinamarca",
  GUAVIO: "Cundinamarca",
  CHUZA: "Cundinamarca",
  // ── Boyacá ──
  SOGAMOSO: "Boyacá",
  BATA: "Boyacá",
  "DESV. BATATAS": "Boyacá",
  "DESV. CHIVOR": "Boyacá",
  BLANCO: "Boyacá",
  // ── Huila ──
  "EL QUIMBO": "Huila",
  // ── Tolima ──
  "BETANIA CP": "Tolima",
  PRADO: "Tolima",
  AMOYA: "Tolima",
  // ── Córdoba (Caribe) ──
  "SINU URRA": "Córdoba",
};

/**
 * Calcula aportes hidrológicos agregados por departamento.
 */
export function calcularAportesPorDepto(
  aportes: Array<{ codigo: string; nombre: string; actualGwh: number; historicoGwh: number; porcentaje: number }>
): Record<string, { actualGwh: number; historicoGwh: number; porcentaje: number; rios: Array<{ codigo: string; nombre: string; actualGwh: number; historicoGwh: number; porcentaje: number }> }> {
  const deptoMap: Record<string, { actualGwh: number; historicoGwh: number; porcentaje: number; rios: typeof aportes }> = {};

  for (const a of aportes) {
    const depto = rioDepartamento[a.codigo];
    if (!depto) continue;

    if (!deptoMap[depto]) {
      deptoMap[depto] = { actualGwh: 0, historicoGwh: 0, porcentaje: 0, rios: [] };
    }
    deptoMap[depto].actualGwh += a.actualGwh;
    deptoMap[depto].historicoGwh += a.historicoGwh;
    deptoMap[depto].rios.push(a);
  }

  // Calcular porcentaje ponderado (actual/histórico * 100) por departamento
  for (const d of Object.values(deptoMap)) {
    d.porcentaje = d.historicoGwh > 0 ? parseFloat(((d.actualGwh / d.historicoGwh) * 100).toFixed(1)) : 0;
    d.actualGwh = parseFloat(d.actualGwh.toFixed(2));
    d.historicoGwh = parseFloat(d.historicoGwh.toFixed(2));
  }

  return deptoMap;
}

/**
 * Semáforo de embalses según metodología oficial colombiana
 * (XM, UPME, Superservicios).
 *
 * Nivel agregado del SIN:
 *  > 80%  → NORMAL  (Verde)
 *  70-80% → ESTABLE (Cyan)
 *  60-70% → ALERTA  (Amarillo)
 *  50-60% → DELICADA(Naranja)
 *  < 50%  → CRÍTICO (Rojo)
 */
export function getEmbalseColor(pct: number): string {
  if (pct > 80) return "#22C55E";   // Normal
  if (pct >= 70) return "#06B6D4";  // Estable
  if (pct >= 60) return "#F59E0B";  // Alerta
  if (pct >= 50) return "#F97316";  // Delicada
  return "#EF4444";                 // Crítico
}

export function getEmbalseRiesgo(pct: number): string {
  if (pct > 80) return "NORMAL";
  if (pct >= 70) return "ESTABLE";
  if (pct >= 60) return "ALERTA";
  if (pct >= 50) return "DELICADA";
  return "CRÍTICO";
}

/**
 * Estado del SIN (promedio nacional) según metodología oficial.
 */
export function getEstadoSin(pct: number): { estado: string; color: string } {
  if (pct > 80) return { estado: "NORMAL", color: "#22C55E" };
  if (pct >= 70) return { estado: "ESTABLE", color: "#06B6D4" };
  if (pct >= 60) return { estado: "ALERTA TEMPRANA", color: "#F59E0B" };
  if (pct >= 50) return { estado: "SITUACIÓN DELICADA", color: "#F97316" };
  return { estado: "CRÍTICO", color: "#EF4444" };
}

/**
 * Agrupa embalses por departamento y calcula el color de semáforo
 * del departamento según el embalse más crítico (Opción A).
 */
export function calcularSemafotoPorDepto(
  embalses: Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh?: number }>
): Record<string, { color: string; embalses: Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh?: number }> }> {
  const deptoMap: Record<string, { color: string; embalses: Array<{ codigo: string; nombre: string; porcentaje: number; capacidadGwh?: number }> }> = {};

  // Pesos de criticidad para comparar (menor = más crítico)
  const peso = (c: string) =>
    c === "#EF4444" ? 1 :   // Crítico
    c === "#F97316" ? 2 :   // Delicada
    c === "#F59E0B" ? 3 :   // Alerta
    c === "#06B6D4" ? 4 :   // Estable
    5;                      // Normal

  for (const e of embalses) {
    const depto = embalseDepartamento[e.codigo];
    if (!depto) continue;

    if (!deptoMap[depto]) {
      deptoMap[depto] = { color: "#22C55E", embalses: [] };
    }
    deptoMap[depto].embalses.push(e);

    // El color del departamento es el del embalse más crítico
    const colorNuevo = getEmbalseColor(e.porcentaje);
    if (peso(colorNuevo) < peso(deptoMap[depto].color)) {
      deptoMap[depto].color = colorNuevo;
    }
  }

  return deptoMap;
}
