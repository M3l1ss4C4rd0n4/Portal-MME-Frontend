# Prompt: Crear Nuevo Endpoint API

> **Skill Pack:** Cargar Skill 0 (CDA) + Skill 14 (Dominio Energético) del SKILL_PACK_V5.0.md
> **Patrón:** BFF (Backend for Frontend) — decidir si `backendGet()` o `getPool()`

## Decisión de Patrón

| Caso | Usar | Ejemplo |
|---|---|---|
| Datos vienen del backend FastAPI | `backendGet()` | `/api/sector`, `/api/fenoge` |
| Datos solo en PostgreSQL local | `getPool()` | `/api/subsidios`, `/api/comunidades` |
| Necesitas JOIN con tablas locales | `getPool()` | `/api/validaciones` |

## Estructura del Endpoint

```typescript
// app/api/[endpoint]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT * FROM tabla");

    return NextResponse.json({
      data: result.rows,
      status: "success"
    });
  } catch (error) {
    console.error("[API /endpoint] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

## Checklist

- [ ] Decidir patrón: `backendGet()` vs `getPool()`
- [ ] Manejo de errores con try-catch
- [ ] Retornar JSON válido siempre
- [ ] `npm run build` pasa
- [ ] `curl http://localhost:3000/api/[endpoint]/` retorna 200
- [ ] Verificar que no rompe endpoints existentes

## Endpoints Existentes (14)

Ver tabla completa en `.github/copilot-instructions.md` sección "Patrón BFF Detectado".
NO crear endpoints duplicados.
