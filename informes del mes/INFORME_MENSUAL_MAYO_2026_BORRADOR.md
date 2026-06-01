# INFORME MENSUAL DE ACTIVIDADES — MAYO 2026 (BORRADOR)

> **Instrucciones:** Copiar cada sección al documento Word `INFORME MENSUAL DE ACTIVIDADES - Mayo 2026.docx`, reemplazando el texto de avances que corresponde al mes de abril. Los datos del contrato (Pago 5/12, período 01/05–30/05/2026, presentación 01/06/2026) ya están correctos en el Word.

---

## RESUMEN EJECUTIVO DEL MES (opcional — párrafo introductorio)

Durante mayo de 2026 la prioridad operativa de la Dirección de Energía Eléctrica fue consolidar el **Portal de Dirección** como canal único de presentación de avances, en cumplimiento de la directriz del Viceministro: los equipos dejarán de presentar tableros individuales en Power BI y centralizarán la información en `https://portaldireccionee.minenergia.gov.co/`. En ese marco, la supervisión (Diana Gutiérrez y Daniel Villarreal) sostuvo reuniones con cada grupo para identificar correcciones por tablero; la contratista atendió esas solicitudes en orden de prioridad, manteniendo el portal actualizado con datos reales y disponible de forma continua.

Entre el **19 y el 25 de mayo** se presentó una **incidencia crítica de infraestructura** sobre el servidor `172.17.0.46` (SRVWEBPRDCTRLXM, IP `172.17.0.64`), reportada por el Viceministerio el 24-may. TI restauró el servidor al snapshot del **17–18 de mayo** (Aranda 28237). El trabajo del mes se organiza en **dos fases**: (1) correcciones implementadas **antes de la caída** (1–17 may); (2) correcciones del documento *Observaciones_Tablero_DEE* y solicitudes adicionales de supervisión, retomadas **después de la restauración** (25–30 may).

---

## CRONOLOGÍA DE ENTREGAS DEL MES — PARA OBLIGACIÓN 2 Y 8

### FASE 1 — Antes de la caída del servidor (1 al ~17 de mayo)

Correcciones acordadas con supervisión en las primeras reuniones con los equipos de la Dirección. Implementadas y desplegadas antes de que el servidor dejara de ser accesible por SSH (lunes festivo 18 de mayo).

#### Gestión del Sector
| # | Solicitud | Estado |
|---|-----------|--------|
| 1 | Actualizar valores del slide (distintos al Portal Energético); verificar sincronización de datos | ✅ |
| 2 | Agregar en la vista móvil: gráfica de proporción de generación y gráfica de precio de bolsa | ✅ |
| 3 | Flechas de tendencia (↑↓→) en KPIs de Gestión del Sector | ✅ |

#### Apropiación Presupuestal
| # | Solicitud | Estado |
|---|-----------|--------|
| 4 | Actualizar valores de apropiación presupuestal con datos reales | ✅ |
| 5 | Clarificar que comprometido y obligado no se suman; mejorar lectura de la gráfica apilada | ✅ |
| 6 | Etiqueta de corte: *"a corte del 1 de abril"* | ✅ |

#### Comunidades Energéticas
| # | Solicitud | Estado |
|---|-----------|--------|
| 7 | Botón/filtro de inicio con opciones: Implementadas / Contratos OR / FENOGE 1.0–1.1 | ✅ |
| 8 | Corregir valor de inversión en la diapositiva de inicio | ✅ |
| 9 | En Contratos OR: renombrar "avance de obra" → **avance general** (gráficas y tabla) | ✅ |

#### Supervisión FNCER
| # | Solicitud | Estado |
|---|-----------|--------|
| 10 | Visualización por **número de contratos** (no solo montos) | ✅ |
| 12 | Incorporar indicadores de supervisión en la **pantalla inicial** (HomeSlider) | ✅ |

#### Subsidios
| # | Solicitud | Estado |
|---|-----------|--------|
| 13 | Filtrar y mostrar solo resoluciones de **2026** | ✅ |
| 14 | Cambiar "déficit" por **"total deuda a la fecha"**; corte 1 de abril; nota *pendiente de desembolso por parte del Ministerio de Hacienda y Crédito Público* | ✅ |
| 15 | Fórmula visible: Total apropiado − Total asignado = Total disponible ($5.850.784.897.494) | ✅ |
| 16 | Tres tableros faltantes: (1) Déficit histórico, (2) Detalle de pagos, (3) Validaciones | ✅ |
| 17 | En pagos: al filtrar 2026, solo resoluciones/trimestres disponibles en ese año | ✅ |

