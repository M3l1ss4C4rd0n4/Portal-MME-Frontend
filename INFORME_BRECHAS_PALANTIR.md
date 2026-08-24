# Informe de Brechas — Portal Dirección MME vs. capacidades tipo Palantir

> **Fecha:** 2026-08-04
> **Alcance:** `server/` (backend FastAPI) + `portal-direccion-mme/` (frontend Next.js) + PostgreSQL `portal_energetico`
> **Metodología:** inspección directa de código (no solo documentación previa), verificación en vivo contra PostgreSQL de producción (solo lectura) y contra `git remote -v` de ambos repos. No se asumió nada de `PROPUESTA_MAESTRA.md` (2026-06) sin volver a comprobarlo.
> **Clasificación:** Documento vivo — actualizar tras cada cambio arquitectónico significativo en la capa de ontología/seguridad/pipelines.

---

## 0. Hallazgo crítico — **RESUELTO el 2026-08-04**

**El token de GitHub embebido en la URL del remote `origin` estaba expuesto en texto plano en AMBOS repos**, tal como lo documentó `PROPUESTA_MAESTRA.md` en junio y no se había corregido hasta hoy.

**Remediación aplicada (2026-08-04):**
1. Remotes de ambos repos limpiados de token (`git remote set-url`), luego migrados a SSH: `git@github.com:M3l1ss4C4rd0n4/Portal-MME-Backend.git` y `git@github.com:M3l1ss4C4rd0n4/Portal-MME-Frontend.git`.
2. Token residual encontrado y purgado también de `~/.git-credentials` (no solo estaba en los remotes).
3. Llave SSH ed25519 nueva generada (`~/.ssh/id_ed25519_github`), registrada en GitHub, conectividad verificada con `ssh -T git@github.com` y `git ls-remote` real contra ambos repos.
4. Token viejo revocado por el usuario en github.com/settings/tokens.

Este ítem específico queda cerrado. El resto de brechas de este informe (sección 3.C — autenticación de usuario, RBAC, auditoría, CI/CD de seguridad) **sigue pendiente** — este hallazgo era uno entre varios del pilar de Seguridad, no todo el pilar.

---

## 1. Qué significa realmente "ser como Palantir"

Palantir no es un producto, son cinco pilares construidos durante 15+ años por un equipo de miles de ingenieros, vendidos a gobiernos y empresas por millones de USD/año de licenciamiento:

| Pilar | Qué es en Foundry/Gotham |
|---|---|
| **Ontology** | Modelo semántico de objetos tipados (no tablas planas) con propiedades, relaciones y **acciones** (comportamiento) ejecutables sobre datos reales |
| **Pipelines** | Integración de datos con datasets **versionados**, transformaciones reproducibles, build incremental, linaje automático a nivel de columna/celda |
| **Security** | Control de acceso por atributo (ABAC), "markings"/clasificaciones de dato, need-to-know, auditoría universal de cada acceso |
| **Applications** | Workshop/Slate (apps low-code sobre la ontología) y Gotham (link analysis visual, investigaciones, geoespacial) |
| **AIP** | Agentes de IA con acciones reales sobre la ontología (no chatbots de prompt) |

Este informe evalúa el Portal MME contra cada pilar. El resultado no es "sí" o "no" — es un espectro, y el portal ya está más avanzado de lo típico para un sistema gubernamental construido por un equipo pequeño.

---

## 2. Lo que ya existe y se parece genuinamente a Palantir (dar crédito donde corresponde)

Esto **no es aspiracional ni mockup** — se verificó con consultas reales a PostgreSQL de producción:

