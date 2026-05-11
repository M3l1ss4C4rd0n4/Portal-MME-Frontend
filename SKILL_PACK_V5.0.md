# SKILL_PACK_V5.0.md — "Field Medic Framework"

> **Versión:** 4.2 — Triage + Timeouts + Rollback Granular + Resolución de Conflictos
>
> **Filosofía:** Un marco teórico perfecto que mata la base de datos en producción no es un marco perfecto.
> La física del hardware manda, y la aritmética de los LLMs miente.
>
> **Aplicable a:** Portal Dirección MME Frontend (Next.js 15 + React 19 + TypeScript estricto + Tailwind v4)
> **Backend referencia:** `/home/admonctrlxm/server/SKILL_PACK_V5.0.md`
> **Fecha:** 2026-05-02

---

## DETECCIÓN DE CONTEXTO DE PROYECTO

El agente DEBE saber en qué proyecto está operando antes de ejecutar cualquier acción.

**PASO 1: Detectar el proyecto actual**
```bash
$ pwd
```
- Si contiene `portal-direccion-mme`: **PROYECTO = FRONTEND**
- Si contiene `server`: **PROYECTO = BACKEND**
- Si contiene otro: **PAUSAR y pedir al humano**

**PASO 2: Cargar reglas específicas del proyecto**

**PROYECTO = FRONTEND:**
- Leer: `/home/admonctrlxm/portal-direccion-mme/AGENTS.md`
- Build: `npm run build`
- Tests: `npx tsc --noEmit` (no hay tests unitarios aún)
- Servicio: `pm2 restart portal-mme`
- Health: `curl http://localhost:3000/`
- God file: `src/components/HomeSlider.tsx` (1.663 líneas)
- DB: `getPool()` de `src/lib/db.ts`

**PROYECTO = BACKEND:**
- Leer: `/home/admonctrlxm/server/AGENTS.md`
- Build: `python -m py_compile` (por archivo) + `pytest`
- Tests: `cd /home/admonctrlxm/server && pytest tests/ -q --tb=no`
- Servicio: `systemctl restart api-mme`
- Health: `curl http://localhost:8000/health`
- God file: `core/container.py` (575 nodos)
- DB: `PostgreSQLConnectionManager` de `infrastructure/`

**PASO 3: Verificar que NO se están mezclando comandos de proyectos**

| Proyecto | PROHIBIDO ejecutar |
|---|---|
| FRONTEND | `pytest`, `python -c`, `systemctl restart api-mme` |
| BACKEND | `npm run build`, `npx tsc`, `pm2 restart portal-mme` |

Si el agente detecta que está a punto de ejecutar un comando del proyecto equivocado: **DETENER y corregir.**

---

## INICIALIZACIÓN DE SESIÓN (Momento Cero — máx 2 minutos)

Ejecutar SIEMPRE al inicio de una sesión nueva (no al continuar una existente):

```bash
# 1. Detectar proyecto
pwd

# 2. Cache de tamaños de tabla (si es backend o toca DB)
psql -d portal_energetico -c "
  SELECT relname, pg_relation_size(relid) as bytes
  FROM pg_stat_user_tables
  WHERE schemaname IN ('sector_energetico','subsidios','presupuesto','comunidades','contratos_or','supervision','fenoge')
  ORDER BY bytes DESC;
" > /tmp/table_sizes_cache.txt

# 3. Leer errores recientes (si existe)
cat /home/admonctrlxm/portal-direccion-mme/.knowledge/errors.md 2>/dev/null | tail -30

# 4. Verificar estado de servicios (baseline rápido)
pm2 status --no-color 2>/dev/null | grep -E "portal|api-mme"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null
```

**Output esperado:** Agente sabe en qué proyecto está, tiene cache de tamaños, conoce errores recientes, y tiene baseline de salud de servicios.

**PROHIBIDO:** Saltar este paso "porque ya lo sé de la sesión anterior". Cada sesión empieza sin memoria.

---

## PRINCIPIO FUNDAMENTAL: Jerarquía de Verdad (con Pesos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    JERARQUÍA DE VERDAD — SISTEMA DE PESOS              │
│                    (Decisiones se basan en PESO ACUMULADO ≥ 0.7)       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  NIVEL 1: ESTADO OBSERVABLE (Runtime)                                  │
│  ├── pytest PASA con el cambio propuesto              +0.40            │
│  ├── pytest FALLA con el cambio propuesto            -0.40            │
│  ├── npm run build PASA                              +0.35            │
│  ├── curl /health retorna 200                        +0.25            │
│  ├── SELECT COUNT(*) coincide pre/post               +0.25            │
│  ├── pm2 logs sin errores en últimos 5 min           +0.10            │
│  └── SELECT pg_size_pretty ejecuta sin timeout       +0.15            │
│                                                                         │
│  NIVEL 2: ANÁLISIS ESTÁTICO VERIFICABLE (AST)                         │
│  ├── grep -B5 -A5 confirma uso real                  +0.30            │
│  ├── python -c "import X; print(dir(X))" verifica export  +0.30       │
│  ├── npx tsc --noEmit pasa sin errores               +0.30            │
│  ├── python -m py_compile verifica sintaxis          +0.25            │
│  └── No ImportError al hacer cyclic import test      +0.25            │
│                                                                         │
│  NIVEL 3: INFERENCIA ESTRUCTURAL (Graphify)                            │
│  ├── graphify query (aristas EXTRACTED)              +0.20            │
│  ├── graphify query (aristas INFERRED)               +0.08            │
│  ├── GRAPH_REPORT.md zona >50% INFERRED              +0.03            │
│  ├── graphify path (navegación de dependencias)      +0.15            │
│  └── GRAPH_REPORT.md hubs y comunidades (orientación)  +0.10          │
│                                                                         │
│  NIVEL 4: SUPUESTOS (Lo que NO es verdad hasta verificado)             │
│  ├── "Este servicio probablemente no se usa"         0.00             │
│  ├── "Esta función hace lo que el nombre sugiere"    0.00             │
│  ├── "La multiplicación que hice en mi cabeza"       0.00             │
│  └── "Confío en mi memoria de 20 segundos atrás"     0.00             │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         REGLA DE ORO DE DECISIÓN                       │
│                                                                         │
│  PESO_ACUMULADO = Σ(pesos de todas las fuentes consultadas)           │
│                                                                         │
│  ├─ PESO ≥ 0.7  → EJECUTAR sin aprobación adicional                   │
│  ├─ PESO 0.5-0.69 → EJECUTAR + verificación extra en Fase 7          │
│  ├─ PESO 0.3-0.49 → INVESTIGAR más (buscar N1 adicional)             │
│  ├─ PESO 0.1-0.29 → HIPÓTESIS (documentar, NO ejecutar)               │
│  └─ PESO < 0.1 → IGNORAR, solicitar contexto al humano                │
│                                                                         │
│  NUNCA tomar decisión de cambio basada exclusivamente en Nivel 3 o 4.  │
│  SIEMPRE buscar AL MENOS UNA confirmación en Nivel 1 o 2.             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## REGLA DE RESOLUCIÓN DE CONFLICTOS ENTRE SKILLS

Cuando dos skills dan instrucciones contradictorias, prevalece este orden:

1. **Skill 8 (Reglas Absolutas)** — SIEMPRE gana. Son prohibiciones y condiciones inviolables. Si Skill 8 dice "PROHIBIDO", no importa qué digan los demás.

2. **Skill 0 (CDA)** — El proceso de diagnóstico tiene prioridad sobre cualquier skill que diga "hacer X" porque el CDA puede descubrir que X es peligroso en este contexto específico.

3. **META-SKILL -1 (Triage)** — La priorización de tareas gana sobre la ejecución de cualquier tarea individual. Si el triage dice "POSPONER", no se inicia CDA.

4. **Skill 12 (Rollback)** — Si algo sale mal, el rollback gana sobre cualquier instrucción de continuar o intentar de nuevo.

5. **Skills de dominio (1-11)** — Se aplican en orden numérico cuando no hay conflicto.

**EJEMPLOS DE CONFLICTO RESUELTO:**

- Skill 2 dice "refactorizar" pero Skill 8 dice "PROHIBIDO: refact sin diff textual" → Gana Skill 8. No refactorizar sin diff.
- Skill 5 dice "confianza 0.6, ejecutar" pero Fase 0 del CDA dice "DT-009 está PAUSED" → Gana CDA Fase 0. No ejecutar tarea pausada.
- Skill 1 dice "investigar más" pero Triage dice "Score 8.0, ejecutar ahora" → Gana Triage (META-SKILL -1), PERO se ejecuta con verificación extra por la baja confianza del Skill 1 (rango 0.5-0.69 = verificación extra).

---

## META-SKILL -1: Triage y Priorización

Este meta-skill se ejecuta ANTES de iniciar cualquier CDA cuando hay múltiples tareas pendientes.

### Matriz de Priorización Cuantificada

```
Score = (Impacto × Urgencia) / Esfuerzo
```

Donde:
- **Impacto:** 1-5
  - 1 = Cosmético (color, espaciado, typo sin efecto funcional)
  - 2 = Afecta 1 componente no crítico
  - 3 = Afecta 1 dashboard o funcionalidad
  - 4 = Afecta múltiples dashboards
  - 5 = Afecta producción completa (portal caído, datos corruptos)
- **Urgencia:** 1-5
  - 1 = Puede esperar 1 semana
  - 2 = Debe hacerse en los próximos 3 días
  - 3 = Debe hacerse esta semana
  - 4 = Debe hacerse hoy
  - 5 = Está rompiendo producción ahora
- **Esfuerzo:** en horas reales, calculadas con la fórmula de Skill 3

### Reglas de Desempate

1. Si dos tareas tienen Score similar (diferencia < 0.5): priorizar la que tenga **menor Peso_Acumulado** en Jerarquía de Verdad (la más cierta va primero).
2. Si aún empatan: priorizar la que afecte **menos archivos**.
3. Si aún empatan: **pedir al humano**.

### Integración con DT-XXX del Roadmap

Antes de calcular Score, buscar la tarea en `PROPUESTA_MAESTRA.md`:

```bash
grep -n "[palabra clave de la tarea]" /home/admonctrlxm/portal-direccion-mme/PROPUESTA_MAESTRA.md
```

- **DT-001 a DT-004 (Crítica):** Urgencia automáticamente = 4 mínimo
- **DT-005 a DT-011 (Media):** Urgencia automáticamente = 3 mínimo
- **DT-012+ (Baja):** Urgencia automáticamente = 2 máximo

### Formato de Output del Triage

```markdown
## Triage: [Fecha]
| # | Tarea | Impacto | Urgencia | Esfuerzo(h) | Score | DT-XXX | Acción |
|---|-------|---------|----------|-------------|-------|--------|--------|
| 1 | ... | 5 | 5 | 2 | 12.5 | DT-001 | EJECUTAR |
| 2 | ... | 3 | 3 | 4 | 2.25 | DT-006 | PLAN |
| 3 | ... | 1 | 1 | 8 | 0.125 | — | POSPONER |
```

### Umbral de Ejecución

- **Score ≥ 5.0** → **EJECUTAR** (iniciar CDA)
- **Score 2.0-4.9** → **PLAN** (escribir plan, pedir aprobación)
- **Score < 2.0** → **POSPONER** (documentar, no ejecutar)

---

## META-SKILL 0: Ciclo de Diagnóstico del Agente (CDA)

### Fase 0: CONTEXTUALIZAR (máx 3 minutos)

```
FASE 0: CONTEXTUALIZAR
├─ 0.1 Leer PROPUESTA_MAESTRA.md y buscar si la tarea actual está listada
│   grep -n "[palabra clave]" /home/admonctrlxm/portal-direccion-mme/PROPUESTA_MAESTRA.md
├─ 0.2 Si aparece con un DT-XXX:
│   ├── DT-001 a DT-004 (Crítica): Riesgo_base = 5.0, requiere plan escrito SIEMPRE
│   ├── DT-005 a DT-011 (Media): Riesgo_base = 2.5, requiere plan recomendado
│   └── DT-012+ (Baja): Riesgo_base = 1.0, ejecutar directo si pasa CDA
├─ 0.3 Si NO aparece en el roadmap:
│   ├── ¿Es tarea solicitada por el humano? → Riesgo_base = 2.0
│   └── ¿Es tarea que el agente identificó solo? → REQUIERE APROBACIÓN antes de CDA
├─ 0.4 Verificar estado de la tarea en el roadmap:
│   ├── Si marca "DONE" → NO EJECUTAR, reportar "tarea ya completada"
│   ├── Si marca "PAUSED" → NO EJECUTAR, reportar "tarea pausada por [razón]"
│   └── Si marca "SKIP" → NO EJECUTAR, reportar "tarea omitida por [razón]"
└─ 0.5 Registrar contexto en /tmp/diag_[tarea].md (o ubicación según duración)
```

**Timeout Fase 0:** máx 3 minutos.

### Fase 0.5: PRESUPUESTO DE CONTEXTO (máx 1 minuto)

```
FASE 0.5: PRESUPUESTO DE CONTEXTO
├─ Calcular líneas totales de archivos afectados:
│  wc -l archivo1.tsx archivo2.tsx | tail -1
├─ Si total > 2000 líneas → usar compresión (META-SKILL -2.3) o subdividir
├─ Si total < 500 líneas → proceder normal
└─ Registrar presupuesto en diag_[tarea].md
```

**Regla:** El agente tiene máximo 50K tokens de contexto útil. Distribuir estratégicamente:

| Componente | Tokens | Justificación |
|---|---|---|
| Código actual (archivos afectados) | 40% | Es lo que se está modificando |
| diag_*.md (baseline) | 20% | Es lo que se está comparando |
| Skills relevantes (solo los necesarios) | 20% | Es lo que guía la decisión |
| AGENTS.md (solo reglas aplicables) | 10% | Es lo que restringe la acción |
| Grafo (solo si es navegación) | 10% | Es lo que orienta |

**PROHIBIDO:** Cargar el SKILL_PACK completo para una tarea simple.

---

### Fase 1: OBSERVAR (máx 10 minutos)

```
FASE 1: OBSERVAR → ¿Qué ESTADO observable tengo?
├─ Ejecutar NIVEL 1: pytest, npm run build, curl, psql COUNT
├─ REGISTRAR baseline en archivo (no en memoria)
├─ Ejemplo:
│  ├─ pytest -q --tb=no > /tmp/baseline_tests.txt
│  ├─ npm run build 2>&1 | tail -10 > /tmp/baseline_build.txt
│  ├─ curl -s http://localhost:3000/ | head -1 > /tmp/baseline_health.txt
│  ├─ psql -d portal_energetico -c "SELECT COUNT(*) FROM tabla" > /tmp/baseline_count.txt
│  └─ pg_size_pretty(pg_relation_size('tabla')) → /tmp/baseline_size.txt
└─ SIN este baseline escrito, las fases 6-7 fallarán (no hay qué comparar)
```

