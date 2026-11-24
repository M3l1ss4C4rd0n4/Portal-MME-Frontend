/*
 * Service worker del Portal Dirección de Energía (PWA).
 *
 * Política deliberadamente conservadora (el portal ya quedó en blanco dos veces
 * por desajustes entre HTML y recursos tras un despliegue):
 *   - /_next/static/ (archivos con huella en el nombre, inmutables) y /icons/:
 *     caché primero.
 *   - Navegación (HTML): siempre red; solo si no hay red se muestra /offline.html.
 *     El HTML NUNCA se guarda en caché.
 *   - /api/, /v1/ y cualquier otra cosa: se deja pasar sin intervenir (datos,
 *     audio y WebSocket de voz siempre salen a la red).
 * Al cambiar VERSION se descartan las cachés anteriores.
 */
const VERSION = 'v1';
const CACHE = `mme-estaticos-${VERSION}`;
const PAGINA_SIN_CONEXION = '/offline.html';
const PRECACHE = [PAGINA_SIN_CONEXION, '/icons/icon-192.png'];
const MAX_ENTRADAS = 150;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((c) => c.startsWith('mme-') && c !== CACHE).map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function esEstatico(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

async function recortar(cache) {
  const claves = await cache.keys();
  if (claves.length <= MAX_ENTRADAS) return;
  await Promise.all(claves.slice(0, claves.length - MAX_ENTRADAS).map((k) => cache.delete(k)));
}

async function cachePrimero(request) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const respuesta = await fetch(request);
  if (respuesta.ok) {
    await cache.put(request, respuesta.clone());
    await recortar(cache);
  }
  return respuesta;
}

async function redConRespaldo(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE);
    const respaldo = await cache.match(PAGINA_SIN_CONEXION);
    return respaldo ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(redConRespaldo(request));
    return;
  }
  if (esEstatico(url)) {
    event.respondWith(cachePrimero(request));
  }
});
