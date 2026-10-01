import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { sha256Hex } from '@dustwave/worker-core/crypto';
import { createApp } from '../src/app.js';
import { loadState, commitState } from '../src/repository.js';
import { scriptEmailStatements, drainScriptEmails, EMAIL_CRON } from '../src/script-emails.js';
import { migrateFixture } from './fixtures.mjs';

const origin = 'http://localhost:8787';
const admins = [{ email: 'admin@example.test', role: 'super_admin' }, { email: 'limited@example.test', role: 'limited_admin' }];
async function fixture(t) {
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{ name: 'script-email-test', modules: true,
    script: 'export default {fetch(){return new Response("fixture")}}', compatibilityDate: '2026-09-07', d1Databases: ['COMMUNITY_DB'] }] }));
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('COMMUNITY_DB');
  await migrateFixture(db);
  await db.prepare('UPDATE community_admin_directory SET users=? WHERE id=1').bind(JSON.stringify(admins)).run();
  const env = { SITE_BASE: origin, APP_MODE: 'local', LOCAL_CHALLENGE_BYPASS: 'true', COMMUNITY_DB: db,
    SCRIPT_EMAILS_ENABLED: 'true', RESEND_API_KEY: 'fixture-only', RESEND_FROM: 'Group <sender@example.test>', RESEND_REPLY_TO: 'reply@example.test' };
  const app = createApp({ card: async () => '/fixture.png' });
  let auth = {};
  async function call(path, body, { authenticated = false, ctx } = {}) {
    return app.fetch(new Request(`${origin}/api/community/v1${path}`, { method: body ? 'POST' : 'GET',
      headers: { Origin: origin, 'Content-Type': 'application/json', ...(authenticated ? auth : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) }), env, ctx);
  }
  async function ok(path, body, options) {
    const response = await call(path, body, options), data = await response.json();
    assert(response.ok, JSON.stringify(data)); return data;
  }
  const login = await ok('/admin/auth/start', { email: admins[0].email });
  const exchanged = await call('/admin/auth/exchange', { token: new URL(login.localLoginUrl).hash.slice('#magic-link='.length) });
  auth = { Cookie: exchanged.headers.get('set-cookie').split(';')[0], 'x-dustwave-csrf': (await exchanged.json()).csrfToken };
  async function submission(fields = {}, kind = 'pdf') {
    const uploadId = crypto.randomUUID(), uploadToken = crypto.randomUUID();
    await db.prepare("INSERT INTO community_uploads(id,token_hash,kind,state,data,expires_at) VALUES (?,?,?,'ready',?,?)")
      .bind(uploadId, await sha256Hex(uploadToken), kind, JSON.stringify({ pages: 12, fileKey: 'private/fixture.pdf' }), Date.now() + 3600000).run();
    return { title: 'A <script> & a story', author: 'María Writer', contactName: 'Private Contact', email: 'writer@example.test',
      local: true, consent: true, language: 'es', submissionKey: crypto.randomUUID(), uploadId, uploadToken, ...fields };
  }
  const jobs = async () => (await db.prepare('SELECT * FROM community_email_outbox ORDER BY kind,recipient').all()).results;
  const state = () => loadState(db);
  const action = async (id, action, fields = {}) => ok('/admin/actions', { kind: 'script', id, action, revision: (await state()).revision, ...fields }, { authenticated: true });
  const drain = options => drainScriptEmails({ ...env, APP_MODE: 'production' }, options);
  return { db, env, app, call, ok, submission, jobs, state, action, drain };
}

