# Seguridad: pendientes conocidos del Portal Dirección de Energía

Última revisión: 25 de noviembre de 2026 (revisión de código del portal y de la app Android; sin pruebas
dinámicas ni escaneo con HawkScan).

**Chequeo rápido de dependencias:** `npm run audit:seguridad`. Falla (código 1) si aparece un aviso que
no esté en la lista de excepciones de `scripts/auditoria-seguridad.mjs`. Correrlo antes de cada despliegue
importante y cada vez que se actualice Next.js.

## Cerrado el 25 de noviembre de 2026
- Next.js 16.2.1 → 16.2.12 (cierra todos los avisos con corrección disponible en esa línea).
- Dependencias internas con aviso fijadas con `overrides` en `package.json` (lodash, postcss, nanoid, etc.).
- `dotenv-vault` movido a dependencias de desarrollo (es una herramienta de línea de comandos; arrastraba axios).
- Las rutas de la API ya no devuelven al navegador el texto de error interno (asistente, retroalimentación,
  token de voz, noticias). El detalle queda en el registro del servidor.
- Cabecera `X-Powered-By` eliminada.
- App Android: `allowBackup=false` y proveedor de archivos limitado a la caché de la app.

## Abierto

| # | Pendiente | Gravedad | Quién | Cómo se cierra |
|---|---|---|---|---|
| 1 | **El límite de uso por IP es compartido.** Nginx ve a todos los usuarios como `172.17.0.70` (el WAF o proxy). El asistente permite 15 consultas por minuto y la voz 10 en total, no por persona. | Alta | TIC + quien administre nginx (requiere `sudo`) | Configurar el WAF para enviar la IP real y nginx con `set_real_ip_from 172.17.0.70;` y `real_ip_header X-Forwarded-For;`. Después reenviar esa IP desde el portal al backend. No reenviar `X-Forwarded-For` sin que nginx lo haya saneado: se podría falsificar y se perdería el tope de gasto. |
| 2 | **Next.js: avisos sin versión corregida** (ejecución remota en optimización de imágenes, `use cache`, `next/og`, servidores Windows). | Media (no aplican: el portal no usa esas funciones) | Equipo del portal | Volver a correr `npm view next version` y `npm run audit:seguridad`; actualizar con versión exacta y probar. No activar `use cache`, `next/og` ni la optimización de imágenes mientras tanto. |
| 3 | **Respuestas públicas sin HSTS ni CSP forzada**; la CSP de nginx es solo informativa y permite `unsafe-inline` y `unsafe-eval`. `X-Frame-Options` sale duplicado (Next y nginx). | Media | TIC / administrador de nginx | En nginx, declarar las cabeceras en cada `location` (un `add_header` dentro de una `location` anula los del bloque `server`), activar la CSP tras revisar los informes y dejar un solo `X-Frame-Options`. |
| 4 | **`/api/asistente` y `/api/voz/token` no piden inicio de sesión.** Cualquiera que llegue al dominio puede usarlos. | Media | Dirección / TIC | Decidir si el portal será público o detrás de autenticación. Hoy lo contienen el límite de uso y el WAF. |
| 5 | **`xlsx` y `sharp` con avisos sin corrección.** | Baja | Equipo del portal | `xlsx` solo lee un Excel interno fijo; `sharp` solo lo usa Next para imágenes (desactivadas). Reemplazar `xlsx` si se llega a procesar archivos de usuarios. |
| 6 | **Llave vieja de la primera EnergIA escrita en el código** (`EnergIA-Mobile-App/src/config.ts`), sin rotar. | Media | Melissa | Rotar la llave en el backend y quitarla del repositorio. |
| 7 | **Escaneo dinámico (HawkScan) pendiente.** Requiere cuenta de StackHawk, la herramienta `hawk` y un entorno aislado (el portal en producción dispara correos y mensajes de Telegram). | Media | Melissa / TIC | Crear la cuenta, guardar `HAWK_API_KEY` en el servidor, instalar `hawk` y escanear una copia aislada. |
| 8 | **App Android de entrega:** hoy está firmada con la llave de depuración, sin ofuscar y sin fijación de certificado. | Baja (demo) | Equipo del portal | Llave propia de publicación (fuera del repositorio), `minifyEnabled true` y, si TIC lo pide, fijación de certificado. |
| 9 | **App iPhone** (diciembre de 2026): requiere revisión de seguridad propia. | — | Equipo del portal | Repetir esta revisión sobre el proyecto iOS antes de publicarlo. |
