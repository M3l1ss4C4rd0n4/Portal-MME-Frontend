/**
 * Normaliza un nombre de departamento para comparación exacta (mayúsculas,
 * sin tildes) — usado para cruzar el catálogo DANE (código ⇄ nombre) contra
 * los nombres de departamento tal como aparecen en cada esquema de negocio.
 */
export function normDeptKey(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}
