#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Verifica que TODOS los recursos /_next/static referenciados por
#  una página existan y respondan 200.
#
#  Detecta el fallo "página en blanco con HTTP 200": el proceso sirve
#  HTML que apunta a chunks de un build anterior que ya no está en disco.
#  Un check normal sobre la portada NO lo ve (la portada responde 200).
#
#  Uso: ./check-assets.sh [BASE_URL] [RUTA]
#  Salida: 0=OK  1=assets rotos  2=portada caída  3=HTML sin assets
# ═══════════════════════════════════════════════════════════════
set -uo pipefail

BASE_URL="${1:-http://127.0.0.1:3001}"
PAGE="${2:-/}"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

CODE=$(curl -sL --max-time 20 -o "$TMP" -w "%{http_code}" "${BASE_URL}${PAGE}" 2>/dev/null || echo "000")
if [ "$CODE" != "200" ]; then
  echo "PORTADA_CAIDA http=$CODE"
  exit 2
fi

ASSETS=$(grep -oE '/_next/static/[^"]+\.(js|css)' "$TMP" | sort -u)
if [ -z "$ASSETS" ]; then
  echo "SIN_ASSETS (el HTML no referencia /_next/static — build sospechoso)"
  exit 3
fi

TOTAL=0; ROTO=0; DETALLE=""
while IFS= read -r a; do
  [ -z "$a" ] && continue
  TOTAL=$((TOTAL + 1))
  C=$(curl -s -o /dev/null --max-time 10 -w "%{http_code}" "${BASE_URL}${a}" 2>/dev/null || echo "000")
  if [ "$C" != "200" ]; then
    ROTO=$((ROTO + 1))
    DETALLE="${DETALLE} [${C}] ${a}"
  fi
done <<< "$ASSETS"

if [ "$ROTO" -gt 0 ]; then
  echo "ASSETS_ROTOS ${ROTO}/${TOTAL} —${DETALLE}"
  exit 1
fi

echo "OK ${TOTAL}/${TOTAL} recursos"
exit 0
