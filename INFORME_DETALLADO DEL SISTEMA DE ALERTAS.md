# Informe Técnico: Lógica de Alertas, Semáforos, Estado Actual y Tendencias del Sector Energético

**Destinatario:** Equipo de Ingenieros del Sector Energético — Ministerio de Minas y Energía  
**Asunto:** Documentación detallada de los criterios, fuentes y métodos utilizados en el Portal de Dirección, el Chatbot del Viceministro y el Informe Ejecutivo Diario.  
**Versión:** 2.1 — mayo 2026  
**Guía resumida (solo estados por métrica):** [`GUIA_ESTADOS_Y_ALERTAS_METRICAS.md`](GUIA_ESTADOS_Y_ALERTAS_METRICAS.md)



## Introducción

Este documento explica **qué decide el sistema**, **con qué número decide** y **por qué se eligió ese número**. La intención es que cualquier ingeniero del sector energético pueda revisar la metodología, validar las cifras y entender los criterios sin necesidad de leer código.

Todos los umbrales operativos del sistema están respaldados por resoluciones de la CREG o por publicaciones oficiales de XM/CND. Cuando un umbral no proviene de una norma específica, se identifica explícitamente como **"criterio operativo del CND"** o **"criterio del equipo técnico"** para máxima transparencia.

El sistema opera sobre cinco pilares lógicos:

1. **Estado Actual del Sector.** Tres fichas de indicadores clave para el Viceministro: Generación Total, Precio de Bolsa Nacional y Porcentaje de Embalses. El nivel de embalses se evalúa con el **Índice NE oficial** (Resolución CREG 209 de 2020), comparándolo con la **Senda de Referencia mensual publicada por XM/CND**.

2. **Tendencias.** Variación porcentual del valor actual contra dos referencias: el promedio de los últimos 7 días (corto plazo) y la media histórica multianual del mismo mes (largo plazo).

3. **Alertas Operativas.** Detección automática sobre seis frentes:
   - **Demanda excesiva sostenida** — criterio operativo del CND basado en el percentil 99 del histórico XM.
   - **Nivel de embalses** — Índice NE oficial (Resolución CREG 209/2020).
   - **Aportes hídricos** — Índice HSIN oficial (Resolución CREG 026/2014, Artículo 2), con umbral del 90 %.
   - **Precio de bolsa** — Índice PBP oficial contra los tres niveles regulatorios PEI/PE/PES (Resolución CREG 101 066/2024).
   - **Estrés térmico** — criterio operativo del CND.
   - **Datos congelados** — control de calidad sobre la API de XM.

4. **Semáforo Hidrológico por Embalse Individual.** Matriz que combina la **importancia relativa** del embalse (su participación en la capacidad del SIN) con su **disponibilidad de agua** (volumen útil). Se usa en el correo diario y en el chatbot.

5. **Semáforos Visuales del Portal Web.** Capa visual de cinco niveles de color alineada con el Índice NE y los umbrales CREG. Incluye dos indicadores operativos propios: **I2 (Sostenibilidad Hidráulica)** e **I3 (Estrés Térmico)**.

> **Marco regulatorio único:** todos los umbrales se rediseñaron en 2026 para usar **exclusivamente fuentes oficiales** del Estatuto de Desabastecimiento CREG y publicaciones XM/CND. La capa visual del portal (sección 6) deriva sus rangos de la Senda de Referencia CREG y la regla absoluta del 70 %. La capa de alertas operativas (sección 5) usa los índices regulatorios NE, HSIN y PBP exactamente como los define el Estatuto.

> **Naturaleza del sistema:** todas las alertas y semáforos son **complementarios** al monitoreo oficial de XM/CND, no sustitutivos. Los datos se replican desde XM con un rezago de 1 a 3 días, por lo que el monitoreo en tiempo real sigue siendo responsabilidad del Centro Nacional de Despacho.

---

## 1. Fuentes de Datos Oficiales y Marco Regulatorio

### 1.1. Fuentes de datos

| Fuente | Naturaleza | Variables que aporta al sistema | Frecuencia |
|---|---|---|---|
| **XM — eXperto en Mercados** | Operador del SIN | Generación total, generación por tecnología, demanda nacional, aportes hídricos (caudal convertido a energía), media histórica oficial de aportes, volumen útil y capacidad útil por embalse | Diaria, rezago 1–3 días |
| **SIMEM** (Sistema de Información del Mercado de Energía Mayorista) | Mercado de energía | Precio de Bolsa Nacional, Precio Ponderado de Bolsa, Precio de Escasez vigente, demanda regulada y no regulada, precio máximo de oferta nacional | Diaria |
| **XM/CND — Senda de Referencia** | Operación regulatoria | Curva diaria de nivel mínimo del embalse útil del SIN para cada estación (verano y invierno) | Estacional (publicada en mayo y diciembre) |
| **IDEAM** | Meteorología oficial | Pronósticos hidrometeorológicos y alertas oficiales para **ríos** (amarilla/naranja/roja) | Diaria |
| **UNGRD** | Gestión del riesgo | Alertas hidrológicas por amenazas hidrometeorológicas. **Aclaración importante:** UNGRD e IDEAM **NO** emiten alertas basadas en porcentaje de embalse; sus categorías "amarilla/naranja/roja" aplican a ríos e inundaciones. La evaluación del riesgo por nivel de embalse en el SIN es competencia exclusiva de la CREG vía el Estatuto de Desabastecimiento. | Eventual |
| **NASA POWER** | Datos climáticos | Variables atmosféricas (radiación, temperatura, humedad) usadas como insumo para los modelos predictivos | Diaria |
| **CREG** | Regulación nacional | Resoluciones del Estatuto de Desabastecimiento, tres niveles de precio de escasez vigentes, definición y publicación de la Senda de Referencia, perfiles regulatorios por operador de red, límites a pérdidas no técnicas | Mensual (precios) / eventual (resoluciones) |
| **UPME** | Planeación energética | Plan de Expansión de Referencia, capacidad efectiva instalada del Sistema Interconectado Nacional | Anual |

### 1.2. Marco regulatorio aplicado

El sistema usa **exclusivamente** los umbrales definidos en las siguientes resoluciones colombianas. Cada umbral en el código del proyecto cita su resolución de origen.

| Resolución | Tema | Aplicación en el sistema |
|---|---|---|
| **CREG 071 de 2006** | Cargo por Confiabilidad y precio de escasez | Concepto de precio de escasez como techo del precio en bolsa. |
| **CREG 026 de 2014** | Estatuto para Situaciones de Riesgo de Desabastecimiento | Define los **índices NE, HSIN y PBP** y las condiciones del sistema (normal / vigilancia / riesgo). |
| **CREG 140 de 2017** | Metodología del Precio Marginal de Escasez | Cálculo del **PES** (Precio de Escasez Superior). |
| **CREG 121 de 2020** | Inicio y finalización del período de riesgo | Reglas operativas del Estatuto. |
| **CREG 209 de 2020** | Senda de Referencia del embalse agregado del SIN | **Índice NE** y **Senda de Referencia** publicada por XM/CND. |
| **CREG 101 055 de 2024** | Complemento al Estatuto | Periodicidad de evaluación (semanal/bisemanal). |
| **CREG 101 066 de 2024** | Tres niveles de precio de escasez | **PEI**, **PE** y **PES** vigentes. |

### 1.3. Capacidad oficial del SIN

| Concepto | Valor | Fuente |
|---|---|---|
| Capacidad útil de reserva del SIN (embalses convertidos a energía) | ~ 17 000 GWh | CNO Acta 634, planeamiento operativo |
| Capacidad efectiva neta instalada | 21 028,56 MW (31 dic 2025) | Comunicado XM enero 2026 |
| Composición de la matriz (abril 2026) | 58 % hidráulica, 27 % térmica, 15 % solar, < 1 % eólica | Boletín XM 10-abril-2026 |
| Objetivo XM para embalse agregado ante El Niño | ≥ 80 % desde agosto al inicio del verano | Boletín XM 10-abril-2026 |

### 1.4. Trazabilidad: un único punto de verdad

Para garantizar consistencia, **todos los umbrales del sistema** están consolidados en un repositorio central de definiciones regulatorias, accesible tanto a los procesos automáticos (alertas, chatbot, correo diario) como al portal web. Cada valor incluye la resolución CREG que lo respalda al lado.

Esto significa que:

- Si la CREG publica un nuevo precio de escasez, se actualiza una sola vez y la corrección se propaga automáticamente al portal, al chatbot, a las alertas y al correo diario del Viceministro.
- Cualquier auditor externo puede verificar cada umbral contra su resolución de origen sin necesidad de recorrer múltiples sistemas.
- Las modificaciones quedan registradas con su fuente regulatoria, evitando cambios discrecionales sin trazabilidad.

#### Consulta dinámica de senda y precios de escasez

En operación, el sistema consulta primero la base de datos central (tablas de senda diaria y precios mensuales importados de XM/CREG). Solo si no hay registro disponible usa la tabla estática de respaldo documentada en la sección 2.3. Esto garantiza que la senda y los valores PEI/PE/PES reflejen la publicación oficial más reciente sin modificar código.

#### Paquete regulatorio expuesto al portal (`umbralesRegulatorios`)

Cada vez que el portal consulta el estado del sector, la API devuelve un bloque adicional con la clasificación regulatoria calculada en el servidor (misma lógica que alertas y chatbot):

| Campo | Contenido | Uso |
|---|---|---|
| `sendaReferenciaPct` | Senda CREG vigente para la fecha evaluada | Contexto del Índice NE |
| `indiceNe` | SUPERIOR / ALERTA / INFERIOR | Estado regulatorio del embalse agregado |
| `indiceHsin` | NORMAL / VIGILANCIA / DEFICIT_SEVERO / CRITICO | Estado hídrico oficial |
| `indicePbp` | BAJO / ALTO / INDETERMINADO | Presión de precio vs PE de activación |
| `condicionSistema` | NORMAL / VIGILANCIA / RIESGO | Combinación oficial de los tres índices (Art. 3 CREG 026/2014) |
| `pei`, `pe`, `pes` | Precios de escasez vigentes (COP/kWh) | Semáforo de precio en el portal |

El portal usa estos valores para colorear precio de bolsa y aportes, evitando depender de tablas estáticas desactualizadas en el navegador.

#### Cobertura unificada por canal (mayo 2026)

