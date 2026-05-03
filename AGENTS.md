# AGENTS.md — Portal Dirección MME

> **Última actualización:** 2026-05-02
> **Framework:** SKILL_PACK_V4.2.md (Field Medic Framework — Jerarquía de Verdad + CDA + Triage + Timeouts + Rollback Granular + Optimización de Contexto)
> **Ubicación:** `/home/admonctrlxm/portal-direccion-mme/SKILL_PACK_V4.2.md`
> **También:** `/home/admonctrlxm/server/SKILL_PACK_V4.2.md` (misma versión)

---

## 🚨 PASO 0: LEER EL SKILL PACK COMPLETO

**ANTES de cualquier acción en este proyecto, leer COMPLETAMENTE:**

```
/home/admonctrlxm/portal-direccion-mme/SKILL_PACK_V4.2.md
```

**NO resumir. NO memorizar selectivamente. LEER COMPLETO.**

El framework NO es sugerencia. Es el **contrato** operacional.

**¿Por qué V4.2 y no versiones anteriores?**
- V4.2 incluye: Triage (META-SKILL -1), timeouts por fase, rollback granular (Skill 12), resolución de conflictos entre skills, integración con DT-XXX del roadmap, ejemplo completo de CDA, métricas de efectividad
- V4.1 carecía de priorización, timeouts, rollback granular y manejo de ambigüedad en cascada

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15 (App Router) | Framework frontend |
| React | 19 | UI runtime |
| TypeScript | 5 (estricto) | Tipado estático |
| Tailwind CSS | v4 (CSS-first) | Estilos — no existe `tailwind.config.js`, config va en CSS con `@theme` |
| Nivo | 0.99 | Gráficas — SIEMPRE `getNivoTheme()` de `src/lib/nivo-theme.ts` |
| PostgreSQL | 16 | Datos — vía `getPool()` de `src/lib/db.ts` |
| PM2 | — | Proceso de producción: `portal-mme` |
| Producción | — | `https://portaldireccionee.minenergia.gov.co` |

---

## Ecosistema Completo

Este repo es el **frontend**. El **backend** vive en `/home/admonctrlxm/server/` con su propio `AGENTS.md`.
Cualquier cambio que afecte ambos (API contracts, DB schema, deploy coordinado) requiere leer AMBOS AGENTS.md.

| Proyecto | Ruta | Stack | AGENTS.md |
|---|---|---|---|
| Frontend (este) | `/home/admonctrlxm/portal-direccion-mme/` | Next.js 15 + React 19 | Este archivo |
| Backend | `/home/admonctrlxm/server/` | Python 3.11 + FastAPI + Dash | `server/AGENTS.md` |
| WhatsApp Bot | `/home/admonctrlxm/server/whatsapp_bot/` | FastAPI (puerto 8001) | Ver `server/AGENTS.md` |

**Servicios systemd del backend** (no tocar sin verificar status pre/post):
- `api-mme.service` — API principal (FastAPI)
- `dashboard-mme.service` — Dash legacy
- `whatsapp-bot.service` — Bot WhatsApp (puerto 8001, venv anidado)
- `telegram-polling.service` — Bot Telegram (polling, venv anidado)

---

## Roadmap y Decisiones Congeladas

**Fuente de verdad:** `PROPUESTA_MAESTRA.md` en la raíz de este repo.

Decisiones explícitamente **PAUSED** (NO tocar sin coordinación con equipo humano):
- **DT-009 — Unificar `whatsapp_bot/venv/`**: El venv anidado del bot está hardcodeado en múltiples servicios systemd. La PROPUESTA_MAESTRA marca esta tarea como **PAUSED** porque requiere coordinación con el equipo de WhatsApp. Un agente que intente "limpiar el venv" romperá los servicios en producción.
- **DT-003 — Extraer WhatsApp Bot**: 522 nodos, misma infraestructura que la API. Marcado como trabajo futuro. NO extraer sin plan escrito de múltiples fases.

Si un agente sugiere "unificar venvs" o "extraer el bot a microservicio", mostrarle esta sección y **PAUSAR**.

---

## God Components — Señal de ALTO Automática

| Archivo | Líneas | Restricción |
|---|---|---|
| `src/components/HomeSlider.tsx` | 1.663 | PROHIBIDO agregar lógica. Extraer a `src/hooks/` o `src/lib/`. |

