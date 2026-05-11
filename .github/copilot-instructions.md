# Portal Dirección MME — Instrucciones Unificadas para Agentes

> **Última actualización:** 2026-05-04
> **Proyecto:** Portal de Dirección MME (Ministerio de Minas y Energía)
> **Stack:** Next.js 15 + React 19 + TypeScript 5 + Tailwind v4 + Nivo 0.99 + PostgreSQL 16

---

## 🚨 REGLAS CRÍTICAS (SIEMPRE CARGAR)

1. **NUNCA** modificar `src/components/HomeSlider.tsx` (1.663 líneas, god component) sin plan escrito
2. **NUNCA** exponer secrets en `NEXT_PUBLIC_*`
3. **SIEMPRE** ejecutar `npm run build` antes de commit
4. **SIEMPRE** verificar `grep -r "NombreComponente" src/` antes de eliminar
5. **NUNCA** asumir que código no se usa sin verificar
6. **PROHIBIDO** crear archivos `.md` sin pasar el test de necesidad (ver SKILL_PACK_V5.0.md §11)
7. **PROHIBIDO** calcular multiplicadores de riesgo en la cabeza — usar `echo "..." | bc -l`
8. **PROHIBIDO** cargar SKILL_PACK_V5.0.md completo — usar selección dinámica

---

## 📂 Estructura del Proyecto

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboards)/[dashboard]/page.tsx
│   └── api/                  # 14 API Routes (BFF pattern)
├── components/
│   ├── ui/                   # Componentes base (shadcn/ui)
│   ├── charts/               # Wrappers Nivo
│   └── dashboard/            # Componentes dashboard
├── lib/
│   ├── db.ts                 # Pool PostgreSQL (getPool())
│   └── nivo-theme.ts         # Tema compartido gráficas
└── hooks/                    # Custom hooks (VACÍO)
```

---

## 📊 Conocimiento del Grafo (Graphify 2026-05-01)

| Métrica | Valor |
|---|---|
| Nodos | 172 |
| Aristas | 133 (87% EXTRACTED, 13% INFERRED) |
| Comunidades | 6 |

### God Nodes (nodos más conectados)
1. `backendGet()` — 10 edges (consumo API backend)
2. `getPool()` — 7 edges (conexión PostgreSQL directa)
3. `estadoGeneracion()` — 4 edges (KPI dashboard energía)

### Patrón BFF Detectado (14 endpoints)
- Algunos usan `backendGet()` (HTTP a FastAPI backend)
- Otros usan `getPool()` (directo a PostgreSQL)
- **Problema:** Sin patrón unificado → riesgo de romper múltiples dashboards

### Ciclos de Dependencia
- **Frontend:** ✅ ZERO ciclos
- **Backend:** ⚠️ Ciclos lógicos en `container.py` (GenerationService ↔ CommercialService)

---

## 🗄️ Base de Datos

```typescript
// ✅ CORRECTO — Conexión reutilizable
import { getPool } from "@/lib/db";
const pool = getPool();
const result = await pool.query("SELECT * FROM tabla");

// ❌ INCORRECTO — Nueva conexión cada vez
import { Pool } from "pg";
const pool = new Pool({...});
```

### Tablas Críticas
| Tabla | Tamaño | Método Verificación |
|---|---|---|
| `metrics_hourly` | 32 GB | **MÉTODO D** (stat proxy SOLO) |
| `metrics` | 1.4 GB | Método C (muestreo + ANALYZE) |
| `embalses` | <100 MB | Método A (checksum completo) |
| Otras | <300 MB total | Método A |

---

## 🎨 Estilos y Temas

```css
/* Tailwind v4 — CSS-first config (NO tailwind.config.js) */
@theme {
  --color-primary: #1a1a1a;
  --color-gold: #c9a227;
}
```

```tsx
// ✅ Usar getNivoTheme() para TODAS las gráficas
import { getNivoTheme } from "@/lib/nivo-theme";
const theme = getNivoTheme();

