# Prompt: Verificación de Datos (DB)

> **Skill Pack:** Cargar Skill 9 (Data Verification) del SKILL_PACK_V5.0.md
> **Regla:** SIEMPRE obtener tamaño de tabla ANTES de elegir método

## Paso 0: Obtener Tamaño

```bash
psql -d portal_energetico -c "
  SELECT relname, pg_size_pretty(pg_relation_size(relid)) as size,
         pg_relation_size(relid) as bytes
  FROM pg_stat_user_tables
  WHERE relname = 'TABLA_OBJETIVO';
"
```

## Selección de Método

| Tamaño | Método | Qué hace | Tiempo |
|---|---|---|---|
| < 100 MB | **A** | COUNT + md5(string_agg) completo | <1s |
| 100MB-1GB | **B** | COUNT + md5(string_agg) con precaución | 10-30s |
| 1GB-10GB | **C** | Stat proxy + TABLESAMPLE(1.0) | 10-30s |
| > 10GB | **D** | Stat proxy SOLO (pg_stats) | ~2s |

## Tablas Críticas del Proyecto

| Tabla | Tamaño | Método Obligatorio |
|---|---|---|
| `metrics_hourly` | 32 GB | **D** — PROHIBIDO COUNT exacto |
| `metrics` | 1.4 GB | C (TABLESAMPLE + ANALYZE) |
| `embalses` | <100 MB | A (checksum completo) |
| Otras | <300 MB total | A |

## Comandos por Método

### Método A/B (< 1GB)
```sql
SELECT COUNT(*) AS pre_count FROM tabla;
SELECT md5(string_agg(t::text, '' ORDER BY id)) AS pre_checksum FROM tabla AS t;
SELECT COUNT(*) - COUNT(DISTINCT (col1, col2)) AS pre_dups FROM tabla;
```

### Método C (1GB-10GB)
```sql
SELECT reltuples::bigint AS estimated_count FROM pg_class WHERE relname = 'tabla';
SELECT attname, n_distinct, null_frac FROM pg_stats WHERE tablename = 'tabla';
SELECT md5(string_agg(t::text, '' ORDER BY id)) AS sample_checksum
FROM tabla TABLESAMPLE SYSTEM(1.0) AS t
WHERE t.fecha >= CURRENT_DATE - INTERVAL '30 days';
```

### Método D (> 1GB)
```sql
SELECT attname, n_distinct, null_frac, avg_width, correlation
FROM pg_stats WHERE tablename = 'tabla' ORDER BY attname;
SELECT MIN(fecha) AS min_fecha, MAX(fecha) AS max_fecha FROM tabla;
```

## Verificación Post-Cambio

USAR EL MISMO MÉTODO que en el snapshot pre-cambio.
Leer `/tmp/diag_[tarea].md` para obtener valores pre.
Comparar: si discrepancia >10% en n_distinct → investigar.
