# Informe Técnico: Metodología de Semáforos, Alertas y Tendencias del Sector Energético


Toda la información que se muestra en el portal, el chatbot y el informe diario proviene de métricas oficiales publicadas por XM a través de su API pública (pydataxm). Los datos se replican localmente con un rezago típico de **1 a 2 días** frente a la publicación original de XM, dado que XM construye sus series de forma incremental a lo largo de cada jornada.

Las señales que este sistema cubre son: presión en la demanda, aportes hídricos bajos, embalses en niveles mínimos, estrés térmico y precios de bolsa cercanos al precio de escasez. Las señales **fuera del alcance** del sistema son: despacho central en tiempo real, restricciones individuales de red, transacciones entre agentes y balance minuto a minuto. Para esos casos debe consultarse directamente XM / NEON.

---

## 1. Fuentes de Datos

| Fuente | Proveedor | Qué aporta |
|---|---|---|
| API pydataxm | XM S.A. E.S.P. | Generación por tecnología, demanda SIN, aportes hídricos por río, nivel de embalses, precio de bolsa nacional, precio de escasez |
| SIMEM | XM / MinMinas | Costo Unitario (CU), demanda regulada y no regulada |
| Base de datos local (PostgreSQL) | Réplica interna | Copia de todas las métricas anteriores; se actualiza automáticamente cada 6 horas |

La actualización automática ocurre cuatro veces al día (cada 6 horas). Dado que XM publica los datos del día en curso de forma incremental, los datos del día actual pueden estar incompletos hasta las últimas horas de la tarde. El sistema tiene mecanismos para detectar datos parciales y evitar mostrar cifras engañosas (ver sección 7).

---

## 2. Semáforos del Portal de Dirección

El portal muestra semáforos de cuatro colores para cinco indicadores del sistema. Cada color corresponde a un rango numérico con respaldo técnico. A continuación se describe la lógica y el fundamento de cada uno.

---

### 2.1 Nivel de Embalses (Reservas Hídricas del SIN)

**¿Qué mide?**  
El porcentaje del volumen de agua útil almacenado en el conjunto de embalses del Sistema Interconectado Nacional respecto a su capacidad útil total. La capacidad útil total del SIN equivale a aproximadamente **46.700 GWh** de energía potencial almacenada.

**¿De dónde viene el dato?**  
XM publica diariamente la métrica `PorcVoluUtilDiar` a nivel de Sistema: es el porcentaje ya calculado por XM, de modo que el portal lo toma directamente sin recalcular. Esta es la fuente de verdad oficial para el nivel de embalses.

Si el dato del día actual está incompleto (XM no ha terminado de publicar todos los registros horarios), el sistema usa el dato del día anterior y así hasta un máximo de 7 días atrás. Se considera que un dato del día corriente es parcial cuando representa menos del 20 % de la capacidad total — en ese caso se descarta y se busca el día anterior.

**Umbrales y fundamento:**

| Color | Rango | Estado | Criterio técnico |
|---|---|---|---|
| 🟢 Verde | ≥ 80 % | NORMAL | Reservas cómodas; el sistema opera sin presión operativa |
| 🔵 Cyan | 70 – 79 % | ESTABLE | Situación controlada; se aplica seguimiento preventivo |
| 🟡 Ámbar | 60 – 69 % | ALERTA TEMPRANA | Monitoreo intensificado; los aportes determinarán la evolución |
| 🟠 Naranja | 50 – 59 % | ALERTA ALTA | Riesgo real si los aportes no mejoran en las próximas semanas |
| 🔴 Rojo | < 50 % | CRÍTICO | Riesgo de desabastecimiento; se requieren medidas urgentes |

