# Catálogo de Fuentes de Datos con SLA

> **Ubicación:** `/home/admonctrlxm/portal-direccion-mme/.knowledge/data-sources.md`
> **Actualizar cuando:** Se agregue una nueva fuente de datos o cambie un SLA

| Fuente | SLA | Frecuencia real | Fallback | Owner | Riesgo si falla |
|---|---|---|---|---|---|
| XM API (pydataxm) | 99% | Cada 6h (Celery Beat) | Cache Redis 24h | Equipo XM | Alto — datos de mercado desactualizados |
| IDEAM (hidrología) | 95% | Diaria | NASA POWER API | IDEAM | Medio — embalses sin datos recientes |
| OneDrive (Excel) | 90% | Manual (on-demand) | Último archivo cargado | MME | Medio — presupuesto/contratos sin actualizar |
| PostgreSQL (portal_energetico) | 99.9% | Tiempo real | Dashboard offline | DBA | Crítico — todo el portal sin datos |
| Redis (cache) | 99.5% | Tiempo real | Consulta directa a PostgreSQL | Infra | Bajo — degradación de performance |
| NASA POWER (clima) | 95% | On-demand (ML features) | Último dataset descargado | NASA | Bajo — features ML con datos viejos |
| Backend FastAPI | 99.5% | Tiempo real | — | Dev Backend | Alto — BFF del portal sin respuesta |

## Protocolo de Fallback por Fuente

### XM API caída
1. Verificar `pydataxm` status: `curl -I https://www.simem.co`
2. Usar cache Redis si existe: `redis-cli GET xm_metric_[tipo]`
3. Si no hay cache → usar último dato en PostgreSQL con `quality='LOW'`
4. Registrar en `.knowledge/errors.md`

### PostgreSQL no responde
1. `pg_isready -h localhost -p 5432`
2. `systemctl status postgresql`
3. Si PostgreSQL está caído → ESCALAR (SEV-1)
4. NUNCA reiniciar PostgreSQL sin aprobación humana

## Notas
- SLA = Service Level Agreement objetivo
- Frecuencia real = Cuándo se actualiza en la práctica
- Fallback = Qué hacer cuando la fuente primaria falla
