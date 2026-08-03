"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

const PREGUNTAS_SUGERIDAS = [
  "¿Cuántas comunidades energéticas hay en el Chocó?",
  "¿Cuáles son los contratos OR con mayor riesgo de atraso?",
  "¿Qué se reportó en el seguimiento de Comunidades Energéticas?",
  "¿Cómo está la generación eléctrica del sistema hoy?",
];

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          esUsuario
            ? "bg-amber-500/15 border border-amber-500/30 text-theme-primary"
            : "bg-theme-secondary border border-theme-card text-theme-primary"
        }`}
      >
        {esUsuario ? (
          <span className="whitespace-pre-wrap">{mensaje.content}</span>
        ) : mensaje.content ? (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                strong: ({ children }) => <strong className="font-bold text-gold">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-dash-chip px-1.5 py-0.5 rounded text-xs">{children}</code>
                ),
              }}
            >
              {mensaje.content}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-theme-muted animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-theme-muted animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-theme-muted animate-bounce" />
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function AsistentePage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [herramientaActiva, setHerramientaActiva] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      if (!limpio || enviando) return;

      const historial = mensajes.map(({ role, content }) => ({ role, content }));
      setMensajes((prev) => [...prev, { role: "user", content: limpio }, { role: "assistant", content: "" }]);
      setInput("");
      setEnviando(true);
      setHerramientaActiva(null);

      try {
        const res = await fetch("/api/asistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: limpio, historial }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Error del servidor (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lineas = buffer.split("\n\n");
          buffer = lineas.pop() ?? "";

          for (const linea of lineas) {
            if (!linea.startsWith("data: ")) continue;
            try {
              const evento = JSON.parse(linea.slice(6));
              if (evento.tool) {
                setHerramientaActiva(evento.tool);
              } else if (evento.delta) {
                setMensajes((prev) => {
                  const copia = [...prev];
                  copia[copia.length - 1] = {
                    role: "assistant",
                    content: copia[copia.length - 1].content + evento.delta,
                  };
                  return copia;
                });
              } else if (evento.error) {
                setMensajes((prev) => {
                  const copia = [...prev];
                  copia[copia.length - 1] = { role: "assistant", content: `⚠️ ${evento.error}` };
                  return copia;
                });
              }
            } catch {
              // línea SSE incompleta/no-JSON — se ignora, ya llegará completa en el próximo chunk
            }
          }
        }
      } catch (err) {
        setMensajes((prev) => {
          const copia = [...prev];
          copia[copia.length - 1] = {
            role: "assistant",
            content: "⚠️ No se pudo generar la respuesta. Intenta de nuevo.",
          };
          return copia;
        });
        console.error("[Asistente]", err);
      } finally {
        setEnviando(false);
        setHerramientaActiva(null);
      }
    },
    [mensajes, enviando]
  );

  return (
    <div className="h-screen flex flex-col bg-theme-primary pt-24">
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
                    onClick={() => enviar(p)}
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
              <Burbuja key={i} mensaje={m} />
            ))}
          </AnimatePresence>

          {herramientaActiva && (
            <div className="text-[10px] text-theme-muted uppercase tracking-wide pl-1">
              consultando {herramientaActiva}…
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-theme-card bg-theme-primary px-4 sm:px-6 lg:px-8 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(input);
              }
            }}
            placeholder="Escribe tu pregunta…"
            rows={1}
            disabled={enviando}
            className="flex-1 resize-none bg-dash-chip border border-theme-card rounded-xl px-4 py-3 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-amber-500/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={enviando || !input.trim()}
            className="px-4 py-3 rounded-xl text-xs font-bold bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-40 transition-colors"
          >
            {enviando ? "…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