**¿Por qué estos umbrales?**  
Los rangos están alineados con los criterios operativos que el Centro Nacional de Despacho (CND) de XM utiliza en sus informes de operación. Por debajo del 50 % la capacidad de generación hidráulica se reduce de forma no lineal porque se pierde la presión de columna de agua necesaria para turbinar eficientemente, y las plantas deben operar fuera de su punto óptimo. El umbral del 70 % corresponde a la zona de "vigilancia activa" que XM emplea en sus boletines de hidrología.

---

### 2.2 Aportes Hídricos

**¿Qué mide?**  
Qué tan abundantes están siendo los aportes de los ríos al sistema durante el mes en curso, comparado con lo que históricamente ocurre en esa misma época del año. Un valor del 100 % significa que los ríos están aportando exactamente lo normal para ese mes; un valor de 80 % significa que están aportando un 20 % por debajo de lo normal.

**Fórmula:**

```
Aportes (%) = [Σ Energía aportada por todos los ríos, desde el día 1 del mes hasta hoy]
              ─────────────────────────────────────────────────────────────────────────  × 100
              [Σ Media histórica de aportes de esos mismos ríos, en el mismo período]
```

- El numerador es la suma acumulada de `AporEner` (GWh/día por río) publicada por XM, agregando **todos los ríos del SIN** desde el primer día del mes.  
- El denominador es la suma acumulada de `AporEnerMediHist` (media histórica de aportes para ese río en ese período del año), también publicada por XM.  
- Ambas sumas cubren **exactamente el mismo rango de días** para que la comparación sea justa.

**¿Por qué acumular todo el mes en lugar de usar el día de hoy?**  
Un único día de aportes es altamente variable: una lluvia puntual o una jornada seca pueden distorsionar completamente la lectura. La acumulación mensual suaviza esa variabilidad y refleja si la temporada hidrológica en su conjunto está siendo favorable o deficitaria. Es el mismo criterio que XM emplea en sus boletines mensuales de hidrología.

**Umbrales:**

| Color | Rango | Estado |
|---|---|---|
| 🟢 Verde | ≥ 120 % | MUY FAVORABLE |
| 🔵 Cyan | 100 – 119 % | NORMAL |
| 🟡 Ámbar | 90 – 99 % | VIGILANCIA |
| 🟠 Naranja | 70 – 89 % | DÉFICIT HÍDRICO |
| 🔴 Rojo | < 70 % | CRÍTICO — SEQUÍA |

---

### 2.3 Precio de Bolsa Nacional

**¿Qué mide?**  
El precio al que se transa la energía eléctrica en el mercado de corto plazo (bolsa de energía), en pesos colombianos por kilovatio-hora (COP/kWh). Un precio alto es señal de que el sistema está en estrés: los generadores más costosos, típicamente los térmicos, deben entrar a generar porque la disponibilidad hidráulica no es suficiente para cubrir la demanda.

**Fuente:** XM publica `PrecBolsNaci` (precio de bolsa nacional) diariamente.

**Umbrales (portal visual):**

| Color | Rango | Estado |
|---|---|---|
| 🟢 Verde | < 200 COP/kWh | CÓMODO |
| 🟡 Ámbar | 200 – 299 COP/kWh | ESTRÉS MODERADO |
| 🟠 Naranja | 300 – 399 COP/kWh | ALERTA |
| 🔴 Rojo | ≥ 400 COP/kWh | CRISIS ENERGÉTICA |

**Para las alertas automáticas** (ver sección 4), se usa el **Precio de Escasez** (`PrecEsca`) como referencia dinámica, en lugar de los umbrales fijos. El precio de escasez es el precio de referencia regulatorio que activa las obligaciones de energía en firme derivadas de los contratos de confiabilidad. Comparar el precio de bolsa contra el de escasez es más informativo que un número absoluto, porque el precio de escasez ya incorpora las condiciones regulatorias y de mercado vigentes.

---

### 2.4 Estado General del Sistema (Semáforo Compuesto)

Este es el semáforo principal que resume el estado operativo del SIN. Combina tres perspectivas en un solo indicador, tomando como resultado **el peor estado** de los tres. La lógica es conservadora por diseño: si cualquiera de las tres señales está en rojo, el sistema reporta rojo, independientemente de cómo estén las otras dos.

