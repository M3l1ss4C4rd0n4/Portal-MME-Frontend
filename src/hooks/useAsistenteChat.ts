"use client";

import { useState, useRef, useCallback } from "react";
import type { VecindarioEmpresa } from "@/types/ontologia";

export interface AsistenteMensaje {
  role: "user" | "assistant";
  content: string;
  nombreArchivo?: string;
  grafo?: { nodos: VecindarioEmpresa["nodos"]; aristas: VecindarioEmpresa["aristas"] };
  toolsUsadas?: string[];
  turnoId?: string;
  feedbackDado?: "util" | "no_util";
}

export interface ArchivoAdjunto {
  nombre: string;
  mimeType: string;
  dataBase64: string;
}

export const MIME_TYPES_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const TAMANO_MAXIMO_MB = 10;

function leerArchivoComoBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = lector.result as string;
      // data:<mime>;base64,<datos> — solo se necesita la parte de datos
      resolve(resultado.split(",")[1] ?? "");
    };
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(archivo);
  });
}

// Fase 29 — nombre técnico de tool → frase humana, tanto para el indicador
// en vivo ("consultando X…") como para el pie "Fuente: X" de cada respuesta.
// Sentinel "__pensando__" (sin entrada aquí a propósito) cubre el hueco entre
// que terminan las tools y empieza a llegar texto — antes no había ningún
// indicador en ese tramo, que puede durar 20-30s+ con Gemini.
const NOMBRES_HUMANOS_TOOLS: Record<string, string> = {
  resumen_departamento: "Consultando datos del departamento",
  resumen_municipio: "Consultando datos del municipio",
  buscar_texto_rag: "Consultando informes y documentos",
  buscar_empresa: "Buscando la empresa",
  vecindario_empresa: "Explorando relaciones de la empresa",
  riesgo_atraso_contratos_or: "Calculando riesgo de atraso de contratos",
  listar_proyectos: "Consultando proyectos",
  buscar_metrica: "Consultando catálogo de métricas",
  calidad_datos_ontologia: "Revisando calidad de los datos",
  detalle_recurso: "Consultando detalle de la planta",
  detalle_contrato: "Consultando detalle del contrato",
  predicciones_sector: "Generando predicciones del sector",
  panorama_climatico: "Consultando panorama climático",
  generacion_electrica: "Consultando generación eléctrica",
  hidrologia: "Consultando hidrología",
  demanda_sistema: "Consultando demanda del sistema",
  precio_bolsa: "Consultando precio de bolsa",
  cu_actual: "Consultando costo unitario",
  cu_evolucion: "Analizando evolución del costo unitario",
  perdidas_nt: "Consultando pérdidas no técnicas",
  comunidades_implementadas: "Consultando comunidades energéticas",
  contratos_or_menu: "Consultando contratos OR",
  fenoge_menu: "Consultando FENOGE",
  colombia_solar_menu: "Consultando Colombia Solar",
  supervision_menu: "Consultando supervisión",
  presupuesto_menu: "Consultando presupuesto",
  subsidios_deficit_historico: "Consultando déficit de subsidios",
  subsidios_deuda_total: "Consultando deuda de subsidios",
  subsidios_deuda_empresa: "Consultando deuda por empresa",
  subsidios_deuda_fondo: "Consultando deuda por fondo",
  subsidios_trimestre: "Consultando subsidios del trimestre",
  subsidios_pagado_anio: "Consultando pagos de subsidios",
  subsidios_pct_pagado: "Consultando porcentaje pagado",
  subsidios_resoluciones: "Consultando resoluciones de subsidios",
  subsidios_estado: "Consultando estado de subsidios",
  subsidios_validaciones: "Consultando validaciones de subsidios",
  hidrocarburos_presupuesto: "Consultando presupuesto de hidrocarburos",
  hidrocarburos_produccion: "Consultando producción de hidrocarburos",
  anomalias_detectadas: "Buscando anomalías",
  estado_actual: "Consultando estado del sistema",
  noticias_sector: "Buscando noticias del sector",
  noticias_hidrocarburos: "Buscando noticias de hidrocarburos",
  simulacion: "Simulando escenario",
};

export function nombreHumanoTool(tool: string | null): string {
  if (!tool) return "";
  return NOMBRES_HUMANOS_TOOLS[tool] ?? "Redactando respuesta…";
}

/**
 * Motor compartido del Asistente IA — usado tanto por la página completa
 * /asistente como por el drawer del portal (ChatbotWidget). Cada consumidor
 * mantiene su propia instancia (conversaciones independientes).
 */
