import { createOutboxJobId, outboxRetryDelayMs } from '@dustwave/worker-core/outbox';
import { prepareResendEmail } from '@dustwave/worker-core/email';
import { classifyResendFailure } from '@dustwave/worker-core/resend';
import { locale } from './domain.js';
import { loadUsers, findAdmin } from './users.js';
import { localMode, siteOrigin } from './security.js';

export const EMAIL_CRON = '*/5 * * * *';
const MAX_ATTEMPTS = 8;
// Leave a margin inside Resend's 24-hour idempotency window.
const RETRY_WINDOW = 23 * 60 * 60 * 1000;
const LEASE_MS = 60 * 1000;

export function scriptEmail(env, kind, script, recipient) {
  const es = kind !== 'admin' && locale(script.language) === 'es';
  const readings = `${siteOrigin(env)}${es ? '/es' : ''}/writers-group.html#readings`;
  const details = es
    ? `Guion: ${script.title}\nAutoría: ${script.author}\nPáginas: ${script.pages}\nReferencia: ${script.id}`
    : `Script: ${script.title}\nAuthor: ${script.author}\nPages: ${script.pages}\nReference: ${script.id}`;
  let subject, text;
  if (kind === 'received') {
    subject = es ? 'Recibimos tu guion | Dust Wave' : 'We received your script | Dust Wave';
    text = es
      ? `Gracias por enviar tu guion al Grupo de Guion de Dust Wave. Guardamos tu envío y tu PDF privado.\n\n${details}\n\nRevisamos los envíos antes de añadirlos a la lista de lecturas. Te enviaremos otro correo cuando tu guion sea aprobado. Este recibo no confirma una fecha de lectura.\n\nPuedes responder a este correo si tienes preguntas.`
      : `Thanks for submitting your script to Dust Wave Writers Group. Your submission and private PDF are saved.\n\n${details}\n\nWe review submissions before adding them to the reading queue. We'll email you again when your script is approved. This receipt does not confirm a reading date.\n\nYou can reply to this email with any questions.`;
  } else if (kind === 'approved') {
    subject = es ? 'Tu guion fue aprobado | Dust Wave' : 'Your script is approved | Dust Wave';
    text = es
      ? `Tu guion fue aprobado y añadido a la lista de lecturas del Grupo de Guion de Dust Wave.\n\n${details}\n\nConsulta la programación actual aquí:\n${readings}\n\nLas fechas pueden cambiar si se ajusta el orden de lectura o las reuniones. Consulta la programación antes de asistir. Tu PDF sigue siendo privado.\n\nPuedes responder a este correo si tienes preguntas.`
      : `Your script has been approved and added to the Dust Wave Writers Group reading queue.\n\n${details}\n\nSee the current reading schedule here:\n${readings}\n\nDates may change when the queue or meetings are adjusted. Please check the schedule before attending. Your PDF remains private.\n\nYou can reply to this email with any questions.`;
  } else if (kind === 'admin') {
    subject = 'New script submission | Dust Wave';
    text = `A new script is ready for review in Dust Wave Community admin.\n\n${details}\n\nOpen the Script queue to review the submission and its private PDF:\n${siteOrigin(env)}/admin/community/\n\nSign in with your Community admin email. The PDF is available only in the authenticated admin area.`;
  } else throw new Error('invalid_script_email');
  return prepareResendEmail({
    from: env.RESEND_FROM || 'Dust Wave Writers Group <community@dustwave.xyz>',
    to: [recipient], subject, text
  }, { replyTo: env.RESEND_REPLY_TO || 'info@dustwave.xyz' });
}

// Return guarded statements for the existing atomic domain commit. No provider
// requests occur here. One permanent job ID per event/record/recipient also
// protects against duplicate actions after the provider's deduplication window.
export async function scriptEmailStatements(env, kind, script, now = Date.now()) {
  if (env.SCRIPT_EMAILS_ENABLED !== 'true' || script.source === 'admin') return [];
  const recipients = kind === 'admin'
    ? (await loadUsers(env.COMMUNITY_DB)).users.filter(user => ['super_admin', 'limited_admin'].includes(user.role)).map(user => user.email)
    : [script.email].filter(Boolean);
  return Promise.all([...new Set(recipients)].map(async recipient => {
    const key = await createOutboxJobId({ kind: `community-script-${kind}`, dedupeKey: `${script.id}/${recipient}` });
    const payload = JSON.stringify(scriptEmail(env, kind, script, recipient));
    return ({ guard, revision, mutation }) => env.COMMUNITY_DB.prepare(
      `INSERT INTO community_email_outbox(id,kind,record_id,recipient,payload,created_at,next_attempt_at)
       SELECT ?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING`
    ).bind(key, kind, script.id, recipient, payload, now, now, revision, mutation);
  }));
}

