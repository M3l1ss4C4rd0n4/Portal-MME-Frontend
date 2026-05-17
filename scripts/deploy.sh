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

# ── 2. Backup build anterior ──────────────────────────────────
if [ -d ".next" ]; then
  BACKUP=".next.bak.$(date +%Y%m%d_%H%M%S)"
  log "Backupeando build anterior → $BACKUP"
  mv .next "$BACKUP"
fi

# ── 3. Build ──────────────────────────────────────────────────
log "Ejecutando npm run build..."
if ! npm run build; then
  fail "Build falló. Restaurando backup..."
  rm -rf .next
  mv "$BACKUP" .next
  exit 1
fi
log "Build exitoso."

# ── 4. Smoke-test de APIs críticas (antes de reiniciar) ──────
# Nota: Next.js dev no corre aquí; hacemos verificación post-restart

# ── 5. PM2 restart ────────────────────────────────────────────
log "Reiniciando PM2 ($PM2_NAME)..."
pm2 restart "$PM2_NAME" --update-env || fail "PM2 restart falló"

# ── 6. Esperar a que levante ──────────────────────────────────
log "Esperando a que el servidor levante (max ${HEALTH_TIMEOUT}s)..."
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
  if curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
    log "Servidor respondiendo en puerto $PORT."
    break
  fi
  sleep 1
done

if ! curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
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

# ── 8. Limpiar backups antiguos (>5) ──────────────────────────
ls -1dt .next.bak.* 2>/dev/null | tail -n +6 | xargs -r rm -rf

log "Deploy completado."
log "Health check: curl http://localhost:$PORT/api/health"