- **Embrión real de Ontology**: esquema `ontologia` con **15 tablas + 9 vistas materializadas**, pobladas: `dim_geografia` (1122 filas, cobertura DANE completa), `dim_empresa` (270), `dim_recurso` (2266), `dim_metrica` (142), `mv_supervision_geo` (2431), `mv_subsidios_mapa_geo` (1205).
- **Embeddings reales** (no simulados): pgvector con índice HNSW, `sentence-transformers` local (`paraphrase-multilingual-MiniLM-L12-v2`), **7.844 vectores indexados** (7.551 contratos + 293 informes).
- **Asistente IA con tool-calling real**, no wrapper de prompt: `asistente_ia_service.py` mapea 21 tools a intents reales del orquestador, incluyendo `buscar_texto_rag`, con streaming SSE genuino sobre Gemini.
- **Linaje de pipeline persistido**: `ontologia.etl_lineage` con 212 filas reales, corridas del mismo día del análisis (`refresh_vistas`, `geografia_alias`, `empresa_alias`, `informes_embeddings`).
- **Motor de riesgo con ML real** (`IsolationForest` de sklearn), no solo reglas — aunque hoy cae al fallback heurístico porque el volumen de datos de contratos (8 grupos) está bajo el umbral de activación (12).
- **Exploración de relaciones de 2 saltos** con distinción honesta entre "verificado por NIT" y "mención no verificada" — una señal de calidad de datos poco común.
- **Frontend conectado a datos reales sin mocks**: los 6 endpoints BFF de `/api/ontologia/*` proxean 1:1 al backend, sin `Math.random()` ni arrays hardcoded.
- Buenas prácticas puntuales: retries con backoff/jitter en Celery, healthchecks Docker, `.env.vault` cifrado (Fernet, no texto plano), separación limpia dominio/infraestructura.

**En síntesis: ya tienen entre el 20% y 30% de los pilares conceptuales de Foundry en estado de prototipo funcional — la mayoría de portales gubernamentales similares no tienen ni el 5%.**

---

## 3. Brechas por pilar

### A. Ontology — de "vistas con nombre" a "objetos con comportamiento"

| Brecha | Evidencia | Severidad |
|---|---|---|
| No hay clase "Objeto" tipada con comportamiento propio; todo son `Dict[str, Any]` devueltos por SQL | `ontologia_service.py:76-166` | Medio |
| El "grafo" es SQL de 2 saltos codificado a mano; `networkx` no se usa en ningún lugar del repo | `graph_service.py:70-134`, confirmado por grep | Medio-Alto |
| Sin motor de grafo genérico (sin BFS/DFS, shortest-path, centralidad) | mismo archivo | Medio |
| Catálogo de métricas solo tiene 1 de 8 dominios poblados/mapeados en el frontend | `catalogo-metricas`, migración `017_ontologia_dim_metrica.sql:22` vs `DOMINIO_LABEL` en frontend | Medio |
| Linaje es a nivel de "corrida de script", no de columna/celda | `lineage.py:36-89` | Bajo-Medio |
| Sin concepto de "Acciones" (escribir de vuelta al mundo real desde la ontología, con validación y logging) — todo es solo-lectura | Todos los endpoints de `ontologia.py`/`riesgo.py` son GET | Medio |

### B. Pipelines — de "scripts con cron" a "plataforma de datos"

