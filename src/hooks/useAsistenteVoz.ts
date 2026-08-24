"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoVoz = "inactivo" | "conectando" | "escuchando" | "respondiendo";

interface UseAsistenteVozResult {
  estado: EstadoVoz;
  error: string | null;
  iniciar: () => Promise<void>;
  detener: () => void;
}

// Tras este tiempo sin recibir audio nuevo, se asume que Gemini terminó de
// responder y se vuelve al indicador visual de "escuchando" — el backend
// (voz_ia_service.py) solo reenvía bytes de audio crudos, sin un mensaje de
// control explícito de "fin de turno", así que esto es una aproximación
// razonable en vez de esperar una señal exacta.
const SILENCIO_FIN_RESPUESTA_MS = 900;

/**
 * Asistente de voz en tiempo real (Fase 20) — puente con
 * server/domain/services/voz_ia_service.py vía WebSocket directo
 * (wss://<dominio>/v1/voz/ws), sin pasar por el BFF de Next.js para el audio
 * en sí (solo el token efímero pasa por /api/voz/token).
 *
 * Captura el micrófono con Web Audio API + AudioWorklet (no MediaRecorder,
 * que da webm/opus comprimido — la Live API necesita PCM16/16kHz crudo) y
 * reproduce el audio de respuesta (PCM16/24kHz) con otro AudioWorklet.
 */
export function useAsistenteVoz(): UseAsistenteVozResult {
  const [estado, setEstado] = useState<EstadoVoz>("inactivo");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const silencioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpiar = useCallback(() => {
    if (silencioTimeoutRef.current) clearTimeout(silencioTimeoutRef.current);
    silencioTimeoutRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    captureCtxRef.current?.close().catch(() => {});
    captureCtxRef.current = null;
    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;
    playbackNodeRef.current = null;
    setEstado("inactivo");
  }, []);

  const detener = useCallback(() => {
    limpiar();
  }, [limpiar]);

  const iniciar = useCallback(async () => {
    setError(null);
    setEstado("conectando");
    try {
      const tokenRes = await fetch("/api/voz/token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("No se pudo obtener el token de sesión");
      const { token } = (await tokenRes.json()) as { token: string };

      // Reproducción — se prepara antes de conectar el WS, para no perder
      // los primeros milisegundos de la respuesta hablada.
      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      await playbackCtx.audioWorklet.addModule("/audio-worklets/pcm-playback-processor.js");
      const playbackNode = new AudioWorkletNode(playbackCtx, "pcm-playback-processor");
      playbackNode.connect(playbackCtx.destination);
      playbackCtxRef.current = playbackCtx;
      playbackNodeRef.current = playbackNode;

      const protocolo = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocolo}//${window.location.host}/v1/voz/ws?token=${token}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onmessage = (evento) => {
        if (!(evento.data instanceof ArrayBuffer)) return;
        setEstado("respondiendo");
        playbackNodeRef.current?.port.postMessage(evento.data, [evento.data]);
        if (silencioTimeoutRef.current) clearTimeout(silencioTimeoutRef.current);
        silencioTimeoutRef.current = setTimeout(() => setEstado("escuchando"), SILENCIO_FIN_RESPUESTA_MS);
      };
      ws.onerror = () => setError("Se perdió la conexión con el asistente de voz");
      ws.onclose = () => limpiar();

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        setTimeout(() => reject(new Error("Tiempo de espera agotado conectando")), 8000);
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      streamRef.current = stream;
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      await captureCtx.audioWorklet.addModule("/audio-worklets/pcm-capture-processor.js");
      const fuente = captureCtx.createMediaStreamSource(stream);
      const captureNode = new AudioWorkletNode(captureCtx, "pcm-capture-processor");
      captureNode.port.onmessage = (evento) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(evento.data);
        }
      };
      fuente.connect(captureNode);
      captureCtxRef.current = captureCtx;

      setEstado("escuchando");
    } catch (err) {
      console.error("[useAsistenteVoz]", err);
      setError(err instanceof Error ? err.message : "No se pudo iniciar la sesión de voz");
      limpiar();
    }
  }, [limpiar]);

  useEffect(() => () => limpiar(), [limpiar]);

  return { estado, error, iniciar, detener };
}