| Canal | Embalses | Aportes | Precio | Condición del sistema |
|---|---|---|---|---|
| Portal — slide principal | Índice NE / senda CREG | HSIN (28 días) | PEI/PE/PES dinámicos | Diagnóstico NE + HSIN |
| Portal — dashboard `/energia` | Índice NE vía API | HSIN vía API | PE dinámico vía API | `estadoSin` desde API |
| Mapa de embalses (departamentos) | Clasificación visual CREG | — | — | — |
| Alertas automáticas (cada 30 min) | Índice NE | HSIN (28 días exactos) | Índice PBP vs PE | — |
| Chatbot — estado actual | Índice NE + percentiles históricos | HSIN | Variación vs histórico | Índices compuestos descriptivos |
| Correo diario PDF | Índice NE (ficha + tabla resumen) | Anomalías HSIN | Variación vs 7d | ISH/IPM/IES/CIS descriptivos |
| Impacto operativo en anomalías PDF | Índice NE (ya no IDEAM 27/40 %) | HSIN | Variación de mercado | — |

Los datos operativos se almacenan en una base de datos central. Las series históricas de XM se guardan tal cual las publica el operador del SIN, sin transformaciones que comprometan su trazabilidad.

---

## 2. Estado Actual del Sector (3 Indicadores del Viceministro)

El portal y el chatbot muestran **tres fichas** que representan el estado del SIN. Cada ficha tiene tres elementos: valor actual, contexto histórico de corto plazo, y contexto histórico de largo plazo.

### 2.1. Ficha 1 — Generación Total del Sistema

| Componente | Cómo se calcula | Por qué |
|---|---|---|
| **Valor actual** | Sumatoria diaria de generación de todo el SIN para el último día con datos completos publicados por XM | XM publica los datos con 1 a 3 días de retraso; el sistema toma el último día válido dentro de una ventana de 7 días para evitar mostrar valores incompletos. |
| **Promedio de 7 días** | Media aritmética de la generación total diaria de los últimos 7 días | Referencia de corto plazo que captura el ciclo semanal natural (días laborales vs fines de semana). |
| **Variación porcentual** | Diferencia entre el valor actual y el promedio de 7 días, expresada como porcentaje del promedio | Métrica universal de "qué tan distinto está hoy respecto a la semana", comprensible sin formación técnica. |
| **Tendencia** | Variación mayor a +2 % se etiqueta como "↗ Por encima"; menor a −2 % como "↘ Por debajo"; dentro de ±2 % como "➡ Estable" | El umbral del 2 % se eligió porque la generación es una métrica física estable; variaciones menores son ruido natural de la operación. |

### 2.2. Ficha 2 — Precio de Bolsa Nacional

| Componente | Cómo se calcula | Por qué |
|---|---|---|
| **Valor actual** | Precio ponderado de bolsa promedio del último día publicado oficialmente por XM/SIMEM | Es el precio oficial colombiano del mercado mayorista. |
| **Promedio, máximo y mínimo de 7 días** | Estadísticas descriptivas de los últimos 7 días | Da contexto de volatilidad: un precio actual cercano al máximo de la semana es señal de presión sobre el mercado. |
| **Variación porcentual** | Diferencia entre el precio actual y el promedio de 7 días, expresada como porcentaje | Análoga al cálculo de generación. |
| **Tendencia** | Variación mayor a +5 % se etiqueta como "↗ Al alza"; menor a −5 % como "↘ A la baja"; dentro de ±5 % como "➡ Estable" | El precio es inherentemente más volátil que la generación. Se usa un umbral más amplio (5 % en vez de 2 %) para evitar falsas alarmas por fluctuaciones normales del mercado. |

### 2.3. Ficha 3 — Porcentaje de Embalses (Índice NE — Resolución CREG 209/2020)

Esta ficha aplica el **Índice NE oficial** del Estatuto CREG para evaluar el nivel del embalse agregado del SIN.

#### Cálculo del valor

| Componente | Cómo se calcula | Por qué |
|---|---|---|
| **Valor actual** | Suma del volumen útil de todos los embalses del SIN dividido entre la suma de la capacidad útil, expresado como porcentaje, para el último día con cobertura ≥ 80 % de los embalses reportados | Definición estándar XM de "porcentaje agregado de embalses del SIN". El filtro de cobertura del 80 % evita usar días con publicación parcial que distorsionarían el valor. |
| **Promedio de 30 días** | Misma fórmula promediada sobre los últimos 30 días con cobertura suficiente | Suaviza fluctuaciones cortas y muestra la tendencia mensual real. |
| **Media histórica 2020–año anterior** | Misma fórmula promediada sobre todos los días del mismo mes calendario en el rango histórico disponible | Compara contra el comportamiento típico estacional. Ejemplo: el valor de mayo actual se compara contra el promedio de todos los mayos previos. |

#### Clasificación regulatoria — Índice NE (Resolución CREG 209/2020)

El **Índice NE (Nivel de Embalse)** es la métrica oficial definida por la CREG para evaluar el riesgo de desabastecimiento. Compara el nivel real del embalse útil del SIN con la **Senda de Referencia mensual publicada por XM/CND**. Tiene tres niveles oficiales:

| Nivel del Índice NE | Condición regulatoria | Significado |
|---|---|---|
| **🟢 SUPERIOR** | El embalse real está igual o por encima de la senda CREG del mes, **o** está al 70 % o más del volumen útil | Estado normal: el sistema cumple la trayectoria mínima esperada. La regla del 70 % es absoluta — por encima de ese nivel, no hay riesgo de desabastecimiento sin importar la senda (Artículo 2.8.2.1.3 de la Resolución CREG 209/2020). |
| **🟡 ALERTA** | El embalse está por debajo de la senda CREG del mes, pero dentro de la tolerancia (X puntos porcentuales; en la práctica reciente X = 0) | Embalse fuera de la trayectoria regulatoria. Si la condición persiste por **dos verificaciones semanales consecutivas**, pasa al nivel INFERIOR. |
| **🔴 INFERIOR** | El embalse está claramente por debajo de la senda CREG del mes | Riesgo de desabastecimiento. La CREG puede activar el **Mecanismo de Sostenimiento de la Confiabilidad** (Artículo 7 de la Resolución CREG 026/2014). |

#### La Senda de Referencia CREG

La Senda de Referencia es una **curva diaria** del nivel mínimo del embalse útil del SIN, calculada por el CND con los supuestos de la CREG y publicada por estación:

| Estación | Período | Senda inicial | Senda final |
|---|---|---|---|
| Invierno 2024 (referencia oficial) | 1 mayo – 30 nov 2024 | 28,7 % (1 may 2024) | 67,8 % (30 nov 2024) |
| Verano | Diciembre – abril | Comienza alto (≥ 65 %) y desciende hasta inicios de mayo | — |

Valores aproximados de la senda por mes usados en el sistema como respaldo (fuentes: Circular CREG 023/2024 y reportes públicos):

| Mes | Senda CREG (% volumen útil) | Lógica |
|---|---|---|
| Enero | ~ 55 % | Descenso desde diciembre por estación verano. |
| Febrero | ~ 47 % | Mes seco. |
| Marzo | ~ 37 % | Mínimo histórico de verano. |
| Abril | 35,4 % | **Valor oficial CREG abril 2024** (Circular CREG 023/2024). |
| Mayo | 28,7 % | **Valor oficial CREG inicio invierno 2024**. |
| Junio | ~ 35 % | Inicio temporada lluviosa. |
| Julio | ~ 45 % | Recuperación. |
| Agosto | ~ 55 % | — |
| Septiembre | ~ 62 % | — |
| Octubre | ~ 65 % | — |
| Noviembre | 67,8 % | **Valor oficial CREG fin invierno 2024**. |
| Diciembre | ~ 65 % | Inicio verano siguiente. |

