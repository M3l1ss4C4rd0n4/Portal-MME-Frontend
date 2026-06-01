# INFORME MENSUAL DE ACTIVIDADES

---

## DATOS DEL INFORME

| Campo | Detalle |
|---|---|
| **Pago No.** | **5 DE 12** |
| **Período a pagar** | **01/05/2026 — 30/05/2026** |
| **Fecha de presentación** | **01/06/2026** |

---

## INFORMACIÓN BÁSICA DEL CONTRATO

| Campo | Detalle |
|---|---|
| **Nombre / Razón Social** | MELISSA DE JESUS CARDONA NAVARRO |
| **No. Identificación (C.C.)** | 1193562407 |
| **NIT** | No aplica |
| **Contrato No.** | GGC-0316-2026 |

**Objeto del Contrato:** Apoyar la gestión de actividades técnicas y operativas relacionadas con el proceso de análisis de datos para la estructuración y ejecución de proyectos con FNCER de la Dirección de Energía Eléctrica.

---

## OBLIGACIONES ESPECÍFICAS

### Obligación 1

**Obligación contractual:** Apoyar el seguimiento y análisis de postulaciones relacionadas con la Estrategia Nacional de Comunidades Energéticas, bajo la supervisión del componente de data.

**Avances y logros del mes (Mayo):**

Durante mayo no se adelantaron actividades nuevas de postulaciones o selección muestral de Comunidades Energéticas; la prioridad del mes, definida por la supervisión, fue la estabilización y completitud del Portal de Dirección como plataforma central de seguimiento de todos los grupos de la Dirección de Energía Eléctrica.

No obstante, se atendieron ajustes en el módulo de Comunidades Energéticas derivados de las reuniones de revisión con los equipos (Fase 2, tras restauración del servidor): se eliminó la gráfica de curva S de operadores de red que no cumplía la metodología solicitada; se incorporaron cuatro gráficas de curva S con las hojas verdes y azules del archivo *Cuadro Inauguraciones_Colombia Solar Completo_CE_OR.xlsx*; se ordenó la tabla de Colombia Solar por meses; y se habilitó exportación a Excel del detalle por departamento y municipio.

*Evidencia:* capturas del tablero Comunidades Energéticas, enlace SharePoint del archivo fuente, carpeta evidencias mayo / SECOP II.

---

### Obligación 2

**Obligación contractual:** Brindar apoyo en la organización, clasificación y sistematización de los insumos necesarios para la elaboración de productos analíticos derivados del sistema de información de la estrategia.

**Avances y logros del mes (Mayo):**

Mayo fue el mes de consolidación del Portal de Dirección (`https://portalviceministerioenergia.minenergia.gov.co/`) como producto analítico unificado de la Dirección, en cumplimiento de la directriz del Viceministro de centralizar en el portal los avances que antes presentaba cada grupo en Power BI. Durante el mes el dominio público cambió de `portaldireccionee.minenergia.gov.co` al nuevo enlace por solicitud del Viceministro. El trabajo se desarrolló en dos fases, separadas por la caída del servidor (19–25 de mayo).

**Fase 1 — Antes de la caída del servidor (1 al 17 de mayo):** correcciones acordadas con supervisión (Diana Gutiérrez y Daniel Villarreal) en reuniones con los equipos:

- **Gestión del Sector:** actualización de valores del slide (distintos al Portal Energético) con verificación de sincronización; gráficas de proporción de generación y precio de bolsa en la vista móvil; flechas de tendencia (↑↓→) en KPIs.
- **Apropiación Presupuestal:** valores reales; gráfica apilada donde comprometido y obligado no se suman; etiqueta *a corte del 1 de abril*.
- **Comunidades Energéticas:** filtros Implementadas / Contratos OR / FENOGE 1.0–1.1; corrección del valor de inversión en inicio; en Contratos OR, renombramiento de *avance de obra* a *avance general*.
- **Supervisión FNCER:** visualización por número de contratos; indicadores en pantalla inicial (HomeSlider).
- **Subsidios:** solo resoluciones 2026; *total deuda a la fecha* con corte 1 de abril y nota de pendiente de desembolso por Hacienda; fórmula Total apropiado − Total asignado = Total disponible; tres tableros nuevos (déficit histórico, detalle de pagos, validaciones); filtros de resoluciones/trimestres al seleccionar 2026.
- **FENOGE y portal:** tableros 1.0 y 1.1; separación de rutas Comunidades/Subsidios; noticias del carrusel con actualización dos veces al día.

