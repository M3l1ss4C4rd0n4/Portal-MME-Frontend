"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useAsistenteVoz } from "@/hooks/useAsistenteVoz";
import { useTheme } from "@/providers/ThemeProvider";
import {
  useAsistenteChat,
  nombreHumanoTool,
  MIME_TYPES_PERMITIDOS,
} from "@/hooks/useAsistenteChat";
import { Burbuja } from "@/components/asistente/Burbuja";
import { SECTION_PROMPTS } from "@/lib/asistenteSecciones";

const PREGUNTAS_SUGERIDAS = [
  "¿Cuántas comunidades energéticas hay en el Chocó?",
  "¿Cuáles son los contratos OR con mayor riesgo de atraso?",
  "¿Qué se reportó en el seguimiento de Comunidades Energéticas?",
  "¿Cómo está la generación eléctrica del sistema hoy?",
];

export default function AsistentePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const {
    mensajes, enviando, herramientaActiva,
    archivo, errorArchivo, fileInputRef,
    seleccionarArchivo, setArchivo,
    enviar, regenerar, enviarFeedback,
  } = useAsistenteChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const voz = useAsistenteVoz();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  const enviarTexto = useCallback(
    async (texto: string) => {
      setInput("");
      await enviar(texto);
    },
    [enviar]
  );

  return (
    <div className="h-screen flex bg-theme-primary pt-24">
      {/* ── Barra lateral permanente — mismos accesos a secciones que el drawer del
          portal, siempre visibles para aprovechar el ancho disponible en esta página ── */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-2 border-r border-theme-card px-4 py-6 overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted px-1 mb-1">
          Secciones del portal
        </p>
        {SECTION_PROMPTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => enviarTexto(s.prompt)}
            disabled={enviando}
            className="flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl bg-theme-secondary border border-theme-card hover:border-amber-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <s.icon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-theme-primary leading-tight">{s.label}</span>
              <span className="block text-[10px] text-theme-muted leading-snug mt-0.5">{s.description}</span>
            </span>
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto py-6 space-y-4">
          {mensajes.length === 0 && (
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold text-theme-primary mb-2">Asistente IA — MinMinas</h1>
              <p className="text-sm text-theme-muted mb-8">
                Pregunta lo que quieras sobre el ministerio — datos reales de comunidades
                energéticas, contratos, subsidios, sector eléctrico y más.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {PREGUNTAS_SUGERIDAS.map((p) => (
                  <button
                    key={p}
                    onClick={() => enviarTexto(p)}
                    className="text-left text-xs px-4 py-3 rounded-xl bg-theme-secondary border border-theme-card hover:border-amber-500/40 transition-colors text-theme-secondary"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {mensajes.map((m, i) => (
              <Burbuja
                key={i}
                mensaje={m}
                isDark={isDark}
                mostrarFeedback={
                  m.role === "assistant" && !!m.content && (i < mensajes.length - 1 || !enviando)
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
      </div>

      <div className="border-t border-theme-card bg-theme-primary px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          {(archivo || errorArchivo) && (
            <div className="mb-2 flex items-center gap-2">
              {archivo && (
                <div className="inline-flex items-center gap-2 text-xs bg-dash-chip border border-theme-card rounded-lg px-3 py-1.5">
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
              {errorArchivo && <span className="text-xs text-red-400">{errorArchivo}</span>}
            </div>
          )}

          {voz.error && <div className="mb-2 text-xs text-red-400">{voz.error}</div>}

          {voz.estado !== "inactivo" ? (
            <div className="flex items-center justify-between gap-4 bg-dash-chip border border-amber-500/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    voz.estado === "respondiendo" ? "bg-amber-500 animate-pulse" : "bg-green-500 animate-pulse"
                  }`}
                />
                <span className="text-sm text-theme-primary">
                  {voz.estado === "conectando" && "Conectando…"}
                  {voz.estado === "escuchando" && "Escuchando…"}
                  {voz.estado === "respondiendo" && "Respondiendo…"}
                </span>
              </div>
              <button
                type="button"
                onClick={voz.detener}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Colgar
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarTexto(input);
              }}
              className="flex items-center gap-1 bg-dash-chip border border-theme-card rounded-full pl-2 pr-1.5 py-1.5 shadow-sm focus-within:border-amber-500/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={MIME_TYPES_PERMITIDOS.join(",")}
                className="hidden"
                onChange={(e) => seleccionarArchivo(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando}
                title="Adjuntar imagen o PDF"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-theme-secondary hover:bg-theme-hover disabled:opacity-40 transition-colors"
              >
                📎
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarTexto(input);
                  }
                }}
                onPaste={(e) => {
                  const item = Array.from(e.clipboardData.items).find((it) =>
                    it.type.startsWith("image/")
                  );
                  if (!item) return;
                  e.preventDefault();
                  seleccionarArchivo(item.getAsFile());
                }}
                placeholder="Escribe tu pregunta…"
                rows={1}
                disabled={enviando}
                className="flex-1 resize-none bg-transparent border-none px-2 py-1.5 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={voz.iniciar}
                disabled={enviando}
                title="Hablar con el asistente"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-theme-secondary hover:bg-theme-hover disabled:opacity-40 transition-colors"
              >
                🎙️
              </button>
              <button
                type="submit"
                disabled={enviando || (!input.trim() && !archivo)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:bg-theme-hover disabled:text-theme-muted transition-colors"
              >
                {enviando ? "…" : "➤"}
              </button>
            </form>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
