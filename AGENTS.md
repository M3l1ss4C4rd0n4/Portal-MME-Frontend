# AGENTS.md - Portal Dirección MME

## Guía para Agentes de Desarrollo

Este documento proporciona información crítica para agentes de IA y desarrolladores que trabajen en el Portal de Dirección MME.

> **⚠️ PUNTO DE ENTRADA UNIFICADO:** Todos los agentes deben leer primero `.github/copilot-instructions.md` — contiene las reglas críticas, el catálogo de skills, y la lógica de carga selectiva del SKILL_PACK. Este archivo AGENTS.md complementa con detalles específicos del proyecto.

---

## 🚨 REGLAS CRÍTICAS

### 1. NUNCA modificar código funcional sin:
- Backup verificable
- Confirmación explícita del usuario
- Tests de regresión pasando

### 2. SIEMPRE verificar antes de eliminar:
```bash
grep -r "NombreComponente" src/ --include="*.tsx" --include="*.ts"
```

### 3. NUNCA asumir que "esto no se usa"

### 4. SIEMPRE ejecutar build antes de commit (solo en desarrollo):
```bash
npm run build   # validación local pre-commit
```
En el servidor de producción usar `./scripts/deploy.sh` — nunca `npm run build` aislado (ver **portal-deploy-guard**).

---

## 📁 Estructura del Proyecto

### Convenciones de Carpetas

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboards)/         # Route Group (no afecta URL)
│   │   ├── [dashboard]/
│   │   │   ├── page.tsx      # Página principal
│   │   │   └── loading.tsx   # UI de carga
│   │   └── layout.tsx        # Layout compartido
│   ├── api/                  # API Routes
│   │   └── [endpoint]/
│   │       └── route.ts      # Handler API
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home
│
├── components/
│   ├── ui/                   # Componentes base (shadcn/ui style)
│   │   └── Componente.tsx
│   ├── charts/               # Wrappers de Nivo
│   └── dashboard/            # Componentes específicos dashboard
│
├── lib/                      # Utilidades
│   ├── db.ts                 # Pool PostgreSQL
│   └── nivo-theme.ts         # Tema compartido gráficas
│
└── hooks/                    # Custom React hooks: useAsistenteChat, useAsistenteVoz, useDiagnosticosIA, useHomeSlider (corregido 2026-09-30, no está vacío)

### Nota de Arquitectura (Grafo 2026-05-01)

- `src/components/HomeSlider.tsx` es un **god component** (2.730 líneas, 2026-08-25). No añadir más lógica a este archivo. Extraer nuevas funciones a `src/lib/` o `src/services/`.
- `src/components/dashboard/` **NO está vacío** (corregido 2026-09-30): tiene `Card.tsx` y `KpiChip.tsx`, con 15+ importadores reales en distintos dashboards — verificar con grep antes de asumir que algo ahí no se usa. Si creas componentes de dashboard, colócalos ahí en lugar de la raíz de `src/components/`.
- Los API routes no comparten una capa de servicios común. Cada `route.ts` repite `backendGet()` o `getPool()`. Si creas un nuevo endpoint, evalúa si merece una abstracción en `src/services/apiService.ts`.
```

### Reglas de Nombres

- **Componentes:** PascalCase (`KPICard.tsx`)
- **Hooks:** camelCase con prefix `use` (`useTheme.ts`)
- **Utilidades:** camelCase (`formatNumber.ts`)
- **API Routes:** kebab-case (`route.ts`)

---

## 🎨 Estilos y Temas

### Tailwind CSS v4

El proyecto usa Tailwind CSS v4 con CSS-first configuration.

```css
/* En archivo CSS, NO tailwind.config.js */
@theme {
  --color-primary: #1a1a1a;
  --color-gold: #c9a227;
}
```

### Variables de Tema

```css
/* Modo oscuro por defecto */
:root {
  --bg-primary: #060B14;
  --bg-secondary: #0F172A;
  --text-primary: #EEF2F9;
  --text-secondary: #94A3B8;
  --accent-gold: #F59E0B;
}

/* Modo claro */
.light {
  --bg-primary: #EEF2F9;
  --bg-secondary: #FFFFFF;
  --text-primary: #0F172A;
  --text-secondary: #475569;
}
```

### Uso en Componentes

```tsx
// ❌ No usar clases arbitrarias sin documentar
<div className="bg-[#123456]">

// ✅ Usar variables de tema
<div className="bg-theme-primary">

