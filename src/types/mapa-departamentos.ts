/**
 * Tipo compartido por los mapas choropleth de departamentos (Comunidades,
 * FENOGE) — antes redeclarado de forma idéntica en 5 archivos distintos.
 */
export interface DptoRow {
  departamento: string;
  departamentoGeo: string;
  count: number;
  capacidad: number;
  inversion: number;
}