#### FENOGE y forma del portal
| # | Solicitud | Estado |
|---|-----------|--------|
| 18 | Tableros FENOGE 1.0 y 1.1 | ✅ |
| 19 | Separar navegación/rutas de Comunidades y Subsidios | ✅ |
| 20 | Noticias del carrusel con actualización **dos veces al día** | ✅ |

#### Refactorización técnica (2–10 may, soporte a las entregas anteriores)
Extracción modular del HomeSlider, capa `apiService.ts`, librerías `format.ts` / `kpi-logic.ts` / `svg-math.ts`, 49 tests Vitest.

---

### INTERLUDIO — Caída del servidor (19 al 25 de mayo)

El portal quedó **inaccesible para despliegues y mantenimiento** por falla de SSH en el servidor. La contratista apoyó reportando la incidencia, radicando **Aranda 28237** y verificando servicios tras la restauración ejecutada por TI al snapshot del 17–18 de mayo. *No corresponde a la contratista la parametrización de red ni la restauración del servidor.*

---

### FASE 2 — Después de la restauración del servidor (25 al 30 de mayo)

Retoma de actividades con apoyo de herramientas de desarrollo asistido (Cursor). Correcciones del archivo *Observaciones_Tablero_DEE.docx* y solicitudes adicionales de Diana Gutiérrez tras reuniones con los grupos.

#### Tableros (Observaciones_Tablero_DEE + ajustes de mayo)
| Solicitud | Estado |
|-----------|--------|
| **Supervisión — slide:** usuarios contratados (col. BL); valor total proyectos ($) | ✅ |
| **Supervisión — tablero:** exportar Excel (solo con filtros activos); usuarios contratados; valores AR/AU/AV; **Departamento/Municipio** en lugar de Ejecutor en flujo Sankey | ✅ |
| **Contratos OR:** filtro por **Operador de Red** en gráficas curva S | ✅ |
| **Comunidades:** quitar curva S incorrecta; agregar **4 curvas S** (archivo Colombia Solar Completo) | ✅ |
| **Colombia Solar:** ordenar tabla por meses | ✅ |
| Compartir **configuración de alertas** Gestión del Sector (consulta: embalse Topocoro en alertas) | ✅ |
| Agregar **gráfica de embalses** en slide de Gestión del Sector | ✅ |
| **Detalle pagos subsidios:** año expedición predeterminado **2026** | ✅ |
| Terminología pagos: "Valor Asignado" → **"Valor Comprometido en Resoluciones"** | ✅ |
| Ejecución presupuestal: corte actualizado a **1 de mayo** | ✅ |
| Subsidios: corte actualizado a **15 de mayo** | ✅ |
| FENOGE: eje X de curvas S extendido hasta **junio/julio 2026** | ✅ |
| Curvas S en **operadores de red / comunidades** | ✅ |

#### Informe diario y automatizaciones
| Solicitud | Estado |
|-----------|--------|
| Fecha de corte explícita en KPIs de Gestión del Sector | ✅ |
| Demanda regulada = residenciales / No regulada = no residenciales | ✅ |
| **Slide generación térmica** con datos XM en PostgreSQL (26-may) | ✅ |
| Botón descarga **PDF informes XM** | ✅ |
| Documento de configuración de alertas Gestión del Sector | ✅ |
| Informe diario: gráficas pendientes y ajustes de formato | ✅ |
| Informe diario: secciones **DEE** (subsidios, supervisión, apropiación, comunidades) | ✅ |
| **Chatbot** multi-menú con información de módulos DEE (27-may) | ✅ |
| Sincronización tableros tras actualización SharePoint (27-may) | ✅ |

#### Pendientes al cierre de mayo (informar con transparencia)
| Solicitud | Estado |
|-----------|--------|
| Pestaña **Redes Sociales X** | ❌ Intentado 17-may; bloqueado — API de X de pago (HTTP 429) |
| **Tableros hidrocarburos** | ⏳ Pendiente para junio |
| Ajustes visuales finos de reuniones con grupos (iteración continua) | ⏳ En curso |

---

## OBLIGACIÓN 1

**Obligación contractual:** Apoyar el seguimiento y análisis de postulaciones relacionadas con la Estrategia Nacional de Comunidades Energéticas, bajo la supervisión del componente de data.

**Avances y logros del mes (Mayo):**

Durante este período no se adelantaron actividades nuevas de postulaciones o selección muestral de Comunidades Energéticas. La prioridad del mes, definida por la supervisión, fue la **estabilización y completitud del Portal de Dirección** como plataforma central de seguimiento de todos los grupos de la Dirección. No obstante, se atendieron ajustes en el tablero de Comunidades Energéticas derivados de las reuniones de revisión con los equipos:

- Se eliminó la gráfica de curva S de operadores de red que no cumplía con la metodología solicitada.
- Se incorporaron **cuatro gráficas de curva S** (hojas verdes y azules del archivo *Cuadro Inauguraciones_Colombia Solar Completo_CE_OR.xlsx*), alineadas con la visualización que maneja el equipo de Contratos OR.
- Se habilitó **exportación a Excel** del detalle por departamento y municipio en el tablero de Comunidades.

*Evidencia:* capturas del tablero Comunidades Energéticas y enlace SharePoint del archivo fuente — carpeta evidencias mayo / SECOP II.

---

## OBLIGACIÓN 2

**Obligación contractual:** Brindar apoyo en la organización, clasificación y sistematización de los insumos necesarios para la elaboración de productos analíticos derivados del sistema de información de la estrategia.

**Avances y logros del mes (Mayo):**

Mayo se ejecutó en **dos fases** separadas por la caída del servidor (19–25 may):

**Fase 1 (1–17 may) — Correcciones iniciales con supervisión:** se implementaron 20 ajustes acordados en reuniones con los equipos de la Dirección, cubriendo Gestión del Sector (actualización de valores, gráficas de generación y precio de bolsa, flechas de tendencia), Apropiación Presupuestal (valores reales, gráfica comprometido/obligado, corte 1 de abril), Comunidades (filtros Implementadas/OR/FENOGE, inversión corregida, avance general en OR), Supervisión (métricas por número de contratos, slide en inicio), Subsidios (resoluciones 2026, deuda a la fecha, tres tableros nuevos: déficit histórico, detalle pagos, validaciones), FENOGE 1.0–1.1, separación de rutas Comunidades/Subsidios y noticias dos veces al día. Paralelamente se refactorizó la arquitectura del HomeSlider (2–10 may).

**Fase 2 (25–30 may) — Tras restauración del servidor:** se retomaron las correcciones del documento *Observaciones_Tablero_DEE* y solicitudes adicionales: Supervisión (export Excel, usuarios contratados, AR/AU/AV, Depto/Municipio), Contratos OR (filtro operador), Comunidades (4 curvas S), ajustes de cortes y terminología en Subsidios y Presupuesto, curvas S FENOGE/comunidades, slide térmica, botón PDF XM, informe diario unificado con secciones DEE, chatbot multi-menú y sync SharePoint.

Cronograma acordado con supervisión:

| N° | Actividad | Fecha entrega |
|----|-----------|---------------|
| 1 | Implementación tableros restantes de Subsidios | 4-may |
| 2 | Señales de crecimiento, disminución o estabilidad en KPIs móviles de Gestión del Sector | 4-may |
| 3 | Implementación tableros FENOGE 1.0 y 1.1 | 11-may |
| 4 | Ajustes de forma y presentación de tablas del informe de Gestión del Sector | 18-may |
| 5 | Implementación de informe estandarizado Dirección de Energía | 25-may |
| 6 | Pestaña X — "¿Qué están hablando los expertos en energía en X?" | 1-jun — **No completada*** |

*\*Actividad 6: se desarrolló el módulo "Redes Sociales" con la estructura visual y las cuentas definidas por supervisión (Sergio Cabrales, Gustavo Petro, MinEnergía, Bruce Mac Master, Natalia Gutiérrez, ACOLGEN, Andrés Camacho, Superservicios, UPME, entre otras). Sin embargo, **no fue posible ponerlo en producción**: desde 2023 X (Twitter) eliminó el acceso gratuito a su API y los embeds oficiales de timeline (`syndication.twitter.com`) responden con error **HTTP 429 (Too Many Requests)**, bloqueando la carga de los posts en el portal. La funcionalidad quedó suspendida el 17-may. Para habilitarla se requeriría contratar un plan de pago de la API de X o adoptar una alternativa (p. ej. agregador de terceros con costo). Se informó a supervisión y se dejó evidencia técnica (captura de consola del navegador).*

**Principales entregas técnicas:**

1. **Tableros de Subsidios completados:** pagos DEE por vigencia y resolución, histórico de déficit FSSRI, ficha de validaciones con tres gráficos de torta y KPIs de estado de beneficiarios. Corrección del mapeo año vigencia vs. expedición en `kpis_resumen` (13-may).

