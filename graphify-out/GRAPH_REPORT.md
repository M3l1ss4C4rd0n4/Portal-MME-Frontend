# Graph Report - portal-direccion-mme  (2026-05-27)

## Corpus Check
- 105 files · ~208,522 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 293 nodes · 267 edges · 11 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `apiGet()` - 14 edges
2. `backendGet()` - 11 edges
3. `getPool()` - 11 edges
4. `loadCurvaSFromDb()` - 10 edges
5. `clasificarVisualEmbalse()` - 6 edges
6. `GET()` - 5 edges
7. `clasificarIndiceNE()` - 5 edges
8. `GET()` - 4 edges
9. `GET()` - 4 edges
10. `GET()` - 4 edges

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
Cohesion: 0.08
Nodes (13): GET(), GET(), buildQueryString(), GET(), GET(), GET(), BackendError, backendGet() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (14): GET(), GET(), GET(), GET(), getPool(), validateEnv(), buildWhere(), GET() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (16): diagnosticoSIN(), calcularSemafotoPorDepto(), getEmbalseColor(), getEmbalseRiesgo(), getEstadoSin(), diagnosticoSIN(), estadoAportes(), estadoGeneracion() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (15): ApiError, apiGet(), fetchComunidades(), fetchContratosOR(), fetchCU(), fetchCUEvolucion(), fetchFenoge(), fetchNoticias() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (7): describeArc(), estadoGeneracion(), estadoI2Hidro(), estadoI3Termica(), estadoPrecio(), polarToCartesian(), clasificarVisualPrecioBolsa()

### Community 5 - "Community 5"
Cohesion: 0.28
Nodes (10): buildRowMap(), extractSeries(), forwardFillPct(), getDateColumns(), isValidProyecto(), loadCurvaSFromDb(), maxPositive(), parseNum() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (5): buildCategoriaExcel(), GET(), loadCurvaSFromExcel(), procesarHojaExcel(), resolveExcelPath()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (4): fmtCOP(), fmtCOPShort(), fmtCortePresupuesto(), SlidePresupuesto()

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (2): PriceCard(), getTrendColor()

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (2): Header(), useTheme()

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (2): describeArc(), polarToCartesian()

## Knowledge Gaps
- **Thin community `Community 10`** (5 nodes): `PriceCard()`, `toPct()`, `SlideGeneracionTermica.tsx`, `TrendBadge.tsx`, `getTrendColor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (5 nodes): `Header()`, `ThemeProvider()`, `useTheme()`, `Header.tsx`, `ThemeProvider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (3 nodes): `describeArc()`, `polarToCartesian()`, `svg-math.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPool()` connect `Community 1` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `backendGet()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`backendGet()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getPool()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`getPool()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `clasificarVisualEmbalse()` (e.g. with `getEmbalseColor()` and `getEmbalseRiesgo()`) actually correct?**
  _`clasificarVisualEmbalse()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._