Paralelamente (2–10 may) se refactorizó la arquitectura del HomeSlider: extracción de slides modulares, capa `apiService.ts`, librerías `format.ts`, `kpi-logic.ts`, `svg-math.ts` y 49 tests Vitest.

**Interludio — Caída del servidor (19 al 25 de mayo):** indisponibilidad para despliegues por falla SSH. La contratista apoyó radicando caso Aranda 28237; TI restauró el servidor al snapshot del 17–18 de mayo.

**Fase 2 — Tras restauración (25 al 30 de mayo):** correcciones del documento *Observaciones_Tablero_DEE.docx* y solicitudes adicionales — Supervisión (export Excel con filtros, usuarios contratados col. BL, valores AR/AU/AV, departamento/municipio en Sankey, valor total en slide, indicador sistemas fotovoltaicos); Contratos OR (filtro operador en curvas S); Subsidios (actualización del tablero de déficit histórico con *necesidad presupuestal de la vigencia* = Subsidios − Contribuciones, apropiación PGN, recursos faltantes y gráficas de déficit acumulado / apropiación PGN según metodología del equipo); cortes actualizados (presupuesto 1 may, subsidios 15 may); terminología *Valor Comprometido en Resoluciones*; curvas S FENOGE hasta jun/jul 2026; gráfica de embalses en slide; configuración de alertas (consulta embalse Topocoro); slide generación térmica y botón PDF XM; año 2026 predeterminado en detalle de pagos; verificación de actualización automática de bases vía sync SharePoint/ETL; informe diario unificado; chatbot multi-menú con información DEE; botón flotante *Resumen Ejecutivo* en el portal para descargar el PDF diario (mismo enviado por correo y Telegram).

**Cronograma acordado con supervisión:**

| N° | Actividad | Entrega |
|---|---|---|
| 1 | Tableros restantes Subsidios | 4-may ✅ |
| 2 | Señales tendencia KPIs Gestión del Sector | 4-may ✅ |
| 3 | Tableros FENOGE 1.0 y 1.1 | 11-may ✅ |
| 4 | Ajustes tablas informe Gestión del Sector | 18-may ✅ |
| 5 | Informe estandarizado Dirección de Energía | 25-may ✅ |
| 6 | Pestaña X — expertos en energía | 1-jun ❌* |

*\*Actividad 6:* se desarrolló interfaz y cuentas (@MinEnergiaCo, @SergioCabrales, @petrogustavo, @UPME_Colombia, @ACOLGEN, @Superservicios, entre otras), pero X cobra por su API; embeds respondieron HTTP 429. Suspendido 17-may. Requiere API de pago o alternativa acordada con supervisión.

**Pendientes reportados a supervisión para junio:** tableros hidrocarburos; ajustes visuales finos de reuniones con grupos; refinamiento tablero Costo Unitario (pendiente experto SUI).

*Evidencia:* repositorios GitHub Portal-MME-Frontend y Portal-MME-Backend (commits mayo 2026), portal en producción, carpeta evidencias mayo / SECOP II.

---

### Obligación 3

**Obligación contractual:** Apoyar el almacenamiento, gestión y organización de documentos y archivos generados en el marco de las actividades contractuales, garantizando su adecuada administración en los sistemas de información dispuestos por la entidad.

**Avances y logros del mes (Mayo):**