Las tres perspectivas son:

#### Perspectiva 1: Precio de bolsa
Idéntica a la descrita en la sección 2.3.

#### Perspectiva 2: Índice I2 — Relación entre generación hidráulica y aportes

**¿Qué mide?**  
Si el sistema está consumiendo el agua acumulada más rápido de lo que los ríos la reponen. Es una medida de sostenibilidad hídrica operativa.

**Fórmula:**
```
I2 = Generación hidráulica del día (GWh) / Aportes hídricos del día (GWh)
```

Un I2 = 1,0 significa equilibrio exacto: se genera exactamente la misma energía que los ríos aportan. Un I2 > 1 significa que se está vaciando el almacenamiento (los embalses pierden nivel). Un I2 < 1 significa que los embalses se están llenando.

| Rango I2 | Estado | Interpretación |
|---|---|---|
| ≤ 1,0 | SOSTENIBLE 🟢 | Los embalses se mantienen o ganan nivel |
| 1,0 – 1,2 | VIGILANCIA 🟡 | Se consume ligeramente más de lo que llega; tolerable a corto plazo |
| 1,2 – 1,5 | ALERTA 🟠 | Desbalance significativo; los embalses perderán nivel rápidamente |
| > 1,5 | CRÍTICO 🔴 | El vaciamiento es acelerado; situación insostenible si se mantiene |

#### Perspectiva 3: Índice I3 — Participación de la generación térmica

**¿Qué mide?**  
Qué fracción de la demanda total está siendo cubierta por plantas térmicas (gas, carbón, combustibles líquidos). Una participación térmica alta indica que el sistema está bajo estrés hídrico y recurre a fuentes más costosas y con mayor huella de carbono.

**Fórmula:**
```
I3 = Generación térmica del día (GWh) / Generación total del sistema (GWh) × 100
```

| Rango I3 | Estado | Referencia |
|---|---|---|
| ≤ 15 % | SOSTENIBLE 🟢 | Colombia genera históricamente el 70–80 % con hidráulica |
| 15 – 25 % | NORMAL 🔵 | Mezcla saludable; las térmicas actúan como complemento |
| 25 – 35 % | ALERTA MEDIA 🟠 | Dependencia térmica elevada; los costos de generación suben |
| > 35 % | CRÍTICO 🔴 | Riesgo estructural: costos altos y dependencia de combustibles |

**¿Por qué el 35 % como umbral crítico?**  
Históricamente, cuando la participación térmica supera el 35 % de forma sostenida, el costo marginal del sistema se eleva de manera no lineal porque entran en operación las plantas menos eficientes (plantas de mayor costo variable), y el sistema enfrenta además el riesgo de desabastecimiento de combustibles (restricciones de gas natural, disponibilidad de diésel). Este es el umbral que el CND considera como zona de riesgo estructural.

**Regla de priorización (estado general):**  
Cuando los tres indicadores arrojan estados distintos, el sistema reporta el de mayor severidad según la siguiente escala: CRÍTICO (nivel 4) > ALERTA / ALERTA MEDIA (nivel 3) > ESTRÉS MODERADO / VIGILANCIA (nivel 2) > NORMAL / SOSTENIBLE / CÓMODO (nivel 0). Se toma siempre el número más alto.

---

### 2.5 Diagnóstico Narrativo del SIN

Junto al semáforo compuesto, el portal muestra automáticamente un texto corto que describe la situación del sistema en lenguaje no técnico. El texto se genera siguiendo esta tabla de decisión:

| Condición principal | Condición secundaria | Texto generado |
|---|---|---|
| Embalses < 50 % | — | "Sistema en estado crítico — se requieren medidas urgentes de racionamiento." |
| Embalses 50 – 59 % | — | "Sistema en alerta alta — riesgo de desabastecimiento si los aportes no mejoran." |
| Embalses 60 – 69 % | Aportes < 90 % | "Sistema bajo vigilancia, con riesgo si los aportes no mejoran." |
| Embalses 60 – 69 % | Aportes ≥ 90 % | "Sistema en alerta temprana — monitoreando evolución de embalses y aportes." |
| Embalses 70 – 79 % | — | "Sistema estable, con seguimiento preventivo de niveles hídricos." |
| Embalses ≥ 80 % | — | "Sistema en condiciones normales — niveles cómodos." |

---

### 2.6 Mapa de Embalses por Departamento

El mapa de Colombia colorea cada departamento según el estado de sus embalses. La regla aplicada es: **el color del departamento corresponde al del embalse más crítico dentro de ese departamento**. Si en Antioquia hay cinco embalses en verde y uno en rojo, todo el departamento aparece en rojo. Esta es una decisión conservadora deliberada: ocultar el embalse más crítico bajo un promedio puede dar una falsa sensación de seguridad.

Los colores individuales de cada embalse siguen la misma escala que las reservas nacionales:

| Nivel del embalse | Color |
|---|---|
| > 80 % | 🟢 Verde — Normal |
| 70 – 80 % | 🔵 Cyan — Estable |
| 60 – 70 % | 🟡 Ámbar — Alerta temprana |
| 50 – 60 % | 🟠 Naranja — Situación delicada |
| < 50 % | 🔴 Rojo — Crítico |

---

## 3. Indicadores de Tendencia

Junto a cada cifra clave del portal aparece una flecha y un número que indica si la métrica mejoró o empeoró en los últimos 7 días.

**Cálculo:**
```
Tendencia 7 días = Valor del día de hoy − Valor de hace 7 días
```

**Etiquetas que puede mostrar:**
- **ALTA:** el valor aumentó en los últimos 7 días.
- **BAJA:** el valor disminuyó.
- **ESTABLE:** el cambio es insignificante.

**Interpretación por contexto (color inteligente):**  
La flecha no es verde cuando sube ni roja cuando baja en todos los casos. El color depende de si el cambio es favorable o desfavorable para el sistema:

| Métrica | Tendencia ALTA | Tendencia BAJA |
|---|---|---|
| Embalses | 🟢 Verde (bueno: se llenan) | 🔴 Rojo (malo: se vacían) |
| Aportes hídricos | 🟢 Verde (bueno: más lluvia) | 🔴 Rojo (malo: menos aportes) |
| Precio de bolsa | 🟠 Naranja (malo: más caro) | 🟢 Verde (bueno: más barato) |
| Generación total | Neutral (depende del contexto) | Neutral |

---

## 4. Sistema de Alertas Automáticas

Cada 30 minutos el sistema evalúa automáticamente el estado del sector energético. Cuando detecta que una métrica supera su umbral crítico o de alerta, genera una notificación que se envía por Telegram y por correo electrónico. Para evitar saturar a los destinatarios, **la misma alerta no se reenvía más de una vez al día** (el sistema lleva un registro de las alertas ya enviadas y las descarta si el lapso es menor a 24 horas).

A continuación se describen en detalle los criterios de cada alerta.

---

### 4.1 Demanda Alta

**¿Qué detecta?**  
Días en que la demanda eléctrica nacional supera los niveles típicos históricos, lo cual puede anunciar situaciones de estrés en el margen de reserva del sistema.

**Umbrales y referencia estadística:**

| Severidad | Umbral diario | Base estadística |
|---|---|---|
| ALERTA | > 248 GWh/día | Percentil 75 del histórico anual |
| CRÍTICO | > 253 GWh/día | Percentil 99 del histórico anual |

**¿Qué es el percentil 99?**  
Es el valor por encima del cual solo cae el 1 % de las observaciones históricas anuales. Dicho de otro modo: en condiciones normales, ese umbral se supera apenas 3 o 4 días al año. Cuando se supera con frecuencia, indica una anomalía real (ola de calor prolongada, evento industrial inusual, etc.).

