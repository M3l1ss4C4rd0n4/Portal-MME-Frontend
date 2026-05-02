# INFORME MENSUAL DE ACTIVIDADES - FEBRERO 2026
## ESTRUCTURA DEL DOCUMENTO

---

## INFORMACIÓN BÁSICA DEL CONTRATO

| Campo | Valor |
|-------|-------|
| **PAGO No.** | 2 DE 12 |
| **PERÍODO A PAGAR** | 01/02/2026 - 28/02/2026 |
| **FECHA PRESENTACIÓN DEL INFORME** | 02/03/2026 |
| **CONTRATISTA** | MELISSA DE JESUS CARDONA NAVARRO |
| **C.C** | 1193562407 |
| **NIT** | No aplica |
| **Contrato No.** | GGC-0316-2026 |

**Objeto del Contrato:**
Apoyar la gestión de actividades técnicas y operativas relacionadas con el proceso de análisis de datos para la estructuración y ejecución de proyectos con FNCER de la Dirección de Energía Eléctrica.

---

## OBLIGACIONES ESPECÍFICAS

La tabla tiene DOS columnas principales:
- **Columna Izquierda:** OBLIGACIONES Y/O ACTIVIDADES (Conforme se establecen en el Contrato)
- **Columna Derecha:** AVANCES Y LOGROS DEL MES

### OBLIGACIÓN 1
**Texto del Contrato:**
Apoyar el seguimiento y análisis de postulaciones relacionadas con la Estrategia Nacional de Comunidades Energéticas, bajo la supervisión del componente de data.

**Avances y Logros del Mes (Febrero):**
Durante el período reportado (1 al 28 de febrero de 2026), por solicitud directa de la supervisión, se brindó apoyo analítico y de ciencia de datos para la estructuración de la población objetivo del programa Colombia Solar (Barranquilla 2025). Se procesaron las bases de datos de facturación de AFINIA para determinar la selección muestral, el Índice de Focalización (IF) y la georreferenciación de los usuarios a postular.

Se auditó y procesó la base de datos de beneficiarios del programa, logrando trazabilidad completa y la entrega de productos analíticos automatizados mediante scripts en Python (librerías Pandas, Plotly y Folium):

1. **Filtros de elegibilidad:** A partir de una base original de 386.008 usuarios, se aplican 9 filtros paramétricos simultáneos (excluyendo código 6, nomenclatura AP, estratos >3, consumo <40 o >240 kWh/mes, y cartera >$100.000), obteniendo una población depurada de 47.950 usuarios elegibles (12.4% de la base).

2. **Índice de Focalización (IF):** Se diseñó y calculó un algoritmo de puntuación combinando estrato (30%), horas compensadas (5%), consumo (50%) y valor de cartera (15%), normalizado de 0 a 1.

3. **Clustering Territorial:** Se agrupó la población en 155 barrios del POT, priorizados mediante la métrica de "Suma IP" (volumen de usuarios × intensidad de vulnerabilidad).

4. **Ecosistema de Mapas Interactivos (HTML):** Por solicitud de la mesa técnica (Andrés Felipe Castellanos), se desarrollaron visualizaciones georreferenciadas que cruzan las coordenadas de los transformadores con los polígonos del POT. Se generó un portafolio web navegable (index.html) que incluye:
   - mapa_poligonos_barrios_pot.html: 189 barrios coloreados según su nivel de focalización.
   - mapa_top_20_barrios_prioritarios.html: Visualización focalizada en las zonas de mayor demanda.
   - mapa_calor_if.html: Heatmap evidenciando la concentración geoespacial de vulnerabilidad.
   - mapa_barrios_y_transformadores.html: Mapeo exacto de ~4.500 transformadores eléctricos priorizados.

---

### OBLIGACIÓN 2
**Texto del Contrato:**
Brindar apoyo en la organización, clasificación y sistematización de los insumos necesarios para la elaboración de productos analíticos derivados del sistema de información de la estrategia.