1. Control de versiones continuo en GitHub (`Portal-MME-Frontend`, `Portal-MME-Backend`) con trazabilidad por fecha y mensajes descriptivos.

2. Documento *Observaciones_Tablero_DEE.docx* recibido de supervisión; ítems implementados documentados en commits.

3. Evidencia de incidencia de servidor: hilo de correo *RE: Caída de servidor 172.17.0.46*, radicado Aranda 28237, restauración 18/05/2026 y verificación 25/05/2026.

4. Documento de configuración de alertas de Gestión del Sector compartido con supervisión.

5. Actualización de documentación técnica: README.md, INDICE.md, AGENTS.md y Skill Pack (flujo de deploy seguro post-incidente).

*Evidencia:* carpeta `informes del mes/evidencias mayo/`, repositorios GitHub, SECOP II.

---

### Obligación 4

**Obligación contractual:** Monitorear diariamente los indicadores de avance en la ejecución de proyectos FNCER, registrando desviaciones en un sistema de seguimiento, generando reportes periódicos sobre el estado de proyectos, incluyendo métricas de eficiencia y cumplimiento de objetivos.

**Avances y logros del mes (Mayo):**

1. **Portal de Supervisión FNCER** operativo con datos reales PostgreSQL, sincronizados desde bases Excel del equipo de Supervisión.

2. **Correcciones Fase 2 (Observaciones_Tablero_DEE):** exportación Excel solo con filtros activos; usuarios contratados (col. BL); valores AR/AU/AV por proyecto; flujo Sankey con Departamento/Municipio en lugar de Ejecutor; valor total de proyectos ($) y sistemas fotovoltaicos en slide y tablero.

3. **Gestión del Sector:** KPIs XM en tiempo real (precio bolsa, generación, embalses, aportes hídricos) con chips de estado y metodología XM/UPME; gráfica de embalses en slide; slide generación térmica con datos PostgreSQL.

4. **Subsidios — déficit presupuestal:** tablero de déficit histórico actualizado con necesidad presupuestal de la vigencia (Subsidios − Contribuciones), apropiación PGN, déficit anual y acumulado FSSRI, recursos faltantes y gráficas comparativas (apropiación PGN vs. déficit acumulado año anterior), conforme al ítem del equipo de Subsidios en *Observaciones_Tablero_DEE.docx*.

5. **Informes automatizados:** informe ejecutivo diario por correo y Telegram con secciones DEE (subsidios, supervisión, apropiación, comunidades); fechas de corte explícitas; demanda regulada = residenciales / no regulada = no residenciales; hidrología, demandas y proyección precio de bolsa.

6. **Continuidad operativa:** entre 19 y 25 de mayo el portal estuvo afectado por indisponibilidad del servidor (competencia TI). Tras restauración Aranda 28237, se verificaron cron jobs, PM2/systemd y pipelines ETL.

*Evidencia:* tablero Supervisión en producción, tablero Subsidios/déficit histórico, correo Aranda 28237, capturas carpeta evidencias mayo.

---

### Obligación 5

**Obligación contractual:** Participar y prestar acompañamiento en las reuniones y sesiones de trabajo, en las que se haga necesaria o conveniente su participación para presentar resultados de análisis y responder consultas de la Dirección, relacionadas en el objeto del contrato.

**Avances y logros del mes (Mayo):**

1. Reuniones de revisión por equipo con Diana Gutiérrez y Daniel Villarreal (Subsidios, Supervisión FNCER, Comunidades, Contratos OR, Presupuesto DEE, Gestión del Sector) para recoger observaciones de tableros Power BI y traducirlas al Portal de Dirección, en línea con la directriz del Viceministro.

2. Seguimiento diario con supervisión; correcciones registradas en *Observaciones_Tablero_DEE.docx* y atendidas por prioridad.

3. Coordinación por incidencia de servidor (24–25 may): atención a solicitud del Viceministerio (Sr. Víctor Paternina); apoyo radicando Aranda 28237; verificación post-restauración. Infraestructura atendida por TI (Luis Rosendo Herrera, Joan Carvajal, Wilman Rodríguez, Nicolás Maldonado).

