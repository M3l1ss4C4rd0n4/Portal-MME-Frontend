'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CLAVE_HISTORIAL, ESTADO_VACIO, EVENTO_HISTORIAL, alternarFijada, cargarEstado, crearId, crearProyecto,
  eliminarConversacion, eliminarProyecto, guardarEstado, moverConversacion, renombrarConversacion,
  renombrarProyecto, type EstadoHistorial,
} from '@/lib/historialChats';

/** Lee y modifica el historial del Asistente guardado en este dispositivo. */
export function useHistorialChats() {
  const [estado, setEstado] = useState<EstadoHistorial>(ESTADO_VACIO);

  useEffect(() => {
    const refrescar = () => setEstado(cargarEstado());
    refrescar();
    const alCambiarOtraPestana = (e: StorageEvent) => { if (e.key === CLAVE_HISTORIAL) refrescar(); };
    window.addEventListener(EVENTO_HISTORIAL, refrescar);
    window.addEventListener('storage', alCambiarOtraPestana);
    return () => {
      window.removeEventListener(EVENTO_HISTORIAL, refrescar);
      window.removeEventListener('storage', alCambiarOtraPestana);
    };
  }, []);

  const aplicar = useCallback((cambio: (previo: EstadoHistorial) => EstadoHistorial) => {
    const siguiente = cambio(cargarEstado());
    guardarEstado(siguiente);
    setEstado(siguiente);
    window.dispatchEvent(new Event(EVENTO_HISTORIAL));
  }, []);

  return {
    estado,
    renombrar: useCallback((id: string, titulo: string) => aplicar((e) => renombrarConversacion(e, id, titulo)), [aplicar]),
    alternarFijada: useCallback((id: string) => aplicar((e) => alternarFijada(e, id)), [aplicar]),
    eliminar: useCallback((id: string) => aplicar((e) => eliminarConversacion(e, id)), [aplicar]),
    mover: useCallback((id: string, proyectoId: string | null) => aplicar((e) => moverConversacion(e, id, proyectoId)), [aplicar]),
    crearProyecto: useCallback((nombre: string) => aplicar((e) => crearProyecto(e, nombre, crearId(), Date.now())), [aplicar]),
    renombrarProyecto: useCallback((id: string, nombre: string) => aplicar((e) => renombrarProyecto(e, id, nombre)), [aplicar]),
    eliminarProyecto: useCallback((id: string) => aplicar((e) => eliminarProyecto(e, id)), [aplicar]),
  };
}
