#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Hook `postbuild` de npm — se ejecuta SOLO después de `npm run build`.
#
#  Motivo: `next build` sobrescribe .next/ en sitio. El proceso PM2 vivo
#  conserva en memoria el manifiesto del build anterior y sigue sirviendo
#  HTML que apunta a chunks ya borrados → 500 en CSS/JS → la hidratación
#  no corre → página en blanco (con la portada respondiendo 200).
#
#  Incidente 2026-09-30: build a las 22:28 sobre proceso de las 01:47.
#  Seis días en blanco sin alerta.
# ═══════════════════════════════════════════════════════════════
set -uo pipefail

PM2_NAME="portal-mme"
PM2_BIN="/home/admonctrlxm/.nvm/versions/node/v20.20.0/bin/pm2"

# deploy.sh hace su propio restart controlado — no duplicar.
if [ "${DEPLOY_IN_PROGRESS:-0}" = "1" ]; then
  echo "[postbuild] deploy.sh gestiona el reinicio — omitido."
  exit 0
fi

if [ ! -x "$PM2_BIN" ]; then
  echo "[postbuild] pm2 no encontrado — omitido (entorno sin PM2)."
  exit 0
fi

if ! "$PM2_BIN" describe "$PM2_NAME" >/dev/null 2>&1; then
  echo "[postbuild] '$PM2_NAME' no corre en PM2 — omitido (entorno de desarrollo)."
  exit 0
fi

echo "[postbuild] Build nuevo sobre proceso vivo: reiniciando '$PM2_NAME'..."
if ! "$PM2_BIN" restart "$PM2_NAME" --update-env; then
  echo "[postbuild] ⚠️  EL REINICIO FALLÓ. El portal está sirviendo un build huérfano."
  echo "[postbuild] ⚠️  Ejecute manualmente: pm2 restart $PM2_NAME --update-env"
  exit 1
fi
echo "[postbuild] ✅ Reinicio completado."
