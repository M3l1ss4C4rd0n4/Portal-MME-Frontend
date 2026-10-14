#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
#  Deploy seguro — Portal Dirección MME
#  Uso: ./scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════

PROJECT_DIR="/home/admonctrlxm/portal-direccion-mme"
PM2_NAME="portal-mme"
PORT=3001
HEALTH_TIMEOUT=30
API_TIMEOUT=10

# Colores
R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${G}[DEPLOY]${NC} $*"; }
warn() { echo -e "${Y}[WARN]${NC} $*"; }
fail() { echo -e "${R}[FAIL]${NC} $*"; exit 1; }

cd "$PROJECT_DIR"

# ── 0. Procedencia del código ─────────────────────────────────
# Desplegar lo que haya en disco, sin saber qué commit es, fue la raíz de los
# dos incidentes de pantalla en blanco. Desde que hay CI, el contrato es:
# solo se despliega un árbol limpio que corresponde a una confirmación.
# Para una emergencia, DEPLOY_SIN_VERIFICAR=1 lo salta dejando constancia.
if [ "${DEPLOY_SIN_VERIFICAR:-0}" = "1" ]; then
  warn "DEPLOY_SIN_VERIFICAR=1 — se omite la comprobación de procedencia."
  warn "Quedará desplegado código que puede no corresponder a ningún commit."
else
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo
    git status --short
    echo
    fail "Hay cambios sin confirmar. Confírmalos (o usa DEPLOY_SIN_VERIFICAR=1
      para una emergencia) antes de desplegar: así el build siempre
      corresponde a un commit que CI pudo verificar."
  fi
  RAMA=$(git branch --show-current)
  COMMIT=$(git rev-parse --short HEAD)
  log "Desplegando ${COMMIT} de la rama ${RAMA}."
fi

# ── 1. Pre-checks ─────────────────────────────────────────────
log "Verificando variables de entorno..."
MISSING=()
for var in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD BACKEND_API_URL; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  warn "Variables faltantes en shell: ${MISSING[*]}"
  warn "Asegúrese de que estén definidas en PM2 (pm2 env) o en .env.local"
  warn "El deploy continuará usando --update-env..."
fi
log "Variables OK (o se heredarán de PM2)."

# ── 2. Preparar staging ───────────────────────────────────────
# El build NO se hace sobre .next: se compila aparte y se intercambia al final.
# Así el proceso vivo nunca se queda sin su build mientras compila (antes, el
# `mv .next` previo al build dejaba el portal en blanco durante toda la compilación).
STAGING=".next.staging"
BACKUP=""
rm -rf "$STAGING"   # limpia un staging huérfano de una corrida abortada

rollback() {
  if [ -n "${BACKUP:-}" ] && [ -d "$BACKUP" ]; then
    warn "Revirtiendo al build anterior ($BACKUP)..."
    rm -rf .next
    mv "$BACKUP" .next
    pm2 restart "$PM2_NAME" --update-env >/dev/null 2>&1 || true
    warn "Rollback aplicado. El portal volvió al build previo."
  else
    warn "No hay backup disponible para revertir."
  fi
}

# ── 3. Build en staging (el portal sigue EN LÍNEA) ────────────
log "Compilando en $STAGING — el portal sigue sirviendo el build actual..."
# Variables acotadas al comando (no `export`): si se filtraran al entorno de PM2
# vía --update-env, `next start` buscaría .next.staging, que ya no existe tras el swap.
# DEPLOY_IN_PROGRESS=1 evita que el hook `postbuild` reinicie por su cuenta.
if ! DEPLOY_IN_PROGRESS=1 NEXT_DIST_DIR="$STAGING" npm run build; then
  rm -rf "$STAGING"
  fail "Build falló. El portal NO se tocó: sigue sirviendo el build anterior."
fi

if [ ! -s "$STAGING/BUILD_ID" ]; then
  rm -rf "$STAGING"
  fail "El build terminó sin BUILD_ID en $STAGING. Abortado sin tocar el portal."
fi
log "Build exitoso."

# ── 4. Swap atómico ───────────────────────────────────────────
# Dos `mv` dentro del mismo filesystem: la ventana de inconsistencia es de milisegundos.
BACKUP=".next.bak.$(date +%Y%m%d_%H%M%S)"
log "Swap atómico: build anterior → $BACKUP · $STAGING → .next"
if [ -d .next ]; then
  mv .next "$BACKUP"
else
  BACKUP=""
fi
mv "$STAGING" .next

# ── 5. PM2 restart ────────────────────────────────────────────
log "Reiniciando PM2 ($PM2_NAME)..."
pm2 restart "$PM2_NAME" --update-env || { rollback; fail "PM2 restart falló"; }

# ── 6. Esperar a que levante ──────────────────────────────────
log "Esperando a que el servidor levante (max ${HEALTH_TIMEOUT}s)..."
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
  if curl -sfL "http://localhost:$PORT/api/health/" > /dev/null 2>&1; then
    log "Servidor respondiendo en puerto $PORT."
    break
  fi
  sleep 1
done

if ! curl -sfL "http://localhost:$PORT/api/health/" > /dev/null 2>&1; then
  fail "El servidor no levantó después de ${HEALTH_TIMEOUT}s."
fi

# ── 7. Post-deploy API checks ─────────────────────────────────
log "Verificando APIs críticas..."
APIS=(
  "/api/health"
  "/api/sector/"
  "/api/sector/detalle/"
  "/api/subsidios/pagos-detalle/"
  "/api/presupuesto/"
  "/api/comunidades/"
  "/api/supervision/"
  "/api/subsidios/"
  "/api/fenoge/"
)

FAILED=()
for api in "${APIS[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$API_TIMEOUT" "http://localhost:$PORT$api" || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "308" ]; then
    log "  ✅ $api → $CODE"
  else
    warn "  ❌ $api → $CODE"
    FAILED+=("$api ($CODE)")
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  warn "Algunas APIs no respondieron 200:"
  printf '  - %s\n' "${FAILED[@]}"
  warn "Revisar logs: pm2 logs $PM2_NAME --lines 50"
fi

# ── 7b. Verificación de recursos estáticos ────────────────────
# Imprescindible: si el proceso quedara sirviendo un build huérfano, las APIs
# siguen en 200 y el deploy parecería exitoso, pero la página sale en blanco.
log "Verificando recursos estáticos (/_next/static)..."
if ASSET_RES=$(bash "$PROJECT_DIR/scripts/check-assets.sh" "http://localhost:$PORT" / 2>&1); then
  log "  ✅ $ASSET_RES"
else
  warn "  ❌ $ASSET_RES"
  rollback
  fail "Recursos estáticos rotos: la página se habría visto EN BLANCO. Se revirtió al build anterior."
fi

# ── 8. Limpiar backups antiguos (>5) ──────────────────────────
ls -1dt .next.bak.* 2>/dev/null | tail -n +6 | xargs -r rm -rf

log "Deploy completado."
log "Health check: curl http://localhost:$PORT/api/health"