| Brecha | Evidencia | Severidad |
|---|---|---|
| **Dos orquestadores paralelos ya desincronizados**: Celery Beat (13 tareas) + crontab de SO (~25 entradas) invocando los mismos scripts | `tasks/__init__.py:25-138`, comentario propio del código admitiendo que se retiró una tarea duplicada | **Alto** |
| Sin DAG real: no hay `chain`/`group`/`chord`; pasos secuenciales simulados con `subprocess.run` dentro de una sola tarea monolítica (si falla el paso 2, no se puede reintentar solo) | `tasks/etl_tasks.py:302-395` | Alto |
| Sin versionado de datos: todo es `UPSERT`/`TRUNCATE`+reinsert, sin historial del valor anterior | `etl_todas_metricas_xm.py:449-458`, `etl_subsidios.py:189,330,539` | Alto |
| Validación de calidad es post-hoc y no bloqueante (solo `logger.warning`), nacida reactivamente de un incidente de datos inventados (nov-2025) | `etl/validaciones.py:1-7` | Alto |
| Filas fallidas en ETL se pierden silenciosamente, sin dead-letter table | `tasks/etl_tasks.py:119-137` | Medio |
| El fallback documentado IDEAM→NASA POWER **no existe en código** — son fuentes independientes sin lógica condicional | grep vacío de "fallback" en ambos scripts, confirmado contra crontab real | Medio-Alto |
| Backup automatizado solo cubre 1 tabla (`metrics`) de ~30 | `scripts/backup_postgres_diario.sh` | Alto |
| Sin límites de recursos en contenedores Docker (`cpus`/`mem_limit`/`deploy:` ausentes) | `docker-compose.yml` | Bajo |

### C. Security — la brecha más grande y más urgente

| Brecha | Evidencia | Severidad |
|---|---|---|
| ~~Token GitHub expuesto en remote~~ (ver sección 0) | `git remote -v` ambos repos | **Resuelto 2026-08-04** |
| Sin autenticación de usuario final; solo `X-API-Key` global compartida por todo el frontend | `api/dependencies.py:37-77`, decenas de endpoints con `Depends(get_api_key)` | Alto |
| Sin RBAC/ABAC/row-level security — modelo todo-o-nada | confirmado, sin tablas de roles/permisos ni políticas RLS | Alto |
| Sin auditoría universal de acceso; solo un módulo aislado (bot WhatsApp de subsidios) registra quién consultó qué | `whatsapp_bot/subsidios_handler.py:72-83` vs. ausencia total en los ~40 routers de `api/v1/routes/` | Alto |
| ~~Un vhost nginx sin bloque HTTPS/443~~ | `portal-direccion-ee.conf` | **Resuelto 2026-08-04** |
| ~~Sin HSTS ni CSP en ningún vhost~~ | ambos nginx configs | **Resuelto 2026-08-04** (HSTS corto + CSP Report-Only, ver sección 5) |
| Sin CI/CD de seguridad: cero GitHub Actions, sin Dependabot, sin SAST/DAST | confirmado, `.github/workflows/` no existe en ningún repo propio | Alto |

### D. Applications — de "tablas" a "investigación visual"

| Brecha | Evidencia | Severidad |
|---|---|---|
| El explorador de red **descarta las aristas** que el backend sí entrega (`VecindarioEmpresa.aristas`) y renderiza solo tarjetas agrupadas | `explorador-red/page.tsx:88-300` vs `ontologia.ts:143-153` | Medio |
| Sin librería de grafo visual (`react-force-graph`/`cytoscape`/`vis.js`/`d3`) en `package.json` | confirmado | Medio |
| Sin drill-down multi-hop interactivo pese a que la UI lo insinúa ("grafo multi-hop") | mismo componente | Bajo-Medio |
| Sin mapa geoespacial real pese a tener geografía DANE completa; `vista-departamental` es un `&lt;select&gt;` + KPIs, no un mapa | `vista-departamental/page.tsx:100-129` | Medio |
| Cero tests en las 4 páginas de ontología y en las rutas BFF `api/ontologia/*` | confirmado por búsqueda de `*.test.ts(x)` | Medio |

### E. Madurez de plataforma/operación (transversal)

| Brecha | Evidencia | Severidad |
|---|---|---|
| God files sin resolver y **empeorando**: `HomeSlider.tsx` pasó de 1.663 a **2.531 líneas** desde junio; `core/container.py` sigue en 584 nodos acoplados | verificado hoy | Alto |
| Sin CI/CD en absoluto (ni build ni test automatizado en PR) | confirmado | Alto |
| Observabilidad propia bien estructurada (metrics/tracing/alerts) pero sin Prometheus/Grafana desplegados — los datos se recolectan pero no se visualizan centralmente | `infrastructure/observability/` | Medio |
| Sin carpeta de tests de integración (existía vacía en junio, ahora ni siquiera existe) | confirmado | Medio |