> **En producción**, esta tabla se usa como respaldo. La senda real se consulta a través del repositorio oficial de XM:
> [https://www.xm.com.co/resoluciones/operacion-y-mercado/resolucion-creg-209-de-2020-condicion-del-sistema](https://www.xm.com.co/resoluciones/operacion-y-mercado/resolucion-creg-209-de-2020-condicion-del-sistema)
> o vía FTPS: `/INFORMACION_XM/Publico/PlaneacionOperacion/Senda%20de%20Referencia/`

#### Aclaración importante sobre alertas IDEAM/UNGRD

A diferencia de versiones previas de este informe, **NO existen umbrales oficiales IDEAM/UNGRD basados en porcentaje de embalse**. Las alertas IDEAM/UNGRD (amarilla/naranja/roja) clasifican **amenazas hidrometeorológicas sobre ríos** (inundaciones, crecientes), no niveles de embalse. La evaluación regulatoria del riesgo de desabastecimiento por embalse bajo es competencia **exclusiva** de la CREG vía el Estatuto.

Únicamente para detectar **riesgo de vertimientos** (embalse muy lleno), el sistema usa criterios operativos del CND no normados:

| Rango | Estado | Justificación |
|---|---|---|
| > 95 % | 🔴 Crítico alto — riesgo de vertimientos | Capacidad cerca del límite — criterio operativo CND. |
| 90 – 95 % | 🟠 Vertimientos preventivos | Preparar descargas controladas. |

> Estos umbrales para nivel alto son **operativos del CND**, no del Estatuto CREG.

---

## 3. Lógica del Semáforo Hidrológico

El semáforo aparece tanto en el portal web (sección de embalses) como en los informes diarios. Su función es calificar el **riesgo individual de cada embalse** del SIN, complementando el Índice NE que evalúa el embalse agregado del sistema.

### 3.1. Principio Fundamental

> Un embalse es riesgoso solo si **es importante para el sistema** y al mismo tiempo **tiene poca agua**. Un embalse pequeño con poca agua es manejable; un embalse pequeño con mucha agua es bueno. Un embalse grande con mucha agua es óptimo; un embalse grande con poca agua es una crisis nacional.

Matemáticamente, el riesgo es una función de dos variables: la **importancia** del embalse y su **disponibilidad** de agua.

- **Importancia** se mide por la **participación porcentual** del embalse en la capacidad total del SIN: capacidad útil del embalse dividida entre la suma de las capacidades de todos los embalses, multiplicada por 100.
- **Disponibilidad** se mide por el **volumen útil**: el porcentaje del agua actualmente almacenada por encima del nivel mínimo técnico, respecto a la capacidad útil total del embalse.

Ambos valores se obtienen directamente de las publicaciones diarias de XM, sin transformaciones.

### 3.2. Clasificación de Embalses por Importancia

| Participación en el SIN | Categoría | Embalses típicos |
|---|---|---|
| ≥ 15 % | **CRÍTICO** | AGREGADO BOGOTÁ (≈ 38 %) |
| 10 – 14.99 % | **IMPORTANTE** | EL QUIMBO, GUAVIO |
| 5 – 9.99 % | **RELEVANTE** | CHIVOR, PORCE 3 |
| < 5 % | **COMPLEMENTARIO** | MUÑA, MIRAFLORES, CALIMA 1 |

### 3.3. Matriz de Riesgo (regla prioritaria + tabla)

**Regla 0 — prioritaria:** Si Volumen Útil ≥ 70 %, **siempre VERDE**, sin importar la importancia. Razón: cualquier embalse con tres cuartas partes de su capacidad útil está en condición sana.

Cuando la regla 0 no aplica, se evalúa la matriz:

| Participación | Vol < 15 % | Vol 15–20 % | Vol 20–25 % | Vol 25–30 % | Vol 30–35 % | Vol 35–40 % | Vol 40–50 % | Vol 50–70 % |
|---|---|---|---|---|---|---|---|---|
| ≥ 15 % (Crítico) | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | 🟡 | 🟡 | 🟢 |
| 10 – 15 % (Importante) | 🔴 | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 |
| 5 – 10 % (Relevante) | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 | 🟢 |
| < 5 % (Complementario) | 🟡 | 🟡 | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |

### 3.4. Por qué Esta Lógica y Estos Números

1. **Asimetría por importancia**: cada categoría tiene un umbral de alerta diferente porque un embalse con 38 % de participación (caso AGREGADO BOGOTÁ) al 25 % de volumen útil representa una pérdida absoluta de energía mucho mayor que un embalse del 1 % de participación (caso MUÑA) al 25 %.
2. **El umbral del 70 % es regulatorio**: la Resolución CREG 209/2020 establece que un embalse al 70 % o más del volumen útil está en nivel SUPERIOR del Índice NE sin importar la senda mensual. Esa cifra se adopta también como referencia para el semáforo individual de embalse, porque por encima de ese nivel no hay presión operativa registrada históricamente.
3. **El umbral del 30 % refleja la experiencia histórica del SIN**: en marzo de 2024 (último gran evento de El Niño), el nivel agregado del SIN cerró en 31,5 % y XM activó toda la matriz térmica disponible. Niveles inferiores a 30 % en un embalse crítico (≥15 % de participación) replican localmente esa condición. **Este umbral es del equipo técnico**, calibrado con datos reales 2010–2026 del SIN, no una norma CREG.
4. **Tolerancia para embalses pequeños**: un embalse complementario (menos del 5 % de participación) no puede generar por sí solo "Riesgo Alto" — solo "Riesgo Medio". Esto evita ruido visual cuando un embalse de muy baja participación está vacío sin afectar al sistema.

### 3.5. Indicadores de Riesgo Sistémico

Cuando se evalúa el SIN completo (no embalses individuales), se calculan tres alertas agregadas:

- **Alerta Roja Sistémica:** más del 30 % de la capacidad del sistema está en estado rojo.
- **Alerta Naranja Sistémica:** más del 50 % de la capacidad está en estado rojo o amarillo.
- **Alerta Amarilla Sistémica:** algún embalse crítico (≥ 15 % participación) está en estado amarillo.

Y dos índices cuantitativos:

- **Índice de Salud del SIN** = (% Verde × 1 + % Amarillo × 0,5 + % Rojo × 0) / 100. Va de 0 (todo rojo) a 1 (todo verde).
- **Factor de Riesgo Ponderado** = (% Rojo × 3 + % Amarillo × 2 + % Verde × 1) / 100. Útil para comparar escenarios.

### 3.6. Semáforo Regional por Cuenca Hidrológica

Los embalses se agrupan en seis regiones hidrológicas para mostrar el estado en el correo diario y el chatbot:

- **Centro:** Agregado Bogotá, El Quimbo, Muña, San Carlos, Tominé.
- **Antioquia:** Riogrande 2, Playas, Miraflores, La Fe, Porce 2 y Porce 3.
- **Oriente:** Chivor, Guavio.
- **Valle:** Salvajina, Calima 1.
- **Caldas:** Miel 1.
- **Caribe:** Urrá 1.

Para cada región se calcula el **promedio aritmético del porcentaje de volumen útil** de los embalses que la componen. A ese promedio regional se aplica el **Índice NE** (sección 2.3) comparándolo con la senda CREG del mes. Adicionalmente, si la región supera el 95 %, se marca en rojo por riesgo de vertimientos (criterio operativo del CND).

---

## 4. Lógica de Tendencias

La tendencia es el segundo elemento clave del sistema. Tres mecanismos distintos según el contexto:

### 4.1. Tendencia de Corto Plazo (7 días) — Usada en las Fichas

Se compara el valor del día más reciente contra la media de los 7 días previos. Los umbrales son:

| Métrica | Umbral "creciente" | Umbral "estable" | Umbral "decreciente" |
|---|---|---|---|
| Generación | > +5 % vs media 7d | ±5 % | < −5 % |
| Precio de Bolsa | > +5 % vs media 7d | ±5 % | < −5 % |
| Embalses | > +1 pp vs media 7d | ±1 pp | < −1 pp |
| Aportes (HSIN) | > +5 pp vs HSIN hace 7 días | ±5 pp | < −5 pp |

> **Nota sobre aportes:** la tendencia de aportes ya no usa el acumulado mensual (MTD). Compara el **HSIN actual** (promedio de aportes de las últimas 28 días dividido entre la media histórica oficial XM del mismo período) contra el HSIN calculado con la misma ventana pero desplazada 7 días atrás. El acumulado mensual XM (`pctMtd`) se conserva solo como dato complementario de referencia, no para semáforos ni alertas.

**Por qué umbrales asimétricos:** se calibraron observando el **coeficiente de variación** (CV) natural de cada serie en los datos 2020–2026. La generación y el porcentaje de embalses son métricas físicas con muy poco ruido diario (CV cercano al 3 – 4 %); los precios son señales de mercado con alta volatilidad (CV entre 15 % y 25 %). Por eso al precio se le exige una variación más grande antes de etiquetarlo como tendencia real.

### 4.2. Tendencia de Mediano Plazo (30 días) — Usada en Predicciones

Cuando el sistema produce una predicción a 30 días, calcula la diferencia entre el promedio proyectado y el promedio real de los últimos 30 días, expresada como porcentaje del promedio real. La clasificación es:

- **Creciente:** cambio mayor a +5 %.
- **Estable:** cambio entre −5 % y +5 %.
- **Decreciente:** cambio menor a −5 %.

**Por qué un umbral más amplio que en las fichas:** una predicción tiene incertidumbre intrínseca; usar un umbral muy pequeño produciría etiquetas de "Creciente" o "Decreciente" que cambian día a día sin reflejar un cambio real.

### 4.3. Tendencia Estacional (Comparación Interanual)

Para embalses y aportes hídricos, se compara el promedio actual (últimos 30 días) contra el promedio del **mismo período del año anterior**, tomando una ventana de 60 días centrada un año atrás. La fórmula es la diferencia entre ambos promedios, expresada como porcentaje del promedio del año anterior.

**Por qué interanual:** los embalses colombianos tienen ciclos estacionales muy marcados (sequía entre diciembre y febrero, lluvias entre abril–junio y septiembre–noviembre). Comparar el nivel actual solo contra los últimos 7 o 30 días no captura si "estamos peor que en el mismo mes del año pasado". La comparación interanual sí lo hace, y es la métrica que XM usa internamente para evaluar la severidad de un período hidrológico.

### 4.4. Tendencia Operativa de Embalses (vs Histórico Multianual)

Para la ficha de embalses, además de las comparaciones anteriores se incluye el promedio multianual 2020–2025 del mismo mes calendario. Esta es la referencia más conservadora porque suaviza años atípicos como El Niño 2015–2016, dando un punto de comparación robusto frente a la operación "normal" reciente.

---

## 5. Lógica de Alertas Operativas (Detección Automática)

Cada 30 minutos un proceso automático evalúa los datos del SIN y dispara alertas si detecta anomalías. Las alertas tienen dos niveles de severidad: **CRÍTICO** (notificación inmediata por correo y Telegram) y **ALERTA** (registro acumulado para el informe diario, sin envío inmediato). Esta separación evita saturar al Viceministro con notificaciones constantes y reserva los envíos urgentes para eventos verdaderamente excepcionales.

A continuación se describe cada una de las nueve familias de alertas con sus umbrales, fuentes regulatorias y justificación.

### 5.1. Alerta de Demanda Excesiva

| Parámetro | Valor | Justificación |
|---|---|---|
| Umbral CRÍTICO | 253 GWh/día (percentil 99 histórico anual) | Solo el 1 % de los días históricos supera este valor. Si lo supera de forma sostenida, es atípico. |
| Umbral ALERTA | 248 GWh/día (percentil 75 histórico anual) | Por encima del cuartil superior — demanda alta pero no extraordinaria. |
| Condición para disparar CRÍTICO | ≥ 60 % de los últimos 7 días superan 253 GWh | Un día aislado no es crisis; lo crítico es la sostenibilidad de la presión. |
| Condición para disparar ALERTA | ≥ 50 % de los últimos 7 días superan 248 GWh | Misma lógica, umbral más permisivo. |

**Por qué no solo "umbral instantáneo":** un pico diario aislado no compromete el sistema porque la generación se ajusta en tiempo real. La crisis ocurre cuando la presión es **sostenida** por varios días seguidos, momento en el cual los embalses empiezan a vaciarse a un ritmo no recuperable.

> **Importante:** la demanda alta por sí sola NO es crisis. La crisis aparece cuando se combina con bajo margen operativo (sección 5.5).

### 5.2. Alerta de Aportes Hídricos — Índice HSIN (Resolución CREG 026/2014 art. 2)

Esta alerta aplica el **Índice HSIN** (Hidrología del SIN), definido en el Artículo 2 del Estatuto CREG. Es el cociente entre el **promedio de aportes de las últimas cuatro semanas (28 días calendario)** y el **promedio de la media histórica oficial XM (`AporEnerMediHist`) del mismo período**, expresado en porcentaje.

| Nivel HSIN | Condición regulatoria | Significado |
|---|---|---|
| **≥ 90 %** | NORMAL (CREG 026/2014 art. 2) | Suministro hídrico esperado o superior. Sin alerta. |
| **Entre 70 % y 90 %** | VIGILANCIA (CREG 026/2014 art. 2) | Condición de alerta. Si persiste por dos verificaciones semanales, se confirma la vigilancia formal del sistema. |
| **Entre 60 % y 70 %** | DÉFICIT SEVERO (referencia CREG 209/2020) | Déficit hidrológico significativo. El sistema entra en zona crítica. |
| **≤ 60 %** | CRÍTICO HISTÓRICO | Nivel observado en abril 2020 (mínimo histórico que motivó la actualización del Estatuto vía Resolución CREG 209/2020). |

**Fuentes de los datos:**

- Los aportes reales provienen directamente de XM (caudales convertidos a energía).
- La media histórica proviene de la métrica oficial publicada por XM, que el operador calcula con su propia metodología y publica en su portal de hidrología. El sistema NO recalcula esa media — usa la misma cifra que XM/CND.

**Severidad de la alerta enviada al Viceministro:**

- HSIN al 60 % o menos → severidad **CRÍTICO**. Recomendación: activar el Mecanismo de Sostenimiento de Confiabilidad (Artículo 7 de la Resolución CREG 026/2014).
- HSIN entre 60 % y 90 % → severidad **ALERTA**. Recomendación: vigilancia semanal del HSIN y los aportes.
- HSIN al 90 % o superior → sin alerta.

### 5.3. Alerta de Nivel de Embalses — Índice NE (Resolución CREG 209/2020)

Esta alerta aplica el **Índice NE** oficial del Estatuto CREG. Compara el nivel real del embalse agregado del SIN con la **Senda de Referencia mensual** publicada por XM/CND (sección 2.3).

| Severidad del sistema | Condición regulatoria | Recomendación |
|---|---|---|
| **CRÍTICO** | El mínimo de los últimos 7 días cae al nivel **INFERIOR** del Índice NE (por debajo de la senda CREG) | Activar el Mecanismo de Sostenimiento de Confiabilidad (Artículo 7 de la Resolución CREG 026/2014). Reportar condición de riesgo a la CREG. |
| **ALERTA** | El valor actual está en el nivel **ALERTA** del Índice NE (por debajo de la senda pero dentro de la tolerancia regulatoria) | Conservar agua. Maximizar despacho térmico y de renovables no hidráulicas. Vigilar la evolución semanal. |
| Sin alerta | El embalse está en nivel **SUPERIOR** del Índice NE (sobre la senda CREG o por encima del 70 %) | Operación normal. |

> **Diferencia clave con versiones previas del sistema:** los umbrales fijos de "30 % crítico" o "40 % alerta" que se usaban antes no tenían respaldo regulatorio. El nuevo umbral es **dinámico** porque cambia mes a mes según la Senda CREG publicada oficialmente. Esto significa que un embalse al 35 % es "crítico" en agosto (cuando la senda debería estar al 55 %) pero "normal" en mayo (cuando la senda baja al 28,7 %).

Adicionalmente, el sistema calcula la **tendencia de los últimos 7 días** como la diferencia simple entre el nivel actual y el de hace 7 días. Si es negativa, el embalse se está vaciando; si es positiva, se está llenando.

### 5.4. Alerta de Precio de Bolsa — Índice PBP (Res. CREG 026/2014) + PEI/PE/PES (Res. CREG 101 066/2024)

Esta alerta usa los **tres niveles oficiales de precio de escasez** definidos por la Resolución CREG 101 066 de 2024 y el **Índice PBP** del Estatuto:

#### Tres niveles regulatorios de precio de escasez

| Nivel | Sigla | Fuente regulatoria | Valor enero 2026 |
|---|---|---|---|
| Precio de Escasez **Inferior** | **PEI** | Res. CREG 101 066/2024 | 327,67 COP/kWh |
| Precio de Escasez (de la Res. 071/2006) | **PE** | Res. CREG 071/2006 (activación tradicional) | 590,56 COP/kWh |
| Precio de Escasez **Superior** | **PES** | Res. CREG 140/2017 | 830,34 COP/kWh |

> Estos valores se **actualizan mensualmente** por la CREG y se publican en https://www.xm.com.co/transacciones/cargo-por-confiabilidad/precio-de-bolsa-y-escasez

#### Índice PBP (CREG 026/2014 art. 2)

El **Índice PBP** (Precio de Bolsa Promedio) tiene dos niveles oficiales según el Estatuto:

- **NIVEL BAJO:** el precio promedio de bolsa está por debajo del PE durante al menos 4 de los últimos 7 días.
- **NIVEL ALTO:** el precio promedio de bolsa supera el PE (esto activa el Mecanismo de Confiabilidad del Cargo).

#### Severidad de la alerta enviada al Viceministro

| Severidad | Condición | Significado |
|---|---|---|
| **CRÍTICO** | El precio supera el PES durante 4 o más de los últimos 7 días | Sistema en zona crítica — el precio está cerca del techo regulatorio de escasez. Intervención regulatoria urgente. |
| **ALERTA** | El precio supera el PE durante 4 o más de los últimos 7 días (Índice PBP en nivel ALTO) | Se activa el Mecanismo de Confiabilidad del Cargo (Artículo 2 de la Resolución CREG 026/2014). Si esta condición se combina con el Índice NE en nivel INFERIOR o el HSIN por debajo del 90 %, el sistema entra formalmente en condición de **RIESGO** según el Artículo 3 del Estatuto. |
| Informativo | El precio supera el PEI pero el Índice PBP sigue en nivel BAJO | Precio por encima del umbral inferior pero sin activación regulatoria de mecanismos. |
| Sin alerta | El precio está por debajo del PEI | Mercado en zona cómoda. |

Para suavizar la volatilidad diaria, el sistema aplica una **media móvil de 3 días** a la serie de precios antes de evaluar.

> **Diferencia clave con versiones previas:** se eliminó el criterio del "ratio precio de bolsa sobre precio de escasez" con umbrales 0,65 y 0,90 que era una elección discrecional del equipo. El nuevo sistema usa los **tres niveles regulatorios oficiales** (PEI/PE/PES) y la regla del Estatuto CREG (4 días de los últimos 7).

### 5.5. Alerta de Margen Operativo

El margen operativo mide la holgura del sistema. Se define como la diferencia entre la generación predicha y la demanda predicha, dividida entre la demanda y expresada en porcentaje.

| Parámetro | Valor | Justificación |
|---|---|---|
| Umbral CRÍTICO | Margen menor al 3 % | Riesgo real de déficit — el sistema está al límite. Umbral basado en el criterio operativo del CND para activar protocolos de racionamiento. |
| Umbral ALERTA | Margen entre 3 % y 8 % | Vigilancia — el sistema tiene poca holgura entre oferta y demanda. |

**Importante:** este indicador solo tiene sentido sobre **predicciones futuras**. En los datos reales históricos, la generación siempre es aproximadamente igual a la demanda por física del sistema (la oferta se ajusta a la demanda en tiempo real). El estrés operativo en datos reales se refleja en otros frentes (nivel de embalses, precio de bolsa, participación térmica), no en el margen.

### 5.6. Alerta de Estrés Térmico

Cuando los embalses están bajos, las plantas térmicas (carbón, gas) toman la carga del sistema. Una participación térmica sostenidamente alta indica un déficit hidráulico estructural.

La métrica es directa: el porcentaje de la demanda total cubierto por generación térmica.

| Parámetro | Valor | Justificación |
|---|---|---|
| Umbral CRÍTICO | Participación térmica superior al 35 % durante al menos el 70 % de los últimos 7 días | Alta dependencia térmica sostenida — indica riesgo estructural por agotamiento de recursos hídricos. |
| Umbral ALERTA | Participación térmica superior al 20 % durante al menos el 60 % de los últimos 7 días | Sistema operando en modo de compensación hidráulica. |

Se aplica una **media móvil de 3 días** para evitar falsas alarmas por días con falla puntual de plantas hidráulicas. La generación térmica se obtiene sumando todos los recursos clasificados como térmicos en el catálogo oficial de XM.

> **Origen del umbral:** estos valores son criterios operativos del CND derivados de boletines técnicos de XM. No están en una resolución CREG específica, pero reflejan los niveles a los que históricamente el sistema ha activado señales de alerta.

### 5.7. Alerta de Pérdidas No Técnicas (PNT)

Las PNT son la diferencia entre energía facturada y energía consumida no atribuible a pérdidas físicas (es decir, hurto y subfacturación). Se calculan con metodología híbrida CREG + estadística, comparando contra perfiles oficiales por operador de red.

| Parámetro | Valor (perfil nacional DEFAULT) | Justificación |
|---|---|---|
| Umbral CRÍTICO | Configurable por operador (típico > 12 %) | Excede el límite regulatorio CREG aceptable. |
| Umbral ALERTA | Configurable por operador (típico > 9 %) | Señal temprana de degradación. |
| Ventana de cálculo | Promedio 30 días | Suaviza variaciones diarias por facturación. |

### 5.8. Alerta de Costo Unitario (CU)

El CU es un indicador económico, no operativo. Refleja el costo de prestar el servicio eléctrico al usuario final.

| Parámetro | Valor | Justificación |
|---|---|---|
| Umbral CRÍTICO económico | > 600 COP/kWh | Indicador de presión tarifaria muy alta. |
| Umbral ALERTA | > 400 COP/kWh | Vigilancia tarifaria. |

> **Crítico:** este indicador **nunca dispara alerta operativa de desabastecimiento**. Se limita a severidad ALERTA máximo para no confundirlo con riesgo de apagón.

### 5.9. Alerta de Datos Congelados

Protección de calidad del dato: si una variable importante muestra exactamente el mismo valor durante varios días consecutivos, lo más probable es que la fuente de datos de XM no esté actualizando o que el proceso de actualización del sistema haya fallado.

| Variable monitoreada | Días tolerados sin cambio |
|---|---|
| Capacidad útil diaria de embalses | 3 |
| Porcentaje de volumen útil de embalses | 3 |
| Aportes hídricos del SIN | 5 (los aportes pueden coincidir varios días en sequía severa) |
| Demanda real | 2 |
| Generación del SIN | 2 |

Los valores se redondean a un decimal antes de comparar, para evitar falsas alarmas causadas por la precisión interna de los cálculos.

### 5.10. Reglas de Filtrado y Espaciado de Notificaciones

Para evitar saturar al Viceministro con notificaciones:

1. **Solo se notifican por correo y Telegram las alertas CRÍTICAS.** Las alertas de nivel ALERTA se registran y aparecen en el informe diario, pero no generan envío inmediato.
2. **Intervalo mínimo de 24 horas entre repeticiones de la misma alerta:** si una alerta con el mismo título ya fue enviada hoy, no se reenvía hasta el día siguiente. Este intervalo se resetea automáticamente a medianoche.
3. **Deduplicación por contenido:** si dos alertas tienen el mismo indicador y la misma descripción, se conserva solo la de mayor severidad.

---

## 6. Semáforos Visuales del Portal Web

El **portal web de dirección** es la interfaz visual que ve el Viceministro y su equipo cuando consultan el estado del sector eléctrico. Su capa de semáforos está diseñada para **comunicación gerencial rápida**: el objetivo es que en menos de un segundo se sepa si el sistema está bien o mal.

A diferencia del informe diario (que es analítico y extenso), los semáforos del portal son **visuales y sintéticos** — cada indicador tiene un color asignado que sale de una clasificación bien definida.

**Alineación regulatoria:** todos los semáforos visuales del portal están **derivados directamente del marco CREG** (Estatuto de Desabastecimiento, Senda de Referencia, niveles oficiales de precio de escasez). No existen umbrales discrecionales sin justificación normativa: cualquier color que vea el Viceministro corresponde a una clasificación que la CREG o XM pueden auditar.

### 6.1. Semáforo de Reservas Hídricas — Índice NE (Res. CREG 209/2020)

El portal compara el nivel real contra la Senda CREG y la regla absoluta del 70 %:

| Nivel actual | Etiqueta | Color | Fundamento regulatorio |
|---|---|---|---|
| ≥ 80 % | **NORMAL** | 🟢 Verde | Objetivo XM ante El Niño (Boletín XM 10-abril-2026). |
| 70 – 79 % | **ESTABLE** | 🔵 Cian | Cumple regla absoluta CREG 209/2020 (umbral superior del Índice NE). |
| Sobre senda CREG | **SOBRE SENDA** | 🟡 Ámbar | NE Superior por estar ≥ senda mensual (Estatuto CREG 026/2014). |
| Bajo senda CREG | **ALERTA — BAJO SENDA** | 🟠 Naranja | NE Alerta del Estatuto. Si persiste 2 verificaciones semanales → NE Inferior. |
| Muy bajo senda CREG | **RIESGO — DESABASTECIMIENTO** | 🔴 Rojo | NE Inferior del Estatuto (CREG 026/2014 art. 3). Activa Mecanismo de Sostenimiento. |

> **Cambio respecto a versiones previas:** antes el portal usaba umbrales fijos del 80 %, 70 %, 60 % y 50 % sin respaldo regulatorio. Ahora los rangos ámbar, naranja y rojo se calculan dinámicamente contra la **Senda CREG mensual**, de modo que el portal dice exactamente lo mismo que diría XM/CND al evaluar el Estatuto.

### 6.2. Semáforo de Aportes Hídricos — Índice HSIN (Res. CREG 026/2014 art. 2)

El valor que alimenta este semáforo es el **HSIN oficial** calculado en el servidor con ventana de **28 días** (4 semanas × 7 días), usando las series diarias `AporEner` y `AporEnerMediHist` de XM. **No** se usa el acumulado del mes (MTD) para clasificar, aunque ese dato sigue disponible como referencia complementaria (`pctMtd`).

| HSIN (% vs media histórica XM, ventana 28 días) | Etiqueta | Color | Fundamento regulatorio |
|---|---|---|---|
| ≥ 120 % | **MUY FAVORABLE** | 🟢 Verde | Cuartil superior histórico — temporada lluviosa intensa. |
| 100 – 119 % | **NORMAL** | 🔵 Cian | Aportes en rango histórico esperado. |
| 90 – 99 % | **VIGILANCIA CREG** | 🟡 Ámbar | HSIN aún ≥ 90 % (umbral oficial CREG 026/2014). |
| 70 – 89 % | **DÉFICIT HÍDRICO** | 🟠 Naranja | HSIN < 90 % → Vigilancia del Estatuto CREG 026/2014 art. 2. |
| 60 – 69 % | **DÉFICIT SEVERO** | 🔴 Rojo | < 70 % — déficit severo (referencia CREG 209/2020). |
| ≤ 60 % | **CRÍTICO HISTÓRICO — SEQUÍA** | 🔴 Rojo | Nivel observado en abril 2020 (mínimo histórico). |

### 6.3. Semáforo de Precio de Bolsa — PEI / PE / PES (Res. CREG 101 066/2024)

Compara directamente contra los **tres niveles oficiales** de precio de escasez:

| Precio actual | Etiqueta | Color | Fundamento regulatorio |
|---|---|---|---|
| < PEI | **CÓMODO** | 🟢 Verde | Bajo Precio de Escasez Inferior — sin presión regulatoria. |
| PEI ≤ precio < PE | **ESTRÉS MODERADO** | 🟡 Ámbar | Sobre PEI pero bajo Precio de Escasez de activación (Res. 071/2006). |
| PE ≤ precio < PES | **ALTA PRESIÓN** | 🟠 Naranja | Sobre PE — Mecanismo de Confiabilidad activado (CREG 026/2014 art. 2). |
| ≥ PES | **TECHO REGULATORIO** | 🔴 Rojo | Sobre Precio de Escasez Superior (CREG 140/2017) — zona crítica. |

> **Cambio respecto a versiones previas:** antes el portal usaba umbrales fijos arbitrarios (200 / 300 / 400 COP/kWh) sin relación con la normativa CREG. Ahora se usan los **tres niveles oficiales actualizados mensualmente** por la CREG, consultados desde la base de datos del servidor (con respaldo enero 2026: PEI = 327,67 COP/kWh, PE = 590,56 COP/kWh, PES = 830,34 COP/kWh). El portal recibe estos valores en el paquete `umbralesRegulatorios` de la API.

### 6.4. Índice I2 — Sostenibilidad Hidráulica

El portal calcula un índice operativo propio (no regulatorio CREG) para evaluar si la generación hidráulica está consumiendo más agua de la que están aportando los ríos.

Se define como el cociente entre la **generación hidráulica del día** (en GWh) y los **aportes hídricos del día** (en GWh). Si el valor es 1, se está generando exactamente lo que ingresa a los embalses; si es mayor a 1, los embalses están perdiendo nivel.

| Valor de I2 | Etiqueta | Color | Significado |
|---|---|---|---|
| Menor o igual a 1,0 | **SOSTENIBLE** | 🟢 Verde | Se genera con menos energía hidráulica de la que entra a los embalses — sistema en equilibrio o ahorrando agua. |
| Entre 1,0 y 1,2 | **VIGILANCIA** | 🟡 Ámbar | Generación hidráulica ligeramente superior a los aportes; los embalses comienzan a bajar. |
| Entre 1,2 y 1,5 | **ALERTA** | 🟠 Naranja | Se consume entre 20 % y 50 % más agua de la que llega — descarga acelerada de reservas. |
| Mayor a 1,5 | **CRÍTICO** | 🔴 Rojo | Se consume más del 50 % adicional al aporte — drenaje insostenible de los embalses. |

**Por qué este índice:** el balance hidráulico es el indicador físico más directo de presión sobre los embalses. Si el I2 se mantiene consistentemente sobre 1,0 durante varias semanas, el porcentaje de embalses bajará inevitablemente sin importar las condiciones climáticas. Permite **anticipar** problemas antes de que aparezcan en el nivel de embalses, que es una variable lenta.

> **Origen de los umbrales:** los puntos de corte (1,0; 1,2; 1,5) son criterios del equipo técnico calibrados con datos históricos del SIN. No están normados por la CREG; son referencias operativas para el panel de gerencia.

### 6.5. Índice I3 — Estrés Térmico

Mide la participación de plantas térmicas (carbón, gas) en la generación total del día. Cuando los embalses están bajos, las térmicas toman la carga del sistema. Se calcula dividiendo la generación térmica total entre la generación total del SIN, expresado como porcentaje.

| Porcentaje térmico | Etiqueta | Color | Significado |
|---|---|---|---|
| 15 % o menos | **SOSTENIBLE** | 🟢 Verde | Participación térmica mínima — sistema dominantemente renovable. |
| Entre 15 % y 25 % | **NORMAL** | 🔵 Cian | Participación térmica habitual del SIN colombiano. |
| Entre 25 % y 35 % | **ALERTA MEDIA** | 🟠 Naranja | Térmica creciente — señal de compensación por menor generación hidráulica. |
| Mayor a 35 % | **CRÍTICO** | 🔴 Rojo | Térmica dominando — alta dependencia de combustibles, presión sobre costos del sistema. |

**Coherencia con la sección 5.6:** estos umbrales coinciden con los de la alerta operativa de estrés térmico (alerta > 20 %, crítico > 35 %). La diferencia es que el portal visual asigna un color a cada rango instantáneamente, mientras que la alerta operativa requiere **persistencia** (al menos 60 % de los últimos 7 días) antes de notificar al Viceministro.

### 6.6. Estado Global de Generación (combinación de los tres indicadores)

El portal calcula un estado único de generación combinando los tres indicadores anteriores (precio, I2 e I3). Aplica una **regla de prioridad por severidad**: gana el peor de los tres.

Las prioridades de severidad son, de mayor a menor:

1. **Crisis energética / Crítico** (prioridad 4).
2. **Alerta** (prioridad 3).
3. **Estrés moderado / Alerta media** (prioridad 2).
4. **Vigilancia** (prioridad 1).
5. **Estados normales** (prioridad 0).

El sistema toma las tres etiquetas de estado (una para precio de bolsa, una para el I2 hidráulico y una para el I3 térmico), las ordena por prioridad y selecciona la más severa como estado global de generación.

**Por qué la regla del peor:** un sistema solo es sano si los tres frentes están sanos. Basta con que uno esté crítico para que el estado global lo refleje. Esta lógica evita el "promedio enmascarador" — un sistema con dos indicadores en verde y uno en rojo **no es amarillo, es rojo**. La gerencia debe enterarse del problema, no del promedio.

### 6.7. Diagnóstico Textual del SIN

Acompañando los semáforos, el portal genera una frase narrativa basada en el **Índice NE** y el **HSIN**, no en umbrales fijos de porcentaje de embalse. Reglas (orden de evaluación, primera que aplique):

| Condición (Índice NE / HSIN) | Diagnóstico textual |
|---|---|
| NE = **INFERIOR** (embalse bajo senda CREG) | "Sistema en RIESGO — embalse bajo senda CREG. Se activa Mecanismo de Sostenimiento de Confiabilidad (CREG 026/2014 art. 7)." |
| NE = **ALERTA** y HSIN < 90 % | "Sistema en VIGILANCIA — embalse bajo senda CREG + HSIN < 90 % (CREG 026/2014 art. 2)." |
| NE = **ALERTA** | "Sistema en alerta temprana — embalse bajo senda CREG. Vigilar evolución semanal." |
| Embalse ≥ 80 % (objetivo XM ante El Niño) | "Sistema en condiciones normales — embalse ≥ objetivo XM (80 %)." |
| Embalse ≥ 70 % (regla absoluta CREG) | "Sistema estable — embalse ≥ 70 % (regla absoluta CREG 209/2020)." |
| NE = **SUPERIOR** sobre senda | "Sistema sobre senda CREG — NE Superior." |

**Diseño explícito:** el diagnóstico textual usa la misma lógica regulatoria que XM/CND para la condición del sistema. Ya no emplea umbrales fijos del 50 %, 60 %, 70 % u 80 % que existían en versiones anteriores del portal.

### 6.8. Mapa de Embalses por Departamento

El mapa interactivo del portal colorea cada departamento según el embalse **más crítico** de esa cuenca. Desde mayo 2026, el color de cada embalse individual y el del departamento se calculan con la **misma clasificación visual CREG** de la sección 6.1 (Senda de Referencia + regla del 70 %), no con umbrales fijos del 50/60/70/80 %.

### 6.9. Salvaguardas contra datos parciales

El portal aplica reglas de protección para evitar mostrar datos preliminares de XM:

| Variable | Regla de detección | Acción |
|---|---|---|
| Porcentaje de volumen útil de embalses por debajo del 20 % | Sospechoso de publicación parcial | Buscar el último día con valor por encima del 40 % y mostrar ese. |
| Aportes hídricos por debajo del 15 % de la media histórica | Sospechoso de pocas horas publicadas | Buscar el último día con valor por encima del 30 % de la media histórica y mostrar ese. |

Esto es necesario porque XM publica los datos de forma incremental durante el día: si el portal se actualiza antes de que XM termine de publicar, podría mostrar un valor de embalses del 5 % cuando en realidad será del 60 % al final del día. Las salvaguardas garantizan que el Viceministro y su equipo siempre vean el último valor regulatoriamente confiable.

---

## 7. Lógica del Estado General del SIN (Semáforo Global del Correo Diario)

El correo diario incluye una **tabla resumen de indicadores clave** con un estado por indicador en tres niveles: Normal, Alerta, Crítico. Esta tabla es distinta de los semáforos visuales del portal web (sección 6) — está pensada para una lectura rápida del estado general en formato de informe ejecutivo.

Cada indicador (generación, precio, embalses) se evalúa con criterios distintos pero coherentes con el marco regulatorio CREG.

### 7.1. Estado de Generación

| Variación absoluta vs promedio 7d | Estado |
|---|---|
| > 15 % | Crítico |
| 8 – 15 % | Alerta |
| ≤ 8 % | Normal |

### 7.2. Estado de Precio de Bolsa

| Variación absoluta vs promedio 7d | Estado |
|---|---|
| > 25 % | Crítico |
| 12 – 25 % | Alerta |
| ≤ 12 % | Normal |

**Por qué umbrales más amplios para precio:** los precios son inherentemente más volátiles que las métricas físicas. Calibrado contra la variabilidad histórica observada.

### 7.3. Estado de Embalses (Índice NE — Res. CREG 209/2020)

El correo diario usa el **Índice NE oficial** del Estatuto CREG, no umbrales fijos:

| Condición | Estado |
|---|---|
| Embalse > 95 % **O** Índice NE = **INFERIOR** (< senda CREG) | Crítico |
| Embalse > 80 % **O** Índice NE = **ALERTA** (bajo senda pero ≥ senda − X) | Alerta |
| Índice NE = **SUPERIOR** (≥ senda CREG  o  ≥ 70 %) | Normal |

> **Importante:** la corrección frente a versiones previas es **regulatoria, no estética**. Los umbrales fijos del 27 %, 40 %, 80 % y 95 % que aparecían en el sistema como "oficiales IDEAM/UNGRD" **no son normativos**: IDEAM y UNGRD usan ese tipo de alertas para amenazas hidrometeorológicas de ríos (crecientes e inundaciones), no para porcentaje de embalse. La evaluación regulatoria del nivel del embalse agregado del SIN corresponde exclusivamente a la CREG a través del Índice NE. Desde mayo 2026, la **ficha de embalses del PDF** y el **texto de impacto operativo** de cada anomalía también usan el Índice NE (ya no IDEAM 27/40 %).

### 7.4. Condición del Sistema (NORMAL / VIGILANCIA / RIESGO)

Además de los estados por indicador, la API del sector calcula la **condición global del sistema** según el Artículo 3 del Estatuto CREG 026/2014, combinando los tres índices regulatorios:

| Índice NE | Índice HSIN | Índice PBP | Condición del sistema |
|---|---|---|---|
| SUPERIOR | NORMAL | BAJO | **NORMAL** |
| Cualquier alerta intermedia | — | — | **VIGILANCIA** |
| INFERIOR | ≠ NORMAL **o** PBP ALTO | — | **RIESGO** |

Este resultado se expone en el paquete `umbralesRegulatorios.condicionSistema` del portal y sirve como referencia de lectura gerencial. **No dispara alertas por sí solo** — las alertas operativas siguen la lógica de persistencia de la sección 5.

### 7.5. Promoción por Anomalías

Si una alerta operativa CRÍTICA está activa para un indicador, el estado se eleva automáticamente:
- Si había Normal y hay anomalía CRÍTICO → estado pasa a Crítico.
- Si había Normal y hay anomalía ALERTA → estado pasa a Alerta.
- El estado nunca baja por reglas; siempre toma la severidad máxima.

---

## 8. Índices Compuestos del Correo Diario (ISH, IPM, IES, CIS)

Estos cuatro índices son **distintos a los I2/I3 del portal web** (sección 6). Mientras los I2/I3 son indicadores físicos directos (balance hidráulico y participación térmica), los ISH/IPM/IES/CIS son **índices analíticos compuestos** que sintetizan múltiples señales en una sola cifra entre 0 y 100. Aparecen únicamente en el informe diario por correo.

Su carácter es **descriptivo**: ayudan al lector a entender la situación del sistema en una sola cifra, pero **no se usan para disparar alertas operativas**. Esa función la cumple exclusivamente la lógica de la sección 5, que sí está respaldada por el Estatuto CREG.

### 8.1. Definiciones

| Sigla | Nombre | Qué mide | Rango |
|---|---|---|---|
| **ISH** | Índice de Sostenibilidad Hídrica | Disponibilidad del recurso agua | 0 (crítico) – 100 (óptimo) |
| **IPM** | Índice de Presión de Mercado | Presión alcista de precios | 0 (sin presión) – 100 (alto estrés) |
| **IES** | Índice de Estrés del Sistema | Síntesis de los frentes anteriores + anomalías | 0 (sin estrés) – 100 (alto estrés) |
| **CIS** | Calificación Integral del Sistema | Estado global del SIN | 0 (crítico) – 100 (estable) |

### 8.2. Cálculo del ISH (Sostenibilidad Hídrica)

El punto de partida es el **porcentaje actual de embalses** (de 0 a 100). A ese valor se le aplican penalizaciones si hay anomalías recientes:

- Si existe una anomalía CRÍTICA en embalses, se restan 25 puntos.
- Si existe una anomalía ALERTA en embalses, se restan 15 puntos.

Clasificación final:

- ISH ≥ 75 → **Óptimo** ✅
- ISH entre 50 y 74 → **Adecuado** 🟢
- ISH entre 25 y 49 → **Bajo** 🟡
- ISH < 25 → **Crítico** 🔴

### 8.3. Cálculo del IPM (Presión de Mercado)

El punto de partida es 0 (sin presión alcista). Si el precio actual supera el promedio de los 30 días anteriores, el IPM toma el valor de ese exceso porcentual, acotado entre 0 y 100. A ese valor se le suman penalizaciones por anomalías de precio:

- Si existe una anomalía CRÍTICA en precio, se suman 30 puntos.
- Si existe una anomalía ALERTA en precio, se suman 15 puntos.

> **Decisión metodológica:** el índice solo sube si el precio crece. Una bajada de precio no es estrés operativo, por eso no contribuye al índice. Esto corrige una versión anterior que tomaba el valor absoluto, lo que confundía bajadas con subidas.

### 8.4. Cálculo del IES (Estrés del Sistema)

Es un **promedio ponderado** de tres componentes:

- 40 % del peso lo aporta el ISH invertido (qué tan lejos está la sostenibilidad hídrica del óptimo).
- 35 % del peso lo aporta el IPM (presión alcista del mercado).
- 25 % del peso lo aporta un factor que cuenta las anomalías recientes (cada anomalía crítica suma 40 puntos al factor, cada alerta suma 20, con un tope de 100).

**Significado de cada peso (declaración explícita de gobernanza):**

- **40 % al componente hídrico** porque el agua es el insumo dominante del SIN colombiano. Aproximadamente el 70 % de la generación nacional en condiciones normales es hidráulica; por eso el frente hídrico domina la fórmula.
- **35 % al precio de bolsa** porque el precio es el principal canal de transmisión del estrés operativo al usuario final.
- **25 % a las anomalías** porque son señales de eventos puntuales que pueden ser ruidosos. Tienen peso pero no dominan el índice.

> **Importante:** estos pesos (0,40 / 0,35 / 0,25) reflejan **percepción analítica del equipo técnico, no una norma regulatoria CREG**. Su carácter es DESCRIPTIVO: el IES es una métrica de comunicación, no un detonador de alertas operativas. Cualquier auditoría externa puede recalibrar estos pesos sin afectar las alertas operativas (sección 5), que sí están normadas.

### 8.5. Cálculo del CIS (Calificación Integral del Sistema)

Es un **promedio ponderado** que sintetiza los tres índices anteriores:

- 50 % del peso lo aporta el ISH (sostenibilidad hídrica).
- 30 % del peso lo aporta el IPM invertido (cuánto NO hay presión de mercado).
- 20 % del peso lo aporta el IES invertido (cuánto NO hay estrés general).

Clasificación final:

- CIS ≥ 75 → **Estable** ✅
- CIS entre 50 y 74 → **Vigilancia** ⚠️
- CIS entre 25 y 49 → **Preocupante** 🔶
- CIS < 25 → **Crítico** 🔴

---

## 9. Lógica de Predicciones

El sistema produce predicciones a 7, 30, 180 y 365 días para tres métricas: Generación Total, Precio de Bolsa, Porcentaje de Embalses. Cada predicción incluye:

- **Valor promedio proyectado** (media simple de las predicciones diarias del horizonte).
- **Mínimo y máximo proyectados** (extremos del horizonte).
- **Intervalo de confianza** (límites inferior y superior, calculados por los modelos ML).
- **Confianza del modelo** (un número entre 0 y 1 que el modelo reporta).
- **Cambio porcentual vs promedio real de los últimos 30 días.**
- **Tendencia** (Creciente, Estable, Decreciente con umbrales de ±5 %).

### 9.1. Modelos Estadísticos Utilizados

| Métrica | Modelo principal | Modelo respaldo |
|---|---|---|
| Generación por fuente (Hidráulica, Térmica, Eólica, Solar, Biomasa) | LightGBM con variables clima (NASA POWER) | Stacking ensemble |
| Generación Total | Suma agregada de modelos por fuente | Prophet (Facebook) |
| Precio de Bolsa | LightGBM con lags de precio + variables hidrológicas | Prophet |
| Porcentaje de Embalses | Modelo lag-hidro (LightGBM con regresores de aportes) | Persistencia |

**Por qué LightGBM:** algoritmo de Gradient Boosting Trees que maneja relaciones no lineales entre variables climáticas y operativas, robusto a outliers, e interpretable mediante importancia de variables. Probado en producción con MAPE (Mean Absolute Percentage Error) entre 3 % y 12 % según métrica.

**Por qué Prophet (Facebook):** captura tendencia logística y estacionalidad múltiple. Su modelo de tendencia g(t) usa crecimiento logístico con changepoints automáticos, ideal para series con cambios estructurales.

### 9.2. Umbrales de Confiabilidad de Predicciones

| Condición | Acción |
|---|---|
| Confianza del modelo < 0,60 | Se marca la predicción como NO CONFIABLE y se muestra advertencia. |
| Menos de 5 puntos predichos disponibles | NO CONFIABLE — datos insuficientes. |
| MAPE ex-post > 35 % (caso eólica) | Se guarda con advertencia visible. |

### 9.3. MAPE Ex-Post (Calibración Continua)

Cada predicción se compara contra el valor real cuando este llega (días después), calculando el **MAPE ex-post** (error medio porcentual real). Este valor se guarda históricamente y se usa para:

1. Mostrar la **confianza histórica del modelo** en el informe diario (transparencia para el lector).
2. **Auto-ajustar los pesos internos** del ensemble cuando el error histórico empeora, sin necesidad de intervención manual.

Esto garantiza que el sistema mejore con el tiempo y que las predicciones nunca se presenten como infalibles: el lector siempre ve cuál ha sido el error promedio del modelo en los últimos meses.

---

## 10. Lógica del Informe Diario por Correo

El informe se construye y envía todos los días a las **8:00 AM hora Colombia**. Es un proceso automático que combina datos estructurados, gráficos y narrativa generada por inteligencia artificial. Se distribuye por dos canales: **correo electrónico** (versión HTML con PDF adjunto) y **Telegram** (versión resumida).

### 10.1. Componentes del Informe

El informe incluye los siguientes bloques en orden:

1. **Texto narrativo generado por inteligencia artificial.** Un modelo de lenguaje toma todos los datos del día y produce un análisis ejecutivo en lenguaje natural. Si el modelo no está disponible, el sistema construye un resumen básico con los 3 indicadores clave.
2. **Tres fichas de indicadores clave** (Generación, Precio de Bolsa, Embalses) con valor, contexto histórico y tendencia.
3. **Predicciones a 30 días** para los tres indicadores clave, incluyendo intervalo de confianza, error histórico del modelo (MAPE) y comparación interanual.
4. **Anomalías recientes** detectadas en el último día. Se priorizan las anomalías con contexto interanual completo sobre las que solo tienen información puntual.
5. **Noticias del sector** (las 3 más relevantes, deduplicadas por similitud de título).
6. **Mix energético del día** (porcentaje de generación por tecnología).
7. **Tabla regional de embalses** con semáforo por región hidrológica.
8. **Índices compuestos** del sistema (ISH, IPM, IES, CIS — sección 8).
9. **Variables adicionales de mercado**: Precio de Escasez vigente, Precio Máximo de Oferta, Demanda Regulada y No Regulada.
10. **Seis gráficas**: torta de generación por tecnología, mapa de embalses por región, evolución del precio de bolsa, evolución de la demanda, comparativo de precios multi-serie y aportes hídricos.
11. **PDF adjunto** con todo el análisis y las gráficas embebidas.

### 10.2. Salvaguardas del Proceso

- **Anti-duplicación:** si el informe ya se envió hoy, no se vuelve a enviar aunque el sistema se reinicie. Este bloqueo se libera automáticamente cada día a medianoche.
- **Resumen de respaldo:** si el modelo de inteligencia artificial no responde, se construye un resumen básico con los 3 indicadores clave para garantizar que el correo se envíe igualmente.
- **Filtrado de anomalías técnicas:** las alertas internas del sistema (datos congelados, fallas de calidad, errores de conexión) se excluyen del informe ejecutivo porque solo interesan al equipo técnico, no al Viceministro.
- **Top 5:** solo se incluyen las 5 anomalías más severas del día para evitar saturar al lector.

### 10.3. Filtros Adicionales

Para las variables de demanda (regulada y no regulada), el sistema aplica un **umbral mínimo** antes de usar el último dato:

- **Demanda Regulada:** se acepta solo si supera 100 GWh por día (evita días con publicación parcial).
- **Demanda No Regulada:** se acepta solo si supera 40 GWh por día.

Esto es necesario porque XM publica los datos en tiempo real durante el día. Los días con pocas horas publicadas tienen valores parciales que distorsionarían el informe si se mostraran sin filtro.

---

## 11. Lógica del Chatbot del Viceministro

El chatbot expone los mismos cálculos del informe diario, pero en formato conversacional. Cada tipo de pregunta del usuario se enruta a una categoría de respuesta especializada:

| Tipo de consulta | Qué entrega el chatbot |
|---|---|
| Estado actual del sector | Las tres fichas de indicadores clave con su contexto histórico (sección 2). |
| Predicciones a futuro | Pronósticos para 1 semana, 1 mes, 6 meses, 1 año, o una fecha personalizada. |
| Anomalías recientes | Lista de eventos anómalos detectados en los últimos 7 días con su severidad. |
| Métricas específicas | Consulta de una variable XM puntual (por ejemplo, generación de un día específico). |
| Informe ejecutivo | El mismo contenido del correo diario, en formato chat. |
| Predicciones por tecnología | Pronóstico desglosado por hidráulica, térmica, eólica, solar o biomasa. |
| Noticias del sector | Noticias filtradas del sector energético colombiano. |
| Consultas libres y otros temas | Conversación abierta sobre subsidios, costo unitario, pérdidas no técnicas y otros temas energéticos. |

### 11.1. Consistencia con el Informe Diario

El chatbot reutiliza **los mismos cálculos y umbrales** que el informe diario. Esto garantiza tres cosas:

- Si el chatbot dice "embalses al 47 %", el correo del día dirá exactamente lo mismo.
- Si el chatbot reporta "alerta crítica de aportes hídricos", el correo lo dirá igual.
- Si una predicción se etiqueta como "creciente" en el chatbot, lo será también en el correo, porque ambos aplican el mismo umbral del ±5 %.

Esta consistencia evita contradicciones entre canales: el Viceministro y sus asesores siempre ven el mismo número con la misma etiqueta, sin importar dónde lo consulten.

### 11.2. Advertencias de Confiabilidad del Dato

El chatbot enriquece cada respuesta con una capa de **advertencia interpretativa**. Si el valor está cerca de los límites del intervalo de confianza del modelo, o si los datos de XM tienen rezagos atípicos del día consultado, se añade una nota visible al lector.

El propósito es evitar que el Viceministro o sus asesores hagan declaraciones públicas basadas en datos volátiles o incompletos sin tener consciencia explícita de esa volatilidad.

---

## 12. Glosario de Términos Técnicos

### 12.1. Términos del sector eléctrico

| Término | Definición |
|---|---|
| **SIN** | Sistema Interconectado Nacional de energía eléctrica de Colombia. |
| **XM** | Empresa experta en mercados; operador del Sistema Interconectado Nacional. |
| **CND** | Centro Nacional de Despacho de XM, responsable de la operación en tiempo real del SIN. |
| **CREG** | Comisión de Regulación de Energía y Gas. Define las reglas regulatorias del mercado. |
| **MEM** | Mercado de Energía Mayorista. |
| **SIMEM** | Sistema de Información del Mercado de Energía Mayorista, administrado por XM. |
| **UPME** | Unidad de Planeación Minero-Energética. |
| **IDEAM** | Instituto de Hidrología, Meteorología y Estudios Ambientales. |
| **UNGRD** | Unidad Nacional para la Gestión del Riesgo de Desastres. |

### 12.2. Variables y unidades

| Término | Definición |
|---|---|
| **GWh** | Gigavatio-hora. Unidad de energía. 1 GWh equivale a 1 000 MWh. |
| **MW** | Megavatio. Unidad de potencia. La capacidad instalada se mide en MW. |
| **COP/kWh** | Pesos colombianos por kilovatio-hora. Unidad común para precios de energía. |
| **Volumen útil de un embalse** | Porcentaje del agua almacenada por encima del nivel mínimo técnico, respecto a la capacidad útil total. |
| **Capacidad útil de un embalse** | Energía máxima (en GWh) que puede generar un embalse cuando está lleno hasta el nivel máximo de operación. |
| **Aportes hídricos** | Caudales que entran a los embalses, convertidos a equivalente energético (GWh/día). |

### 12.3. Conceptos del Estatuto de Desabastecimiento CREG

| Término | Definición |
|---|---|
| **Estatuto de Desabastecimiento** | Conjunto de resoluciones CREG (026/2014, 209/2020 y complementarias) que rigen las condiciones de riesgo del SIN y los mecanismos de respuesta. |
| **Índice NE** | Nivel de Embalse. Compara el embalse real con la Senda de Referencia mensual. Tiene tres niveles: SUPERIOR, ALERTA, INFERIOR. |
| **Índice HSIN** | Hidrología del SIN. Promedio de aportes de las últimas **28 días** dividido entre la media histórica oficial XM del mismo período, × 100. Umbral oficial de normalidad: 90 %. |
| **Índice PBP** | Precio de Bolsa Promedio. Compara el PBP diario contra el Precio de Escasez de activación (PE). Nivel BAJO si PBP < PE; nivel ALTO si PBP ≥ PE durante 4 de los últimos 7 días. |
| **Condición del sistema** | NORMAL / VIGILANCIA / RIESGO — combinación oficial de NE + HSIN + PBP (Art. 3 CREG 026/2014). |
| **umbralesRegulatorios** | Paquete JSON que la API del sector entrega al portal con senda, índices NE/HSIN/PBP, condición del sistema y precios PEI/PE/PES vigentes. |
| **pctMtd** | Acumulado mensual de aportes dividido entre acumulado mensual de media histórica XM. Dato complementario; **no** se usa para semáforos ni alertas desde mayo 2026. |
| **Senda de Referencia** | Curva diaria del nivel mínimo del embalse útil del SIN que XM/CND publica al inicio de cada estación. Es la referencia oficial del Índice NE. |
| **Precio de Escasez** | Precio regulatorio por encima del cual los generadores térmicos están obligados a despachar la energía firme comprometida. |
| **PEI / PE / PES** | Tres niveles oficiales del Precio de Escasez (Inferior, de la Resolución 071/2006, Superior). Se actualizan mensualmente por la CREG. |
| **Mecanismo de Sostenimiento de Confiabilidad** | Conjunto de medidas regulatorias que la CREG puede activar cuando el sistema entra en condición de RIESGO. Definido en el Artículo 7 de la Resolución CREG 026/2014. |

### 12.4. Indicadores propios del sistema

| Término | Definición |
|---|---|
| **I2** | Sostenibilidad hidráulica del SIN: cociente entre la generación hidráulica del día y los aportes hídricos del día. Si es mayor a 1, los embalses se vacían. |
| **I3** | Estrés térmico: porcentaje de la generación total que viene de plantas térmicas. |
| **ISH** | Índice de Sostenibilidad Hídrica. Mide la disponibilidad de agua del SIN en una escala 0–100. |
| **IPM** | Índice de Presión de Mercado. Mide la presión alcista de precios en una escala 0–100. |
| **IES** | Índice de Estrés del Sistema. Promedio ponderado de los frentes anteriores más anomalías, en escala 0–100. |
| **CIS** | Calificación Integral del Sistema. Síntesis general del estado del SIN en una escala 0–100. |

### 12.5. Términos estadísticos y de modelado

| Término | Definición |
|---|---|
| **MAPE** | Error Medio Porcentual Absoluto. Mide la calidad de una predicción comparándola con el valor real cuando llega. Cuanto más bajo, mejor el modelo. |
| **Coeficiente de Variación (CV)** | Desviación estándar dividida entre la media. Mide la volatilidad relativa de una variable. |
| **Percentil** | Valor por debajo del cual cae un porcentaje de las observaciones. Por ejemplo, el percentil 25 es el valor por debajo del cual está el 25 % más bajo de los datos. |
| **Media móvil** | Promedio de los últimos N valores. Suaviza fluctuaciones puntuales para revelar la tendencia subyacente. |
| **Intervalo de confianza** | Rango dentro del cual se espera que caiga el valor real con cierta probabilidad. Cuanto más estrecho, más confiable la predicción. |

### 12.6. Términos económicos y regulatorios

| Término | Definición |
|---|---|
| **PNT** | Pérdidas No Técnicas. Diferencia entre energía facturada y consumida no atribuible a pérdidas físicas (hurto, subfacturación). |
| **CU** | Costo Unitario del servicio de energía al usuario final, en COP/kWh. |
| **OEF** | Obligaciones de Energía Firme. Compromisos de generación asumidos por las plantas bajo el Cargo por Confiabilidad. |
| **Cargo por Confiabilidad** | Mecanismo regulatorio (CREG 071/2006) que garantiza disponibilidad de energía en condiciones de escasez. |
| **Mercado regulado** | Usuarios residenciales y comerciales con tarifa regulada (estratos 1–6 y pequeños comercios). |
| **Mercado no regulado** | Grandes consumidores (industria, minería) que compran energía a precios libres. |

---

## 13. Referencias y Fuentes Oficiales

### 13.1. Marco regulatorio CREG (Estatuto para Situaciones de Riesgo de Desabastecimiento)

1. **Resolución CREG 071 de 2006** — Cargo por Confiabilidad y precio de escasez. Define el precio de escasez como techo del precio en bolsa.
2. **Resolución CREG 026 de 2014** — Estatuto para Situaciones de Riesgo de Desabastecimiento en el Mercado Mayorista de Energía. Define los índices **NE, HSIN, PBP** y las condiciones del sistema.
3. **Resolución CREG 140 de 2017** — Metodología del Precio Marginal de Escasez. Define el **PES**.
4. **Resolución CREG 121 de 2020** — Reglas de inicio y finalización del período de riesgo de desabastecimiento.
5. **Resolución CREG 209 de 2020** — Senda de Referencia del embalse agregado del SIN. Define el **Índice NE** y la **Senda de Referencia**.
6. **Resolución CREG 101 055 de 2024** — Complemento al Estatuto. Periodicidad de evaluación (semanal/bisemanal).
7. **Resolución CREG 101 066 de 2024** — Tres niveles oficiales de precio de escasez: **PEI**, **PE** y **PES**.

### 13.2. Publicaciones oficiales XM/CND

8. **XM — eXperto en Mercados.** Manual técnico de la API pública y diccionario oficial de variables del SIN.
9. **SIMEM.** Documentación oficial de precios de bolsa y escasez.
10. **Senda de Referencia del Embalse Agregado del SIN.** https://www.xm.com.co/resoluciones/operacion-y-mercado/resolucion-creg-209-de-2020-condicion-del-sistema
11. **Aportes Hídricos al SIN.** https://www.xm.com.co/hidrologia/aportes
12. **Reservas Hídricas del SIN.** https://www.xm.com.co/hidrologia/reservas
13. **Precio de Bolsa y Escasez.** https://www.xm.com.co/transacciones/cargo-por-confiabilidad/precio-de-bolsa-y-escasez
14. **Boletín XM Energético 10-abril-2026** — Acciones ante riesgo de El Niño y objetivo del 80 % de embalses.
15. **Informe XM sobre variables del mercado de energía** (publicación mensual, enero 2026 fue la base para PEI/PE/PES de referencia).
16. **Acta CNO 634** — Capacidad útil del SIN ≈ 17 000 GWh.

### 13.3. Otras fuentes

17. **IDEAM** — Pronósticos hidrometeorológicos y Estudio Nacional del Agua.
18. **UNGRD** — Sistema Nacional de Información para la Gestión del Riesgo de Desastres (alertas por amenaza hidrometeorológica de ríos).
19. **UPME** — Plan de Expansión de Referencia y datos de capacidad instalada.
20. **NASA POWER** — Documentación de variables climáticas usadas como insumo en los modelos predictivos.
21. **Histórico interno 2020–2026** — Réplica local de los datos publicados por XM, almacenada en la base de datos del proyecto bajo control del Ministerio.

---

## 14. Limitaciones Conocidas

Para transparencia metodológica, se documentan las limitaciones del sistema:

1. **Rezago de XM:** los datos llegan con 1–3 días de retraso. El sistema excluye los últimos 3 días al calcular promedios para evitar usar datos parciales. En consecuencia, las alertas operativas son **complementarias**, no en tiempo real. El CND/XM mantiene la responsabilidad de monitoreo en tiempo real.
2. **Predicciones a largo plazo:** la confiabilidad cae notablemente más allá de 180 días, especialmente para eólica (MAPE > 30 %). Se muestra siempre el intervalo de confianza.
3. **Datos congelados:** si la fuente de datos de XM falla, el sistema lo detecta automáticamente pero no puede sustituir el dato faltante. En ese caso se notifica al equipo técnico para que verifique con XM la causa del bloqueo.
4. **Índices compuestos:** los pesos (0,40 / 0,35 / 0,25) son una elección analítica del equipo técnico, no una norma regulatoria. Se documentan explícitamente para auditoría.
5. **Cobertura de embalses:** se requiere ≥ 80 % de cobertura diaria para calcular el porcentaje agregado del SIN. Si la cobertura es menor, el día no entra en el promedio.
6. **Margen operativo:** solo es interpretable sobre predicciones; con datos reales históricos siempre será cercano a cero porque oferta = demanda en tiempo real.
7. **Precios de escasez en el navegador:** el portal prioriza los valores PEI/PE/PES entregados por la API (`umbralesRegulatorios`). Si la API no responde, usa valores de respaldo estáticos (referencia enero 2026) hasta que se restablezca la conexión con el servidor.

---

## 15. Conclusiones

El sistema de alertas, semáforos y tendencias del Portal de Dirección, Chatbot y Correo Diario, en su versión **2.1 (mayo 2026)**, se sustenta sobre cinco principios:

1. **Fuentes regulatorias oficiales:** todos los umbrales operativos del sistema están respaldados por resoluciones de la CREG (026/2014, 071/2006, 140/2017, 121/2020, 209/2020, 101 055/2024 y 101 066/2024) o por publicaciones oficiales XM/CND. **No existe ningún umbral discrecional sin trazabilidad regulatoria** en los canales operativos.

2. **Marco oficial del Estatuto — aplicado de forma uniforme:**
   - Embalses → **Índice NE** comparado contra **Senda de Referencia** (consulta dinámica XM/CND + respaldo estático).
   - Aportes hídricos → **Índice HSIN** con ventana de **28 días** vs media histórica oficial XM, umbral 90 %.
   - Precio de bolsa → tres niveles oficiales **PEI / PE / PES** (consulta mensual BD) + **Índice PBP** (4 de 7 días).
   - Condición del sistema → **NORMAL / VIGILANCIA / RIESGO** calculada en la API y expuesta al portal.

3. **Trazabilidad y único punto de verdad:** todos los umbrales están consolidados en un repositorio central con la resolución CREG citada al lado de cada valor. La auditoría de mayo 2026 verificó que portal, mapa, API, alertas, chatbot y correo usan la **misma fuente**.

4. **Sostenibilidad temporal:** las alertas requieren **persistencia** (al menos 60 % a 70 % de los últimos 7 días) para evitar falsas alarmas por ruido diario. Esta lógica está alineada con la periodicidad semanal o bisemanal de evaluación establecida en el Estatuto.

5. **Complementariedad con XM:** el sistema observa, analiza y comunica; no reemplaza el monitoreo en tiempo real del CND. Cuando un umbral no está normado por la CREG (como los de demanda, estrés térmico, I2/I3 e índices compuestos ISH/IPM/IES/CIS), se identifica explícitamente como **"criterio operativo del CND"** o **"criterio del equipo técnico"** para máxima transparencia.
