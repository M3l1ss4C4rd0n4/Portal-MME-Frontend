export function getEmbalseColor(pct: number): string {
  if (pct > 80) return "#22C55E";
  if (pct >= 70) return "#06B6D4";
  if (pct >= 60) return "#F59E0B";
  if (pct >= 50) return "#F97316";
  return "#EF4444";
}

export function getEmbalseEstado(pct: number): string {
  if (pct > 80) return "Normal";
  if (pct >= 70) return "Estable";
  if (pct >= 60) return "Alerta temprana";
  if (pct >= 50) return "Situación delicada";
  return "Crítico";
}