**Regla de activación (no se dispara por un solo día):**  
La alerta se activa únicamente si el umbral es superado en **más del 50 % de los días del horizonte de evaluación** (7 días) para alerta, o en **más del 60 %** para crítico. Esta regla de persistencia evita falsas alarmas por días aislados.

---

### 4.2 Embalses Bajos

**Umbrales:**

| Severidad | Nivel de embalses |
|---|---|
| ALERTA | < 40 % de la capacidad útil |
| CRÍTICO | < 30 % de la capacidad útil |

**¿Por qué el 30 %?**  
A ese nivel, la generación hidráulica disponible se reduce significativamente porque las plantas deben operar con menor presión de columna de agua, lo que baja la potencia que pueden despachar. Históricamente, el CND ha activado medidas de contingencia operativa (despacho preferente de térmicas, coordinación con demanda, etc.) cuando el sistema se acerca a ese nivel. El 40 % es la zona de "vigilancia activa" que precede al riesgo real.

---

### 4.3 Aportes Hídricos Bajos — Umbrales Estacionales

**¿Por qué los umbrales son distintos según el mes?**  
Los ríos de Colombia tienen patrones de lluvia marcadamente estacionales. Mayo y junio son típicamente los meses de mayor aporte (temporada de lluvias); enero y febrero son los más secos. Si se usara el mismo umbral durante todo el año, se generarían falsas alarmas en la temporada seca (cuando los aportes bajos son completamente normales) y se pasarían por alto déficits reales durante la temporada húmeda.

**Cálculo de los umbrales:**  
Se usaron los datos históricos de aportes publicados por XM para el período 2020–2026 y se calcularon, para cada mes del año, el **percentil 5** (valor que solo se supera hacia abajo en el 5 % de los años históricos — año excepcionalmente seco) y el **percentil 15** (año seco pero no excepcional). Esos percentiles definen los umbrales de CRÍTICO y ALERTA respectivamente.

| Mes | ALERTA (percentil 15 histórico) | CRÍTICO (percentil 5 histórico) |
|---|---|---|
| Enero | < 115 GWh/día | < 63 GWh/día |
| Febrero | < 129 GWh/día | < 98 GWh/día |
| Marzo | < 141 GWh/día | < 124 GWh/día |
| Abril | < 194 GWh/día | < 160 GWh/día |
| Mayo | < 291 GWh/día | < 223 GWh/día |
| Junio | < 392 GWh/día | < 311 GWh/día |
| Julio | < 356 GWh/día | < 315 GWh/día |
| Agosto | < 264 GWh/día | < 227 GWh/día |
| Septiembre | < 217 GWh/día | < 188 GWh/día |
| Octubre | < 251 GWh/día | < 221 GWh/día |
| Noviembre | < 335 GWh/día | < 296 GWh/día |
| Diciembre | < 211 GWh/día | < 194 GWh/día |

**Regla de activación:** igual que demanda — se requiere que el déficit se sostenga en más del 50 % / 60 % de los días del horizonte evaluado.

---

### 4.4 Precio de Bolsa Elevado

**Método preferido — comparación con Precio de Escasez:**

| Severidad | Condición |
|---|---|
| ALERTA | Precio de bolsa promedio > 65 % del precio de escasez |
| CRÍTICO | Precio de bolsa promedio > 90 % del precio de escasez |

**¿Por qué el 90 % del precio de escasez?**  
El precio de escasez es el precio al que se activan las Obligaciones de Energía en Firme (OEF) de los contratos de confiabilidad. Cuando el precio de bolsa se acerca al precio de escasez, indica que el mercado spot está operando cerca del límite superior del sistema de precios, señal que históricamente ha precedido situaciones de racionamiento si se sostiene por varios días. El 65 % es una señal de alerta temprana que permite anticipación.

