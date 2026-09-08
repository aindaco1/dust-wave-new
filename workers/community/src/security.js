import { randomToken, sha256Hex, timingSafeEqual, getCookie } from '@dustwave/worker-core/crypto';
import { SECURITY_HEADERS, normalizeOrigin } from '@dustwave/worker-core/http';
import { verifyTurnstile } from '@dustwave/worker-core/turnstile';
import { API, fail, email, locale } from './domain.js';
import { rateLimit } from './repository.js';

const SESSION_COOKIE = 'dw_community_session';
export function siteOrigin(env) { return normalizeOrigin(env.SITE_BASE) || 'https://dustwave.xyz'; }
export function localMode(env) {
  return env.APP_MODE === 'local' && ['localhost','127.0.0.1'].includes(new URL(siteOrigin(env)).hostname);
}
export function headers(extra = {}) {
  return { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...extra };
}
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: headers({ 'Content-Type': 'application/json; charset=utf-8', ...extra }) });
}
export function verifyOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== siteOrigin(env)) fail('origin_denied', 403);
}
export async function boundedBytes(request, max) {
  const size = request.headers.get('Content-Length');
  if (size && (!/^\d+$/u.test(size) || Number(size) > max)) fail('file_too_large', 413);
  if (!request.body) fail('empty_body');
  const reader = request.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > max) { await reader.cancel(); fail('file_too_large', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
export async function bodyJson(request, max = 32768) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail('invalid_content_type', 415);
  let value;
  try { value = JSON.parse(new TextDecoder().decode(await boundedBytes(request, max))); }
  catch (error) { if (error.code) throw error; fail('invalid_json'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_json');
  return value;
}
export async function challenge(request, env, token, action) {
  if (localMode(env) && env.LOCAL_CHALLENGE_BYPASS === 'true') return;
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) fail('challenge_not_configured', 503);
  // The pinned helper owns provider transport/action verification. The consumer
  // owns widget hostnames, with a dedicated site-restricted widget at provisioning.
  const result = await verifyTurnstile(request, { ...env, COMMUNITY_CHALLENGE_REQUIRED: 'true' }, token, { action, requiredEnvName: 'COMMUNITY_CHALLENGE_REQUIRED' });
  if (!result.ok) fail(result.code, result.status);
}
export async function requestLimit(request, env, scope, count, seconds) {
  const ip = request.headers.get('CF-Connecting-IP') || (localMode(env) ? 'local' : 'unknown');
  await rateLimit(env.COMMUNITY_DB, `${scope}:${await sha256Hex(ip)}`, count, seconds);
}
export function admins(env) {
  return String(env.COMMUNITY_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
export async function requireAdmin(request, env, { csrf = true } = {}) {
  let token = '';
  try { token = getCookie(request, SESSION_COOKIE); } catch { fail('unauthorized', 401); }
  if (!token || token.length > 256) fail('unauthorized', 401);
  const session = await env.COMMUNITY_DB.prepare('SELECT * FROM community_sessions WHERE hash=? AND expires_at>?').bind(await sha256Hex(token), Date.now()).first();
  if (!session || !admins(env).includes(session.email)) fail('unauthorized', 401);
  if (csrf && !['GET','HEAD'].includes(request.method)) {
    verifyOrigin(request, env);
    if (!timingSafeEqual(request.headers.get('x-dustwave-csrf'), session.csrf)) fail('csrf_failed', 403);
  }
  return session;
}
function cookie(token, env, age) {
  return `${SESSION_COOKIE}=${token}; Path=${API}/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${localMode(env) ? '' : '; Secure'}`;
}
export async function authRoute(request, env, route) {
  if (route === '/admin/session' && request.method === 'GET') {
    const session = await requireAdmin(request, env);
    return json({ email: session.email, csrfToken: session.csrf });
  }
  if (route === '/admin/logout' && request.method === 'POST') {
    const session = await requireAdmin(request, env);
    await env.COMMUNITY_DB.prepare('DELETE FROM community_sessions WHERE hash=?').bind(session.hash).run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', env, 0) });
  }
  if (route === '/admin/auth/start' && request.method === 'POST') {
    verifyOrigin(request, env); const data = await bodyJson(request);
    const address = email(data.email);
    await requestLimit(request, env, 'login', 8, 900);
    await rateLimit(env.COMMUNITY_DB, `email:${await sha256Hex(address)}`, 3, 900);
    await challenge(request, env, data.turnstileToken, 'community_login');
    if (!admins(env).length || (!env.EMAIL && !localMode(env))) fail('login_unavailable', 503);
    if (admins(env).includes(address)) {
      const token = randomToken(); const hash = await sha256Hex(token);
      await env.COMMUNITY_DB.prepare('INSERT INTO community_auth_tokens(hash,email,expires_at) VALUES (?,?,?)').bind(hash, address, Date.now()+900000).run();
      const lang = locale(data.preferredLanguage);
      const url = `${siteOrigin(env)}${lang === 'es' ? '/es' : ''}/admin/community/#magic-link=${token}`;
      if (localMode(env)) {
        // Only explicit loopback local mode exposes a test login; never log tokens.
        return json({ ok: true, localLoginUrl: url });
      }
      try {
        const sent = await env.EMAIL.send({
          from: { email: env.LOGIN_FROM, name: 'Dust Wave Community' }, to: address,
          subject: lang === 'es' ? 'Tu enlace de acceso a Dust Wave' : 'Your Dust Wave Community sign-in link',
          text: `${lang === 'es' ? 'Accede a Community admin. El enlace caduca en 15 minutos.' : 'Sign in to Community admin. This link expires in 15 minutes.'}\n\n${url}\n\n${lang === 'es' ? 'Si no lo solicitaste, ignora este mensaje.' : 'If you did not request this, ignore this message.'}`
        });
        if (!sent?.messageId) throw new Error('email_not_accepted');
      } catch {
        await env.COMMUNITY_DB.prepare('DELETE FROM community_auth_tokens WHERE hash=?').bind(hash).run();
        fail('login_unavailable', 503);
      }
    }
    return json({ ok: true });
  }
  if (route === '/admin/auth/exchange' && request.method === 'POST') {
    verifyOrigin(request, env); await requestLimit(request, env, 'exchange', 15, 900);
    const data = await bodyJson(request);
    if (typeof data.token !== 'string' || data.token.length > 256) fail('invalid_login', 401);
    const hash = await sha256Hex(data.token);
    const row = await env.COMMUNITY_DB.prepare('DELETE FROM community_auth_tokens WHERE hash=? AND expires_at>? RETURNING email').bind(hash, Date.now()).first();
    if (!row || !admins(env).includes(row.email)) fail('invalid_login', 401);
    const token = randomToken(); const csrf = randomToken();
    await env.COMMUNITY_DB.prepare('INSERT INTO community_sessions(hash,email,csrf,expires_at) VALUES (?,?,?,?)')
      .bind(await sha256Hex(token), row.email, csrf, Date.now()+43200000).run();
    return json({ email: row.email, csrfToken: csrf }, 200, { 'Set-Cookie': cookie(token, env, 43200) });
  }
  return null;
}
