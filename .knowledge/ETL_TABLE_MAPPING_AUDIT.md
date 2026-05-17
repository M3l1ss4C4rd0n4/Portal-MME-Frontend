# ETL Table Mapping Audit
**Last Updated:** May 14, 2026  
**Status:** In Progress — Mapping all Excel → Database connections

---

## 📋 Summary Table

| Database Table | Backend Route | Excel Source | ETL Handler | Status | Notes |
|---|---|---|---|---|---|
| `comunidades.base` | `/v1/comunidades/mapa` | `Resumen_Implementación.xlsx` | `etl_comunidades()` | ✅ Mapped (local file) | Loaded via `etl_nuevos_dashboards.py`, NOT SharePoint-synced |
| `comunidades.implementadas` | — | `Resumen_Implementación.xlsx` | `etl_comunidades()` | ✅ Mapped | Same ETL handler as `comunidades.base` |
| `contratos_or.seguimiento` | `/v1/contratos-or/` | `Seguimiento_Contratos_CE.xlsx` | `etl_contratos_or_onedrive` | ✅ Tracked (#4) | SharePoint-synced |
| `fenoge.comunidades` | — | `Comunidades_Energeticas_fenoge.xlsx` | `etl_fenoge_comunidades` | ✅ Tracked (#7) | SharePoint-synced |
| `fenoge.seguimiento` | — | `comunidades_seguimiento_fenoge.xlsx` | `etl_fenoge_seguimiento` | ✅ Tracked (#5) | SharePoint-synced |
| `presupuesto.resumen` | `/v1/presupuesto/` | `Acuerdos_Gestion_DEE_2026.xlsx` | `etl_presupuesto_onedrive` | ✅ Tracked (#2) | SharePoint-synced; contains multiple sheets |
| `supervision.contratos` | `/v1/supervision/` | `Matriz_General_Reparto.xlsx` | `etl_supervision_onedrive` | ✅ Tracked (#1) | SharePoint-synced; 83 MB file |
| `supervision.contratos_liquidacion` | — | `Matriz_General_Reparto.xlsx` | `etl_supervision_onedrive` | ✅ Tracked | Same ETL handler as supervision.contratos |
| `supervision.contratos_ejecucion` | — | `Matriz_General_Reparto.xlsx` | `etl_supervision_onedrive` | ✅ Tracked | Same ETL handler as supervision.contratos |
| `subsidios.deficit_historico` | — | `Deficit_Historico_Subsidios.xlsx` | `etl_deficit_historico` | ✅ Tracked (#6) | SharePoint-synced |
| `subsidios.kpis_resumen` | `/v1/subsidios/` | `Base_Subsidios_DDE.xlsx` | `etl_subsidios` | ✅ Tracked (#3) | SharePoint-synced; also has special kpis_resumen handler |
| `subsidios.subsidios_pagos` | `/v1/subsidios/` | `Base_Subsidios_DDE.xlsx` | `etl_subsidios` | ✅ Tracked | Same ETL handler as kpis_resumen |
| `subsidios.subsidios_validaciones` | — | `Base_Subsidios_DDE.xlsx` | `etl_subsidios` | ✅ Tracked | Same ETL handler; extracted from sheet "Validación" |
| `subsidios.subsidios_empresas` | — | `Base_Subsidios_DDE.xlsx` | `etl_subsidios` | ✅ Tracked | Same ETL handler; extracted from sheet "Empresa" |
| `subsidios_kpis.*` | — | `Matriz_Subsidios_KPIs.xlsx` | `etl_subsidios_kpis` | ⚠️ **ORPHANED** | Handler exists but NOT in SHAREPOINT_FILES (never triggered) |
| `colombia_solar.*` | `/colombia-solar/` | `Colombia_Solar_OR.xlsx` | `etl_colombia_solar` | ✅ Tracked (#8) | SharePoint-synced; multiple sheet headers |

---

## 🟢 TRACKED FILES (in SHAREPOINT_FILES)

### 1. Matriz_General_Reparto.xlsx
- **URL:** SharePoint DEE_Supervision
- **Destination:** `supervision` schema (3 tables)
- **Handler:** `etl_supervision_onedrive`
- **Timeout:** 60s connect, 60min read (83 MB, large file)
- **Tables:**
  - `supervision.contratos` ← "Matriz General de Reparto" sheet
  - `supervision.contratos_liquidacion` ← "Grupo liquidacion" sheet
  - `supervision.contratos_ejecucion` ← "Grupo Ejecucion" sheet
- **Note:** Atomic transaction — all 3 tables update together or all rollback

### 2. Acuerdos_Gestion_DEE_2026.xlsx
- **URL:** SharePoint Planeación/Presupuestal
- **Destination:** `presupuesto` schema (multiple tables)
- **Handler:** `etl_presupuesto_onedrive`
- **Tables:** All sheets in presupuesto schema (generic loader)
- **Header Overrides:** "resumen" sheet has header at row 3 (not row 0)
- **Note:** `header_overrides={"resumen": 3}` indicates special handling

### 3. Base_Subsidios_DDE.xlsx
- **URL:** SharePoint Subsidios/Base datos_subsidios
- **Destination:** `subsidios` schema (4 tables)
- **Handler:** `etl_subsidios`
- **Tables:**
  - `subsidios.subsidios_pagos` ← "Pago" sheet
  - `subsidios.subsidios_validaciones` ← "Validación" sheet
  - `subsidios.subsidios_empresas` ← "Empresa" sheet
  - `subsidios.kpis_resumen` ← special handler (reads "KPI'S Subsidios" sheet)
- **Code Reference:** Lines 600-650 in etl_sharepoint_sync.py

### 4. Seguimiento_Contratos_CE.xlsx
- **URL:** SharePoint Comunidades Energéticas/Data_CE
- **Destination:** `contratos_or` schema
- **Handler:** `etl_contratos_or_onedrive`
- **Tables:** `contratos_or.seguimiento`
- **Note:** Generic loader via `_load_sheets_to_schema`

### 5. Comunidades_Seguimiento_FENOGE.xlsx
- **URL:** SharePoint Comunidades Energéticas/Data_CE
- **Destination:** `fenoge` schema
- **Handler:** `etl_fenoge_seguimiento`
- **Tables:** `fenoge.seguimiento`
- **Column Mapping:** 12 Excel columns → DB columns (fecha_inicio, mes_no, avance_real_pct, etc.)

### 6. Deficit_Historico_Subsidios.xlsx
- **URL:** Personal OneDrive (dmgutierrez@minenergia.gov.co)
- **Destination:** `subsidios` schema
- **Handler:** `etl_deficit_historico`
- **Source Sheet:** "Hoja5"
- **Tables:** `subsidios.deficit_historico`
- **Columns:** anio, subsidios, contribuciones, deficit_anual, apropiacion_pgn, recursos_faltantes, deficit_acumulado

### 7. Comunidades_Energeticas_FENOGE.xlsx ✅ (Just Fixed)
- **URL:** SharePoint Comunidades Energéticas/Data_CE
- **Destination:** `fenoge` schema
- **Handler:** `etl_fenoge_comunidades`
- **Tables:** `fenoge.comunidades`
- **Column Mapping:** 14 Excel columns → DB columns
- **Special Parsing:**
  - COP currency columns ("$ 6.800.000,00") → numeric
  - Coordinates with comma decimal ("6,66") → 6.66
  - Dates: mixed datetime/string "DD/MM/YYYY" format normalized

### 8. Colombia_Solar_OR.xlsx
- **URL:** SharePoint PMO/Contratos OR
- **Destination:** `colombia_solar` schema
- **Handler:** `etl_colombia_solar`
- **Tables:** All sheets in colombia_solar schema
- **Header Overrides:**
  - "Base" sheet: header at row 1
  - "Seguimiento Diario" sheet: header at row 2
- **Note:** Multiple sheet structure for PMO tracking

---

## 🟡 ORPHANED HANDLER (Exists but NOT TRIGGERED)

### ⚠️ Matriz_Subsidios_KPIs.xlsx
**STATUS:** Handler defined but **NOT in SHAREPOINT_FILES** — **NEVER EXECUTED**

- **Handler Name:** `etl_subsidios_kpis`
- **Handler Code:** Lines 665-675 in etl_sharepoint_sync.py
- **Destination:** `subsidios_kpis` schema
- **Issue:** 
  - Handler exists in `ETL_HANDLERS` dict
  - Handler is NOT referenced in any SHAREPOINT_FILES entry
  - SharePoint sync will never trigger this handler
  - **Consequence:** `subsidios_kpis` schema stays empty if no other ETL fills it

**Resolution Options:**
1. **Add to SHAREPOINT_FILES** if file exists in SharePoint and should be tracked
2. **Delete handler** if file is no longer used
3. **Document as manual/legacy** if loaded by other means

---

## 🔵 LOCAL FILES (Not SharePoint-Synced)

### Resumen_Implementación.xlsx
- **Location:** `/home/admonctrlxm/server/data/base_de_datos_comunidades_energeticas/`
- **Destination:** `comunidades` schema (2 tables)
- **Handler:** `etl_comunidades()` in `etl_nuevos_dashboards.py`
- **Tables:**
  - `comunidades.base` ← main data (implemented communities)
  - `comunidades.implementadas` ← aggregated by project/fund
- **Trigger:** Manual execution via: `python etl/etl_nuevos_dashboards.py --schema comunidades`
- **Note:** NOT monitored for changes; requires manual re-run to reload

---

## ❌ UNTRACKED/UNCONFIRMED FILES

### Files Mentioned in Docstrings But NOT in SHAREPOINT_FILES:

| File Name | Mentioned For | Status |
|---|---|---|
| `Matriz_Subsidios_KPIs.xlsx` | subsidios_kpis schema | ⚠️ **Orphaned handler** |
| `Matriz_Ejecucion_Presupuestal_2026.xlsx` | presupuesto schema | ❌ Misdocumented (actually uses Acuerdos_Gestion_DEE_2026.xlsx) |

### Potentially Unused Files:
| File Name | Possible Purpose | Verification Needed |
|---|---|---|
| `Comunidades_Energeticas_Avance.xlsx` | Communities implementation progress | ❌ NOT referenced in any ETL handler |
| `Matriz_Implementacion_Base.xlsx` | Supervision/contracts | ❌ NOT referenced in any ETL handler |

---

## 🔧 ETL Handler Mapping

```
SHAREPOINT_FILES Entry → ETL Handler → Database Tables
──────────────────────────────────────────────────────
1. Matriz_General_Reparto
   ↓
   etl_supervision_onedrive
   ↓
   supervision.contratos
   supervision.contratos_liquidacion
   supervision.contratos_ejecucion

2. Acuerdos_Gestion_DEE_2026
   ↓
   etl_presupuesto_onedrive
   ↓
   presupuesto.* (all sheets)

3. Base_Subsidios_DDE
   ↓
   etl_subsidios
   ↓
   subsidios.subsidios_pagos
   subsidios.subsidios_validaciones
   subsidios.subsidios_empresas
   subsidios.kpis_resumen

4. Seguimiento_Contratos_CE
   ↓
   etl_contratos_or_onedrive
   ↓
   contratos_or.seguimiento

5. Comunidades_Seguimiento_FENOGE
   ↓
   etl_fenoge_seguimiento
   ↓
   fenoge.seguimiento

6. Deficit_Historico_Subsidios
   ↓
   etl_deficit_historico
   ↓
   subsidios.deficit_historico

7. Comunidades_Energeticas_FENOGE
   ↓
   etl_fenoge_comunidades
   ↓
   fenoge.comunidades

8. Colombia_Solar_OR
   ↓
   etl_colombia_solar
   ↓
   colombia_solar.* (all sheets)

❌ ORPHANED:
Matriz_Subsidios_KPIs.xlsx (handler exists but NOT in SHAREPOINT_FILES)
   ↓
   etl_subsidios_kpis
   ↓
   subsidios_kpis.* (NEVER TRIGGERED)
```

---

## 📊 Database Schema Coverage

| Schema | Tables | Tracked Files | Status |
|---|---|---|---|
| `comunidades` | base, implementadas | Resumen_Implementación.xlsx (local) | ✅ Mapped |
| `contratos_or` | seguimiento | Seguimiento_Contratos_CE.xlsx | ✅ Tracked |
| `fenoge` | comunidades, seguimiento | 2 FENOGE files | ✅ Tracked |
| `presupuesto` | resumen, (others) | Acuerdos_Gestion_DEE_2026.xlsx | ✅ Tracked |
| `subsidios` | kpis_resumen, pagos, validaciones, empresas, deficit_historico | 2 files (Base_Subsidios_DDE.xlsx + Deficit_Historico_Subsidios.xlsx) | ✅ Tracked |
| `subsidios_kpis` | * | Matriz_Subsidios_KPIs.xlsx | ⚠️ **Orphaned** |
| `supervision` | contratos, liquidacion, ejecucion | Matriz_General_Reparto.xlsx | ✅ Tracked |
| `colombia_solar` | * | Colombia_Solar_OR.xlsx | ✅ Tracked |

---

## 🎯 Key Findings & Recommendations

### ✅ What's Working
1. **8 files fully tracked** in SHAREPOINT_FILES with matching handlers
2. **Atomic transactions** for multi-table loads (supervision, subsidios, fenoge)
3. **Local file handling** for comunidades.base (manual but reliable)
4. **Column mapping** with special parsing for currency, dates, coordinates

### ⚠️ Issues Identified

**1. Orphaned Handler: `etl_subsidios_kpis`**
   - Handler exists (line 665-675) but NOT in SHAREPOINT_FILES
   - `subsidios_kpis` schema never gets populated
   - **Action:** Either add file to SHAREPOINT_FILES or delete handler

**2. Docstring vs. Reality**
   - Docstring mentions `Matriz_Ejecucion_Presupuestal_2026.xlsx`
   - Actually uses `Acuerdos_Gestion_DEE_2026.xlsx`
   - **Action:** Update docstring (lines 3-9)

**3. Untracked Files**
   - `Comunidades_Energeticas_Avance.xlsx` — NOT referenced anywhere
   - `Matriz_Implementacion_Base.xlsx` — NOT referenced anywhere
   - **Action:** Verify if these files are needed; if yes, create ETL handlers

**4. Manual Local File**
   - `Resumen_Implementación.xlsx` requires manual `python etl/etl_nuevos_dashboards.py --schema comunidades`
   - Could be monitored by adding to SharePoint sync if file is moved to SharePoint
   - **Action:** Consider moving to SharePoint for automated updates

### 🔍 Verification Checklist

- [ ] Confirm `Matriz_Subsidios_KPIs.xlsx` file location (if exists)
  - If yes: Add to SHAREPOINT_FILES
  - If no: Delete handler from ETL_HANDLERS
- [ ] Verify `Comunidades_Energeticas_Avance.xlsx` vs. `Comunidades_Energeticas_FENOGE.xlsx` are different files
- [ ] Check if `Matriz_Implementacion_Base.xlsx` should feed `supervision.contratos` instead of `Matriz_General_Reparto.xlsx`
- [ ] Test all 8 tracked handlers with recent data to confirm table populations
- [ ] Document manual trigger for `etl_comunidades()` or automate via cron

---

## 📝 Questions for Data Stewards

1. **Matriz_Subsidios_KPIs.xlsx**: Does this file exist? Should it be tracked?
2. **Comunidades_Energeticas_Avance.xlsx**: What data does this contain vs. Comunidades_Energeticas_FENOGE?
3. **Matriz_Implementacion_Base.xlsx**: Is this a source for supervision.contratos, or is it obsolete?
4. **Resumen_Implementación.xlsx**: Can this file be moved to SharePoint to automate ETL?
5. **Data freshness**: What's the expected refresh frequency for each file?

