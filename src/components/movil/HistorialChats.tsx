'use client';

import { useState, type FormEvent } from 'react';
import {
  BookmarkIcon, ChevronDownIcon, EllipsisVerticalIcon, FolderIcon, FolderPlusIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useHistorialChats } from '@/hooks/useHistorialChats';
import { ordenarConversaciones, type ConversacionGuardada, type ProyectoChats } from '@/lib/historialChats';

const BOTON_ACCION =
  'flex min-h-11 flex-1 items-center justify-center rounded-lg border border-theme-card px-2 text-xs text-theme-secondary active:bg-theme-hover';

type Menu = { tipo: 'chat' | 'proyecto'; id: string } | null;

/** Campo de una línea para escribir un nombre (renombrar o crear). */
function CampoNombre({ inicial, etiqueta, alEnviar, alCancelar }: {
  inicial: string; etiqueta: string; alEnviar: (nombre: string) => void; alCancelar: () => void;
}) {
  const [texto, setTexto] = useState(inicial);
  const enviar = (e: FormEvent) => { e.preventDefault(); if (texto.trim()) alEnviar(texto); else alCancelar(); };
  return (
    <form onSubmit={enviar} className="flex items-center gap-1.5 px-1 py-1">
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label={etiqueta}
        maxLength={60}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-theme-card bg-theme-primary px-3 text-base text-theme-primary focus:border-amber-500/60 focus:outline-none"
      />
      <button type="submit" className="min-h-11 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-black">Guardar</button>
      <button type="button" onClick={alCancelar} className="min-h-11 rounded-lg px-2 text-xs text-theme-muted">Cancelar</button>
    </form>
  );
}

