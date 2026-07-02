---
type: "query"
date: "2026-05-25T21:36:29.783077+00:00"
question: "mapa completo arquitectura portal y servidor MME"
contributor: "graphify"
source_nodes: ["backendGet()", "getPool()", "MetricsService", "PostgreSQLConnectionManager"]
---

# Q: mapa completo arquitectura portal y servidor MME

## Answer

Ver .knowledge/CODEMAP_COMPLETO.md y graphify-out/merged-full-graph.json (6236 nodos). Portal BFF usa backendGet() y getPool(). Backend FastAPI en :8000 con 26 routes, domain services, ETL Celery. PostgreSQL portal_energetico con 9 esquemas.

## Source Nodes

- backendGet()
- getPool()
- MetricsService
- PostgreSQLConnectionManager