**Método de respaldo (si el precio de escasez no está disponible):**

| Severidad | Umbral fijo |
|---|---|
| ALERTA | > 500 COP/kWh |
| CRÍTICO | > 850 COP/kWh |

---

### 4.5 Margen Operativo Bajo

**¿Qué mide?**  
La diferencia entre la capacidad de generación disponible y la demanda esperada, expresada como porcentaje de la demanda. Un margen bajo significa que el sistema no tiene reserva suficiente y que la falla de una sola planta de generación grande podría comprometer el suministro.

**Fórmula:**
```
Margen (%) = (Generación disponible estimada − Demanda estimada) / Demanda estimada × 100
```

| Severidad | Margen | Referencia operativa |
|---|---|---|
| ALERTA | < 8 % | Zona de vigilancia del CND |
| CRÍTICO | < 3 % | Límite mínimo de confiabilidad del CND |

**¿Por qué el 3 %?**  
El 3 % es el margen mínimo de reserva que el CND/XM utiliza internamente como umbral de alerta operativa. Por debajo de ese nivel, el riesgo de un déficit de potencia es real y el operador del sistema activa protocolos de emergencia.

---

### 4.6 Estrés Térmico Sostenido

**¿Qué detecta?**  
No un día aislado de alta generación térmica, sino una situación en la que la dependencia térmica es **elevada y se mantiene en el tiempo**. La condición de persistencia es esencial para distinguir eventos normales (un mantenimiento programado de una planta hidráulica que requiere más térmicas por un día) de un estrés estructural.

| Severidad | Participación térmica | Persistencia mínima requerida |
|---|---|---|
| ALERTA | > 20 % de la generación total | En más del 60 % de los días del horizonte |
| CRÍTICO | > 35 % de la generación total | En más del 70 % de los días del horizonte |

---

### 4.7 Detección de Datos Congelados

El sistema también alerta cuando una métrica deja de actualizarse. Si un indicador no registra variación alguna durante un número de horas mayor al esperado para esa métrica (considerando el rezago normal de publicación de XM), el sistema genera una alerta de "datos congelados" para que el equipo técnico verifique si hay un problema en la cadena de actualización.

---

## 5. Informe Diario Automático (8:00 AM)

Cada día a las 8:00 AM el sistema genera y distribuye un informe ejecutivo completo. El proceso tiene seis etapas:

**Etapa 1 — Recopilación de datos:**  
Se obtienen simultáneamente: el estado actual del sistema (generación, precio, embalses), las predicciones a 1 semana, 1 mes y 6 meses, las anomalías detectadas durante las últimas 24 horas, y las noticias más relevantes del sector energético del día.

**Etapa 2 — Redacción con Inteligencia Artificial:**  
Los datos recopilados se estructuran en un contexto organizado y se envían a un modelo de lenguaje (IA) que redacta un informe ejecutivo narrativo de cinco secciones, pensado para ser leído por el Viceministro y su despacho. Si la IA no está disponible, el sistema genera automáticamente un informe de respaldo con tablas de datos numéricos.

**Etapa 3 — Generación de gráficos:**  
Se producen cinco gráficas: composición de la generación por tecnología (gráfico de torta), evolución histórica de embalses, serie de precio de bolsa, predicciones de corto y mediano plazo.

**Etapa 4 — Generación del PDF:**  
El informe narrativo, los gráficos y las tablas de datos se consolidan en un documento PDF que queda disponible como adjunto del correo.

**Etapa 5 — Distribución:**
- **Telegram:** el informe narrativo se envía como mensaje de texto a todos los usuarios que han interactuado con el chatbot.
- **Correo electrónico:** se envía un correo HTML enriquecido con las gráficas incrustadas y el PDF adjunto, a la lista de destinatarios configurada en la base de datos del sistema.

**Etapa 6 — Control de duplicados:**  
Si el servidor se reinicia o el sistema se ejecuta más de una vez en el día, la segunda ejecución detecta que el informe ya fue enviado y no lo repite.