---

## 4. Priorización — qué hacer y en qué orden

### Ya (esta semana, bajo esfuerzo, alto impacto)
1. ~~**Rotar el token de GitHub y limpiar el remote**~~ — **Resuelto 2026-08-04** (sección 0).
2. ~~Añadir bloque HTTPS al vhost nginx que le falta~~ — **Resuelto 2026-08-04** (sección 5).
3. ~~Convertir el gate de calidad ETL en bloqueante~~ — **Resuelto 2026-08-04** (sección 5). Nota: el mecanismo real conectado a producción resultó ser `etl/etl_rules.py::validate_metric_df()`, no `etl/validaciones.py` (que es código huérfano, nunca importado en producción — ver sección 5).
4. Ampliar el backup automatizado a las ~30 tablas de producción, no solo `metrics`. **Pendiente.**

### Corto plazo (este mes)
5. Autenticación real de usuario (JWT/sesión) + roles básicos (lectura/escritura/admin) — hoy cualquiera con la API key ve todo.
6. Auditoría universal de acceso (quién consultó qué endpoint/dato y cuándo), extendiendo el patrón que ya existe en el bot de WhatsApp a toda la API REST.
7. Unificar el ETL en **un solo orquestador** (Celery Beat, retirando el crontab paralelo) para eliminar el riesgo de doble-ejecución ya detectado. **Parcialmente resuelto 2026-08-04**: se agregó un lock compartido (sección 5) en vez de retirar el crontab — retirarlo literalmente habría perdido funcionalidad real (variantes LGBM, drift-retrain, alertas, invalidación de caché) que Celery no replica. La unificación completa sigue pendiente y es un proyecto grande (~20 scripts sin equivalente Celery).
8. Elegir un umbral realista o forzar agregación para que `IsolationForest` se active en producción en vez de caer siempre al fallback heurístico.

### Mediano plazo (este trimestre)
9. ~~Motor de grafo real + visualización interactiva explotando las `aristas` que el backend ya entrega~~ — **Resuelto 2026-08-05** (Fase 1, sin drill-down — ver sección 5.6). `react-force-graph-2d` en `explorador-red` + el mismo componente reusado inline en el chat del Asistente IA (nueva tool `vecindario_empresa` ahora emite el grafo por SSE). Drill-down (expandir por contrato/proyecto) sigue pendiente, es proyecto de backend de 3-4 días aparte.
10. ~~Mapa geoespacial real en `vista-departamental`~~ — **Resuelto 2026-08-05** (ver sección 5.6). Choropleth con Leaflet reusando componentes ya probados en `/comunidades` y `/fenoge`, sin tocar backend (33 llamadas paralelas al endpoint existente).
11. Versionado básico de datasets críticos (subsidios, contratos) — al menos una tabla de historial de cambios antes de sobrescribir. **Pendiente.**
12. CI/CD mínimo: build + tests en cada PR, Dependabot activado. **Pendiente.**
13. Cobertura de tools del Asistente IA — **parcialmente resuelto 2026-08-05** (ver sección 5.7): agregadas `subsidios_validaciones` (intent ya existía, solo faltaba exponerla) e `hidrocarburos_presupuesto`/`hidrocarburos_produccion` (handler nuevo desde cero, portando SQL ya probado del frontend). Queda pendiente: Colombia Solar detallado (la "curva S" es un screenshot Playwright, no un dato consultable — requiere trabajo nuevo desde cero).