export function useAsistenteChat() {
  const [mensajes, setMensajes] = useState<AsistenteMensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [herramientaActiva, setHerramientaActiva] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const seleccionarArchivo = useCallback(async (f: File | null) => {
    setErrorArchivo(null);
    if (!f) return;
    if (!MIME_TYPES_PERMITIDOS.includes(f.type)) {
      setErrorArchivo("Solo se aceptan imágenes (PNG/JPEG/WEBP) o PDF");
      return;
    }
    if (f.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setErrorArchivo(`El archivo supera el máximo de ${TAMANO_MAXIMO_MB}MB`);
      return;
    }
    try {
      const dataBase64 = await leerArchivoComoBase64(f);
      setArchivo({ nombre: f.name, mimeType: f.type, dataBase64 });
    } catch {
      setErrorArchivo("No se pudo leer el archivo");
    }
  }, []);

  // Fase 29: lógica compartida entre enviar() y regenerar() — asume que
  // mensajes ya tiene, como último elemento, el placeholder de asistente
  // vacío a rellenar. `herramientaActiva` arranca con el sentinel
  // "__pensando__" (sin entrada en NOMBRES_HUMANOS_TOOLS, cae al genérico
  // "Redactando respuesta…") para que SIEMPRE haya un indicador visible
  // mientras se espera — antes, el hueco entre que terminan las tools y
  // llega el primer delta (a veces 20-30s+ con Gemini) no mostraba nada.
  const consumirRespuesta = useCallback(
    async (mensajeTexto: string, historial: { role: string; content: string }[], archivoAdjunto: ArchivoAdjunto | null) => {
      setEnviando(true);
      setHerramientaActiva("__pensando__");

      try {
        const res = await fetch("/api/asistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensaje: mensajeTexto || "Analiza este archivo adjunto.",
            historial,
            archivos: archivoAdjunto
              ? [{ mime_type: archivoAdjunto.mimeType, data_base64: archivoAdjunto.dataBase64 }]
              : [],
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Error del servidor (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const toolsUsadas: string[] = [];

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
                if (!toolsUsadas.includes(evento.tool)) toolsUsadas.push(evento.tool);
                setMensajes((prev) => {
                  const copia = [...prev];
                  copia[copia.length - 1] = { ...copia[copia.length - 1], toolsUsadas: [...toolsUsadas] };
                  return copia;
                });
              } else if (evento.grafo?.vecindario) {
                setMensajes((prev) => {
                  const copia = [...prev];
                  copia[copia.length - 1] = {
                    ...copia[copia.length - 1],
                    grafo: {
                      nodos: evento.grafo.vecindario.nodos,
                      aristas: evento.grafo.vecindario.aristas,
                    },
                  };
                  return copia;
                });
              } else if (evento.delta) {
                setHerramientaActiva(null); // ya llega texto real — se apaga el indicador
                setMensajes((prev) => {
                  const copia = [...prev];
                  copia[copia.length - 1] = {
                    ...copia[copia.length - 1],
                    content: copia[copia.length - 1].content + evento.delta,
                  };
                  return copia;
                });
              } else if (evento.error) {
                // Se anexa al contenido ya mostrado en vez de reemplazarlo —
                // si el streaming ya había entregado párrafos reales antes
                // del fallo, no deben desaparecer de la vista del usuario.
                setMensajes((prev) => {
                  const copia = [...prev];
                  const actual = copia[copia.length - 1];
                  copia[copia.length - 1] = {
                    ...actual,
                    content: actual.content
                      ? `${actual.content}\n\n⚠️ ${evento.error}`
                      : `⚠️ ${evento.error}`,
                  };
                  return copia;
                });
              } else if (evento.done && evento.turno_id) {
                setMensajes((prev) => {
                  const copia = [...prev];
                  copia[copia.length - 1] = { ...copia[copia.length - 1], turnoId: evento.turno_id };
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
          const actual = copia[copia.length - 1];
          copia[copia.length - 1] = {
            ...actual,
            content: actual.content
              ? `${actual.content}\n\n⚠️ Se perdió la conexión antes de terminar. Intenta de nuevo.`
              : "⚠️ No se pudo generar la respuesta. Intenta de nuevo.",
          };
          return copia;
        });
        console.error("[Asistente]", err);
      } finally {
        setEnviando(false);
        setHerramientaActiva(null);
      }
    },
    []
  );

  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      if ((!limpio && !archivo) || enviando) return;

      const historial = mensajes.map(({ role, content }) => ({ role, content }));
      const archivoEnviado = archivo;
      setMensajes((prev) => [
        ...prev,
        { role: "user", content: limpio, nombreArchivo: archivoEnviado?.nombre },
        { role: "assistant", content: "" },
      ]);
      setArchivo(null);
      await consumirRespuesta(limpio, historial, archivoEnviado);
    },
    [mensajes, enviando, archivo, consumirRespuesta]
  );

  const regenerar = useCallback(
    async (index: number) => {
      if (enviando) return;
      const pregunta = mensajes[index - 1];
      if (!pregunta || pregunta.role !== "user") return;

      const historial = mensajes.slice(0, index - 1).map(({ role, content }) => ({ role, content }));
      setMensajes((prev) => [...prev.slice(0, index), { role: "assistant", content: "" }]);
      await consumirRespuesta(pregunta.content, historial, null);
    },
    [mensajes, enviando, consumirRespuesta]
  );

  const enviarFeedback = useCallback(
    (index: number, util: boolean) => {
      const mensaje = mensajes[index];
      const pregunta = mensajes[index - 1]?.content ?? "";
      setMensajes((prev) => {
        const copia = [...prev];
        copia[index] = { ...copia[index], feedbackDado: util ? "util" : "no_util" };
        return copia;
      });
      fetch("/api/asistente/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turno_id: mensaje.turnoId,
          pregunta,
          respuesta: mensaje.content,
          util,
          tools_usadas: mensaje.toolsUsadas ?? [],
        }),
      }).catch((err) => console.error("[Asistente] feedback", err));
    },
    [mensajes]
  );

  return {
    mensajes,
    enviando,
    herramientaActiva,
    archivo,
    errorArchivo,
    fileInputRef,
    seleccionarArchivo,
    setArchivo,
    setErrorArchivo,
    enviar,
    regenerar,
    enviarFeedback,
  };
}