**Avances y Logros del Mes (Febrero):**
Por orientación directa de la supervisión, se priorizó la construcción y estabilización del orquestador inteligente del Portal Energético MME, compuesto por 4.197 líneas de código en Python y expuesto mediante una API REST en FastAPI. Aunque se diseñó inicialmente para el bot local de WhatsApp del ingeniero Óscar Parra, por solicitud de la supervisión se amplió su alcance desarrollando un cliente nativo en Telegram con capacidades interactivas avanzadas.

Se habilitaron operativamente múltiples intenciones analíticas, destacando:

1. **Estado actual:** Fichas en tiempo real de Generación Total (GWh), Precios de Bolsa (COP/kWh) y Embalses (%), con cruce de percentiles históricos (2020–2025) y fechas reales de XM.

2. **Predicciones del sector:** Análisis de proyecciones a 90 días con cálculo de rangos y tendencias esperadas.

3. **Noticias del sector:** Módulo de agregación (news_service.py) que extrae y resume las 3 noticias más destacadas del día usando APIs de Google News y GNews.

4. **Anomalías:** Sistema de detección de irregularidades estadísticas mediante cálculo de z-score.

5. **Informe ejecutivo automático:** Reporte reestructurado en 4 secciones accionables, asistido por Inteligencia Artificial (LLM Groq llama-3.3-70b) con contexto JSON estructurado, ajustado tras retroalimentación estratégica del supervisor.

Para garantizar la veracidad de los datos analizados por la IA, se consolidó el motor predictivo basado en 13 fuentes utilizando modelos Ensemble (Prophet + ARIMA). Se estructuró una Política de Confianza de Predicciones, estableciendo niveles de confiabilidad paramétricos (ej. GENE_TOTAL y EMBALSES calificados como MUY_CONFIABLE con MAPE < 10%). Asimismo, se sistematizó una auditoría ex-post diaria a las 8:00 AM que validaba automáticamente las desviaciones de los modelos frente a los datos reales observados.

---

### OBLIGACIÓN 3
**Texto del Contrato:**
Apoyar el almacenamiento, gestión y organización de documentos y archivos generados en el marco de las actividades contractuales, garantizando su adecuada administración en los sistemas de información dispuestos por la entidad.

**Avances y Logros del Mes (Febrero):**
Durante febrero se generaron y organizaron en los repositorios institucionales de la entidad los siguientes documentos técnicos:

**Documentación del Portal Energético (Repositorio GitHub docs/):**

1. **INFORME_ARQUITECTURA_COMPLETA_2026-03-02.md:** Inspección exhaustiva de la arquitectura del servidor, documentando 74.500 líneas de código crítico, 42 endpoints y 3 bases de datos.

2. **INVENTARIO_SERVIDOR.md:** Documentación del estado físico del servidor, incluyendo especificaciones técnicas (Intel i7-14700K, 96 GB RAM, 2 TB SSD NVMe), particionamiento de disco y uso de recursos.

3. **AUDITORIA_MODELOS_PREDICCION.md:** Análisis de los 13 modelos predictivos del sistema, con evaluación de confiabilidad y estrategias de mitigación.

4. **GUIA_INSTALACION.md:** Manual paso a paso para replicar el ambiente de desarrollo y producción.

Adicionalmente, se actualizó el README.md principal del repositorio GitHub con la descripción del orquestador inteligente, sus capacidades y arquitectura técnica.

---

### OBLIGACIÓN 4
**Texto del Contrato:**
Monitorear diariamente los indicadores de avance en la ejecución de proyectos FNCER, registrando desviaciones en un sistema de seguimiento, generando reportes periódicos sobre el estado de proyectos, incluyendo métricas de eficiencia y cumplimiento de objetivos.

**Avances y Logros del Mes (Febrero):**
Se estableció el monitoreo continuo de los indicadores del sector energético mediante el orquestador inteligente, con las siguientes capacidades operativas:

1. **Monitoreo en tiempo real:** Sistema de consulta automatizada de datos de XM (eXtracto de Mercado) para Generación Total, Precios de Bolsa y Embalses.

2. **Detección de anomalías:** Algoritmo de z-score que identifica valores atípicos en las series temporales.

