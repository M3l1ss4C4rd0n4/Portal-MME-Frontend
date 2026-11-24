import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const NOMBRE_POR_DEFECTO = 'archivo-portal';

/** Nombre apto para el sistema de archivos de Android: sin rutas ni caracteres reservados. */
export function nombreSeguro(nombre: string): string {
  const limpio = nombre
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return limpio || NOMBRE_POR_DEFECTO;
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer el archivo'));
    lector.onload = () => {
      const resultado = String(lector.result ?? '');
      resolve(resultado.slice(resultado.indexOf(',') + 1));
    };
    lector.readAsDataURL(blob);
  });
}

/** Guarda el archivo en la caché de la app y abre el menú «Compartir» de Android (Drive, WhatsApp, correo, visores…). */
async function guardarYCompartir(blob: Blob, nombre: string): Promise<void> {
  const archivo = nombreSeguro(nombre);
  const data = await blobABase64(blob);
  const { uri } = await Filesystem.writeFile({ path: archivo, data, directory: Directory.Cache, recursive: true });
  await Share.share({ title: archivo, files: [uri], dialogTitle: 'Guardar o compartir' });
}

async function descargarDesdeBlobUrl(url: string, nombre: string): Promise<void> {
  try {
    const respuesta = await fetch(url);
    await guardarYCompartir(await respuesta.blob(), nombre);
  } catch (error) {
    console.error('[descargas] No se pudo guardar el archivo en el dispositivo:', error);
    window.alert('No se pudo guardar el archivo. Intente de nuevo.');
  }
}

let instalado = false;

/**
 * Dentro de la app Android (WebView) los enlaces `<a download>` sobre archivos en
 * memoria (blob:) no hacen nada. Aquí se intercepta `anchor.click()` —que es lo que
 * usan tanto nuestro código como `XLSX.writeFile`— y se entrega el archivo por el
 * menú «Compartir». En un navegador normal no hace nada.
 */
export function instalarDescargasNativas(): void {
  if (instalado || typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  instalado = true;
  const clickOriginal = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function interceptarClick(this: HTMLAnchorElement) {
    if (this.download && this.href.startsWith('blob:')) {
      void descargarDesdeBlobUrl(this.href, this.download);
      return;
    }
    clickOriginal.call(this);
  };
}
