# Plan de Prevención — Portal Dirección MME
> Documento generado tras incidente 2026-05-16: `/pagos/` caído por error SQL + build desactualizado

---

## 🔴 Qué falló (causa raíz)

| # | Problema | Impacto |
|---|---|---|
| 1 | **`pagos-detalle` usaba interpolación de strings SQL** (`ANY(NULL::text[])`). PostgreSQL arrojaba `42P18: could not determine data type of parameter $1`. | API 500 → dashboard sin datos |
| 2 | **Build desplegado era viejo** (14 May) vs código actual. Next.js generó *Server Action mismatch*. | Pantalla negra "This page couldn't load" |
| 3 | **PM2 sin variables de entorno** (`PGPASSWORD` faltante). Pool PostgreSQL usaba credenciales por defecto. | Timeouts de BD intermitentes |
| 4 | **Sin error boundaries ni health checks**. No había forma de detectar el fallo antes del usuario. | Cascada de errores sin graceful degradation |
| 5 | **nginx cachea chunks 1 año**. Riesgo de mismatch HTML↔chunks tras rebuild parcial. | Posible carga de assets obsoletos |

---

## ✅ Qué se implementó hoy

### 1. Fix del API `pagos-detalle`
- **Archivo:** `src/app/api/subsidios/pagos-detalle/route.ts`
- **Cambio:** Reemplazó interpolación SQL por **parámetros posicionales reales del driver `pg`** (`$1::text[]`, `$2::int[]`, etc.).
- **Build:** verificado — pasa limpio.

### 2. Health Check (`/api/health`)
- **Archivo:** `src/app/api/health/route.ts`
- **Verifica:** PostgreSQL, backend FastAPI, variables de entorno críticas.
- **Uso:** `curl http://localhost:3001/api/health`
- **Monitoreo:** integrar en uptime-checker (ping cada 60s). Si retorna 503, alertar.

### 3. Error Boundary en dashboards
- **Archivo:** `src/app/(dashboards)/error.tsx`
- **Efecto:** Si cualquier dashboard crashea, el usuario ve "Reintentar / Ir al inicio" en lugar de la pantalla negra de Next.js.

### 4. Script de deploy seguro
- **Archivo:** `scripts/deploy.sh`
- **Pasos automatizados:**
  1. Valida variables de entorno antes de tocar nada
  2. Backup de `.next` anterior
  3. `npm run build`
  4. `pm2 restart` con `--update-env`
  5. Espera activa a que `/api/health` responda 200
  6. Smoke-test de 9 APIs críticas
  7. Limpia backups antiguos (mantiene últimos 5)

---

## 📋 Checklist obligatorio para cada deploy

```bash
# 1. Verificar que .env.local esté actualizado y completo
cat .env.local | grep -E "PG|BACKEND"

# 2. Ejecutar deploy seguro (NO hacer manualmente)
./scripts/deploy.sh

# 3. Verificar health check
curl -s http://localhost:3001/api/health | jq .

# 4. Verificar que /pagos/ cargue datos
curl -s http://localhost:3001/api/subsidios/pagos-detalle/ | head -c 100

# 5. Limpiar caché de nginx si se detectan assets rotos
sudo nginx -s reload
```

---

## 🛡️ Medidas adicionales recomendadas

### A. Variables de entorno en PM2
Asegurarse de que PM2 cargue `.env.local`. Opciones:
- Usar `pm2 restart portal-mme --update-env` (ya está en el script)
- O crear `ecosystem.config.js` con `env:` explícito
- **Nunca** hacer `pm2 start` sin verificar que `PGPASSWORD` esté presente

### B. Monitoreo proactivo
```bash
# Health check cada 5 minutos (crontab)
*/5 * * * * curl -sf http://localhost:3001/api/health || pm2 restart portal-mme
```

### C. Reducir caché de nginx tras deploy
El nginx actual cachea `/_next/static/` 1 año. Tras cada deploy, si hay un proxy CDN externo, invalidar caché o usar **cache-busting por hash** (Next.js ya lo hace). Si el problema de "página negra" vuelve tras deploy, ejecutar:
```bash
sudo nginx -s reload
# Y si hay CloudFront/CloudFlare, invalidar /*
```

### D. No usar `rm -rf .next && npm run build` a mano
Siempre usar `./scripts/deploy.sh`. Si el build falla, el script restaura el backup automáticamente.

### E. Revisar otros endpoints
Se auditó todo `src/app/api/**` — **no hay más interpolación SQL**. El patrón `sqlVal` solo existía en `pagos-detalle`. Si se crean nuevos endpoints con arrays dinámicos, **usar siempre parámetros posicionales `$N::type[]`**.

---

## 🚨 Qué hacer si vuelve a caer

1. **No reiniciar ciegamente.** Primero leer logs: `pm2 logs portal-mme --lines 50`
2. **Verificar health:** `curl http://localhost:3001/api/health`
3. **Si es 503 en DB:** revisar `.env.local` y `PGPASSWORD`
4. **Si es "Server Action mismatch":**
   - Confirmar que no haya múltiple builds corriendo (`ps aux | grep next-server`)
   - Hacer deploy limpio con `./scripts/deploy.sh`
   - Invalidar caché CDN/nginx
5. **Si persiste:** el `error.tsx` capturará el error y mostrará "Reintentar" en lugar de pantalla negra.

---

## 📁 Archivos modificados/creados en este incidente

| Archivo | Acción |
|---|---|
| `src/app/api/subsidios/pagos-detalle/route.ts` | Refactor: parámetros posicionales pg |
| `src/app/api/health/route.ts` | Nuevo: health check |
| `src/app/(dashboards)/error.tsx` | Nuevo: error boundary |
| `scripts/deploy.sh` | Nuevo: deploy seguro |
| `scripts/PREVENTION_PLAN.md` | Nuevo: este documento |

---

*Generado: 2026-05-16*