**Timeout Fase 1:** máx 10 minutos.
- pytest: máx 3 min (si tarda más, hay test colgado → `pytest --timeout=60`)
- npm run build: máx 5 min (si tarda más, hay problema de dependencias)
- curl health: máx 30 seg (si tarda más, el servicio está roto, no lento)
- psql COUNT: máx 2 min para tablas <1GB, máx 5 min para >1GB
  - Si excede: la tabla está bloqueada o el query plan es malo
  - Verificar: `SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;`

**Sub-protocolo de ambigüedad — Fase 1:**

| Situación | Acción |
|---|---|
| pytest pasa pero npm run build falla | Priorizar el build (es Nivel 1 más alto para este proyecto) |
| curl /health retorna 500 pero pm2 status muestra "online" | El proceso está vivo pero roto → ir a logs ANTES de diagnosticar código |
| COUNT da diferente resultado en dos ejecuciones seguidas sin cambios | Hay actividad concurrente (ETL corriendo, otro usuario) → PAUSAR y verificar `pg_stat_activity` |

Si Fase 1 excede 10 min: guardar lo que se tenga en `/tmp/diag_*.md`, reportar "FASE 1 INCOMPLETA - timeout" y pedir al humano.

---

### Fase 2: PALPAR (máx 15 minutos)

```
FASE 2: PALPAR → ¿Qué puedo verificar con NIVEL 2 (AST)?
├─ grep -rn "NombreFuncion" src/ --include="*.tsx" --include="*.ts" -B5 -A5
├─ grep -rn "NombreServicio" /home/admonctrlxm/server/ --include="*.py" -B5 -A5
├─ python -c "from modulo import Clase; print(dir(Clase))" → /tmp/palpar_exports.txt
├─ npx tsc --noEmit --listFiles 2>&1 | tail -50 > /tmp/palpar_tsc.txt
├─ Si toca imports: python -c "from A import X; from B import Y; print('OK')"
│  └─ Si falla ImportError → CICLO ESTÁTICO (ir a Fase 2.5)
└─ Registrar: grep hallazgos en /tmp/palpar_*.txt
```

**Timeout Fase 2:** máx 15 minutos.
- Cada grep: máx 30 seg (si tarda más, reducir alcance con `--include` o ruta más específica)
- npx tsc --noEmit: máx 2 min
- python -c imports: máx 10 seg cada uno

**Sub-protocolo de ambigüedad — Fase 2:**

| Situación | Acción |
|---|---|
| grep encuentra el símbolo pero en comentarios o strings | NO cuenta como uso real → filtrar con `grep -v "^\s*#" \| grep -v "^\s*//" \| grep -v '"""' \| grep -v "^\s*\*"` |
| grep encuentra 0 resultados pero el archivo compila | Puede ser uso vía getattr/import dinámico → buscar "getattr", "importlib", "require(" |
| python -c falla con error diferente a ImportError (ej: AttributeError) | No es ciclo, es otra cosa → investigar el AttributeError |

Si Fase 2 excede 15 min: detener, guardar hallazgos parciales, decidir con lo que se tiene (Peso_Acumulado será bajo → probablemente necesitará aprobación).

---

### Fase 3: MAPEAR (máx 5 minutos)

```
FASE 3: MAPEAR → ¿Qué me dice el GRAFO como MAPA (no como VERDAD)?
├─ cat /home/admonctrlxm/server/graphify-out/GRAPH_REPORT.md | head -80
├─ Identificar:
│  ├─ Hubs (nodos con >20 aristas) — probable god file o god service
│  ├─ Comunidades (clusters de nodos altamente acoplados)
│  ├─ Porcentaje de aristas EXTRACTED vs INFERRED en GRAPH_REPORT
│  └─ Si >50% INFERRED en zona de interés → DESCONFIANZA ELEVADA (peso 0.03)
├─ graphify query "dependencias de X" --budget 3000
└─ NUNCA confundir: "El grafo dice que A depende de B" ≠ "A efectivamente depende de B"
```

**Timeout Fase 3:** máx 5 minutos.
- Leer GRAPH_REPORT.md head -80: máx 1 min
- graphify query: máx 3 min (con --budget 3000)

**Sub-protocolo de ambigüedad — Fase 3:**

| Situación | Acción |
|---|---|
| GRAPH_REPORT.md muestra >50% INFERRED en la zona de interés | NO usar el grafo para decisiones → tratar como si el grafo no existiera |
| graphify query retorna un camino que grep no confirma | El grafo mintió → registrar en /tmp/diag_*.md como "falso positivo graphify" y NO usar esa arista |
| graphify no está instalado o graphify-out/ no existe | OMITIR Fase 3 completamente → ir directo a Fase 4 con información de Fases 1-2 |

Si excede: OMITIR Fase 3, continuar sin información del grafo.

---

### Fase 4: DIAGNOSTICAR (máx 20 minutos)

```
FASE 4: DIAGNOSTICAR → ¿Cuál es la ENFERMEDAD real?
├─ Distinguir SÍNTOMA vs CAUSA
│  ├─ Síntoma: "Este archivo tiene 1.663 líneas"
│  ├─ Causa: "El archivo acopla 5 responsabilidades sin interfaces"
│  └─ Tratamiento debería atacar la CAUSA, no el síntoma
├─ Si hay ciclos:
│  ├─ Tipo ESTÁTICO (python -c falló) → Extraer interfaz (Skill 1.3a)
│  ├─ Tipo LÓGICO (Container inyecta A→B→A) → Dependency Inversion (Skill 1.3b)
│  └─ Registrar AMBOS tipos en /tmp/diag_[tarea].md
├─ Si afecta datos (DB/ETL): Ir a Skill 9 (seleccionar Método A/B/C/D por tamaño)
└─ Si es componente (UI): Registrar si afecta HomeSlider.tsx (god component = 2.2x riesgo)
```

**Timeout Fase 4:** máx 20 minutos.
- Incluye tiempo para ejecutar verificaciones adicionales

**Sub-protocolo de ambigüedad — Fase 4:**

| Situación | Acción |
|---|---|
| Identificas 2+ causas posibles con confianza similar (diferencia < 0.2) | NO elegir una. Crear lista de hipótesis ordenada por Peso_Acumulado. Para cada hipótesis, listar qué verificación adicional la confirmaría o descartaría. Ejecutar la verificación de la hipótesis #1. Si se descarta, pasar a #2. Si ninguna se confirma: PAUSAR y presentar lista al humano. |
| El síntoma coincide con 2 enfermedades de la Matriz 0.3 | Verificar AMBAS antes de tratar |

Si excede: elegir la hipótesis con mayor Peso_Acumulado disponible, documentar "diagnóstico con confianza parcial" y proceder con precaución extra.

---

### Fase 5: TRATAR (timeout según riesgo de Skill 2.1)

```
FASE 5: TRATAR → ¿Cuál es la intervención MÍNIMA?
├─ NUNCA: "Voy a refactorizar todo el servicio de una vez"
├─ SÍ: "Voy a crear una interfaz, migrar 1 consumidor, verificar, commit, repetir"
├─ Si la causa es un ciclo → ROMPER EL CICLO PRIMERO (antes de cualquier extracción)
├─ Si la causa es data corruption → VERIFICAR CON MÉTODO CORRECTO PRIMERO
├─ Crear SOLAMENTE archivos nuevos (<500 líneas cada uno)
│  └─ NO modificar god files sin plan escrito
└─ Registrar pasos en diag_[tarea].md
```

**Timeout Fase 5:** según cálculo de riesgo de Skill 2.1
- Si riesgo calculado > 8.0: NO hay timeout, requiere aprobación humana antes de empezar
- Si riesgo 2.5-8.0: máx tiempo = esfuerzo estimado × 1.5
- Si riesgo < 2.5: máx tiempo = esfuerzo estimado × 2.0

**Sub-protocolo de ambigüedad — Fase 5:**

| Situación | Acción |
|---|---|
| Hay 2 tratamientos posibles | Elegir el de menor riesgo (calcular con `bc`) |
| El tratamiento requiere modificar >3 archivos | Subdividir en sub-tratamientos de 1 archivo cada uno |

---

### Fase 6: PERSISTIR (máx 2 minutos)

```
FASE 6: PERSISTIR → Guardar estado en ARCHIVO, NO en memoria
├─ ESCRIBIR diag_[tarea].md en ubicación según duración estimada (ver abajo)
├─ INCLUIR: Timestamp, Contexto (Fase 0), Baseline, Ciclos, Archivos, Decisión, Rollback
└─ GUARDAR INMEDIATAMENTE tras completar Fase 5 (no esperar a Fase 7)
```

**Timeout Fase 6:** máx 2 minutos (es solo escribir un archivo).

**Ubicación de persistencia según duración estimada de la tarea:**

```
├── Tarea < 4 horas (esfuerzo calculado):
│   → /tmp/diag_[tarea].md
│   → /tmp se limpia solo, pero la tarea termina antes de que eso pase
│
├── Tarea 4-8 horas:
│   → /home/admonctrlxm/diagnostics/diag_[tarea].md
│   → Crear directorio si no existe: mkdir -p /home/admonctrlxm/diagnostics/
│   → Limpiar al finalizar: rm /home/admonctrlxm/diagnostics/diag_[tarea].md
│
├── Tarea > 8 horas (subdividida en sesiones):
│   → /home/admonctrlxm/diagnostics/diag_[tarea]_SESION[N].md
│   → Una archivo por sesión, numerado
│   → Cada sesión comienza leyendo el archivo de la sesión anterior
│   → NO limpiar hasta que la última sesión termine con ✅
│
└── Tarea FALLIDA (cualquier duración):
    → CONSERVAR el archivo para post-mortem
    → Renombrar a: diag_[tarea]_FAILED_YYYYMMDD.md
    → Ubicación: /home/admonctrlxm/diagnostics/post-mortem/
```

**REGLA:** Al iniciar Fase 7 (MONITOREAR), si el archivo de diagnóstico no existe en la ubicación esperada, buscar en las 3 ubicaciones posibles (`/tmp/`, `diagnostics/`, `diagnostics/post-mortem/`). Si no está en ninguna: **ESCALAR AL HUMANO.**

---

### Fase 7: MONITOREAR (máx 15 minutos)

```
FASE 7: MONITOREAR → ¿El tratamiento funcionó?
├─ PASO 1: LEER diag_[tarea].md (obtener baseline original)
│  └─ Si el archivo fue borrado o no existe → PAUSAR y PEDIR baseline al humano
├─ PASO 2: Re-ejecutar comandos de Fase 1 + comparar
├─ PASO 3: Comparar BYTE POR BYTE contra baseline
│  ├─ diff /tmp/baseline_tests.txt /tmp/post_tests.txt
│  ├─ diff /tmp/baseline_count.txt /tmp/post_count.txt
│  └─ diff /tmp/baseline_health.txt /tmp/post_health.txt
├─ PASO 4: Si datos (aplica Skill 9 Método correspondiente)
│  ├─ Comparar checksum/proxy contra baseline
│  ├─ Si tabla >10GB: Pedir permiso para ANALYZE antes de re-verificar pg_stats
│  └─ Si hay discrepancia: NO entrar en pánico, investigar si >10% en proxies
├─ PASO 5: Decisión
│  ├─ Si TODO coincide → Finalizar. El tratamiento funcionó. ✅
│  ├─ Si algo cambió pero es ESPERADO → Documentar por qué es aceptable. ✅
│  ├─ Si algo cambió y NO es esperado → ❌ REVERTIR Y REDIAGNOSTICAR
│  │  └─ git revert [hash de Fase 5]
│  │  └─ Volver a Fase 4 (diagnóstico)
│  └─ Actualizar diag_[tarea].md con resultado
├─ PASO 6: Limpiar
│  ├─ Si tarea EXITOSA: rm diag_[tarea].md /tmp/baseline_* /tmp/post_*
│  └─ Si tarea FALLÓ: CONSERVAR diag_[tarea].md para análisis post-mortem
└─ FIN CDA
**Timeout Fase 7:** máx 15 minutos.
- Si la verificación post-cambio no coincide con baseline:
  - Máx 3 intentos de diagnóstico rápido (5 min cada uno)
  - Si no se resuelve: ir a Skill 12 (Rollback Granular)
- Si excede sin resolver: ROLLBACK obligatorio

---

### Timeout Global del CDA

- **Si el CDA completo lleva más de 2 horas:** PAUSAR y reportar progreso al humano.
- **Si lleva más de 4 horas:** ROLLBACK obligatorio y ESCALAR.

---

### Formato de diag_[TAREA].md (Actualizado con campo Contexto)

```markdown
# Diagnóstico: [Nombre de Tarea]
## Timestamp
[YYYY-MM-DD HH:MM:SS]

## Contexto (Fase 0)
- DT-XXX: [DT-001 / DT-005 / —]
- Clasificación: [Crítica / Media / Baja]
- Riesgo_base: [X.X]
- Estado en roadmap: [DONE / PAUSED / SKIP / Sin marcar]

## Baseline Pre-Intervención
### Tests
- pytest: [output de pytest -q --tb=no]
- npm build: [output de npm run build | tail -3]

### Datos (solo si aplica)
| Tabla | COUNT | Stat Proxy | Duplicados |
|---|---|---|---|
| [tabla] | [número] | [sum_proxy] | [número] |

### Health
- API: [curl output]
- Portal: [curl output]

## Ciclos Detectados
- [lista de ciclos estáticos y lógicos]

## Archivos Afectados
- [lista con hashes git si es posible]

## Decisión Tomada
- [qué se va a hacer y por qué]

