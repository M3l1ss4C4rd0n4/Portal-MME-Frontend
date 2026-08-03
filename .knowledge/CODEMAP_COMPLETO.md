# CODEMAP COMPLETO — Portal Dirección MME + Servidor

> **Generado:** 2026-05-25 · **Última actualización:** 2026-08-02 · **Grafo unificado:** `graphify-out/merged-full-graph.json` (7.950 nodos, 19.535 aristas)
> **Consulta rápida:** `graphify query "<tema>" --graph graphify-out/merged-full-graph.json --budget 2000`
> **Docs TF-IDF:** `python3 ~/search_docs.py "<pregunta>"` (748 fragmentos, 23 docs)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USUARIO (navegador)                                                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS :3000
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PORTAL Next.js 15  (/home/admonctrlxm/portal-direccion-mme)            │
│  PM2: portal-mme · colombia-solar                                       │
│  BFF: src/app/api/*/route.ts (20 endpoints)                             │
│  UI:  HomeSlider + dashboards + slides Nivo                             │
└───────────────┬─────────────────────────────┬───────────────────────────┘
                │ backendGet() :8000           │ getPool() :5432
                ▼                              ▼
┌───────────────────────────┐    ┌────────────────────────────────────────┐
│  FastAPI Backend          │    │  PostgreSQL portal_energetico          │
│  /home/admonctrlxm/server │    │  9 esquemas activos                    │
│  systemd: portal-api.service │    │  subsidios, comunidades, fenoge, etc.  │
│  26 routes en api/v1/     │    └────────────────────────────────────────┘
└───────────────┬───────────┘
                │
    ┌───────────┼───────────┬──────────────┬─────────────┐
    ▼           ▼           ▼              ▼             ▼
 XM/SIMEM    IDEAM/NASA   OneDrive/SP   Redis cache   Celery ETL
 (pydataxm)  (hidrología) (Excel/CSV)   (99.5% SLA)   (Beat+Workers)
```

### God Nodes (núcleo del sistema)

| Capa | Nodo | Rol |
|------|------|-----|
| Portal BFF | `backendGet()` | Proxy a FastAPI :8000 (10 conexiones) |
| Portal BFF | `getPool()` | Query directa PostgreSQL (9 conexiones) |
| Portal BFF | `apiGet()` | Fetch interno entre API routes (14 conexiones) |
| Backend | `PostgreSQLConnectionManager` | Pool BD (243 edges) |
| Backend | `MetricsService` | Orquestador métricas XM (219 edges) |
| Backend | `GenerationService` | Generación eléctrica (217 edges) |
| Backend | `CommercialService` | Precios bolsa, escasez (194 edges) |
| Backend | `DistributionService` | Demanda, consumo (191 edges) |
| Backend | `HydrologyService` | Embalses, aportes (190 edges) |

---

## 2. Portal Frontend (`portal-direccion-mme/`)

### Rutas de usuario (dashboards)

| URL | Página | Slide/Componente |
|-----|--------|------------------|
| `/` | Home (slider KPIs) | `HomeSlider.tsx` ⚠️ god component |
| `/comunidades` | Comunidades energéticas | `SlideComunidades.tsx` |
| `/contratos-or` | Contratos OR | `SlideContratosOR.tsx` |
| `/energia` | Dashboard energía | (energia page) |
| `/fenoge` | FENOGÉ | fenoge page |
| `/pagos` | Pagos subsidios | — |
| `/presupuesto` | Presupuesto | `SlidePresupuesto.tsx` |
| `/subsidios` | Subsidios DEE | `SlideSubsidios.tsx` |
| `/supervision` | Supervisión | `SlideSupervision.tsx` |
| `/validaciones` | Validaciones | — |
| `/energia/predicciones` | Predicciones hidrológicas de embalses (ONI/El Niño) | componentes en `src/components/predictions/` |
| `/energia/informes` | Explorador de boletines e informes XM | — |
| `/colombia-solar` | Curvas S del programa Colombia Solar | componentes en `src/components/colombia-solar/` |
| `/hidrocarburos` | Presupuesto y exploración de hidrocarburos (jul-2026, en construcción) | `SlideHidrocarburosPresupuesto.tsx`, `SlideHidrocarburosProduccion.tsx` |

### BFF API Routes (`src/app/api/`)

| Endpoint | Fuente de datos | Backend equivalente |
|----------|-----------------|---------------------|
| `/api/comunidades` | backendGet | `/v1/comunidades` |
| `/api/contratos-or` | backendGet | `/v1/contratos-or` |
| `/api/cu` | backendGet | `/v1/cu` |
| `/api/cu-evolucion` | getPool | SQL directo |
| `/api/embalses/capacidad-historica` | backendGet | `/v1/hydrology/...` |
| `/api/energia` | backendGet | `/v1/energia/...` |
| `/api/fenoge` | backendGet | `/v1/fenoge` |
| `/api/fenoge/seguimiento` | backendGet | `/v1/fenoge/seguimiento` |
| `/api/noticias` | backendGet | news service |
| `/api/presupuesto` | backendGet | `/v1/presupuesto` |
| `/api/sector` | backendGet | `/v1/sector/...` |
| `/api/sector/detalle` | getPool | SQL directo |
| `/api/subsidios` | backendGet | `/v1/subsidios` |
| `/api/subsidios/deficit-historico` | getPool | SQL directo |
| `/api/subsidios/pagos-detalle` | getPool | SQL directo |
| `/api/subsidios/validaciones` | getPool | SQL directo |
| `/api/supervision` | backendGet | `/v1/supervision` |
| `/api/chatbot` | backendGet | `/v1/chatbot` |
| `/api/colombia-solar/curva-s` | backendGet | colombia-solar PM2 |
| `/api/health` | local | health check |
| `/api/hidrocarburos` | backendGet | `/v1/hidrocarburos` (jul-2026) |
| `/api/ontologia` | backendGet | `/v1/ontologia` (jul-2026) |

> **Regla BFF:** Si dudas → `backendGet()`. Ver `.knowledge/bff-patterns.md`

### Librerías clave (`src/lib/`)

| Archivo | Función |
|---------|---------|
| `backendClient.ts` | `backendGet()` — proxy FastAPI con cache/timeout |
| `db.ts` | `getPool()` — conexión PostgreSQL reutilizable |
| `nivo-theme.ts` | `getNivoTheme()` — tema compartido gráficas |
| `apiService.ts` | Fetch desde componentes (usar en lugar de fetch directo) |

---

## 3. Backend FastAPI (`/home/admonctrlxm/server/`)

### API Routes (`api/v1/routes/`)

| Módulo | Dominio |
|--------|---------|
| `commercial.py` | Precios bolsa, escasez, comercialización |
| `comunidades.py` | Comunidades energéticas |
| `contratos_or.py` | Contratos operadores de red |
| `cu.py` | Costos unitarios |
| `distribution.py` | Demanda, consumo, agentes |
| `energia_app.py` / `energia_dashboard.py` | Dashboard energía |
| `fenoge.py` | FENOGÉ seguimiento |
| `generation.py` | Generación por tecnología |
| `hydrology.py` | Embalses, aportes, niveles |
| `losses.py` | Pérdidas energéticas NT |
| `metrics.py` | Métricas XM genéricas |
| `predictions.py` | Predicciones ML |
| `presupuesto.py` | Ejecución presupuestal |
| `restrictions.py` | Restricciones operativas |
| `sector_snapshot.py` | Snapshot sector eléctrico |
| `simulation.py` | Simulaciones |
| `subsidios.py` | Subsidios DEE |
| `supervision_portal.py` | Supervisión |
| `transmission.py` | Transmisión |
| `chatbot.py` | Orquestador IA |
| `whatsapp_alerts.py` | Alertas WhatsApp |
| `system.py` / `observability.py` | Health, métricas |
| `internal.py` | Endpoints internos |
| `reports.py` | Informes ejecutivos |
| `ontologia.py` | Ontología de datos unificada (dimensiones geografía/empresa/proyecto) + RAG (jul-2026) |
| `sector_despacho.py` | Despacho diario XM (jul-2026) |
| `riesgo.py` | Servicio de riesgo (jul-2026) |

### Domain Services (`domain/services/`)

| Servicio | Responsabilidad |
|----------|-----------------|
| `metrics_service.py` | Orquestador central métricas |
| `generation_service.py` | Generación eléctrica |
| `commercial_service.py` | Comercialización |
| `distribution_service.py` | Distribución/consumo |
| `hydrology_service.py` | Hidrología/embalses |
| `transmission_service.py` | Transmisión |
| `losses_service.py` / `losses_nt_service.py` | Pérdidas |
| `restrictions_service.py` | Restricciones |
| `predictions_service.py` | ML predicciones |
| `cu_service.py` / `cu_minorista_service.py` | Costos unitarios |
| `orchestrator/` | Handlers chatbot (subsidios, métricas, predicciones…) |
| `ai_service.py` | Integración LLM |
| `news_service.py` | Noticias sector |
| `report_service.py` | PDFs/informes |
| `ontologia_service.py` | Capa de ontología unificada + embeddings RAG (jul-2026) |
| `asistente_ia_service.py` | Asistente conversacional del portal (jul-2026) |
| `graph_service.py` / `risk_service.py` | Explorador de relaciones / análisis de riesgo (jul-2026) |

### ETL Pipeline (`etl/`)

| Script | Frecuencia | Fuente |
|--------|------------|--------|
| `etl_todas_metricas_xm.py` | 4×/día (6-9h) | XM/SIMEM |
| `etl_transmision.py` | Diario 6:30 | XM |
| `etl_commercial_metrics.py` | Celery Beat | XM precios |
| `etl_loss_metrics.py` | Celery Beat | XM pérdidas |
| `etl_restriction_metrics.py` | Celery Beat | XM restricciones |
| `etl_subsidios.py` | On-demand/SP | SharePoint Excel |
| `etl_sharepoint_sync.py` | Watcher | OneDrive/SP |
| `etl_ideam.py` | Diario | IDEAM hidrología |
| `etl_nasa_power.py` | Diario 5:00 | NASA POWER |
| `etl_nuevos_dashboards.py` | On-demand | Varios |
| `etl_tarifas_or_mensual.py` | Mensual | OR tarifas |
| `etl_anomalies_pnt.py` | Celery Beat | Anomalías PNT |
| `etl_hidrocarburos.py` | Diario | Excel manual + scraping La República (WTI/Brent) |
| `etl_commodities_larepublica.py` | Cada 24h (6:30 AM) | Scraping precio petróleo WTI/Brent |
| `etl_despacho_diario.py` | Diario | Despacho XM (PDF, vía `despacho_pdf_parser.py`) |
| `etl_senda_referencia.py` | On-demand | Senda de referencia (vía `senda_pdf_parser.py`) |

---

## 4. Base de Datos PostgreSQL

**Base:** `portal_energetico` · **Usuario:** `mme_user` · **Host:** localhost:5432

| Esquema | Dominio |
|---------|---------|
| `subsidios` | Subsidios DEE, pagos, validaciones |
| `comunidades` | Comunidades energéticas |
| `fenoge` | FENOGÉ seguimiento |
| `presupuesto` | Ejecución presupuestal |
| `contratos_or` | Contratos operadores red |
| `supervision` | Supervisión sector |
| `sector_energetico` | Métricas sector |
| `colombia_solar` | Curva S solar |
| `public` | Tablas compartidas (metrics, etc.) |
| `ontologia` | Capa semántica de solo lectura: dimensiones geografía/empresa/proyecto, vistas materializadas, embeddings RAG y linaje de datos (jul-2026, en evolución) |

> ⚠️ `metrics_hourly` >32GB — usar MÉTODO D, nunca `COUNT(*)`. Ver `./verify-table-snapshot.sh`

---

## 5. Servicios en Producción (systemd + PM2)

### systemd (activos)

| Servicio | Puerto/Rol |
|----------|------------|
| `portal-api.service` | :8000 FastAPI (uvicorn directo) |
| `dashboard-mme.service` | Dashboard interno |
| `celery-beat.service` | Scheduler ETL |
| `celery-worker.service` | Worker principal |
| `celery-worker@1/2` | Workers adicionales |
| `celery-flower.service` | UI Celery |
| `telegram-polling.service` | Bot Telegram |
| `whatsapp-bot.service` | Bot WhatsApp |
| `postgresql@16-main` | BD |
| `redis-server` | Cache |

### PM2

| Proceso | Rol |
|---------|-----|
| `portal-mme` | Next.js :3000 |
| `colombia-solar` | App Colombia Solar |

---

## 6. Integraciones Externas

| Fuente | SLA | Fallback | Script/Service |
|--------|-----|----------|----------------|
| XM/SIMEM | 99% | Redis 24h | `etl_todas_metricas_xm.py`, `XMService` |
| IDEAM | 95% | NASA POWER | `etl_ideam.py` |
| OneDrive/SharePoint | 90% | Último archivo | `etl_sharepoint_sync.py` |
| NASA POWER | 95% | Dataset previo | `etl_nasa_power.py` |
| ArcGIS | On-demand | — | `scripts/arcgis/ejecutar_dual.sh` |
| PostgreSQL | 99.9% | — | `getPool()` / `PostgreSQLConnectionManager` |
| Redis | 99.5% | Query directa PG | Cache layer |

---

## 7. Comandos de Consulta (optimización tokens)

```bash
# Grafo unificado — arquitectura
graphify query "cómo fluye subsidios desde ETL hasta UI" \
  --graph graphify-out/merged-full-graph.json --budget 2000

# Camino entre dos conceptos
graphify path "etl_subsidios.py" "SlideSubsidios.tsx" \
  --graph graphify-out/merged-full-graph.json

# Explicar un nodo
graphify explain "backendGet()" --graph graphify-out/merged-full-graph.json

# Documentación TF-IDF
python3 ~/search_docs.py "endpoint orchestrator chatbot"

# Reportes detallados
cat graphify-out/GRAPH_REPORT.md                          # portal
cat /home/admonctrlxm/server/graphify-out/GRAPH_REPORT.md  # backend
```

---

## 8. Índice de Conocimiento Local (`.knowledge/`)

| Archivo | Contenido |
|---------|-----------|
| `CODEMAP_COMPLETO.md` | **Este archivo** — mapa maestro |
| `quick-skill-index.md` | Árbol decisión skills (2 min) |
| `bff-patterns.md` | Patrones API routes BFF |
| `data-sources.md` | Fuentes de datos + SLA |
| `roadmap-quick-status.md` | Estado tareas DT-XXX |
| `errors.md` | Errores conocidos |
| `ETL_TABLE_MAPPING_AUDIT.md` | Mapeo tablas ETL |

---

## 9. Deuda Técnica Conocida

| ID | Problema | Estado |
|----|----------|--------|
| DT-001 | `core/container.py` god file (575 nodos, ciclos) | PAUSED |
| DT-002 | `HomeSlider.tsx` god component (1.663 líneas) | Activo |
| DT-003 | WhatsApp bot anidado | PAUSED |
| — | 0 tests unitarios frontend | Pendiente |
| — | BFF sin patrón unificado (backendGet vs getPool) | Documentado |

---

## 10. Actualización del Mapa

```bash
# Re-indexar grafo portal (AST, sin LLM)
cd /home/admonctrlxm/portal-direccion-mme && graphify update .

# Re-indexar grafo backend
cd /home/admonctrlxm/server && graphify update .

# Fusionar ambos
cd /home/admonctrlxm/portal-direccion-mme
graphify merge-graphs graphify-out/graph.json \
  /home/admonctrlxm/server/graphify-out/graph.json \
  --out graphify-out/merged-full-graph.json

# Re-indexar docs TF-IDF
python3 ~/search_docs.py index
```

---

*Mantenido por graphify AST extraction · Última fusión: 2026-05-25*
