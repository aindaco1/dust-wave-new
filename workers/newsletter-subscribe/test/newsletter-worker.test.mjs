import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';
import { unsubscribeUrl } from '../src/unsubscribe.js';
import { createWelcomeEmail } from '../src/welcome-email.js';

const env = {
  ALLOWED_ORIGIN: 'https://dustwave.xyz',
  SIGNUP_RATE_LIMIT: { limit: async () => ({ success: true }) },
  RESEND_API_KEY: 'test-key',
  RESEND_REPLY_TO: 'support@example.com',
  UNSUBSCRIBE_SECRET: 'newsletter-signature-fixture',
  UNSUBSCRIBE_ORIGIN: 'https://dustwave.xyz',
  RESEND_AUDIENCE_ID: 'audience-id',
};

const signup = (email) => new Request('https://worker.example/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://dustwave.xyz' },
  body: JSON.stringify({ email }),
});

const withMockFetch = async (mock, run) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('an existing subscriber never receives a welcome email', async () => {
  const calls = [];
  await withMockFetch(async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return Response.json({ id: 'existing-contact', email: 'member@example.com' });
  }, async () => {
    const tasks = [];
    const response = await worker.fetch(signup('member@example.com'), env, { waitUntil: (task) => tasks.push(task) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'existing');
    assert.equal(tasks.length, 0);
  });

  assert.deepEqual(calls, [{
    url: 'https://api.resend.com/audiences/audience-id/contacts/member%40example.com',
    method: 'GET',
  }]);
});

test('a brand-new subscriber receives exactly one welcome email', async () => {
  const calls = [];
  await withMockFetch(async (url, options = {}) => {
    const call = { url: String(url), method: options.method || 'GET', headers: options.headers, body: options.body };
    calls.push(call);
    if (call.method === 'GET') return new Response(null, { status: 404 });
    if (call.url.endsWith('/contacts')) return Response.json({ id: 'new-contact' });
    if (call.url.endsWith('/emails')) return Response.json({ id: 'welcome-email' });
    throw new Error(`Unexpected request: ${call.method} ${call.url}`);
  }, async () => {
    const tasks = [];
    const response = await worker.fetch(signup(' NEW@Example.com '), env, { waitUntil: (task) => tasks.push(task) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'new');
    assert.equal(tasks.length, 1);
    await Promise.all(tasks);
  });

  const emailCalls = calls.filter((call) => call.url.endsWith('/emails'));
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].headers['Idempotency-Key'], 'newsletter-welcome/new-contact');
  const unsubscribe = await unsubscribeUrl('new-contact', env);
  const { html, subject, text } = createWelcomeEmail({ unsubscribeUrl: unsubscribe });
  assert.deepEqual(JSON.parse(emailCalls[0].body), {
    html, subject, text,
    from: 'Dust Wave <newsletter@dustwave.xyz>',
    to: ['new@example.com'],
    reply_to: 'support@example.com',
    headers: { 'Auto-Submitted': 'auto-generated', 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  assert.equal(calls.some((call) => /\/contacts(?:\?|$)/.test(call.url) && call.method === 'GET'), false);
});

test('a duplicate-contact race fails closed without sending', async () => {
  const calls = [];
  await withMockFetch(async (url, options = {}) => {
    const call = { url: String(url), method: options.method || 'GET' };
    calls.push(call);
    if (call.method === 'GET') return new Response(null, { status: 404 });
    return Response.json({ message: 'Contact already exists' }, { status: 409 });
  }, async () => {
    const tasks = [];
    const response = await worker.fetch(signup('member@example.com'), env, { waitUntil: (task) => tasks.push(task) });
    assert.equal((await response.json()).status, 'existing');
    assert.equal(tasks.length, 0);
  });

  assert.equal(calls.some((call) => call.url.endsWith('/emails')), false);
});

test('unsubscribe GET is scanner-safe and signed one-click POST persists the opt-out', async () => {
  const url = await unsubscribeUrl('new-contact', env);
  const calls = [];
  await withMockFetch(async (target, init) => {
    calls.push({ target, init });
    return Response.json({ id: 'new-contact' });
  }, async () => {
    const landing = await worker.fetch(new Request(url), env);
    assert.equal(landing.status, 200);
    assert.match(await landing.text(), /<form method="post">/);
    assert.equal(calls.length, 0);
    const post = () => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
    assert.equal((await worker.fetch(post(), env)).status, 200);
    assert.equal((await worker.fetch(post(), env)).status, 200);
  });
  assert.equal(calls.length, 2);
  for (const { target, init } of calls) {
    assert.equal(target, 'https://api.resend.com/contacts/new-contact');
    assert.equal(init.method, 'PATCH');
    assert.deepEqual(JSON.parse(init.body), { unsubscribed: true });
  }
});

test('unsubscribe rejects changed recipients and reports provider failure without a false success', async () => {
  const url = await unsubscribeUrl('new-contact', env);
  let calls = 0;
  await withMockFetch(async () => { calls++; return new Response(null, { status: 503 }); }, async () => {
    const forged = url.replace('new-contact', 'another-contact');
    assert.equal((await worker.fetch(new Request(forged), env)).status, 400);
    assert.equal(calls, 0);
    const response = await worker.fetch(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }), env);
    assert.equal(response.status, 503);
    assert.match(await response.text(), /could not save/);
  });
});

test('signup rate limits and foreign origins stop before contacting Resend', async () => {
  await withMockFetch(async () => { throw new Error('Provider must not be called'); }, async () => {
    const limitedEnv = { ...env, SIGNUP_RATE_LIMIT: { limit: async () => ({ success: false }) } };
    const response = await worker.fetch(signup('new@example.com'), limitedEnv);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '60');
    const foreign = signup('new@example.com');
    foreign.headers.set('Origin', 'https://untrusted.example');
    assert.equal((await worker.fetch(foreign, env)).status, 403);
  });
});
