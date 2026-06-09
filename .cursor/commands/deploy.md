# Deploy seguro — Portal Dirección MME

Ejecuta el deploy de producción del portal. **Obligatorio leer** `.claude/skills/portal-deploy-guard/SKILL.md` antes de actuar.

## Regla inviolable

- **SÍ:** `./scripts/deploy.sh` (build + PM2 restart + smoke tests, atómico)
- **NO:** `npm run build` solo, `pm2 restart` solo, `rm -rf .next && npm run build`

## Pasos

1. Confirmar que hay cambios que desplegar (opcional: `git status`, `git log -1 --oneline`)
2. Ejecutar desde el proyecto:
   ```bash
   cd /home/admonctrlxm/portal-direccion-mme && ./scripts/deploy.sh
   ```
3. Si el build falla, el script restaura el backup — **no improvisar pasos manuales**
4. Post-deploy — verificar:
   ```bash
   curl -s http://localhost:3001/api/health | head -c 300
   curl -s -o /dev/null -w "home: %{http_code}\n" https://portalviceministerioenergia.minenergia.gov.co/
   CHUNK=$(curl -s https://portalviceministerioenergia.minenergia.gov.co/ | grep -oP '/_next/static/chunks/[^"]+\.js' | head -1)
   [ -n "$CHUNK" ] || { echo "FAIL: no chunk found in HTML"; exit 1; }
   curl -sI "https://portalviceministerioenergia.minenergia.gov.co${CHUNK}" | head -1
   ```
5. Reportar al usuario: estado PM2, health check, HTTP home, chunk JS (debe ser 200)

## Si falla

- Pantalla blanca + HTTP 200 → asset mismatch → `./scripts/deploy.sh`
- Health 503 → `pm2 logs portal-mme --lines 50 --nostream`
- No marcar como completado hasta que health y chunk respondan OK