4. Coordinación técnica con Diana Gutiérrez (metodología CU, bases Excel, chatbot, informes diarios).

*Evidencia:* documento Observaciones_Tablero_DEE, correos y carpeta evidencias mayo / SECOP II.

---

### Obligación 6

**Obligación contractual:** Organizar sesiones de retroalimentación para mejorar las guías y protocolos basados en experiencias del equipo, a fin de monitorear el uso de herramientas y proporcionar soporte para resolver incidencias.

**Avances y logros del mes (Mayo):**

1. Protocolo de atención de observaciones: supervisión consolida correcciones en documento Word → contratista implementa → supervisión valida. Permitió atender seis equipos en un mes con trazabilidad Fase 1 / Fase 2.

2. Incidencia de servidor: rol de contratista limitado a reporte, escalamiento y verificación post-restauración; TI ejecutó diagnóstico, intentos correctivos (incluida propuesta segunda tarjeta de red, sin éxito) y restauración al snapshot 17–18 mayo.

3. Configuración de alertas Gestión del Sector documentada y compartida (incluida consulta sobre embalse Topocoro en alertas).

4. Comunicación sobre cálculo de CU y acceso SUI con Diana Gutiérrez; reunión de contexto con Santiago Santamaría. *Pendiente:* respuesta experto SUI.

*Evidencia:* Observaciones_Tablero_DEE, correo Aranda 28237, documento alertas.

---

### Obligación 7

**Obligación contractual:** Apoyar en la preparación de materiales y documentos técnicos y administrativos, según los requerimientos del equipo de trabajo.

**Avances y logros del mes (Mayo):**

1. Informe estandarizado Dirección de Energía (25–27 may): unificado con estructura del jefe de la Dirección; despachos generación térmica (Sinergox XM); hidrología mejorada; demandas SIN; fechas de corte; secciones DEE.

2. Botón flotante **Resumen Ejecutivo** (solicitud supervisión, fin de mayo): descarga desde el portal el mismo PDF del informe ejecutivo diario enviado por correo y Telegram (paleta azul `#1D3544` del informe); ubicado sobre el botón amarillo del boletín Panorama Energético.

3. Botón descarga boletín energético (Panorama Energético) y botón PDF informes XM en slide Gestión del Sector.

4. Materiales técnicos: refactorización HomeSlider, 49 tests Vitest, AGENTS.md, guía deploy seguro.

5. Presente informe mensual — Pago 5 de 12, período 01/05–30/05/2026.

*Evidencia:* informe diario en correo supervisión, portal en producción, presente documento.

---

### Obligación 8

**Obligación contractual:** Cumplir con las demás funciones que asigne el supervisor, relacionadas con la naturaleza del objeto contractual y necesarias para la consecución del fin del objeto del contrato.

**Avances y logros del mes (Mayo):**

Por decisión del Viceministro, la Dirección centraliza avances en el Portal de Dirección; la prioridad de mayo fue que Diana y Daniel reunieran a cada equipo, recogieran correcciones y la contratista las implementara con datos reales y portal operativo.

**Resumen de entregas del mes:**

- **Fase 1 (1–17 may):** 20 ajustes iniciales en Gestión del Sector, Apropiación, Comunidades, Supervisión (slide), Subsidios (3 tableros + filtros 2026), FENOGE, forma del portal y refactorización técnica.
- **Fase 2 (25–30 may):** ítems *Observaciones_Tablero_DEE* (Supervisión Excel/AR/AU/AV/Depto-Municipio, Contratos OR operador, 4 curvas S, cortes mayo, embalses, térmicas, PDF XM, informe y chatbot DEE, sync SharePoint, boletín energético, botón Resumen Ejecutivo en portal, cambio de URL pública a `portalviceministerioenergia.minenergia.gov.co`, déficit presupuestal subsidios).

