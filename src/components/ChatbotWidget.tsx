'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon, Cog6ToothIcon, XMarkIcon,
  PaperClipIcon, MicrophoneIcon, PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import PanoramaInformeFab from './PanoramaInformeFab';
import ResumenEjecutivoFab from './ResumenEjecutivoFab';
import InformeEmpalmeFab from './InformeEmpalmeFab';
import { Burbuja } from './asistente/Burbuja';
import { useAsistenteChat, nombreHumanoTool, MIME_TYPES_PERMITIDOS } from '@/hooks/useAsistenteChat';
import { useAsistenteVoz } from '@/hooks/useAsistenteVoz';
import { useTheme } from '@/providers/ThemeProvider';
import { SECTION_PROMPTS } from '@/lib/asistenteSecciones';

// ── Constants ──────────────────────────────────────────────────────────────────
// Único botón visible en reposo: el de herramientas, anclado a la esquina
// inferior derecha (fijo, sin arrastre ni localStorage — nunca queda fuera de
// pantalla al hacer zoom o redimensionar). Al hacer click despliega una barra
// dorada vertical con los 3 informes + el Asistente IA + cerrar. Cuando el
// panel de IA está abierto, todo se corre hacia la izquierda para quedar
// pegado al nuevo borde del contenido (ver `fabRight` más abajo).
const FAB_MARGIN = 24;
export const AI_PANEL_WIDTH = 420;

