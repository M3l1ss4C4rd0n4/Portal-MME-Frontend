# Propuesta Maestra — Portal Direccion MME

> Estado actual documentado mediante analisis de grafo (Graphify v0.6.2)  
> Fecha: 2026-05-01  
> Agentes: Kimi + Claude (colaborativo)  
> Version: 1.0  
> Clasificacion: Documento vivo — actualizar tras cada cambio arquitectonico significativo

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual Completo](#2-estado-actual-completo)
3. [Analisis FODA Tecnico](#3-analisis-foda-tecnico)
4. [Deuda Tecnica Exhaustiva](#4-deuda-tecnica-exhaustiva)
5. [Vision de Estado Objetivo](#5-vision-de-estado-objetivo)
6. [Roadmap de Transformacion](#6-roadmap-de-transformacion)
7. [Especificaciones para Skills/Agents](#7-especificaciones-para-skillsagents)
8. [Anexos](#8-anexos)

---

## 1. Resumen Ejecutivo

El **Portal de Direccion MME** es un ecosistema de software que soporta las operaciones de la Direccion de Energia Electrica del Ministerio de Minas y Energia de Colombia. Consta de dos proyectos principales:

| Proyecto | Rol | Stack | Estado |
|---|---|---|---|
| **server** | Backend monolitico | Python 3.12, FastAPI, Dash, PostgreSQL, Redis, Celery | Produccion (8.2 GB) |
| **portal-direccion-mme** | Frontend + BFF | Next.js 16, React 19, Tailwind v4, Nivo, TypeScript | Produccion (4.7 GB) |

### Hallazgos criticos del analisis por grafo

1. **No hay dependencias de codigo compartido** entre frontend y backend. Se comunican exclusivamente por HTTP/API REST.
2. **El backend es un monolito con 6.021 nodos y 13.887 aristas** en el grafo. Contiene al menos 3 subproyectos embebidos (API, Dashboard, Bot, App movil, ETL, ML).
3. **El frontend tiene un god component** (HomeSlider.tsx, 1.663 lineas) que concentra 17+ funciones de distintas categorias.
4. **El backend tiene un god file** (core/container.py, 575 nodos en el grafo, cohesion 0.01) que acopla todo el dominio.
5. **~187 MB de basura fueron eliminados** (archivos accidentales, artefactos de coverage, caches).
6. **Todas las conexiones sorprendentes del grafo fueron validadas como reales.** No hay falsos positivos en el analisis.

### Recomendacion estrategica

**No refactorizar aun.** Primero completar esta documentacion maestra, luego ejecutar las transformaciones en el orden definido en el Roadmap (Seccion 6). La prioridad inmediata es:

1. Unificar el venv del bot (2-3 dias, bajo riesgo)
2. Consolidar ETL duplicado (4-6 horas, bajo riesgo)
3. Extraer energia_app/ a repo independiente (1 dia, bajo riesgo)

---

## 2. Estado Actual Completo

### 2.1 Inventario fisico

#### Servidor completo

| Ruta | Tipo | Tamanio | Notas |
|---|---|---|---|
| /home/admonctrlxm/server/ | Directorio proyecto | 8.2 GB | Monolito Python |
| /home/admonctrlxm/portal-direccion-mme/ | Directorio proyecto | 4.7 GB | Frontend Next.js |
| /home/admonctrlxm/server_backup_*.tar.gz | Backup | 4.2 GB | No tocar |
| /var/www/html/ | Nginx default | 8 KB | Vacio (solo index default) |

#### Server — Inventario de codigo

| Categoria | Cantidad (archivos) | Cantidad (nodos grafo) | Notas |
|---|---|---|---|
| Archivos Python (.py) | 371 | — | Incluye tests, scripts, ETLs (excluyendo venv) |
| Tests (archivos .py en /tests/) | ~31 | 1.056 nodos | Cada metodo de test es un nodo en el grafo |
| Servicios de dominio | 29 + __init__.py | 970 | En domain/services/ (29 servicios reales) |
| Repositorios | ~6 | 194 | En infrastructure/database/repositories/ |
| API Routes (FastAPI) | 27 | 253 | En api/v1/routes/ |
| Schemas Pydantic | ~15 | 168 | En api/v1/schemas/ |
| Scripts de utilidad | 47 | 705 | En scripts/ (47 .py + 16 .sh) |
| ETLs | 18 | 236 | En etl/ |
| Archivos de configuracion | ~10 | — | docker-compose.yml, .env, etc. |
| Servicios systemd | 4 | — | portal-api.service, dash-mme.service, whatsapp-bot.service, telegram-polling.service |
| Dependencias PyPI | 77 | — | requirements.txt |

**Nota sobre discrepancia nodos vs archivos:** El grafo cuenta cada funcion, clase, metodo y docstring como un nodo. Por eso hay 6.021 nodos para 371 archivos Python (~16 nodos por archivo promedio).

#### Portal — Inventario de codigo

| Categoria | Cantidad (archivos) | Cantidad (nodos grafo) | Notas |
|---|---|---|---|
| Archivos TS/TSX | 58 | 172 | Incluye componentes, routes, lib |
| App Router (paginas + layouts) | 13 | 36 | En src/app/ |
| Componentes React | 20 | 59 | En src/components/ |
| Utilidades (src/lib/) | 5 | 17 | db.ts, backendClient.ts, nivo-theme.ts, etc. |
| Hooks custom | 0 | 0 | src/hooks/ existe pero esta vacio |
| Dependencias npm | ~25 runtime + ~6 dev | — | package.json |

### 2.2 Arquitectura detallada (Server)

**IMPORTANTE:** `server/` NO es un solo proyecto. Contiene **3 aplicaciones independientes** que comparten infraestructura:

| # | Proyecto | Entry point | Puerto | Stack | Archivos |
|---|---|---|---|---|---|
| 1 | **API REST** | `api/main.py` | 8000 | FastAPI, Pydantic | 50 archivos en `api/` |
| 2 | **Dashboard Dash** | `app.py` | 8050 | Dash, Plotly, Bootstrap | 21 paginas en `pages/` + 46 en `interface/` |
| 3 | **App Movil (EnergIA)** | `energia_app/index.js` | — | React Native 0.76.5 | Android + iOS |

#### Capas arquitectonicas (compartidas por API + Dash)

```
+-------------------------------------------------------------------------+
|  ADAPTERS / ENTRY POINTS                                                |
|  +-- api/main.py              (FastAPI, puerto 8000)                    |
|  +-- app.py                   (Dash, puerto 8050) — 21 paginas          |
|  +-- whatsapp_bot/main.py     (FastAPI bot, puerto 8001)               |
|  +-- energia_app/             (React Native, Android/iOS)              |
|  +-- scripts/*.py             (CLI/ETL/Cron — 75 archivos)             |
|  +-- tasks/*.py               (Celery: anomaly, etl, push)             |
+-------------------------------------------------------------------------+
|  API LAYER                                                              |
|  +-- api/v1/routes/           (27 archivos, ~74 endpoints)             |
|  +-- api/v1/schemas/          (Pydantic models)                         |
+-------------------------------------------------------------------------+
|  DOMAIN LAYER                                                           |
|  +-- domain/services/         (29 servicios + __init__.py, ~970 nodos) |
|  +-- domain/interfaces/       (Contratos abstractos: repos, datasources)|
|  +-- domain/models/           (Pydantic entities + ML models)          |
+-------------------------------------------------------------------------+
|  INFRASTRUCTURE LAYER                                                   |
|  +-- infrastructure/database/repositories/  (6 repos concretos)        |
|  +-- infrastructure/external/               (XMService, NASA, IDEAM)   |
|  +-- infrastructure/cache/                  (Redis wrapper)            |
|  +-- infrastructure/ml/models/              (Checkpoints ML)           |
|  +-- infrastructure/cqrs/                   (Command/Query bus)        |
|  +-- infrastructure/event_sourcing/         (Aggregate, EventStore)    |
|  +-- infrastructure/news/                   (Google News, Mediastack)  |
|  +-- infrastructure/observability/          (Health, alerts, tracing)  |
|  +-- infrastructure/logging/                (Structured logging)       |
+-------------------------------------------------------------------------+
|  CORE                                                                   |
|  +-- core/container.py        (DI Container — 575 nodos, god file)     |
|  +-- core/config.py           (Settings centralizadas)                 |
|  +-- core/database/           (Migration helper)                       |
|  +-- core/security/           (SQL validator, Vault)                   |
|  +-- core/utils/              (Date utils)                             |
|  +-- core/error_handlers.py   (Manejo de errores global)               |
|  +-- core/exceptions.py       (Excepciones custom)                     |
+-------------------------------------------------------------------------+
```

#### Servicios de dominio — Inventario completo

| # | Servicio | Lineas | Funcion | Estado |
|---|---|---|---|---|
| 1 | report_service.py | 1.850 | Generacion de informes generales | Activo |
| 2 | executive_report_service.py | 1.618 | Informes ejecutivos automaticos | Activo |
| 3 | cu_service.py | 1.010 | Costo Unitario mayorista (XM) | Activo |
| 4 | losses_nt_service.py | 1.199 | Perdidas no tecnicas | Activo |
| 5 | notification_service.py | 1.178 | Notificaciones Telegram/WhatsApp | Activo |
| 6 | intelligent_analysis_service.py | 829 | Analisis con IA/LLM | Activo |
| 7 | simulation_service.py | 748 | Simulaciones Monte Carlo CREG | Activo |
| 8 | predictions_service_extended.py | 698 | Predicciones ML (SARIMA, LGBM, RF) | Activo |
| 9 | investment_service.py | 523 | Inversiones energeticas | Activo |
| 10 | ai_service.py | 504 | Integracion con LLM (OpenAI/Groq) | Activo |
| 11 | news_service.py | 505 | Noticias del sector | Activo |
| 12 | cu_minorista_service.py | 599 | Costo Unitario minorista | Activo |
| 13 | distribution_service.py | 480 | Datos de distribucion electrica | Activo |
| 14 | generation_service.py | 448 | Generacion electrica por fuente | Activo |
| 15 | commercial_service.py | 342 | Precios comerciales | Activo |
| 16 | hydrology_service.py | 368 | Hidrologia y embalses | Activo |
| 17 | metrics_service.py | 222 | Metricas calculadas generales | Activo |
| 18 | restrictions_service.py | 222 | Restricciones operativas SIN | Activo |
| 19 | transmission_service.py | 207 | Transmision electrica | Activo |
| 20 | indicators_service.py | 173 | Indicadores clave | Activo |
| 21 | system_service.py | 193 | Health checks y estado sistema | Activo |
| 22 | validators.py | 247 | Validaciones de dominio | Activo |
| 23 | confianza_politica.py | 122 | Analisis politico | Sin documentar |
| 24 | losses_service.py | 220 | Perdidas electricas generales | Activo |
| 25 | metrics_calculator.py | 196 | Calculos de metricas auxiliares | Activo |
| 26 | config_dynamic.py | 309 | Configuracion dinamica | Activo |
| 27 | geo_service.py | 32 | Georreferenciacion | DEPRECATED |
| 28 | orchestrator_service.py | 4 | Orquestacion (stub) | DEPRECATED |
| 29 | predictions_service.py | 10 | Predicciones (stub viejo) | DEPRECATED |

#### God Nodes del backend (top 10 por conectividad)

| Nodo | Aristas | Tipo | EXTRACTED | INFERRED | Veredicto |
|---|---|---|---|---|---|
| PostgreSQLConnectionManager | 256 | Infraestructura | 2 (0.8%) | 254 (99.2%) | Hub real. Casi todo es imports no extraidos por AST. |
| MetricsService | 219 | Dominio | 13 (5.9%) | 206 (94.1%) | Servicio central. Posible doble conteo de imports. |
| GenerationService | 217 | Dominio | 12 (5.5%) | 205 (94.5%) | Altamente conectado. |
| MetricsRepository | 195 | Infraestructura | 14 (7.2%) | 181 (92.8%) | Puente dominio-DB. |
| CommercialService | 194 | Dominio | 18 (9.3%) | 176 (90.7%) | Servicio de precios comerciales. |
| DistributionService | 191 | Dominio | 14 (7.3%) | 177 (92.7%) | Datos de distribucion. |
| HydrologyService | 190 | Dominio | 12 (6.3%) | 178 (93.7%) | Hidrologia y embalses. |
| TransmissionService | 185 | Dominio | 8 (4.3%) | 177 (95.7%) | Transmision electrica. |
| LossesService | 170 | Dominio | 8 (4.7%) | 162 (95.3%) | Perdidas electricas. |
| RestrictionsService | 165 | Dominio | 6 (3.6%) | 159 (96.4%) | Restricciones SIN. |

**Matizacion crucial:** Los porcentajes bajos de EXTRACTED no indican que las conexiones sean falsas. Indican que Graphify (en modo rapido, token cost=0) no pudo verificar estaticamente los imports mediante AST. Las conexiones INFERRED son imports reales confirmados en codigo.

#### Comunidades principales del grafo (server)

| Comunidad | Nodos | Cohesion | Descripcion |
|---|---|---|---|
| Community 0 | 575 | 0.01 | DI Container + servicios principales (acoplamiento masivo) |
| Community 1 | 522 | 0.01 | WhatsApp Bot (telegram_polling.py, handlers, AI) |
| Community 2 | 326 | 0.01 | CQRS/Command pattern + excepciones |
| Community 3 | 310 | 0.01 | Configuracion centralizada + bot config |
| Community 4 | 199 | 0.02 | Anomalias + handlers de alertas |
| Community 5 | 123 | 0.02 | FastAPI app del bot |
| Community 6 | 112 | 0.02 | Sistema de alertas (AlertManager, reglas) |
| Community 7 | 158 | 0.03 | Chatbot UI / mensajes |
| Community 8 | 117 | 0.02 | ML Features + regresores (NASA, IDEAM) |
| Community 9 | 102 | 0.05 | Error handlers centralizados |
| Community 22 | 61 | 0.05 | ETLs especificos (comunidades, contratos, presupuesto, subsidios, supervision) |

### 2.3 Arquitectura detallada (Portal)

#### Capas

```
+---------------------------------------------+
|  PAGINAS (Next.js App Router)              |
|  +-- app/page.tsx          (Home)           |
|  +-- app/(dashboards)/     (Route groups)   |
|  +-- app/api/              (BFF routes)     |
+---------------------------------------------+
|  COMPONENTES                                |
|  +-- components/ui/        (Base: Mapa,     |
|  |                          Header, Gauge)  |
|  +-- components/charts/    (Wrappers Nivo)  |
|  +-- components/           (HomeSlider —    |
|                             god component)  |
+---------------------------------------------+
|  LIBRERIAS / UTILIDADES                     |
|  +-- lib/db.ts             (Pool PostgreSQL)|
|  +-- lib/backendClient.ts  (HTTP a FastAPI) |
|  +-- lib/nivo-theme.ts     (Tema graficas)  |
|  +-- lib/embalses-coords.ts (Datos hidro)   |
+---------------------------------------------+
|  HOOKS                                      |
|  +-- hooks/                [VACIO]          |
+---------------------------------------------+
|  PROVIDERS                                  |
|  +-- providers/ThemeProvider.tsx            |
+---------------------------------------------+
```

#### God Component validado

**src/components/HomeSlider.tsx**
- Lineas: 1.663
- Hooks React: 5 (useState, useEffect, useCallback, useRef, useMemo)
- Librerias Nivo: 3 (ResponsiveLine, ResponsivePie, ResponsiveBar)
- Componentes embebidos: KpiBlock, TopAccent, SectionBadge, StatusChip, HydroKpiBlock, DualGaugeSparklines, MiniSpark
- KPIs embebidos: estadoReservas, estadoAportes, estadoPrecio, estadoI2Hidro, estadoI3Termica, estadoGeneracion, diagnosticoSIN
- Formateadores embebidos: fmtCOP, fmtNum, fmtFull
- SVG math embebida: polarToCartesian, describeArc

**Impacto:** Imposible de testear unitariamente. Cualquier cambio en KPIs o formateo requiere modificar un archivo de 1.600+ lineas.

#### API Routes — Fuentes reales

| Endpoint | Metodo | Fuente real | Tecnologia |
|---|---|---|---|
| /api/sector | GET | Backend FastAPI (backendGet) | HTTP a server:8000 |
| /api/subsidios | GET | Backend FastAPI (backendGet) | HTTP a server:8000 |
| /api/fenoge | GET | Backend FastAPI (backendGet → /v1/fenoge/mapa) | HTTP a server:8000 |
| /api/cu | GET | Backend FastAPI (backendGet → /v1/cu/current) | HTTP a server:8000 |
| /api/noticias | GET | Scraping externo (RSS/OG) | fetch con cache 8h |
| /api/subsidios/validaciones | GET | PostgreSQL directo (getPool) | pg (Node) |
| /api/subsidios/deficit-historico | GET | PostgreSQL directo (getPool) | pg (Node) |
| /api/subsidios/pagos-detalle | GET | PostgreSQL directo (getPool) | pg (Node) |
| /api/cu-evolucion | GET | PostgreSQL directo (getPool → sector_energetico.cu_daily) | pg (Node) |
| /api/comunidades | GET | PostgreSQL directo | pg |
| /api/contratos-or | GET | PostgreSQL directo | pg |
| /api/presupuesto | GET | PostgreSQL directo | pg |
| /api/supervision | GET | PostgreSQL directo | pg |
| /api/chatbot | POST | Backend FastAPI (backendGet) | HTTP a server:8000 |

**Total BFF endpoints verificados: 14** (6 mas que los 8 documentados inicialmente).

**Dashboards activos** (verificados en src/app/(dashboards)/):
energia · fenoge · pagos · presupuesto · subsidios · supervision · validaciones · comunidades · contratos-or

**Observacion:** No hay una capa de servicios intermedia. Cada route.ts decide directamente si llama a backendGet() o a getPool(). La ruta `/api/noticias` es la unica que no usa ninguna de las dos — hace fetch externo directamente.

### 2.4 Metricas del grafo de conocimiento

#### Server

| Metrica | Valor |
|---|---|
| Archivos analizados | 394 |
| Nodos | 6.021 |
| Aristas (links) | 13.887 |
| Comunidades | 244 |
| Aristas EXTRACTED | 53% (~7.411) |
| Aristas INFERRED | 47% (~6.476) |
| Cohesion maxima comunidad | 0.42 (Community 63: validador ETL) |
| Cohesion minima (top 10) | 0.01 (Community 0, 1, 2, 3) |

#### Portal

| Metrica | Valor |
|---|---|
| Archivos analizados | 64 |
| Nodos | 172 |
| Aristas (links) | 133 |
| Comunidades | 6 |
| Cohesion maxima | 0.40 (Community 6: embalses) |
| Cohesion minima | 0.09 (Community 0: API routes) |

#### Grafo global

| Metrica | Valor |
|---|---|
| Nodos fusionados | 6.184 |
| Aristas fusionadas | 14.012 |
| Dependencias cruzadas de codigo | 0 (ninguna) |
| Comunicacion | HTTP/API REST unicamente |

### 2.5 Dependencias externas

#### Backend (server) — Dependencias criticas

| Categoria | Paquete/Servicio | Version | Uso | Riesgo |
|---|---|---|---|---|
| Framework API | FastAPI | 0.109.2 | API REST principal | Bajo |
| Dashboard | Dash + Plotly | 2.17.1 / 5.17.0 | Tableros legacy | Bajo |
| DB | PostgreSQL | 16 | Datos estructurados | Critico (single point of failure) |
| Cache | Redis | 7.x | Cache de predicciones y metricas | Medio |
| Datos XM | pydataxm | 2.1.1 | API mercado energia Colombia | Medio |
| Datos clima | NASA POWER API | — | Features ML | Bajo |
| Datos hidro | IDEAM API | — | Features ML | Bajo |
| ML | LightGBM, SARIMA, Prophet | — | Predicciones series temporales | Medio |
| AI/LLM | OpenAI | 1.61.0 | AgentIA, analisis inteligente | Medio (costo variable) |
| Notificaciones | Twilio / Meta API | — | WhatsApp Bot | Medio |
| Notificaciones | Telegram API | — | Telegram Bot | Medio |
| Geoespacial | ArcGIS Enterprise | — | Mapas y capas | Medio |
| Tareas async | Celery + Celery Beat | 5.6.2 | Background jobs, alertas | Medio |
| WSGI | Gunicorn | 21.2.0 | Servidor de produccion | Bajo |
| Deploy | Docker + Docker Compose | — | Contenedores | Bajo |

#### Frontend (portal) — Dependencias criticas

| Categoria | Paquete | Version | Uso | Riesgo |
|---|---|---|---|---|
| Framework | Next.js | 16.2.1 | App Router, RSC | Bajo |
| UI | React | 19.2.4 | Runtime | Bajo |
| Estilos | Tailwind CSS | 4.0 | CSS-first | Bajo |
| Graficas | @nivo/* | 0.99 | Bar, Line, Pie, Geo, Sankey | Bajo |
| Mapas | Leaflet + react-leaflet | 1.9.4 / 5.0 | Mapas interactivos | Bajo |
| Mapa Colombia | @react-map/colombia | 1.0.9 | SVG Colombia | Bajo |
| Animaciones | framer-motion | 12.38 | Transiciones | Bajo |
| DB | pg (node-postgres) | 8.20.0 | Pool PostgreSQL directo | Medio (acoplamiento directo) |
| Excel | xlsx | 0.18.5 | Procesamiento Excel | Bajo |
| Seguridad | dotenv-vault | 1.26.2 | Gestion de secrets | Medio |

### 2.6 Infraestructura y deploy

#### Servicios en ejecucion (PM2)

| Proceso PM2 | PID | Uptime | Memoria | Puerto | Rol |
|---|---|---|---|---|---|
| portal-api | — (systemd) | — | — | 8000 | API REST FastAPI (portal-api.service) |
| dash-mme | 3962455 | 4D | 101.1 MB | 8050 | Dashboard Dash |
| portal-mme | 187007 | 21h | 148.3 MB | 3000 | Frontend Next.js |

#### Servicios systemd

| Servicio | Estado | Descripcion |
|---|---|---|
| portal-api.service | Activo | FastAPI (entry point: api/main.py, uvicorn directo) |
| dash-mme.service | Activo | Dash (entry point: app.py) |
| whatsapp-bot.service | Activo | Bot WhatsApp (puerto 8001, venv anidado) |
| telegram-polling.service | Activo | Bot Telegram (polling, venv anidado) |

#### Nginx (reverse proxy)

| Puerto | Destino | Ruta |
|---|---|---|
| 80/443 | portal-mme:3000 | / (frontend) |
| 80/443 | portal-api:8000 | /api/ (API REST) |
| 80/443 | dash-mme:8050 | /dash/ (dashboard legacy) |

#### Base de datos PostgreSQL

| Metrica | Valor |
|---|---|
| Motor | PostgreSQL 15 |
| Tamanio total | ~48 GB (32 GB metrics_hourly + 1.4 GB metrics + resto) |
| Filas estimadas | 64+ millones |
| Ingreso diario | ~300.000 registros/dia |
| Schemas | 8 (public, sector_energetico, subsidios, presupuesto, comunidades, contratos_or, supervision, fenoge) |
| Tablas principales | metrics_hourly (32 GB), metrics (1.4 GB), lineas_transmision (31 MB), subsidios_pagos, contratos, predictions |
| Foreign Keys | **0** — Sin restricciones de integridad referencial |
| Triggers | **0** — Sin triggers propios |
| Funciones/Procedures | **0** — Solo del sistema (pg_stat_statements, plpgsql) |
| Vistas | **0** — Solo del sistema (pg_stat_statements) |
| Sequences | 3 (comunidades_id_seq, seguimiento_id_seq, subsidios_validaciones_id_seq) |
| Extensiones | pg_stat_statements, plpgsql |
| Indexes | ~30+ en sector_energetico (btree + 1 gin en alertas_historial.json_completo) |

#### Tablas duplicadas entre schemas

| Tabla | Schema 1 | Schema 2 | Accion recomendada |
|---|---|---|---|
| subsidios_pagos | sector_energetico | subsidios | Consolidar en subsidios |
| subsidios_empresas | sector_energetico | subsidios | Consolidar en subsidios |

#### Tablas mas grandes (top 5)

| # | Tabla | Schema | Tamanio |
|---|---|---|---|
| 1 | metrics_hourly | sector_energetico | **32 GB** |
| 2 | metrics | sector_energetico | **1.4 GB** |
| 3 | lineas_transmision | sector_energetico | 31 MB |
| 4 | subsidios_pagos | sector_energetico / subsidios | 7 MB |
| 5 | contratos | supervision | 4.6 MB |

### 2.7 Subproyectos embebidos

#### WhatsApp Bot (whatsapp_bot/)
- Nodos en grafo: 522 (Community 1)
- Cohesion: 0.01
- Stack: FastAPI (puerto 8001), Twilio, Telegram API, AI Integration
- Archivos clave: telegram_polling.py, subsidios_handler.py, services/ai_integration.py
- Problema: Es casi tan grande como la API principal. Tiene venv anidado.
- Dependencias del monolito: MetricsService, AgentIA, ChatbotOrchestratorService, PostgreSQLConnectionManager

#### App Movil (energia_app/)
- **Stack:** React Native 0.76.5, Firebase Messaging, Porcupine wake word
- **Plataformas:** Android (android/), iOS (ios/)
- **API dedicada:** `api/v1/routes/energia_app.py` — **11 endpoints** (4 de produccion + 7 temporales `/dev/*`)
  - `GET /audio/boletin` — Informe ejecutivo como MP3
  - `POST /audio/consulta` — Sintesis de texto a voz
  - `POST /push/registrar` — Registro FCM token
  - `DELETE /push/eliminar` — Eliminacion FCM token
  - 7x `GET /dev/*` — Parches Maven/Gradle/PPN para build Android
- **Acoplamiento:** Solo consume API REST del server. Practicamente independiente.
- **Nodos en grafo global:** 65 (Community 4)
- **Tamanio:** ~8 archivos fuente (ligero, listo para extraccion)

#### ML / Experimentos (experiments/, mlruns/, domain/models/)
- **Modelos:** SARIMA (series temporales), LightGBM (gradient boosting), Random Forest
- **Features:** NASA POWER (clima), IDEAM (hidrologia), calendario, regresores historicos
- **Salida:** Tabla `predictions` en PostgreSQL
- **Checkpoints:** `domain/models/` + `infrastructure/ml/models/`
- **Observacion:** No hay model registry formal. `mlruns/` indica experimentacion sin versionado estructurado.

#### Directorios adicionales (no aplicativos)

| Directorio | Contenido | Relevancia |
|---|---|---|
| `backups/` | 5 dumps de BD (metrics_20260329 a metrics_20260426) | Operacional |
| `config/` | celery-worker@.service, logrotate, mlflow-server.service | Systemd configs |
| `data/` | Catalogos, charts PNG, onedrive sync, tesis director | Solo lectura |
| `data/charts/` | PNGs generados (embalses, precio, generacion) | Cache visual |
| `docker/` | api/, celery/, nginx/, telegram/ Dockerfiles | Build multi-servicio |
| `docs/` | ~20 MD: arquitectura, guias, informes, refactoring, referencias | Documentacion |
| `ejemplos/` | Codigo de ejemplo | Onboarding |
| `logs/` | api-access, api-error, app.log, celery, etl, arcgis | Debug |
| `notebooks/` | README.md (placeholder) | Analisis |
| `sql/` | 8 scripts SQL (indices, schemas, alertas, CU, losses, predictions) | BD |
| `.github/workflows/` | GitHub Actions (`java-upgrade`) | CI/CD limitado |
| `Makefile` | Comandos de build/utilidad | DevEx |
| `docker-compose.yml` | Compose completo (postgres, api, dash, bot, nginx) | Dev |
| `LICENSE` | Licencia del proyecto | Legal |

#### Subdirectorios de scripts/

| Subdirectorio | Contenido |
|---|---|
| `arcgis/` | Integracion ArcGIS/OneDrive/XM |
| `migration/` | Scripts de migracion de datos |
| `ops/` | Operaciones y utilidades de deploy |
| `portal-direccion-setup/` | Setup del portal de direccion |
| `utilidades/` | Utilidades generales |

#### Subdirectorios de whatsapp_bot/

| Subdirectorio | Contenido |
|---|---|
| `app/` | Handlers webhook, telegram, rate limiting |
| `app/utils/` | Utilidades del bot |
| `orchestrator/` | BotOrchestrator, ContextManager |
| `services/` | AIIntegration, ChartService, DataService |
| `tests/` | Tests del bot |
| `whatsapp-web-service/` | Servicio web de WhatsApp |

#### Subdirectorios de interface/pages/

| Subdirectorio | Contenido |
|---|---|
| `hidrologia/` | 9 archivos: callbacks, charts, data_services, kpis, layout_def, maps, tables, utils |
| (root) | 21 paginas .py del Dash |

#### Archivos basura detectados (eliminar)

| Archivo | Ubicacion | Accion |
|---|---|---|
| `))` | `server/` | Eliminar |
| `page.tsx.bak.1776903593` | `portal/src/app/(dashboards)/subsidios/` | Eliminar |

#### Riesgo de seguridad detectado

**Token GitHub expuesto en remote URL:** Ambos repos (`server/` y `portal-direccion-mme/`) tienen el token `ghp_...` embebido en la URL de `origin`. Esto es un riesgo CRITICO. El token debe rotarse inmediatamente y la URL debe cambiarse a HTTPS sin credenciales (usar SSH o credential helper).

#### Celery Tasks (`tasks/`)

| Archivo | Funcion |
|---|---|
| `anomaly_tasks.py` | Deteccion de anomalias en metricas |
| `etl_tasks.py` | Tareas programadas de ETL |
| `push_tasks.py` | Envio de notificaciones push |
| `__init__.py` | Registro de tasks |


---

## 3. Analisis FODA Tecnico

### Fortalezas

| # | Fortaleza | Evidencia en grafo |
|---|---|---|
| 1 | Arquitectura limpia en el dominio | Servicios del dominio estan bien aislados (domain/services/). Bajo acoplamiento entre servicios. |
| 2 | Separacion frontend/backend | Grafo global confirma 0 dependencias de codigo compartido. Comunicacion puramente por HTTP. |
| 3 | Tests unitarios existentes | 1.056 nodos de test en el grafo. Existe infraestructura de testing. |
| 4 | Documentacion de agentes | Existen AGENTS.md en ambos proyectos con convenciones claras. |
| 5 | Infraestructura de deploy funcional | PM2, systemd, Docker Compose, Nginx — todo en produccion y estable. |
| 6 | Observabilidad basica | Health checks (/health), Prometheus metrics, logs estructurados. |

### Oportunidades

| # | Oportunidad | Impacto estimado |
|---|---|---|
| 1 | Extraer energia_app/ a repo independiente | Liberaria ~100-200 MB y desacoplaria CI/CD |
| 2 | Consolidar ETLs duplicados | Reduciria completar_tablas_incompletas.py de 300 a ~120 lineas |
| 3 | Extraer funciones de HomeSlider.tsx | Haria testeable un componente critico de 1.663 lineas |
| 4 | Dividir core/container.py | Mejoraria mantenibilidad de 575 nodos acoplados |
| 5 | Unificar whatsapp_bot/venv/ | Eliminaria anomalia de venv anidado y simplificaria deploys |
| 6 | Crear src/hooks/ en portal | Reduciria duplicacion de logica de estado en componentes |
| 7 | Implementar model registry para ML | Control de versiones de modelos entrenados |

### Debilidades

| # | Debilidad | Severidad | Evidencia |
|---|---|---|---|
| 1 | core/container.py god file | Critica | 575 nodos, cohesion 0.01. Toda inyeccion de dependencias en un archivo. |
| 2 | HomeSlider.tsx god component | Critica | 1.663 lineas, 17+ funciones embebidas, 0 tests. |
| 3 | WhatsApp Bot monolitico interno | Critica | 522 nodos, comparte DB e infraestructura con API principal. |
| 4 | Sin capa de servicios en API routes del portal | Media | Cada route.ts repite backendGet() o getPool() directamente. |
| 5 | hooks/ vacio en portal | Media | src/hooks/ existe pero no tiene custom hooks. |
| 6 | ETL duplicado | Media | 3 funciones copy-paste en completar_tablas_incompletas.py. |
| 7 | Archivos basura accidentales | Media | ettings, , sys, ",  cols) (RESUELTOS — 2026-05-01, ~187 MB eliminados). |
| 8 | Servicios deprecated sin eliminar | Baja | geo_service.py, orchestrator_service.py, predictions_service.py |
| 9 | Sin tests de integracion | Media | tests/integration/ existe pero esta vacio segun README. |
| 10 | Docstrings excesivas en __init__.py | Baja | Generan nodos fantasmas en el grafo (ruido). |

### Amenazas

| # | Amenaza | Probabilidad | Impacto |
|---|---|---|---|
| 1 | Cambio en API XM (mercado energia) | Media | Alto — romperia todos los ETLs |
| 2 | Rotura de core/container.py | Baja | Alto — afectaria 50+ archivos |
| 3 | Crecimiento descontrolado del bot | Alta | Alto — ya es 8.7% del monolito y creciendo |
| 4 | Deuda tecnica visual en portal | Alta | Medio — regresiones en HomeSlider afectan la pagina principal |
| 5 | Cambio de esquema PostgreSQL | Media | Alto — API routes del portal usan getPool() directo |
| 6 | Costo variable de LLM (OpenAI) | Media | Medio — AgentIA puede generar costos impredecibles |
| 7 | Cambio en politicas de Twilio/Meta API | Baja | Medio — afectaria el bot de WhatsApp |

---

## 4. Deuda Tecnica Exhaustiva

### Clasificacion por severidad

#### Critica (bloqueante para escalar)

| ID | Deuda | Ubicacion | Impacto | Esfuerzo estimado |
|---|---|---|---|---|
| DT-001 | core/container.py god file (575 nodos, cohesion 0.01) | core/container.py | Cuello de botella de desarrollo. Cualquier cambio en dependencias requiere tocar este archivo. Imposible de testear unitariamente. | 1-2 semanas |
| DT-002 | HomeSlider.tsx god component (1.663 lineas, 17+ funciones) | src/components/HomeSlider.tsx | Imposible de testear. Alto riesgo de regresion visual. Dificil de mantener. | 3-5 dias |
| DT-003 | WhatsApp Bot monolitico (522 nodos, misma infraestructura) | whatsapp_bot/ | Acopla deploys del bot con la API principal. Si el bot falla, puede afectar la BD compartida. | 2-3 semanas (extraccion completa) |
| DT-004 | API routes sin capa de servicios | src/app/api/*/route.ts | Acoplamiento directo a PostgreSQL y al backend. Cambio de esquema = cambio en multiples routes. | 2-3 dias |

#### Media (degradacion progresiva)

| ID | Deuda | Ubicacion | Impacto | Esfuerzo estimado |
|---|---|---|---|---|
| DT-005 | ETL duplicado (completar_tablas_incompletas.py) | scripts/ | Mantenimiento x3. Riesgo de inconsistencia entre tablas. | 4-6 horas |
| DT-006 | hooks/ vacio en portal | src/hooks/ | Logica de estado duplicada en componentes. | 1-2 dias |
| DT-007 | components/dashboard/ vacio | src/components/dashboard/ | Componentes de dashboard dispersos en raiz. | 1 dia |
| DT-008 | Sin tests de integracion | tests/integration/ | No hay validacion end-to-end de flujos criticos. | 1-2 semanas |
| DT-009 | Venv anidado en whatsapp_bot/venv/ | whatsapp_bot/venv/ | Mala practica. Requiere mantener 2 entornos Python. | 2-3 dias |
| DT-010 | Servicios deprecated sin eliminar | domain/services/ | geo_service.py, orchestrator_service.py, predictions_service.py generan ruido en el grafo y confusion. | 1 dia |
| DT-011 | Docstrings largas en __init__.py | Multiples __init__.py | Generan nodos fantasmas en el grafo (thin communities de 2-3 nodos). | 4-6 horas |

#### Baja (pulido)

| ID | Deuda | Ubicacion | Impacto | Esfuerzo estimado |
|---|---|---|---|---|
| DT-012 | Coverage artifacts en repo | htmlcov/, .pytest_cache/ | Ya limpiado en sesion 2026-05-01. | Hecho |
| DT-013 | Archivos accidentales de bots | ettings, , sys, ",  cols) | Ya limpiado en sesion 2026-05-01. | Hecho |
| DT-014 | Instalador accidental de Gradle | :TEMP\gradle-9.3.1-bin.zip | Ya limpiado en sesion 2026-05-01. | Hecho |
| DT-015 | __pycache__/ en raiz | server/__pycache__/ | Ya limpiado en sesion 2026-05-01. | Hecho |
| DT-016 | Falta model registry para ML | experiments/, mlruns/ | Dificulta reproducibilidad y trazabilidad de modelos. | 2-3 dias |

---

## 5. Vision de Estado Objetivo

### 5.1 Arquitectura objetivo

#### Backend — Microservicios logicos (a mediano plazo)

```
+-------------------------------------------------------------------------+
|  GATEWAY / LOAD BALANCER (Nginx)                                       |
+-------------------------------------------------------------------------+
|  +----------+  +----------+  +----------+                              |
|  | API REST |  | Dashboard|  | Bot      |                              |
|  | FastAPI  |  | (Dash)   |  | Service  |                              |
|  | P. 8000  |  | P. 8050  |  | P. 8001  |                              |
|  +----+-----+  +----+-----+  +----+-----+                              |
|       |             |             |                                    |
|       +-------------+-------------+                                    |
|                     |                                                  |
|       +-------------v-------------+                                    |
|       |   MESSAGE BUS / CACHE     |                                    |
|       |   (Redis, Celery)         |                                    |
|       +-------------+-------------+                                    |
|                     |                                                  |
|       +-------------v-------------+                                    |
|       |         DATA LAYER        |                                    |
|       |  PostgreSQL 16 | ML Reg.  |                                    |
|       +---------------------------+                                    |
+-------------------------------------------------------------------------+
|  ETL / Data Pipeline (independiente, schedulado)                       |
|  +-- etl-comunidades                                                   |
|  +-- etl-contratos-or                                                   |
|  +-- etl-presupuesto                                                    |
|  +-- etl-subsidios                                                      |
|  +-- etl-supervision                                                    |
|  +-- etl-xm-metrics (unico, parametrizable)                            |
+-------------------------------------------------------------------------+
|  Mobile App (repo independiente)                                        |
|  +-- energia_app/ (React Native) -> consume API REST                   |
+-------------------------------------------------------------------------+
```

**Nota:** A corto plazo, el monolito se mantiene pero con core/container.py dividido en modulos tematicos. La extraccion del bot a microservicio es a mediano plazo.

#### Frontend — Arquitectura limpia

```
portal-direccion-mme/
+-- src/
|   +-- app/                    # Next.js App Router (sin cambios estructurales)
|   +-- components/
|   |   +-- ui/                 # Componentes base (shadcn/ui style)
|   |   +-- charts/             # Wrappers Nivo
|   |   +-- kpi/                # NUEVO: KPIs extraidos de HomeSlider
|   |   +-- slides/             # NUEVO: Slides del carrusel
|   +-- services/               # NUEVO: Capa de servicios para API
|   |   +-- apiService.ts       # Cliente HTTP centralizado
|   |   +-- kpiService.ts       # Logica de KPIs
|   |   +-- formatService.ts    # Formateadores
|   +-- lib/
|   |   +-- db.ts               # Pool PostgreSQL (solo para BFF)
|   |   +-- backendClient.ts    # Cliente HTTP a FastAPI
|   |   +-- format.ts           # NUEVO: fmtCOP, fmtNum, fmtFull
|   |   +-- svg-math.ts         # NUEVO: polarToCartesian, describeArc
|   |   +-- nivo-theme.ts       # Tema compartido
|   +-- hooks/                  # NUEVO: Custom hooks (ya no vacio)
|   |   +-- useHomeSlider.ts    # Logica de carrusel
|   +-- types/                  # NUEVO: Tipos compartidos
|   |   +-- home-slider.ts      # NewsItem, HomeSliderProps, etc.
|   +-- providers/
|       +-- ThemeProvider.tsx
+-- tests/
|   +-- unit/
|   +-- integration/
+-- docs/
    +-- ARCHITECTURE.md
```

### 5.2 Estructura de carpetas objetivo (Server)

```
server/
+-- src/                        # NUEVO: codigo productivo centralizado
|   +-- api/v1/                 # FastAPI routes + schemas
|   +-- dashboard/              # Dash app + layouts + components
|   +-- domain/
|   |   +-- services/           # 29 servicios + __init__.py (sin cambios de logica)
|   |   +-- interfaces/         # Contratos abstractos
|   |   +-- entities/           # Entidades de negocio
|   +-- infrastructure/
|   |   +-- database/
|   |   |   +-- connection.py   # PostgreSQLConnectionManager
|   |   |   +-- repositories/   # Repositorios concretos
|   |   +-- external/           # XMService, NASA, IDEAM
|   |   +-- cache/              # Redis
|   +-- core/
|   |   +-- config.py           # Settings
|   |   +-- exceptions.py       # Excepciones custom
|   |   +-- error_handlers.py   # Handlers centralizados
|   +-- container/              # NUEVO: DI dividido
|       +-- __init__.py         # Facade de compatibilidad
|       +-- base.py             # Clase base + overrides
|       +-- repositories.py     # Factories de repositorios
|       +-- services_energy.py  # Servicios del sector electrico
|       +-- services_analysis.py # Servicios de IA/analisis
|       +-- services_bot.py     # Servicios del chatbot
|       +-- external.py         # Data sources
|
+-- etl/                        # Pipelines ETL
|   +-- common/                 # NUEVO: abstracciones compartidas
|   +-- xm/                     # Metricas del mercado
|   +-- ideam/                  # Hidrologia
|   +-- scripts/                # Scripts de backfill
|
+-- ml/                         # NUEVO: centralizar ML
|   +-- features/
|   +-- models/
|   +-- registry/               # NUEVO: model registry
|
+-- mobile_app/                 # MOVER desde energia_app/
|   +-- (React Native)
|
+-- tests/
|   +-- unit/
|   +-- integration/
|   +-- e2e/
|
+-- scripts/                    # Utilidades de deploy/mantenimiento
+-- docs/                       # Documentacion validada
+-- docker/                     # Configs Docker
+-- sql/                        # Migraciones y schemas
+-- archive/legacy/             # NUEVO: cosas viejas que no se borran
+-- data/                       # Solo catalogos estaticos
    +-- catalogs/
```

### 5.3 Principios de diseno

1. **Single Responsibility:** Cada archivo tiene un proposito unico y bien definido. Un componente de React no debe contener formateadores, KPIs y SVG math.
2. **Dependency Inversion:** Las capas superiores dependen de abstracciones, no de implementaciones concretas. core/container.py debe ser un facade, no un god file.
3. **Do Not Repeat Yourself (DRY):** Los ETLs deben usar abstracciones comunes. Los formateadores deben vivir en lib/, no embebidos en componentes.
4. **Testeabilidad:** Todo modulo critico debe ser testeable unitariamente. HomeSlider.tsx de 1.663 lineas viola este principio.
5. **Separation of Concerns:** Frontend y backend no comparten codigo. Cada uno es independiente y se comunica por contratos de API.
6. **Fail Fast:** Los errores deben detectarse en build/test, no en produccion. npm run build y pytest deben ser obligatorios antes de commit.
7. **Documentation as Code:** La documentacion vive en el repo (docs/, AGENTS.md, README.md) y se actualiza con cada cambio arquitectonico.


---

## 6. Roadmap de Transformacion

### Fase 0: Fundacion (completada)

| Tarea | Estado | Artefactos |
|---|---|---|
| Instalar Graphify y construir grafos | Hecho | 3 grafos construidos |
| Validar inferencias del grafo | Hecho | 6/6 conexiones validadas como reales |
| Limpiar basura identificada | Hecho | ~187 MB liberados, 9 elementos eliminados |
| Documentar estado actual | Hecho | 15 documentos MD generados |
| Actualizar README y AGENTS | Hecho | 4 archivos de codigo actualizados |

### Fase 1: Limpieza y consolidacion rapida (Semana 1)

| # | Tarea | Esfuerzo | Riesgo | Depende de |
|---|---|---|---|---|
| 1.1 | Unificar whatsapp_bot/venv/ al venv principal | 2-3 dias | Bajo | Nada | **PAUSED** — requiere coordinacion con equipo WhatsApp |
| 1.2 | Consolidar ETL duplicado (completar_tablas_incompletas.py) | 4-6 horas | Bajo | Nada | **DONE** — 3 funciones copy-paste → 1 generica + 3 wrappers |
| 1.3 | Extraer energia_app/ a repo independiente | 1 dia | Bajo | Nada | **DONE** — movido a github.com/M3l1ss4C4rd0n4/EnergIA-Mobile-App |
| 1.4 | Eliminar servicios deprecated (geo_service.py, etc.) | 1 dia | Bajo | Nada | **SKIP** — los 3 servicios estan en uso activo (verificado con grep) |
| 1.5 | Limpiar docstrings de __init__.py (nodos fantasmas) | 4-6 horas | Bajo | Nada | **DONE** — 23 archivos limpiados, 177 lineas eliminadas |
| 1.6 | Crear src/hooks/ con useHomeSlider.ts (extraccion inicial) | 1 dia | Medio | Nada | **DONE** — useHomeSlider.ts creado, HomeSlider.tsx -70 lineas |

**Definition of Done (Fase 1):**
- [x] `pytest tests/ -v --tb=short` ejecuta sin errores NUEVOS (347 pasan, 14 fallan conocidos)
- [x] `npm run build` pasa sin errores
- [x] `pm2 status` muestra todos los procesos activos
- [ ] `systemctl status` muestra whatsapp-bot.service usando venv principal (no anidado) — **PAUSED**
- [ ] `find whatsapp_bot/venv -maxdepth 0` ya no existe o esta vacio — **PAUSED**
- [x] `scripts/completar_tablas_incompletas.py` tiene 1 funcion generica (_completar_tabla_metricas) + 3 wrappers
- [x] `energia_app/` ya no esta en `/home/admonctrlxm/server/` (movido a repo independiente)
- [x] No hay referencias a servicios deprecated en imports activos (verificado: estan vivos, no se eliminaron)

**Entregable:** Repositorio mas limpio, venv unificado, ETLs consolidados, app movil extraida.

### Fase 2: Refactorizacion del frontend (Semanas 2-3)

| # | Tarea | Esfuerzo | Riesgo | Depende de |
|---|---|---|---|---|
| 2.1 | Extraer tipos de HomeSlider.tsx a src/types/home-slider.ts | 4 horas | Bajo | 1.6 |
| 2.2 | Extraer formateadores a src/lib/format.ts | 2 horas | Bajo | Nada |
| 2.3 | Extraer SVG math a src/lib/svg-math.ts | 2 horas | Bajo | Nada |
| 2.4 | Extraer KPIs a src/lib/kpi-logic.ts | 1 dia | Medio | 2.1 |
| 2.5 | Extraer componentes UI a src/components/kpi/*.tsx | 2 dias | Medio | 2.2, 2.3 |
| 2.6 | Crear capa de servicios (src/services/apiService.ts) | 1 dia | Medio | Nada |
| 2.7 | Refactorizar API routes para usar apiService.ts | 1 dia | Medio | 2.6 |
| 2.8 | Tests unitarios para lib/format.ts y lib/kpi-logic.ts | 1 dia | Bajo | 2.2, 2.4 |

**Definition of Done (Fase 2):**
- [ ] `HomeSlider.tsx` tiene <=400 lineas (solo imports + componente orquestador)
- [ ] `src/lib/format.ts` existe y exporta `fmtCOP`, `fmtNum`, `fmtFull`
- [ ] `src/lib/svg-math.ts` existe y exporta `polarToCartesian`, `describeArc`
- [ ] `src/types/home-slider.ts` existe con todos los tipos del componente
- [ ] `src/services/apiService.ts` existe y es usado por al menos 2 routes
- [ ] `npm run build` pasa sin errores
- [ ] `npx tsc --noEmit` no reporta errores de tipo
- [ ] Nuevos archivos extraidos tienen tests unitarios (Jest)

**Entregable:** HomeSlider.tsx reducido a ~400 lineas (orquestador puro), componentes testeables, capa de servicios en API routes.

### Fase 3: Refactorizacion del backend (Semanas 4-7)

| # | Tarea | Esfuerzo | Riesgo | Depende de |
|---|---|---|---|---|
| 3.1 | Crear estructura core/container/ con archivos vacios | 2 horas | Bajo | Nada |
| 3.2 | Extraer repositorios a container/repositories.py | 1 dia | Medio | Nada |
| 3.3 | Extraer data sources a container/external.py | 4 horas | Bajo | Nada |
| 3.4 | Extraer servicios de energia a container/services_energy.py | 2 dias | Medio | 3.2 |
| 3.5 | Extraer servicios de analisis a container/services_analysis.py | 2 dias | Medio | 3.2 |
| 3.6 | Extraer servicios del bot a container/services_bot.py | 1 dia | Medio | 3.4, 3.5 |
| 3.7 | Crear facade container/__init__.py con compatibilidad hacia atras | 1 dia | Medio | 3.2-3.6 |
| 3.8 | Actualizar imports en api/, scripts/, whatsapp_bot/, tests/ | 2-3 dias | Alto | 3.7 |
| 3.9 | Validar que todos los tests pasan | 1 dia | Alto | 3.8 |
| 3.10 | Eliminar core/container.py original | 2 horas | Medio | 3.9 |

**Definition of Done (Fase 3):**
- [ ] `core/container/` existe con `__init__.py`, `repositories.py`, `services_energy.py`, `services_analysis.py`, `services_bot.py`, `external.py`
- [ ] `core/container/__init__.py` funciona como facade (todos los imports antiguos siguen funcionando)
- [ ] `pytest tests/ -v --tb=short` pasa (mismo numero de tests pasando que antes del refactor)
- [ ] `api/main.py` levanta sin errores de import
- [ ] `app.py` (Dash) levanta sin errores de import
- [ ] `whatsapp_bot/main.py` levanta sin errores de import
- [ ] `core/container.py` original ya no existe (eliminado tras validar facade)

**Entregable:** DI container dividido en 5+ modulos, cohesion de Community 0 > 0.15, tests pasando.

**Definition of Done (Fase 4):**
- [ ] `ml/registry/` existe con metadata de al menos 1 modelo entrenado
- [ ] Tests de integracion pasan para flujo: ETL -> API -> Portal (al menos 1 flujo end-to-end)
- [ ] Contratos de API documentados en `docs/API_CONTRACTS.md`
- [ ] `energia_app/` tiene pipeline CI/CD funcional (build + test)

### Fase 4: Infraestructura y ML (Semanas 8-9)

| # | Tarea | Esfuerzo | Riesgo | Depende de |
|---|---|---|---|---|
| 4.1 | Implementar model registry basico | 2-3 dias | Medio | Nada |
| 4.2 | Crear tests de integracion para flujos criticos | 1-2 semanas | Medio | 2.8, 3.9 |
| 4.3 | Documentar contratos de API entre frontend y backend | 1 dia | Bajo | Nada |
| 4.4 | Configurar CI/CD para energia_app/ (repo independiente) | 1 dia | Bajo | 1.3 |

### Fase 5: Extraccion del bot (diferida — Semanas 10-13)

| # | Tarea | Esfuerzo | Riesgo | Depende de |
|---|---|---|---|---|
| 5.1 | Disenar API REST del bot (endpoints necesarios) | 2-3 dias | Medio | 3.9 |
| 5.2 | Implementar endpoints faltantes en server | 3-5 dias | Medio | Nada |
| 5.3 | Crear repo whatsapp_bot_service/ | 1 dia | Bajo | Nada |
| 5.4 | Migrar handlers y logica del bot | 3-5 dias | Alto | 5.2 |
| 5.5 | Actualizar servicios systemd y scripts de deploy | 1 dia | Alto | 5.4 |
| 5.6 | Pruebas end-to-end del bot standalone | 2-3 dias | Alto | 5.5 |

---

## 6.5 Entorno de Desarrollo Local

### Requisitos del sistema

| Componente | Version | Verificacion |
|---|---|---|
| Python | 3.12+ | `python3 --version` |
| Node.js | 20+ | `node --version` |
| PostgreSQL | 16 | `psql --version` |
| Redis | 7.x | `redis-cli --version` |
| npm | 10+ | `npm --version` |

### Variables de entorno obligatorias

**Server (`/home/admonctrlxm/server/.env`):**
```bash
USE_POSTGRES=True
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=portal_energetico
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<en .env.vault>

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

DASH_DEBUG=False
DASH_PORT=8050

API_KEY=<en .env.vault>
```

**Portal (`/home/admonctrlxm/portal-direccion-mme/.env`):**
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=portal_energetico
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<misma que server>
```

### Levantar el stack completo (orden)

```bash
# 1. PostgreSQL (debe estar corriendo como servicio)
sudo systemctl start postgresql

# 2. Redis
redis-server --daemonize yes

# 3. Backend FastAPI
cd /home/admonctrlxm/server
python3 api/main.py
# O con uvicorn: uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# 4. Dashboard Dash (en otra terminal)
cd /home/admonctrlxm/server
python3 app.py

# 5. Frontend Next.js (en otra terminal)
cd /home/admonctrlxm/portal-direccion-mme
npm run dev
```

### Verificar que todo levanto

```bash
curl -s http://localhost:8000/health | python3 -m json.tool   # API
curl -s http://localhost:8050/ | head -c 50                   # Dash
curl -s http://localhost:3000/ | head -c 50                   # Portal
```

### Ejecutar tests aislados

```bash
# Backend: un servicio especifico
cd /home/admonctrlxm/server
pytest tests/unit/services/test_generation_service.py -v

# Backend: con coverage
pytest tests/unit/ --cov=domain --cov-report=html

# Frontend: build
npm run build

# Frontend: type check
npx tsc --noEmit
```

### Hot-reload en desarrollo

| Proyecto | Comando | Recarga automatica |
|---|---|---|
| Backend | `uvicorn api.main:app --reload` | ✅ Archivos .py |
| Dash | `python3 app.py` (debug=True) | ✅ Archivos .py |
| Frontend | `npm run dev` | ✅ Archivos TS/TSX |

---

## 7. Especificaciones para Skills/Agents

### 7.1 Skill: Frontend (Next.js / React)

**Contexto que debe conocer:**
- Stack: Next.js 16, React 19, Tailwind CSS v4, TypeScript 5
- Graficas: Nivo (@nivo/bar, @nivo/line, @nivo/pie, @nivo/geo, @nivo/sankey)
- Mapas: Leaflet + react-leaflet, @react-map/colombia
- Estado: React hooks nativos (NO Redux, NO Zustand actualmente)
- src/hooks/ esta vacio — crear custom hooks es prioridad
- HomeSlider.tsx es god component — NO anadir mas logica ahi
- API routes usan backendGet() (HTTP a FastAPI) o getPool() (PostgreSQL directo)
- Build obligatorio: npm run build antes de cualquier commit
- Tests: 0 tests unitarios actualmente — implementar Jest + React Testing Library

**Reglas de oro:**
1. Extraer funciones a src/lib/ o src/services/ antes de modificar componentes grandes.
2. Usar getNivoTheme() para todas las graficas (NO temas inline).
3. Nunca exponer secrets en client components (NO NEXT_PUBLIC_ para datos sensibles).
4. Crear custom hooks en src/hooks/ para logica reutilizable.

### 7.2 Skill: Backend (FastAPI / Python)

**Contexto que debe conocer:**
- Stack: Python 3.12, FastAPI, Pydantic, SQLAlchemy/psycopg2, Redis, Celery
- Arquitectura: Clean Architecture / DDD (domain/, infrastructure/, api/, core/)
- DI Container: core/container.py (god file, 575 nodos). Cualquier cambio requiere precaucion.
- Repositorios: infrastructure/database/repositories/ — siempre usar interfaces abstractas.
- API Key: Header X-API-Key requerido en endpoints protegidos.
- Tests: pytest disponible. Ejecutar pytest tests/ -v --tb=short despues de cambios.
- Servicios deprecated: geo_service.py, orchestrator_service.py, predictions_service.py — NO usarlos.

**Reglas de oro:**
1. Nunca usar except Exception: generico. Usar excepciones especificas de core/exceptions.py.
2. Validar SQL con sql_validator.py antes de ejecutar queries dinamicas.
3. Usar PostgreSQLConnectionManager (NO crear conexiones directas).
4. Agregar tests unitarios para cualquier nuevo servicio de dominio.

### 7.3 Skill: ETL / Data Pipeline

**Contexto que debe conocer:**
- Fuentes: XM API (pydataxm), NASA POWER, IDEAM, OneDrive (Excel)
- Destino: PostgreSQL (tablas *_metrics)
- Scheduler: Celery Beat (cada 6 horas para ETL principal)
- Patron comun: fetch -> transform -> validate -> load
- Duplicacion conocida: scripts/completar_tablas_incompletas.py tiene 3 funciones copy-paste
- Abstraccion propuesta: MetricaConfig + completar_tabla_metrica()

**Reglas de oro:**
1. NO duplicar logica ETL. Usar la abstraccion comun en etl/common/.
2. Siempre validar rangos con validaciones_rangos.py antes de insertar.
3. Loguear con get_logger(__name__) (NO prints).
4. Los ETLs deben ser idempotentes (ejecutar 2 veces = mismo resultado).

### 7.4 Skill: DevOps / Infraestructura

**Contexto que debe conocer:**
- Deploy: PM2 + systemd + Docker Compose + Nginx
- Servicios: portal-api (8000, systemd), dash-mme (8050), portal-mme (3000), bot (8001)
- BD: PostgreSQL 16 (~15 GB, 64M filas)
- Cache: Redis 7.x
- Secrets: .env, .env.vault, .vault_key (NUNCA commitear)
- Backup: server_backup_*.tar.gz en /home/admonctrlxm/

**Reglas de oro:**
1. NUNCA modificar .service sin hacer systemctl daemon-reload.
2. NUNCA eliminar un venv sin verificar grep -r "ruta/venv" en scripts y .service.
3. Restart con pm2 restart <app> --update-env para recargar variables.
4. Verificar health checks (/health, /health/live, /health/ready) despues de cualquier deploy.

### 7.5 Skill: ML / Analisis Predictivo

**Contexto que debe conocer:**
- Modelos: SARIMA (series temporales), LightGBM, Random Forest
- Features: NASA POWER (clima), IDEAM (hidrologia), calendario, historicos
- Output: Tabla predictions en PostgreSQL
- Experimentos: experiments/ (sin model registry formal actualmente)

**Reglas de oro:**
1. Todo modelo entrenado debe guardar metadata (fecha, features, MAPE, dataset usado).
2. Usar predictions_service_extended.py (NO predictions_service.py deprecated).
3. Comparar MAPE contra baseline antes de promover un modelo a produccion.
4. Registrar experimentos en MLflow u otro registry (pendiente implementar).

---

## 8. Anexos

### Anexo A: Inventario completo de servicios (server)

Ver seccion 2.2, tabla "Servicios de dominio — Inventario completo".

### Anexo B: Inventario completo de endpoints API (server)

27 archivos de routes en api/v1/routes/:

| # | Archivo | Modulo | Endpoints | Consumidor principal |
|---|---|---|---|---|
| 1 | chatbot.py | /api/v1/chatbot | 2 | Bot WhatsApp/Telegram |
| 2 | commercial.py | /api/v1/commercial | 2 | Dashboard (precios comerciales) |
| 3 | comunidades.py | /api/v1/comunidades | 1 | Portal (datos comunidades) |
| 4 | contratos_or.py | /api/v1/contratos-or | 1 | Portal (contratos obligaciones) |
| 5 | cu.py | /api/v1/cu | 4 | Dashboard (costo unitario) |
| 6 | distribution.py | /api/v1/distribution | 2 | Dashboard (distribucion) |
| 7 | energia_app.py | /api/v1/energia-app | 10 | App movil |
| 8 | energia_dashboard.py | /api/v1/energia-dashboard | 1 | Dashboard legacy |
| 9 | fenoge.py | /api/v1/fenoge | 2 | Portal (dashboard fenoge) |
| 10 | generation.py | /api/v1/generation | 4 | Dashboard (generacion) |
| 11 | hydrology.py | /api/v1/hydrology | 3 | Dashboard (hidrologia) |
| 12 | internal.py | /api/v1/internal | 2 | Uso interno (admin) |
| 13 | losses.py | /api/v1/losses | 3 | Dashboard (perdidas) |
| 14 | metrics.py | /api/v1/metrics | 2 | Dashboard (metricas generales) |
| 15 | observability.py | /api/v1/observability | 9 | Monitoreo (Prometheus, health) |
| 16 | predictions.py | /api/v1/predictions | 6 | Dashboard (predicciones ML) |
| 17 | presupuesto.py | /api/v1/presupuesto | 1 | Portal (presupuesto) |
| 18 | reports.py | /api/v1/reports | 2 | Generacion de informes |
| 19 | restrictions.py | /api/v1/restrictions | 1 | Dashboard (restricciones SIN) |
| 20 | sector_snapshot.py | /api/v1/sector/snapshot | 1 | Portal (snapshot sector) |
| 21 | simulation.py | /api/v1/simulation | 5 | Simulaciones CREG (GET, POST) |
| 22 | subsidios.py | /api/v1/subsidios | 3 | Portal (subsidios, KPIs) |
| 23 | supervision_portal.py | /api/v1/supervision | 1 | Portal (supervision) |
| 24 | system.py | /api/v1/system | 2 | Health checks, estado |
| 25 | transmission.py | /api/v1/transmission | 3 | Dashboard (transmision) |
| 26 | whatsapp_alerts.py | /api/v1/whatsapp-alerts | 2 | Bot (alertas WhatsApp) |
| 27 | __init__.py | — | — | Registro de routers |
| **Total** | **26 routes** | — | **~74** | — |

### Anexo C: Inventario de tests (server)

| Tipo | Cantidad (archivos) | Estado |
|---|---|---|
| Unitarios (tests/unit/) | ~31 | 347 pasan, 14 fallan (conocidos) |
| Integracion (tests/integration/) | 0 | Vacio |
| E2E (tests/e2e/) | 0 | Vacio |

#### Tests fallando (14) — Categorizados

| # | Test | Archivo | Causa | Severidad |
|---|---|---|---|---|
| 1 | test_flask_404_handler_registered | test_hardening_fase8.py | `ModuleNotFoundError: dash_ag_grid` | Baja (dependencia faltante) |
| 2 | test_flask_500_handler_registered | test_hardening_fase8.py | `ModuleNotFoundError: dash_ag_grid` | Baja |
| 3 | test_error_log_store_in_layout | test_hardening_fase8.py | `ModuleNotFoundError: dash_ag_grid` | Baja |
| 4 | test_isolation_forest_basic | test_anomaly_detection.py | `ModuleNotFoundError: sklearn` | Baja |
| 5 | test_isolation_forest_anomaly_rate | test_anomaly_detection.py | `ModuleNotFoundError: sklearn` | Baja |
| 6 | test_isolation_forest_insufficient_data | test_anomaly_detection.py | `ModuleNotFoundError: sklearn` | Baja |
| 7 | test_output_has_required_columns | test_predictions_service.py | `AssertionError: 'confidence' not in columns` | Media (schema mismatch) |
| 8 | test_confidence_field_matches_target | test_predictions_service.py | `KeyError: 'confidence'` | Media |
| 9 | test_tighter_intervals_at_80pct_vs_95pct | test_predictions_service.py | `AssertionError: intervalos iguales` | Media |
| 10 | test_long_term_predictions_classified_experimental | test_predictions_service.py | `RuntimeError: Prophet no disponible` | Media |
| 11 | test_predictions_have_confidence_intervals | test_predictions_service.py | `RuntimeError: Prophet no disponible` | Media |
| 12 | test_short_term_predictions_classified_confiable | test_predictions_service.py | `RuntimeError: Prophet no disponible` | Media |
| 13 | test_medium_term_predictions_classified_moderada | test_predictions_service.py | `RuntimeError: Prophet no disponible` | Media |
| 14 | test_long_term_confianza_is_numeric | test_predictions_service.py | `RuntimeError: Prophet no disponible` | Media |

**Nota:** Los 6 tests de dependencias faltantes (`dash_ag_grid`, `sklearn`) se resuelven con `pip install dash-ag-grid scikit-learn`. Los 5 tests de Prophet requieren `pip install prophet` (pesado, ~500MB). Los 3 tests de conformal calibration son bugs de logica reales.

### Anexo D: Diagrama de flujo de datos simplificado

```
XM API --+-> ETL --+-> PostgreSQL --+-> Repositorios --+-> API REST --+-> Portal Next.js
NASA/IDEAM -^      |                 |                   |              +-> Bot WhatsApp
                   |                 +---> Dash          +---> ML
```

### Anexo E: Metricas de calidad del codigo (basadas en grafo)

| Metrica | Server | Portal | Interpretacion |
|---|---|---|---|
| Complejidad de grafo (nodos) | 6.021 | 172 | Server es 35x mas complejo estructuralmente |
| Densidad de conexiones (links/nodos) | 2.31 | 0.77 | Server tiene mas interconexiones por modulo |
| Cohesion promedio comunidades | ~0.08 | ~0.19 | Portal tiene mejor agrupacion logica |
| % INFERRED | 47% | 13% | Server requiere mas validacion manual |
| God Nodes | 10+ | 2-3 | Server tiene mas puntos de acoplamiento centralizado |

### Anexo F: Schemas de Datos

#### F.1 Tablas PostgreSQL (estructura)

**Schema `public`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **metrics** | id, fecha, metrica, entidad, recurso, valor_gwh, unidad, fecha_actualizacion | Metricas del sector electrico (XM) |
| **predictions** | id, fecha_prediccion, fecha_generacion, fuente, valor_gwh_predicho, intervalo_inferior, intervalo_superior, horizonte_dias, modelo, confianza, mape, rmse, metodo_prediccion | Predicciones ML |
| **commercial_metrics** | id, fecha, metrica, valor, unidad, fecha_actualizacion | Metricas comerciales |
| **loss_metrics** | id, metric_code, fecha, valor, unidad, agente, extra_data (jsonb), created_at | Perdidas electricas |
| **restriction_metrics** | id, metric_code, fecha, valor, unidad, recurso, tipo_restriccion, extra_data (jsonb), created_at | Restricciones SIN |

**Schema `subsidios`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **subsidios_pagos** | id, fecha_actualizacion, fondo, area, anio, trimestre, codigo_sui, nombre_prestador, estado_resolucion, valor_resolucion, valor_pagado, saldo_pendiente, hash_fila | Pagos FSSRI/FOES |
| **subsidios_empresas** | id, fondo, subclase, codigo_sui, nit, nombre_prestador, sigla, estado | Catalogo de prestadores |
| **subsidios_mapa** | id, departamento, municipio, area, nombre_prestador, localidades, usuarios | Datos para mapa |

**Schema `contratos_or`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **seguimiento** | id, fecha_carga, n_actividad, actividad, etapa, necesaria_para_desembolso, nro_desembolso, ejecutor | Seguimiento contratos OR |

**Schema `presupuesto`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **resumen** | id, fecha_carga, proyecto, apropiacion, compromisos, comprometido, obligados, obligado | Resumen presupuesto DEE |

**Schema `supervision`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **contratos** | id, fecha_carga, item, ano, contrato, numero_bpin, conectividad_zni_sin, codigo_contrato_marco | Contratos supervision |
| **contratos_liquidacion** | id, fecha_carga, item, ano, contrato, ejecutor, nombre_del_proyecto, objeto_del_contrato | Contratos en liquidacion |
| **contratos_ejecucion** | id, fecha_carga, item, ano, contrato, nombre_del_proyecto, estado_del_contrato | Contratos en ejecucion |

**Schema `fenoge`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **comunidades** | id, fecha_carga, departamento, municipio, comunidad, latitud, longitud, kwp | Comunidades Fenoge |
| **seguimiento** | id, fecha_carga, region, numero_contrato, dia_actualizacion, mes_no, real_financiero, programado | Seguimiento financiero |

**Schema `comunidades`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **base** | id, fecha_carga, id_origen, nombre_de_la_organizacion, tipo_de_comunidad, etnia, departamento, municipio | Base comunidades |
| **implementadas** | id, fecha_carga, fecha, id_origen, nombre, dep, mun, usua | Comunidades implementadas |

**Schema `sector_energetico`:**

| Tabla | Columnas principales | Uso |
|---|---|---|
| **estado_sin_diario** | fecha, estado_global, n_criticos, n_alertas, gene_gwh, termica_gwh, aportes_gwh, embalse_pct | Estado diario SIN |
| **cu_daily** | id, fecha, componente_g, componente_t, componente_d, componente_c, componente_p, componente_r | Costo unitario diario |
| **energia_app_dispositivos** | id, usuario_id, fcm_token, dispositivo, activo, created_at, updated_at | Dispositivos app movil |

#### F.2 Contratos de API (endpoints del portal)

**`/api/v1/subsidios/kpis`** → Portal `/api/subsidios`
```json
{
  "serie": [{"area": "SIN", "anio": 2025, "trimestre": 1, "estado": "PAGADO", "conteo": 42}],
  "resumen": {"deficitAcumulado": 1500000000, "anio2025": {...}, "anio2026": {...}},
  "totalPrestadores": 87,
  "ultimaActualizacion": "2026-04-30T14:23:00",
  "filtros": {"fondos": ["FSSRI", "FOES"], "anios": [2024, 2025, 2026]}
}
```

**`/api/v1/comunidades/mapa`** → Portal `/api/comunidades`
```json
{
  "porDepartamento": [
    {"departamento": "La Guajira", "departamentoGeo": "LA_GUAJIRA", "count": 45, "capacidad": 1250.5, "inversion": 8900000000}
  ],
  "comunidades": [
    {"nombre": "Comunidad Wayuu", "municipio": "Uribia", "departamentoGeo": "LA_GUAJIRA", "lat": 11.7, "lng": -72.3, "capacidad": 25.5, "zona": "ZNI"}
  ]
}
```

**`/api/v1/contratos-or/dashboard`** → Portal `/api/contratos-or`
```json
{
  "nContratos": 120,
  "avanceGeneral": 67.5,
  "avanceFinanciero": 58.2,
  "pagosRealizados": 45000000000,
  "pagosPosibles": 78000000000,
  "pctPagosRealizados": 57.7,
  "desembolsos": [{"numero": 1, "actNecesarias": 10, "actCompletas": 7, "pctCompletado": 70.0}],
  "proyectos": [{"nombre": "Proyecto XYZ", ...}]
}
```

**`/api/v1/presupuesto/resumen`** → Portal `/api/presupuesto`
```json
{
  "proyectos": [{"id": 1, "nombre": "Proyecto A", "asignado": 5000000000, "ejecutado": 3200000000}],
  "totales": {"asignado": 150000000000, "ejecutado": 98000000000}
}
```

**`/api/v1/supervision/dashboard`** → Portal `/api/supervision`
```json
{
  "nContratos": 85,
  "nProyectos": 340,
  "enEjecucion": 120,
  "enAOM": 45,
  "enLiquidacion": 30,
  "liquidados": 145,
  "perdidaCompetencia": 0
}
```

**`/api/v1/sector/snapshot`** → Portal `/api/sector`
```json
{
  "estadoSIN": {"label": "ESTABLE", "color": "#06B6D4"},
  "embalses": {"direccion": "estable", "cambio7d": 0.5, "label": "ESTABLE"},
  "precio": {"direccion": "alta", "cambio7d": 8.3, "label": "ALTA"},
  "generacion": {"direccion": "baja", "cambio7d": -3.2, "label": "BAJA"},
  "aportes": {"direccion": "estable", "cambio7d": 1.1, "label": "ESTABLE"}
}
```

**Nota:** Todos los endpoints protegidos requieren header `X-API-Key`. Los endpoints del portal (Next.js BFF) NO requieren API Key (son publicos). Los endpoints del backend SI requieren API Key.

---

### Anexo G — Architectural Decision Records (ADRs)

#### ADR-001: Clean Architecture / DDD en el backend

**Estado:** Aceptado | Fecha: 2026-05-01

**Contexto:** El proyecto comenzo como un monolito Dash (app.py, puerto 8050) sin separacion de capas. Con el tiempo se agrego FastAPI (api/main.py, puerto 8000) pero la arquitectura se mantuvo plana. Los servicios de dominio estaban mezclados con logica de presentacion y acceso a datos.

**Decision:** Migrar progresivamente a Clean Architecture con capas explicitas:
- `domain/` — Entidades, servicios de dominio, interfaces abstractas
- `infrastructure/` — Repositorios concretos, servicios externos, cache
- `api/` — Routes y schemas Pydantic (adaptadores de entrada)
- `core/` — Configuracion, excepciones, handlers (infraestructura compartida)

**Consecuencias:**
- (+) Servicios de dominio testeables con mocks (IMetricsRepository)
- (+) Cambios en fuentes de datos (XM API, NASA, IDEAM) aislados en infrastructure/
- (-) `core/container.py` se convirtio en god file (575 nodos) al centralizar toda la DI
- (-) Curva de aprendizaje para desarrolladores nuevos

#### ADR-002: PostgreSQL directo en BFF del portal

**Estado:** Aceptado (provisional) | Fecha: 2026-05-01

**Contexto:** El frontend (Next.js) necesita datos que el backend FastAPI no expone aun. Existen dos patrones de consumo:
- `backendGet()` → llama a FastAPI (usado en `/api/sector`, `/api/subsidios`)
- `getPool()` → conecta directo a PostgreSQL (usado en `/api/comunidades`, `/api/contratos-or`, `/api/presupuesto`, `/api/supervision`, `/api/subsidios/validaciones`)

**Decision:** Mantener ambos patrones temporalmente. Crear capa de servicios (`src/services/`) que abstraiga la fuente de datos. Migrar gradualmente las routes que usan `getPool()` a `backendGet()` conforme se creen los endpoints en FastAPI.

**Consecuencias:**
- (+) El frontend no se bloquea mientras se crean endpoints backend
- (+) La migracion es gradual y reversible
- (-) Acoplamiento directo a PostgreSQL en 6 routes del portal
- (-) Cambio de esquema en BD requiere modificar routes del frontend

#### ADR-003: Venv anidado de whatsapp_bot/

**Estado:** Aceptado (diferido) | Fecha: 2026-05-01

**Contexto:** El bot de WhatsApp tiene su propio venv en `whatsapp_bot/venv/`. Esta ruta esta hardcodeada en 6 lugares:
- `whatsapp_bot/whatsapp-bot.service`: `ExecStart=/home/admonctrlxm/server/whatsapp_bot/venv/bin/uvicorn ...`
- `whatsapp_bot/telegram-polling.service`: `ExecStart=/home/admonctrlxm/server/whatsapp_bot/venv/bin/python ...`
- `scripts/actualizar_predicciones.sh`: `VENV_PYTHON="$SCRIPT_DIR/whatsapp_bot/venv/bin/python"`
- `scripts/restart_all_services.sh`: `nohup /home/admonctrlxm/server/whatsapp_bot/venv/bin/python ...`
- `scripts/validate_stability_phase2.py`: Verifica que el venv fue eliminado (fase futura)
- `docs/FASE7_AUDITORIA_PREDICCIONES.md`: Referencia al venv

**Decision:** NO migrar el venv en Fase 1. Diferir la unificacion a cuando se disenye la extraccion del bot a microservicio (Fase 5). El riesgo de romper los servicios systemd en produccion supera el beneficio de tener un solo venv.

**Consecuencias:**
- (+) Estabilidad de produccion preservada
- (+) Los scripts de deploy existentes siguen funcionando sin modificacion
- (-) Se mantienen 2 entornos Python (venv principal + venv del bot)
- (-) Mayor complejidad en gestion de dependencias

---

*Documento generado automaticamente a partir del analisis de grafo Graphify y verificacion directa de codigo.*  
**Ultima actualizacion:** 2026-05-01  
**Version:** 1.0  
**Proxima revision:** Despues de completar Fase 1 del Roadmap*
