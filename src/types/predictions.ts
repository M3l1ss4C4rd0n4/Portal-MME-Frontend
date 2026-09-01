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
  mape_es_riguroso?: boolean;
  mape_holdout?: number;
  cobertura_ci?: number | null;
  backtest?: {
    anio_corte: number;
    n_dias_test: number;
    fecha_test_inicio: string;
    fecha_test_fin: string;
  } | null;
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