test('public receipt, all admin notices and first approval commit atomically and retain the writer language', async t => {
  const f = await fixture(t), body = await f.submission({ source: 'admin' });
  const receipt = await f.ok('/scripts', body);
  assert.deepEqual(await f.ok('/scripts', body), receipt);
  let jobs = await f.jobs();
  assert.equal(jobs.length, 3);
  assert.deepEqual(jobs.filter(j => j.kind === 'admin').map(j => j.recipient), admins.map(a => a.email));
  const writer = JSON.parse(jobs.find(j => j.kind === 'received').payload);
  assert.equal(writer.subject, 'Recibimos tu guion | Dust Wave');
  assert.equal(writer.reply_to, 'reply@example.test');
  assert.equal(writer.headers['Auto-Submitted'], 'auto-generated');
  assert(!jobs.some(j => j.payload.includes(body.uploadToken) || j.payload.includes('private/fixture.pdf')));
  assert.equal((await f.state()).scripts[0].source, 'public', 'the caller cannot impersonate an admin-created script');
  await f.action(receipt.id, 'approve', { preview: true });
  assert.equal((await f.jobs()).length, 3, 'preview never queues an approval');
  const revision = (await f.state()).revision;
  await f.action(receipt.id, 'approve');
  assert.equal((await f.call('/admin/actions', { kind: 'script', action: 'approve', id: receipt.id, revision }, { authenticated: true })).status, 409);
  await f.action(receipt.id, 'approve');
  await f.action(receipt.id, 'requeue');
  jobs = await f.jobs();
  assert.equal(jobs.length, 4, 'repeat approval, stale retries and requeue do not email again');
  assert.match(JSON.parse(jobs.find(j => j.kind === 'approved').payload).text, /\/es\/writers-group.html#readings/);
  assert(!JSON.stringify(await f.ok('/meetings')).includes('writer@example.test'));

  const original = await f.state(), next = structuredClone(original);
  next.scripts[0].title = 'Uncommitted edit';
  const extra = await scriptEmailStatements(f.env, 'received', { ...next.scripts[0], email: 'phantom@example.test' });
  await assert.rejects(commitState(f.db, original, next, { extra: [...extra, () => f.db.prepare('INSERT INTO nonexistent_table VALUES (1)')] }));
  assert.deepEqual(await f.state(), original, 'a failed D1 batch rolls back the script');
  assert.equal((await f.jobs()).length, 4, 'a failed D1 batch rolls back its email jobs');
});

test('concurrent submission retries create one receipt and one set of emails; validation failures create none', async t => {
  const f = await fixture(t), body = await f.submission({ language: 'en' });
  const invalid = await f.call('/scripts', { ...body, consent: false });
  assert.equal(invalid.status, 400); assert.equal((await f.jobs()).length, 0);
  const responses = await Promise.all([f.call('/scripts', body), f.call('/scripts', body)]);
  assert(responses.some(r => r.status === 201));
  assert(responses.every(r => [200, 201, 409].includes(r.status)));
  assert.equal((await f.state()).scripts.length, 1); assert.equal((await f.jobs()).length, 3);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM community_receipts').first()).n, 1);
  assert.match(JSON.parse((await f.jobs()).find(j => j.kind === 'received').payload).subject, /We received/);
});

test('admin additions and retired event proposals do not send script mail; legacy pending scripts can receive first approval', async t => {
  const f = await fixture(t);
  const adminBody = await f.submission({ revision: (await f.state()).revision });
  const created = await f.ok('/admin/scripts', adminBody, { authenticated: true });
  await f.action(created.id, 'approve');
  const event = await f.submission({ date: '2026-10-01', time: '19:00', description: 'Event proposal' }, 'image');
  assert.equal((await f.call('/events', event)).status,410);
  assert.equal((await f.jobs()).length, 0);
  const original = await f.state(), next = structuredClone(original);
  const legacy = { ...next.scripts[0], id: crypto.randomUUID(), status: 'pending', approvedAt: '' };
  delete legacy.source; delete legacy.language;
  next.scripts.push(legacy); await commitState(f.db, original, next);
  await f.action(legacy.id, 'approve');
  assert.equal((await f.jobs()).length, 1);
  assert.match(JSON.parse((await f.jobs())[0].payload).subject, /Your script is approved/);
});

test('the full 100-user directory is included without dropping the writer receipt', async t => {
  const f = await fixture(t);
  const users = Array.from({ length: 100 }, (_, i) => ({ email: `admin${i}@example.test`, role: i ? 'limited_admin' : 'super_admin' }));
  await f.db.prepare('UPDATE community_admin_directory SET users=? WHERE id=1').bind(JSON.stringify(users)).run();
  await f.ok('/scripts', await f.submission());
  const jobs = await f.jobs();
  assert.equal(jobs.length, 101); assert.equal(jobs.filter(j => j.kind === 'admin').length, 100);
  assert.equal(new Set(jobs.map(j => j.id)).size, 101);
});

test('delivery is per recipient, claims survive concurrent dispatch and accepted jobs never resend', async t => {
  const f = await fixture(t); await f.ok('/scripts', await f.submission());
  const requests = [];
  const fetcher = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails'); requests.push(init);
    return Response.json({ id: `provider-${requests.length}` });
  };
  await Promise.all([f.drain({ fetcher }), f.drain({ fetcher })]);
  assert.equal(requests.length, 3); assert.equal(new Set(requests.map(r => r.headers['Idempotency-Key'])).size, 3);
  assert(requests.every(r => JSON.parse(r.body).to.length === 1));
  assert((await f.jobs()).every(j => j.status === 'accepted' && j.attempts === 1 && j.provider_id));
  await f.drain({ fetcher }); assert.equal(requests.length, 3);
});