// ✅ Usar colores semánticos
<div className="bg-dash-chip border-amber-500/40">
```

---

## 📊 Gráficas (Nivo)

### Tema Compartido

SIEMPRE usar `getNivoTheme()` en lugar de definir temas inline:

```tsx
// ❌ INCORRECTO
const theme = {
  axis: { ticks: { text: { fill: '#fff' } } }
}

// ✅ CORRECTO
import { getNivoTheme } from "@/lib/nivo-theme";
const theme = getNivoTheme();
```

### IDs Únicos para SVG

Para evitar colisiones de gradientes:

```tsx
import { useId } from "react";

function SemiGauge({ color }: { color: string }) {
  const uniqueId = useId();
  
  return (
    <svg>
      <defs>
        <linearGradient id={`gradient-${color}-${uniqueId}`}>
          {/* ... */}
        </linearGradient>
      </defs>
    </svg>
  );
}
```

---

## 🗄️ Base de Datos

### Pool PostgreSQL

```typescript
// lib/db.ts
import { getPool } from "@/lib/db";

// ✅ USAR (conexión reutilizable)
const pool = getPool();
const result = await pool.query("SELECT * FROM tabla");

// ❌ NO USAR (nueva conexión cada vez)
import { Pool } from "pg";
const pool = new Pool({...}); // NO hacer esto
```

### Variables de Entorno

```bash
# .env.local (REQUERIDO)
PGHOST=localhost
PGPORT=5432
PGDATABASE=portal_energetico
PGUSER=mme_user
PGPASSWORD=<password>

