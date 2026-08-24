// Captura de micrófono para el Asistente de voz (Fase 20) — corre en el
// AudioContext creado con sampleRate: 16000, así que las muestras que llegan
// aquí ya vienen a 16kHz (el navegador resamplea antes de entregarlas al
// worklet) — no hace falta resamplear a mano. Convierte Float32 [-1, 1] a
// Int16 PCM little-endian, que es el formato que espera la Live API de
// Gemini (ver server/domain/services/voz_ia_service.py).
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const canal = inputs[0]?.[0];
    if (canal && canal.length > 0) {
      const pcm16 = new Int16Array(canal.length);
      for (let i = 0; i < canal.length; i++) {
        const s = Math.max(-1, Math.min(1, canal[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
