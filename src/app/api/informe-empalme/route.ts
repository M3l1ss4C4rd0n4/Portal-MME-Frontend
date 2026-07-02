import { NextResponse } from 'next/server';

/**
 * API placeholder para la descarga del Informe de Empalme.
 *
 * TODO: Cuando el equipo entregue el enlace de OneDrive/SharePoint,
 * reemplazar esta respuesta por una redirección 302 o por una descarga
 * proxy del archivo remoto.
 *
 * Ejemplo de redirección directa:
 *   const ONE_DRIVE_DOWNLOAD_URL = process.env.INFORME_EMPALME_URL ?? '';
 *   if (!ONE_DRIVE_DOWNLOAD_URL) {
 *     return NextResponse.json(
 *       { error: 'El informe de empalme aún no está configurado' },
 *       { status: 503 }
 *     );
 *   }
 *   return NextResponse.redirect(ONE_DRIVE_DOWNLOAD_URL, { status: 302 });
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'PENDING',
      message: 'El informe de empalme estará disponible próximamente.',
      hint: 'Configure INFORME_EMPALME_URL en las variables de entorno o reemplace este handler cuando el enlace de OneDrive esté listo.',
    },
    { status: 503 }
  );
}