> **Nota backend:** El `core/container.py` del servidor (575 nodos, cohesión 0.01) es el equivalente a un god file en el backend. Ver `server/AGENTS.md` → God Files y God Services.

---

## Comandos de Baseline N1

```bash
cd /home/admonctrlxm/portal-direccion-mme
npm run build 2>&1 | tail -5
curl -s http://localhost:3001/ | head -1    # Next.js dev server (puerto local)
pm2 status --no-color | grep portal
```

---

## Deploy — Operación Atómica (NO separar los pasos)

```bash
npm run build 2>&1 | tail -3                                    # 1. Build
curl -s http://localhost:3001/ | head -1                        # 2. Verificar local
pm2 restart portal-mme                                          # 3. Restart (OBLIGATORIO)
curl -sI https://portaldireccionee.minenergia.gov.co | head -1  # 4. Verificar producción
```

**PROHIBIDO** hacer `npm run build` sin `pm2 restart portal-mme` inmediatamente después.
Causa: asset mismatch (HTML viejo referencia chunks sobrescritos → página en blanco).
Más detalles en SKILL_PACK_V4.2.md Skill 2 (Refactorización).

---

## Reglas Absolutas de Este Proyecto

| # | Regla | Por qué | Skill de referencia |
|---|---|---|---|
| 1 | HomeSlider.tsx (1.663 líneas) → SOLO LECTURA. Extraer lógica a `src/hooks/` o `src/lib/` | God component (multiply risk) | Skill 8 |
| 2 | Tema Nivo → SIEMPRE `getNivoTheme()` de `src/lib/nivo-theme.ts`, NUNCA inline | Evita duplicación de tema | — |
| 3 | DB → SIEMPRE `getPool()` de `src/lib/db.ts`, NUNCA `new Pool({...})` | Evita múltiples pools | — |
| 4 | Secrets → NUNCA `NEXT_PUBLIC_*` para datos sensibles | Expone credenciales en HTML público | — |
| 5 | Build + PM2 restart = operación atómica | Asset mismatch → blank page en producción | Skill 2 |
| 6 | SVG gradientes → usar `useId()` para IDs únicos | Evita colisiones entre componentes | — |
| 7 | SQL dinámico en API routes → validación + parametrized queries, NUNCA concatenar | SQL injection | — |
| 8 | Crear .md → pasar test Skill 11 primero | Evita basura documental | Skill 11 |
| 9 | Calcular riesgo → usar `echo "X * Y * Z" \| bc -l` | LLMs mienten en multiplicación >3 factores | Skill 2.1 |
| 10 | **CONFIAR EN diag_*.md, NO EN MEMORIA** | Contexto se agota, archivo persiste entre fases | Skill 0, Fase 6-7 |
| 11 | PostgreSQL tabla > 1 GB → Método C/D (Skill 9) | Protege producción de queries pesadas | Skill 9 |
| 12 | ANALYZE en tabla > 10 GB → **PEDIR PERMISO HUMANO** | Causa pico CPU 5-15 segundos en producción | Skill 9.2 |
| 13 | Ciclos en imports → Skill 1.3 (detectar AMBOS tipos antes de refactorizar) | Bloquea extracción de módulos | Skill 1.3 |
| 14 | Ejecutar tarea marcada PAUSED en roadmap → NO ejecutar | Dependencia externa no resuelta | Skill 8, regla #17 |
| 15 | Ejecutar tarea marcada DONE en roadmap → NO ejecutar | Puede sobrescribir trabajo ya completado | Skill 8, regla #18 |
| 16 | Ejecutar tarea marcada SKIP en roadmap → NO ejecutar | SKIP tiene una razón documentada | Skill 8, regla #19 |
| 17 | Iniciar TRATAR sin haber escrito diag_*.md | No hay baseline para comparar post-cambio | Skill 8, regla #20 |
| 18 | Cargar >3 skills completos en contexto simultáneamente | Agota tokens de contexto innecesariamente | Skill 8, regla #21 |
| 19 | Modificar producción sin pasar por MONITOREAR | Cambio sin verificación de regresión | Skill 8, regla #23 |
| 20 | Ignorar resultado de `bc` porque "no parece correcto" | Los LLMs mienten en aritmética | Skill 8, regla #24 |

---

## Jerarquía de Verdad

Para decisiones de cambio, usar la Jerarquía de Verdad con pesos documentada en SKILL_PACK_V4.2.md → Principio Fundamental.