### Largo plazo (requiere más equipo/tiempo)
14. Objetos de ontología con **Acciones** reales (escritura validada de vuelta al sistema, no solo lectura).
15. RBAC/ABAC granular con "markings" por sensibilidad del dato (need-to-know real).
16. Linaje a nivel de columna/celda, no solo de corrida de pipeline.
17. Resolver los god files (`container.py`, `HomeSlider.tsx`) — la deuda ya documentada en junio y que ha empeorado.

---

## 5. Hallazgos operativos adicionales (sesión 2026-08-04, fixes de bajo esfuerzo)

Al ejecutar los ítems 1-3 de "Ya" (arriba) se investigó con más profundidad de la esperada, porque las implementaciones "obvias" habrían causado regresiones silenciosas. Resumen de lo que se hizo y lo que quedó documentado sin resolver.

### 5.1 Gate de calidad ETL — resuelto, con matices

El mecanismo de validación realmente conectado a producción es `etl/etl_rules.py::validate_metric_df()`, con único call-site en `etl/etl_todas_metricas_xm.py:365-375` — **no** `etl/validaciones.py` ni `etl/validaciones_rangos.py`, que son código huérfano (nunca importados fuera de un test). Cambios aplicados:
- `etl_rules.py`: `RestAliv`, `RestSinAliv`, `RespComerAGC` marcadas con `allow_negative=True` (tenían 84 valores negativos legítimos en el histórico que habrían empezado a bloquearse).
- `etl_todas_metricas_xm.py`: el filtro de bloqueo ahora actúa también sobre `"ERROR RANGO"`, no solo `"ERROR UNIDAD"`. Se agregó `_alertar_bloqueo_telegram()` (reusa el patrón de `scripts/monitor_predictions_quality.py`) para que un bloqueo ya no sea silencioso — requirió copiar `TELEGRAM_BOT_TOKEN` de `whatsapp_bot/.env` a `server/.env` y cargar `.env` explícitamente, porque el proceso cron no lo hacía.
- Verificado en producción: control positivo (RestAliv negativo ya no bloquea) y control negativo (DemaCome negativo sigue bloqueando) confirmados con datos reales.

**Pendiente, no resuelto hoy** (deliberadamente, por riesgo):
- `etl/validaciones.py` y `etl/validaciones_rangos.py` siguen huérfanos — candidatos a retirar o documentar como legado.
- `etl_commercial_metrics.py` y `etl_restriction_metrics.py` no tienen ninguna validación de rango, ni de advertencia.
- `etl_loss_metrics.py` y similares re-lanzan excepciones sin captura en `main()` ni alertas — un fallo mata el cron job en silencio (sin `MAILTO` en crontab).
- No existe mecanismo de cuarentena/dead-letter para filas rechazadas — hoy simplemente se descartan.
- `infrastructure/observability/alerts/alert_manager.py` sigue siendo un stub no conectado a ningún canal real.

### 5.2 Orquestación ETL — parcialmente resuelto, con hallazgo que cambió el diseño

Hallazgo que invalidó el plan original de "borrar la entrada de cron duplicada": `scripts/actualizar_predicciones.sh` (cron, cada 3 días) y la tarea Celery `regenerar_predicciones` (Domingo/Miércoles/Sábado) **no son equivalentes** — el script bash ejecuta 6 variantes LGBM especializadas (térmica, solar, eólica, aportes NASA, precio), reentrenamiento por drift, `alertas_energeticas.py` e invalidación de caché Redis que la tarea Celery no replica. Borrar la entrada de cron habría perdido esa funcionalidad en silencio (Celery seguiría "exitoso", solo que haciendo mucho menos trabajo).

Cambios aplicados en su lugar:
- Lock compartido (`fcntl.flock` sobre `/tmp/predictions_update.lock`, el mismo que ya usa el script bash) agregado a `regenerar_predicciones()` en `tasks/etl_tasks.py` — verificado en vivo: una segunda invocación disparada mientras la primera corría fue correctamente omitida sin ejecutar en paralelo.
- Crontab: 7 entradas con bug de horario (`6,7,8,9` interpretado como "cada 6h" pero solo corriendo 6:00-9:50 AM) corregidas a `0,6,12,18`. Comentario desalineado de `monitor_predictions_quality.py` corregido (decía "8:00 AM", corre a las 22:00 — se corrigió el comentario, no el horario real, por no tener certeza de cuál era la intención original).

