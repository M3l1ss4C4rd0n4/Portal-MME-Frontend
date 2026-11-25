import { describe, expect, it } from 'vitest';
import {
  ESTADO_VACIO, LARGO_MAX_TITULO, LIMITE_CONVERSACIONES, alternarFijada, crearProyecto,
  eliminarConversacion, eliminarProyecto, guardarConversacion, interpretarEstado,
  moverConversacion, ordenarConversaciones, renombrarConversacion, tituloDesdeMensajes,
  type EstadoHistorial, type MensajeGuardado,
} from '../historialChats';

const pregunta = (content: string): MensajeGuardado => ({ role: 'user', content });
const respuesta = (content: string): MensajeGuardado => ({ role: 'assistant', content });

describe('tituloDesdeMensajes', () => {
  it('usa la primera pregunta del usuario, sin espacios de más', () => {
    expect(tituloDesdeMensajes([pregunta('  ¿Cuántas   comunidades\nhay? '), respuesta('x')])).toBe('¿Cuántas comunidades hay?');
  });

  it('recorta con puntos suspensivos cuando es muy largo', () => {
    const titulo = tituloDesdeMensajes([pregunta('a'.repeat(200))]);
    expect(titulo).toHaveLength(LARGO_MAX_TITULO);
    expect(titulo.endsWith('…')).toBe(true);
  });

  it('devuelve el título por defecto si no hay pregunta', () => {
    expect(tituloDesdeMensajes([respuesta('hola')])).toBe('Chat nuevo');
  });
});

describe('guardarConversacion', () => {
  it('no guarda conversaciones sin pregunta del usuario', () => {
    expect(guardarConversacion(ESTADO_VACIO, { id: 'a', mensajes: [] }, 1)).toBe(ESTADO_VACIO);
  });

  it('crea la conversación y no muta el estado de origen', () => {
    const nuevo = guardarConversacion(ESTADO_VACIO, { id: 'a', mensajes: [pregunta('hola')] }, 10);
    expect(nuevo.conversaciones).toHaveLength(1);
    expect(nuevo.conversaciones[0]).toMatchObject({ id: 'a', titulo: 'hola', fijada: false, proyectoId: null, creadaEn: 10 });
    expect(ESTADO_VACIO.conversaciones).toHaveLength(0);
  });

  it('al actualizar conserva título, fijado y proyecto', () => {
    let e: EstadoHistorial = guardarConversacion(ESTADO_VACIO, { id: 'a', mensajes: [pregunta('hola')] }, 10);
    e = crearProyecto(e, 'Subsidios', 'p1', 11);
    e = moverConversacion(renombrarConversacion(alternarFijada(e, 'a'), 'a', 'Mi chat'), 'a', 'p1');
    const act = guardarConversacion(e, { id: 'a', mensajes: [pregunta('hola'), respuesta('qué tal')] }, 20);
    expect(act.conversaciones[0]).toMatchObject({ titulo: 'Mi chat', fijada: true, proyectoId: 'p1', creadaEn: 10, actualizadaEn: 20 });
    expect(act.conversaciones[0].mensajes).toHaveLength(2);
  });

  it('descarta las más antiguas sin fijar al superar el límite', () => {
    let e: EstadoHistorial = ESTADO_VACIO;
    for (let i = 0; i < LIMITE_CONVERSACIONES + 5; i++) {
      e = guardarConversacion(e, { id: `c${i}`, mensajes: [pregunta(`p${i}`)] }, i);
      if (i === 0) e = alternarFijada(e, 'c0');
    }
    expect(e.conversaciones).toHaveLength(LIMITE_CONVERSACIONES);
    expect(e.conversaciones.some((c) => c.id === 'c0')).toBe(true);
    expect(e.conversaciones.some((c) => c.id === 'c1')).toBe(false);
  });
});

describe('acciones sobre conversaciones y proyectos', () => {
  const base = (): EstadoHistorial => {
    let e = guardarConversacion(ESTADO_VACIO, { id: 'a', mensajes: [pregunta('uno')] }, 1);
    e = guardarConversacion(e, { id: 'b', mensajes: [pregunta('dos')] }, 2);
    return crearProyecto(e, 'Proyecto', 'p1', 3);
  };

  it('ignora un nombre vacío al renombrar', () => {
    const e = base();
    expect(renombrarConversacion(e, 'a', '   ')).toBe(e);
  });

  it('no mueve a un proyecto que no existe', () => {
    const e = base();
    expect(moverConversacion(e, 'a', 'zzz')).toBe(e);
  });

  it('elimina una conversación', () => {
    expect(eliminarConversacion(base(), 'a').conversaciones.map((c) => c.id)).toEqual(['b']);
  });

  it('al borrar un proyecto sus chats quedan sin proyecto', () => {
    const e = eliminarProyecto(moverConversacion(base(), 'a', 'p1'), 'p1');
    expect(e.proyectos).toHaveLength(0);
    expect(e.conversaciones.find((c) => c.id === 'a')?.proyectoId).toBeNull();
  });

  it('ordena con las fijadas primero y luego por fecha', () => {
    const e = alternarFijada(base(), 'a');
    expect(ordenarConversaciones(e.conversaciones).map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('interpretarEstado', () => {
  it('devuelve vacío ante JSON dañado o nulo', () => {
    expect(interpretarEstado(null)).toBe(ESTADO_VACIO);
    expect(interpretarEstado('{no es json')).toBe(ESTADO_VACIO);
    expect(interpretarEstado('42')).toBe(ESTADO_VACIO);
  });

  it('descarta entradas inválidas y conserva las válidas', () => {
    const bueno = guardarConversacion(ESTADO_VACIO, { id: 'a', mensajes: [pregunta('hola')] }, 1).conversaciones[0];
    const crudo = JSON.stringify({ conversaciones: [bueno, { id: 1 }], proyectos: [{ id: 'p', nombre: 'x', creadoEn: 1 }, null] });
    const estado = interpretarEstado(crudo);
    expect(estado.conversaciones).toHaveLength(1);
    expect(estado.proyectos).toHaveLength(1);
  });
});
