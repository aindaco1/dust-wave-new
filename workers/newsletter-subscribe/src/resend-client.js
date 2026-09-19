import { prepareResendEmail } from '../../../shared/dust-wave-platform/packages/worker-core/src/email.js';
import { parseResendRetryAfter } from '../../../shared/dust-wave-platform/packages/worker-core/src/resend.js';

// Retry only explicit throttling; ambiguous transport failures return to the visitor.
export async function requestResend(env, path, { method = 'GET', body, headers = {} } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.resend.com${path}`, {
      method, headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
    if (response.status !== 429 || attempt === 2) return response;
    await response.body?.cancel();
    const seconds = parseResendRetryAfter(response.headers.get('Retry-After'), { maxSeconds: 3 }) || attempt + 1;
    await new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
  }
}

export async function resendJson(env, path, options) {
  const response = await requestResend(env, path, options);
  if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
  return response.json();
}

export async function sendSubscriptionConfirmation({ env, email, from, unsubscribe, idempotencyKey, message }) {
  return resendJson(env, '/emails', {
    method: 'POST', headers: { 'Idempotency-Key': idempotencyKey },
    body: prepareResendEmail({
      from: from || 'Dust Wave <newsletter@dustwave.xyz>', to: [email],
      subject: message.subject, html: message.html, text: message.text,
      headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }, { replyTo: env.RESEND_REPLY_TO }),
  });
}