2. **Tableros FENOGE 1.0 y 1.1:** seguimiento de contratos y proyectos del Fondo Nacional de Eficiencia Energética, con desglose por departamento/municipio, KPIs financieros y tabla detallada exportable.

3. **Componente TrendBadge y señales de tendencia:** indicadores visuales de crecimiento (↑), disminución (↓) o estabilidad (→) en los KPIs móviles del slide de Gestión del Sector, calculados con comparación semanal de series XM.

4. **Refactorización arquitectónica del HomeSlider (2–10 may):** extracción de slides a módulos independientes (`SlideComunidades`, `SlidePresupuesto`, `SlideContratosOR`, `SlideSupervision`, etc.), capa de servicios `apiService.ts`, librerías `format.ts`, `kpi-logic.ts`, `svg-math.ts` y suite de **49 tests Vitest** para garantizar regresiones cero en formateo y lógica KPI.

5. **Slide de generación térmica (26-may):** nueva diapositiva en el carrusel con datos de despacho térmico desde PostgreSQL (fuente XM), incluyendo botón de descarga de informes PDF de XM.

6. **Intento de implementación — Pestaña Redes Sociales X (17-may, no completada):** se construyó el componente `SlideRedesX` con la sección "Redes Sociales — Sector Energético" y los timelines embebidos de las cuentas solicitadas por supervisión. Al desplegar en producción, los widgets de X no cargaron: el servicio `syndication.twitter.com` devolvió cientos de respuestas **HTTP 429**, consistente con la política actual de X de **cobrar por el uso de su API** y restringir embeds gratuitos. Se suspendió la diapositiva en el HomeSlider para no degradar la experiencia del portal (spinner permanente en cada tarjeta). *Pendiente de decisión de supervisión:* contratar API de X, usar servicio alternativo de pago, o sustituir por otro canal (p. ej. enlaces directos a perfiles o RSS de noticias ya implementado).

7. **Informe estandarizado y chatbot multi-menú (25–27 may):** unificación del informe diario con la estructura que recibe el jefe de la Dirección; incorporación de secciones DEE (subsidios, supervisión, apropiación, comunidades); chatbot con menú interactivo ampliado; informes ejecutivos automáticos por correo y Telegram.

8. **Sincronización de bases desde SharePoint:** actualización de pipelines ETL para que los tableros consuman las hojas Excel compartidas por cada equipo, eliminando datos mock y garantizando información real y actualizada.

*Evidencia:* repositorio GitHub Portal-MME-Frontend (commits mayo 2026), portal en producción, carpeta evidencias mayo / SECOP II.

---

## OBLIGACIÓN 3

**Obligación contractual:** Apoyar el almacenamiento, gestión y organización de documentos y archivos generados en el marco de las actividades contractuales, garantizando su adecuada administración en los sistemas de información dispuestos por la entidad.

**Avances y logros del mes (Mayo):**

1. **Control de versiones continuo:** todos los cambios de mayo quedaron registrados en GitHub (`Portal-MME-Frontend` y `Portal-MME-Backend`) con mensajes descriptivos y trazabilidad por fecha.

2. **Documento de observaciones atendidas:** se recibió de supervisión el archivo *Observaciones_Tablero_DEE.docx* con el listado de correcciones por módulo; cada ítem fue implementado, verificado y documentado en commits correspondientes.

3. **Evidencias de incidencia de servidor:** se conservó el hilo de correo *RE: Caída de servidor 172.17.0.46* con radicado Aranda 28237, restauración del 18/05/2026 y verificación del 25/05/2026, como soporte de la gestión de continuidad operativa.

4. **Actualización de documentación técnica:** README.md, INDICE.md, AGENTS.md y Skill Pack actualizados con flujo de deploy seguro y convenciones de desarrollo adoptadas durante la refactorización de mayo.

*Evidencia:* carpeta `informes del mes/evidencias mayo/`, repositorios GitHub, SECOP II.

---

## OBLIGACIÓN 4

**Obligación contractual:** Monitorear diariamente los indicadores de avance en la ejecución de proyectos FNCER, registrando desviaciones en un sistema de seguimiento, generando reportes periódicos sobre el estado de proyectos, incluyendo métricas de eficiencia y cumplimiento de objetivos.

**Avances y logros del mes (Mayo):**

1. **Monitoreo FNCER vía Portal de Supervisión:** tablero operativo con datos reales de PostgreSQL, actualizado mediante sincronización automática desde las bases Excel del equipo de Supervisión.

