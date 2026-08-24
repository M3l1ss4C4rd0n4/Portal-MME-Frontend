"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { nombreHumanoTool, type AsistenteMensaje } from "@/hooks/useAsistenteChat";

const RelationshipGraph = dynamic(
  () => import("@/app/(dashboards)/explorador-red/RelationshipGraph"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-theme-muted text-xs">Cargando grafo…</span>
      </div>
    ),
  }
);

export function Burbuja({
  mensaje,
  isDark,
  mostrarFeedback,
  onFeedback,
  onRegenerar,
  compact = false,
}: {
  mensaje: AsistenteMensaje;
  isDark: boolean;
  mostrarFeedback: boolean;
  onFeedback: (util: boolean) => void;
  onRegenerar: () => void;
  /** Tipografía/espaciado reducidos — usado en el drawer angosto del portal */
  compact?: boolean;
}) {
  const esUsuario = mensaje.role === "user";
  const [copiado, setCopiado] = useState(false);
  const copiar = useCallback(() => {
    navigator.clipboard.writeText(mensaje.content).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }, [mensaje.content]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`${compact ? "max-w-[92%] px-3 py-2.5 text-xs" : "max-w-[85%] sm:max-w-[70%] px-4 py-3 text-sm"} rounded-2xl leading-relaxed ${
          esUsuario
            ? "bg-amber-500/15 border border-amber-500/30 text-theme-primary"
            : "bg-theme-secondary border border-theme-card text-theme-primary"
        }`}
      >
        {esUsuario ? (
          <>
            {mensaje.nombreArchivo && (
              <div className="mb-1.5 inline-flex items-center gap-1 text-[10px] bg-black/10 rounded-md px-2 py-1 text-theme-secondary">
                📎 {mensaje.nombreArchivo}
              </div>
            )}
            <span className="block whitespace-pre-wrap">{mensaje.content}</span>
          </>
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
            {mensaje.grafo && (
              <div className="mt-2 -mx-1">
                <RelationshipGraph
                  nodos={mensaje.grafo.nodos}
                  aristas={mensaje.grafo.aristas}
                  isDark={isDark}
                  height={compact ? 200 : 280}
                />
              </div>
            )}
            {mensaje.toolsUsadas && mensaje.toolsUsadas.length > 0 && (
              <div className="mt-2 pt-2 border-t border-theme-card text-[10px] text-theme-muted">
                Fuente: {mensaje.toolsUsadas.map((t) => nombreHumanoTool(t)).join(" · ")}
              </div>
            )}
            {mostrarFeedback && (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={copiar}
                  title={copiado ? "Copiado" : "Copiar texto"}
                  className="text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={onRegenerar}
                  title="Regenerar respuesta"
                  className="text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {mensaje.feedbackDado ? (
                  <span className="flex items-center gap-1 text-[10px] text-theme-muted">
                    {mensaje.feedbackDado === "util" ? (
                      <ThumbsUp className="w-3.5 h-3.5" />
                    ) : (
                      <ThumbsDown className="w-3.5 h-3.5" />
                    )}
                    Gracias por tu feedback
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onFeedback(true)}
                      title="Esta respuesta fue útil"
                      className="text-theme-secondary hover:text-theme-primary transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onFeedback(false)}
                      title="Esta respuesta no fue útil"
                      className="text-theme-secondary hover:text-theme-primary transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
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