## Rollback
- git revert [hash]
- [otros pasos]
```

---

### Matriz de Diagnóstico por Tipo de Enfermedad

| Enfermedad | Síntoma observable | Diagnóstico confirmatorio | Tratamiento | CONTRAINDICACIÓN |
|---|---|---|---|---|
| **Ciclo estático** | `ImportError` al importar | `python -c "from A import B; from B import A"` falla | Extraer interfaz para romper import | NO intentar `if TYPE_CHECKING` como workaround permanente |
| **Ciclo lógico (DI)** | No hay ImportError pero Container inyecta A→B→A | grep de Container muestra inyección mutua | Extraer interfaz + inyectar interfaz en un lado | NO asumir que "no hay ImportError = no hay ciclo" |
| **God File (cableado)** | 575 nodos, cohesión 0.01 | grep muestra que TODO importa este archivo | Facade con delegación gradual | NO eliminar sin que todos los consumidores usen la facade |
| **God Service (lógica)** | >1000 líneas, >5 tipos de salida | grep muestra múltiples `return` de tipos distintos | Extraer output adapters primero | NO extraer lógica sin diff de output textual |
| **Data Ghost** | 0 FKs, duplicados en schemas | COUNT en dos schemas muestra discrepancia | Consolidar con stat proxies antes/después | NO hacer string_agg en tabla >1GB |
| **ETL Drift** | 3 funciones copy-paste | Diff muestra solo cambia nombre de tabla | Parametrizar con config dataclass | NO refactorizar sin dry-run en tabla de prueba |
| **DOM Entropy** | Componente 1663 líneas, 0 tests | Cambio de 1 línea cambia el layout visual | Extraer con verificación visual | NO refactorizar UI sin verificación post-cambio |


---

## SKILL 1: Investigación — Runtime-First, Graphify-Second

### 1.1 Árbol de Decisión

```
INICIO INVESTIGACIÓN
        │
        ▼
¿Necesito VERDAD o NAVEGACIÓN?
    │
    ├── VERDAD (voy a tomar una decisión de cambio)
    │   │
    │   ├── ¿Afecta datos (DB/ETL)?
    │   │   ├── SÍ → NIVEL 1: pg_relation_size primero
    │   │   │        → Si <1GB: COUNT + checksum MD5
    │   │   │        → Si >1GB: COUNT + stat proxy + TABLESAMPLE
    │   │   │        → NIVEL 2: grep del SQL/ETL
    │   │   │        → Graphify: SOLO para saber quién más la toca
    │   │   │
    │   │   └── NO → NIVEL 2: grep con contexto (-B5 -A5)
    │   │            → NIVEL 1: pytest del módulo
    │   │            → Graphify: NO NECESARIO
    │   │
    │   └── ¿Afecta código puro (lib, components, hooks)?
    │       ├── SÍ → NIVEL 2: tsc --noEmit / py_compile
    │       │        → NIVEL 1: npm run build / pytest
    │       │        → Graphify: NO NECESARIO
    │       │
    │       └── NO → ¿Afecta imports cross-module?
    │                ├── SÍ → Skill 1.3 (Ciclos) primero
    │                │        → Graphify query + grep verificación
    │                └── NO → grep directo
    │
    └── NAVEGACIÓN (entender el sistema, no cambiarlo)
        ├── Panorámica → GRAPH_REPORT.md
        ├── Dependencias → graphify query
        └── Rutas → graphify path
```

### 1.2 Protocolo de Verificación Cruzada

Para decisiones de cambio, usar el sistema de pesos documentado en **Principio Fundamental: Jerarquía de Verdad**.

Ver tabla completa de pesos y reglas de decisión en la sección "Principio Fundamental: Jerarquía de Verdad (con Pesos)" de este documento.

### 1.3 Detección de Ciclos de Dependencia (Estáticos Y Lógicos)

HAY DOS TIPOS DE CICLOS. DETECTAR AMBOS. SON ENFERMEDADES DIFERENTES CON DIAGNÓSTICOS Y TRATAMIENTOS DIFERENTES.

**═══ CICLO ESTÁTICO (Import Cycle) ═══**

¿Qué es? El archivo A.py hace `from B import X` y B.py hace `from A import Y`. Python falla inmediatamente con ImportError.

Detección:
```bash
python3 -c "from domain.services.generation_service import GenerationService; \
           from domain.services.commercial_service import CommercialService; print('OK')"
```
→ Si falla con ImportError → CICLO ESTÁTICO CONFIRMADO

Tratamiento: Extraer la dependencia compartida a un tercer módulo (o usar `if TYPE_CHECKING` solo si es estrictamente necesario para type hints, nunca para lógica de runtime).

**═══ CICLO LÓGICO (Dependency Injection Cycle) ═══**

¿Qué es? A.py y B.py se importan correctamente (no hay ImportError). PERO el Container inyecta B dentro de A, y A dentro de B. El ciclo existe en el grafo de dependencias LÓGICAS, no en el grafo de imports de Python.

Detección (3 pasos):

PASO 1: Verificar que NO hay ciclo estático
```bash
python3 -c "from A import A; from B import B; print('No static cycle')"
```
→ Debe pasar OK

PASO 2: Buscar inyección mutua en el Container
```bash
grep -n "GenerationService" core/container.py
grep -n "CommercialService" core/container.py
```
→ Si Container.creation_of_A() usa B, Y Container.creation_of_B() usa A → CICLO LÓGICO CONFIRMADO

PASO 3: Verificar la dirección del acoplamiento (REGEX AMPLIO)
```bash
grep -in "commercial" domain/services/generation_service.py | grep -v "^\s*#" | grep -v "import"
grep -in "generation" domain/services/commercial_service.py | grep -v "^\s*#" | grep -v "import"
```
→ Si GenerationService usa 1 método de CommercialService pero CommercialService usa 5 métodos de GenerationService → Romper el ciclo por el lado más débil (1 método = interfaz fácil)

Tratamiento: Dependency Inversion en el lado más débil del ciclo.

PASO A: Crear interfaz minimal para el lado débil
```python
# domain/interfaces/iprecio_provider.py
from abc import ABC, abstractmethod
class IPrecioProvider(ABC):
    @abstractmethod
    def get_precio_bolsa(self, fecha: str) -> float: ...
```

PASO B: Hacer que el servicio concreto implemente la interfaz
```python
# En commercial_service.py
class CommercialService(IPrecioProvider): ...
```

PASO C: Hacer que el otro servicio dependa de la interfaz
```python
# En generation_service.py
class GenerationService:
    def __init__(self, precio_provider: IPrecioProvider, ...):
        self._precio = precio_provider  # NO es CommercialService
```

PASO D: Actualizar Container para inyectar la implementación concreta
```python
# En container
gen = GenerationService(precio_provider=commercial_instance, ...)
```

PASO E: Verificar que el ciclo se rompió
```bash
grep -n "GenerationService" core/container.py  # ya no usa CommercialService directamente en init
python3 -c "from domain.services.generation_service import GenerationService; print('OK')"
```

**═══ CHECKLIST ANTES DE EXTRAER MÓDULOS DEL CONTAINER ═══**

Para cada par de servicios que voy a mover al mismo archivo nuevo:
- [ ] python -c: No hay ciclo estático
- [ ] grep container.py: No hay inyección mutua (ciclo lógico)
- [ ] Si hay ciclo lógico: Ya se aplicó Dependency Inversion
- [ ] Solo después de las 3 checks anteriores: proceder a extraer

---

## SKILL 2: Refactorización

### 2.1 Matriz de Riesgo No-Lineal

CÁLCULO DE PROBABILIDAD (factores se MULTIPLICAN entre sí):

⚠️ REGLA DE ORO ARITMÉTICA: LOS LLMs SON MALOS MULTIPLICANDO MÁS DE 3 FACTORES DE PUNTO FLOTANTE. NUNCA intentes calcular este valor en tu memoria interna. Siempre delega la matemática al sistema operativo usando el comando `bc`.

**FACTORES A MULTIPLICAR:**
- Sin tests unitarios:        1.8
- Sin tests de integración:   2.0 (solo si afecta infrastructure/ o ETL)
- 0 FKs en tablas afectadas:  2.0
- God file involucrado:       2.2
- God SERVICE involucrado:    2.5 (>1000 líneas)
- Ciclos de dependencia:      1.8
- Multi-equipo:               1.4
- ETL en Celery Beat:         3.0
- Tabla >1GB:                 1.5
- Producción activa:          1.3
- Código sin documentar:      1.4

**FACTOR ADICIONAL (se SUMA al resultado de bc, no se multiplica):**
- Tarea es DT-001 a DT-004: +3.0
- Tarea es DT-005 a DT-011: +1.0
- Tarea no está en roadmap: +2.0 (más incertidumbre)
- Tarea está en roadmap con estado DONE/PAUSED/SKIP: NO EJECUTAR (no llega a cálculo)

**EJECUCIÓN OBLIGATORIA POR EL AGENTE:**
Ejemplo si aplica: Sin tests (1.8), 0 FKs (2.0), ETL Beat (3.0):
```bash
echo "1.8 * 2.0 * 3.0" | bc -l
# Output esperado del sistema: 10.8
```

**LÍMITES (Evaluar contra el OUTPUT de `bc`, no contra tu suposición):**
- Si el output de bc es < 1.0 → Verde. Ejecutar.
- Si el output de bc es 1.0-2.5 → Verde + registrar en commit message
- Si el output de bc es 2.5-5.0 → Amarillo. Plan escrito requerido.
- Si el output de bc es 5.0-8.0 → Naranja. Plan + verificación extra.
- Si el output de bc es 8.0-15.0 → ROJO. Plan + aprobación humana.
- Si el output de bc es > 15.0 → ROJO OSCURO. Subdividir en tareas menores.

### 2.2 Protocolo de Refactorización

FASE 0: DIAGNÓSTICO
- 0.1 NIVEL 1: Baseline (tests, counts, health)
- 0.2 NIVEL 2: grep dependencias con contexto
- 0.3 NIVEL 3: Graphify para navegación
- 0.4 Leer archivos afectados COMPLETOS
- 0.5 DETECCIÓN DE CICLOS (estáticos Y lógicos — Skill 1.3)
- 0.6 Calcular probabilidad usando `echo "X * Y * Z" | bc -l`
- 0.7 PERSISTIR: Escribir diag_[tarea].md con TODO lo anterior

FASE 0.5b: RUPTURA DE CICLOS (solo si 0.5 detectó ciclos)
- Identificar tipo: estático vs lógico
- Aplicar tratamiento correspondiente (Skill 1.3)
- Verificar: python -c "import ..." + grep container.py
- Commit: "refactor: break [static|logical] cycle between A and B"
- PERSISTIR: Actualizar diag_[tarea].md con resultado
- Volver a 0.5 para re-verificar

FASE 1: PREPARACIÓN
- 1.1 Git: commit + push "chore: pre-refactor snapshot"
- 1.2 DATA: Si afecta DB/ETL → snapshot con método correcto (Skill 9)
- 1.3 Crear: archivos nuevos (NO modificar existentes)
- 1.4 Ningún archivo nuevo >500 líneas
- 1.5 PERSISTIR: Actualizar diag_[tarea].md

FASE 2: MIGRACIÓN INCREMENTAL
- 2.1 Crear fachada/adapter que delega
- 2.2 Migrar un consumidor
- 2.3 Verificar NIVEL 1
- 2.4 Si afecta datos: verificar con método correcto (Skill 9)
- 2.5 Commit separado
- 2.6 PERSISTIR: Actualizar diag_[tarea].md

FASE 3: LIMPIEZA
- 3.1 LEER diag_[tarea].md para obtener baseline
- 3.2 Verificar: tests pasan (comparar contra baseline del archivo)
- 3.3 Verificar: datos coinciden (comparar contra baseline del archivo)
- 3.4 Eliminar código viejo
- 3.5 Verificar de nuevo
- 3.6 Commit final
- 3.7 Limpiar diag_[tarea].md (éxito) o conservar (fallo)

### 2.3 Patrón R1: Extracción de Container (con ciclos lógicos)

ANTES de extraer, ejecutar Skill 1.3 completo. Si hay ciclos lógicos, aplicar Dependency Inversion primero.

```python
# container/services_energy.py
class EnergyServiceFactory:
    def __init__(self, repos, external_services):
        self._repos = repos
        self._external = external_services

    def create_generation(self) -> GenerationService:
        commercial = self.create_commercial()
        return GenerationService(
            precio_provider=commercial,
            repo=self._repos.metrics_repo,
        )

    def create_commercial(self) -> CommercialService:
        return CommercialService(
            repo=self._repos.commercial_repo,
        )

# container/__init__.py
class ContainerFacade:
    def __init__(self):
        self._energy = EnergyServiceFactory(repos, external)

    @property
    def generation_service(self):
        return self._energy.create_generation()

    @property
    def commercial_service(self):
        return self._energy.create_commercial()
```

### 2.4 Patrón R2.5: Refactorización de God Services (con PDF textual diff)

REGLA: Un servicio >1000 líneas es tan peligroso como un god file.
PROHIBIDO: Refactorizar lógica de negocio sin diff de output textual.

PROTOCOLO PARA GOD SERVICES (ejemplo: report_service.py — 1.850 líneas):

PASO 0: DIAGNÓSTICO DEL OUTPUT
- grep -n "return " domain/services/report_service.py | head -30
- Clasificar tipos de salida: dict / PDF / JSON / DataFrame
- Identificar output CANÓNICO (el que no puede romperse)
- ¿Hay test de integración que valide output? → Sino: PROHIBIDO tocar lógica

PASO 1: EXTRAER FORMATEADORES (sin riesgo)
- Extraer a domain/utils/formatting.py
- Reemplazar en report_service.py con imports
- Verificar con diff textual

PASO 2: EXTRAER DATA ADAPTERS (bajo riesgo)
- Extraer consultas a repositorio
- Reemplazar en report_service.py
- Verificar con diff textual

PASO 3: EXTRAER OUTPUT ADAPTERS (medio riesgo)
- Extraer lógica de generación de PDF/JSON
- report_service.py → orquestador puro
- Verificar con diff textual

PASO 4: DIVIDIR LÓGICA (ALTO riesgo — solo con tests de integración)
- Extraer sub-informes con tests de output
- Verificar con diff textual

VERIFICACIÓN DE OUTPUT (diff textual, NO binario):

PROHIBIDO: `diff baseline.pdf refactor.pdf`
RAZÓN: Los generadores de PDF inyectan metadatos no deterministas.

CORRECTO: Extraer texto del PDF antes de diffear.

```bash
# Generar baseline ANTES del refactor
pdftotext baseline.pdf /tmp/baseline_text.txt

# ... hacer el refactor ...

# Generar refactor
pdftotext refactor.pdf /tmp/refactor_text.txt

# Diff textual (no binario)
diff /tmp/baseline_text.txt /tmp/refactor_text.txt

# Si hay diferencias, inspeccionar si son significativas:
diff -u /tmp/baseline_text.txt /tmp/refactor_text.txt | head -50

