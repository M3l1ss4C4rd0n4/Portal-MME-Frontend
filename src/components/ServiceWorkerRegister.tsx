'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker de la PWA (public/sw.js). Solo en producción:
 * en desarrollo la caché de archivos estáticos estorbaría al recargado en caliente.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) => console.error('[PWA] No se pudo registrar el service worker:', error));
  }, []);

  return null;
}