2. **Correcciones implementadas en Supervisión (solicitud supervisión — Observaciones_Tablero_DEE):**
   - **Exportación a Excel** habilitada únicamente cuando hay filtros activos (fondo, estado, etapa, departamento, municipio o rango de años).
   - **Número de usuarios contratados** (columna BL) incorporado en slide, KPIs y tabla detallada.
   - **Valores financieros por proyecto:** valor por proyecto (AR), valor desembolsado (AU) y valor por desembolsar (AV), visibles en slide, KPIs y exportación.
   - **Reemplazo de columna Ejecutor por Departamento/Municipio** en el flujo Sankey del tablero, para priorizar la visualización territorial exigida por la Dirección.
   - **Valor total de proyectos ($)** visible en la diapositiva móvil de Supervisión FNCER del HomeSlider.

3. **Monitoreo sector eléctrico (Gestión del Sector):** KPIs en tiempo real desde XM (precio de bolsa, generación, embalses, aportes hídricos) con chips de estado dinámico (NORMAL / ALERTA TEMPRANA / ALERTA ALTA / CRÍTICO) y metodología oficial XM/UPME para clasificación de embalses.

4. **Informes automatizados:** informe ejecutivo diario por correo y Telegram; incorporación de datos DEE (subsidios, supervisión, apropiación presupuestal, comunidades) al informe estandarizado acordado con supervisión.

5. **Continuidad operativa tras caída de servidor:** entre el 19 y el 25 de mayo el portal estuvo afectado por la indisponibilidad del servidor (competencia de TI). La contratista apoyó reportando la incidencia, radicando el caso Aranda 28237 y verificando servicios tras la restauración (cron jobs, PM2/systemd, pipelines ETL).

*Evidencia:* tablero Supervisión en producción, correo Aranda 28237, capturas en carpeta evidencias mayo.

---

## OBLIGACIÓN 5

**Obligación contractual:** Participar y prestar acompañamiento en las reuniones y sesiones de trabajo, en las que se haga necesaria o conveniente su participación para presentar resultados de análisis y responder consultas de la Dirección, relacionadas en el objeto del contrato.

**Avances y logros del mes (Mayo):**

1. **Reuniones de revisión por equipo (Diana Gutiérrez y Daniel Villarreal):** sesiones de trabajo con los grupos de Subsidios, Supervisión FNCER, Comunidades Energéticas, Contratos OR, Presupuesto DEE y Gestión del Sector, con el objetivo de recoger observaciones sobre cada tablero Power BI y traducirlas a correcciones en el Portal de Dirección. Esta dinámica respondió directamente a la directriz del Viceministro de centralizar los avances en una sola plataforma.

2. **Seguimiento diario con supervisión:** inspecciones y retroalimentación continua sobre el portal; las correcciones se registraron en el documento *Observaciones_Tablero_DEE.docx* y se atendieron en orden de prioridad y complejidad.

3. **Coordinación por incidencia de servidor (24–25 may):** atención a la solicitud prioritaria del Viceministerio (Sr. Víctor Paternina, 24-may). La contratista apoyó a TI radicando el caso **Aranda 28237** y solicitando restauración al **17 de mayo**; TI ejecutó la restauración y la contratista verificó el acceso el 25-may. Las acciones de infraestructura (diagnóstico SSH, intentos de corrección, restauración desde snapshot) fueron llevadas a cabo por el **Grupo de Tecnología** (Luis Rosendo Herrera, Joan Carvajal, Wilman Esney Rodríguez, Nicolás Maldonado).

4. **Reuniones técnicas complementarias:** coordinación con Diana Gutiérrez sobre metodología de datos (CU, SUI, bases Excel); seguimiento al funcionamiento del chatbot y los informes diarios.

*Evidencia:* actas/correos de reuniones, documento Observaciones_Tablero_DEE, hilo correo caída servidor.

---

## OBLIGACIÓN 6

**Obligación contractual:** Organizar sesiones de retroalimentación para mejorar las guías y protocolos basados en experiencias del equipo, a fin de monitorear el uso de herramientas y proporcionar soporte para resolver incidencias.

**Avances y logros del mes (Mayo):**

1. **Protocolo de atención de observaciones de tableros:** se estableció un flujo de trabajo donde supervisión consolida las correcciones por equipo en un documento Word, la contratista las implementa en el portal y supervisión valida en la siguiente revisión. Este protocolo permitió atender de forma ordenada las solicitudes de seis equipos en un solo mes.

2. **Incidencia de servidor — rol de la contratista vs. TI:** la atención de infraestructura correspondió al Grupo de Tecnología. La contratista aportó: (a) reporte y escalamiento ante supervisión/Viceministerio; (b) radicación del caso Aranda 28237 solicitando restauración al último día funcional; (c) verificación post-restauración de portal, API y automatizaciones. TI intentó medidas previas (incluida propuesta de segunda tarjeta de red) que no resolvieron el problema; la **solución efectiva fue la restauración del servidor al snapshot del 17–18 de mayo**.

