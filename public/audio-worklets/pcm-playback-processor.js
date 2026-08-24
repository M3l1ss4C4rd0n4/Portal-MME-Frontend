// Reproducción de la voz de Gemini (Fase 20) — corre en un AudioContext
// creado con sampleRate: 24000 (la Live API responde audio PCM16 a 24kHz,
// ver server/domain/services/voz_ia_service.py). Encola los chunks Int16 que
// van llegando por el WebSocket y los reproduce en orden, sin cortes, para
// que sonido de frases consecutivas no se sienta entrecortado.
class PcmPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._cola = [];
    this._offset = 0;
    this.port.onmessage = (evento) => {
      if (evento.data === "flush") {
        this._cola = [];
        this._offset = 0;
        return;
      }
      this._cola.push(new Int16Array(evento.data));
    };
  }

  process(_inputs, outputs) {
    const salida = outputs[0][0];
    if (!salida) return true;

    for (let i = 0; i < salida.length; i++) {
      if (this._cola.length === 0) {
        salida[i] = 0;
        continue;
      }
      const actual = this._cola[0];
      salida[i] = actual[this._offset] / 0x8000;
      this._offset++;
      if (this._offset >= actual.length) {
        this._cola.shift();
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-playback-processor", PcmPlaybackProcessor);
