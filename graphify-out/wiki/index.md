# Graphify Wiki — Portal + Server

> Navegación token-eficiente del ecosistema MME.

## Grafos disponibles

| Grafo | Nodos | Uso |
|-------|-------|-----|
| `graphify-out/graph.json` | 247 | Solo portal (Next.js) |
| `/home/admonctrlxm/server/graphify-out/graph.json` | 5.990 | Solo backend (FastAPI) |
| `graphify-out/merged-full-graph.json` | 6.236 | **Unificado — usar este** |

## Mapa maestro

Ver `.knowledge/CODEMAP_COMPLETO.md` para arquitectura, rutas, ETL, BD y servicios.

## Consultas sugeridas

```bash
graphify query "flujo datos subsidios" --graph graphify-out/merged-full-graph.json
graphify query "servicios dominio energía" --graph graphify-out/merged-full-graph.json
graphify query "ETL celery schedule" --graph graphify-out/merged-full-graph.json
graphify explain "MetricsService" --graph graphify-out/merged-full-graph.json
```

## Comunidades clave (portal)

- **Community 15:** BFF layer (`backendGet`, API routes)
- **Community 0-5:** Slides y componentes dashboard

## Comunidades clave (server)

- **Community 0:** Domain services (Commercial, Distribution, Hydrology…)
- **Community 1:** XM external service
- **Community 52:** Scripts ETL/completar tablas

## Reportes

- Portal: `graphify-out/GRAPH_REPORT.md`
- Server: `/home/admonctrlxm/server/graphify-out/GRAPH_REPORT.md`
