@AGENTS.md

---

## 🤖 PROTOCOLO AUTOMÁTICO — EJECUTAR ANTES DE CADA RESPUESTA

**IMPORTANTE:** Estas reglas se aplican a TODOS los prompts, sin excepción, aunque el prompt sea corto o parezca simple.

### PASO 1 — Clasificar el prompt (< 5 segundos mentalmente)

| Tipo de prompt | Acción obligatoria ANTES de responder |
|---|---|
| Código, arquitectura, bug, refactor | Ejecutar `graphify query "<tema>"` |
| Pregunta sobre docs, metodología, decisiones | Ejecutar `python3 ~/search_docs.py "<tema>"` |
| Nueva feature o tarea compleja (>30 min) | Usar agente **planner** primero |
| UI/UX, componente visual | Activar skill **ui-ux-pro-max** |
| Escritura de código nuevo | Usar agente **tdd-guide** |
| Código recién escrito/modificado | Usar agente **code-reviewer** |
| **Build, deploy, PM2, portal caído, pantalla blanca** | Activar skill **portal-deploy-guard** — usar `./scripts/deploy.sh`, NUNCA `npm run build` solo |
| Automatización, workflow, integración | Usar MCP **n8n-mcp** |

### PASO 2 — Buscar en memoria Claude Mem

Para CUALQUIER prompt que no sea trivial:
```
Buscar en claude-mem-mcp si hay contexto previo relevante sobre el tema
```
Esto evita re-derivar contexto que ya fue capturado.

### PASO 3 — Usar herramientas en lugar de leer archivos

**NUNCA** hacer `Read` de un archivo sin antes intentar:
1. `graphify query` para entender la estructura
2. `python3 ~/search_docs.py` para encontrar documentación relevante
3. Leer SOLO el fragmento específico que necesito, no el archivo completo

### PASO 4 — Responder con mínimo de tokens

- Citar solo el fragmento relevante del grafo/docs, no todo el output
- No repetir contexto que ya está en el prompt
- Dar la respuesta directa + los próximos pasos concretos

---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- **SIEMPRE** ejecutar `graphify query "<tema>"` antes de responder preguntas de código
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

## Stack del proyecto
Next.js 16.2.1 · TypeScript · Tailwind · Nivo · PostgreSQL · FastAPI (Python) · PM2

## Herramientas instaladas — SIEMPRE USAR

### Búsqueda de documentación (TF-IDF local)
- Comando: `python3 ~/search_docs.py "<pregunta>"`
- Indexa: server/docs/, .knowledge/, documentacion-tecnica/ — 21 docs, 710 fragmentos
- Usar ANTES de leer cualquier archivo de documentación
- Re-indexar si hay docs nuevos: `python3 ~/search_docs.py index`

### UI UX Pro Max
- Skill en `.claude/skills/ui-ux-pro-max/` — se activa automáticamente para cualquier tarea de UI/UX.
- Para componentes: describir el diseño y el skill genera paleta + tipografía + layout completos.

### Claude Mem (memoria persistente)
- Worker en `http://localhost:37701`. Si no corre: `claude-mem start`.
- Buscar en memoria con MCP `claude-mem-mcp` tool `search` antes de re-derivar contexto.
- Al inicio de una sesión nueva ejecutar `/learn-codebase` para ingerir el proyecto.

### n8n MCP (automatizaciones)
- MCP `n8n-mcp` activo en `~/.claude.json`. Describe un workflow y Claude lo construye en n8n.

### LightRAG (RAG sobre documentación avanzada)
- Instalado: `lightrag-hku 1.4.15`. Iniciar servidor: `lightrag-server` (puerto 9621).
- MCP `lightrag` activo cuando el servidor corre. Usar para consultas complejas multi-documento.
- Verificar si corre: `curl -s http://localhost:9621/health`

### Everything Claude Code (ECC)
- Agentes en `~/.claude/agents/` — usar para code-review, arquitectura, seguridad.
- Comandos slash disponibles: `/plan`, `/code-review`, `/security-scan`, `/smart-explore`, **`/deploy`** (deploy seguro producción).
- Reglas TypeScript y Python aplicadas automáticamente desde `~/.claude/rules/`.

---

## Reglas de código

### TypeScript / Next.js
- API routes en `src/app/api/` — tipos explícitos, nunca `any`.
- Usar `apiService.ts` para todos los fetch (no usar `fetch()` directo en componentes).
- Slides en `src/components/slides/` — máximo 200 líneas por archivo.
- Lógica de KPIs y formato en `src/lib/` — cubrir con tests Vitest.

### Python / FastAPI
- Endpoints: `/home/admonctrlxm/server/api/v1/routes/`.
- Servicios: `/home/admonctrlxm/server/domain/services/`.
- Siempre usar venv: `/home/admonctrlxm/server/venv/`.
- Header requerido: `X-API-Key`.

### Base de datos
- PostgreSQL: base `portal_energetico`, usuario `mme_user`.
- Esquemas activos: `subsidios`, `comunidades`, `energia`, `supervision`, `fenoge`.
- Nunca modificar datos de producción sin confirmar primero.