3. **Auditoría diaria:** Proceso automático a las 8:00 AM que compara predicciones vs. valores reales.

4. **Reportes ejecutivos:** Generación automática de informes enriquecidos con análisis de IA.

5. **Dashboard interactivo:** Panel de control web (Dash + Plotly) para visualización de métricas FNCER.

---

### OBLIGACIÓN 5
**Texto del Contrato:**
Participar y prestar acompañamiento en las reuniones y sesiones de trabajo, en las que se haga necesaria o conveniente su participación para presentar resultados de análisis y responder consultas de la Dirección, relacionadas en el objeto del contrato.

**Avances y Logros del Mes (Febrero):**
Se participó en reuniones técnicas con la supervisión y la mesa técnica (Andrés Felipe Castellanos) para:

1. Presentar los avances del orquestador inteligente y el chatbot de Telegram.

2. Validar los mapas geoespaciales desarrollados para el programa Colombia Solar.

3. Revisar la metodología de focalización y el Índice de Focalización (IF).

4. Definir prioridades para la documentación técnica del sistema.

5. Ajustar las funcionalidades del bot según retroalimentación estratégica.

---

### OBLIGACIÓN 6
**Texto del Contrato:**
Organizar sesiones de retroalimentación para mejorar las guías y protocolos basados en experiencias del equipo, a fin de monitorear el uso de herramientas y proporcionar soporte para resolver incidencias.

**Avances y Logros del Mes (Febrero):**
Se documentaron las mejores prácticas y lecciones aprendidas durante el desarrollo del orquestador inteligente:

1. **Guía de desarrollo de chatbots:** Documentación de patrones para crear interfaces conversacionales con FastAPI y Telegram.

2. **Protocolos de integración de IA:** Estándares para incorporar modelos LLM (Groq) en pipelines de análisis de datos.

3. **Manejo de errores y logging:** Estrategias de captura y reporte de excepciones para sistemas en producción.

4. **Auditoría de modelos predictivos:** Metodología para evaluar y calibrar modelos de forecasting.

---

### OBLIGACIÓN 7
**Texto del Contrato:**
Apoyar en la preparación de materiales y documentos técnicos y administrativos, según los requerimientos del equipo de trabajo.

**Avances y Logros del Mes (Febrero):**
Se elaboraron los siguientes materiales técnicos:

1. **Código fuente del orquestador:** 4.197 líneas de Python organizadas en módulos especializados (orchestrator_service.py, news_service.py, predictions_service.py, geo_service.py).

2. **Cliente de Telegram:** Bot interactivo con menús dinámicos, manejo de estados y respuestas enriquecidas.

3. **Scripts de análisis de datos:** Automatizaciones para procesamiento de bases AFINIA, cálculo de IF y generación de mapas.

4. **Documentación técnica:** 4 informes markdown detallando arquitectura, inventario, auditoría e instalación.

5. **Portafolio de mapas:** 7 visualizaciones geoespaciales interactivas en HTML.

---

### OBLIGACIÓN 8
**Texto del Contrato:**
Cumplir con las demás funciones que asigne el supervisor, relacionadas con la naturaleza del objeto contractual y necesarias para la consecución del fin del objeto del contrato.

**Avances y Logros del Mes (Febrero):**
Se ejecutaron funciones adicionales asignadas por la supervisión:

1. **Migración de tecnologías:** Transición de bot de WhatsApp a Telegram según requerimientos operativos.

2. **Optimización de modelos:** Consolidación del motor predictivo con 13 fuentes y políticas de confianza.

3. **Soporte técnico:** Resolución de incidencias en tiempo real durante el desarrollo.

4. **Capacitación interna:** Transferencia de conocimiento sobre el uso del orquestador al equipo.

---

## OBLIGACIONES GENERALES