**Pendiente, no resuelto hoy:**
- Migración completa a un solo orquestador — ~20 scripts ETL corren solo por crontab sin equivalente Celery (distintos venvs, dependencias tipo sklearn, legado). Proyecto grande.
- `docker-compose.yml` define Celery como si fuera el orquestador "de producción", pero Docker **no está instalado en este host** — la producción real es 100% systemd + crontab. El archivo no refleja la realidad y puede confundir a futuros mantenedores.

### 5.3 HTTPS/nginx — resuelto

Hallazgo crítico verificado en vivo antes del fix: cualquier request HTTPS a `portaldireccionee.minenergia.gov.co` (o `portalviceministerioenergia...`) era servido con el **certificado y contenido de `portalenergetico`** (único vhost con `listen 443`, actuaba como default de facto) — un bug activo, no solo una carencia.

Ambos dominios (`portaldireccionee...`, `portalenergetico...`) resuelven a IPs privadas `172.17.x.x` — sin salida pública a internet. **Let's Encrypt/certbot no es viable** para estos dominios internos (por eso `portalenergetico` ya usaba un certificado autofirmado, no por descuido). Certbot está instalado y el timer systemd activo, pero "armado y ocioso" — sin ningún cert emitido, inútil para este caso.

Cambios aplicados:
- Certificado autofirmado nuevo con SAN (`/etc/ssl/certs/portaldireccionee.crt`, incluye ambos dominios — a diferencia del cert original de `portalenergetico`, que no tiene SAN).
- Bloque `listen 443 ssl` agregado a `portal-direccion-ee`, con headers de seguridad: HSTS corto (`max-age=300`, no 1 año — certs autofirmados con HSTS largo pueden bloquear el acceso si hay que rotar de emergencia), CSP en modo `Report-Only` (para medir antes de bloquear), X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy.
- Regresión restaurada en `portalenergetico`: un backup de feb-2026 tenía `ssl_ciphers` fuertes y headers de seguridad en el bloque 443 que se perdieron al agregar `/whatsapp/` y `/api/v1/internal` en abr-2026 — restaurados con el mismo set de headers.
- Deliberadamente **no** se agregó redirect 80→443 (evita romper tráfico HTTP existente mientras el cert no sea de una CA confiable).
- Verificado en vivo tras el cambio: cada dominio sirve su propio certificado correcto (antes mezclados), headers presentes, HTTP sigue funcionando, otros vhosts no afectados por el reload.
- Repos sincronizados (`server/nginx-api-config.conf`, `portal-direccion-mme/nginx/portal-direccion-ee.conf`) con la config real de `/etc/nginx/sites-available/` — estaban desincronizados en ambas direcciones antes de este cambio.

**Hallazgo menor, preexistente, no introducido hoy:** `portaldireccionee` devuelve dos headers `X-Frame-Options` (`DENY` de Next.js + `SAMEORIGIN` de nginx) — confirmado que ya ocurría en el puerto 80 antes de este cambio. Redundante pero no activamente dañino (el navegador respeta el primero, más restrictivo). Limpieza cosmética pendiente.

**Pendiente, no resuelto hoy:**
- Certificados autofirmados sin confianza de navegador — los usuarios verán advertencia. Solo se resuelve con una CA interna distribuida al Ministerio, o si algún día hay salida pública a internet para Let's Encrypt.
- Tras 1 semana sin incidentes: subir HSTS a `max-age=604800` (máximo recomendado mientras el cert sea autofirmado).
- Revisar violaciones de CSP en consola de navegador antes de pasar de `Report-Only` a bloqueante.
- `scripts/deploy.sh` nunca toca nginx — si se repiten cambios manuales en el servidor sin sincronizar el repo, puede repetirse el patrón de regresión (headers perdidos) visto en `portalenergetico`.

