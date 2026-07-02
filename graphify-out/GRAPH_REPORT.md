# Graph Report - portal-direccion-mme  (2026-06-21)

## Corpus Check
- 123 files · ~654,836 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 350 nodes · 328 edges · 17 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `apiGet()` - 14 edges
2. `backendGet()` - 11 edges
3. `loadCurvaSFromDb()` - 11 edges
4. `getPool()` - 11 edges
5. `clasificarVisualEmbalse()` - 6 edges
6. `GET()` - 5 edges
7. `GET()` - 5 edges
8. `clasificarIndiceNE()` - 5 edges
9. `backendGetPdf()` - 5 edges
10. `detectar_secciones()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/supervision/detalle/route.ts → src/lib/db.ts
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/subsidios/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/subsidios/deficit-historico/route.ts → src/lib/db.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/cu-evolucion/route.ts → src/lib/db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (18): diagnosticoSIN(), calcularSemafotoPorDepto(), getEmbalseColor(), getEmbalseRiesgo(), getEstadoSin(), diagnosticoSIN(), estadoAportes(), estadoGeneracion() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (12): GET(), GET(), buildQueryString(), GET(), GET(), GET(), backendGet(), GET() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (14): GET(), GET(), GET(), GET(), getPool(), validateEnv(), buildWhere(), GET() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (15): ApiError, apiGet(), fetchComunidades(), fetchContratosOR(), fetchCU(), fetchCUEvolucion(), fetchFenoge(), fetchNoticias() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (7): describeArc(), estadoGeneracion(), estadoI2Hidro(), estadoI3Termica(), estadoPrecio(), polarToCartesian(), clasificarVisualPrecioBolsa()

### Community 5 - "Community 5"
Cohesion: 0.26
Nodes (11): buildRowMap(), extractSeries(), forwardFillPct(), forwardFillPctReal(), getDateColumns(), isValidProyecto(), loadCurvaSFromDb(), maxPositive() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (6): set(), detectar_secciones(), extraer_kpis_xm(), main(), normalizar_texto(), Detecta posibles títulos de sección en el texto de cada página.

### Community 7 - "Community 7"
Cohesion: 0.2
Nodes (6): GET(), GET(), BackendError, backendGetPdf(), requestBackend(), GET()

### Community 8 - "Community 8"
Cohesion: 0.31
Nodes (5): buildCategoriaExcel(), GET(), loadCurvaSFromExcel(), procesarHojaExcel(), resolveExcelPath()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (4): fmtCOP(), fmtCOPShort(), fmtCortePresupuesto(), SlidePresupuesto()

### Community 12 - "Community 12"
Cohesion: 0.73
Nodes (3): cleanupOldOutputs(), GET(), runPython()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (2): Header(), useTheme()

### Community 14 - "Community 14"
Cohesion: 0.83
Nodes (3): extraer_kpis(), main(), normalizar_texto()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (2): loadCatalog(), onVisible()

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): main(), render_pdf()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (1): GET()

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (2): describeArc(), polarToCartesian()

## Knowledge Gaps
- **1 isolated node(s):** `Detecta posibles títulos de sección en el texto de cada página.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (5 nodes): `Header()`, `ThemeProvider()`, `useTheme()`, `Header.tsx`, `ThemeProvider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `LightningIcon()`, `loadCatalog()`, `onVisible()`, `InformesDiariosSlider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `main()`, `render_pdf()`, `render_pdf.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (3 nodes): `GET()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `describeArc()`, `polarToCartesian()`, `svg-math.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPool()` connect `Community 2` to `Community 8`, `Community 1`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `backendGet()` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `backendGet()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`backendGet()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getPool()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`getPool()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `clasificarVisualEmbalse()` (e.g. with `getEmbalseColor()` and `getEmbalseRiesgo()`) actually correct?**
  _`clasificarVisualEmbalse()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Detecta posibles títulos de sección en el texto de cada página.` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._