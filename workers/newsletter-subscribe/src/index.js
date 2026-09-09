import { handleUnsubscribe, unsubscribeUrl } from './unsubscribe.js';
import { createWelcomeEmail } from './welcome-email.js';
import { prepareResendEmail } from '../../../shared/dust-wave-platform/packages/worker-core/src/email.js';

const RESEND_API = 'https://api.resend.com';
const DEFAULT_WELCOME_FROM = 'Dust Wave <newsletter@dustwave.xyz>';

const json = (body, { status = 200, headers = {} } = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...headers, 'Content-Type': 'application/json' },
});

const resendHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

async function resolveAudienceId(env) {
  let audienceId = env.RESEND_AUDIENCE_ID;
  if (!audienceId) throw new Error('Newsletter audience is unavailable');
  if (audienceId.includes('-')) return audienceId;

  const response = await fetch(`${RESEND_API}/audiences`, {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  if (!response.ok) throw new Error('Failed to fetch audiences');

  const { data: audiences = [] } = await response.json();
  const audience = audiences.find((item) => item.name.toLowerCase() === audienceId.toLowerCase());
  if (!audience) throw new Error(`Audience "${audienceId}" not found`);
  return audience.id;
}

async function findContact(audienceId, email, apiKey) {
  const response = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to check newsletter subscription');
  return response.json();
}

async function createContact(audienceId, email, apiKey) {
  const response = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: resendHeaders(apiKey),
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  const result = await response.json().catch(() => ({}));

  if (response.status === 409 || result.message?.toLowerCase().includes('already exists')) {
    return { created: false, contact: result };
  }
  if (!response.ok) throw new Error(result.message || 'Failed to subscribe');
  return { created: true, contact: result };
}

async function sendWelcomeEmail({ apiKey, contactId, email, from, replyTo, unsubscribe }) {
  const { html, subject, text } = createWelcomeEmail({ unsubscribeUrl: unsubscribe });
  const response = await fetch(`${RESEND_API}/emails`, {
    method: 'POST',
    headers: {
      ...resendHeaders(apiKey),
      'Idempotency-Key': `newsletter-welcome/${contactId}`,
    },
    body: JSON.stringify(prepareResendEmail({
      from: from || DEFAULT_WELCOME_FROM,
      to: [email],
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribe}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }, { replyTo })),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Failed to send newsletter welcome');
  return result;
}

export default {
  async fetch(request, env, context) {
    const unsubscribeResponse = await handleUnsubscribe(request, env);
    if (unsubscribeResponse) return unsubscribeResponse;
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [env.ALLOWED_ORIGIN, 'http://localhost:8080', 'http://localhost:3000'];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : env.ALLOWED_ORIGIN;
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    try {
      if (origin && !allowedOrigins.includes(origin)) return json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders });
      if (!env.SIGNUP_RATE_LIMIT) return json({ error: 'Signup temporarily unavailable' }, { status: 503, headers: corsHeaders });
      const limited = await env.SIGNUP_RATE_LIMIT.limit({ key: `newsletter-signup:${request.headers.get('CF-Connecting-IP') || 'local'}` });
      if (!limited.success) return json({ error: 'Please wait a minute before trying again.' }, { status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } });
      const { email: submittedEmail } = await request.json();
      const email = normalizeEmail(submittedEmail);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: 'Valid email required' }, { status: 400, headers: corsHeaders });
      }

      const audienceId = await resolveAudienceId(env);
      const existingContact = await findContact(audienceId, email, env.RESEND_API_KEY);
      if (existingContact) {
        return json({ success: true, status: 'existing', message: "You're already subscribed!" }, { headers: corsHeaders });
      }

      if (!env.UNSUBSCRIBE_SECRET || !env.UNSUBSCRIBE_ORIGIN) throw new Error('Newsletter unsubscribe is unavailable');
      const { created, contact } = await createContact(audienceId, email, env.RESEND_API_KEY);
      if (!created) {
        return json({ success: true, status: 'existing', message: "You're already subscribed!" }, { headers: corsHeaders });
      }

      if (!contact.id) throw new Error('Newsletter contact was created without an ID');

      const welcome = sendWelcomeEmail({
        apiKey: env.RESEND_API_KEY,
        contactId: contact.id,
        email,
        from: env.RESEND_FROM,
        replyTo: env.RESEND_REPLY_TO,
        unsubscribe: await unsubscribeUrl(contact.id, env),
      }).catch((error) => console.error('Newsletter welcome failed', error));

      if (context?.waitUntil) context.waitUntil(welcome);
      else await welcome;

      return json({ success: true, status: 'new', message: 'Thanks for subscribing!' }, { headers: corsHeaders });
    } catch (error) {
      return json({ error: error.message || 'Something went wrong' }, { status: 500, headers: corsHeaders });
    }
  },
};
