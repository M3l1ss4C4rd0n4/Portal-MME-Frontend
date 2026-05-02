# Graph Report - portal-direccion-mme  (2026-05-01)

## Corpus Check
- 64 files · ~1,544,066 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 172 nodes · 133 edges · 6 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]

## God Nodes (most connected - your core abstractions)
1. `backendGet()` - 10 edges
2. `getPool()` - 7 edges
3. `estadoGeneracion()` - 4 edges
4. `GET()` - 3 edges
5. `useTheme()` - 3 edges
6. `getCellValue()` - 2 edges
7. `rowComparator()` - 2 edges
8. `GET()` - 2 edges
9. `GET()` - 2 edges
10. `GET()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/sector/detalle/route.ts → src/lib/db.ts
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/subsidios/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/subsidios/validaciones/route.ts → src/lib/db.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/subsidios/deficit-historico/route.ts → src/lib/db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (11): GET(), GET(), GET(), GET(), BackendError, backendGet(), GET(), GET() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (8): describeArc(), estadoGeneracion(), estadoI2Hidro(), estadoI3Termica(), estadoPrecio(), KpiBlock(), polarToCartesian(), getTrendColor()

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (8): GET(), GET(), GET(), getPool(), validateEnv(), GET(), toNum(), GET()

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (3): Header(), useTheme(), MapaColombia()

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (2): getCellValue(), rowComparator()

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (2): calcularSemafotoPorDepto(), getEmbalseColor()

## Knowledge Gaps
- **Thin community `Community 4`** (8 nodes): `checkVisible()`, `debounce()`, `getCellValue()`, `coverage_html_cb_dd2e7eb5.js`, `on_click()`, `rowComparator()`, `sortColumn()`, `updateHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (6 nodes): `calcularAportesPorDepto()`, `calcularSemafotoPorDepto()`, `getEmbalseColor()`, `getEmbalseRiesgo()`, `getEstadoSin()`, `embalses-coords.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 9 inferred relationships involving `backendGet()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`backendGet()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getPool()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`getPool()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useTheme()` (e.g. with `Header()` and `MapaColombia()`) actually correct?**
  _`useTheme()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._