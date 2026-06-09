---
name: portal-deploy-guard
description: "Reglas obligatorias de deploy y producción del Portal Dirección MME. Previene pantalla blanca por build sin PM2 restart. Activar SIEMPRE antes de npm run build, pm2 restart, deploy, hotfix, incidente portal caído, pantalla blanca, chunks rotos, asset mismatch, o cualquier cambio que toque .next/ o producción."
---

# Portal Deploy Guard — Reglas Obligatorias

> **Incidente documentado:** 2026-06-02 — Pantalla blanca para TODOS los usuarios.
> **Causa:** `npm run build` sin `pm2 restart portal-mme`. Ver `.knowledge/errors.md`.

## Regla #1 — Operación atómica (INVIOLABLE)

**Build + PM2 restart = una sola operación. NUNCA separar.**

```bash
# ✅ ÚNICO camino permitido en producción
cd /home/admonctrlxm/portal-direccion-mme
./scripts/deploy.sh
```

```bash
# ❌ PROHIBIDO — causa pantalla blanca masiva
npm run build
# ... olvidar pm2 restart ...

# ❌ PROHIBIDO — igual de peligroso
rm -rf .next && npm run build

# ❌ PROHIBIDO — restart sin build cuando hubo cambios de código
pm2 restart portal-mme
```

Si el agente necesita compilar: **ejecutar `./scripts/deploy.sh`**, no inventar pasos manuales.

## Regla #2 — Cuándo activar este skill

Activar **antes de cualquier acción** que involucre:

| Trigger | Acción obligatoria |
|---|---|
| Cambio de código TS/TSX/CSS en `src/` | `./scripts/deploy.sh` al terminar |
| Usuario pide "deploy", "subir a prod", "reiniciar portal" | `./scripts/deploy.sh` |
| Portal en blanco / "caído" / sin contenido | Diagnosticar → `./scripts/deploy.sh` si hay mismatch |
| `npm run build` mencionado en el plan | Reemplazar por `./scripts/deploy.sh` |
| Hotfix urgente | `./scripts/deploy.sh` (tiene backup + rollback) |
| Solo verificar build local (sin prod) | `npm run build` OK **solo si NO toca `.next/` en prod** |

## Regla #3 — Checklist post-deploy (obligatorio)

Tras `./scripts/deploy.sh`, verificar:

```bash
curl -s http://localhost:3001/api/health | head -c 200
curl -s -o /dev/null -w "home: %{http_code}\n" https://portalviceministerioenergia.minenergia.gov.co/
```

Confirmar que el HTML referencia chunks que existen:

```bash
CHUNK=$(curl -s https://portalviceministerioenergia.minenergia.gov.co/ | grep -oP '/_next/static/chunks/[^"]+\.js' | head -1)
[ -n "$CHUNK" ] || { echo "FAIL: no chunk found in HTML"; exit 1; }
curl -sI "https://portalviceministerioenergia.minenergia.gov.co${CHUNK}" | head -1
# Debe ser: HTTP/1.1 200 OK
```

## Regla #4 — Diagnóstico pantalla blanca

Si el servidor responde **200** pero la página está **blanca para todos**:

1. **Hipótesis principal:** build sin restart (asset mismatch)
2. Comparar timestamps:
   ```bash
   stat -c '%y' /home/admonctrlxm/portal-direccion-mme/.next/BUILD_ID
   pm2 show portal-mme | grep "created at"
   ```
   Si BUILD_ID es **más nuevo** que `created at` de PM2 → mismatch confirmado.
3. **Fix:** `./scripts/deploy.sh`
4. **No culpar al navegador del usuario** si afecta a todos.

## Regla #5 — Lo que NO previene el cron simple

Un cron `curl /api/health || pm2 restart` **NO detecta** asset mismatch (health sigue en 200).
Para mismatch, la prevención es **Regla #1**: nunca build sin restart.

## Regla #6 — Comunicación al usuario

Si el agente ejecutó `npm run build` por error sin restart:

1. Informar el riesgo inmediatamente
2. Ejecutar `./scripts/deploy.sh` de inmediato
3. No marcar la tarea como completada hasta verificar health + chunk 200

## Referencias

- Script: `scripts/deploy.sh`
- Prevención: `scripts/PREVENTION_PLAN.md`
- Errores: `.knowledge/errors.md` → "Asset mismatch tras build sin PM2 restart"
- PM2 app: `portal-mme` · puerto **3001** · nginx → 443