---

## 6. Chatbot Energético

El chatbot integrado en el portal responde consultas en lenguaje natural. Usa los mismos módulos de análisis que el resto del sistema, de modo que las cifras que reporta son siempre consistentes con lo que muestra el portal.

**Capacidades del chatbot:**

| Tipo de consulta | Qué responde |
|---|---|
| Estado actual del sistema | Los tres indicadores clave del Viceministro: generación total (GWh), precio de bolsa (COP/kWh) y porcentaje de embalses (%) |
| Anomalías detectadas | Lista de alertas activas con severidad, valor actual y comparación con el histórico |
| Predicciones | Proyecciones a 1 semana, 1 mes, 6 meses y 1 año, con intervalo de confianza |
| Informe ejecutivo | Genera un informe narrativo completo asistido por IA, bajo demanda |
| Noticias del sector | Titulares y resumen de noticias energéticas del día |

Las anomalías se clasifican visualmente por severidad: las críticas en rojo, las de alerta en ámbar, y las informativas en azul. El chatbot no calcula estas clasificaciones por sí solo; las recibe del mismo motor de alertas descrito en la sección 4.

---

## 7. Metodología de Predicciones

Las predicciones publicadas en el portal y en el informe diario son generadas por modelos estadísticos entrenados con datos históricos de XM desde el año 2000. Los modelos se re-entrenan automáticamente tres veces por semana (domingos, miércoles y sábados a las 2:00 AM) incorporando los datos más recientes.

**Técnicas utilizadas:**
- **Modelos de series de tiempo:** SARIMA y Prophet de Meta, que capturan la estacionalidad mensual y anual de las variables energéticas.
- **Modelos de aprendizaje automático:** LightGBM y Random Forest, que incorporan variables exógenas (temperatura, índices climáticos, días festivos) para mejorar la precisión.
- **Conjunto (ensemble):** los pronósticos de múltiples modelos se promedian ponderando por su desempeño histórico reciente.

**Indicadores de calidad de las predicciones:**

Cada predicción publicada incluye:
- **Valor central predicho:** la estimación puntual para esa fecha.
- **Intervalo de confianza:** el rango de valores probables (mínimo y máximo), que refleja la incertidumbre inherente al horizonte temporal.
- **MAPE (Error Porcentual Absoluto Medio):** porcentaje de error promedio del modelo en datos históricos. Un MAPE del 5 % significa que el modelo se equivoca en promedio un 5 % del valor real. Se publica para que el lector evalúe la confiabilidad de cada predicción.

| Calificación | Rango de MAPE |
|---|---|
| MUY CONFIABLE | < 10 % |
| CONFIABLE | 10 – 20 % |
| APROXIMADO | > 20 % |

**Horizontes y precisión esperada:**  
Los modelos tienen mayor precisión en horizontes cortos (1 semana) y menor en horizontes largos (6 meses a 1 año). Las predicciones de largo plazo deben interpretarse como indicadores de tendencia, no como valores exactos.

**Auditoría continua:**  
Cada día a las 8:00 AM el sistema compara automáticamente la predicción que hizo en su momento para el día de hoy con el dato real publicado por XM. Este proceso de auditoría ex-post actualiza las métricas de calidad del modelo y detecta si algún modelo se está degradando.

---

## 8. Validación de Datos

Antes de mostrar cualquier cifra, el sistema aplica controles de consistencia para evitar publicar datos erróneos, incompletos o físicamente imposibles. Los principales controles son:

- **Datos parciales del día corriente:** un porcentaje de embalses inferior al 20 % publicado por XM para el día actual se considera datos incompletos (XM aún no ha terminado de publicar) y se descarta, usando el día anterior.
- **Rangos físicos:** los aportes hídricos, la generación y la demanda calculados se comparan contra rangos físicamente razonables. Un valor fuera de esos rangos (por ejemplo, aportes negativos o un precio de bolsa de cero) se rechaza y se registra en el log del sistema.
- **Datos sin disponibilidad:** si un dato no está disponible en la base de datos local (porque XM aún no lo publicó o hubo un error en la descarga), el portal muestra "S/D" (Sin Dato) en lugar de mostrar un cero o un valor incorrecto.