**Tabla resumida (pesos más usados en frontend):**

| Nivel | Fuente | Peso | Ejemplo |
|---|---|---|---|
| 1 | npm build OK | +0.35 | Build sin errores ✅ |
| 1 | curl /health = 200 | +0.25 | Servicio respondiendo ✅ |
| 2 | grep -B5 -A5 | +0.30 | AST confirma uso real ✅ |
| 3 | Graphify EXTRACTED | +0.20 | Aristas verificadas ✅ |
| 4 | Supuestos | 0.00 | "Probablemente no se usa" ❌ |

**REGLA CRÍTICA:** Peso acumulado ≥ 0.7 para ejecutar sin aprobación adicional.

Ver SKILL_PACK_V4.2.md Principio Fundamental para la tabla completa de pesos.

---

## Graphify (ORIENTACIÓN, NO VERDAD)

Grafo disponible en: `graphify-out/GRAPH_REPORT.md`

- Usar para **navegación** (entender qué depende de qué), NO para tomar decisiones finales.
- Peso de confianza aristas INFERRED: 0.08 — SIEMPRE verificar con grep antes de decidir.
- Las aristas INFERRED son inferencias del motor. Pueden estar equivocadas.
- NUNCA confiar en Graphify sin confirmación NIVEL 1 o 2.

Ver SKILL_PACK_V4.2.md Skill 1.2 para protocolo de verificación cruzada.

---

## Ubicaciones Canónicas de .md

```
portal-direccion-mme/
├── README.md                ← Estado actual + cómo levantar (NO modificar sin razón)
├── AGENTS.md                ← Este archivo (actualizar tras cambios arquitectónicos)
├── PROPUESTA_MAESTRA.md     ← Roadmap vivo del proyecto
└── [NO crear otros .md aquí — usar /tmp/ para notas de sesión]
```

**PROPUESTA_MAESTRA.md contiene el roadmap maestro del proyecto.**
NUNCA eliminar sin confirmación explícita del humano.

Antes de crear cualquier `.md`, ejecutar el test de 5 preguntas (Skill 11.1 del SKILL_PACK_V4.2.md).

---

## Operaciones Críticas (CDA)

Para CUALQUIER cambio que afecte código o datos, ejecutar 7 fases:

1. **CONTEXTUALIZAR:** Verificar DT-XXX en PROPUESTA_MAESTRA.md, calcular Riesgo_base. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 0.
2. **OBSERVAR:** npm build, curl, COUNT. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 1.
3. **PALPAR:** grep con contexto (-B5 -A5), npx tsc para ciclos. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 2.
4. **MAPEAR:** GRAPH_REPORT.md (orientación, NO verdad). Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 3.
5. **DIAGNOSTICAR:** Distinguir síntoma vs causa. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 4.
6. **TRATAR:** Intervención mínima. Si hay ciclos (Skill 1.3), romper primero. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 5.
7. **PERSISTIR:** Escribir `diag_[tarea].md` con baseline ANTES de cambiar. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 6.
8. **MONITOREAR:** LEER `diag_[tarea].md`, comparar post-cambio contra baseline. Ver SKILL_PACK_V4.2.md META-SKILL 0 → Fase 7.

Ver SKILL_PACK_V4.2.md META-SKILL 0 para detalle completo de timeouts, sub-protocolos de ambigüedad y formato de archivos.

---

## Ciclos de Dependencia (CRÍTICO ANTES DE REFACTORIZAR)

Hay DOS tipos. Detectar AMBOS:

### Ciclo Estático (Import Cycle)
```bash
cd /home/admonctrlxm/portal-direccion-mme
# TypeScript/Next.js: detectar imports circulares
npx madge --circular src/ 2>&1
# Si retorna rutas → CICLO ESTÁTICO CONFIRMADO

# Alternativa: el build de TypeScript también lo detecta
npx tsc --noEmit 2>&1 | grep -i "circular"
```

### Ciclo Lógico (Dependency Injection — Next.js/containers)
```bash
# Verificar que Container NO inyecta A→B→A
grep -n "ServiceA" core/container.ts | grep -i "ServiceB"
# Debe retornar vacío o solo comments
```

Tratamiento: Crear interfaz, aplicar Dependency Inversion (Skill 1.3a/b en SKILL_PACK_V4.2.md)

---

## PostgreSQL/Datos >1GB