### 5.4 Otros hallazgos menores registrados en el camino

- Backup de PostgreSQL automatizado (`scripts/backup_postgres_diario.sh`) solo cubre la tabla `metrics`, de ~30 tablas de producción — sigue pendiente (ítem 4 de "Ya", no resuelto en esta sesión).
- `sudo -l` en el servidor de producción tiene una whitelist NOPASSWD muy acotada y deliberadamente específica (reload de nginx, restart de Celery, un `cp` puntual hacia un archivo concreto) — buena práctica de menor privilegio, pero significa que cambios que toquen `/etc/ssl/` o `portalenergetico` requieren intervención manual con contraseña; no se puede automatizar de punta a punta sin ampliar esa whitelist (decisión que le corresponde a quien administra el servidor, no se tocó aquí).

### 5.5 App standalone "Colombia Solar" (puerto 3002) — decomisionada 2026-08-04

El proceso PM2 `colombia-solar` llevaba **más de un mes en crash-loop** (207.164 reinicios) por falta de build (`.next/standalone/server.js` no existía — se había borrado en una limpieza de disco previa y nunca se reconstruyó). Causa raíz confirmada en `~/.bash_history`.

Investigación adicional (a raíz de que el usuario notó que "Colombia Solar" ya funciona como pestaña dentro del portal) encontró que **la unificación ya había ocurrido, solo faltaba la limpieza operativa**:
- La implementación dentro del portal (`src/app/(dashboards)/colombia-solar/`) es una copia directa de la app standalone, portada el 28-jun-2026 y formalizada en el commit `adbb9b3` — mismos componentes, misma base de datos, y con una capacidad extra (fallback a Excel) que la standalone no tenía.
- El dominio dedicado `cronogramacolombiasolar.minenergia.gov.co` ya apuntaba al portal (puerto 3001) desde hace tiempo, no al puerto 3002 — cero tráfico real dependía del proceso caído.

Acciones aplicadas:
- `pm2 delete colombia-solar` + `pm2 save` — ya no resucitará en el próximo reinicio del servidor (antes estaba en `~/.pm2/dump.pm2`, y hay un `@reboot pm2 resurrect` en crontab).
- Agregado `location = / { return 302 /colombia-solar; }` en `/etc/nginx/sites-available/colombia-solar` — antes el dominio dedicado mostraba el home genérico del portal en vez de llevar directo al tablero. Verificado: redirige correctamente y la cadena completa de redirects (incluyendo el 308 propio de Next.js hacia `/colombia-solar/`) termina en 200.
- Directorio del proyecto archivado (no borrado): `/home/admonctrlxm/colombia-solar` → `/home/admonctrlxm/colombia-solar.RETIRADO-20260804` — reversible, y ya existía además un backup previo en `~/backups/colombia_solar_20260510_230246/`.

### 5.6 Mapa geoespacial + grafo visual interactivo — resuelto (Fase 1, sesión 2026-08-05)

**Mapa (`vista-departamental`):** choropleth real con Leaflet, reusando `DepartmentGeoJsonLayer`/`useDepartmentMapGeo` ya probados en `/comunidades` y `/fenoge` — sin tocar backend (33 llamadas paralelas al endpoint `resumen_departamento` existente, color por suma de los 6 conteos de `ResumenDepartamento`). `DepartmentGeoJsonLayer` se generalizó con un prop opcional `renderTooltip` (retrocompatible, comunidades/fenoge sin cambios de comportamiento).

