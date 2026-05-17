/**
 * Datos de fallback para componentes de mapa y gráficas
 * cuando los datos de la API aún no están disponibles.
 */

// ─── Comunidades energéticas: colores por departamento (fallback) ───────────
export const comunidadesCityColors: Record<string, string> = {
  "Antioquia": "#F59E0B",
  "Atlántico": "#D97706",
  "Bolívar": "#7C3A0A",
  "Boyacá": "#D97706",
  "Caldas": "#F59E0B",
  "Cauca": "#7C3A0A",
  "Cesar": "#7C3A0A",
  "Córdoba": "#7C3A0A",
  "Cundinamarca": "#F59E0B",
  "Huila": "#D97706",
  "La Guajira": "#7C3A0A",
  "Magdalena": "#7C3A0A",
  "Meta": "#7C3A0A",
  "Nariño": "#7C3A0A",
  "Norte de Santander": "#7C3A0A",
  "Putumayo": "#7C3A0A",
  "Quindío": "#7C3A0A",
  "Risaralda": "#D97706",
  "Santander": "#D97706",
  "Sucre": "#7C3A0A",
  "Tolima": "#D97706",
  "Valle del Cauca": "#F59E0B",
};

// ─── Comunidades energéticas: conteo por departamento (fallback) ────────────
export const comunidadesEnergeticasPorDepto: Record<string, number> = {
  "Antioquia": 89,
  "Atlántico": 12,
  "Bolívar": 5,
  "Boyacá": 18,
  "Caldas": 34,
  "Cauca": 4,
  "Cesar": 3,
  "Córdoba": 2,
  "Cundinamarca": 67,
  "Huila": 15,
  "La Guajira": 2,
  "Magdalena": 4,
  "Meta": 3,
  "Nariño": 3,
  "Norte de Santander": 5,
  "Putumayo": 2,
  "Quindío": 7,
  "Risaralda": 21,
  "Santander": 19,
  "Sucre": 1,
  "Tolima": 14,
  "Valle del Cauca": 56,
};

// ─── Contratos supervisión: datos donut (fallback) ──────────────────────────
export const contratosSupervisionDonut = [
  { id: "FOES", label: "FOES", value: 420, color: "#F59E0B" },
  { id: "ZNI", label: "ZNI", value: 210, color: "#8B5CF6" },
  { id: "SIN", label: "SIN", value: 140, color: "#06B6D4" },
  { id: "RER", label: "RER", value: 50, color: "#22C55E" },
  { id: "FNR", label: "FNR", value: 20, color: "#EF4444" },
];

// Re-exportar utilidades de embalses para centralizar imports
export { getEmbalseColor, getEmbalseEstado } from "@/lib/embalse-utils";
