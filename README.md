# Portal de Dirección MME - Sistema Completo

<div align="center">

![Portal Dirección MME](https://img.shields.io/badge/Portal-Dirección%20MME-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)
![Python](https://img.shields.io/badge/Python-3.12-3776AB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.2-009688)

**Dashboard Ejecutivo de la Dirección de Energía Eléctrica**  
Ministerio de Minas y Energía - República de Colombia

</div>

---

## 📋 Índice

1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Arquitectura End-to-End](#arquitectura-end-to-end)
3. [Frontend (Next.js 16)](#frontend-nextjs-16)
4. [Backend (Python/FastAPI/Dash)](#backend-pythonfastapidash)
5. [Flujo de Datos](#flujo-de-datos)
6. [Instalación y Configuración](#instalación-y-configuración)
7. [Despliegue](#despliegue)
8. [Mantenimiento](#mantenimiento)
9. [Troubleshooting](#troubleshooting)

---

## Visión General del Sistema

El **Portal de Dirección MME** es una plataforma de business intelligence que integra datos del sector energético colombiano en tiempo real. El sistema consta de dos componentes principales:

### Componentes Principales

| Componente | Tecnología | Puerto | Función |
|------------|------------|--------|---------|
| **Portal Web** | Next.js 16 + React 19 | 3001 | Dashboards interactivos modernos |
| **API REST** | FastAPI (Python) | 8000 | Endpoints para datos en tiempo real |
| **Dashboard Legacy** | Dash (Python) | 8050 | 17 tableros analíticos legacy |
| **Base de Datos** | PostgreSQL 16 | 5432 | Almacenamiento centralizado |
| **Cache** | Redis | 6379 | Cache de consultas frecuentes |

### Dashboards Disponibles

> **Corregido 2026-09-30:** esta tabla tenía 12 filas; hay **16 carpetas de dashboard reales** en
> `src/app/(dashboards)/` más el Asistente IA en `src/app/asistente/`. "Predicciones" e "Informes"
> no son carpetas de nivel raíz — son subpáginas de `energia/` (`energia/predicciones`,
> `energia/informes`). Se agregaron los 7 módulos que faltaban.

| Dashboard | Estado | Fuente de Datos | Descripción |
|-----------|--------|-----------------|-------------|
| **Home** | ✅ Producción | APIs múltiples | Vista ejecutiva consolidada |
| **Presupuesto** | ✅ Producción | PostgreSQL | Ejecución presupuestal DEE |
| **Comunidades** | ✅ Producción | PostgreSQL | Comunidades Energéticas |
| **Contratos OR** | ✅ Producción | PostgreSQL | Contratos Operadores de Red |
| **Supervisión** | ✅ Producción | PostgreSQL | Supervisión de contratos FNCER |
| **Subsidios** | ✅ Producción | PostgreSQL | Subsidios de energía DEE |
| **Energía** | ✅ Producción | PostgreSQL | Gestión del sector eléctrico (incluye las subpáginas `predicciones` e `informes`) |
| **FENOGE** | ✅ Producción | PostgreSQL | Fondo Nacional de Eficiencia Energética |
| **Colombia Solar** | ✅ Producción | PostgreSQL | Curvas S del programa Colombia Solar |
| **Hidrocarburos** | ✅ Producción (2 subpáginas) | Excel/scraping | Presupuesto y exploración del sector hidrocarburos |
| **Balance Oferta-Demanda** (29-sep) | ✅ Producción | PostgreSQL + proyectos UPME | Brecha oferta/demanda del SIN, proyectos de expansión UPME con retraso, simuladores contrafactuales |
| **Catálogo de Métricas** | ✅ Producción | PostgreSQL (ontología) | Catálogo navegable de las métricas del sistema |
| **Explorador de Red** | ✅ Producción | PostgreSQL | Búsqueda de empresas y su red de relaciones (vecindario) |
| **Pagos** | ✅ Producción | PostgreSQL | Detalle de pagos de subsidios por cuenta y vigencia |
| **Salud de Datos** | ✅ Producción | PostgreSQL (ontología) | Monitor de salud/actualidad de la capa de ontología |
| **Validaciones** | ✅ Producción | PostgreSQL | Validación final de cuentas de subsidios por prestador |
| **Vista Departamental** | ✅ Producción | PostgreSQL + GeoJSON | Resumen por departamento (comunidades, contratos, supervisión) |
| **Asistente IA** (`/asistente`) | ✅ Producción | API + RAG | Chat del Asistente IA, multimodal, con voz en tiempo real |

---

## Arquitectura End-to-End

```
┌─────────────────────────────────────────────────────────────────┐
│                     USUARIOS / CLIENTES                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (80/443)                          │
│              • Reverse proxy • SSL • Load balancing             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Next.js       │  │   FastAPI       │  │   Dash          │
│   (Puerto 3001) │  │   (Puerto 8000) │  │   (Puerto 8050) │
│                 │  │                 │  │                 │
│ • Dashboards    │  │ • API REST      │  │ • Tableros      │
│ • Visualización │  │ • Autenticación │  │ • Análisis      │
│ • UI Moderna    │  │ • WebSocket     │  │ • Legacy        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              CAPA DE PROCESAMIENTO (Python)                     │
├─────────────────────────────────────────────────────────────────┤
│  core/         → Configuración, logging, container DI           │
│  domain/       → 30 servicios de negocio                        │
│  infrastructure/ → BD, cache, APIs externas                     │
│  etl/          → 17 scripts de extracción de datos              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ALMACENAMIENTO                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 16   → 15GB, 64M filas, 300K registros/día         │
│  Redis           → Cache de consultas frecuentes               │
│  OneDrive        → Archivos Excel (datos históricos)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend (Next.js 16)

### Stack Tecnológico

| Categoría | Tecnología | Versión | Uso |
|-----------|------------|---------|-----|
| Framework | Next.js | 16.2.1 | App Router, Server Components |
| UI Library | React | 19.2.4 | Componentes interactivos |
| Lenguaje | TypeScript | 5.0 | Tipado estático |
| Estilos | Tailwind CSS | 4.0 | Utility-first CSS |
| Gráficas | Nivo | 0.99 | @nivo/bar, @nivo/line, @nivo/pie |
| Mapas | React-Leaflet | 5.0 | Mapas interactivos |
| Mapa Colombia | @react-map/colombia | 1.0.9 | Mapa SVG de Colombia |
| Animaciones | Framer Motion | 12.38 | Transiciones UI |
| Iconos | Lucide React | - | Iconografía moderna |

### Estructura de Carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboards)/             # Route Group - 16 dashboards, todos ✅ Producción
│   │   ├── energia/               # + subpáginas predicciones/, informes/
│   │   ├── presupuesto/
│   │   ├── comunidades/
│   │   ├── contratos-or/
│   │   ├── supervision/
│   │   ├── subsidios/
│   │   ├── fenoge/
│   │   ├── colombia-solar/
│   │   ├── hidrocarburos/         # + subpáginas presupuesto/, exploracion/
│   │   ├── balance-oferta-demanda/ # nuevo 29-sep
│   │   ├── catalogo-metricas/
│   │   ├── explorador-red/
│   │   ├── pagos/
│   │   ├── salud-datos/
│   │   ├── validaciones/
│   │   └── vista-departamental/
│   ├── asistente/                 # Asistente IA (fuera del route group de dashboards)
│   ├── api/                       # API Routes (Next.js) — 29 carpetas de nivel raíz hoy
│   │   ├── comunidades/route.ts
│   │   ├── contratos-or/route.ts
│   │   ├── presupuesto/route.ts
│   │   ├── sector/route.ts
│   │   ├── subsidios/route.ts
│   │   ├── supervision/route.ts
│   │   ├── balance-oferta-demanda/  # nuevo 29-sep
│   │   ├── asistente/, voz/, ontologia/  # Asistente IA, voz, ontología
│   │   └── ...                      # ver src/app/api/ para el listado completo
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home dashboard
│
├── components/
│   ├── ui/                       # Componentes base (11, verificado 2026-09-30 — 4 huérfanos sin importadores se eliminaron en esa fecha)
│   │   ├── KPICard.tsx
│   │   ├── SemiGauge.tsx
│   │   ├── SemiPieChart.tsx
│   │   ├── MapaColombia.tsx
│   │   ├── MapaColombiaDynamic.tsx
│   │   ├── ChartCard.tsx
│   │   ├── BulletChart.tsx
│   │   └── ThemeToggle.tsx
│   ├── charts/                   # Wrappers Nivo (3)
│   │   ├── BarChart.tsx
│   │   ├── LineChart.tsx
│   │   └── PieChart.tsx
│   └── dashboard/                # [Vacío]
│
├── lib/
│   ├── db.ts                     # Pool PostgreSQL
│   └── nivo-theme.ts             # Tema compartido Nivo
│
├── hooks/                        # [Vacío - crear custom hooks]
│
└── providers/
    └── ThemeProvider.tsx         # Dark/Light mode
```

### API Routes (Next.js)

| Endpoint | Método | Descripción | Fuente |
|----------|--------|-------------|--------|
| `/api/comunidades` | GET | Datos de comunidades energéticas | PostgreSQL |
| `/api/contratos-or` | GET | Contratos operadores de red | PostgreSQL |
| `/api/presupuesto` | GET | Ejecución presupuestal | PostgreSQL |
| `/api/sector` | GET | Datos del sector energético | PostgreSQL |
| `/api/subsidios` | GET | Subsidios de energía | PostgreSQL |
| `/api/supervision` | GET | Supervisión de contratos | PostgreSQL |

---

## Backend (Python/FastAPI/Dash)

### Stack Tecnológico

| Componente | Tecnología | Versión | Uso |
|------------|------------|---------|-----|
| API Framework | FastAPI | 0.109.2 | Endpoints REST async |
| Dashboard | Dash | 2.17.1 | Tableros analíticos legacy |
| Web Server | Uvicorn | - | ASGI server |
| Base de Datos | PostgreSQL | 16 | Datos estructurados |
| ORM | SQLAlchemy | 2.x | Mapeo objeto-relacional |
| Cache | Redis | 7.x | Cache distribuido |
| Tareas Async | Celery | 5.6.2 | Background jobs |
| Scheduling | Celery Beat | - | Cron jobs |
| ML | Prophet | - | Predicciones de series temporales |

### Arquitectura de Capas

```
server/
├── core/                    (21 archivos)
│   ├── app_factory.py       # Factory Dash app
│   ├── container.py         # Inyección de dependencias
│   ├── config.py            # Configuración centralizada
│   ├── database/            # Helpers de base de datos
│   ├── security/            # Vault, validación SQL
│   └── utils/               # Utilidades (date_utils)
│
├── domain/                  (53 archivos)
│   ├── services/            # 30 servicios de negocio
│   │   ├── cu_service.py           (1,010 líneas)
│   │   ├── report_service.py       (1,850 líneas)
│   │   ├── executive_report_service.py (1,618 líneas)
│   │   ├── losses_nt_service.py    (1,199 líneas)
│   │   ├── notification_service.py (1,178 líneas)
│   │   ├── intelligent_analysis_service.py (829 líneas)
│   │   ├── ai_service.py           (504 líneas)
│   │   ├── commercial_service.py   (342 líneas)
│   │   ├── config_dynamic.py       (309 líneas) ⚠️ Sin documentar
│   │   ├── distribution_service.py (480 líneas)
│   │   ├── generation_service.py   (448 líneas)
│   │   ├── hydrology_service.py    (368 líneas)
│   │   ├── investment_service.py   (523 líneas)
│   │   ├── losses_service.py       (220 líneas)
│   │   ├── news_service.py         (505 líneas)
│   │   ├── restrictions_service.py (222 líneas)
│   │   ├── simulation_service.py   (748 líneas)
│   │   ├── transmission_service.py (207 líneas)
│   │   ├── cu_minorista_service.py (599 líneas)
│   │   ├── metrics_service.py      (222 líneas) ✅ Corregido
│   │   ├── indicators_service.py   (173 líneas)
│   │   ├── validators.py           (247 líneas)
│   │   ├── confianza_politica.py   (122 líneas) ⚠️ Sin documentar
│   │   ├── geo_service.py          (32 líneas)  ⚠️ DEPRECATED
│   │   ├── orchestrator_service.py (4 líneas)   ⚠️ DEPRECATED
│   │   ├── predictions_service.py  (10 líneas)  ⚠️ DEPRECATED
│   │   └── predictions_service_extended.py (698 líneas)
│   │
│   ├── models/              # Modelos Pydantic
│   ├── schemas/             # DTOs y validaciones
│   └── interfaces/          # Interfaces abstractas
│
├── infrastructure/          (41 archivos)
│   ├── database/            # Conexiones PostgreSQL
│   ├── cache/               # Redis cache
│   ├── external/            # APIs externas (XM, IDEAM, OneDrive)
│   ├── logging/             # Sistema de logging
│   └── observability/       # Métricas y health checks (nuevo)
│
├── api/                     (36 archivos)
│   ├── main.py              # Entry point FastAPI
│   ├── v1/routes/           # Endpoints REST
│   │   ├── restrictions.py
│   │   ├── distribution.py
│   │   ├── system.py
│   │   ├── cu.py
│   │   ├── commercial.py
│   │   ├── generation.py
│   │   └── ... (29+ endpoints)
│   └── dependencies.py      # Inyección FastAPI
│
├── interface/               (17 archivos) [LEGACY]
│   └── pages/               # Páginas Dash legacy
│
├── etl/                     (17 archivos)
│   ├── etl_todas_metricas_xm.py      # Cada 6 horas
│   ├── etl_xm_to_postgres.py         # Backfill manual
│   ├── etl_nuevos_dashboards.py      # Presupuesto, comunidades
│   ├── etl_transmision.py            # 24 prints ⚠️
│   ├── etl_losses_detailed.py        # 10 prints ⚠️
│   └── validaciones_rangos.py        # 2 prints ⚠️
│
└── tests/                   (42 archivos)
    ├── unit/                (35 archivos)
    ├── integration/         (0 archivos) ⚠️ FALTAN
    └── e2e/                 (0 archivos) ⚠️ FALTAN
```

### Entry Points

| Archivo | Framework | Puerto | Uso |
|---------|-----------|--------|-----|
| `app.py` | Dash | 8050 | Dashboard legacy (17 tableros) |
| `api/main.py` | FastAPI | 8000 | API REST (29+ endpoints) |
| `wsgi.py` | WSGI | - | Entry point alternativo (¿sin uso?) |

---

## Flujo de Datos

### 1. Extracción (ETL)

```
Fuentes Externas:
├── XM Colombia (API pydataxm)
│   └── Precios, generación, demanda, transmisión
├── SIMEM (Sistema de Información del Mercado)
│   └── Métricas de mercado
├── IDEAM (Instituto de Hidrología)
│   └── Datos hidrológicos (embalses, precipitación)
├── OneDrive (Archivos Excel)
│   └── Presupuesto, comunidades, contratos
└── NASA POWER
    └── Datos meteorológicos históricos
```

### 2. Procesamiento

```
ETL Scripts:
├── etl_todas_metricas_xm.py
│   └── Ejecución: Cada 6 horas (Celery Beat)
│   └── Datos: Métricas XM en tiempo real
│
├── etl_xm_to_postgres.py
│   └── Ejecución: Manual (backfill)
│   └── Datos: Histórico completo XM
│
└── etl_nuevos_dashboards.py
    └── Ejecución: On-demand
    └── Datos: Presupuesto, comunidades, contratos
```

### 3. Almacenamiento

```
PostgreSQL 16 (portal_energetico)
├── ~15GB de datos
├── 64 millones de filas
├── 300,000 registros/día (promedio)
├── Tablas principales:
│   ├── metrics_hourly
│   ├── metrics
│   ├── predictions
│   ├── alertas
│   └── ... (30+ tablas)
│
Redis (Cache)
├── ~500MB
├── TTL: 5 minutos (configurable)
├── Keys más frecuentes:
│   ├── dashboard:*
│   ├── api:*
│   └── predictions:*
```

### 4. Consumo

```
Dashboards:
├── Dash (Puerto 8050) [LEGACY]
│   └── 17 tableros analíticos
│   └── Usuarios internos MME
│
├── Portal Next.js (Puerto 3001, loopback — solo vía nginx desde el 29-sep)
│   └── 16 dashboards modernos + Asistente IA
│   └── Público externo
│   └── API REST intermediaria
│
└── Telegram Bot
    └── Notificaciones de alertas
    └── Informes ejecutivos automáticos
```

---

## Instalación y Configuración

### Requisitos Previos

- Node.js 20+
- Python 3.12+
- PostgreSQL 16+
- Redis 7+
- PM2 (global)

### 1. Clonar Repositorios

```bash
# Frontend
git clone https://github.com/MelissaCardona2003/Dashboard_Multipage_MME.git portal-direccion-mme
cd portal-direccion-mme

# Backend
git clone <url-server> server
cd server
```

### 2. Configurar Backend

```bash
cd server

# Crear entorno virtual
python3.12 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales

# Inicializar base de datos
python scripts/init_db.py

# Ejecutar tests
pytest tests/ -v
```

### 3. Configurar Frontend

```bash
cd portal-direccion-mme

# Instalar dependencias
npm install

# Configurar variables de entorno (no existe .env.local.example — partir de .env.local directamente)
nano .env.local

# Build de producción
npm run build
```

### 4. Configurar Variables de Entorno

**Backend (server/.env):**
```env
# Base de datos
PGHOST=localhost
PGPORT=5432
PGDATABASE=portal_energetico
PGUSER=mme_user
PGPASSWORD=<password>

# Redis
REDIS_URL=redis://localhost:6379/0

# APIs externas
XM_API_TOKEN=<token>
ONEDRIVE_CLIENT_ID=<id>
ONEDRIVE_CLIENT_SECRET=<secret>

# Telegram
TELEGRAM_BOT_TOKEN=<token>
```

**Frontend (portal-direccion-mme/.env.local):**
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=portal_energetico
PGUSER=mme_user
PGPASSWORD=<password>
NEXT_PUBLIC_SITE_URL=https://portaldireccionee.minenergia.gov.co

# Corregido 2026-09-30 — usadas por el código y antes no documentadas:
BACKEND_API_URL=http://127.0.0.1:8000       # URL del backend FastAPI
BACKEND_API_KEY=<api-key>                    # debe coincidir con API_KEYS_WHITELIST del backend
CHATBOT_API_URL=http://127.0.0.1:8000       # Asistente IA / orquestador
CHATBOT_API_KEY=<api-key>
COLOMBIA_SOLAR_XLSX=<ruta-al-excel>          # fuente del tablero Colombia Solar
```

---

## Despliegue

### Producción (Srvwebprdctrlxm)

#### Servicios Systemd

```bash
# API FastAPI
sudo systemctl status portal-api.service
sudo systemctl restart portal-api.service

# Dashboard Dash
sudo systemctl status dashboard-mme
sudo systemctl restart dashboard-mme

# Celery Worker
sudo systemctl status celery-worker
sudo systemctl restart celery-worker

# Celery Beat
sudo systemctl status celery-beat
sudo systemctl restart celery-beat
```

#### PM2 (Frontend)

> **Seguridad (29-sep):** Next.js escuchaba antes en todas las interfaces (`0.0.0.0`), alcanzable
> directamente sin pasar por nginx (sin TLS ni cabeceras de seguridad). Desde el commit `15935f2`
> arranca con `-H 127.0.0.1` (ver `ecosystem.config.js`) — ya no es alcanzable fuera del servidor,
> solo vía `nginx`. Si se cambia `ecosystem.config.js` hay que `pm2 delete portal-mme && pm2 start
> ecosystem.config.js` (restart solo no recarga los `args` del proceso).

```bash
# Status
pm2 status

# Restart
pm2 restart portal-mme

# Logs
pm2 logs portal-mme --lines 100
```

#### Nginx

```bash
# Configuración
sudo nginx -t
sudo systemctl reload nginx

# Logs
sudo tail -f /var/log/nginx/portal-direccion-ee.*.log
```

### URLs de Acceso

| Servicio | URL Interna | URL Pública |
|----------|-------------|-------------|
| Portal | http://localhost:3001 | https://portaldireccionee.minenergia.gov.co |
| API | http://localhost:8000 | https://portaldireccionee.minenergia.gov.co/api |
| Dashboard | http://localhost:8050 | No expuesto públicamente |

---

## Mantenimiento

### Limpieza Regular

```bash
# Rotar logs (automático con logrotate)
sudo logrotate -f /etc/logrotate.d/mme-server

# Limpiar backups antiguos (>30 días)
find server/backups/database -name "*.dump" -mtime +30 -delete

# Optimizar build frontend
cd portal-direccion-mme
rm -rf .next/
npm run build
pm2 restart portal-mme
```

### Backups

```bash
# Backup base de datos
pg_dump -h localhost -U mme_user portal_energetico > backup_$(date +%Y%m%d).sql

# Backup archivos
tar -czf backup-files-$(date +%Y%m%d).tar.gz server/ portal-direccion-mme/ --exclude='*/venv' --exclude='*/node_modules'
```

### Monitoreo

```bash
# Estado de servicios
curl http://localhost:8000/health
curl http://localhost:8050/
curl http://localhost:3001/api/comunidades/

# Uso de recursos
htop
pm2 monit
```

---

## Troubleshooting

### Problemas Comunes

#### 1. Dashboard no inicia (puerto 8050 ocupado)

```bash
# Matar procesos zombie
sudo pkill -f 'gunicorn.*8050'
sudo systemctl restart dashboard-mme
```

#### 2. APIs no responden

```bash
# Verificar PostgreSQL
pg_isready -h localhost -p 5432

# Verificar Redis
redis-cli ping

# Reiniciar API
sudo systemctl restart portal-api.service
```

#### 3. Frontend no carga datos

```bash
# Verificar build
npm run build

# Reiniciar PM2
pm2 restart portal-mme --update-env

# Verificar logs
pm2 logs portal-mme
```

#### 4. ETL falla

```bash
# Ejecutar manualmente con logs
cd server
source venv/bin/activate
python etl/etl_todas_metricas_xm.py --verbose
```

### Contacto de Soporte

- **Desarrollador Principal:** [Tu nombre/email]
- **Infraestructura:** Equipo TI MinMinas
- **Emergencias:** 24/7 (celular de guardia)

---

## Notas de Arquitectura (Validadas por Grafo — 2026-05-01)

> Estas notas complementan la documentación anterior con datos validados mediante Graphify (análisis estático del grafo de código).

### Métricas reales del codebase

| Métrica | Valor |
|---|---|
| Archivos analizados | 64 |
| Nodos en grafo | 172 |
| Aristas (conexiones) | 133 |
| Comunidades detectadas | 6 |

### God Component validado

**`src/components/HomeSlider.tsx`** — 1.663 líneas, god component confirmado.

- Importa **5 hooks de React** (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`)
- Importa **3 componentes de Nivo** (`ResponsiveLine`, `ResponsivePie`, `ResponsiveBar`)
- Contiene tipos inline (`NewsItem`, `HomeSliderProps` con 15+ campos)
- Mezcla lógica de carrusel, KPIs (`estadoGeneracion`, `estadoPrecio`), formateadores (`fmtCOP`, `fmtNum`), SVG math (`polarToCartesian`, `describeArc`), fetching de noticias y UI de navegación
- **Recomendación:** extraer funciones a `src/lib/` y `src/services/kpi.ts`

### API Routes — Fuentes reales

| Endpoint | Fuente real | Detalle |
|---|---|---|
| `/api/sector` | Backend externo | `backendGet("/v1/sector/snapshot")` |
| `/api/subsidios` | Backend externo | `backendGet("/v1/subsidios/kpis")` |
| `/api/subsidios/validaciones` | PostgreSQL directo | `getPool()` |
| `/api/subsidios/deficit-historico` | PostgreSQL directo | `getPool()` |

**Nota:** No todos los endpoints usan la misma fuente. Los de `sector` y `subsidios` (raíz) llaman al backend FastAPI vía `backendGet()`. Los de `validaciones` y `deficit-historico` usan el pool PostgreSQL directo.

### Corrección 2026-09-30 — esta sección estaba desactualizada

- `src/hooks/` — **no está vacío**: tiene `useAsistenteChat.ts` (3 importadores), `useAsistenteVoz.ts`
  (2), `useDiagnosticosIA.ts` (1) y `useHomeSlider.ts` (1), todos con uso real confirmado.
- `src/components/dashboard/` — **no está vacío**: `Card.tsx` y `KpiChip.tsx` tienen 15+
  importadores reales en distintos dashboards.
- `/home/admonctrlxm/documentacion-tecnica/` **no contiene** ninguno de los 5 archivos listados
  abajo — solo tiene `SKILL_PACK_CLAUDE.md` y una subcarpeta `manual tecnico/` con el manual de
  accesos en `.docx`. Los 5 archivos de arquitectura/grafo nunca se generaron o se borraron; no
  enlazar a ellos como si existieran.

---

## Documentación Adicional

- [Guía de Onboarding](./docs/GUIA_ONBOARDING.md) *(backend — este frontend no tiene copia propia; usar la del repo `server`)*
- [Troubleshooting](./docs/GUIA_TROUBLESHOOTING.md) *(backend)*
- [API Documentation](./docs/GUIA_USO_API.md) *(backend, reescrita 2026-09-30, 115 endpoints reales)*

> Los 4 enlaces que había aquí apuntaban a `./docs/...` de **este** repo, pero `docs/` en el
> frontend solo tiene un `.json` de grafo — esos archivos viven en el repo `server`
> (`/home/admonctrlxm/server/docs/`). Corregido 2026-09-30; se retiró "Arquitectura Detallada"
> porque `ARQUITECTURA_E2E.md` no existe en ninguno de los dos repos.

---

## Licencia

© 2026 Ministerio de Minas y Energía - República de Colombia  
Dirección de Energía Eléctrica

---

*Documentación actualizada: 31 de marzo de 2026*  
*Versión: 4.0*