**Incidencia de servidor (apoyo contratista; resolución TI):**

| Fecha | Hecho |
|---|---|
| 18 may | Fallas SSH (lunes festivo) |
| 19 may | Pérdida de funcionamiento servidor 172.17.0.46 |
| 24 may | Viceministerio eleva prioridad a TI |
| 25 may 8:30 | TI intenta medidas (incl. segunda tarjeta red) — sin éxito |
| 25 may 14:45 | Contratista radica Aranda 28237 |
| 25 may 15:07 | TI restaura snapshot 18/05/2026 5:56 a.m. |
| 25 may 20:32 | Contratista verifica acceso y portal |

**No completado / pendiente junio:** pestaña X (API de pago); tableros hidrocarburos; ajustes visuales finos; CU con datos SUI.

Mantenimiento chatbot Telegram, builds PM2 y sincronización SharePoint → PostgreSQL durante todo el mes posible.

*Evidencia:* portal en producción, evidencias mayo, GitHub, correo Aranda 28237.

---

## OBLIGACIONES GENERALES

| No. | Obligación | Avances y logros del mes (Mayo) |
|---|---|---|
| 1 | Presentar informes de gestión en plazo | Se presenta informe del período 01/05/2026 al 30/05/2026 (Pago 5 de 12). |
| 2 | Cumplir directrices del Sistema de Gestión de Calidad | Se revisa correo institucional y se atienden tareas asignadas oportunamente. |
| 3 | Asistir a reuniones del supervisor | Se participa en reuniones presenciales/virtuales con supervisión y equipos de la DEE para revisión de tableros. |
| 4 | Mantener información actualizada en sistemas del Ministerio | Portal sincronizado con SharePoint/PostgreSQL; tableros con datos reales. |
| 5 | Gestionar trámites en aplicativos institucionales (ARGO, etc.) | Se gestionan trámites y documentos asignados oportunamente. |
| 6 | Confidencialidad de la información | Se cumple política de confidencialidad; no divulgación a terceros no autorizados. |
| 7 | Acuerdo de confidencialidad | Suscrito en Acta de Inicio. |
| 8 | Aportes seguridad social | Acreditados conforme normativa vigente. |
| 9 | Salvaguarda de equipos del Ministerio | Responsabilidad asumida sobre equipos en uso. |
| 10 | Informar ARL | No aplica este período. |
| 11 | Acatar instrucciones del supervisor | Se acatan directrices de supervisión y del Viceministro sobre centralización de avances en el portal. |
| 12 | Desplazamientos | No aplica — trabajo remoto. |
| 13 | Responsabilidad civil y penal | Cumplimiento según ley. |
| 14 | Actualizar SIGEP | Hoja de vida actualizada. |
| 15 | Variación régimen tributario | Sin novedad reportada. |
| 16 | Cumplimiento oportuno para trámite de pagos | Obligaciones ejecutadas según cronograma. |
| 17 | Cuentas de cobro / facturas | Presentadas según forma de pago del contrato. |
| 18 | Cargar informes en SECOP II | Informe y evidencias en preparación para carga en SECOP II (ítem 7-Ejecución del contrato) con el presente documento y soportes de la carpeta evidencias mayo. |
| 19 | Backup al finalizar contrato | Pendiente entrega al cierre del contrato. |
| 20 | Entrega de bienes del Ministerio | Pendiente al finalizar contrato. |
| 21 | Devolver carnet de contratista | Pendiente al finalizar contrato. |
| 22 | Seguridad y Salud en el Trabajo | Cumplimiento Res. 0312, 042 y 0331; Anexo SGSST diligenciado. |
| 23 | Equipos y herramientas propias | Estación de trabajo y herramientas de desarrollo disponibles. |
| 24 | Bioseguridad | Protocolos institucionales aplicados. |
| 25 | Políticas internas MME | Cumplimiento equidad, seguridad información, protección datos. |
| 26 | Otras obligaciones necesarias | Atención de requerimientos adicionales del portal DEE; pendientes X e hidrocarburos comunicados a supervisión. |

