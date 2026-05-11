# Roadmap Quick Status — Portal Dirección MME

**Propósito:** Consolidación de estado de todas las tareas (DT-XXX) en un archivo de máx 50 líneas. Para planificación completa, ver `PROPUESTA_MAESTRA.md` Sección 6.

**Última actualización:** 2026-05-02  
**Generado por:** Análisis de PROPUESTA_MAESTRA.md + git log

---

## Fase 1: Limpieza (IN PROGRESS)

| DT | Tarea | Estado | Bloqueantes | Riesgo | Esfuerzo |
|---|---|---|---|---|---|
| 1.2 | Consolidar ETL duplicado | ✅ DONE | — | Bajo | 4-6h |
| 1.3 | Extraer energia_app/ | ✅ DONE | — | Bajo | 1d |
| 1.5 | Limpiar docstrings | ✅ DONE | — | Bajo | 4-6h |
| 1.6 | useHomeSlider.ts (extracción inicial) | ✅ DONE | — | Medio | 1d |
| 1.1 | Unificar whatsapp_bot/venv | ⏸ PAUSED | Coordinación Equipo WhatsApp | Medio | 2-3d |

---

## Fase 2: Refactorización Mayor (NOT STARTED)

| DT | Tarea | Estado | Bloqueantes | Riesgo | Esfuerzo |
|---|---|---|---|---|---|
| 2.1 | core/container.py (god file - 575 nodos) | ❌ NOT STARTED | Fase 1 completa | **CRÍTICO** | 1-2 sem |
| 2.2 | HomeSlider.tsx (extraer más - 1.663 líneas) | ⏳ IN PROGRESS | Setup tests visuales | Alto | 3-5d |
| 2.3 | API routes sin capa de servicios | ❌ NOT STARTED | DT-2.1 completa | Alto | 2-3d |
| 2.4 | BFF service layer (consolidar backendGet + getPool) | ❌ NOT STARTED | DT-2.3 completa | Alto | 1 sem |

---

## Fase 3: Data Integrity (NOT STARTED)

| DT | Tarea | Estado | Bloqueantes | Riesgo | Esfuerzo |
|---|---|---|---|---|---|
| 3.1 | Agregar Foreign Keys a PostgreSQL | ❌ NOT STARTED | Análisis previo | **CRÍTICO** | 3d |
| 3.2 | Migrar 0 FKs → todas las tablas | ❌ NOT STARTED | DT-3.1 completa | **CRÍTICO** | 1 sem |

---

## Guía Rápida: ¿Qué Puedo Hacer Ahora?

### ✅ PERMITIDO (tarea ya completada)
```
DT-1.2, DT-1.3, DT-1.5, DT-1.6
→ Verifica con: git log --oneline | grep -E "ETL|energia_app|docstring|useHomeSlider"
```

### ⏸ PAUSED (espera coordinación externa)
```
DT-1.1 (whatsapp_bot/venv)
→ Razón: Servicios systemd están hardcodeados a venv anidado
→ Acción: Reportar estado al humano, NO ejecutar
→ Contacto: Equipo WhatsApp
```

### ⏳ IN PROGRESS (puedes continuar)
```
DT-2.2 (HomeSlider.tsx)
→ Estado actual: useHomeSlider.ts creado, falta rebalanceo de KPIs
→ Acción: Extraer más funciones a hooks, verificar visualmente
→ Bloqueante: Necesita setup de tests visuales con Playwright
```

### ❌ NOT STARTED (requiere plan)
```
DT-2.1, DT-2.3, DT-2.4, DT-3.1, DT-3.2
→ Acción: NO iniciar sin aprobación humana + plan escrito
→ Razón: Alto riesgo, requieren coordinación, afectan múltiples servicios
```

---

## Regla Crítica: Validación Antes de Ejecutar

**Antes de cualquier tarea:**

| Condición | Acción |
|---|---|
| Estado = ✅ DONE | ✅ Verifica con `git log` que está implementada |
| Estado = ⏳ IN PROGRESS | ✅ Continúa el trabajo |
| Estado = ❌ NOT STARTED | ⚠️ Valida que NO HAY bloqueantes |
| Estado = ⏸ PAUSED | ❌ **NO EJECUTES.** Reporta al humano |

---

## Tabla de Bloqueantes

| Bloqueante | Tarea afectada | Estado | ETA |
|---|---|---|---|
| Fase 1 completa | DT-2.1 | En progreso (falta DT-1.1 PAUSED) | — |
| Tests visuales | DT-2.2 | Pendiente setup Playwright | — |
| DT-2.1 completa | DT-2.3 | Bloqueado | Depende DT-2.1 |
| DT-2.3 completa | DT-2.4 | Bloqueado | Depende DT-2.3 |
| Análisis previo | DT-3.1 | Bloqueado | — |

---

## Cálculo de Riesgo (Skill 2.1)

**Top 3 tareas de mayor riesgo:**

| DT | Riesgo calculado | Factores | Mitigation |
|---|---|---|---|
| DT-2.1 (core/container.py) | 8.0-12.0 | Sin tests (1.8) × God file (2.2) × Ciclo lógico (1.8) × Multi-equipo (1.4) | Plan escrito + aprobación humana |
| DT-3.1 (Add FKs) | 5.0-8.0 | PostgreSQL 48GB (1.5) × 0 FKs actual (2.0) × Tabla crítica (1.3) | Backup + dry-run en test DB |
| DT-2.2 (HomeSlider) | 2.5-4.0 | God component (2.2) × Tests visual (falta) × Multi-dashboard (1.3) | Verificación visual pre/post |

---

## Contactos y Escaladas

| Tarea | Contacto | Razón |
|---|---|---|
| DT-1.1 (whatsapp_bot/venv PAUSED) | Equipo WhatsApp | Requiere coordinación systemd |
| DT-2.1 (core/container CRITICO) | Tech Lead | God file, bloquea múltiples tareas |
| DT-3.1 (Add FKs a DB) | DBA | Operación crítica en 48GB |

---

## ¿Dónde Está Mi Tarea?

| Busco... | Ubicación |
|---|---|
| Detalles de una tarea DT | `PROPUESTA_MAESTRA.md` → Sección 4 (Deuda Técnica) o Sección 6 (Roadmap) |
| Prioridad/urgencia | Este archivo (roadmap-quick-status.md) |
| Plan de ejecución | `PROPUESTA_MAESTRA.md` → Sección 6 → "Fases" |
| Arquitectura actual | `PROPUESTA_MAESTRA.md` → Sección 2 |
| Reglas del proyecto | `AGENTS.md` → "Reglas Absolutas" |

---