---

## 9. Tabla Resumen de Todos los Umbrales

### Semáforos del Portal (visualización)

| Indicador | Unidad | 🟢 Normal | 🔵 Estable | 🟡 Alerta Temprana | 🟠 Alerta Alta | 🔴 Crítico |
|---|---|---|---|---|---|---|
| Reservas hídricas | % capacidad | ≥ 80 | 70 – 79 | 60 – 69 | 50 – 59 | < 50 |
| Aportes hídricos | % vs. histórico | ≥ 120 | 100 – 119 | 90 – 99 | 70 – 89 | < 70 |
| Precio de bolsa | COP/kWh | < 200 | — | 200 – 299 | 300 – 399 | ≥ 400 |
| I2 Hidráulico | ratio Gen/Aportes | ≤ 1,0 | — | 1,0 – 1,2 | 1,2 – 1,5 | > 1,5 |
| I3 Térmico | % generación total | ≤ 15 | 15 – 25 | — | 25 – 35 | > 35 |

### Alertas Automáticas (notificaciones)

| Alerta | Umbral ALERTA | Umbral CRÍTICO | Persistencia requerida |
|---|---|---|---|
| Demanda | > 248 GWh/día (p75) | > 253 GWh/día (p99) | > 50 % / 60 % de los días |
| Embalses | < 40 % | < 30 % | Inmediato |
| Aportes (varía por mes) | < percentil 15 histórico | < percentil 5 histórico | > 50 % / 60 % de los días |
| Precio vs. escasez | > 65 % del P. Escasez | > 90 % del P. Escasez | Promedio del horizonte |
| Margen operativo | < 8 % | < 3 % | Inmediato |
| Estrés térmico | > 20 % de la gen. total | > 35 % de la gen. total | > 60 % / 70 % de los días |

---

## 10. Glosario

| Término | Significado |
|---|---|
| **SIN** | Sistema Interconectado Nacional |
| **XM** | XM S.A. E.S.P. — Operador del sistema eléctrico colombiano |
| **CND** | Centro Nacional de Despacho |
| **UPME** | Unidad de Planeación Minero Energética |
| **AporEner** | Métrica XM: energía aportada diariamente por cada río al sistema (GWh/día) |
| **AporEnerMediHist** | Métrica XM: media histórica de aportes para ese río y época del año |
| **PorcVoluUtilDiar** | Métrica XM: porcentaje del volumen útil almacenado en embalses (precalculado por XM) |
| **PrecBolsNaci** | Métrica XM: precio de bolsa nacional (COP/kWh) |
| **PrecEsca** | Precio de Escasez: precio regulatorio de referencia para activar Obligaciones de Energía en Firme |
| **OEF** | Obligación de Energía en Firme — compromisos derivados de los contratos de confiabilidad |
| **I2 Hidráulico** | Índice que mide la relación entre generación hidráulica y aportes hídricos del día |
| **I3 Térmico** | Índice que mide la participación porcentual de la generación térmica en la matriz |
| **MAPE** | Error Porcentual Absoluto Medio — métrica de precisión de los modelos de predicción |
| **Percentil 5 / 15** | Valor por debajo del cual cae el 5 % / 15 % de las observaciones históricas del período |
| **SARIMA** | Modelo estadístico de series de tiempo que captura estacionalidad y tendencia |
| **Prophet** | Modelo de predicción de series de tiempo desarrollado por Meta, robusto ante datos faltantes y estacionalidades complejas |
| **Ensemble** | Combinación ponderada de múltiples modelos para mejorar la precisión de las predicciones |

---