3. **Retroalimentación sobre cálculo de CU:** se mantuvo comunicación con Diana Gutiérrez y se solicitó apoyo para acceso a base SUI; reunión de contexto con Santiago Santamaría sobre metodología CU/XM. *Pendiente:* respuesta del experto SUI para refinamiento del tablero de Costo Unitario.

4. **Configuración de alertas Gestión del Sector:** se compartió con supervisión la configuración de umbrales y reglas del sistema de alertas automatizadas (embalses, generación, precio de bolsa).

*Evidencia:* documento Observaciones_Tablero_DEE, correo Aranda 28237, commits de correcciones.

---

## OBLIGACIÓN 7

**Obligación contractual:** Apoyar en la preparación de materiales y documentos técnicos y administrativos, según los requerimientos del equipo de trabajo.

**Avances y logros del mes (Mayo):**

1. **Informe estandarizado Dirección de Energía (25-may):** documento/informe diario unificado con la estructura que recibe el jefe de la Dirección, incluyendo: despachos de generación térmica (enlace XM Sinergox), tabla de hidrología mejorada, demandas del SIN, fechas de corte explícitas, corrección de etiquetas demanda regulada/no regulada, proyección de precio de bolsa y secciones DEE.

2. **Materiales técnicos de refactorización:** extracción de 14+ componentes del HomeSlider, documentación de arquitectura en AGENTS.md, suite de tests Vitest (49 tests), guía de deploy seguro post-incidente.

3. **Botón Boletín Energético:** enlace al boletín oficial agregado en el portal según solicitud de supervisión.

4. **Presente informe mensual** de actividades correspondiente al pago 5 de 12 (período 01/05–30/05/2026).

*Evidencia:* informe diario en correo supervisión, portal en producción, presente documento.

---

## OBLIGACIÓN 8

**Obligación contractual:** Cumplir con las demás funciones que asigne el supervisor, relacionadas con la naturaleza del objeto contractual y necesarias para la consecución del fin del objeto del contrato.

**Avances y logros del mes (Mayo):**

**A. Contexto estratégico — Portal como canal único de avances**

Por decisión del Viceministro, ningún grupo de la Dirección de Energía Eléctrica presentará avances en tableros Power BI individuales; **todos usarán el Portal de Dirección** como plataforma oficial. Esta directriz definió la prioridad absoluta de mayo: que Diana y Daniel reunieran a cada equipo, recogieran las correcciones necesarias por tablero, y que la contratista las implementara con la mayor celeridad posible, garantizando información **completa, actualizada y proveniente de fuentes reales**.

**B. Detalle por fases (ver sección CRONOLOGÍA DE ENTREGAS)**

**Fase 1 — Antes de la caída (items 1–20):** Gestión del Sector, Apropiación, Comunidades, Supervisión (slide inicial), Subsidios (3 tableros + filtros 2026), FENOGE, forma del portal.

**Fase 2 — Después de la restauración (Observaciones_Tablero_DEE + lista supervisión):**

| Módulo | Solicitud supervisión | Estado mayo |
|--------|----------------------|-------------|
| **Supervisión — Slide** | Usuarios contratados; valor total proyectos ($) | ✅ Fase 2 |
| **Supervisión — Tablero** | Export Excel (con filtros); usuarios contratados; AR/AU/AV; Depto/Municipio en lugar de Ejecutor | ✅ Fase 2 |
| **Contratos OR** | Filtro por Operador de Red en gráficas curva S | ✅ Fase 2 |
| **Comunidades** | 4 curvas S (archivo Colombia Solar) | ✅ Fase 2 |
| **Colombia Solar** | Ordenar tabla por meses | ✅ Fase 2 |
| **Gestión del Sector** | Config alertas (Topocoro); gráfica embalses en slide; slide térmica; botón PDF XM | ✅ Fase 2 |
| **Gestión del Sector — Informe** | Fecha corte KPIs; demanda regulada/no regulada; gráficas pendientes | ✅ Fase 2 |
| **Subsidios** | Corte 15 mayo; año 2026 predeterminado; "Valor Comprometido en Resoluciones" | ✅ Fase 2 |
| **Presupuesto** | Corte 1 de mayo | ✅ Fase 2 |
| **FENOGE** | Curvas S hasta jun/jul 2026 | ✅ Fase 2 |
| **Portal** | Botón boletín energético | ✅ Fase 2 |
| **Informe / Chatbot** | Informe diario con datos DEE; chatbot multi-menú | ✅ Fase 2 |
| **Portal — X** | Pestaña expertos en energía en X | ❌ Intentado 17-may; API X de pago |
| **Hidrocarburos** | Tableros hidrocarburos | ⏳ Pendiente junio |

