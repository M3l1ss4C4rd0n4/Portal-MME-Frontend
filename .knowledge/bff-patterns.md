# BFF Patterns — API Routes en Portal Dirección MME

**Propósito:** Documentar cómo escribir endpoints en `src/app/api/*/route.ts` correctamente. Evitar anti-patrones.

**Última actualización:** 2026-05-02

---

## Contexto: Dos Opciones de Fuente de Datos

El BFF del portal puede consultar datos de dos lugares:

| Fuente | Dónde vive | Usar cuando |
|---|---|---|
| Backend FastAPI | `server:8000` (`/v1/...`) | Dato vive en FastAPI (servicios, cálculos, datos XM, ML) |
| PostgreSQL directo | `port 5432` | Tabla simple, query rápida (<100ms), sin lógica |

**REGLA:** Si no estás 100% seguro, usa **backendGet()** (FastAPI). Es más seguro.

---

## Patrón 1: Consultar al Backend FastAPI (PREFERIDO)

### Cuándo usar
- El endpoint ya existe en `/v1/...` (FastAPI)
- Requiere cálculos regulatorios (pérdidas NT, CU, etc.)
- Datos vienen de servicios (GenerationService, CommercialService, etc.)
- Datos externos (XM, IDEAM, NASA)

### Ejemplo correcto

```typescript
// ✅ CORRECTO: api/sector/route.ts
import { backendGet } from '@/lib/backendClient';

export async function GET(request: Request) {
  try {
    const data = await backendGet('/v1/sector/metrics', {
      cache: 3600,           // cache 1 hora
      timeout: 5000          // timeout 5 segundos
    });
    return Response.json(data);
  } catch (error) {
    // Fallback: retornar error controlado (no expongas errores internos)
    return Response.json(
      { error: 'Backend unavailable', fallback: true },
      { status: 503 }
    );
  }
}
```

### Flujo
```
cliente
  ↓
GET /api/sector
  ↓
backendGet('/v1/sector/metrics')
  ↓
FastAPI server:8000/v1/sector/metrics
  ↓
[servicios + bases de datos]
  ↓
retorna JSON
  ↓
cliente
```

---

## Patrón 2: Consultar PostgreSQL Directo (SOLO para Datos Simples)

### Cuándo usar
- Query es trivial: SELECT sin JOIN complejo
- Tabla es pequeña (<1GB)
- No requiere cálculos de negocio
- Resultado es lista simple

### Cuándo NO usar
- ❌ Query con JOIN > 3 tablas
- ❌ Tabla > 1GB (usar Método C/D de Skill 9)
- ❌ Requiere transformaciones complejas
- ❌ Requiere validación de negocio

### Ejemplo correcto

```typescript
// ✅ CORRECTO: api/subsidios/validaciones/route.ts
import { getPool } from '@/lib/db';

export async function GET(request: Request) {
  const pool = getPool();
  try {
    // Query SIMPLE: sin lógica, sin transformación
    const result = await pool.query(
      'SELECT id, monto, estado FROM subsidios_validaciones WHERE estado = $1 LIMIT 100',
      ['pendiente']
    );
    return Response.json(result.rows);
  } catch (error) {
    return Response.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }
}
```

### Flujo
```
cliente
  ↓
GET /api/subsidios/validaciones
  ↓
getPool().query('SELECT ...')
  ↓
PostgreSQL
  ↓
retorna rows
  ↓
Response.json(rows)
  ↓
cliente
```

---

## Anti-Patrón 1: Lógica de Negocio en route.ts

```typescript
// ❌ INCORRECTO: No hacer esto
export async function GET(request: Request) {
  const pool = getPool();
  
  // 50+ líneas de lógica de negocio aquí
  const subsidios = await pool.query('SELECT * FROM subsidios_pagos');
  const validaciones = await pool.query('SELECT * FROM subsidios_validaciones');
  
  // Cálculos regulatorios embebidos
  const resultado = subsidios.rows.map(s => {
    return {
      monto: s.monto * 1.05,
      interes: s.monto * 0.03,
      neto: s.monto * 1.08,
    };
  });
  
  return Response.json(resultado);
}
```

**Problema:** La lógica debería vivir en un servicio de backend (FastAPI), no en el BFF.

**Solución:** Crear endpoint en FastAPI que encapsule la lógica, luego llamar desde el BFF con `backendGet()`.

---

## Anti-Patrón 2: SQL Dinámico sin Validación

```typescript
// ❌ INCORRECTO: SQL injection risk
const tabla = request.headers.get('table') || 'metrics';
const query = `SELECT * FROM ${tabla}`; // ¡INSEGURO!
```

**Problema:** SQL injection. Alguien podría pasar `tabla = "metrics; DROP TABLE metrics;"`

**Solución:** Validar entrada ANTES de construir SQL.

```typescript
// ✅ CORRECTO: Validar entrada
const tablaWhitelist = ['metrics', 'subsidios_validaciones', 'cu_daily'];
const tabla = request.headers.get('table') || 'metrics';

if (!tablaWhitelist.includes(tabla)) {
  return Response.json({ error: 'Invalid table' }, { status: 400 });
}

const query = `SELECT * FROM ${tabla}`;
```

---

## Anti-Patrón 3: Acceso Directo a FastAPI sin Fallback

```typescript
// ❌ INCORRECTO: Si FastAPI se cae, usuario ve error 503 crudo
const response = await fetch('http://localhost:8000/v1/sector/metrics');
const data = await response.json();
return Response.json(data);
```