# También verificar estructura (número de páginas, etc.):
python3 -c "
import fitz  # PyMuPDF
b = fitz.open('baseline.pdf')
r = fitz.open('refactor.pdf')
print(f'Páginas: baseline={len(b)}, refactor={len(r)}')
assert len(b) == len(r), 'Diferencia en número de páginas'
"
```

NOTA: Si pdftotext no está instalado: `sudo apt-get install poppler-utils`

ALTERNATIVA si no hay pdftotext ni PyMuPDF:
```bash
strings baseline.pdf | grep -v "^$" | sort > /tmp/baseline_strings.txt
strings refactor.pdf | grep -v "^$" | sort > /tmp/refactor_strings.txt
diff /tmp/baseline_strings.txt /tmp/refactor_strings.txt
```

---

## SKILL 3: Estimación No-Lineal

ESFUERZO_REAL = ESFUERZO_NOMINAL × ∏(FACTORES) + VERIFICACIÓN + ENTROPÍA

⚠️ RECORDATORIO: Calcular el producto de los FACTORES usando `echo "..." | bc -l`. No sumar los factores. No calcularlos mentalmente.

**FACTORES (se MULTIPLICAN en bash):**
- Sin tests unitarios:        ×1.8
- Sin tests de integración:   ×2.0
- 0 FKs en tablas afectadas:  ×2.0
- God file:                   ×2.2
- God SERVICE (>1000 líneas): ×2.5
- Ciclos (estáticos o lógicos): ×1.8
- Multi-equipo:               ×1.4
- ETL en Celery Beat:         ×3.0
- Tabla >1GB:                 ×1.5
- Producción activa:          ×1.3
- Sin documentar:             ×1.4

**VERIFICACIÓN (se SUMA al resultado de bc):**
- Código <3 archivos:   15 min
- Código 3-10 archivos:  30 min
- Código >10 archivos:   1 hora
- DB (tabla <1GB):      45 min (checksums completos)
- DB (tabla >1GB):      1.5 horas (stat proxies + ANALYZE gating)
- ETL:                  1 hora (dry-run + comparación)
- UI:                   30 min (verificación visual)

**ENTROPÍA (se SUMA al resultado final):**
- Archivo resultado >500 líneas: +2 horas (dividir más)
- Archivo resultado >300 líneas: +30 min
- Componente con Nivo:          +1 hora
- Componente con Leaflet:       +1 hora
- Layout responsive:            +1.5 horas
- Tabla sin FK + repo change:   +1 hora
- ETL sin idempotencia:         +2 horas
- Cambio .service:              +30 min

**LÍMITE:** Si el total > 8 horas → plan escrito + aprobación. >16 horas → subdividir.

---

## SKILL 4: Comunicación

### 4.1 Formato de Reporte de Estado (con datos)

```markdown
## Estado: [Nombre]

### Código
- Archivos: X modificados, +Y/-Z líneas
- Tests: [baseline] → [post] (sin regresión)

### Datos (si aplicó)
| Tabla | Tamaño | Método | Pre | Post | Match |
|---|---|---|---|---|---|
| [t] | [<1GB/>1GB] | [checksum/proxy] | [val] | [val] | ✅/❌ |

### Verificación de output (si aplicó — PDF/dict)
- Método: pdftotext diff / dict comparison
- Resultado: 0 diferencias textuales ✅
```

### 4.2 Formato de Petición de Aprobación

```markdown
## 🚨 Aprobación: [Acción]

### Qué
[Descripción]

### Riesgo calculado (vía `bc`)
P = echo "[factores]" | bc -l = [resultado real] → [NIVEL]

### Mitigaciones
| Riesgo | Mitigación |
|---|---|
| [R] | [M] |

### Rollback
[pasos]

### Archivo de diagnóstico
diag_[tarea].md — contiene baseline completo
```

### 4.3 Formato de Problema

```markdown
## 🐛 Problema: [Título]

### Ubicación
`archivo:línea`

### Evidencia (Nivel 1)
```bash
[comando + output]
```

### Hipótesis
[nivel de confianza 0.0-1.0]: [qué creo que pasa]

### Fix propuesto
```[lang]
[código]
```

### ¿Procedo?
```

---

## SKILL 5: Incertidumbre

```
NIVEL          PESO      ACCIÓN
≥0.8 VERIF.    2+ N1/N2  EJECUTAR
0.5-0.79 PROB. 1 N1/N2   EJECUTAR + VERIFY EXTRA
0.3-0.49 PLAU. solo N3/4 INVESTIGAR
0.1-0.29 HIP.  ninguno   NO TOCAR, documentar
<0.1 IGNOR.    ninguno   PEDIR CONTEXTO
```

---

## SKILL 6: Meta-Habilidades

### 6.1 Detección de Modo Equivocado

```
Si leo graph.json directamente (no report ni query) → Usar tools correctas
Si grep da 0 pero Graphify dice que hay conexión → Graphify mintiendo (INFERRED)
Si toco código sin COUNT/checksum de tabla → Cirugía sin radiografía
Si creo archivo >500 líneas → No estoy dividiendo suficiente
Si mi cálculo mental de riesgo difiere de lo que daría `bc` → USAR BC
Si no leí diag_*.md antes de verificar → Comparando contra nada
Si voy a crear un .md → ¿Paso el test de necesidad? (Skill 11)
```

---

## SKILL 7: Checklist de Calidad

```
TÉCNICO (Nivel 1):
□ pytest pasa (mismo baseline)
□ npm run build pasa (si aplica)
□ curl health checks OK

DATOS (si tocó DB/ETL):
□ COUNT coincide con baseline (de diag_*.md)
□ Método correcto usado para tamaño de tabla (<1GB: checksum, >1GB: proxy)
□ Si Método D usado: Se ejecutó ANALYZE (con permiso) antes de comparar post
□ No duplicados nuevos (COUNT - COUNT DISTINCT = 0)
□ Si ETL: idempotencia verificada (2 ejecuciones = mismo resultado)

CICLOS (si extrajo módulos):
□ No ciclos estáticos (python -c verifica)
□ No ciclos lógicos (grep amplio sin convenciones estrictas verifica)

ARTEFACTO:
□ Ningún archivo nuevo >500 líneas
□ Nombres descriptivos en dominio del negocio

COMPATIBILIDAD:
□ Firmas públicas intactas
□ Imports migrados completamente

DOCUMENTAL (Skill 11):
□ No se crearon .md innecesarios
□ .md existentes actualizados si el cambio es arquitectónico
□ .md obsoletos eliminados
```

---

## SKILL 8: Reglas Absolutas

```
PROHIBIDO:
├── 1. Modificar core/container.py directamente
├── 2. Agregar lógica a HomeSlider.tsx
├── 3. Refactorizar lógica de servicio >1000 líneas sin diff textual de output
├── 4. SQL dinámico sin sql_validator.py
├── 5. Exponer secrets en NEXT_PUBLIC_*
├── 6. Eliminar archivos sin grep -r + git log
├── 7. Cambiar schema DB sin pg_dump previo
├── 8. Tocar .service sin systemctl status + cp backup
├── 9. Tocar ETL en Celery Beat sin tabla de prueba
├── 10. Crear archivo resultado >500 líneas
├── 11. string_agg en tabla >1GB (usar stat proxy o TABLESAMPLE)
├── 12. diff binario de PDF (usar pdftotext diff)
├── 13. Crear .md sin pasar el test de necesidad (Skill 11)
├── 14. Confiar en memoria de contexto para baseline (usar diag_*.md)
├── 15. Ejecutar ANALYZE en tabla >10GB automáticamente sin permiso humano
├── 16. Calcular multiplicatorios de riesgo en la "cabeza" del LLM (usar `bc`)
├── 17. Ejecutar una tarea que PROPUESTA_MAESTRA.md marca como "PAUSED"
│   → Razón: PAUSED significa que hay dependencia externa no resuelta
│   → Acción: Reportar al humano que la tarea está pausada y por qué
├── 18. Ejecutar una tarea que PROPUESTA_MAESTRA.md marca como "DONE"
│   → Razón: Puede sobrescribir trabajo ya completado
│   → Acción: Verificar con git log que el trabajo realmente existe
├── 19. Ejecutar una tarea que PROPUESTA_MAESTRA.md marca como "SKIP"
│   → Razón: SKIP tiene una razón documentada
│   → Acción: Reportar al humano y pedir confirmación si la razón ya no aplica
├── 20. Iniciar Fase 5 (TRATAR) sin haber escrito diag_*.md
├── 21. Cargar más de 3 skills completos en contexto simultáneamente
├── 22. Ejecutar más de 2 tareas en paralelo sin aprobación humana
├── 23. Modificar código de producción sin haber pasado por Fase 7 (MONITOREAR)
├── 24. Ignorar un resultado de `bc` porque "no parece correcto"
└── 25. Continuar después de un timeout sin escalar

CONDICIONADO:
├── Extraer del container → Solo si Skill 1.3 confirma 0 ciclos (estáticos Y lógicos)
├── Modificar repositorio → Solo si tengo snapshot de datos con método correcto
├── Cambiar formateo en god service → Solo con pdftotext diff = 0 diferencias
├── Consolidar ETL → Solo con dry-run en tabla de prueba + comparación de counts
├── Verificar stat proxy post-cambio → Si tabla >10GB, pedir permiso para ANALYZE
├── Usar graphify query → Solo si el presupuesto de contexto lo permite (>10K tokens libres)
├── Crear archivo >300 líneas → Requiere justificación en diag_*.md de por qué no se puede dividir más
└── Ejecutar SEV-1 → Solo con Skill 17 cargado (nada más)
```

### 8.1 God Services (lista de vigilancia)

| Servicio | Líneas | Output Canónico | Restricción Especial |
|---|---|---|---|
| report_service.py | 1.850 | PDF | pdftotext diff obligatorio |
| executive_report_service.py | 1.618 | PDF ejecutivo | pdftotext diff obligatorio |
| cu_service.py | 1.010 | Datos XM | Mock de XM obligatorio |
| losses_nt_service.py | 1.199 | Cálculos regulatorios | Validación contra cálculo manual |
| simulation_service.py | 748 | Monte Carlo | Seed fijo en tests |
| predictions_service_extended.py | 698 | ML | Fixture de modelo |

---

## SKILL 9: Data State Verification (con física de hardware)

### 9.1 Protocolo de Snapshot — Método por Tamaño de Tabla

PASO 0: SIEMPRE — Obtener el tamaño de la tabla ANTES de elegir método

```sql
SELECT pg_size_pretty(pg_relation_size('nombre_tabla')) AS size,
       pg_relation_size('nombre_tabla') AS size_bytes
FROM (
  SELECT 'nombre_tabla' AS nombre_tabla
) t;
```

RESULTADO DETERMINA EL MÉTODO:
- < 100 MB  → MÉTODO A: Checksum completo (máxima confianza)
- 100MB-1GB → MÉTODO B: Checksum completo con precaución (puede tardar 10-30s)
- 1GB-10GB  → MÉTODO C: Stat proxy + muestreo (NO usar string_agg)
- > 10GB    → MÉTODO D: Stat proxy exclusivo (PROHIBIDO string_agg)

**═══ MÉTODO A: Checksum Completo (< 100MB) ═══**

```sql
SELECT COUNT(*) AS pre_count FROM tabla;

SELECT md5(string_agg(t::text, '' ORDER BY id)) AS pre_checksum
FROM tabla AS t;

SELECT COUNT(*) - COUNT(DISTINCT (col1, col2)) AS pre_dups FROM tabla;
```

**═══ MÉTODO B: Checksum Completo con Precaución (100MB - 1GB) ═══**

(Mismas queries que Método A, pero:
 - Avisar al usuario que puede tardar 10-30 segundos
 - Verificar que no hay otras queries pesadas corriendo:
   SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';
 - Si hay >3 queries activas, esperar a que terminen)

**═══ MÉTODO C: Stat Proxy + Muestreo (1GB - 10GB) ═══**

```sql
-- PROXY 1: Conteo rápido (usa estadísticas del planner, NO escanea la tabla)
SELECT reltuples::bigint AS estimated_count
FROM pg_class WHERE relname = 'nombre_tabla';

-- PROXY 2: Suma proxy (usa pg_stats, NO lee la tabla)
SELECT
  SUM(n_distinct) AS proxy_distinct_values,
  SUM(null_frac) AS proxy_null_fraction
FROM pg_stats
WHERE tablename = 'nombre_tabla'
AND attname IN ('valor', 'fecha', 'metrica');

-- PROXY 3: Muestreo determinista (SINTAXIS POSTGRES NATIVA SEGURA)
SELECT md5(string_agg(t::text, '' ORDER BY id)) AS sample_checksum
FROM nombre_tabla TABLESAMPLE SYSTEM(1.0) AS t
WHERE t.fecha >= CURRENT_DATE - INTERVAL '30 days';

-- NOTA: El sample_checksum NO es comparable contra un checksum completo.
-- Solo es comparable contra OTRO sample_checksum con mismos parámetros.
-- Guardar SIEMPRE los parámetros de sampling en diag_*.md.

-- PROXY 4: Min/Max de fecha (verificar que el rango temporal no cambió)
SELECT MIN(fecha) AS min_fecha, MAX(fecha) AS max_fecha
FROM nombre_tabla;
```

**═══ MÉTODO D: Stat Proxy Exclusivo (> 10GB) ═══**

```sql
-- PROHIBIDO: string_agg, TABLESAMPLE, COUNT(*) exacto
-- (COUNT(*) en 64M filas puede tomar 30-60 segundos y bloquear)

-- ÚNICO: Usar pg_stats (estadísticas del planner)
SELECT
  attname,
  n_distinct,
  null_frac,
  avg_width,
  correlation
FROM pg_stats
WHERE tablename = 'nombre_tabla'
ORDER BY attname;

-- Y rango temporal (query indexada, rápida si hay índice en fecha)
SELECT MIN(fecha) AS min_fecha, MAX(fecha) AS max_fecha
FROM nombre_tabla;

