#!/bin/bash
# verify-table-snapshot.sh
# Automatiza Skill 9 (Data Verification) para PostgreSQL
# Uso: ./verify-table-snapshot.sh metrics_hourly
# Output: /tmp/snapshot_metrics_hourly_YYYYMMDD_HHMMSS.md

set -e

if [ -z "$1" ]; then
  echo "❌ Uso: $0 [nombre_tabla]"
  echo "Ejemplo: $0 metrics_hourly"
  exit 1
fi

TABLE=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="/tmp/snapshot_${TABLE}_${TIMESTAMP}.md"

# Verificar conexión a PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "❌ Error: psql no instalado. Instala: sudo apt-get install postgresql-client"
  exit 1
fi

# Paso 1: Obtener tamaño de tabla
echo "📊 Obteniendo tamaño de tabla: $TABLE ..."
BYTES=$(psql -d portal_energetico -t -A -c "SELECT pg_relation_size('${TABLE}')" 2>/dev/null || echo "0")

if [ "$BYTES" = "0" ]; then
  echo "❌ Error: Tabla '$TABLE' no encontrada en base de datos 'portal_energetico'"
  exit 1
fi

# Convertir bytes a formato legible
if command -v numfmt &> /dev/null; then
  SIZE_HUMAN=$(numfmt --to=iec-i --suffix=B "$BYTES" 2>/dev/null || echo "$BYTES bytes")
else
  SIZE_HUMAN="$BYTES bytes"
fi

# Paso 2: Crear archivo de snapshot con header
cat > "$OUTPUT_FILE" << EOF
# Snapshot: $TABLE
## Timestamp
$(date)

## Tamaño
- Bytes: $BYTES
- Formato: $SIZE_HUMAN

EOF

# Paso 3: Decidir método automáticamente y ejecutar
METHOD=""

if [ "$BYTES" -lt 100000000 ]; then
  METHOD="A"
  echo "## Método: A (Full Checksum < 100 MB)" >> "$OUTPUT_FILE"
  echo "✅ Método A: Full checksum (rápido)" >&2
  
  echo "### COUNT" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT COUNT(*) AS count FROM ${TABLE};" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Checksum MD5" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT md5(string_agg(t::text, '' ORDER BY id)) AS checksum FROM ${TABLE} AS t;" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Duplicados" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT COUNT(*) - COUNT(DISTINCT (*)) AS duplicados FROM ${TABLE};" >> "$OUTPUT_FILE" 2>&1

elif [ "$BYTES" -lt 1000000000 ]; then
  METHOD="B"
  echo "## Método: B (Full Checksum 100 MB - 1 GB, LENTO)" >> "$OUTPUT_FILE"
  echo "⏳ Método B: Full checksum (puede tardar 10-30 segundos)..." >&2
  
  echo "### COUNT" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT COUNT(*) AS count FROM ${TABLE};" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Checksum MD5" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT md5(string_agg(t::text, '' ORDER BY id)) AS checksum FROM ${TABLE} AS t;" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Duplicados" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT COUNT(*) - COUNT(DISTINCT (*)) AS duplicados FROM ${TABLE};" >> "$OUTPUT_FILE" 2>&1

elif [ "$BYTES" -lt 10000000000 ]; then
  METHOD="C"
  echo "## Método: C (Stat Proxy + Sampling 1 GB - 10 GB)" >> "$OUTPUT_FILE"
  echo "📊 Método C: Stat proxy + sampling (sin count exacto)" >&2
  
  echo "### Estimated Count (desde pg_stats)" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT reltuples::bigint AS estimated_count FROM pg_class WHERE relname='${TABLE}';" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Estadísticas de columnas" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT attname, n_distinct, null_frac, avg_width FROM pg_stats WHERE tablename='${TABLE}' ORDER BY attname;" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Sample Checksum (1.0% TABLESAMPLE)" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT md5(string_agg(t::text, '' ORDER BY id)) AS sample_checksum FROM ${TABLE} TABLESAMPLE SYSTEM(1.0) AS t WHERE t.fecha >= CURRENT_DATE - INTERVAL '30 days';" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Rango temporal" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT MIN(fecha) AS min_fecha, MAX(fecha) AS max_fecha FROM ${TABLE};" >> "$OUTPUT_FILE" 2>&1

else
  METHOD="D"
  echo "## Método: D (Stat Proxy ONLY > 10 GB, NO COUNT)" >> "$OUTPUT_FILE"
  echo "⚠️  Método D: Stat proxy únicamente (tabla >10GB, sin COUNT exacto)" >&2
  echo "⚠️  Para re-verificar post-cambio, usar ANALYZE: psql -d portal_energetico -c 'ANALYZE ${TABLE};'" >&2
  
  echo "### Estadísticas de columnas (sin COUNT exacto)" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT attname, n_distinct, null_frac, avg_width, correlation FROM pg_stats WHERE tablename='${TABLE}' ORDER BY attname;" >> "$OUTPUT_FILE" 2>&1
  
  echo "### Rango temporal (query indexada, rápida)" >> "$OUTPUT_FILE"
  psql -d portal_energetico -c "SELECT MIN(fecha) AS min_fecha, MAX(fecha) AS max_fecha FROM ${TABLE};" >> "$OUTPUT_FILE" 2>&1
fi

# Paso 4: Reportar
echo "" >> "$OUTPUT_FILE"
echo "## Notas" >> "$OUTPUT_FILE"
echo "- Método: $METHOD" >> "$OUTPUT_FILE"
echo "- Generado por: verify-table-snapshot.sh" >> "$OUTPUT_FILE"
echo "- Para comparar post-cambio: ejecutar el mismo script y hacer diff de los archivos" >> "$OUTPUT_FILE"

echo ""
echo "✅ Snapshot guardado en: $OUTPUT_FILE"
echo "📊 Tabla: $TABLE | Tamaño: $SIZE_HUMAN | Método: $METHOD"
echo ""
echo "📝 Próximos pasos:"
echo "1. Guardar este snapshot como 'baseline' si es pre-cambio:"
echo "   cp $OUTPUT_FILE /tmp/snapshot_${TABLE}_baseline.md"
echo "2. Después de tu cambio, ejecuta:"
echo "   $0 $TABLE"
echo "3. Comparar con: diff /tmp/snapshot_${TABLE}_baseline.md /tmp/snapshot_${TABLE}_*.md"
echo ""
