// Historial de conversaciones del Asistente IA, guardado en el propio dispositivo
// (localStorage). Todas las funciones de estado son puras: devuelven una copia nueva.

export interface MensajeGuardado {
  role: 'user' | 'assistant';
  content: string;
  nombreArchivo?: string;
  toolsUsadas?: string[];
  turnoId?: string;
  feedbackDado?: 'util' | 'no_util';
}

export interface ConversacionGuardada {
  id: string;
  titulo: string;
  fijada: boolean;
  proyectoId: string | null;
  creadaEn: number;
  actualizadaEn: number;
  mensajes: MensajeGuardado[];
}

export interface ProyectoChats {
  id: string;
  nombre: string;
  creadoEn: number;
}

export interface EstadoHistorial {
  conversaciones: ConversacionGuardada[];
  proyectos: ProyectoChats[];
}

export const CLAVE_HISTORIAL = 'asistente:historial:v1';
/** Evento de ventana que avisa que el historial cambió (misma pestaña). */
export const EVENTO_HISTORIAL = 'asistente:historial-cambio';
/** Evento de ventana: abrir una conversación guardada (detail = id). */
export const EVENTO_ABRIR_CHAT = 'asistente:abrir-chat';
export const LIMITE_CONVERSACIONES = 60;
export const LARGO_MAX_TITULO = 48;
export const TITULO_SIN_NOMBRE = 'Chat nuevo';
export const ESTADO_VACIO: EstadoHistorial = { conversaciones: [], proyectos: [] };

export function crearId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function recortar(texto: string, largo: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length <= largo ? limpio : `${limpio.slice(0, largo - 1).trimEnd()}…`;
}

export function tituloDesdeMensajes(mensajes: readonly MensajeGuardado[]): string {
  const primero = mensajes.find((m) => m.role === 'user' && m.content.trim());
  return primero ? recortar(primero.content, LARGO_MAX_TITULO) : TITULO_SIN_NOMBRE;
}

/** Fijadas primero; dentro de cada grupo, la más reciente arriba. */
export function ordenarConversaciones(lista: readonly ConversacionGuardada[]): ConversacionGuardada[] {
  return [...lista].sort((a, b) => Number(b.fijada) - Number(a.fijada) || b.actualizadaEn - a.actualizadaEn);
}

function aplicarLimite(lista: ConversacionGuardada[]): ConversacionGuardada[] {
  if (lista.length <= LIMITE_CONVERSACIONES) return lista;
  const conservar = new Set(
    [...lista]
      .sort((a, b) => Number(b.fijada) - Number(a.fijada) || b.actualizadaEn - a.actualizadaEn)
      .slice(0, LIMITE_CONVERSACIONES)
      .map((c) => c.id),
  );
  return lista.filter((c) => conservar.has(c.id));
}

/** Crea o actualiza una conversación; conserva título, fijado y proyecto si ya existía. */
export function guardarConversacion(
  estado: EstadoHistorial,
  datos: { id: string; mensajes: readonly MensajeGuardado[] },
  ahora: number,
): EstadoHistorial {
  if (!datos.mensajes.some((m) => m.role === 'user' && m.content.trim())) return estado;
  const previa = estado.conversaciones.find((c) => c.id === datos.id);
  const nueva: ConversacionGuardada = {
    id: datos.id,
    titulo: previa?.titulo ?? tituloDesdeMensajes(datos.mensajes),
    fijada: previa?.fijada ?? false,
    proyectoId: previa?.proyectoId ?? null,
    creadaEn: previa?.creadaEn ?? ahora,
    actualizadaEn: ahora,
    mensajes: [...datos.mensajes],
  };
  const resto = estado.conversaciones.filter((c) => c.id !== datos.id);
  return { ...estado, conversaciones: aplicarLimite([nueva, ...resto]) };
}

const mapear = (
  estado: EstadoHistorial,
  id: string,
  cambio: (c: ConversacionGuardada) => ConversacionGuardada,
): EstadoHistorial => ({
  ...estado,
  conversaciones: estado.conversaciones.map((c) => (c.id === id ? cambio(c) : c)),
});