-- GUARDAR TODO en diag_*.md para comparación post-cambio.
```

**═══ VERIFICACIÓN POST-CAMBIO ═══**

USAR EL MISMO MÉTODO que en el snapshot pre-cambio.

⚠️ TRAMPA DE AUTOVACUUM Y RIESGO OPERATIVO (APLICA A MÉTODOS C Y D):
pg_stats NO es tiempo real. Se actualiza tras un ANALYZE.
Si el cambio fue masivo, pg_stats seguirá mostrando el estado PREVIO.

REGLA DE EJECUCIÓN SEGÚN TAMAÑO:
- Si tabla es < 10GB: Ejecutar `ANALYZE nombre_tabla;` automáticamente antes de leer pg_stats.
- Si tabla es > 10GB: PROHIBIDO ejecutar ANALYZE automáticamente. PAUSAR y PEDIR al humano.

Leer diag_*.md para obtener valores pre-cambio. Comparar contra valores post-cambio.

Si hay discrepancia Y el método fue C o D:
- No entrar en pánico. Los stat proxies tienen margen de error.
- Investigar solo si la discrepancia es >10% en n_distinct o >5% en null_frac.
- Confirmar con COUNT(*) si la tabla tiene índice en la columna relevante.

### 9.2 Protocolo para ETLs

1. IDENTIFICAR si corre en Celery Beat:
   ```bash
   grep -r "nombre_etl" /home/admonctrlxm/server/tasks/
   ```
   → Si aparece: RIESGO MÁXIMO

2. EJECUTAR EN TABLA DE PRUEBA:
   ```sql
   CREATE TABLE test_tabla AS SELECT * FROM tabla_real WITH NO DATA;
   ```
   [ejecutar ETL apuntando a test_tabla]

3. COMPARAR (con método correcto para tamaño):
   [Método A/B/C/D según pg_relation_size de test_tabla]

4. IDEMPOTENCIA:
   [Ejecutar ETL de nuevo sobre test_tabla]
   [Mismo resultado = idempotente]

5. RANGOS:
   ```sql
   SELECT MIN(valor), MAX(valor), AVG(valor) FROM test_tabla;
   ```
   [Comparar contra original — diff >5% en AVG → investigar]

6. LIMPIAR:
   ```sql
   DROP TABLE test_tabla;
   ```

7. APLICAR + MONITOREAR:
   [Ejecutar ETL real]
   [Esperar 5 min]
   [Si tabla >10GB: Solicitar permiso para ANALYZE o usar COUNT]
   [Verificar con método correcto]
   [Verificar logs: grep -i "error\|exception" logs/etl.log | tail -20]

### 9.4 Cache de Tamaños de Tabla

Evitar consultar pg_relation_size repetidamente en la misma sesión:

```bash
# Ejecutar UNA VEZ al inicio de la sesión
psql -d portal_energetico -c "
  SELECT relname, pg_relation_size(relid) as bytes
  FROM pg_stat_user_tables
  WHERE schemaname IN ('sector_energetico', 'subsidios', 'presupuesto')
  ORDER BY bytes DESC;
" > /tmp/table_sizes_cache.txt

# Usar el cache en lugar de consultar BD
grep "metrics_hourly" /tmp/table_sizes_cache.txt
```

### 9.5 Paralelización de Verificaciones

Si hay múltiples tablas que verificar (y son tablas diferentes):

```bash
psql -d portal_energetico -c "SELECT COUNT(*) FROM tabla1" &
psql -d portal_energetico -c "SELECT COUNT(*) FROM tabla2" &
wait
```

**RESTRICCIÓN:** Solo paralelizar si ambas tablas son < 1GB. Si alguna es >1GB, ejecutar secuencialmente para no saturar PostgreSQL.

---

### 9.3 Comandos de Data Verification

```bash
# Obtener tamaño de tabla (SIEMPRE primero)
get_table_size() {
  psql -d portal_energetico -c "
    SELECT pg_size_pretty(pg_relation_size('$1')) AS size,
           pg_relation_size('$1') AS bytes
    FROM (SELECT '$1' AS t) x;
  "
}

# Snapshot automático con método correcto
snapshot_tabla() {
  local tabla=$1
  local archivo="/tmp/snapshot_${tabla}_$(date +%Y%m%d_%H%M%S).md"
  local bytes=$(psql -d portal_energetico -t -A -c "SELECT pg_relation_size('$tabla')" | tr -d '[:space:]')

  echo "# Snapshot: $tabla" > "$archivo"
  echo "## Timestamp: $(date)" >> "$archivo"
  echo "## Size bytes: $bytes" >> "$archivo"

  if [ "$bytes" -lt 100000000 ]; then
    echo "## Method: A (full checksum)" >> "$archivo"
    psql -d portal_energetico -c "SELECT COUNT(*) AS count FROM $tabla;" >> "$archivo"
    psql -d portal_energetico -c "SELECT md5(string_agg(t::text, '' ORDER BY id)) AS checksum FROM $tabla AS t;" >> "$archivo"
  elif [ "$bytes" -lt 1000000000 ]; then
    echo "## Method: B (full checksum, slow)" >> "$archivo"
    psql -d portal_energetico -c "SELECT COUNT(*) AS count FROM $tabla;" >> "$archivo"
    psql -d portal_energetico -c "SELECT md5(string_agg(t::text, '' ORDER BY id)) AS checksum FROM $tabla AS t;" >> "$archivo"
  elif [ "$bytes" -lt 10000000000 ]; then
    echo "## Method: C (stat proxy + sampling)" >> "$archivo"
    psql -d portal_energetico -c "SELECT reltuples::bigint AS estimated_count FROM pg_class WHERE relname='$tabla';" >> "$archivo"
    psql -d portal_energetico -c "SELECT attname, n_distinct, null_frac, avg_width FROM pg_stats WHERE tablename='$tabla' ORDER BY attname;" >> "$archivo"
    psql -d portal_energetico -c "SELECT md5(string_agg(t::text, '' ORDER BY id)) AS sample_checksum FROM $tabla TABLESAMPLE SYSTEM(1.0) AS t WHERE t.fecha >= CURRENT_DATE - INTERVAL '30 days';" >> "$archivo"
  else
    echo "## Method: D (stat proxy only)" >> "$archivo"
    psql -d portal_energetico -c "SELECT attname, n_distinct, null_frac, avg_width, correlation FROM pg_stats WHERE tablename='$tabla' ORDER BY attname;" >> "$archivo"
  fi

  echo "Guardado en: $archivo"
}

# Detección de duplicados
check_dups() {
  local tabla=$1
  local cols=$2
  psql -d portal_energetico -c "SELECT COUNT(*) - COUNT(DISTINCT ($cols)) AS dups FROM $tabla;"
}

# Detección de orphans (emulación de FK)
check_orphans() {
  local hija=$1
  local padre=$2
  local col_hija=$3
  local col_padre=$4
  psql -d portal_energetico -c "
    SELECT COUNT(*) AS orphans
    FROM $hija h
    WHERE $col_hija IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM $padre p WHERE p.$col_padre = h.$col_hija);
  "
}
```

---

## SKILL 10: Comandos de Referencia

```bash
# ═══ NIVEL 1: RUNTIME ═══

# Tests
cd /home/admonctrlxm/server && pytest tests/ -q --tb=no
cd /home/admonctrlxm/portal-direccion-mme && npm run build 2>&1 | tail -5

# Health
curl -s http://localhost:8000/health | head -1
curl -s http://localhost:3000/ | head -1

# Datos — Ver tabla de tamaños y métodos en Skill 9.1
# Servicios
pm2 status --no-color
systemctl status api-mme --no-pager | grep "Active"

# ═══ NIVEL 2: AST ═══

# Verificación de datos — Usar método A/B/C/D según tamaño (Skill 9)
# Ciclos — Protocolo completo en Skill 1.3
# Ver detección estática y lógica allí

# ═══ NIVEL 3: INFERENCIA ═══

cat /home/admonctrlxm/server/graphify-out/GRAPH_REPORT.md | head -80

# ═══ PERSISTENCIA ═══

# Ver formato exacto en META-SKILL 0 → Formato de diag_[TAREA].md

# ═══ BACKUP ═══

git add -A && git commit -m "chore: pre-refactor snapshot" && git push

sudo cp /etc/systemd/system/nombre.service /tmp/nombre.service.bak

pg_dump -d portal_energetico --schema-only > /tmp/schema_$(date +%Y%m%d).sql

# ═══ PDF DIFF (NO binario) ═══

pdftotext baseline.pdf /tmp/baseline.txt
pdftotext refactor.pdf /tmp/refactor.txt
diff /tmp/baseline.txt /tmp/refactor.txt
```

---

## SKILL 11: Higiene Documental (Anti-Garbage .md)

### 11.1 El Problema

Los agentes de IA tienden a crear archivos .md como mecanismo de descarga cognitiva. ESTO ES BASURA DOCUMENTAL. DEBE DETENERSE.

### 11.2 Test de Necesidad de Creación de .md

ANTES de crear CUALQUIER archivo .md, el agente DEBE pasar este test:

PREGUNTA 1: ¿Existe ya un archivo que contenga esta información?
- SÍ → NO crear. Actualizar el existente.
- NO → Ir a Pregunta 2

PREGUNTA 2: ¿Esta información será relevante dentro de 1 semana?
- NO → NO crear. Es basura temporal. Usar /tmp/ si necesitas persistir durante la sesión actual.
- SÍ → Ir a Pregunta 3

PREGUNTA 3: ¿Esta información es del estado ACTUAL del proyecto?
- NO (es histórico, análisis, opinión) → NO crear como .md permanente. Usar commit messages o /tmp/.
- SÍ → Ir a Pregunta 4

PREGUNTA 4: ¿Un desarrollador que no fue parte de esta sesión la necesitaría para hacer su trabajo?
- NO → NO crear. Es contexto de sesión, no documentación de proyecto.
- SÍ → Ir a Pregunta 5

PREGUNTA 5: ¿Qué categoría es?
- ESTADO ACTUAL del proyecto → Crear/actualizar en ubicación canónica
- PROCEDIMIENTO que otros deben seguir → Crear en docs/ o AGENTS.md
- ARQUITECTURA o diseño → Crear/actualizar en docs/
- PROPUESTA o plan futuro → Crear en docs/ con fecha de vencimiento
- Otra cosa → NO crear. Es basura.

SI NO PASA LAS 5 PREGUNTAS → NO CREAR EL ARCHIVO.

### 11.3 Ubicación Canónica de Documentación (NO inventar rutas)

```
/home/admonctrlxm/server/
├── README.md                    # Estado actual del backend
├── AGENTS.md                    # Reglas para agentes
├── docs/
│   ├── ARCHITECTURE.md          # Arquitectura actual
│   ├── API_CONTRACTS.md         # Contratos de API
│   ├── PROCEDURES.md            # Procedimientos operativos
│   └── ADRs/                    # Architecture Decision Records
└── [NO otros .md fuera de estas ubicaciones]

/home/admonctrlxm/portal-direccion-mme/
├── README.md                    # Estado actual del frontend
├── AGENTS.md                    # Reglas para agentes
└── [NO otros .md fuera de estas ubicaciones]

/tmp/                            # BASURA TEMPORAL (se limpia solo)
├── diag_[tarea].md              # Contexto de sesión
├── snapshot_[tabla]_*.md        # Data snapshots
└── [cualquier cosa temporal]     # NO va al repo
```

### 11.4 Reglas de Mantenimiento Documental

AL INICIO DE CADA SESIÓN:
1. ESCANEAR basura documental con find.
2. VERIFICAR obsolescencia de .md en docs/.

AL FINAL DE CADA SESIÓN:
3. LIMPIAR /tmp/ (solo conservar si falló).
4. ACTUALIZAR AGENTS.md y docs/ si hubo cambio arquitectónico.

DURANTE CADA SESIÓN:
5. NUNCA crear .md como "notas" o "apuntes".
6. NUNCA crear .md de "hallazgos" o "análisis".

### 11.5 Formato de .md Canónico

Ver formato en SKILL_PACK_V5.0.md → META-SKILL 0 → Formato de diag_[TAREA].md.

### 11.6 Señales de Basura Documental (eliminar inmediatamente)

ELIMINAR SIN LEER COMPLETO si el archivo:
- Se llama "notas_*.md", "apuntes_*.md", "hallazgos_*.md", "investigación_*.md"
- Se llama "temp_*.md", "tmp_*.md", "draft_*.md" y está fuera de /tmp/
- Tiene fecha en el nombre
- No tiene sección de "Propósito" o "Última actualización"
- Fue creado hace >2 semanas y no se ha modificado desde
- Contiene principalmente output de comandos
- Se duplica con otro archivo (diff muestra >80% similitud)
- Menciona archivos o rutas que ya no existen
- Un humano nunca lo ha leído

---

## SKILL 12: Rollback Granular

### Nivel 1-5 de Rollback (ejecutar en orden, parar cuando funcione)

**NIVEL 1 — Revertir último commit:**
```bash
git revert HEAD --no-edit
npm run build  # o pytest según el proyecto
```
¿Funcionó? → SÍ: fin. NO: ir a Nivel 2

**NIVEL 2 — Revertir a baseline pre-tarea:**
```bash
git log --oneline -10  # encontrar el commit del baseline
git revert [hash_baseline]..HEAD --no-commit  # revertir rango
git commit -m "rollback: revert to pre-task baseline"
npm run build
```
¿Funcionó? → SÍ: fin. NO: ir a Nivel 3

**NIVEL 3 — Restaurar archivos específicos:**
```bash
# Si sabes qué archivos están rotos
git checkout [hash_baseline] -- path/to/file1.ts path/to/file2.ts
npm run build
```
¿Funcionó? → SÍ: fin. NO: ir a Nivel 4

**NIVEL 4 — Rebuild limpio:**
```bash
# Frontend
rm -rf .next/
npm run build
pm2 restart portal-mme