**Grafo (`explorador-red` + Asistente IA):** se instaló `react-force-graph-2d` (sin conflictos de peers con React 19) y se reemplazaron las tarjetas de `explorador-red` por un grafo interactivo real (zoom/arrastrar/clic), usando `vecindario.nodos`/`aristas` que el backend ya entregaba pero el frontend descartaba. Además, la tool `vecindario_empresa` del Asistente IA (ya existía, solo respondía en texto) ahora también emite el grafo crudo por SSE (evento nuevo `{"grafo": {...}}`, acotado a esa tool únicamente) y el chat de `/asistente` lo renderiza inline con el mismo componente — verificado en vivo: pregunta sobre relaciones de una empresa → el asistente llama la tool → el grafo aparece en la conversación, con las cifras cruzadas contra la base de datos.

**Explícitamente fuera de esta fase:** drill-down real (expandir el grafo haciendo clic en un contrato/proyecto) — investigación confirmó que es un proyecto de backend de 3-4 días aparte, con casos irregulares reales de modelo de datos (proyectos usan un ID de texto crudo, geografía a veces por código DANE y a veces por nombre).

### 5.7 Cobertura de tools del Asistente IA — parcialmente resuelto (sesión 2026-08-05)

Se identificaron 3 huecos de cobertura (hidrocarburos, validaciones, Colombia Solar detallado) con tamaños muy distintos:

- **`subsidios_validaciones`** — **resuelto**. El intent ya existía y funcionaba con datos reales (`subsidios_handler.py`); solo faltaba exponerlo en el catálogo `TOOLS` del asistente. Cambio de una entrada, sin tocar backend de negocio. Verificado en vivo, cifras coinciden con Postgres.
- **`hidrocarburos_presupuesto` / `hidrocarburos_produccion`** — **resuelto**. No existía ningún handler Python para el schema `hidrocarburos` (solo un intent `"hidrocarburos"` que filtra noticias, sin datos duros — se dejó intacto para evitar colisión de nombres). Se creó `hidrocarburos_handler.py` nuevo, portando las queries SQL que ya funcionaban en el frontend (`src/app/api/hidrocarburos/{presupuesto,produccion}/route.ts`). Dos bugs reales encontrados y corregidos durante la verificación (no en el plan original): formato de miles ambiguo en números con decimales, y porcentajes 100x más chicos de lo real (`pct_compromisos`/`pct_obligaciones` vienen como fracción en la BD, confirmado contra cómo ya los usa el frontend). Las tools advierten explícitamente la fecha de corte — el dato de presupuesto/producción tiene 13-29 días de rezago (depende de una carga manual de Excel que no corre desde el 28-jul), mientras que WTI/Brent se actualiza a diario.
- **Colombia Solar detallado** — **pendiente**, proyecto aparte. El menú actual es superficial (3 conteos) y la "curva S" que se muestra en informes ejecutivos no es un dato calculado — es un screenshot tomado con Playwright del dashboard, no hay SQL reutilizable para exponerla como tool.

---

## 6. Conclusión

El Portal MME no es un CRUD con gráficas: ya tiene una capa de ontología con datos reales, embeddings genuinos, un asistente IA grounded con tool-calling, y un motor de riesgo estadístico funcional. Eso es un punto de partida real hacia el modelo Foundry, construido por un equipo muy pequeño frente a los miles de ingenieros de Palantir.

La brecha más grande no es de sofisticación de IA — es de **higiene de plataforma**: seguridad perimetral (un secreto expuesto sin rotar durante meses, una sola API key para todo), gobernanza de datos (dos orquestadores ETL corriendo en paralelo sin saberlo, cero versionado) y disciplina de ingeniería (cero CI/CD, god files que crecen en vez de encogerse). Cerrar esas brechas de higiene vale más, en términos de riesgo real para el Ministerio, que cualquier funcionalidad nueva tipo Palantir — y son también las más baratas de resolver primero.

---

*Generado mediante inspección directa de código y verificación en vivo contra PostgreSQL/git de producción — no es una extrapolación de documentación previa.*