async function cancellationReason(env, job) {
  if (env.APP_MODE === 'staging') {
    const allowed = String(env.SCRIPT_EMAIL_TEST_RECIPIENTS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(job.recipient)) return 'staging_recipient_blocked';
  }
  const row = await env.COMMUNITY_DB.prepare("SELECT data FROM community_records WHERE kind='script' AND id=?").bind(job.record_id).first();
  if (!row) return 'script_removed';
  const script = JSON.parse(row.data);
  if (job.kind === 'admin') return await findAdmin(env.COMMUNITY_DB, job.recipient) ? '' : 'admin_removed';
  if (script.email !== job.recipient) return 'recipient_changed';
  if (job.kind === 'approved' && script.status !== 'approved') return 'approval_withdrawn';
  return '';
}

export async function drainScriptEmails(env, { fetcher = fetch, now = Date.now, maxJobs = 20 } = {}) {
  // Even accidentally copied production credentials cannot send from local mode.
  if (env.SCRIPT_EMAILS_ENABLED !== 'true' || localMode(env) || !env.RESEND_API_KEY) return;
  const db = env.COMMUNITY_DB, started = now();
  const due = await db.prepare(
    `SELECT id FROM community_email_outbox WHERE (status='pending' AND next_attempt_at<=?)
     OR (status='sending' AND lease_until<=?) ORDER BY created_at,id LIMIT ?`
  ).bind(started, started, maxJobs).all();
  for (const candidate of due.results) {
    if (now() - started >= 20000) break;
    const time = now(), lease = crypto.randomUUID();
    const job = await db.prepare(
      `UPDATE community_email_outbox SET ambiguous=CASE WHEN status='sending' THEN 1 ELSE ambiguous END,
       status='sending',lease_token=?,lease_until=?
       WHERE id=? AND ((status='pending' AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?)) RETURNING *`
    ).bind(lease, time + LEASE_MS, candidate.id, time, time).first();
    if (!job) continue;
    const finish = (status, error = '', provider = '', nextAttempt = 0, ambiguous = job.ambiguous) => db.prepare(
      `UPDATE community_email_outbox SET status=?,last_error=?,provider_id=?,next_attempt_at=?,ambiguous=?,lease_until=0,lease_token=''
       WHERE id=? AND lease_token=?`
    ).bind(status, error, provider, nextAttempt, ambiguous, job.id, lease).run();
    if (job.first_attempt_at !== null && (time - job.first_attempt_at >= RETRY_WINDOW || job.attempts >= MAX_ATTEMPTS)) {
      await finish(job.ambiguous ? 'uncertain' : 'failed', 'retry_limit');
      continue;
    }
    const reason = await cancellationReason(env, job);
    if (reason) { await finish(job.ambiguous ? 'uncertain' : 'cancelled', reason); continue; }
    const attempt = job.attempts + 1;
    await db.prepare('UPDATE community_email_outbox SET attempts=?,first_attempt_at=COALESCE(first_attempt_at,?) WHERE id=? AND lease_token=?')
      .bind(attempt, time, job.id, lease).run();
    let response, result, failure;
    try {
      response = await fetcher('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.id },
        body: job.payload, signal: AbortSignal.timeout(10000)
      });
      result = await response.json().catch(() => null);
      if (response.ok && typeof result?.id === 'string' && result.id) {
        await finish('accepted', '', result.id);
        continue;
      }
      failure = response.ok ? { retryable: true, ambiguous: true, retryAfterSeconds: 0 }
        : classifyResendFailure(response.status, { retryAfter: response.headers.get('Retry-After'), nowMs: time });
      // Only a request already in flight is a retryable 409. A changed payload
      // under an existing key must be reconciled, never resent with another key.
      if (response.status === 409 && result?.name !== 'concurrent_idempotent_requests') failure = { ...failure, retryable: false, ambiguous: true };
    } catch {
      failure = classifyResendFailure(0);
    }
    const ambiguous = job.ambiguous || Number(failure.ambiguous);
    const delay = Math.max(60000, outboxRetryDelayMs(failure, attempt - 1));
    const next = now() + delay, first = job.first_attempt_at ?? time;
    const retry = failure.retryable && attempt < MAX_ATTEMPTS && next - first < RETRY_WINDOW;
    await finish(retry ? 'pending' : ambiguous ? 'uncertain' : 'failed', response ? `provider_${response.status}` : 'network_error', '', retry ? next : 0, ambiguous);
    // Avoid hammering the account after provider rate limiting or an outage.
    if (failure.retryable) break;
  }
}

export async function deliverScriptEmails(env) {
  try { await drainScriptEmails(env); }
  catch { console.error('community_script_email_dispatch_failed'); }
}