# Backend
find . -type d -name __pycache__ -exec rm -rf {} +
pm2 restart api-mme  # o systemctl restart api-mme
```
¿Funcionó? → SÍ: fin. NO: ir a Nivel 5

**NIVEL 5 — ESCALAR AL HUMANO:**
NO intentar más. El estado actual es:
- Último commit exitoso conocido: [hash del baseline]
- Archivos modificados desde entonces: [lista]
- Error actual: [output del build/test]
- Pedir al humano que haga `git reset --hard [hash_baseline]` manualmente

### Rollback de Datos (si se tocó DB)

- Si se ejecutó Método A/B (checksum): verificar checksum post-rollback
- Si se ejecutó Método C/D (stat proxy): verificar proxies post-rollback
- Si los datos no coinciden: usar pg_dump previo (Skill 8.7 obligó a tener uno)
- Si no hay pg_dump y los datos no coinciden: **ESCALAR AL HUMANO inmediatamente**

### Rollback de Servicios

- Si se tocó .service: `cp /tmp/nombre.service.bak /etc/systemd/system/nombre.service`
- Si se tocó PM2: `pm2 stop portal-mme && pm2 delete portal-mme && pm2 start ecosystem.config.js`
- Si se tocó Nginx: `sudo nginx -t && sudo systemctl reload nginx`
- Verificar con `systemctl status` / `pm2 status` después de CADA paso

### Qué Hacer si el Baseline no Existe

1. Buscar en git log el último commit con mensaje "chore: pre-refactor snapshot" o "baseline"
2. Si existe: usar ese hash como baseline
3. Si no existe: buscar en git log el commit anterior al primer commit de la tarea
4. Si no se puede determinar: **ESCALAR AL HUMANO** con `git log --oneline -20`

---

## Señales de ALTO

🚨 SEÑALES DE ALTO ABSOLUTAS:

**CÓDIGO:**
1. No puedo leer el archivo completo antes de editarlo
2. grep muestra >10 archivos importando lo que voy a modificar
3. El cambio afecta un servicio >1000 líneas
4. Voy a crear un archivo resultado >500 líneas
5. No hay tests para lo que voy a cambiar Y afecta infrastructure/

**DATOS:**
6. Voy a tocar infrastructure/database/ o etl/
7. No sé el tamaño de la tabla que afecta (pg_relation_size)
8. No hay FK entre la tabla que toco y sus dependientes
9. El ETL que modifico se ejecuta en Celery Beat
10. La tabla afectada es >1GB y no tengo stat proxy

**OPERATIVO:**
11. No hay commit reciente (<1 hora) y el cambio es >3 archivos
12. Multi-equipo (bot compartido)
13. El cambio afecta un .service de systemd

**DOCUMENTAL:**
14. Voy a crear un archivo .md
    → ¿Es realmente necesario? ¿Qué información aporta que no existe en ningún otro lado? ¿Sobrevivirá más de 1 semana?

Si se activa CUALQUIERA de las señales 6-10 → PAUSAR Y OBTENER:
- `SELECT pg_relation_size('tabla');` → saber el tamaño
- Stat proxy si >1GB
- Última ejecución del ETL si aplica

---

## ANEXO A: Plantilla de Plan de Refactorización

```markdown
# Plan: [Nombre]

## Metadatos
- **Fecha**: YYYY-MM-DD
- **Riesgo**: P = echo "[factores]" | bc -l = [resultado real del sistema] → [NIVEL]
- **Confianza**: [0.0-1.0] — Fuentes: [lista con pesos]
- **Esfuerzo**: [Xh] = nominal × riesgo (vía bc) + verificación [Xh] + entropía [Xh]
- **Aprobación**: [SÍ/NO]
- **Archivo diagnóstico**: diag_[tarea].md

## Diagnóstico
### Enfermedad
[Ciclo estático / Ciclo lógico / God Service / Data Ghost / ETL Drift / DOM Entropy]

### Evidencia (Nivel 1)
```bash
[output real]
```

### Ciclos (si aplica)
| Tipo | Servicios | Dirección | Método de ruptura |
|---|---|---|---|
| [Estático/Lógico] | [A, B] | [A→B→A] | [Interfaz: IXxxProvider] |

## Tablas Afectadas
| Tabla | Size | Método | Valores Pre |
|---|---|---|---|
| [t] | [pretty/bytes] | [A/B/C/D] | [de diag_*.md] |

## Pasos

### Fase 0: Diagnóstico
- [ ] Baseline ejecutado
- [ ] Ciclos detectados (estáticos + lógicos)
- [ ] Riesgo calculado (output de `bc` guardado)
- [ ] diag_[tarea].md escrito

### Fase 0.5b: Ciclos (si aplica)
- [ ] Interfaz creada
- [ ] Servicio modificado
- [ ] Verificado: python -c + grep container.py
- [ ] Commit: [hash]
- [ ] diag_*.md actualizado

### Fase 1: Preparación
- [ ] Git snapshot: [hash]
- [ ] Data snapshot: [método usado]
- [ ] Archivos nuevos: [lista, ninguno >500 líneas]

### Fase 2: Migración
- [ ] Consumidor 1 migrado → verificado → commit
- [ ] Consumidor 2 migrado → verificado → commit
- [ ] ...

### Fase 3: Limpieza
- [ ] LEER diag_*.md para obtener baseline
- [ ] Tests pasan (vs baseline): SÍ/NO
- [ ] Datos coinciden (vs baseline): SÍ/NO
- [ ] Código viejo eliminado
- [ ] diag_*.md limpiado (éxito) o conservado (fallo)

## Verificación Final
```bash
[comandos]
```

## Rollback
1. git revert [hash]
2. [otros pasos]
```

---

## ANEXO B: Ejemplo Completo de Ejecución del CDA

**Escenario:** Se detectó que HomeSlider.tsx tiene un bug en el formateador fmtCOP que muestra valores negativos sin paréntesis.

═══ FASE 0: CONTEXTUALIZAR ═══
[2026-05-02 10:00:01]
```bash
grep -n "fmtCOP\|HomeSlider\|formateador" PROPUESTA_MAESTRA.md
```
→ Coincide con DT-002 "HomeSlider.tsx god component"
→ DT-002 es Crítica → Riesgo_base = 5.0
→ Estado: Sin marcar (no está DONE/PAUSED/SKIP)
→ Registrar en /tmp/diag_fmtcop_fix.md

═══ FASE 1: OBSERVAR ═══
[2026-05-02 10:00:05]

Baseline de código:
```bash
$ cd /home/admonctrlxm/portal-direccion-mme && npm run build 2>&1 | tail -5
  ▲ Next.js 16.2.1
  ✓ Compiled successfully
  ✓ Linting and checking validity of types
  ✓ Collecting page data
  ✓ Generating static pages
  ✓ Finalizing page optimization
```
→ Build: OK

Baseline de servicio:
```bash
$ curl -s http://localhost:3000/ | head -1
<!DOCTYPE html><html>
```
→ Portal: OK

Baseline de datos: No aplica (es cambio de UI puro, no toca DB)

[Timeout Fase 1: 45 segundos de 10 minutos — OK]

═══ FASE 2: PALPAR ═══
[2026-05-02 10:00:52]

```bash
$ grep -n "fmtCOP" src/components/HomeSlider.tsx -B2 -A5
  42 | const fmtCOP = (value: number): string => {
  43 |   if (value < 0) return `-$${Math.abs(value).toLocaleString()}`;
  44 |   return `$${value.toLocaleString()}`;
  45 | };
```
→ Encontrado en línea 42-45. El bug es claro: no usa paréntesis para negativos.

```bash
$ grep -rn "fmtCOP" src/ --include="*.ts" --include="*.tsx" -B2 -A5
  src/components/HomeSlider.tsx:42:  (definición)
  src/components/HomeSlider.tsx:156:  (uso en KPI)
  src/components/HomeSlider.tsx:289:  (uso en KPI)
  src/components/HomeSlider.tsx:412:  (uso en KPI)
  src/components/HomeSlider.tsx:787:  (uso en slide)
```
→ Solo se usa en HomeSlider.tsx (5 veces). No hay otros consumidores.

```bash
$ grep -rn "fmtCOP\|fmtNum\|fmtFull" src/lib/ --include="*.ts"
  (vacío)
```
→ Los formateadores NO existen en src/lib/. Están embebidos en el componente.
→ Esto confirma DT-002: los formateadores deberían estar en src/lib/format.ts

Peso_Acumulado: grep confirma (0.30) + build pasa (0.35) = 0.65
→ 0.65 está en rango 0.5-0.69 → EJECUTAR + verificación extra en Fase 7

[Timeout Fase 2: 12 segundos de 15 minutos — OK]

═══ FASE 3: MAPEAR ═══
[2026-05-02 10:01:05]

OMITIDA. Ya tengo confirmación directa de Fase 2 (grep con contexto).
El grafo no aportaría información adicional para un cambio de 1 línea.

═══ FASE 4: DIAGNOSTICAR ═══
[2026-05-02 10:01:08]

Síntoma: Valores negativos en COP se muestran como "-$123" en lugar de "($123)"
Causa: fmtCOP en línea 43 usa concatenación literal en lugar de formato contable
Tratamiento: Cambiar línea 43 a `return \`($${Math.abs(value).toLocaleString()})\`;`

DECISIÓN: No extraer a src/lib/format.ts ahora. Razón:
- Esa es la tarea DT-002 completa (3-5 días estimados)
- Esta tarea es solo el fix del bug (1 línea)
- Hacer la extracción completa ahora sería Scope Creep
- Registrar como nota: "La extracción de formateadores (DT-002) sigue pendiente"

[Timeout Fase 4: 8 segundos de 20 minutos — OK]

═══ FASE 5: TRATAR ═══
[2026-05-02 10:01:18]

Cambio:
- Archivo: src/components/HomeSlider.tsx
- Línea 43: cambiar `-$${...}` a `($${...})`
- Archivos afectados: 1
- Líneas cambiadas: 1

Riesgo calculado:
```bash
$ echo "1.0 * 1.3" | bc -l
1.3
```
(Producción activa × sin tests unitarios para este componente... pero es 1 línea y el cambio es determinista)
→ 1.3 < 2.5 → Verde. Ejecutar.

Git:
```bash
git add src/components/HomeSlider.tsx
git commit -m "fix: fmtCOP muestra valores negativos con paréntesis (contable)"
```

[Timeout Fase 5: 15 segundos — OK]

═══ FASE 6: PERSISTIR ═══
[2026-05-02 10:01:35]

Escribir /tmp/diag_fmtcop_fix.md con TODO lo anterior.

═══ FASE 7: MONITOREAR ═══
[2026-05-02 10:01:40]

PASO 1: Leer /tmp/diag_fmtcop_fix.md
PASO 2: Re-ejecutar Fase 1
```bash
$ npm run build 2>&1 | tail -5
  ▲ Next.js 16.2.1
  ✓ Compiled successfully
  ...
```
→ Build: OK (coincide con baseline)

PASO 3: Comparar
```bash
diff /tmp/baseline_build.txt /tmp/post_build.txt
```
→ Sin diferencias

PASO 5: Decisión
→ TODO coincide → El tratamiento funcionó. ✅

PASO 6: Limpiar
```bash
rm /tmp/diag_fmtcop_fix.md /tmp/baseline_build.txt /tmp/post_build.txt
```

═══ FIN CDA ═══
Tiempo total: 1 minuto 39 segundos

**CONTENIDO DE /tmp/diag_fmtcop_fix.md:**
```markdown
# Diagnóstico: fmtCOP fix valores negativos
## Timestamp
2026-05-02 10:00:01

## Contexto (Fase 0)
- DT-XXX: DT-002
- Clasificación: Crítica
- Riesgo_base: 5.0
- Estado en roadmap: Sin marcar

## Baseline Pre-Intervención
### Tests
- pytest: N/A (frontend)
- npm build: ✓ Compiled successfully (5 líneas de output OK)

### Datos
N/A (cambio de UI puro)

### Health
- Portal: <!DOCTYPE html><html> (OK)
- API: No verificado (no aplica)

## Diagnóstico (Fase 4)
- Síntoma: Valores negativos en COP sin paréntesis
- Causa: Línea 43 de HomeSlider.tsx usa "-$" en lugar de "($...)"
- Confianza: 0.95 (grep directo + lectura del código)

## Archivos Afectados
- src/components/HomeSlider.tsx (línea 43)

## Decisión Tomada
- Cambiar 1 línea en HomeSlider.tsx
- NO extraer formateadores a src/lib/ (es DT-002 completo, no esta tarea)
- Riesgo calculado: echo "1.0 * 1.3" | bc -l = 1.3 → Verde

## Rollback
- git revert HEAD (si algo falla)
- Nivel máximo necesario: 1 (revertir último commit)

## Resultado (Fase 7)
- Build post: ✓ Compiled successfully
- Diferencias vs baseline: 0
- Estado: ✅ ÉXITO
```

---

## ANEXO C: Métricas de Efectividad del Agente

Registrar al final de cada sesión de trabajo (o cada viernes):

### Métricas de Sesión

| Métrica | Valor | Target | Semana anterior |
|---|---|---|---|
| Tareas completadas (CDA fin → ✅) | X | — | X |
| Tareas con rollback | Y | <10% del total | Y |
| Tareas escaladas al humano | Z | <20% del total | Z |
| Tiempo promedio CDA (min) | T | <45 | T |
| Fases que excedieron timeout | W | 0 | W |
| Baselines perdidos (/tmp limpiado) | V | 0 | V |
| Falsos positivos Graphify | F | — | F |
| Skills en conflicto detectados | C | — | C |

### Tendencias (evaluar cada mes)

- Si rollback >15% dos semanas seguidas: revisar Skill 2.1 (cálculo de riesgo está subestimando) o Skill 0 (diagnóstico es incorrecto)
- Si escaladas >30%: revisar si el skill pack es demasiado conservador o si faltan herramientas de verificación
- Si falsos positivos Graphify >5 por semana: aumentar umbral de desconfianza de INFERRED (actualmente 0.08, considerar bajar a 0.05)
- Si tiempo promedio CDA >60 min: revisar qué fases están tomando más tiempo y optimizar los comandos o reducir el alcance

### Formato de Registro

Crear `/tmp/metrics_YYYY-MM-DD.md` al final de cada sesión con las métricas.
NO agregar al repo. Es para análisis del humano, no documentación de proyecto.

---

## META-SKILL -2: Optimización de Contexto del Agente

### -2.1 Presupuesto de Contexto por Tarea

Regla: El agente tiene máximo 50K tokens de contexto útil. Distribuir estratégicamente:

| Componente | Tokens | Justificación |
|---|---|---|
| Código actual (archivos afectados) | 40% | Es lo que se está modificando |
| diag_*.md (baseline) | 20% | Es lo que se está comparando |
| Skills relevantes (solo los necesarios) | 20% | Es lo que guía la decisión |
| AGENTS.md (solo reglas aplicables) | 10% | Es lo que restringe la acción |
| Grafo (solo si es navegación) | 10% | Es lo que orienta |

**PROHIBIDO:** Cargar el SKILL_PACK completo para una tarea simple.

### -2.2 Selección Dinámica de Skills

```
INICIO TAREA
    │
    ▼
¿Es emergencia (SEV-1/2)?
    ├── SÍ → Cargar SOLO Skill 17 (Emergencia)
    │
    └── NO → ¿Es refactorización?
              ├── SÍ → Cargar Skill 2 (Refactor) + Skill 1.3 (Ciclos)
              │
              └── NO → ¿Toca datos DB?
                        ├── SÍ → Cargar Skill 9 (Data Verification)
                        │
                        └── NO → ¿Es investigación?
                                  ├── SÍ → Cargar Skill 1 (Investigación)
                                  │
                                  └── NO → Cargar Skill 0 (CDA genérico)
```

### -2.3 Compresión de Contexto

Antes de iniciar Fase 5 (TRATAR):

