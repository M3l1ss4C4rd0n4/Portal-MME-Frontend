export interface OniClassification {
  label: string;
  color: string;
}

/** Clasifica el índice ONI (El Niño/La Niña) en una etiqueta y color consistentes en todo el portal. */
export function classifyOni(oni: number | null | undefined): OniClassification | null {
  if (oni == null) return null;
  if (oni >= 1.5) return { label: "El Niño fuerte", color: "#EF4444" };
  if (oni >= 0.5) return { label: "El Niño", color: "#F97316" };
  if (oni <= -1.5) return { label: "La Niña fuerte", color: "#38BDF8" };
  if (oni <= -0.5) return { label: "La Niña", color: "#38BDF8" };
  return { label: "Neutral", color: "#94A3B8" };
}