// ✅ Usar useId() para gradientes SVG únicos
const uniqueId = useId();
```

---

## 📦 Skills Disponibles en `/skills/`

**IMPORTANTE:** Estos skills están en el directorio `/skills/` del proyecto. Cada skill tiene su propio `SKILL.md` con instrucciones detalladas. Leer el SKILL.md correspondiente ANTES de usar.

### 🔍 Búsqueda y Lectura Web
| Skill | Cuándo usar | CLI |
|---|---|---|
| `web-search` | Buscar información en internet | `z-ai function -n web_search -a '{"query":"..."}'` |
| `web-reader` | Extraer contenido de páginas web | `z-ai function -n page_reader -a '{"url":"..."}'` |
| `multi-search-engine` | 8 buscadores chinos (Baidu, Bing, Sogou, WeChat) | `web_fetch(url)` |

### 🤖 IA Generativa (`z-ai-web-dev-sdk` — SOLO backend)
| Skill | Cuándo usar | CLI |
|---|---|---|
| `image-generation` | Crear imágenes desde texto | `z-ai image -p "prompt" -o output.png` |
| `image-understand` | Analizar/OCR imágenes | `z-ai vision -p "pregunta" -i "url"` |
| `video-generation` | Generar video desde texto/imagen | `z-ai video -p "prompt" --poll` |
| `video-understand` | Analizar contenido de video | Leer SKILL.md |
| `ASR` | Transcribir audio a texto | `z-ai asr --file ./audio.wav` |
| `TTS` | Convertir texto a audio (máx 1024 chars) | `z-ai tts --text "hola" -o output.wav` |
| `VLM` | Vision Language Model | Leer SKILL.md |
| `LLM` | Utilidades LLM | Leer SKILL.md |

### 📊 Finanzas
| Skill | Cuándo usar |
|---|---|
| `finance` | Cotizaciones, históricos, screening, opciones |
| `stock-analysis-skill` | Análisis bursátil con recomendaciones buy/sell/hold |

### 📄 Documentos y Datos
| Skill | Cuándo usar | Stack |
|---|---|---|
| `xlsx` | Crear/editar/analizar hojas de cálculo | Python (openpyxl) |
| `pdf` | PDF profesional (Report, Creative, Academic, Process) | ReportLab/LaTeX/Playwright |
| `docx` | Word con tracked changes | python-docx |
| `ppt` | Presentaciones .pptx + Beamer académico | python-pptx |
| `charts` | Gráficas y diagramas profesionales | matplotlib/ECharts/Mermaid/Playwright+CSS |

### 📝 Contenido y Escritura
| Skill | Cuándo usar |
|---|---|
| `blog-writer` | Blog posts con estilo personal |
| `seo-content-writer` | Contenido SEO optimizado |
| `content-strategy` | Estrategia de contenido |
| `contentanalysis` | Análisis de contenido |
| `writing-plans` | Planes de escritura |
| `storyboard-manager` | Storyboards |

### 🔍 Investigación
| Skill | Cuándo usar |
|---|---|
| `ai-news-collectors` | Recopilación de noticias IA |
| `aminer-academic-search` | Búsqueda académica Aminer |
| `aminer-daily-paper` | Papers académicos diarios |
| `aminer-free-academic` | Búsqueda académica gratuita |
| `qingyan-research` | Investigación Qingyan |
| `market-research-reports` | Informes de mercado |

### 🎯 Marketing y Negocios
`marketing-mode` · `gift-evaluator` · `interview-designer` · `dream-interpreter` · `get-fortune-analysis`

### 🛠️ Desarrollo
| Skill | Cuándo usar |
|---|---|
| `coding-agent` | Workflow de código: planificación → implementación → verificación |
| `fullstack-dev` | Desarrollo fullstack |
| `skill-creator` | Crear nuevos skills |
| `skill-finder-cn` | Buscar skills existentes |
| `skill-vetter` | Validar skills |

### 🎨 Diseño y Visual
`ui-ux-pro-max` · `visual-design-foundations` · `image-edit` · `web-shader-extractor` · `podcast-generate`

### 🧘 Bienestar
`mindfulness-meditation` · `anti-pua` · `auto-target-tracker`

### 📁 Otros
`agent-browser` — Navegador para agentes

---

## 🔄 SKILL_PACK_V5.0 — Carga Selectiva

**PROHIBIDO** cargar el SKILL_PACK completo (~2,600 líneas). Usar selección dinámica:

| Tarea | Skills a cargar del SKILL_PACK |
|---|---|
| Emergencia (portal caído) | Skill 17 (Emergencia) — NADA MÁS |
| Refactorización | Skill 1.3 (Ciclos) + Skill 2 (Refactor) |
| Toca datos DB | Skill 9 (Data Verification) |
| Investigación | Skill 1 (Investigación) |
| Múltiples tareas | META-SKILL -1 (Triage) |
| Crear tests | Skill 15 (Testing por Riesgo) |
| Conflicto entre skills | META-SKILL -2 (Optimización de Contexto) |

### Jerarquía de Verdad (Pesos)
```
N1 Runtime:    pytest/build/curl/psql     +0.25 a +0.40
N2 AST:        grep/tsc/py_compile        +0.25 a +0.30
N3 Graphify:   query/path/communities     +0.03 a +0.20
N4 Supuestos:  memoria del LLM           0.00

Regla: PESO ≥ 0.7 → EJECUTAR | 0.5-0.69 → EJECUTAR + verify extra | <0.5 → INVESTIGAR
```

### Orden de Resolución de Conflictos
1. **Skill 8** (Reglas Absolutas) — SIEMPRE gana
2. **Skill 0** (CDA) — Diagnóstico antes que acción
3. **META-SKILL -1** (Triage) — Priorización sobre ejecución
4. **Skill 12** (Rollback) — Si algo falla, revertir
5. **Skills de dominio** — Orden numérico

---

## 🚀 Despliegue

```bash
# Build
rm -rf .next/ && npm run build

# Restart
pm2 restart portal-mme --update-env

# Health check
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# Verificar APIs
for api in sector subsidios comunidades presupuesto contratos-or supervision fenoge; do
  curl -s http://localhost:3000/api/$api/ | head -c 50
  echo "..."
done
```

---

## 📞 Ecosistema Completo

| Proyecto | Ruta | Stack |
|---|---|---|
| **Frontend** (este) | `/home/admonctrlxm/portal-direccion-mme/` | Next.js 15 + React 19 |
| **Backend** | `/home/admonctrlxm/server/` | Python 3.11 + FastAPI + Dash |
| **WhatsApp Bot** | `/home/admonctrlxm/server/whatsapp_bot/` | FastAPI (puerto 8001) |

---

## 📚 Archivos de Referencia

| Archivo | Propósito | Cuándo leer |
|---|---|---|
| `AGENTS.md` | Reglas detalladas del proyecto | Siempre (contexto principal) |
| `SKILL_PACK_V5.0.md` | Framework completo (Field Medic) | Selectivamente según tarea |
| `PROPUESTA_MAESTRA.md` | Roadmap y decisiones | Antes de iniciar CDA |
| `graphify-out/GRAPH_REPORT.md` | Análisis de dependencias | Navegación del código |
| `.knowledge/errors.md` | Errores comunes del proyecto | Al inicio de sesión |
| `skills/*/SKILL.md` | Instrucciones de cada skill | Antes de usar el skill |

---

*Documento unificado — Todos los agentes deben leer este archivo como punto de entrada.*