export function renombrarConversacion(estado: EstadoHistorial, id: string, titulo: string): EstadoHistorial {
  const limpio = recortar(titulo, LARGO_MAX_TITULO);
  return limpio ? mapear(estado, id, (c) => ({ ...c, titulo: limpio })) : estado;
}

export function alternarFijada(estado: EstadoHistorial, id: string): EstadoHistorial {
  return mapear(estado, id, (c) => ({ ...c, fijada: !c.fijada }));
}

export function moverConversacion(estado: EstadoHistorial, id: string, proyectoId: string | null): EstadoHistorial {
  if (proyectoId !== null && !estado.proyectos.some((p) => p.id === proyectoId)) return estado;
  return mapear(estado, id, (c) => ({ ...c, proyectoId }));
}

export function eliminarConversacion(estado: EstadoHistorial, id: string): EstadoHistorial {
  return { ...estado, conversaciones: estado.conversaciones.filter((c) => c.id !== id) };
}

export function crearProyecto(estado: EstadoHistorial, nombre: string, id: string, ahora: number): EstadoHistorial {
  const limpio = recortar(nombre, LARGO_MAX_TITULO);
  if (!limpio) return estado;
  return { ...estado, proyectos: [...estado.proyectos, { id, nombre: limpio, creadoEn: ahora }] };
}

export function renombrarProyecto(estado: EstadoHistorial, id: string, nombre: string): EstadoHistorial {
  const limpio = recortar(nombre, LARGO_MAX_TITULO);
  if (!limpio) return estado;
  return { ...estado, proyectos: estado.proyectos.map((p) => (p.id === id ? { ...p, nombre: limpio } : p)) };
}

/** Borra el proyecto; sus chats no se pierden, quedan sin proyecto. */
export function eliminarProyecto(estado: EstadoHistorial, id: string): EstadoHistorial {
  return {
    proyectos: estado.proyectos.filter((p) => p.id !== id),
    conversaciones: estado.conversaciones.map((c) => (c.proyectoId === id ? { ...c, proyectoId: null } : c)),
  };
}

const esTexto = (v: unknown): v is string => typeof v === 'string';
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function mensajeValido(m: unknown): m is MensajeGuardado {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  return (o.role === 'user' || o.role === 'assistant') && esTexto(o.content);
}

function conversacionValida(c: unknown): c is ConversacionGuardada {
  if (typeof c !== 'object' || c === null) return false;
  const o = c as Record<string, unknown>;
  return esTexto(o.id) && esTexto(o.titulo) && typeof o.fijada === 'boolean'
    && (o.proyectoId === null || esTexto(o.proyectoId))
    && esNumero(o.creadaEn) && esNumero(o.actualizadaEn)
    && Array.isArray(o.mensajes) && o.mensajes.every(mensajeValido);
}

function proyectoValido(p: unknown): p is ProyectoChats {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return esTexto(o.id) && esTexto(o.nombre) && esNumero(o.creadoEn);
}

/** Lee y valida lo guardado; ante datos dañados devuelve un historial vacío. */
export function interpretarEstado(crudo: string | null): EstadoHistorial {
  if (!crudo) return ESTADO_VACIO;
  try {
    const dato: unknown = JSON.parse(crudo);
    if (typeof dato !== 'object' || dato === null) return ESTADO_VACIO;
    const o = dato as Record<string, unknown>;
    const conversaciones = Array.isArray(o.conversaciones) ? o.conversaciones.filter(conversacionValida) : [];
    const proyectos = Array.isArray(o.proyectos) ? o.proyectos.filter(proyectoValido) : [];
    return { conversaciones, proyectos };
  } catch {
    return ESTADO_VACIO;
  }
}

export function cargarEstado(almacen: Pick<Storage, 'getItem'> | null = globalThis.localStorage ?? null): EstadoHistorial {
  try {
    return interpretarEstado(almacen ? almacen.getItem(CLAVE_HISTORIAL) : null);
  } catch {
    return ESTADO_VACIO;
  }
}

/** Devuelve true si se pudo guardar (el almacenamiento puede estar lleno o bloqueado). */
export function guardarEstado(
  estado: EstadoHistorial,
  almacen: Pick<Storage, 'setItem'> | null = globalThis.localStorage ?? null,
): boolean {
  if (!almacen) return false;
  try {
    almacen.setItem(CLAVE_HISTORIAL, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}