export default function ChatbotWidget() {
  const [isOpen, setIsOpen]         = useState(false);
  const [toolsOpen, setToolsOpen]   = useState(false);
  const [input, setInput]           = useState('');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const {
    mensajes, enviando, herramientaActiva,
    archivo, errorArchivo, fileInputRef,
    seleccionarArchivo, setArchivo,
    enviar, regenerar, enviarFeedback,
  } = useAsistenteChat();
  const voz = useAsistenteVoz();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── El panel "empuja" el contenido en vez de taparlo — el resto de la
  // página sigue visible y utilizable al lado del asistente. Se comunica vía
  // una clase en <body> (ver ClientLayout.tsx + globals.css) para no acoplar
  // este componente global con cada página individual del portal.
  useEffect(() => {
    document.body.classList.toggle('ai-panel-open', isOpen);
    return () => { document.body.classList.remove('ai-panel-open'); };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, isOpen]);

  const enviarTexto = useCallback(async (texto: string) => {
    setInput('');
    await enviar(texto);
  }, [enviar]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarTexto(input);
    }
  };

  // Cuando el panel está abierto, el FAB stack se pega al nuevo borde del
  // contenido (el límite izquierdo del panel) en vez de quedarse fijo en el
  // borde físico de la pantalla, que ahora queda detrás del panel.
  const fabRight = isOpen ? AI_PANEL_WIDTH + FAB_MARGIN : FAB_MARGIN;

  return (
    <>
      {/* ── Backdrop — solo en pantallas angostas, donde no cabe el layout tipo "push" ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 z-[9997] hidden max-[900px]:block"
          />
        )}
      </AnimatePresence>

      {/* ── Panel del Asistente IA — columna fija a la derecha, debajo del header ── */}
      <AnimatePresence>
        {isOpen && (
        <motion.div
          key="chat-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
          style={{
            width: AI_PANEL_WIDTH,
            maxWidth: '92vw',
            top: 'var(--header-height, 5rem)',
            height: 'calc(100vh - var(--header-height, 5rem))',
          }}
          className="fixed right-0 z-[9998] flex flex-col bg-theme-primary shadow-2xl overflow-hidden border-l border-theme-primary"
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full hover:bg-theme-hover flex items-center justify-center transition-colors"
            aria-label="Cerrar asistente"
          >
            <XMarkIcon className="w-4 h-4 text-theme-muted" />
          </button>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {mensajes.length === 0 ? (
              /* ── Hero de bienvenida — mismo diseño que la página /asistente, con
                 las secciones reales del portal en vez de preguntas genéricas ── */
              <div className="text-center py-8">
                <h2 className="text-xl font-bold text-theme-primary mb-2">Asistente IA — MinMinas</h2>
                <p className="text-xs text-theme-muted mb-7 px-2">
                  Pregunta lo que quieras sobre el ministerio — datos reales de comunidades
                  energéticas, contratos, subsidios, sector eléctrico y más.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {SECTION_PROMPTS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => enviarTexto(s.prompt)}
                      className="flex flex-col items-start gap-1.5 text-left px-3.5 py-3 rounded-xl bg-theme-secondary border border-theme-card hover:border-amber-500/40 transition-colors"
                    >
                      <s.icon className="w-4 h-4 text-gold shrink-0" />
                      <span className="text-xs font-semibold text-theme-primary leading-tight">{s.label}</span>
                      <span className="text-[10px] text-theme-muted leading-snug">{s.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-8">
                <AnimatePresence initial={false}>
                  {mensajes.map((m, i) => (
                    <Burbuja
                      key={i}
                      mensaje={m}
                      isDark={isDark}
                      compact
                      mostrarFeedback={
                        m.role === 'assistant' && !!m.content && (i < mensajes.length - 1 || !enviando)
                      }
                      onFeedback={(util) => enviarFeedback(i, util)}
                      onRegenerar={() => regenerar(i)}
                    />
                  ))}
                </AnimatePresence>

                {herramientaActiva && (
                  <div className="flex items-center gap-1.5 text-xs text-gold pl-1 animate-pulse-gold">
                    <span>✨</span>
                    <span>{nombreHumanoTool(herramientaActiva)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input — mismo toolbar (adjuntar, texto, micrófono, enviar) que /asistente */}
          <div className="shrink-0 border-t border-theme-primary px-4 py-3">
            {(archivo || errorArchivo) && (
              <div className="mb-2 flex items-center gap-2">
                {archivo && (
                  <div className="inline-flex items-center gap-2 text-[11px] bg-dash-chip border border-theme-card rounded-lg px-2.5 py-1">
                    <span className="text-theme-secondary">📎 {archivo.nombre}</span>
                    <button
                      type="button"
                      onClick={() => setArchivo(null)}
                      className="text-theme-muted hover:text-theme-primary"
                      aria-label="Quitar archivo"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {errorArchivo && <span className="text-[11px] text-red-400">{errorArchivo}</span>}
              </div>
            )}

            {voz.error && <div className="mb-2 text-[11px] text-red-400">{voz.error}</div>}

            {voz.estado !== 'inactivo' ? (
              <div className="flex items-center justify-between gap-3 bg-dash-chip border border-amber-500/30 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${voz.estado === 'respondiendo' ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                  <span className="text-xs text-theme-primary">
                    {voz.estado === 'conectando' && 'Conectando…'}
                    {voz.estado === 'escuchando' && 'Escuchando…'}
                    {voz.estado === 'respondiendo' && 'Respondiendo…'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={voz.detener}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                >
                  Colgar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-dash-chip border border-theme-card rounded-full pl-1.5 pr-1.5 py-1.5 focus-within:border-amber-500/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={MIME_TYPES_PERMITIDOS.join(',')}
                  className="hidden"
                  onChange={(e) => seleccionarArchivo(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={enviando}
                  title="Adjuntar imagen o PDF"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-theme-secondary hover:bg-theme-hover disabled:opacity-40 transition-colors"
                >
                  <PaperClipIcon className="w-4 h-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Escribe tu pregunta…"
                  rows={1}
                  disabled={enviando}
                  className="flex-1 resize-none bg-transparent border-none px-1.5 py-1.5 text-xs text-theme-primary placeholder:text-theme-muted outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={voz.iniciar}
                  disabled={enviando}
                  title="Hablar con el asistente"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-theme-secondary hover:bg-theme-hover disabled:opacity-40 transition-colors"
                >
                  <MicrophoneIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => enviarTexto(input)}
                  disabled={enviando || (!input.trim() && !archivo)}
                  className="shrink-0 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center transition-colors disabled:opacity-30 disabled:bg-theme-hover"
                  title="Enviar"
                >
                  <PaperAirplaneIcon className="w-3.5 h-3.5 text-black" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* ── Barra dorada de herramientas — se despliega desde el botón de herramientas,
          reemplazándolo, con los 3 informes + Asistente IA + cerrar, todo en un
          mismo contenedor dorado (logos de marca conservados en miniatura adentro) ── */}
      <AnimatePresence>
        {toolsOpen && (
          <motion.div
            key="tools-bar"
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ position: 'fixed', bottom: FAB_MARGIN, right: fabRight, zIndex: 9999, transformOrigin: 'bottom' }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-full shadow-2xl bg-gradient-to-b from-[var(--color-gold)] to-[var(--color-gold-light)]"
          >
            <InformeEmpalmeFab />
            <ResumenEjecutivoFab />
            <PanoramaInformeFab />
            <button
              type="button"
              onClick={() => { setIsOpen(true); setToolsOpen(false); }}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 active:bg-black/20"
              aria-label="Abrir asistente IA"
              title="Asistente IA"
            >
              <SparklesIcon className="w-6 h-6 text-[#2A2826] pointer-events-none" />
            </button>
            <button
              type="button"
              onClick={() => setToolsOpen(false)}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 active:bg-black/20"
              aria-label="Cerrar herramientas"
              title="Cerrar"
            >
              <XMarkIcon className="w-6 h-6 text-[#2A2826] pointer-events-none" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Botón de herramientas — único visible en reposo, dorado, 70px ── */}
      {!toolsOpen && (
        <button
          type="button"
          onClick={() => setToolsOpen(true)}
          style={{ position: 'fixed', bottom: FAB_MARGIN, right: fabRight, zIndex: 9999, transition: 'right 0.25s ease' }}
          className="group w-[70px] h-[70px] rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)]"
          aria-label="Herramientas e informes"
          title="Herramientas e informes"
        >
          <Cog6ToothIcon className="w-7 h-7 text-[#2A2826] pointer-events-none" />
        </button>
      )}
    </>
  );
}
