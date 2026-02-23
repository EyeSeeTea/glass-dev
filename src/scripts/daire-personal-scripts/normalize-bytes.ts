
// src/io/normalize-bytes.ts
export async function toUint8Array(input: unknown): Promise<Uint8Array> {
  // Node Buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return new Uint8Array(input);
  }
  // Uint8Array
  if (input instanceof Uint8Array) return input;
  // ArrayBuffer
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  // Blob/File (browser or Node 18)
  if (input && typeof (input as any).arrayBuffer === 'function') {
    const ab = await (input as Blob).arrayBuffer();
    return new Uint8Array(ab);
  }
  // Path (Node convenience)
  if (typeof input === 'string') {
    const { promises: fs } = await import('node:fs');
    const buf = await fs.readFile(input);
    return new Uint8Array(buf);
  }
  // ArrayBufferView (e.g., DataView, typed arrays)
  if (ArrayBuffer.isView(input) && (input as ArrayBufferView).buffer) {
    const v = input as ArrayBufferView;
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  throw new Error('Unsupported input for toUint8Array()');
}
