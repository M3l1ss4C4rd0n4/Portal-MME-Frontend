export interface PredictionPoint {
  fecha: string;
  valor: number;
  lower: number;
  upper: number;
  oni?: number | null;
  pdo?: number | null;
  soi?: number | null;
  gmst?: number | null;
}

export interface MetricSummary {
  id: string;
  nombre: string;
  unidad: string;
  actual: number;
  prediccion_7d: number;
  mape: number;
  modelo: string;
  tendencia: "alta" | "baja" | "estable";
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
}
