# Prompt: Refactorización Segura

> **Skill Pack:** Cargar Skill 1.3 (Ciclos) + Skill 2 (Refactor) del SKILL_PACK_V5.0.md
> **Riesgo:** Calcular con `echo "factores" | bc -l` — NUNCA en cabeza

## Instrucciones

1. **FASE 0: CONTEXTUALIZAR** — Leer PROPUESTA_MAESTRA.md, buscar DT-XXX
2. **FASE 1: OBSERVAR** — Baseline: `npm run build`, `curl health`, `psql COUNT`
3. **FASE 2: PALPAR** — `grep -rn "símbolo" src/ -B5 -A5`
4. **FASE 3: MAPEAR** — Leer `graphify-out/GRAPH_REPORT.md` head -80
5. **FASE 4: DIAGNOSTICAR** — Síntoma vs Causa, detectar ciclos
6. **FASE 5: TRATAR** — Intervención MÍNIMA, un archivo a la vez
7. **FASE 6: PERSISTIR** — Escribir `/tmp/diag_[tarea].md`
8. **FASE 7: MONITOREAR** — Comparar contra baseline

## Checklist Obligatorio

- [ ] `npm run build` pasa
- [ ] `grep -r "NombreComponente" src/` verifica dependencias
- [ ] Ningún archivo nuevo >500 líneas
- [ ] Riesgo calculado con `bc` (no mentalmente)
- [ ] `diag_[tarea].md` escrito

## God Files (NO tocar sin plan)

| Archivo | Líneas | Restricción |
|---|---|---|
| `src/components/HomeSlider.tsx` | 1.663 | PROHIBIDO agregar lógica |
| `core/container.py` (backend) | 575 | PROHIBIDO modificar directamente |