test('network failures preserve the frozen payload and key; a retry can finish without changing the saved submission', async t => {
  const f = await fixture(t); const receipt = await f.ok('/scripts', await f.submission());
  await f.db.prepare("DELETE FROM community_email_outbox WHERE kind='admin'").run();
  let time = Date.now(), requests = [];
  const first = await f.state();
  await f.drain({ now: () => time, fetcher: async (_url, init) => { requests.push(init); throw new TypeError('fixture lost response'); } });
  let job = (await f.jobs())[0];
  assert.equal(job.status, 'pending'); assert.equal(job.ambiguous, 1);
  assert.deepEqual(await f.state(), first, 'email failure cannot undo the saved script');
  await f.action(receipt.id, 'edit', { fields: { title: 'Edited title', author: 'Writer' } });
  await f.drain({ now: () => time, fetcher: () => assert.fail('not due yet') });
  time = job.next_attempt_at;
  f.env.RESEND_FROM = 'Changed <changed@example.test>';
  await f.drain({ now: () => time, fetcher: async (_url, init) => { requests.push(init); return Response.json({ id: 'accepted-retry' }); } });
  assert.equal(requests[0].body, requests[1].body); assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
  job = (await f.jobs())[0]; assert.equal(job.status, 'accepted'); assert.equal(job.attempts, 2);
});

test('rate limiting honors Retry-After, permanent errors stop, and changed idempotency payloads need reconciliation', async t => {
  for (const [status, name, expected] of [[429, 'rate_limit_exceeded', 'pending'], [400, 'validation_error', 'failed'], [409, 'invalid_idempotent_request', 'uncertain']]) {
    await t.test(String(status), async t => {
      const f = await fixture(t); await f.ok('/scripts', await f.submission());
      await f.db.prepare("DELETE FROM community_email_outbox WHERE kind='admin'").run();
      const time = Date.now();
      await f.drain({ now: () => time, fetcher: async () => Response.json({ name }, { status, headers: { 'Retry-After': '3600' } }) });
      const job = (await f.jobs())[0]; assert.equal(job.status, expected);
      if (status === 429) assert.equal(job.next_attempt_at, time + 3600000);
      else await f.drain({ fetcher: () => assert.fail('terminal error must not retry') });
    });
  }
});