ANTES de tocar datos, obtener tamaño:

```bash
psql -d portal_energetico -t -A -c "SELECT pg_relation_size('tabla')"
```

| Tamaño | Método | Confianza | Qué hacer |
|---|---|---|---|
| < 100 MB | A | 100% | Checksum completo (SELECT md5) |
| 100 MB - 1 GB | B | 99% | Checksum (puede tardar 10-30s) |
| 1 - 10 GB | C | 85% | Stat proxy + TABLESAMPLE |
| > 10 GB | D | 70% | Stat proxy SOLO (PROHIBIDO COUNT) |

Ver SKILL_PACK_V4.2.md Skill 9 para comandos exactos y trampa ANALYZE.

---

## Cálculo de Riesgo (Multiplicadores — Skill 2.1)

NUNCA calcular en tu cabeza. Usar `bc` (LLMs mienten >3 factores):

```bash
# Ejemplo: Sin tests (2.0) × tabla >1GB (1.5) × multi-equipo (1.4)
echo "2.0 * 1.5 * 1.4" | bc -l
# Output (del sistema): 4.2
```

**Interpretación del resultado `bc`:**

| Resultado | Nivel | Acción |
|---|---|---|
| <1.0 | Verde | Ejecutar |
| 1.0-2.5 | Verde | Ejecutar + registrar en commit message |
| 2.5-5.0 | Amarillo | Plan escrito requerido |
| 5.0-8.0 | Naranja | Plan + verificación extra |
| 8.0-15.0 | ROJO | Plan + aprobación humana |
| >15.0 | ROJO OSCURO | Subdividir en tareas menores |

Ver SKILL_PACK_V4.2.md Skill 2.1 para tabla completa de multiplicadores y factor suma por DT-XXX.

---

## Emergencias (SEV-1/SEV-2)

Si el portal está caído o un dashboard crítico no carga:

```bash
# Diagnóstico rápido (minuto 0-5)
pm2 status | grep portal
curl -sI https://portaldireccionee.minenergia.gov.co | head -1
pm2 logs portal-mme --lines 50 --nostream

# Rollback si cambio reciente (minuto 5-10)
git log --oneline -5
# Si último commit < 2h → git revert HEAD && npm run build && pm2 restart portal-mme

# Verificar (minuto 10-15)
curl -s http://localhost:3000/ | head -1
# Si sigue caído → ESCALAR A HUMANO inmediatamente
```

Ver SKILL_PACK_V4.2.md Skill 17 para protocolo completo de emergencias.

**REGLA:** En SEV-1, NO investigar causa raíz primero. Restaurar servicio, luego investigar.

---

## Señales de ALTO Específicas del Frontend

1. **HomeSlider.tsx modificado sin plan:** Cualquier cambio en este archivo requiere verificación visual completa del home. Skill 8, regla #1.
2. **Build falla después de cambio en lib/db.ts:** Este archivo es el único punto de conexión a PostgreSQL. Un error aquí rompe TODOS los dashboards. Skill 8, regla #3.
3. **Nivo theme inline:** Crear un tema inline en vez de usar `getNivoTheme()` duplica configuración y puede causar inconsistencias visuales. Skill 8, regla #2.
4. **Cambio en múltiples API routes sin probar cada uno:** Las routes del BFF no tienen tests. Cada cambio requiere `curl` manual de verificación.
5. **Modificación de .env.local:** Cualquier cambio de secrets requiere `pm2 restart portal-mme --update-env` y verificación de que no hay exposición en el cliente.
6. **Cambio en `src/app/layout.tsx` o `src/app/page.tsx`:** Estos son los entry points. Un error aquí puede dejar el portal en blanco para TODOS los usuarios.
7. **Agregar dependencia npm sin verificar bundle size:** El bundle ya es grande. Agregar librerías pesadas puede degradar el tiempo de carga del home.
8. **Llamada directa a API XM desde componente:** Todo consumo de XM debe pasar por `xm-metric-service.ts` con fallback. Skill 14, patrón 14.1.
9. **Cálculo regulatorio sin test de regresión:** Cambios en fórmulas de pérdidas NT, CU o subsidios requieren valores de referencia CREG. Skill 15, matriz 15.1.
10. **Dashboard sin modo degradado:** Si un KPI no tiene datos, debe mostrar fallback visual, NO error 500. Skill 14, patrón 14.3.