```bash
# Extraer solo las líneas relevantes del código
grep -n "función_afectada\|clase_afectada" archivo.py -A20 -B5 > /tmp/relevant_code.txt

# Extraer solo las métricas relevantes del baseline
grep -E "COUNT|checksum|size" diag_*.md > /tmp/relevant_baseline.txt

# Usar ESTOS archivos comprimidos en lugar de los completos
```

### -2.4 Checkpoint de Progreso

Cada 15 minutos de trabajo continuo:

```bash
# Guardar estado intermedio
echo "## Checkpoint $(date)" >> /tmp/diag_[tarea]_progress.md
echo "- Fase actual: [X]" >> /tmp/diag_[tarea]_progress.md
echo "- Archivos modificados: [lista]" >> /tmp/diag_[tarea]_progress.md
echo "- Próximo paso: [qué sigue]" >> /tmp/diag_[tarea]_progress.md

# Si el agente se reinicia, puede continuar desde aquí
```

---

## SKILL 13: Sistema de Retroalimentación y Aprendizaje

### 13.1 Registro de Decisiones con Outcome

Formato obligatorio en cada diag_*.md (completar DESPUÉS de Fase 7):

```markdown
## Outcome (completar DESPUÉS de verificación)
- Decisión: [qué se hizo]
- Resultado: [EXITOSO / FALLIDO / PARCIAL]
- Tiempo real vs estimado: [Xh vs Yh] (ratio: Z)
- Sorpresas: [algo no previsto que ocurrió]
- Lección: [qué haría diferente]
```

### 13.2 Base de Conocimiento de Errores Comunes

Ubicación: `/home/admonctrlxm/portal-direccion-mme/.knowledge/errors.md`

Formato:

```markdown
## Error: [Título]
- Fecha: YYYY-MM-DD
- Contexto: [qué se estaba haciendo]
- Síntoma: [qué falló]
- Causa raíz: [por qué falló]
- Prevención: [cómo evitarlo en el futuro]
- Peso en Jerarquía de Verdad: [ajustar si aplica]
```

**REGLA:** Después de CADA tarea con resultado FALLIDO o PARCIAL, crear o actualizar una entrada en `.knowledge/errors.md`.

### 13.3 Ajuste Dinámico de Pesos

Cada 10 tareas completadas, ejecutar:

```bash
# Contar aciertos por nivel de confianza
grep -r "Resultado: EXITOSO" /tmp/diag_*.md 2>/dev/null | wc -l
grep -r "Resultado: FALLIDO" /tmp/diag_*.md 2>/dev/null | wc -l

# Si ratio de éxito < 70% en rango 0.3-0.49 → elevar umbral de investigación
# Si ratio de éxito > 95% en rango ≥ 0.7 → confirmar que el umbral es correcto
```

**Nota:** El ajuste de pesos requiere aprobación humana. El agente solo puede RECOMENDAR ajustes, no aplicarlos.

---

## SKILL 14: Patrones de Dominio Energético

> ⚠️ **ESTADO:** Los archivos referenciados en este skill (`xm-metric-service.ts`,
> `regulatory-calculator.ts`, `KPIWithDegradedMode.tsx`) son **PATRONES OBJETIVO**,
> no código existente. NO intentar importarlos. Usar este skill como guía para
> **CUANDO** se implementen (Fase 2 del roadmap). Para el código actual, los datos XM
> se consumen vía `backendGet()` en API routes o `getPool()` directo.

### 14.1 Patrón: Métrica XM con Fallback

Contexto: La API de XM (mercado eléctrico colombiano) es inestable.

Patrón obligatorio:

```typescript
// src/services/xm-metric-service.ts
export async function getXMMetricWithFallback(
  metricType: XM_metric_type,
  date: Date,
  fallbackStrategy: 'cache' | 'proxy' | 'estimated'
): Promise<MetricData> {
  // 1. Intentar API real (timeout 5s)
  // 2. Si falla → fallback según estrategia
  // 3. Si todo falla → retornar dato estampado con quality='LOW'
  // 4. Registrar en log de calidad de datos
}
```

**REGLA:** Todo consumo de XM en el frontend debe pasar por este servicio. NO llamar a XM directamente desde componentes.

### 14.2 Patrón: Cálculo Regulatorio Inmutable

Contexto: Cálculos como pérdidas NT, costo unitario, subsidios tienen fórmulas regulatorias que NO deben cambiar sin aprobación.

```typescript
// src/services/regulatory-calculator.ts
export class RegulatoryCalculator {
  // Cada fórmula tiene:
  // - Referencia a resolución CREG/SSPD
  // - Versión de la fórmula (para auditoría)
  // - Test de regresión con valores de referencia
  // - Hash del cálculo para detectar cambios silenciosos

  calculateLossesNT(params: LossesParams): LossesResult {
    const result = this._formula_v2024_001(params);
    result.formulaVersion = 'CREG-097-2024';
    result.calculationHash = this._hashCalculation(params, result);
    return result;
  }
}
```

**REGLA:** Si un cálculo regulatorio se modifica, el hash debe cambiar y los tests de regresión deben fallar hasta que se actualicen los valores de referencia.

### 14.3 Patrón: Dashboard con Modo Degradado

Contexto: Si un KPI crítico no tiene datos, el dashboard NO debe mostrar error. Debe mostrar modo degradado.

```typescript
// src/components/kpi/KPIWithDegradedMode.tsx
export function KPIWithDegradedMode({ data, fallback, quality }) {
  if (quality === 'LOW') {
    return <DegradedKPI value={data} warning="Datos estimados" />;
  }
  if (!data) {
    return <FallbackKPI {...fallback} />;
  }
  return <NormalKPI value={data} />;
}
```

**REGLA:** Ningún dashboard puede lanzar error 500 por falta de datos. Siempre debe haber un fallback visual.

### 14.4 Catálogo de Fuentes de Datos con SLA

Ubicación: `/home/admonctrlxm/portal-direccion-mme/.knowledge/data-sources.md`

```markdown
| Fuente | SLA | Frecuencia real | Fallback | Owner |
|---|---|---|---|---|
| XM API | 99% | Cada 6h | Cache 24h | Equipo XM |
| IDEAM | 95% | Diaria | NASA POWER | IDEAM |
| OneDrive | 90% | Manual | Último archivo | MME |
| PostgreSQL | 99.9% | Tiempo real | Dashboard offline | DBA |
```

**REGLA:** Antes de reportar "datos faltantes", verificar si la fuente está dentro de su SLA esperado.

---

## SKILL 15: Testing por Riesgo y Dominio

### 15.1 Matriz de Cobertura Obligatoria

| Tipo de componente | Riesgo base | Tests obligatorios | Ejemplo |
|---|---|---|---|
| API Route con SQL directo | Alto | +1 test de inyección SQL | `/api/subsidios/validaciones` |
| Componente con Nivo | Medio | +1 test de snapshot visual | `BarChart.tsx` |
| Servicio con cálculo regulatorio | Crítico | +1 test con valores de referencia CREG | `losses_nt_service.py` |
| ETL en Celery Beat | Crítico | +1 test de idempotencia + 1 de rollback | `etl_todas_metricas_xm.py` |
| Formateador (lib/) | Bajo | 0 obligatorios (opcional) | `format.ts` |

### 15.2 Valores de Referencia Regulatorios

Ubicación: `/home/admonctrlxm/portal-direccion-mme/.knowledge/regulatory-fixtures/`

```json
// losses_nt_fixture_2024.json
{
  "input": {...},
  "expected_output": {...},
  "resolution": "CREG-097-2024",
  "last_validated": "2024-03-15",
  "validated_by": "Equipo regulatorio MME"
}
```

**REGLA:** Si un cálculo regulatorio cambia de output sin que cambie el input o la resolución, es una REGRESIÓN CRÍTICA. Escalar inmediatamente.

### 15.3 Protocolo de Regresión Visual para HomeSlider

```bash
# ANTES de cualquier cambio en HomeSlider o KPIs
npm run build

# Generar screenshots de referencia (requiere playwright)
npx playwright screenshot http://localhost:3000/ /tmp/baseline_home.png

# DESPUÉS del cambio
npx playwright screenshot http://localhost:3000/ /tmp/post_home.png

# Comparar (permite 2% de diferencia por anti-aliasing)
npx pixelmatch /tmp/baseline_home.png /tmp/post_home.png /tmp/diff.png 0.02

# Si diff.png tiene contenido → REGRESIÓN VISUAL DETECTADA
```

**Nota:** Si `playwright` no está instalado, usar alternativa con `puppeteer` o screenshot manual con verificación humana.

### 15.4 Tests de Carga para APIs Críticas

Solo para endpoints que manejan >10K requests/día:

```bash
# Ejecutar ANTES de deploy si se modificó la API
k6 run --vus 50 --duration 30s tests/load/api-sector.js
# Threshold: p95 < 500ms
```

**REGLA:** Si no hay tests de carga configurados, crear un ticket (no bloquear el deploy, pero documentar la deuda técnica).

---

## SKILL 16: Gates de Calidad CI/CD

> **DEPENDENCIAS (verificar antes de usar):**
> - `husky` → `npx husky --version` (si no existe: los pre-commit hooks son manuales)
> - `playwright` → `npx playwright --version` (si no existe: usar `curl` para verificación visual)
> - `k6` → `k6 version` (si no existe: los tests de carga se omiten)
> - Si ninguna está instalada: los gates se reducen a `npm run build` + `npx tsc --noEmit`

### 16.1 Pre-commit Hooks Obligatorios

Ubicación: `.husky/pre-commit`

```bash
#!/bin/bash
# 1. Verificar que NO se modificó HomeSlider.tsx sin plan
if git diff --cached --name-only | grep -q "HomeSlider.tsx"; then
  if [ ! -f "/tmp/diag_homeslider_*.md" ]; then
    echo "ERROR: HomeSlider.tsx modificado sin archivo de diagnóstico"
    exit 1
  fi
fi

# 2. Verificar que NO se tocó core/container.py directamente
if git diff --cached --name-only | grep -q "core/container.py"; then
  echo "ERROR: core/container.py modificado directamente (usar container/)"
  exit 1
fi

# 3. Build de Next.js
cd /home/admonctrlxm/portal-direccion-mme
npm run build
if [ $? -ne 0 ]; then
  echo "ERROR: Build falló"
  exit 1
fi
```

**REGLA:** Los hooks pre-commit deben ejecutar en < 2 minutos. Si tardan más, son demasiado pesados y deben simplificarse.

### 16.2 PR Checklist Automático

Ubicación: `.github/pull_request_template.md`

```markdown
## Checklist Automático (ejecutado por CI)
- [ ] `npm run build` pasa
- [ ] `npx tsc --noEmit` sin errores
- [ ] No hay modificaciones a god files sin plan
- [ ] No hay secrets en NEXT_PUBLIC_*
- [ ] Archivos nuevos < 500 líneas
- [ ] Si afecta DB: snapshot con método correcto adjunto

## Checklist Manual (requerido para merge)
- [ ] diag_*.md creado si aplica
- [ ] Verificación visual si afecta UI
- [ ] Tests de regresión si afecta cálculos regulatorios
```

### 16.3 Deploy Gates por Severidad

| Tipo de cambio | Gate adicional | Ejemplo |
|---|---|---|
| Cosmético (CSS) | Build OK | Cambio de color |
| Componente nuevo | Build + Test visual | Nuevo KPI |
| API Route | Build + curl a endpoints | Nuevo endpoint |
| ETL | Build + dry-run en test | Modificar ETL XM |
| DB Schema | Build + pg_dump previo + aprobación | Nueva tabla |

---

## SKILL 17: Protocolo de Emergencia

### 17.1 Clasificación de Emergencias

| Nivel | Definición | Ejemplo | Response Time |
|---|---|---|---|
| SEV-1 | Portal caído o datos corruptos visibles | Home en blanco, KPIs negativos | <15 min |
| SEV-2 | Un dashboard no carga | Presupuesto sin datos | <1 hora |
| SEV-3 | Funcionalidad degradada | Gráfica sin últimos datos | <4 horas |
| SEV-4 | Issue cosmético | Color incorrecto | Next sprint |

### 17.2 Protocolo SEV-1 (Portal Caído)

```bash
# MINUTO 0-5: Diagnóstico rápido
pm2 status | grep portal
curl -sI https://portaldireccionee.minenergia.gov.co | head -1
pm2 logs portal-mme --lines 50 --nostream

# MINUTO 5-10: Rollback si es cambio reciente
git log --oneline -5
# Si último commit es de hoy <2h → git revert
git revert HEAD
npm run build && pm2 restart portal-mme

# MINUTO 10-15: Verificar y escalar si persiste
curl -s http://localhost:3000/ | head -1
# Si sigue caído → ESCALAR A HUMANO con:
# - Timestamp
# - Último commit exitoso
# - Logs relevantes
# - Comandos ejecutados
```

**REGLA:** En SEV-1, NO investigar la causa raíz. Primero restaurar servicio, luego investigar.

### 17.3 Comunicación de Emergencia

Formato obligatorio:

```markdown
## 🚨 SEV-[N]: [Título]
- Hora inicio: HH:MM
- Síntoma: [qué ve el usuario]
- Impacto: [quién afectado, qué dashboards]
- Acciones tomadas: [lista con timestamps]
- Estado: [INVESTIGANDO / MITIGANDO / RESUELTO / ESCALADO]
- Próximo paso: [qué sigue]
- Necesito: [ayuda humana, acceso, etc.]
```

### 17.4 Post-Mortem Obligatorio

Si SEV-1 o SEV-2:

```markdown
## Post-Mortem: [Fecha]
- Resumen: [1 párrafo]
- Timeline: [con timestamps exactos]
- Causa raíz (5 Whys): [lista]
- Acciones correctivas: [con DT-XXX asignados]
- Lecciones: [para .knowledge/errors.md]
- Métricas: [tiempo de resolución, usuarios afectados]
```

**REGLA:** El post-mortem se escribe dentro de 24h del incidente. Si no se escribe, la tarea de emergencia NO se considera cerrada.

---

*Skill Pack V5.0 — "Field Medic Framework"*
*Portal Dirección MME Frontend + Backend Reference*
*Versión: 5.0 — Triage + Timeouts + Rollback + Resolución de Conflictos + Optimización de Contexto + Retroalimentación + Dominio Energético + Testing + CI/CD + Emergencias*
*Generado: 2026-05-02*

---

## ANEXO A: Contexto Específico del Proyecto Portal Dirección MME

### A.1 Tablas Críticas y Métodos Forzados

