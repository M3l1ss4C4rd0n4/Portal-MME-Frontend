# Informe Técnico: Lógica de Alertas, Semáforos, Estado Actual y Tendencias del Sector Energético.


## Reglas generales (aplican a todas las métricas)

| Regla | Qué significa |
|---|---|
| **Persistencia** | Un solo día anómalo **no** dispara alerta. Casi siempre se exige que la condición se repita varios días seguidos (típicamente 50–70 % de los últimos 7 días). |
| **CRÍTICO vs ALERTA** | **CRÍTICO** → notificación inmediata (correo + Telegram). **ALERTA** → queda registrada y sale en el informe diario, sin aviso urgente. |
| **Fuentes oficiales** | Embalses, aportes y precio usan índices **CREG** (NE, HSIN, PBP) y datos **XM/SIMEM**. Senda y precios PEI/PE/PES se consultan en BD (actualización mensual CREG). |
| **Rezago de datos** | XM publica con 1–3 días de retraso. El sistema es **complementario** al monitoreo del CND, no sustituto. |

---

## 1. Embalses del SIN (% volumen útil agregado)

**Qué mide:** Porcentaje de agua útil en los embalses del SIN vs capacidad total.  
**Índice regulatorio:** **Índice NE** — compara el nivel real con la **Senda de Referencia CREG** del mes (Res. CREG 209/2020).  
**Regla absoluta CREG:** si el embalse está **≥ 70 %**, se considera normal sin importar la senda.

| Estado en portal | Condición | ¿Dispara alerta automática? |
|---|---|---|
| 🟢 Normal | Embalse ≥ 80 % | No |
| 🔵 Estable | Embalse 70–79 % | No |
| 🟡 Sobre senda | Embalse ≥ senda CREG del mes | No |
| 🟠 Alerta | Embalse **por debajo de la senda** CREG | **ALERTA** si NE = ALERTA |
| 🔴 Riesgo | Embalse **muy por debajo de la senda** (NE = INFERIOR) | **CRÍTICO** si el mínimo de los últimos 7 días está en NE INFERIOR |

**Estado en correo diario (Normal / Alerta / Crítico):**

| Estado correo | Condición |
|---|---|
| Normal | NE = SUPERIOR (≥ senda o ≥ 70 %) |
| Alerta | NE = ALERTA **o** embalse > 80 % |
| Crítico | NE = INFERIOR **o** embalse > 95 % (riesgo de vertimiento) |

> **Clave:** el umbral **no es fijo** (no es “30 % = crítico”). Depende de la senda del mes. Ejemplo: 35 % puede ser crítico en agosto y normal en mayo.

---

## 2. Aportes hídricos (Índice HSIN)

**Qué mide:** Promedio de aportes de los **últimos 28 días** ÷ media histórica oficial XM del mismo período × 100.  
**Fuente normativa:** Res. CREG 026/2014, Art. 2.  
**Dato usado:** series XM `AporEner` y `AporEnerMediHist`.

| HSIN (%) | Estado en portal | ¿Dispara alerta? |
|---|---|---|
| ≥ 120 | 🟢 Muy favorable | No |
| 100 – 119 | 🔵 Normal | No |
| 90 – 99 | 🟡 Vigilancia CREG | No (aún ≥ umbral oficial 90 %) |
| 70 – 89 | 🟠 Déficit hídrico | **ALERTA** |
| 60 – 69 | 🔴 Déficit severo | **ALERTA** |
| ≤ 60 | 🔴 Crítico histórico | **CRÍTICO** |

> **Clave:** el umbral oficial de normalidad es **90 %**. Por debajo de eso el Estatuto entra en vigilancia.

---

## 3. Precio de bolsa nacional

**Qué mide:** Precio ponderado de bolsa del último día publicado (SIMEM/XM).  
**Referencias regulatorias:** PEI, PE y PES (Res. CREG 101 066/2024, actualizados mensualmente).  
**Índice PBP:** ALTO si el precio supera el **PE** en **4 o más de los últimos 7 días** (Res. CREG 026/2014).

| Precio vs PEI / PE / PES | Estado en portal | ¿Dispara alerta? |
|---|---|---|
| < PEI | 🟢 Cómodo | No |
| PEI ≤ precio < PE | 🟡 Estrés moderado | No (informativo si supera PEI) |
| PE ≤ precio < PES | 🟠 Alta presión | **ALERTA** si PBP = ALTO (≥ 4 de 7 días sobre PE) |
| ≥ PES | 🔴 Techo regulatorio | **CRÍTICO** si ≥ 4 de 7 días sobre PES |

**Valores de referencia (enero 2026, si BD no tiene mes actual):** PEI = 327,67 · PE = 590,56 · PES = 830,34 COP/kWh.

**Estado en correo diario** (por variación vs promedio 7 días, no por PEI/PE/PES). **Umbrales propuestos — pendientes de validación:**

| Variación vs 7d | Estado |
|---|---|
| ≤ 12 % | Normal |
| 12 – 25 % | Alerta |
| > 25 % | Crítico |

---

## 4. Demanda del SIN

**Qué mide:** Demanda diaria total del SIN (GWh/día).  
**Fuente normativa:** Criterio operativo CND (percentiles del histórico XM). **No es índice CREG.**

| Condición | Severidad alerta |
|---|---|
| ≥ 60 % de los últimos 7 días superan **253 GWh/día** (percentil 99) | **CRÍTICO** |
| ≥ 50 % de los últimos 7 días superan **248 GWh/día** (percentil 75) | **ALERTA** |
| Por debajo de esos umbrales | Sin alerta |

