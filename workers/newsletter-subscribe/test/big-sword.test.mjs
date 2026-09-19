import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';
import { unsubscribeUrl } from '../src/unsubscribe.js';

const env = {
  ALLOWED_ORIGIN: 'https://dustwave.xyz', RESEND_API_KEY: 'fixture', BIG_SWORD_SEGMENT_ID: 'sword-list',
  RESEND_REPLY_TO: 'support@example.com', UNSUBSCRIBE_SECRET: 'fixture-secret', UNSUBSCRIBE_ORIGIN: 'https://dustwave.xyz',
  SIGNUP_RATE_LIMIT: { limit: async () => ({ success: true }) },
};
const payload = { name: 'Test Filmmaker', email: ' TEST@example.com ', interest: 'producing', message: 'Let’s talk.', consent: true };
const request = (body = payload) => new Request('https://worker.example/big-sword', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.ALLOWED_ORIGIN }, body: JSON.stringify(body),
});

async function fixture(run, initial = {}) {
  const state = { contact: null, member: false, calls: [], emailFailure: false, ...initial };
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    assert.equal(init.redirect, 'manual', 'Cloudflare Workers supports manual redirect rejection, not redirect:error');
    const path = new URL(url).pathname;
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    state.calls.push({ path, method, body, headers: init.headers });
    if (path.endsWith('/segments') && method === 'GET') return Response.json({ data: state.member ? [{ id: 'sword-list' }] : [{ id: 'general-list' }], has_more: false });
    if (path.endsWith('/segments/sword-list')) {
      state.member = method === 'POST'; return Response.json({ id: 'sword-list' });
    }
    if (path === '/contacts' && method === 'POST') {
      state.contact = { id: 'contact-id', ...body }; return Response.json({ id: 'contact-id' });
    }
    if (path.startsWith('/contacts/') && method === 'GET') return state.contact ? Response.json(state.contact) : new Response(null, { status: 404 });
    if (path === '/contacts/contact-id' && method === 'PATCH') {
      state.contact = { ...state.contact, ...body, properties: { ...state.contact.properties, ...body.properties } };
      return Response.json({ id: 'contact-id' });
    }
    if (path === '/emails') return state.emailFailure ? Response.json({ error: 'unavailable' }, { status: 503 }) : Response.json({ id: 'email-id' });
    throw new Error(`Unexpected ${method} ${path}`);
  };
  try { await run(state); } finally { globalThis.fetch = original; }
}

test('signup stores the requested fields, joins only Big Sword, and confirms once', async () => {
  await fixture(async (state) => {
    assert.equal((await worker.fetch(request(), env)).status, 200);
    assert.equal(state.member, true);
    assert.equal(state.contact.email, 'test@example.com');
    assert.equal(state.contact.first_name, 'Test');
    assert.equal(state.contact.last_name, 'Filmmaker');
    assert.equal(state.contact.properties.big_sword_interest, 'producing');
    assert.equal(state.contact.properties.big_sword_message, 'Let’s talk.');
    assert.equal(state.contact.properties.big_sword_welcome_sent, 1);
    assert.equal((await worker.fetch(request(), env)).status, 200);
    const emails = state.calls.filter(c => c.path === '/emails');
    assert.equal(emails.length, 1);
    assert.equal(emails[0].headers['Idempotency-Key'], 'big-sword-welcome/v1/contact-id');
    assert.deepEqual(emails[0].body.to, ['test@example.com']);
    assert.equal(emails[0].body.reply_to, 'support@example.com');
    assert.match(emails[0].body.html, /Big Sword/);
    assert.match(emails[0].body.headers['List-Unsubscribe'], /list=big-sword/);
    assert.equal(emails[0].body.headers['Auto-Submitted'], 'auto-generated');
    assert.equal(state.calls.some(c => c.path.includes('/audiences/')), false);
  });
});

test('existing general contacts can join without resetting preferences or unrelated properties', async () => {
  await fixture(async (state) => {
    assert.equal((await worker.fetch(request(), env)).status, 200);
    assert.equal(state.contact.properties.company_name, 'Existing Company');
    assert.equal(state.calls.some(c => c.method === 'PATCH' && Object.hasOwn(c.body, 'unsubscribed')), false);
    assert.equal(state.calls.filter(c => c.path === '/emails').length, 1);
  }, { contact: { id: 'contact-id', email: 'test@example.com', unsubscribed: false, properties: { company_name: 'Existing Company' } } });
});

test('global opt-out is never reset and no welcome is sent', async () => {
  await fixture(async (state) => {
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'unsubscribed');
    assert.equal(state.calls.length, 1);
  }, { contact: { id: 'contact-id', unsubscribed: true } });
});

test('provider property wrappers identify a completed signup without another email', async () => {
  await fixture(async (state) => {
    assert.equal((await worker.fetch(request(), env)).status, 200);
    assert.equal(state.calls.some(c => c.path === '/emails'), false);
  }, { member: true, contact: { id: 'contact-id', unsubscribed: false, properties: { big_sword_welcome_sent: { value: 1, type: 'number' } } } });
});

test('invalid fields, missing consent, malformed JSON, and honeypots never reach Resend', async () => {
  await fixture(async (state) => {
    for (const change of [{ name: '' }, { email: 'bad' }, { interest: 'spam' }, { message: 'x'.repeat(501) }, { consent: false }]) {
      assert.equal((await worker.fetch(request({ ...payload, ...change }), env)).status, 400);
    }
    assert.equal((await worker.fetch(new Request('https://worker.example/big-sword', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), env)).status, 400);
    assert.equal((await worker.fetch(request({ ...payload, website: 'spam' }), env)).status, 200);
    assert.equal(state.calls.length, 0);
  });
});

test('welcome failure is visible and a repeat submission retries the same logical email', async () => {
  await fixture(async (state) => {
    assert.equal((await worker.fetch(request(), env)).status, 503);
    assert.equal(state.member, true);
    assert.equal(state.contact.properties.big_sword_welcome_sent, 0);
    state.emailFailure = false;
    assert.equal((await worker.fetch(request(), env)).status, 200);
    const emails = state.calls.filter(c => c.path === '/emails');
    assert.equal(emails.length, 2);
    assert.deepEqual(emails[0].body, emails[1].body);
    assert.equal(emails[0].headers['Idempotency-Key'], emails[1].headers['Idempotency-Key']);
  }, { emailFailure: true });
});

test('Big Sword unsubscribe is scanner-safe, repeatable, and scoped to its segment', async () => {
  const url = await unsubscribeUrl('contact-id', env, 'big-sword');
  await fixture(async (state) => {
    assert.equal((await worker.fetch(new Request(url), env)).status, 200);
    assert.equal(state.calls.length, 0);
    assert.equal((await worker.fetch(new Request(url.replace('&list=big-sword', '')), env)).status, 400);
    for (let n = 0; n < 2; n++) {
      assert.equal((await worker.fetch(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }), env)).status, 200);
    }
    assert.deepEqual(state.calls.map(c => [c.method, c.path]), [
      ['DELETE', '/contacts/contact-id/segments/sword-list'], ['DELETE', '/contacts/contact-id/segments/sword-list'],
    ]);
  }, { member: true });
});
