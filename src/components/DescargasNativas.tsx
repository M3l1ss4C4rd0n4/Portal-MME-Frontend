'use client';

import { useEffect } from 'react';
import { instalarDescargasNativas } from '@/lib/descargasNativas';

/** Activa la entrega de archivos descargados dentro de la app Android (no hace nada en el navegador). */
export default function DescargasNativas() {
  useEffect(() => { instalarDescargasNativas(); }, []);
  return null;
}
