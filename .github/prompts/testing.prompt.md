# Prompt: Crear Tests

> **Skill Pack:** Cargar Skill 15 (Testing por Riesgo) del SKILL_PACK_V5.0.md
> **Regla:** Tests obligatorios según tipo de componente

## Matriz de Cobertura

| Tipo de componente | Riesgo | Tests obligatorios |
|---|---|---|
| API Route con SQL directo | Alto | +1 test de inyección SQL |
| Componente con Nivo | Medio | +1 test de snapshot visual |
| Servicio con cálculo regulatorio | Crítico | +1 test con valores CREG |
| ETL en Celery Beat | Crítico | +1 test idempotencia + 1 rollback |
| Formateador (lib/) | Bajo | 0 obligatorios |

## Configuración Actual

```bash
# Verificar si hay framework de testing
ls vitest.config.ts 2>/dev/null && echo "Vitest configurado" || echo "Sin framework"
ls jest.config.* 2>/dev/null && echo "Jest configurado" || echo "Sin Jest"
```

## Comandos

```bash
# TypeScript check
npx tsc --noEmit

# Si hay Vitest
npx vitest run

# Si hay Jest
npx jest --passWithNoTests
```

## Valores de Referencia Regulatorios

Ubicación: `.knowledge/regulatory-fixtures/`
Si un cálculo regulatorio cambia sin que cambie el input → REGRESIÓN CRÍTICA.