| # | Obligación | Avances |
|---|------------|---------|
| 1 | Presentar informes de gestión | Informe mensual de febrero presentado |
| 2 | Cumplir directrices de Calidad | Aplicación de estándares de documentación técnica |
| 3 | Asistir a reuniones | Participación en reuniones técnicas con supervisión |
| 4 | Mantener información actualizada | Repositorio GitHub actualizado con documentación |
| 5 | Gestionar trámites en aplicativos | Uso de ARGO para gestión documental |
| 6 | Confidencialidad | Manejo responsable de datos sensibles de usuarios |
| 7 | Acuerdo de confidencialidad | Suscrito conforme a políticas del MME |
| 8 | Aportes seguridad social | Pagos al día conforme a normativa |
| 9 | Salvaguarda de equipos | Uso responsable de estación de trabajo asignada |
| 10 | Informar ARL | Novedad de contrato registrada |
| 11 | Acatar instrucciones | Seguimiento de directrices de supervisión |
| 12 | Desplazamientos | No aplica - trabajo remoto |
| 13 | Responsabilidad civil/penal | Cumplimiento de normativa vigente |
| 14 | Actualizar SIGEP | Hoja de vida actualizada |
| 15 | Variación tributaria | Sin cambios en régimen |
| 16 | Cumplimiento para pagos | Obligaciones ejecutadas según cronograma |
| 17 | Cuentas de cobro | Facturación oportuna |
| 18 | Cargar informes SECOP II | Informe cargado en plataforma |
| 19 | Backup al finalizar | En proceso - se entregará al cierre |
| 20 | Entrega de bienes | Pendiente - bienes en uso |
| 21 | Carnet de contratista | Vigente |
| 22 | Seguridad y Salud en el Trabajo | Cumplimiento de resoluciones 0312, 042 y 0331 |
| 23 | Equipos y herramientas | Estación de trabajo propia configurada |
| 24 | Bioseguridad | Aplicación de protocolos institucionales |
| 25 | Políticas internas | Aplicación de políticas de equidad, seguridad de información y protección de datos |
| 26 | Otras obligaciones | Ninguna adicional reportada |

---

## DECLARACIÓN DE CUMPLIMIENTO

1. Con la firma del presente informe de actividades certifico que las cuentas presentadas hasta la fecha, con ocasión de este contrato, se encuentran debidamente cargadas en el SECOP II en la oportunidad debida y con los soportes correspondientes.

2. Con la firma del presente informe de actividades certifico que he cumplido con el pago de los aportes al sistema de seguridad social integral conforme a los ingresos recibidos y de conformidad con la normativa vigente.

---

## ENTREGABLES/PRODUCTOS

1. **Repositorio GitHub del Portal Energético actualizado:** Orquestador IA, Scripts ARGIS, Documentación técnica generada en febrero (Arquitectura E2E, Inventario Servidor, Auditoría Predicciones).

2. **Plataforma multipágina portal energético expuesta a la web.**

3. **Chat bot de Telegram**

4. **Entregables 1 al 4 (Bases de datos Excel) + Informe de Validación (PDF) del Programa Colombia Solar + Portafolio de Visualización Geoespacial Colombia Solar (7 Mapas Interactivos HTML con índice de navegación)**

---

## NOTAS

Previo a la generación del informe el contratista debe cargar en la plataforma SECOP II en el ítem "7- Ejecución del contrato" opción de Documentos de Ejecución del contrato, las evidencias y/o soportes de las actividades realizadas en el mes e incluir en el informe de actividades el link de consulta pública en el que podrán ser consultadas estas.

Lo anterior deberá ser verificado por parte de la supervisión como requisito para la aprobación de la cuenta del respectivo mes.

Luego de la aprobación del informe en NEON, el contratista debe cargar en SECOP II, ítem "7-Ejecución del contrato" opción Plan de pagos, el informe con el radicado que genera la plataforma NEON.

Lo anterior deberá ser verificado por parte de la supervisión como requisito para la aprobación de la cuenta del mes siguiente.

---

## LINKS DE EVIDENCIAS

**LINK DE VERIFICACIÓN DE EVIDENCIAS, SECOP II:**
https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9456706

**LINK DE EVIDENCIAS CARPETA DE DIRECCIÓN DE ENERGÍA 2025:**
evidence melissa cardona 2026

---

*Documento generado a partir del análisis del PDF del informe de febrero 2026*
