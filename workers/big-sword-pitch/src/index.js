const BASE = '/big-sword-pitch';
const COOKIE = '__Secure-big_sword_pitch';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();

function response(body, status = 200, extra = {}) {
  const headers = new Headers(extra);
  const securityHeaders = {
    'Cache-Control': 'private, no-store, no-transform',
    'CDN-Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    // Keep the Origin header on a same-origin form POST; no-referrer makes it null.
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  };
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  return new Response(body, { status, headers });
}

function gate(message = '', status = 200) {
  return response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:,">
<title>Big Sword — Pitch</title><style>
*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#090909;color:#f4f0e8;font:16px/1.5 system-ui,sans-serif;padding:24px}main{width:min(100%,360px)}h1{font-size:36px;line-height:1.1;margin:0 0 16px}p{color:#b9b7b2;margin:0 0 28px}label{display:block;margin-bottom:8px}input,button{font:inherit;width:100%;border-radius:6px;padding:12px 14px}input{background:#171717;color:#fff;border:1px solid #666}input:focus-visible,button:focus-visible{outline:3px solid #d7bf83;outline-offset:3px}button{border:0;background:#f4f0e8;color:#111;font-weight:600;cursor:pointer;margin-top:16px}.error{color:#ffc7bc;margin:16px 0 0}.error:empty{display:none}
</style></head><body><main><h1>Big Sword</h1><p>Enter the password to view the pitch.</p>
<form method="post" action="${BASE}/unlock"><label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" autofocus aria-describedby="error">
<p id="error" class="error" role="alert">${message}</p><button type="submit">View presentation</button></form>
</main></body></html>`, status, { 'Content-Type': 'text/html; charset=utf-8' });
}

async function sessionKey(env) {
  return crypto.subtle.importKey('raw', encoder.encode(`${env.SESSION_SECRET}:${env.PITCH_PASSWORD}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function validSession(request, env) {
  const cookie = request.headers.get('Cookie')?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!cookie || !/^\d{10}\.[a-f0-9]{64}$/.test(cookie)) return false;
  const [expires, signature] = cookie.split('.');
  const now = Math.floor(Date.now() / 1000);
  if (Number(expires) <= now || Number(expires) > now + SESSION_SECONDS) return false;
  return crypto.subtle.verify('HMAC', await sessionKey(env),
    Uint8Array.from(signature.match(/../g), byte => parseInt(byte, 16)), encoder.encode(expires));
}

async function passwordMatches(input, expected) {
  const [a, b] = await Promise.all([input, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function unlock(request, env) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return response('Forbidden', 403);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded')) return response('Unsupported form', 415);
  const limited = await env.LOGIN_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!limited.success) return gate('Too many attempts. Please try again in a minute.', 429);
  // Bound the body even if Content-Length is absent or misleading.
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (!reader) return gate('Please enter the password.', 400);
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2048) { await reader.cancel(); return response('Form too large', 413); }
    chunks.push(value);
  }
  const input = new URLSearchParams(await new Blob(chunks).text()).get('password') || '';
  if (input.length > 256 || !await passwordMatches(input, env.PITCH_PASSWORD)) return gate('That password is incorrect. Please try again.', 401);
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signature = hex(await crypto.subtle.sign('HMAC', await sessionKey(env), encoder.encode(expires)));
  return response(null, 303, {
    Location: `${BASE}/`,
    'Set-Cookie': `${COOKIE}=${expires}.${signature}; Path=${BASE}/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  });
}

export function byteRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || !size) return null;
  const offset = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= size || end < offset) return null;
  return { offset, length: end - offset + 1 };
}

async function asset(request, env, relativePath) {
  const key = `${env.ASSET_PREFIX}/${relativePath}`;
  const meta = await env.PITCH_FILES.head(key);
  if (!meta) return response('Not found', 404);
  const headers = new Headers();
  meta.writeHttpMetadata(headers);
  headers.set('ETag', meta.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  let range;
  const requestedRange = request.headers.get('Range');
  const ifRange = request.headers.get('If-Range');
  if (request.method === 'GET' && requestedRange && (!ifRange || ifRange === meta.httpEtag)) {
    range = byteRange(requestedRange, meta.size);
    if (!range) return response(null, 416, { 'Content-Range': `bytes */${meta.size}` });
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${meta.size}`);
  }
  headers.set('Content-Length', String(range ? range.length : meta.size));
  if (request.method === 'HEAD') return response(null, 200, Object.fromEntries(headers));
  const object = await env.PITCH_FILES.get(key, range ? { range } : undefined);
  if (!object) return response('Not found', 404);
  return response(object.body, range ? 206 : 200, Object.fromEntries(headers));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return response('Not found', 404);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:';
      return response(null, 308, { Location: url.toString() });
    }
    if (!env.PITCH_PASSWORD || !env.SESSION_SECRET || !env.LOGIN_LIMITER || !env.ASSET_PREFIX) return response('Presentation unavailable', 503);
    if (url.pathname === `${BASE}/unlock` && request.method === 'POST') return unlock(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) return response('Method not allowed', 405, { Allow: 'GET, HEAD' });
    if (url.pathname === BASE) return response(null, 308, { Location: `${BASE}/${url.search}` });
    const isPage = url.pathname === `${BASE}/` || url.pathname === `${BASE}/index.html`;
    if (!await validSession(request, env)) {
      if (!isPage) return response('Password required', 401);
      const page = gate();
      return request.method === 'HEAD' ? new Response(null, page) : page;
    }
    let path;
    try { path = decodeURIComponent(url.pathname.slice(BASE.length + 1)) || 'index.html'; }
    catch { return response('Invalid path', 400); }
    if (path.includes('\\') || path.includes('\0') || path.split('/').some(part => part === '.' || part === '..')) return response('Invalid path', 400);
    if (path !== 'index.html' && !path.startsWith('assets/')) return response('Not found', 404);
    return asset(request, env, path);
  },
};
