import test from 'node:test';
import assert from 'node:assert/strict';
import { gifPlayOnce } from '../scripts/gif-play-once.mjs';

const still = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const loop = Buffer.from('21ff0b4e45545343415045322e300301000000', 'hex');
const comment = Buffer.concat([Buffer.from([0x21, 0xfe, loop.length]), loop, Buffer.from([0])]);

test('removes repeat metadata while preserving frames, delays, and other extensions', () => {
  const insertion = 19; // After the logical screen descriptor and global color table.
  const expected = Buffer.concat([still.subarray(0, insertion), comment, still.subarray(insertion)]);
  const repeating = Buffer.concat([expected.subarray(0, insertion), loop, expected.subarray(insertion)]);
  assert.deepEqual(gifPlayOnce(repeating), expected);
  assert.deepEqual(gifPlayOnce(expected), expected);
});

test('also removes the alternate animation loop extension', () => {
  const alternate = Buffer.from(loop);
  alternate.write('ANIMEXTS1.0', 3, 'ascii');
  const repeating = Buffer.concat([still.subarray(0, 19), alternate, still.subarray(19)]);
  assert.deepEqual(gifPlayOnce(repeating), still);
});

test('rejects malformed data instead of publishing a broken image', () => {
  assert.throws(() => gifPlayOnce(Buffer.from('not a gif')), /Invalid GIF/);
  assert.throws(() => gifPlayOnce(still.subarray(0, -3)), /Truncated GIF/);
});
