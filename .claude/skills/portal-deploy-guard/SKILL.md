---
name: portal-deploy-guard
description: "Reglas obligatorias de deploy y producción del Portal Dirección MME. Previene pantalla blanca por build sin PM2 restart. Activar SIEMPRE antes de npm run build, pm2 restart, deploy, hotfix, incidente portal caído, pantalla blanca, chunks rotos, asset mismatch, o cualquier cambio que toque .next/ o producción."
---

# Portal Deploy Guard — Reglas Obligatorias

> **Incidente #1:** 2026-06-02 — Pantalla blanca para TODOS los usuarios.
> **Incidente #2:** 2026-09-30 — **La misma causa, otra vez.** Build a las 22:28 sobre un
> proceso arrancado a la 01:47. Estuvo en blanco **6 días** sin que ninguna alerta saltara.
> **Causa (ambos):** `npm run build` sin `pm2 restart portal-mme`. Ver `.knowledge/errors.md`.
>
> **Lección del incidente #2:** esta regla ya estaba escrita aquí desde junio y aun así se
> repitió. Escribir la regla no basta — desde 2026-10-06 está **forzada técnicamente**
> (hook `postbuild`) y **vigilada** (cron cada 5 min). Ver "Protecciones automáticas".

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

### Protecciones automáticas (desde 2026-10-06)

Tres capas, por si alguien se salta la regla:

| Capa | Qué hace | Archivo |
|---|---|---|
| **1. Hook `postbuild`** | `npm run build` reinicia PM2 **solo**. Ya no es posible dejar un build huérfano. | `scripts/postbuild-restart.sh` |
| **2. Cron cada 5 min** | Verifica los `/_next/static` reales, auto-repara y deja log. Antes el portal no tenía monitoreo. | `server/scripts/monitor_portal.sh` |
| **3. Gate en deploy** | `deploy.sh` revierte al build anterior si los recursos quedan rotos, en vez de reportar éxito. | `scripts/deploy.sh` (paso 7b) |
| **4. Swap atómico** | `deploy.sh` compila en `.next.staging` y sólo intercambia al final: **el portal sigue en línea durante toda la compilación**, y un build fallido no lo toca. | `scripts/deploy.sh` (pasos 2–4) |

Verificación manual en cualquier momento: `npm run verify:assets`

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

Confirmar que **todos** los recursos referenciados existen (no basta con uno:
en el incidente #2, 17 de 19 chunks respondían 200 y aun así la página salía en blanco):

```bash
npm run verify:assets                                      # local (127.0.0.1:3001)
bash scripts/check-assets.sh https://portalviceministerioenergia.minenergia.gov.co /   # público
# Debe decir: OK N/N recursos
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

## Regla #5 — Por qué un health check normal NO sirve

Un cron `curl /api/health || pm2 restart` **NO detecta** asset mismatch: la portada y las APIs
siguen en 200. Eso es exactamente lo que dejó el incidente #2 invisible 6 días —
`monitor_api.sh` sólo vigilaba el backend (puerto 8000), no el portal.

La detección válida es **probar cada recurso `/_next/static`**, que es lo que hacen
`scripts/check-assets.sh` y el cron `monitor_portal.sh`. No sustituir por un check de portada.

## Regla #5b — Nunca compilar sobre el build vivo

`next build` escribe en `distDir` **en sitio**. Compilar sobre `.next` mientras el proceso
corre deja el portal en blanco durante toda la compilación.

`deploy.sh` ya lo resuelve: compila en `.next.staging` (vía `NEXT_DIST_DIR`) y hace
`mv` al final. Al tocar el script, respetar dos cosas:

1. `NEXT_DIST_DIR` y `DEPLOY_IN_PROGRESS` van **acotadas al comando**, nunca con `export`.
   Si se filtran a PM2 vía `--update-env`, `next start` buscaría `.next.staging` —
   que ya no existe tras el swap — y el portal no levanta.
2. El swap son dos `mv` en el mismo filesystem. No sustituir por `cp`/`rsync`: deja de ser atómico.

## Regla #6 — Comunicación al usuario

Si el agente ejecutó `npm run build` por error sin restart:

1. Informar el riesgo inmediatamente
2. Ejecutar `./scripts/deploy.sh` de inmediato
3. No marcar la tarea como completada hasta verificar health + chunk 200

## Referencias

- Script de deploy: `scripts/deploy.sh`
- Verificador de recursos: `scripts/check-assets.sh` (`npm run verify:assets`)
- Hook automático: `scripts/postbuild-restart.sh`
- Monitoreo: `server/scripts/monitor_portal.sh` → `server/logs/monitor_portal.log`
- Prevención: `scripts/PREVENTION_PLAN.md`
- Errores: `.knowledge/errors.md` → "Asset mismatch tras build sin PM2 restart"
- PM2 app: `portal-mme` · puerto **3001** · nginx → 443
