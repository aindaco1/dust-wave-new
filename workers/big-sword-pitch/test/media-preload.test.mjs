import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installMediaPreloader } from '../scripts/media-preload.mjs';

function setup() {
  const requests = [], revoked = [], listeners = {};
  let scheduled;
  class MediaURL extends URL {
    static createObjectURL(blob) { return `blob:${blob.name}`; }
    static revokeObjectURL(url) { revoked.push(url); }
  }
  const context = vm.createContext({
    window: {}, document: { baseURI: 'https://example.com/big-sword-pitch/' },
    URL: MediaURL, AbortController,
    setTimeout(fn) { scheduled = fn; }, clearTimeout() { scheduled = null; },
    addEventListener(name, fn) { listeners[name] = fn; },
    fetch(url, options) {
      return new Promise((resolve, reject) => {
        requests.push({ url, options, finish: () => resolve({ ok: true, blob: async () => ({ name: url }) }), reject });
        options.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    },
  });
  vm.runInContext(`(${installMediaPreloader.toString()})([[],['a.gif','b.silent.mp4','c.gif'],['d.gif'],[],[],[]])`, context);
  return { cache: context.window.__pitchMedia, requests, revoked, listeners, run: () => scheduled() };
}

test('preloads the next slide with two requests and reuses authenticated bytes', async () => {
  const { cache, requests, run } = setup();
  cache.warm(0);
  const pending = run();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.credentials, 'same-origin');
  requests[0].finish(); requests[1].finish();
  await new Promise(setImmediate);
  assert.equal(requests.length, 3);
  requests[2].finish(); await pending;
  assert.equal(cache.source('a.gif'), 'blob:https://example.com/big-sword-pitch/a.gif');
  cache.warm(1);
  assert.equal(cache.source('b.silent.mp4'), 'blob:https://example.com/big-sword-pitch/b.silent.mp4');
  assert.equal(requests.length, 3, 'Using a prefetched source must not download it again');
});

test('fast jumps abort incomplete duplicates and discard distant cached media', async () => {
  const { cache, requests, run, revoked } = setup();
  cache.warm(0);
  const pending = run();
  requests[0].finish(); await new Promise(setImmediate);
  assert.equal(cache.source('b.silent.mp4'), 'b.silent.mp4');
  assert.equal(requests[1].options.signal.aborted, true);
  cache.warm(4);
  await pending;
  assert.ok(revoked.includes('blob:https://example.com/big-sword-pitch/a.gif'));
  assert.equal(cache.source('a.gif'), 'a.gif');
  assert.equal(requests[2].options.signal.aborted, true);
});

test('failed prefetch falls back and page exit releases blobs', async () => {
  const { cache, requests, run, revoked, listeners } = setup();
  cache.warm(0);
  const pending = run();
  requests[0].reject(new Error('offline')); requests[1].finish();
  await new Promise(setImmediate);
  requests[2].finish(); await pending;
  assert.equal(cache.source('a.gif'), 'a.gif');
  listeners.pagehide();
  assert.equal(revoked.length, 2);
  assert.equal(cache.source('b.silent.mp4'), 'b.silent.mp4');
});