# Opcional
NEXT_PUBLIC_SITE_URL=https://portaldireccionee.minenergia.gov.co
```

---

## 🔌 API Routes

### Estructura Correcta

```typescript
// app/api/ejemplo/route.ts
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
    console.error("[API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

### Manejo de Errores

SIEMPRE envolver en try-catch y retornar JSON válido:

```typescript
try {
  // ... operación
} catch (error) {
  console.error("[API /endpoint] Error:", error);
  return NextResponse.json(
    { error: "Mensaje descriptivo" },
    { status: 500 }
  );
}
```

---

## 🧪 Testing

### Build Obligatorio

```bash
# ANTES de cualquier commit
npm run build

# Debe pasar sin errores
```

### Errores Comunes

#### Error: "Cannot find module"
```bash
# Solución
npm install
```

#### Error: "Type error in node_modules"
```bash
# Solución - Limpiar caché
rm -rf .next/
rm -rf node_modules/.cache/
npm run build
```

#### Error: "Module not found: Can't resolve '@/...'"
```bash
# Verificar tsconfig.json
# Debe tener:
"paths": {
  "@/*": ["./src/*"]
}
```

---

## 📦 Dependencias

### Agregar nuevas dependencias

```bash
# SIEMPRE usar --save-exact para versiones exactas
npm install --save-exact nombre-paquete@version

# Ejemplo
npm install --save-exact @nivo/bar@0.88.0
```

### Dependencias críticas (NO actualizar sin pruebas)

- `next`: Framework core
- `react`: React core
- `tailwindcss`: Estilos
- `@nivo/*`: Gráficas
- `pg`: PostgreSQL

---

## 🚀 Despliegue

### PM2

```bash
# Ver estado
pm2 status

# Restart con nuevas env vars
pm2 restart portal-mme --update-env

# Ver logs
pm2 logs portal-mme --lines 100
```

### Build de Producción

**Un solo comando. No desglosar en pasos manuales:**

```bash
cd /home/admonctrlxm/portal-direccion-mme
./scripts/deploy.sh      # backup + build + restart + verificación de APIs y recursos
```

`deploy.sh` compila en `.next.staging` y hace swap atómico al final, así que **el portal
sigue en línea durante toda la compilación** y un build fallido no lo toca. Además hace
backup con rollback, reinicia PM2 y revierte si los recursos estáticos quedan rotos.
Verificación suelta en cualquier momento: `npm run verify:assets`.

> **No ejecutar `rm -rf .next/ && npm run build` a mano en producción.** Sobrescribe el
> build bajo el proceso vivo y deja la página en blanco (incidentes 2026-06-02 y 2026-09-30).
> Desde 2026-10-06 el hook `postbuild` reinicia PM2 automáticamente como red de seguridad,
> pero el camino correcto sigue siendo `./scripts/deploy.sh`.
>
> El portal corre en el **puerto 3001**, no 3000.

---

## 🔒 Seguridad

### Variables de Entorno Sensibles

```bash
# ✅ CORRECTO - Usar en Server Components o API Routes
const password = process.env.PGPASSWORD;

// ❌ INCORRECTO - Nunca usar NEXT_PUBLIC_ para secrets
const password = process.env.NEXT_PUBLIC_PASSWORD; // ¡PELIGRO!
```

### Headers de Seguridad (next.config.ts)

```typescript
// Configuración actual
headers: async () => [
  {
    source: "/:path*",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
];
```

---

## 🐛 Debugging

### Logs del Servidor

```bash
# PM2
pm2 logs portal-mme

# Sistema
journalctl -u portal-mme --no-pager -n 50
```

### Logs del Build

```bash
# Build con verbose
npm run build --verbose

# O ver .next/trace
```

---

## 📚 Recursos

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Nivo Charts](https://nivo.rocks/)
- [React 19](https://react.dev/)

---

## ⚠️ Deuda Técnica Conocida

- Tableros de Hidrocarburos (combustibles, gas, transporte, energías alternativas) pendientes de datos reales - a la espera de que el equipo de hidrocarburos comparta los archivos fuente completos
- Cobertura de tests: suite Vitest en `src/lib/` (formato, kpi-logic, svg-math); pendiente ampliar a componentes

---

## 📞 Contacto

- **Desarrollador Principal:** [Tu nombre/email]
- **Repositorio:** [URL]

---

*Documento actualizado: 31 de marzo de 2026*

---

## 📚 Skill Pack para Agentes

### Entrada Unificada
**Todos los agentes deben leer:** `.github/copilot-instructions.md` — Contiene las reglas críticas, el catálogo de skills disponibles, y la lógica de carga selectiva del SKILL_PACK.

### Skill Detallado (bajo demanda — NUNCA cargar completo)
`SKILL_PACK_V5.0.md` (~2,600 líneas) — Framework "Field Medic" con:
- META-SKILL 0: Ciclo de Diagnóstico del Agente (CDA) — 7 fases con timeouts
- META-SKILL -1: Triage y Priorización (Score = Impacto × Urgencia / Esfuerzo)
- META-SKILL -2: Optimización de Contexto (50K tokens max)
- Skill 1-17: Investigación, Refactorización, Estimación, Comunicación, Incertidumbre, Meta-Habilidades, Checklist, Reglas Absolutas, Data Verification, Comandos, Higiene Documental, Rollback, Retroalimentación, Dominio Energético, Testing, CI/CD, Emergencias

**Carga selectiva obligatoria** (ver tabla en `.github/copilot-instructions.md`):

| Tarea | Skills a cargar |
|---|---|
| Emergencia (portal caído / pantalla blanca) | **portal-deploy-guard** + Skill 17 |
| Build, deploy, PM2, hotfix producción | **portal-deploy-guard** (obligatorio) |
| Refactorización | Skill 1.3 (Ciclos) + Skill 2 |
| Toca datos DB | Skill 9 (Método A/B/C/D) |
| Investigación | Skill 1 |
| Múltiples tareas | META-SKILL -1 (Triage) |
| Crear tests | Skill 15 |
| Conflicto entre skills | META-SKILL -2 |

### Skills Obligatorios del Proyecto (`.claude/skills/`)

| Skill | Cuándo cargar |
|---|---|
| **portal-deploy-guard** | Cualquier build, deploy, restart, incidente de portal, pantalla blanca |
| **ui-ux-pro-max** | Componentes visuales, dashboards, UI/UX |

**Comando slash:** `/deploy` → `.cursor/commands/deploy.md` · `.claude/commands/deploy.md` · `.github/prompts/deploy.prompt.md`

### Skills de Producción (`/skills/`)
48 skills disponibles en el directorio `/skills/` del proyecto. Cada uno tiene su propio `SKILL.md`.
Usar para: búsqueda web, generación de imágenes/video/audio, documentos (xlsx/pdf/docx/ppt), gráficas, finanzas, contenido, investigación.

**Ver catálogo completo en:** `.github/copilot-instructions.md` sección "📦 Skills Disponibles"

### Scripts Ejecutables
`scripts/agent-tools/` (en repo server):
- `verify_table.py` — Snapshot de tabla PostgreSQL (métodos A-D)
- `check_cycles.py` — Detección de ciclos estáticos y lógicos

### Conocimiento del Grafo (Graphify 2026-08-24)
- 529 nodos · 485 aristas · 25 comunidades, 190 archivos (solo frontend; ver `graphify-out/merged-full-graph.json` para el grafo unificado con el backend)
- BFF pattern: mezcla `backendGet()` + `getPool()` sin patrón unificado — sigue siendo deuda técnica documentada
- Frontend: ✅ ZERO ciclos | Backend: ⚠️ Ciclos lógicos en `container.py`
