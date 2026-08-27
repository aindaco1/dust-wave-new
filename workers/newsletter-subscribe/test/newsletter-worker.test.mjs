import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';

const env = {
  ALLOWED_ORIGIN: 'https://dustwave.xyz',
  RESEND_API_KEY: 'test-key',
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
  assert.deepEqual(JSON.parse(emailCalls[0].body).to, ['new@example.com']);
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