---

## DECLARACIÓN DE CUMPLIMIENTO

1. Con la firma del presente informe de actividades certifico que las cuentas presentadas hasta la fecha, con ocasión de este contrato, se encuentran debidamente cargadas en el SECOP II en la oportunidad debida y con los soportes correspondientes.

2. Con la firma del presente informe de actividades certifico que he cumplido con el pago de los aportes al sistema de seguridad social integral conforme a los ingresos recibidos y de conformidad con la normativa vigente.

---

## ENTREGABLES / PRODUCTOS

| No. | Entregable | Enlace / descripción |
|---|---|---|
| 1 | Portal de Dirección de Energía Eléctrica (Next.js 16 + React 19 + TypeScript + Tailwind 4). En mayo: correcciones Fase 1 y Fase 2, informe y chatbot DEE, botón descarga Resumen Ejecutivo. URL vigente desde solicitud del Viceministro. | https://portalviceministerioenergia.minenergia.gov.co/ |
| 2 | Portal Energético (Plotly Dash + Python) | https://portalenergetico.minenergia.gov.co/ |
| 3 | Chatbot Telegram multi-menú con información DEE | https://t.me/MinEnergiaColombia_bot |
| 4 | Repositorios GitHub actualizados (mayo 2026) | https://github.com/M3l1ss4C4rd0n4/Portal-MME-Frontend · https://github.com/M3l1ss4C4rd0n4/Portal-MME-Backend |
| 5 | Correcciones tableros según *Observaciones_Tablero_DEE.docx* + evidencias mayo | `evidencias mayo/Observaciones_Tablero_DEE.docx` · `evidencias mayo/RE_ Caída de servidor 172.17.0.46...eml` · capturas portal (pendiente compilar PDF) · SECOP II |
| 6 | Gestión incidencia servidor — Aranda 28237 | `evidencias mayo/RE_ Caída de servidor 172.17.0.46...eml` |

---

## NOTAS

Previo a la generación del informe el contratista debe cargar en SECOP II, ítem "7-Ejecución del contrato", opción Documentos de Ejecución del contrato, las evidencias y soportes de las actividades del mes e incluir en el informe el link de consulta pública.

Lo anterior deberá ser verificado por la supervisión como requisito para la aprobación de la cuenta del respectivo mes.

Luego de la aprobación del informe en NEON, cargar en SECOP II, ítem "7-Ejecución del contrato", opción Plan de pagos, el informe con el radicado NEON.

**Pendiente antes de radicar:** tomar capturas de pantalla del portal (inicio, Supervisión, Subsidios/déficit, Comunidades, botones flotantes) y compilar PDF de evidencias, siguiendo el formato de *Evidencias FEBRERO 2026.pdf*.

---

## LINK DE VERIFICACIÓN DE EVIDENCIAS

**SECOP II:** https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9456706&isFromPublicArea=True&isModal=true&asPopupView=true

**Carpeta evidencias Dirección de Energía 2026:** evidencias melissa cardona 2026 (SharePoint)

**Evidencias mayo (local):** `/home/admonctrlxm/portal-direccion-mme/informes del mes/evidencias mayo/`

---

## CONTRATISTA

**Nombre:** Melissa De Jesús Cardona Navarro  
**C.C.:** 1.193.562.407  
**Contrato:** GGC-0316-2026  

**FIRMA:**

___________________________________  
Melissa De Jesús Cardona Navarro  
C.C. 1.193.562.407

---

*Informe redactado: 01 de junio de 2026 — Copiar secciones de avances al Word `INFORME MENSUAL DE ACTIVIDADES - Mayo 2026.docx` conservando formato de tabla del template. Texto listo para pegar en: `INFORME MENSUAL DE ACTIVIDADES - MAYO 2026 - COPIAR A WORD.md`*
