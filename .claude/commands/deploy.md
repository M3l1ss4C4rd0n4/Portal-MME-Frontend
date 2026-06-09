---
description: Deploy seguro a producción del Portal MME (build + PM2 restart atómico). Usar SIEMPRE en lugar de npm run build manual.
---

# /deploy — Deploy Seguro Portal MME

**Skill obligatorio:** Leer `.claude/skills/portal-deploy-guard/SKILL.md` antes de ejecutar.

## Ejecutar

```bash
cd /home/admonctrlxm/portal-direccion-mme && ./scripts/deploy.sh
```

## Prohibido

- `npm run build` sin `pm2 restart portal-mme` inmediato
- `pm2 restart` sin build cuando hubo cambios en `src/`
- `rm -rf .next && npm run build` a mano

## Verificación post-deploy

```bash
curl -s http://localhost:3001/api/health | head -c 300
curl -s -o /dev/null -w "home: %{http_code}\n" https://portalviceministerioenergia.minenergia.gov.co/
CHUNK=$(curl -s https://portalviceministerioenergia.minenergia.gov.co/ | grep -oP '/_next/static/chunks/[^"]+\.js' | head -1)
[ -n "$CHUNK" ] || { echo "FAIL: no chunk found in HTML"; exit 1; }
curl -sI "https://portalviceministerioenergia.minenergia.gov.co${CHUNK}" | head -1
```

## Reportar

- Resultado de `deploy.sh` (éxito/fallo)
- PM2 status (`portal-mme` online)
- Health check + HTTP home + chunk JS (200)
- Si algo falló: logs `pm2 logs portal-mme --lines 50 --nostream`
