// Remove only the GIF loop application extension. Frame data, timing, palette,
// and final frame stay byte-for-byte intact; no image re-encoding is involved.
export function gifPlayOnce(input) {
  if (!['GIF87a', 'GIF89a'].includes(input.toString('ascii', 0, 6)) || input.length < 13) {
    throw new Error('Invalid GIF header');
  }
  let offset = 13 + (input[10] & 128 ? 3 * 2 ** ((input[10] & 7) + 1) : 0);
  let copied = 0;
  const parts = [];
  const requireBytes = count => {
    if (offset + count > input.length) throw new Error('Truncated GIF');
  };
  const skipBlocks = () => {
    for (;;) {
      requireBytes(1);
      const size = input[offset++];
      requireBytes(size);
      offset += size;
      if (!size) return;
    }
  };
  for (;;) {
    requireBytes(1);
    const start = offset;
    const type = input[offset++];
    if (type === 0x3b) break;
    if (type === 0x21) {
      requireBytes(2);
      const label = input[offset++];
      const length = input[offset];
      requireBytes(length + 1);
      const application = input.toString('ascii', offset + 1, offset + 1 + length);
      skipBlocks();
      if (label === 0xff && ['NETSCAPE2.0', 'ANIMEXTS1.0'].includes(application)) {
        parts.push(input.subarray(copied, start));
        copied = offset;
      }
    } else if (type === 0x2c) {
      requireBytes(9);
      const packed = input[offset + 8];
      offset += 9 + (packed & 128 ? 3 * 2 ** ((packed & 7) + 1) : 0);
      requireBytes(1);
      offset++; // LZW minimum code size.
      skipBlocks();
    } else {
      throw new Error(`Unexpected GIF block ${type}`);
    }
  }
  parts.push(input.subarray(copied));
  return Buffer.concat(parts);
}