function FilaChat({ chat, proyectos, menuAbierto, alAlternarMenu, alAbrir, acciones }: {
  chat: ConversacionGuardada;
  proyectos: readonly ProyectoChats[];
  menuAbierto: boolean;
  alAlternarMenu: () => void;
  alAbrir: () => void;
  acciones: ReturnType<typeof useHistorialChats>;
}) {
  const [modo, setModo] = useState<'menu' | 'renombrar' | 'eliminar'>('menu');
  const cerrarMenu = () => { setModo('menu'); alAlternarMenu(); };

  if (menuAbierto && modo === 'renombrar') {
    return (
      <CampoNombre inicial={chat.titulo} etiqueta="Nombre del chat"
        alEnviar={(n) => { acciones.renombrar(chat.id, n); cerrarMenu(); }} alCancelar={cerrarMenu} />
    );
  }

  return (
    <div>
      <div className="flex items-center">
        <button type="button" onClick={alAbrir}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-left text-sm text-theme-secondary active:bg-theme-hover">
          {chat.fijada && <BookmarkSolidIcon className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Fijado" />}
          <span className="truncate">{chat.titulo}</span>
        </button>
        <button type="button" onClick={() => { setModo('menu'); alAlternarMenu(); }} aria-expanded={menuAbierto}
          aria-label={`Opciones de «${chat.titulo}»`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-theme-muted active:bg-theme-hover">
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      </div>

      {menuAbierto && modo === 'menu' && (
        <div className="space-y-2 px-1 pb-2">
          <div className="flex gap-1.5">
            <button type="button" className={BOTON_ACCION} onClick={() => setModo('renombrar')}>Renombrar</button>
            <button type="button" className={BOTON_ACCION} onClick={() => { acciones.alternarFijada(chat.id); cerrarMenu(); }}>
              {chat.fijada ? 'Quitar fijado' : 'Fijar'}
            </button>
            <button type="button" className={`${BOTON_ACCION} text-red-400`} onClick={() => setModo('eliminar')}>Eliminar</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-theme-muted">
            Proyecto
            <select value={chat.proyectoId ?? ''} onChange={(e) => { acciones.mover(chat.id, e.target.value || null); cerrarMenu(); }}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-theme-card bg-theme-primary px-2 text-sm text-theme-primary">
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        </div>
      )}

      {menuAbierto && modo === 'eliminar' && (
        <div className="space-y-2 px-1 pb-2">
          <p className="px-2 text-xs text-theme-secondary">¿Eliminar este chat de forma definitiva?</p>
          <div className="flex gap-1.5">
            <button type="button" className={`${BOTON_ACCION} bg-red-500/10 text-red-400`} onClick={() => { acciones.eliminar(chat.id); cerrarMenu(); }}>Sí, eliminar</button>
            <button type="button" className={BOTON_ACCION} onClick={cerrarMenu}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListaChats({ chats, proyectos, menu, setMenu, alAbrir, acciones }: {
  chats: readonly ConversacionGuardada[]; proyectos: readonly ProyectoChats[]; menu: Menu;
  setMenu: (m: Menu) => void; alAbrir: (id: string) => void; acciones: ReturnType<typeof useHistorialChats>;
}) {
  return (
    <>
      {ordenarConversaciones(chats).map((chat) => {
        const abierto = menu?.tipo === 'chat' && menu.id === chat.id;
        return (
          <FilaChat key={chat.id} chat={chat} proyectos={proyectos} menuAbierto={abierto} acciones={acciones}
            alAlternarMenu={() => setMenu(abierto ? null : { tipo: 'chat', id: chat.id })}
            alAbrir={() => alAbrir(chat.id)} />
        );
      })}
    </>
  );
}

function FilaProyecto({ proyecto, chats, proyectos, menu, setMenu, alAbrir, acciones }: {
  proyecto: ProyectoChats; chats: readonly ConversacionGuardada[]; proyectos: readonly ProyectoChats[]; menu: Menu;
  setMenu: (m: Menu) => void; alAbrir: (id: string) => void; acciones: ReturnType<typeof useHistorialChats>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<'menu' | 'renombrar' | 'eliminar'>('menu');
  const menuAbierto = menu?.tipo === 'proyecto' && menu.id === proyecto.id;
  const cerrarMenu = () => { setModo('menu'); setMenu(null); };

  if (menuAbierto && modo === 'renombrar') {
    return <CampoNombre inicial={proyecto.nombre} etiqueta="Nombre del proyecto"
      alEnviar={(n) => { acciones.renombrarProyecto(proyecto.id, n); cerrarMenu(); }} alCancelar={cerrarMenu} />;
  }

  return (
    <div>
      <div className="flex items-center">
        <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-theme-primary active:bg-theme-hover">
          <FolderIcon className="h-4 w-4 shrink-0 text-gold" />
          <span className="truncate">{proyecto.nombre}</span>
          <span className="text-[11px] font-normal text-theme-muted">{chats.length}</span>
          <ChevronDownIcon className={`ml-auto h-4 w-4 shrink-0 text-theme-muted transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={() => { setModo('menu'); setMenu(menuAbierto ? null : { tipo: 'proyecto', id: proyecto.id }); }}
          aria-expanded={menuAbierto} aria-label={`Opciones del proyecto «${proyecto.nombre}»`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-theme-muted active:bg-theme-hover">
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      </div>

      {menuAbierto && modo === 'menu' && (
        <div className="flex gap-1.5 px-1 pb-2">
          <button type="button" className={BOTON_ACCION} onClick={() => setModo('renombrar')}>Renombrar</button>
          <button type="button" className={`${BOTON_ACCION} text-red-400`} onClick={() => setModo('eliminar')}>Eliminar proyecto</button>
        </div>
      )}
      {menuAbierto && modo === 'eliminar' && (
        <div className="space-y-2 px-1 pb-2">
          <p className="px-2 text-xs text-theme-secondary">Los chats del proyecto no se borran: quedan sin proyecto.</p>
          <div className="flex gap-1.5">
            <button type="button" className={`${BOTON_ACCION} bg-red-500/10 text-red-400`} onClick={() => { acciones.eliminarProyecto(proyecto.id); cerrarMenu(); }}>Sí, eliminar</button>
            <button type="button" className={BOTON_ACCION} onClick={cerrarMenu}>Cancelar</button>
          </div>
        </div>
      )}

      {abierto && (
        <div className="ml-4 border-l border-theme-card pl-1">
          {chats.length === 0
            ? <p className="px-3 py-2 text-xs text-theme-muted">Sin chats. Use «Proyecto» en las opciones de un chat para traerlo aquí.</p>
            : <ListaChats chats={chats} proyectos={proyectos} menu={menu} setMenu={setMenu} alAbrir={alAbrir} acciones={acciones} />}
        </div>
      )}
    </div>
  );
}

/**
 * Sección «Historial Asistente IA» del cajón móvil: chats guardados en este
 * teléfono, con renombrar, fijar, eliminar y agrupación en proyectos.
 */
export default function HistorialChats({ activa, alAbrirChat }: { activa: boolean; alAbrirChat: (id: string) => void }) {
  const acciones = useHistorialChats();
  const { estado } = acciones;
  const [abierto, setAbierto] = useState(activa);
  const [menu, setMenu] = useState<Menu>(null);
  const [creandoProyecto, setCreandoProyecto] = useState(false);

  const sinProyecto = estado.conversaciones.filter((c) => c.proyectoId === null);
  const vacio = estado.conversaciones.length === 0 && estado.proyectos.length === 0;

  return (
    <div>
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors ${
          activa ? 'bg-theme-hover font-semibold text-gold' : 'text-theme-secondary active:bg-theme-hover'}`}>
        <SparklesIcon className="h-5 w-5 text-gold" />
        <span className="flex-1">Historial Asistente IA</span>
        <ChevronDownIcon className={`h-4 w-4 text-theme-muted transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="ml-5 space-y-0.5 border-l border-theme-card pl-2">
          {creandoProyecto
            ? <CampoNombre inicial="" etiqueta="Nombre del proyecto"
                alEnviar={(n) => { acciones.crearProyecto(n); setCreandoProyecto(false); }}
                alCancelar={() => setCreandoProyecto(false)} />
            : (
              <button type="button" onClick={() => setCreandoProyecto(true)}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-theme-secondary active:bg-theme-hover">
                <FolderPlusIcon className="h-4 w-4 text-gold" /> Nuevo proyecto
              </button>
            )}

          {estado.proyectos.map((p) => (
            <FilaProyecto key={p.id} proyecto={p} proyectos={estado.proyectos} menu={menu} setMenu={setMenu}
              chats={estado.conversaciones.filter((c) => c.proyectoId === p.id)}
              alAbrir={alAbrirChat} acciones={acciones} />
          ))}

          {vacio && (
            <p className="px-3 py-2 text-xs leading-snug text-theme-muted">
              Aún no hay chats guardados en este teléfono. Sus conversaciones aparecerán aquí.
            </p>
          )}

          {sinProyecto.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
                <BookmarkIcon className="h-3 w-3" /> Chats
              </p>
              <ListaChats chats={sinProyecto} proyectos={estado.proyectos} menu={menu} setMenu={setMenu}
                alAbrir={alAbrirChat} acciones={acciones} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
