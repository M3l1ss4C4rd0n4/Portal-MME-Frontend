# Graph Report - portal-direccion-mme  (2026-08-02)

## Corpus Check
- 168 files · ~868,450 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 479 nodes · 448 edges · 23 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `apiGet()` - 20 edges
2. `getPool()` - 20 edges
3. `backendGet()` - 13 edges
4. `loadCurvaSFromDb()` - 12 edges
5. `clasificarVisualEmbalse()` - 6 edges
6. `GET()` - 5 edges
7. `GET()` - 5 edges
8. `backendGetPdf()` - 5 edges
9. `detectar_secciones()` - 4 edges
10. `GET()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/sector/operativas/route.ts → src/lib/db.ts
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/despacho/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/supervision/detalle/route.ts → src/lib/db.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/chart-mensual/route.ts → src/lib/db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (20): GET(), GET(), GET(), GET(), GET(), GET(), GET(), GET() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (14): GET(), GET(), GET(), buildQueryString(), GET(), GET(), GET(), backendGet() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (12): buildTGeneracionChip(), describeArc(), diagnosticoPrecio(), diagnosticoReservas(), estadoGeneracion(), estadoI2Hidro(), estadoI3Termica(), polarToCartesian() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (16): buildCategoriaExcel(), GET(), loadCurvaSFromExcel(), procesarHojaExcel(), resolveExcelPath(), buildRowMap(), extractSeries(), forwardFillPct() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (21): ApiError, apiGet(), buscarEmpresas(), buscarTextoContratos(), fetchComunidades(), fetchContratosOR(), fetchCU(), fetchCUEvolucion() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (17): estadoPrecio(), calcularSemafotoPorDepto(), getEmbalseColor(), getEmbalseRiesgo(), getEstadoSin(), diagnosticoSIN(), estadoAportes(), estadoGeneracion() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (6): fmtCOP(), fmtCOPShort(), formatKWp(), formatNumber(), mesOrderCaseSql(), GET()

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (5): Header(), useGeoFilter(), FenogePage(), getNivoTheme(), useTheme()

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (6): set(), detectar_secciones(), extraer_kpis_xm(), main(), normalizar_texto(), Detecta posibles títulos de sección en el texto de cada página.

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (6): GET(), GET(), BackendError, backendGetPdf(), requestBackend(), GET()

### Community 13 - "Community 13"
Cohesion: 0.73
Nodes (3): cleanupOldOutputs(), GET(), runPython()

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (2): formatActaDate(), parseActaDateFromName()

### Community 18 - "Community 18"
Cohesion: 0.83
Nodes (3): extraer_kpis(), main(), normalizar_texto()

### Community 19 - "Community 19"
Cohesion: 0.83
Nodes (3): aMwh(), GET(), metricaNacionalConTendencia()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (2): loadCatalog(), onVisible()

### Community 29 - "Community 29"
Cohesion: 0.83
Nodes (3): countKeywordHits(), escapeRegExp(), matchesWholeWord()

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): main(), render_pdf()

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (1): GET()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): GET()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (1): GET()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (1): Card()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): arcPath(), polarToCartesian()

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): describeArc(), polarToCartesian()

## Knowledge Gaps
- **1 isolated node(s):** `Detecta posibles títulos de sección en el texto de cada página.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (6 nodes): `Card()`, `formatActaDate()`, `handleClickOutside()`, `handleDownloadActa()`, `parseActaDateFromName()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (4 nodes): `LightningIcon()`, `loadCatalog()`, `onVisible()`, `InformesDiariosSlider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (3 nodes): `main()`, `render_pdf()`, `render_pdf.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `GET()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `GET()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `GET()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `Card()`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `arcPath()`, `polarToCartesian()`, `GaugeEficiencia.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `describeArc()`, `polarToCartesian()`, `svg-math.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPool()` connect `Community 0` to `Community 3`, `Community 1`, `Community 19`, `Community 6`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `backendGet()` connect `Community 1` to `Community 9`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `getPool()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`getPool()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `backendGet()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`backendGet()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `clasificarVisualEmbalse()` (e.g. with `getEmbalseColor()` and `getEmbalseRiesgo()`) actually correct?**
  _`clasificarVisualEmbalse()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Detecta posibles títulos de sección en el texto de cada página.` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._