// src/lib/nivo-theme.ts
// Temas compartidos para gráficas Nivo - evita duplicación en dashboards

export const NIVO_DARK = {
  background: "transparent" as const,
  text: { fill: "#CBD5E1", fontSize: 10 },
  tooltip: {
    container: {
      background: "#1E293B",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#E2E8F0",
      fontSize: "12px",
    },
  },
  grid: { line: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 } },
  axis: {
    domain: { line: { stroke: "rgba(255,255,255,0.08)" } },
    ticks: {
      line: { stroke: "transparent" },
      text: { fill: "#E2E8F0", fontSize: 10 },
    },
    legend: { text: { fill: "#94A3B8", fontSize: 10 } },
  },
};

export const NIVO_LIGHT = {
  background: "transparent" as const,
  text: { fill: "#334155", fontSize: 10 },
  tooltip: {
    container: {
      background: "#FFFFFF",
      border: "1px solid #CBD5E1",
      borderRadius: "8px",
      color: "#0F172A",
      fontSize: "12px",
    },
  },
  grid: { line: { stroke: "#E2E8F0", strokeWidth: 1 } },
  axis: {
    domain: { line: { stroke: "#CBD5E1" } },
    ticks: {
      line: { stroke: "#CBD5E1" },
      text: { fill: "#334155", fontSize: 10 },
    },
    legend: { text: { fill: "#475569", fontSize: 10 } },
  },
};

/**
 * Obtiene el tema Nivo según el modo oscuro/claro
 * @param isDark - true para modo oscuro, false para modo claro
 * @returns Tema Nivo configurado
 */
export function getNivoTheme(isDark: boolean) {
  return isDark ? NIVO_DARK : NIVO_LIGHT;
}

export type NivoTheme = ReturnType<typeof getNivoTheme>;

/** Tema oscuro para sliders y cards del home — cuadrícula tenue, ejes blancos. */
export const NIVO_SLIDER = {
  background: "transparent" as const,
  text: { fill: "#F1F5F9", fontSize: 10 },
  tooltip: {
    container: {
      background: "#1E293B",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#E2E8F0",
      fontSize: "12px",
    },
  },
  grid: { line: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 } },
  axis: {
    domain: { line: { stroke: "rgba(255,255,255,0.08)" } },
    ticks: {
      line: { stroke: "transparent" },
      text: { fill: "#F1F5F9", fontSize: 9 },
    },
    legend: { text: { fill: "#94A3B8", fontSize: 9 } },
  },
};
