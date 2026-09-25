import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { byteRange } from '../src/index.js';

const origin = 'https://dustwave.xyz';
const base = '/big-sword-pitch/';
function setup() {
  const reads = [];
  const env = {
    PITCH_PASSWORD: 'test-only-password', SESSION_SECRET: 'test-only-signing-secret', ASSET_PREFIX: 'exports/test',
    LOGIN_LIMITER: { async limit() { return { success: true }; } },
    PITCH_FILES: {
      async head(key) {
        reads.push(key);
        if (key.endsWith('missing.gif')) return null;
        return { size: 10, httpEtag: '"abc"', writeHttpMetadata(headers) {
          headers.set('Content-Type', 'application/octet-stream');
          headers.set('Cache-Control', 'public, max-age=3600');
        } };
      },
      async get(key, options) {
        reads.push(key);
        let body = '0123456789';
        if (options?.range) body = body.slice(options.range.offset, options.range.offset + options.range.length);
        return { body };
      },
    },
  };
  const fetch = (path = '', init) => worker.fetch(new Request(origin + base + path, init), env);
  const login = (password = env.PITCH_PASSWORD, extra = {}) => fetch('unlock', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...extra }, body: new URLSearchParams({ password }),
  });
  return { env, reads, fetch, login };
}

test('anonymous page shows only the form; asset requests fail before storage access', async () => {
  const { fetch, reads } = setup();
  const page = await fetch();
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /type="password"/);
  assert.doesNotMatch(html, /<script|assets\/|test-only/);
  for (const path of ['assets/header.json', 'assets/slide.pdf', 'assets/movie.mp4', 'assets/player/main.js']) {
    for (const method of ['GET', 'HEAD']) assert.equal((await fetch(path, { method })).status, 401);
  }
  assert.deepEqual(reads, []);
  assert.match(page.headers.get('Cache-Control'), /no-store/);
  assert.match(page.headers.get('X-Robots-Tag'), /noindex/);
  assert.equal(page.headers.get('Referrer-Policy'), 'same-origin');
});

test('wrong password, cross-origin submissions and rate limits cannot unlock', async () => {
  const { login, env, reads } = setup();
  const wrong = await login('wrong');
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.get('Set-Cookie'), null);
  assert.equal((await login(env.PITCH_PASSWORD, { Origin: 'https://example.com' })).status, 403);
  env.LOGIN_LIMITER.limit = async () => ({ success: false });
  assert.equal((await login()).status, 429);
  assert.deepEqual(reads, []);
});

test('valid login uses a secure scoped cookie; tampering and password rotation revoke access', async () => {
  const { login, fetch, env } = setup();
  const result = await login();
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('Location'), base);
  const setCookie = result.headers.get('Set-Cookie');
  assert.match(setCookie, /Path=\/big-sword-pitch\/;.*HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(setCookie, /test-only/);
  const cookie = setCookie.split(';')[0];
  assert.equal(await (await fetch('assets/header.json', { headers: { Cookie: cookie } })).text(), '0123456789');
  assert.equal((await fetch('assets/header.json', { headers: { Cookie: cookie + 'x' } })).status, 401);
  const expired = cookie.replace(/=\d+\./, '=1000000000.');
  assert.equal((await fetch('assets/header.json', { headers: { Cookie: expired } })).status, 401);
  env.PITCH_PASSWORD = 'rotated-test-password';
  assert.equal((await fetch('assets/header.json', { headers: { Cookie: cookie } })).status, 401);
});

test('authenticated video seeking, HEAD, invalid ranges and missing assets', async () => {
  const { login, fetch, reads } = setup();
  const Cookie = (await login()).headers.get('Set-Cookie').split(';')[0];
  const range = await fetch('assets/movie.mp4', { headers: { Cookie, Range: 'bytes=2-5' } });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('Content-Range'), 'bytes 2-5/10');
  assert.equal(range.headers.get('Content-Length'), '4');
  assert.equal(await range.text(), '2345');
  assert.equal(range.headers.get('Cache-Control'), 'private, no-store, no-transform');
  assert.ok(reads.every(key => key.startsWith('exports/test/')));
  const head = await fetch('assets/movie.mp4', { method: 'HEAD', headers: { Cookie, Range: 'bytes=2-5' } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Content-Length'), '10');
  assert.equal(await head.text(), '');
  assert.equal((await fetch('assets/movie.mp4', { headers: { Cookie, Range: 'bytes=99-' } })).status, 416);
  assert.equal((await fetch('assets/missing.gif', { headers: { Cookie } })).status, 404);
  assert.equal((await fetch('assets/movie.mp4', { headers: { Cookie, Range: 'bytes=2-5', 'If-Range': '"outdated"' } })).status, 200);
});

test('routes fail closed on bad paths, missing configuration, oversized forms and unsupported methods', async () => {
  const { fetch, login, env } = setup();
  assert.equal((await worker.fetch(new Request(origin + '/big-sword-pitch-other'), env)).status, 404);
  assert.equal((await worker.fetch(new Request(origin + '/big-sword-pitch'), env)).headers.get('Location'), base);
  assert.equal((await fetch('', { method: 'PUT' })).status, 405);
  assert.equal((await login('x'.repeat(4096))).status, 413);
  const Cookie = (await login()).headers.get('Set-Cookie').split(';')[0];
  assert.equal((await fetch('assets/%2e%2e%2fsecret', { headers: { Cookie } })).status, 400);
  assert.equal((await fetch('assets/%ZZ', { headers: { Cookie } })).status, 400);
  assert.equal((await fetch('private.txt', { headers: { Cookie } })).status, 404);
  delete env.SESSION_SECRET;
  assert.equal((await fetch()).status, 503);
});

test('byte ranges include suffixes and open ends without exceeding the object', () => {
  assert.deepEqual(byteRange('bytes=-3', 10), { offset: 7, length: 3 });
  assert.deepEqual(byteRange('bytes=7-', 10), { offset: 7, length: 3 });
  assert.deepEqual(byteRange('bytes=2-100', 10), { offset: 2, length: 8 });
  for (const value of ['bytes=-0', 'bytes=-', 'bytes=10-', 'bytes=5-2', 'bytes=0-1,4-5']) assert.equal(byteRange(value, 10), null);
});
