registerProcessor("pcm-websocket", class extends AudioWorkletProcessor {
  process (inputs, outputs, parameters) {
    const input = inputs[0][0];
    const buffer = new ArrayBuffer(input.length * 2);
    const output = new DataView(buffer);

    for (let i = 0, offset = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    this.port.postMessage(new DataView(buffer));

    return true;
  }

  constructor() {
    super();
    this.buffer = new ArrayBuffer(16000 * 20 *1);
  }
});