**C. Gestión de incidencia de servidor (apoyo de la contratista; resolución por TI)**

| Fecha | Evento |
|-------|--------|
| **19 may** | El servidor `172.17.0.46` (SRVWEBPRDCTRLXM) comienza a presentar pérdida de funcionamiento y accesibilidad. |
| **18 may** | TI identifica fallas de conexión SSH desde el lunes festivo. |
| **24 may 17:04** | Viceministerio (Sr. Víctor Paternina) eleva solicitud de atención prioritaria a Tecnología. |
| **25 may 8:30** | TI realiza sesión de revisión; intenta medidas correctivas (incluida propuesta de segunda tarjeta de red con IP alternativa por Ing. Wilman Rodríguez), **sin éxito**. |
| **25 may 14:45** | Contratista radica caso **Aranda 28237** solicitando restauración al **17 de mayo**. |
| **25 may 15:07** | TI ejecuta restauración del servidor al snapshot **18/05/2026 5:56 a.m.** — última fecha funcional disponible. |
| **25 may 20:32** | Contratista confirma acceso SSH restablecido y verifica funcionamiento del portal. |

*Nota:* la parametrización de red e infraestructura del servidor es competencia exclusiva de TI; la contratista no realizó cambios en la configuración del servidor que hubieran causado la desconexión.

**D. Otras funciones**

- Mantenimiento continuo del chatbot Telegram y notificaciones automáticas.
- Build de producción y despliegue PM2 tras cada entrega significativa.
- Soporte a sincronización SharePoint → PostgreSQL para datos reales de todos los equipos.

*Evidencia:* portal en producción, carpeta evidencias mayo, commits GitHub mayo 2026, correo Aranda 28237.

---

## OBLIGACIONES GENERALES — ACTUALIZAR ÍTEM 1

| No. | Obligación | Avances mayo |
|-----|------------|--------------|
| 1 | Presentar informes de gestión | Se presenta informe de actividades del período 01/05–30/05/2026 (Pago 5 de 12). |
| 4 | Mantener información actualizada | Portal sincronizado con bases reales SharePoint/PostgreSQL; tableros sin datos mock. |

*(Las demás obligaciones generales pueden mantener el texto estándar del Word.)*

---

## ENTREGABLES/PRODUCTOS — ACTUALIZAR

| No. | Entregable | Enlace |
|-----|------------|--------|
| 1 | Portal de Dirección de Energía Eléctrica (Next.js 16 + React 19 + TypeScript + Tailwind 4) — **canal oficial de avances DEE** | https://portaldireccionee.minenergia.gov.co/ |
| 2 | Portal Energético (Plotly Dash + Python) | https://portalenergetico.minenergia.gov.co/ |
| 3 | Chatbot Telegram multi-menú con información DEE | https://t.me/MinEnergiaColombia_bot |
| 4 | Repositorios GitHub actualizados (mayo 2026) | https://github.com/M3l1ss4C4rd0n4/Portal-MME-Frontend · https://github.com/M3l1ss4C4rd0n4/Portal-MME-Backend |
| 5 | Correcciones tableros DEE según Observaciones_Tablero_DEE | Carpeta evidencias mayo / SECOP II |
| 6 | Gestión incidencia servidor Aranda 28237 | `evidencias mayo/RE_ Caída de servidor 172.17.0.46...eml` |

---

## LINK DE EVIDENCIAS

- **SECOP II:** https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9456706
- **Carpeta evidencias 2026:** evidencias melissa cardona 2026 (SharePoint)
- **Evidencias mayo (local):** `/informes del mes/evidencias mayo/`

---

## PENDIENTES PARA JUNIO (opcional — no incluir en informe si no se desea)

- **Pestaña X:** definir con supervisión si se contrata API de X (plan de pago) o se adopta alternativa (agregador, enlaces a perfiles, o reforzar módulo de noticias RSS ya operativo).
- Refinamiento tablero Costo Unitario con datos SUI (pendiente experto).
- Tableros **hidrocarburos**.
- Ajustes visuales finos de reuniones con grupos (iteración continua).

---

## TEXTO LISTO PARA PEGAR EN EL WORD — RESUMEN DOS FASES (Obligación 8)