test('lost leases retry with the same key inside the window and become uncertain outside it', async t => {
  const f = await fixture(t); await f.ok('/scripts', await f.submission());
  await f.db.prepare("DELETE FROM community_email_outbox WHERE kind='admin'").run();
  const time = Date.now(), job = (await f.jobs())[0];
  await f.db.prepare("UPDATE community_email_outbox SET status='sending',first_attempt_at=?,attempts=1,lease_until=? WHERE id=?")
    .bind(time - 120000, time - 1, job.id).run();
  await f.drain({ now: () => time, fetcher: async (_url, init) => {
    assert.equal(init.headers['Idempotency-Key'], job.id); return Response.json({ id: 'recovered' });
  } });
  assert.equal((await f.jobs())[0].status, 'accepted');
  await f.db.prepare("UPDATE community_email_outbox SET status='sending',first_attempt_at=?,attempts=1,lease_until=? WHERE id=?")
    .bind(time - 24 * 3600000, time - 1, job.id).run();
  await f.drain({ now: () => time, fetcher: () => assert.fail('expired deduplication window') });
  assert.equal((await f.jobs())[0].status, 'uncertain');
});

test('removed admins, changed contacts and withdrawn approvals are checked before delivery', async t => {
  const f = await fixture(t), receipt = await f.ok('/scripts', await f.submission());
  await f.action(receipt.id, 'approve');
  await f.action(receipt.id, 'withdraw');
  await f.db.prepare('UPDATE community_admin_directory SET users=? WHERE id=1').bind(JSON.stringify([admins[0]])).run();
  const requests = [];
  await f.drain({ fetcher: async (_url, init) => { requests.push(JSON.parse(init.body)); return Response.json({ id: 'fixture' }); } });
  let jobs = await f.jobs();
  assert.equal(jobs.find(j => j.recipient === admins[1].email).last_error, 'admin_removed');
  assert.equal(jobs.find(j => j.kind === 'approved').last_error, 'approval_withdrawn');
  assert.equal(requests.length, 2);
  const another = await f.ok('/scripts', await f.submission());
  await f.action(another.id, 'edit', { fields: { title: 'Corrected', author: 'Writer', email: 'corrected@example.test' } });
  await f.drain({ fetcher: async () => Response.json({ id: 'admin-only' }) });
  jobs = await f.jobs();
  assert.equal(jobs.find(j => j.record_id === another.id && j.kind === 'received').last_error, 'recipient_changed');
});

test('local mode, missing keys and staging recipient restrictions cannot leak test messages', async t => {
  const f = await fixture(t); await f.ok('/scripts', await f.submission());
  const fetcher = () => assert.fail('unexpected email');
  await drainScriptEmails(f.env, { fetcher });
  await drainScriptEmails({ ...f.env, APP_MODE: 'production', RESEND_API_KEY: '' }, { fetcher });
  assert((await f.jobs()).every(j => j.attempts === 0));
  await drainScriptEmails({ ...f.env, APP_MODE: 'staging' }, { fetcher });
  assert((await f.jobs()).every(j => j.status === 'cancelled' && j.last_error === 'staging_recipient_blocked'));
  await f.app.scheduled({ cron: EMAIL_CRON }, f.env); // No R2 binding: fast email ticks must not run daily cleanup.
});

test('eight failed attempts stop automatically and ambiguous success responses are never labelled accepted', async t => {
  const f = await fixture(t); await f.ok('/scripts', await f.submission());
  await f.db.prepare("DELETE FROM community_email_outbox WHERE kind='admin'").run();
  let time = Date.now();
  for (let attempt = 1; attempt <= 8; attempt++) {
    await f.drain({ now: () => time, fetcher: async () => new Response('not-json', { status: 200 }) });
    const job = (await f.jobs())[0]; assert.equal(job.attempts, attempt);
    assert.equal(job.status, attempt === 8 ? 'uncertain' : 'pending'); time = job.next_attempt_at;
  }
  await f.drain({ fetcher: () => assert.fail('attempt limit') });
});