> **Clave:** demanda alta sola no es crisis. Se combina con otros frentes (embalses, margen, térmica).

---

## 5. Estrés térmico (% generación térmica)

**Qué mide:** Generación térmica ÷ generación total del SIN × 100.  
**Fuente normativa:** Criterio operativo CND (no está en resolución CREG específica).

| Condición | Estado portal | Severidad alerta |
|---|---|---|
| ≤ 15 % | 🟢 Sostenible | Sin alerta |
| 15 – 25 % | 🔵 Normal | Sin alerta |
| 25 – 35 % | 🟠 Alerta media | **ALERTA** si > 20 % en ≥ 60 % de los últimos 7 días |
| > 35 % | 🔴 Crítico | **CRÍTICO** si > 35 % en ≥ 70 % de los últimos 7 días |

> Se aplica media móvil de 3 días antes de evaluar.

---

## 6. Sostenibilidad hidráulica — Índice I2 (solo portal)

**Qué mide:** Generación hidráulica del día ÷ aportes hídricos del día.  
**Base normativa:** **No es índice CREG.** Los puntos de corte (1,0 / 1,2 / 1,5) son una **propuesta del sistema** para lectura gerencial — pendiente de que ustedes los evalúen.

| I2 | Estado portal | ¿Dispara alerta? |
|---|---|---|
| ≤ 1,0 | 🟢 Sostenible | No |
| 1,0 – 1,2 | 🟡 Vigilancia | No |
| 1,2 – 1,5 | 🟠 Alerta | No (solo visual) |
| > 1,5 | 🔴 Crítico | No (solo visual) |

> I2 > 1 significa que se genera más agua de la que entra a los embalses. Es señal anticipada de vaciado.

---

## 7. Generación total del SIN

**Qué mide:** Suma de generación diaria del SIN (GWh).  
**Uso principal:** ficha del Viceministro y tendencia, no alerta regulatoria directa.

| Variación vs promedio 7 días | Tendencia en ficha |
|---|---|
| > +5 % | ↗ Por encima |
| ±5 % | ➡ Estable |
| < −5 % | ↘ Por debajo |

**Estado en correo diario** (por variación absoluta vs 7 días). **Umbrales propuestos — pendientes de validación:**

| Variación | Estado |
|---|---|
| ≤ 8 % | Normal |
| 8 – 15 % | Alerta |
| > 15 % | Crítico |

---

## 8. Condición global del sistema (NORMAL / VIGILANCIA / RIESGO)

**Qué mide:** Combinación de los tres índices regulatorios NE + HSIN + PBP (Art. 3 CREG 026/2014).  
**Dónde aparece:** portal (`umbralesRegulatorios.condicionSistema`). **No envía alerta por sí sola.**

| Índice NE | Índice HSIN | Índice PBP | Condición |
|---|---|---|---|
| SUPERIOR | NORMAL | BAJO | **NORMAL** |
| Cualquier combinación intermedia | — | — | **VIGILANCIA** |
| INFERIOR | ≠ NORMAL **o** | PBP ALTO | **RIESGO** |

---

## 9. Otras alertas (menos frecuentes en lectura gerencial)

| Métrica | Cuándo entra en alerta | Notas |
|---|---|---|
| **Margen operativo** | CRÍTICO < 3 % · ALERTA 3–8 % | Solo sobre **predicciones** futuras, no datos reales |
| **Pérdidas no técnicas (PNT)** | CRÍTICO > ~12 % · ALERTA > ~9 % | Umbrales por operador de red (CREG) |
| **Costo unitario (CU)** | ALERTA > 400 · CRÍTICO > 600 COP/kWh | Solo alerta **económica**, nunca operativa de apagón |
| **Datos congelados** | Mismo valor N días sin cambiar | Control de calidad XM (2–5 días según variable) |

---

## Resumen: métricas con respaldo CREG vs criterios propuestos

| Métrica | Base normativa | Umbrales principales |
|---|---|---|
| Embalses | ✅ CREG (Índice NE + Senda) | Senda mensual + regla 70 % |
| Aportes | ✅ CREG (Índice HSIN) | 90 % / 70 % / 60 % |
| Precio de bolsa | ✅ CREG (PEI/PE/PES + PBP) | PEI, PE, PES + regla 4 de 7 días |
| Condición del sistema | ✅ CREG (Art. 3) | NE + HSIN + PBP |
| Demanda | ⚙️ Referencia CND (percentiles XM) | 248 / 253 GWh + persistencia 7d |
| Estrés térmico | ⚙️ Referencia CND | 20 % / 35 % + persistencia 7d |
| I2 hidráulico | 🔄 Propuesta a evaluar | 1,0 / 1,2 / 1,5 |
| Generación (correo) | 🔄 Propuesta a evaluar | Variación 8 % / 15 % vs 7d |
| Precio (correo) | 🔄 Propuesta a evaluar | Variación 12 % / 25 % vs 7d |

**Leyenda:**  
- ✅ = resolución CREG (oficial)  
- ⚙️ = referencia operativa CND / histórico XM (no norma de desabastecimiento)  
- 🔄 = criterio implementado en el sistema como **propuesta de prueba** — **pendiente de validación por el equipo MME**

> **Nota sobre criterios no CREG:** algunos umbrales del sistema (I2, estados del correo diario para generación/precio, etc.) son **propuestas de implementación** puestas a prueba en el portal. **No fueron definidos por un equipo externo** — están pendientes de que ustedes los evalúen y confirmen si son adecuados o deben ajustarse.