**Problema:** Sin manejo de errores, sin fallback, sin timeout.

**Solución:** Usar `backendGet()` que ya tiene fallback.

```typescript
// ✅ CORRECTO: Usar backendGet con fallback
import { backendGet } from '@/lib/backendClient';

const data = await backendGet('/v1/sector/metrics', {
  timeout: 5000,
  fallback: { metrics: [] } // retorna array vacío si falla
});
return Response.json(data);
```

---

## Decisión Rápida: ¿backendGet() o getPool()?

**Matriz de decisión:**

```
Pregunta 1: ¿Ya existe un endpoint en /v1/... (FastAPI)?
  SÍ  → Usa backendGet()
  NO  → Pregunta 2

Pregunta 2: ¿El dato es tabla simple sin cálculos?
  SÍ  → Pregunta 3
  NO  → Crea endpoint en FastAPI, luego usa backendGet()

Pregunta 3: ¿Query es SELECT sin JOIN o JOIN simple?
  SÍ  → Usa getPool() (directo)
  NO  → Crea servicio en FastAPI, luego usa backendGet()

Pregunta 4: ¿Tabla es <1GB?
  SÍ  → OK usar getPool()
  NO  → Usa backendGet() a endpoint que implementa Skill 9 Método C/D
```

---

## Tabla de Endpoints Existentes (Verificados)

| Endpoint | Método | Fuente actual | Tipo |
|---|---|---|---|
| `/api/sector` | GET | backendGet → `/v1/sector/metrics` | BFF |
| `/api/subsidios` | GET | backendGet → `/v1/subsidios/...` | BFF |
| `/api/fenoge` | GET | backendGet → `/v1/fenoge/mapa` | BFF |
| `/api/cu` | GET | backendGet → `/v1/cu/current` | BFF |
| `/api/noticias` | GET | fetch() externo (RSS/OG) | BFF puro |
| `/api/subsidios/validaciones` | GET | getPool() directo | BFF directo |
| `/api/subsidios/deficit-historico` | GET | getPool() directo | BFF directo |
| `/api/subsidios/pagos-detalle` | GET | getPool() directo | BFF directo |
| `/api/cu-evolucion` | GET | getPool() → `cu_daily` | BFF directo |
| `/api/comunidades` | GET | getPool() directo | BFF directo |
| `/api/contratos-or` | GET | getPool() directo | BFF directo |
| `/api/presupuesto` | GET | getPool() directo | BFF directo |
| `/api/supervision` | GET | getPool() directo | BFF directo |
| `/api/chatbot` | POST | backendGet → `/v1/chatbot` | BFF |

**Patrón observado:** endpoints simples usan getPool(), endpoints con lógica usan backendGet().

---

## Checklist: Antes de Mergear un Nuevo Endpoint

- [ ] ¿Query es simple (<50 caracteres)? Si NO → debe estar en FastAPI
- [ ] ¿Tabla es <1GB? Si NO → verifica Skill 9 (Método C/D)
- [ ] ¿Hay validación de entrada? Whitelist de parámetros
- [ ] ¿Hay manejo de errores? try/catch + Response.json({ error: ... })
- [ ] ¿Hay timeout? (5 segundos máximo)
- [ ] ¿Hay fallback? Si falla, ¿retorna dato parcial o error controlado?
- [ ] ¿Está documentado en este archivo? Agregar a tabla "Endpoints Existentes"

---

## Ejemplo Completo: Nuevo Endpoint

### Especificación
```
GET /api/energias/por-fuente
Retorna: { generacion_hidro: MWh, generacion_termica: MWh, ... }
Frecuencia: Cada hora
Fuente: Tabla generation_by_source en PostgreSQL (< 100MB)
```

### Decisión
- ¿Tabla existe en PostgreSQL? SÍ
- ¿Endpoint existe en FastAPI? NO
- ¿Query será simple? SÍ
- ¿Tabla < 1GB? SÍ
- **USAR: getPool() directo**

### Implementación

```typescript
// ✅ CORRECTO: api/energias/por-fuente/route.ts
import { getPool } from '@/lib/db';

export async function GET() {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `SELECT 
        source_type,
        SUM(generation_mwh) as total_mwh,
        MAX(timestamp) as last_update
      FROM generation_by_source
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
      GROUP BY source_type
      ORDER BY total_mwh DESC`
    );
    
    return Response.json({
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/energias/por-fuente]', error);
    return Response.json(
      { error: 'Failed to fetch generation data' },
      { status: 500 }
    );
  }
}
```

### Verificación
- ✅ Query simple (GROUP BY, no JOIN)
- ✅ Tabla pequeña (<100MB)
- ✅ Validación implícita (hardcoded query)
- ✅ Error handling
- ✅ Timeout (implícito en pool config)

---

## Migración Futura: De getPool() a backendGet()

Si una query `getPool()` crece y necesita lógica:

**Paso 1:** Crear servicio en FastAPI
```python
# server/domain/services/generation_service.py
class GenerationService:
  def get_por_fuente(self):
    # lógica + query aquí
    return {...}
```

**Paso 2:** Crear endpoint en FastAPI
```python
# server/api/v1/routes/energias.py
@router.get("/por-fuente")
def get_por_fuente(service: GenerationService = Depends()):
  return service.get_por_fuente()
```

**Paso 3:** Cambiar BFF a backendGet()
```typescript
// src/app/api/energias/por-fuente/route.ts
import { backendGet } from '@/lib/backendClient';

export async function GET() {
  return Response.json(
    await backendGet('/v1/energias/por-fuente')
  );
}
```

---
