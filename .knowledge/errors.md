# Base de Conocimiento de Errores Comunes

> **Ubicación:** `/home/admonctrlxm/portal-direccion-mme/.knowledge/errors.md`
> **Regla:** Después de CADA tarea con resultado FALLIDO o PARCIAL, crear o actualizar una entrada aquí.

---

## Plantilla

```markdown
## Error: [Título descriptivo]
- Fecha: YYYY-MM-DD
- Contexto: [qué se estaba haciendo]
- Síntoma: [qué falló]
- Causa raíz: [por qué falló]
- Prevención: [cómo evitarlo en el futuro]
- Ajuste en Jerarquía de Verdad: [si aplica]
- DT-XXX relacionado: [si aplica]
```

---

## Errores Registrados

### Error: Asset mismatch tras build sin PM2 restart
- Fecha: 2026-04-28
- Contexto: Deploy de hotfix en producción
- Síntoma: Portal mostraba página en blanco después de deploy
- Causa raíz: `npm run build` ejecutado pero `pm2 restart portal-mme` omitido. El HTML viejo referenciaba chunks sobrescritos.
- Prevención: Build + PM2 restart = operación atómica. NUNCA separar.
- Ajuste en Jerarquía de Verdad: Ninguno — ya estaba en Skill 8 regla #5
- DT-XXX relacionado: —

### Error: Baseline perdido por /tmp/ limpiado
- Fecha: 2026-04-30
- Contexto: Tarea de 6 horas dividida en dos sesiones
- Síntoma: En la segunda sesión no se pudo verificar post-cambio porque `/tmp/diag_*.md` fue eliminado por el sistema
- Causa raíz: Se usó `/tmp/` para una tarea > 4 horas. El sistema limpió el archivo entre sesiones.
- Prevención: Tareas > 4 horas deben usar `/home/admonctrlxm/diagnostics/` en lugar de `/tmp/`.
- Ajuste en Jerarquía de Verdad: Ninguno — ya estaba en Skill 0 Fase 6
- DT-XXX relacionado: —

### Error: Modificación de HomeSlider.tsx sin verificación visual
- Fecha: 2026-05-01
- Contexto: Cambio de color en KPI de embalses
- Síntoma: El cambio rompió el layout del carrusel en mobile
- Causa raíz: Se modificó HomeSlider.tsx (god component) sin verificar responsive
- Prevención: Cualquier cambio en HomeSlider requiere screenshot baseline/post con playwright o verificación humana
- Ajuste en Jerarquía de Verdad: Ninguno — ya estaba en Skill 8 regla #1
- DT-XXX relacionado: DT-002

---

*Última actualización: 2026-05-02*
*Próxima revisión: Después de cada error registrado*
