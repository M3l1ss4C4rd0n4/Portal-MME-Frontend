# Quick Skill Index — Portal Dirección MME

**Propósito:** Árbol de decisión rápido (2 minutos) para elegir qué skill cargar. Para documentación completa, ver `SKILL_PACK_V5.0.md`.

**Última actualización:** 2026-05-02

---

## Frontend (portal-direccion-mme/)

| Si tu tarea es... | Cargar | Skip | Notas |
|---|---|---|---|
| HomeSlider.tsx tiene problema visual | Skill 2 (Refactor) + Skill 15 (visual tests) | Skill 9, 14 | God component, 1.663 líneas. Ver DT-002. |
| API route tiene bug | Skill 0 (CDA genérico) | Skill 2, 9, 14 | ~14 endpoints en /api/. Ver `.knowledge/bff-patterns.md` |
| Componente React necesita mejora | Skill 1 (Investigación) → Skill 0 | Skill 9 | Típicamente bajo riesgo (<500 líneas) |
| BFF endpoint toca PostgreSQL | Skill 9 (Data Verification) | Skill 2, 14 | Decidir: ¿backendGet() o getPool()? Ver bff-patterns.md |
| Puerto 3000 caído / Portal en blanco | **Skill 17 (Emergencia) SOLAMENTE** | TODO LO DEMÁS | SEV-1. Recuperar primero, investigar después. |
| Agregar nueva página/dashboard | Skill 0 (CDA) | Skill 2, 9 | Bajo riesgo si no toca componentes core |
| Cambio en HomeSlider KPIs | **PROHIBIDO sin plan escrito** | Skill 0, 2 | Ver Skill 8 regla #1. Requiere verificación visual post-cambio. |

---

## Backend (server/)

| Si tu tarea es... | Cargar | Skip | Notas |
|---|---|---|---|
| core/container.py necesita cambios | **BLOQUEADO — DT-001 sin iniciar** | — | God file (575 nodos, ciclo lógico masivo). Requiere 1-2 semanas de plan. Escala al humano. |
| WhatsApp Bot (whatsapp_bot/) tiene fallo | **PAUSED — DT-003 depende coordinación** | — | Bot anidado con venv propio. Requiere acuerdo equipo. Reportar estado. |
| Servicio >1.000 líneas (ej: report_service.py) | Skill 2.4 (God Services con pdftotext diff) | Skill 0, 1 | Verificar PDF/output textual antes y después. No confiar en diff binario. |
| Tabla >1GB afectada | **Skill 9 → MÉTODO D OBLIGATORIO** | Skill 0, 1 | NO ejecutar COUNT exacto en metrics_hourly (32GB). Usar `/verify-table-snapshot.sh` |
| API route nueva en FastAPI | Skill 0 (CDA) → Skill 1.3 (validar cero ciclos) | Skill 2, 9 | Verificar que no crea ciclo con container.py. |
| ETL en Celery Beat | Skill 9.2 (Protocol ETL) → tabla prueba OBLIGATORIA | Skill 1 | Dry-run en test_tabla antes de aplicar en producción. |
| Puerto 8000 caído / API no responde | **Skill 17 (Emergencia) SOLAMENTE** | TODO LO DEMÁS | SEV-1. Recuperar servicio, luego investigar causa. |
| Servicios systemd (api-mme, dash, telegram-polling) | Skill 0 (CDA) + Skill 8 regla #8 | Skill 2 | Backup con `cp /etc/systemd/system/nombre.service /tmp/nombre.service.bak` obligatorio. |
| Cambio a PostgreSQL schema (>100 líneas SQL) | Skill 9 (Data Verification) + pg_dump previo | Skill 0 | Snapshot de producción antes. Skill 8 regla #7. |

---

## Global

### Decisiones Transversales

| Situación | Acción | Por qué |
|---|---|---|
| ¿5+ tareas al mismo tiempo? | **META-SKILL -1 (Triage) PRIMERO** — 5 minutos | Priorizar por Score = (Impacto × Urgencia) / Esfuerzo |
| ¿Archivo >2.000 líneas a leer? | **META-SKILL -2.3 (Compresión)** antes de Fase 5 | Conservar presupuesto de contexto |
| ¿Puerto caído / SEV-1? | **Skill 17 (Emergencia) — IGNORA TODO LO DEMÁS** | Restaurar servicio en <15 min, investigar después |
| ¿Conflicto entre skills? | Usar orden: Skill 8 > CDA > Triage > Rollback > dominio | Resolución de conflictos clarita |
| ¿DT-XXX en PAUSED? | Reportar estado al humano, NO ejecutar | Ver `.knowledge/roadmap-quick-status.md` |
| ¿DT-XXX en DONE? | Verificar con `git log` que está implementado | Regla Skill 8 #18 |
| ¿Necesito roadmap? | Consultar `.knowledge/roadmap-quick-status.md` (no leer PROPUESTA_MAESTRA.md completo) | 50 líneas vs 1.300 líneas |

### Reglas Absolutas del Proyecto

✅ **PERMITIDO:**
- Usar `.knowledge/quick-skill-index.md` para decidir rápido
- Ejecutar `./verify-table-snapshot.sh [tabla]` para data snapshots
- Consultar `.knowledge/roadmap-quick-status.md` para estado de tareas
- Cargar máximo 2-3 skills en contexto (nunca SKILL_PACK completo)

❌ **PROHIBIDO:**
- Modificar HomeSlider.tsx sin plan escrito (Skill 8 regla #1)
- Ejecutar tareas en PAUSED sin aprobación humana
- Hacer COUNT(*) exacto en metrics_hourly (>10GB, usar MÉTODO D)
- Refactorizar core/container.py sin Skill 2.1 completo
- Crear archivos >500 líneas sin justificación en diag_*.md

---

## Cómo Usar Este Índice

### Flujo Rápido (2 minutos)

1. **¿Qué proyecto?** Frontend o Backend
2. **¿Qué tarea específica?** Busca en tabla correspondiente
3. **¿Qué skill?** Columna "Cargar"
4. **¿Qué skip?** Columna "Skip"
5. **¿Notas especiales?** Columna "Notas"

### Flujo Completo (si hay complejidad)

1. Seguir Quick Skill Index para skill principal
2. Ejecutar META-SKILL 0 (CDA de 7 fases)
3. Leer SKILL_PACK_V5.0.md SOLO sección del skill cargado
4. Si hay datos: ejecutar `./verify-table-snapshot.sh [tabla]`
5. Si hay roadmap: validar estado en `.knowledge/roadmap-quick-status.md`

---

## Mapeo a Documentación Completa

| Necesito... | Ir a... |
|---|---|
| Decisión rápida | Este archivo (quick-skill-index.md) |
| Estado de tarea DT-XXX | `.knowledge/roadmap-quick-status.md` |
| Verificar tabla PostgreSQL | Ejecutar `./verify-table-snapshot.sh` |
| Patrones de API routes | `.knowledge/bff-patterns.md` |
| Skill específico detallado | `SKILL_PACK_V5.0.md` → Sección del skill |
| Mapa completo portal + servidor | `.knowledge/CODEMAP_COMPLETO.md` (graphify 6.236 nodos) |
| Arquitectura del proyecto | `PROPUESTA_MAESTRA.md` → Sección 2 (Estado Actual) |
| Reglas del proyecto | `AGENTS.md` → Sección "Reglas Absolutas" |

---
