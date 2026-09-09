import { hmacSha256, timingSafeEqual } from '../../../shared/dust-wave-platform/packages/worker-core/src/crypto.js';

const PATH = '/newsletter/unsubscribe';
const validId = (value) => /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};
const page = (message, form = '', status = 200) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Newsletter preferences · Dust Wave</title><body style="font:18px/1.6 system-ui;margin:3rem auto;padding:1rem;max-width:36rem;color-scheme:light dark"><main><h1>Dust Wave newsletter</h1><p>${message}</p>${form}</main></body></html>`, { status, headers });

export async function unsubscribeUrl(contactId, env) {
  if (!validId(contactId) || !env.UNSUBSCRIBE_SECRET) throw new Error('Newsletter unsubscribe is unavailable');
  const signature = await hmacSha256(`newsletter-unsubscribe/v1/${contactId}`, env.UNSUBSCRIBE_SECRET);
  const url = new URL(PATH, env.UNSUBSCRIBE_ORIGIN);
  if (url.protocol !== 'https:') throw new Error('Newsletter unsubscribe requires HTTPS');
  url.searchParams.set('token', `${contactId}.${signature}`);
  return url.toString();
}

export async function handleUnsubscribe(request, env) {
  if (new URL(request.url).pathname !== PATH) return null;
  if (!['GET', 'POST'].includes(request.method)) return page('Method not allowed.', '', 405);
  const token = new URL(request.url).searchParams.get('token') || '';
  const parts = token.split('.');
  if (parts.length !== 2 || !validId(parts[0]) || !/^[a-zA-Z0-9_-]{43}$/.test(parts[1]) || !env.UNSUBSCRIBE_SECRET) {
    return page('This unsubscribe link is invalid. Please use the link in your email.', '', 400);
  }
  const [id, signature] = parts;
  const expected = await hmacSha256(`newsletter-unsubscribe/v1/${id}`, env.UNSUBSCRIBE_SECRET);
  if (!timingSafeEqual(signature, expected)) return page('This unsubscribe link is invalid. Please use the link in your email.', '', 400);
  if (request.method === 'GET') {
    // Link scanners can visit GET safely. Only an explicit form or RFC 8058 POST opts out.
    return page('Stop receiving Dust Wave marketing emails? Meeting confirmations and other requested service messages are unaffected.', '<form method="post"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button type="submit">Unsubscribe</button></form>');
  }
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.startsWith('application/x-www-form-urlencoded')) return page('Invalid request.', '', 400);
  if (Number(request.headers.get('Content-Length')) > 128) return page('Invalid request.', '', 400);
  const body = await request.text();
  if (body.length > 128 || new URLSearchParams(body).get('List-Unsubscribe') !== 'One-Click') return page('Invalid request.', '', 400);
  try {
    const response = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ unsubscribed: true }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok && response.status !== 404) return page('We could not save your preference. Please try again.', '', 503);
    return page('You are unsubscribed from Dust Wave marketing emails.');
  } catch {
    return page('We could not save your preference. Please try again.', '', 503);
  }
}
