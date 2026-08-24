# Graph Report - portal-direccion-mme  (2026-08-24)

## Corpus Check
- 190 files · ~880,476 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 529 nodes · 485 edges · 25 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `apiGet()` - 21 edges
2. `getPool()` - 20 edges
3. `backendGet()` - 14 edges
4. `loadCurvaSFromDb()` - 12 edges
5. `backendGetPdf()` - 9 edges
6. `clasificarVisualEmbalse()` - 6 edges
7. `GET()` - 5 edges
8. `GET()` - 5 edges
9. `detectar_secciones()` - 4 edges
10. `GET()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/despacho/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/diagnosticos-ia/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/supervision/detalle/route.ts → src/lib/db.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/chart-mensual/route.ts → src/lib/db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (23): GET(), GET(), GET(), GET(), GET(), GET(), GET(), GET() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (15): GET(), GET(), GET(), buildQueryString(), GET(), GET(), GET(), GET() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (19): buildDiagnostico(), buildTGeneracionChip(), calcularSemafotoPorDepto(), getEmbalseColor(), getEmbalseRiesgo(), getEstadoSin(), diagnosticoSIN(), diagnosticoTermico() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (9): Header(), ComunidadesPage(), useGeoFilter(), FenogePage(), normDeptKey(), getNivoTheme(), useTheme(), handleSelectDepartamento() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (13): GET(), GET(), POST(), GET(), GET(), GET(), BackendError, backendGetPdf() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (22): ApiError, apiGet(), buscarEmpresas(), buscarTextoContratos(), fetchCatalogoMetricas(), fetchComunidades(), fetchContratosOR(), fetchCU() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.27
Nodes (11): buildRowMap(), extractSeries(), forwardFillPct(), forwardFillPctReal(), getDateColumns(), isValidProyecto(), loadCurvaSFromDb(), maxPositive() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (6): fmtCOP(), fmtCOPShort(), formatKWp(), formatNumber(), mesOrderCaseSql(), GET()

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (6): set(), detectar_secciones(), extraer_kpis_xm(), main(), normalizar_texto(), Detecta posibles títulos de sección en el texto de cada página.

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (2): formatActaDate(), parseActaDateFromName()

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (5): buildCategoriaExcel(), GET(), loadCurvaSFromExcel(), procesarHojaExcel(), resolveExcelPath()

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (3): classifyOni(), fraseClimaPunto(), fmtShortDate()

### Community 14 - "Community 14"
Cohesion: 0.73
Nodes (3): cleanupOldOutputs(), GET(), runPython()

### Community 18 - "Community 18"
Cohesion: 0.7
Nodes (4): getStatusColor(), hexToRgb(), lerpColor(), withAlpha()

### Community 21 - "Community 21"
Cohesion: 0.83
Nodes (3): extraer_kpis(), main(), normalizar_texto()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (1): PcmPlaybackProcessor

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (2): loadCatalog(), onVisible()

### Community 31 - "Community 31"
Cohesion: 0.83
Nodes (3): countKeywordHits(), escapeRegExp(), matchesWholeWord()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): main(), render_pdf()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): PcmCaptureProcessor

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (1): GET()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (1): GET()

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): labelDeNodo(), tooltipDeNodo()

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): arcPath(), polarToCartesian()

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): describeArc(), polarToCartesian()

## Knowledge Gaps
- **1 isolated node(s):** `Detecta posibles títulos de sección en el texto de cada página.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (10 nodes): `computeAverageLine()`, `formatActaDate()`, `formatFechaEje()`, `formatFechaTooltip()`, `handleClickOutside()`, `handleDownloadActa()`, `parseActaDateFromName()`, `pickRealNota()`, `pickTickValues()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (4 nodes): `PcmPlaybackProcessor`, `.constructor()`, `.process()`, `pcm-playback-processor.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `LightningIcon()`, `loadCatalog()`, `onVisible()`, `InformesDiariosSlider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `main()`, `render_pdf()`, `render_pdf.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `PcmCaptureProcessor`, `.process()`, `pcm-capture-processor.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `GET()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `GET()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (3 nodes): `labelDeNodo()`, `tooltipDeNodo()`, `RelationshipGraph.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `arcPath()`, `polarToCartesian()`, `GaugeEficiencia.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `describeArc()`, `polarToCartesian()`, `svg-math.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPool()` connect `Community 0` to `Community 1`, `Community 11`, `Community 7`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `backendGet()` connect `Community 1` to `Community 4`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 11` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `getPool()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`getPool()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `backendGet()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`backendGet()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `backendGetPdf()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`backendGetPdf()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Detecta posibles títulos de sección en el texto de cada página.` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._