# Prompt: /deploy — Deploy Seguro a Producción

> **Skill obligatorio:** `.claude/skills/portal-deploy-guard/SKILL.md`
> **Script:** `./scripts/deploy.sh`

## Regla inviolable

Build + PM2 restart = **una sola operación**. Nunca separar.

```bash
# ✅ ÚNICO camino
cd /home/admonctrlxm/portal-direccion-mme
./scripts/deploy.sh

# ❌ PROHIBIDO — pantalla blanca masiva
npm run build   # sin pm2 restart
```

## Flujo

1. (Opcional) `git status` / `git log -1 --oneline` — contexto del deploy
2. `./scripts/deploy.sh` — backup `.next`, build, restart, smoke tests
3. Verificar health + home + chunk JS (ver skill portal-deploy-guard)
4. Reportar resultado al usuario

## Post-deploy

```bash
curl -s http://localhost:3001/api/health | head -c 300
curl -s -o /dev/null -w "home: %{http_code}\n" https://portalviceministerioenergia.minenergia.gov.co/
```

## Si el portal está en blanco (HTTP 200)

1. Comparar `stat .next/BUILD_ID` vs `pm2 show portal-mme | grep "created at"`
2. Si BUILD_ID es más nuevo → asset mismatch → `./scripts/deploy.sh`
3. No atribuir a caché del navegador si afecta a todos los usuarios