**ESTE PROYECTO USA POSTGRESQL CON RESTRICCIÓN CRÍTICA: Una tabla única, `metrics_hourly` (32GB), fuerza el uso de MÉTODO D para TODAS las verificaciones de datos que la toquen.**

| Tabla | Esquema | Tamaño | Registros | Método Obligatorio | Notas |
|---|---|---|---|---|---|
| **metrics_hourly** | sector_energetico | 32 GB | 64M+ | **D SOLO** | PROHIBIDO COUNT exacto, PROHIBIDO string_agg. Solo stat proxy. ANALYZE requiere permiso humano. |
| metrics | sector_energetico | 1.4 GB | 12M | C (puede ser B si urgencia) | TABLESAMPLE + ANALYZE permitido. |
| embalses | sector_energetico | <100 MB | 7K | A (checksum completo) | Pequeña. COUNT + checksum rápidos. |
| subsidios (resumen) | subsidios | <100 MB | 50K | A | Pequeña. Verificación rápida. |
| presupuesto | presupuesto | <50 MB | 5K | A | Muy pequeña. |
| Other (<10 MB) | public, subsidios, presupuesto, comunidades, contratos_or, supervision, fenoge | <300 MB total | Variable | A | Combinadas no superan 100 MB. |

**REGLA DE IMPLEMENTACIÓN SKILL 9:** Si un agente va a modificar código que toque `metrics_hourly`, DEBE elegir MÉTODO D. Si intenta usar MÉTODO A/B/C, es error operativo.

**COMANDO PARA VERIFICAR:**
```bash
psql -d portal_energetico -c "
  SELECT relname, pg_relation_size(relid) as bytes, pg_relation_size(relid)/1024/1024/1024 as gb
  FROM pg_stat_user_tables
  WHERE relname IN ('metrics_hourly', 'metrics', 'embalses')
  ORDER BY bytes DESC;
"
```

**RIESGO DE CÁLCULO DE MULTIPLICADOR (SKILL 2.1):**
- Si tarea toca metrics_hourly: ×1.5 automático → `echo "factor * 1.5" | bc -l`
- Si tarea toca metrics (1-10GB): ×1.5 automático (pero ANALYZE permitido)
- Otras tablas: no multiplican

---

### A.2 God Files Confirmados

| Archivo | Líneas | Nodos (Graph) | Cohesión | DT-XXX | Status | Restricción |
|---|---|---|---|---|---|---|
| **src/components/HomeSlider.tsx** | 1.663 | 172 (43 propias) | N/A | DT-002 | IN PROGRESS | NO agregar lógica. SOLO lectura o extracción. |
| **core/container.py** (backend) | 575 | 29 servicios | 0.01 | DT-001 | NOT STARTED | NO modificar directamente. Usar arquitectura de carpetas container/. |

**REGLA SKILL 8 #1 y #2:** Modificar estos archivos sin plan escrito = incumplimiento. Si detectas necesidad de cambio, escala primero.

**PARA HomeSlider.tsx:**
- Contiene 5 calculadores de KPI inline (estadoReservas, estadoAportes, estadoPrecio, estadoI2Hidro, estadoI3Termica)
- Contiene 3 librerías Nivo con temas inline (NO usar temas inline, usar `getNivoTheme()` de `src/lib/nivo-theme.ts`)
- Contiene 0 tests unitarios
- DEBE ser desacoplada en fases (ver DT-002 plan en PROPUESTA_MAESTRA.md)

**PARA core/container.py (backend):**
- Contenedor global de inyección de dependencias
- 29 servicios dependen de este archivo
- CICLO LÓGICO: Container inyecta A→B, B→A en algunos pares
- ANTES de refactorizar, ejecutar Skill 1.3 (ruptura de ciclos)

---

### A.3 Ciclos de Dependencia

**FRONTEND:** ✅ ZERO ciclos detectados. Imports limpios.

**BACKEND:** ⚠️ CICLOS LÓGICOS DETECTADOS en container.py
- GenerationService ↔ CommercialService (ambas dependen una de otra)
- ReportService ↔ DataRepository (ambas dependen una de otra)
- **ACCIÓN:** Antes de extraer módulos del container, aplicar Skill 1.3 (Dependency Inversion).
- **COMANDO DE VERIFICACIÓN:**
```bash
# Detectar ciclos estáticos (Python importa)
python3 -c "
from domain.services.generation_service import GenerationService
from domain.services.commercial_service import CommercialService
print('No static cycle')
"

# Detectar ciclos lógicos (Container inyección)
grep -n "commercial_service\|CommercialService" /home/admonctrlxm/server/core/container.py | head -20
grep -n "generation_service\|GenerationService" /home/admonctrlxm/server/core/container.py | head -20
# Si ambas listas tienen referencias mutuas → ciclo lógico confirmado
```

---

### A.4 Servicios Activos y Health Checks

| Servicio | Tipo | Puerto | Comando health | Logfile |
|---|---|---|---|---|
| **portal-mme** | Next.js (frontend) | 3000 | `curl http://localhost:3000/` | `pm2 logs portal-mme` |
| **api-mme** | FastAPI (backend) | 8000 | `curl http://localhost:8000/health` | `pm2 logs api-mme` |
| **whatsapp-bot** | FastAPI + venv | 8001 | `curl http://localhost:8001/health` | `systemctl status whatsapp-bot --no-pager` |
| **telegram-polling** | Python polling | — | `systemctl status telegram-polling --no-pager` | `/home/admonctrlxm/server/logs/telegram.log` |

**RESTRICCIÓN:** whatsapp-bot.service tiene venv ANIDADO (PROHIBIDO mover sin coordinar multi-equipo). DT-009 PAUSED.

**BASELINE RÁPIDO DE SALUD (máx 30 segundos):**
```bash
echo "=== PM2 Status ===" && pm2 status --no-color | grep -E "portal|api-mme"
echo "=== Frontend Health ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ && echo ""
echo "=== Backend Health ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health && echo ""
echo "=== WhatsApp Bot Health ===" && systemctl is-active whatsapp-bot && echo "active" || echo "inactive"
```

---

### A.5 Roadmap Actual (Fases Corto Plazo)

**Fuente:** `PROPUESTA_MAESTRA.md`

| DT-XXX | Nombre | Clasificación | Status | Bloqueador | ETA |
|---|---|---|---|---|---|
| DT-001 | Refactor core/container.py | Crítica | NOT STARTED | Skill 1.3 (ciclos) | Q2 2026 |
| DT-002 | Extraer HomeSlider.tsx formateadores | Crítica | IN PROGRESS | Snapshot visual tests | Q2 2026 |
| DT-003 | Extraer WhatsApp Bot a microservicio | Media | NOT STARTED | Aprobación arquitectura | Q3 2026 |
| DT-004 | Consolidar venv anidados | Media | PAUSED | Coordinar con equipo WhatsApp | TBD |
| DT-005 | Actualizar temas Nivo | Baja | NOT STARTED | Tests de regresión visual | Q2 2026 |
| DT-006 | Estabilizar XM API | Crítica | NOT STARTED | Implementar xm-metric-service.ts | Q2 2026 |
| DT-007 | Regulatory Calculator tests | Media | NOT STARTED | Valores CREG actualizados | Q2 2026 |
| DT-008 | Dashboard degraded mode | Media | NOT STARTED | Componentes UI base | Q2 2026 |
| DT-009 | venv consolidation | Media | PAUSED | Multi-team coordination | TBD |

**COLUMNA "Status":**
- **DONE:** No ejecutar (ya completado). Verificar con `git log`.
- **PAUSED:** No ejecutar (dependencia externa bloqueada). Reportar al humano si intenta.
- **NOT STARTED:** Listo para ejecutar si pasa el CDA (META-SKILL 0).
- **IN PROGRESS:** Verifica si el cambio es incremento o sobrescritura.

**REGLA SKILL 8 #17-19:** Antes de ejecutar una tarea, buscar en PROPUESTA_MAESTRA.md su estado. Si es PAUSED/DONE/SKIP, NO ejecutar sin aprobación humana.

---

### A.6 API Routes (BFF Pattern — 14 Endpoints)

| Ruta | Consumidor | Tipo de Query | Método | Status |
|---|---|---|---|---|
| `/api/sector` | Dashboard sector | `backendGet()` HTTP | Consolidar con patron | MIXED |
| `/api/subsidios` | Dashboard subsidios | `getPool()` directo | Consolidar con patron | MIXED |
| `/api/fenoge` | FENOGE report | `backendGet()` HTTP | Consolidar con patron | MIXED |
| `/api/cu` | CU analysis | `backendGet()` + DB | Consolidar con patron | MIXED |
| `/api/noticias` | News widget | `backendGet()` HTTP | Consolidar con patron | MIXED |
| `/api/validaciones` | Validaciones | `getPool()` directo | Consolidar con patron | MIXED |
| `/api/deficit-historico` | Historic analysis | `getPool()` TABLESAMPLE | Alto riesgo | MIXED |
| `/api/pagos-detalle` | Pagos detail | `getPool()` directo | Riesgo medio | MIXED |
| `/api/cu-evolucion` | CU evolution | `backendGet()` HTTP | Consolidar con patron | MIXED |
| `/api/comunidades` | Comunidades map | `getPool()` directo | Bajo riesgo | MIXED |
| `/api/contratos-or` | Contracts | `getPool()` directo | Medio riesgo | MIXED |
| `/api/presupuesto` | Budget | `getPool()` directo | Bajo riesgo | MIXED |
| `/api/supervision` | Supervision | `getPool()` directo | Medio riesgo | MIXED |
| `/api/chatbot` | Chatbot | `backendGet()` HTTP | Externo | MIXED |

**PROBLEMA DETECTADO:** Sin patrón documentado. Algunos usan `backendGet()` (llamada HTTP a FastAPI), otros usan `getPool()` (directo a PostgreSQL).

**SOLUCIÓN:** Ver `/home/admonctrlxm/portal-direccion-mme/.knowledge/bff-patterns.md` para estandarización.

**RIESGO:** Cambios en estas routes sin patrón claro pueden romper múltiples dashboards simultáneamente.

---

### A.7 Knowledge Base Local

Ubicación: `/home/admonctrlxm/portal-direccion-mme/.knowledge/`

| Archivo | Propósito | Refresco |
|---|---|---|
| `quick-skill-index.md` | Decisión rápida de skill (2 min en lugar de 20 min) | Mensual |
| `verify-table-snapshot.sh` | Script automatizado de Skill 9 (Método A/B/C/D auto-seleccione) | Cada sesión |
| `roadmap-quick-status.md` | Estado consolidado de DT-XXX sin leer 1300 líneas | Mensual |
| `bff-patterns.md` | Estandarización de 14 endpoints | Ad-hoc |
| `errors.md` | Base de errores comunes del proyecto | Permanente |
| `data-sources.md` | Catálogo de APIs externas con SLA (XM, IDEAM, NASA POWER) | Trimestral |
| `regulatory-fixtures/` | Valores de referencia CREG para tests de regresión | Trimestral |

**REGLA:** Leer estos archivos ANTES de iniciar una sesión. Ahorra ~30 minutos de contexto.

---

### A.8 Benchmarks Locales

**Build Frontend:**
- Baseline: ~5 minutos
- Si excede 10 min → investigar imports circulares (Skill 1.3)

**Health Checks:**
- curl /health: debe retornar 200 en <1 segundo
- Si tarda >5s → investigación de bloqueos en DB

**Data Snapshot:**
- metrics_hourly (32GB) con MÉTODO D: ~2 segundos (stat proxy, sin COUNT)
- metrics (1.4GB) con MÉTODO C: ~10-30 segundos (muestreo + ANALYZE)
- embalses (<100MB) con MÉTODO A: <1 segundo

**Ejecución de ETL:**
- metrics_hourly insert masivo: máx 5 minutos (si tarda más, índices bloqueados)
- Dry-run en tabla de prueba: máx 2 minutos

---

### A.9 Guía Rápida por Tarea Frecuente

| Tarea | Skill | Tiempo | Riesgo |
|---|---|---|---|
| Agregar KPI a HomeSlider | Skill 2 + Visual test | 2h | 5.0 (god file) |
| Modificar query en API route | Skill 9 + data snapshot | 1h | 2.5 (>10 endpoints podrían romperse) |
| Refactor service >1000 líneas | Skill 2.4 + pdftotext diff | 4-8h | >8.0 (requiere aprobación) |
| Arreglar bug de fórmula regulatoria | Skill 15 + test CREG | 2h | 6.0 (cálculos) |
| Nuevo endpoint API | Skill 0 CDA + Skill 14 patron | 2h | 3.0 (si sigue patrón) |
| Actualizar tema Nivo | Skill 2 + Visual snapshot | 1h | 2.0 (bajo, componentes aislados) |
| Agregar envío WhatsApp | Skill 0 CDA | 1h | 2.5 (venv anidado = riesgo extra) |
| Migrar tabla >1GB | Skill 9 MÉTODO C/D | 2h | >8.0 (requiere permiso + plan) |

---

### A.10 Contactos y Escalation

**Para emergencias SEV-1 (portal caído):**
- Usar Skill 17 (Protocolo de Emergencia)
- NO investigar causa raíz. Restaurar primero.
- Escalar si el rollback simple (git revert) no funciona.

**Para cambios arquitectónicos (refactor god files):**
- Requerido: plan escrito + aprobación antes de Fase 5 (TRATAR)
- Involucra: DT-001, DT-002, DT-003, DT-004 (ver PROPUESTA_MAESTRA.md)

**Para cambios regulatorios (fórmulas de cálculo):**
- Requerido: validación contra valores CREG actualizados
- Requerido: test de regresión con valores de referencia
- Involucra: DT-007 (Regulatory Calculator tests)

**Para cambios en BD (schema, índices, tablas >1GB):**
- Requerido: pg_dump ANTES de hacer cambio
- Requerido: MÉTODO correcto (Skill 9) para verificación
- Si tabla >10GB: PROHIBIDO ANALYZE automático, pedir permiso humano

---

### A.11 Integración con PROPUESTA_MAESTRA.md

Este ANEXO A está pensado para ser complemento de lectura rápida. Para detalles completos:

1. Tareas específicas → Leer `PROPUESTA_MAESTRA.md` sección Roadmap
2. God files detallados → Leer `PROPUESTA_MAESTRA.md` sección God Files
3. Deuda técnica → Leer `PROPUESTA_MAESTRA.md` sección Debtload
4. Decisiones congeladas → Leer `PROPUESTA_MAESTRA.md` sección Frozen Decisions

Este SKILL_PACK se actualiza con cambios de metodología. PROPUESTA_MAESTRA.md se actualiza con cambios de proyecto.