> Durante mayo de 2026 el trabajo sobre el Portal de Dirección se desarrolló en dos fases. **Fase 1 (1 al 17 de mayo), antes de la caída del servidor:** se implementaron las correcciones acordadas con supervisión en reuniones con los equipos — actualización de Gestión del Sector (valores, gráficas de generación y precio de bolsa, flechas de tendencia), Apropiación Presupuestal (valores reales, gráfica comprometido/obligado, corte 1 de abril), Comunidades Energéticas (filtros Implementadas/Contratos OR/FENOGE, inversión corregida, avance general en OR), Supervisión (indicadores por número de contratos en pantalla inicial), Subsidios (resoluciones 2026, total deuda a la fecha, tres tableros: déficit histórico, detalle de pagos y validaciones), tableros FENOGE 1.0–1.1, separación de módulos Comunidades/Subsidios y actualización de noticias dos veces al día. **Interludio (19 al 25 de mayo):** indisponibilidad del servidor por falla SSH; la contratista apoyó radicando caso Aranda 28237; TI restauró el servidor al snapshot del 17–18 de mayo. **Fase 2 (25 al 30 de mayo), tras la restauración:** se completaron las correcciones del documento *Observaciones_Tablero_DEE* — Supervisión (export Excel, usuarios contratados, valores AR/AU/AV, departamento/municipio), Contratos OR (filtro operador), Comunidades (cuatro curvas S), ajustes de cortes y terminología en Subsidios y Presupuesto, gráfica de embalses y slide de generación térmica, botón descarga PDF XM, configuración de alertas, informe diario unificado con información DEE y chatbot multi-menú. *Pendientes:* pestaña X (API de pago) y tableros hidrocarburos.

---

## TEXTO LISTO PARA PEGAR EN EL WORD — INCIDENTE SERVIDOR (Obligación 4, 5 u 8)

> **Incidencia de servidor (19–25 mayo):** El 24 de mayo el Viceministerio reportó a Tecnología la caída del servidor con IP 172.17.0.46 (SRVWEBPRDCTRLXM), donde se alojan los tableros del Portal de Dirección de Energía Eléctrica, el cual desde el 19 de mayo presentaba pérdida de funcionamiento y accesibilidad. Durante la semana, el Grupo de Tecnología (TI) intentó distintas medidas correctivas — entre ellas, la propuesta del Ing. Wilman Rodríguez de adicionar una segunda tarjeta de red con IP alternativa — **sin lograr restablecer la conexión SSH**. La solución definitiva, ejecutada por TI, fue **restaurar el servidor al último snapshot funcional** mediante el caso **Aranda INC Mesa — 28237**. La contratista apoyó el proceso radicando el incidente el 25 de mayo y solicitando la restauración a la fecha del 17 de mayo; TI ejecutó la restauración al snapshot del 18/05/2026 5:56 a.m. Ese mismo día la contratista verificó el acceso SSH y el funcionamiento del portal. La parametrización de infraestructura del servidor es competencia de TI; la contratista no realizó cambios en la configuración del servidor. *Evidencia:* hilo de correo en carpeta evidencias mayo / SECOP II.

---

## TEXTO LISTO PARA PEGAR EN EL WORD — PESTAÑA X (Obligación 2 u 8)

> **Pestaña Redes Sociales X (actividad cronograma 1-jun):** Por solicitud de supervisión se intentó implementar la diapositiva "¿Qué están hablando los expertos en energía en X?", con monitoreo de cuentas como @MinEnergiaCo, @SergioCabrales, @petrogustavo, @UPME_Colombia, @ACOLGEN, @Superservicios, entre otras. Se desarrolló la interfaz en el portal (sección Redes Sociales del carrusel de inicio) e integración con los widgets oficiales de embed de X. **No fue posible completar la entrega:** la plataforma X eliminó el acceso gratuito a su API y los servicios de syndication que alimentan los embeds responden con error HTTP 429 (Too Many Requests), impidiendo la carga de publicaciones. Se verificó en consola del navegador con más de 370 solicitudes rechazadas a `syndication.twitter.com`. Por esta limitación externa ajena al desarrollo del portal, la funcionalidad se suspendió el 17 de mayo de 2026 para no afectar el rendimiento del sitio. **Para habilitarla se requiere** contratar un plan de pago de la API de X o acordar con supervisión una alternativa tecnológica. Se deja evidencia en carpeta mayo (captura de pantalla) y commit `efca05e32` / `f669863b8` en repositorio GitHub.

---

*Borrador generado: 01 de junio de 2026*
