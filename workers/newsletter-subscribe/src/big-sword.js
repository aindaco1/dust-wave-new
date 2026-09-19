import { requestResend as resend, resendJson as checked, sendSubscriptionConfirmation } from './resend-client.js';
import { unsubscribeUrl } from './unsubscribe.js';
import { createBigSwordEmail } from './big-sword-email.js';

const interests = new Set(['financing', 'producing', 'cast-crew', 'distribution', 'press', 'updates', 'other']);
const validText = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);

async function lookup(env, email) {
  const response = await resend(env, `/contacts/${encodeURIComponent(email)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Resend lookup failed (${response.status})`);
  return response.json();
}

async function isMember(env, id) {
  let after = '';
  do {
    const list = await checked(env, `/contacts/${encodeURIComponent(id)}/segments?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`);
    if (list.data?.some((segment) => segment.id === env.BIG_SWORD_SEGMENT_ID)) return true;
    const next = list.has_more ? list.data?.at(-1)?.id : '';
    if (list.has_more && (!next || next === after)) throw new Error('Incomplete segment lookup');
    after = next;
  } while (after);
  return false;
}

export async function subscribeBigSword(request, env, corsHeaders) {
  const reply = (body, status = 200) => Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  if (!env.RESEND_API_KEY || !env.BIG_SWORD_SEGMENT_ID || !env.UNSUBSCRIBE_SECRET || !env.UNSUBSCRIBE_ORIGIN) {
    return reply({ code: 'unavailable' }, 503);
  }
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ code: 'invalid' }, 415);
  if (Number(request.headers.get('Content-Length')) > 8192) return reply({ code: 'invalid' }, 413);
  let data;
  try {
    const raw = await request.text();
    if (raw.length > 8192) return reply({ code: 'invalid' }, 413);
    data = JSON.parse(raw);
  } catch { return reply({ code: 'invalid' }, 400); }
  if (!data || typeof data !== 'object') return reply({ code: 'invalid' }, 400);
  if (data.website) return reply({ success: true });
  if (!validText(data.name, 100, true) || !validText(data.email, 254, true)
      || !interests.has(data.interest) || !validText(data.message ?? '', 500) || data.consent !== true) {
    return reply({ code: 'invalid' }, 400);
  }
  const email = data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ code: 'invalid' }, 400);
  const [first_name, ...rest] = data.name.trim().split(/\s+/);
  const details = { first_name, last_name: rest.join(' '), properties: {
    big_sword_interest: data.interest, big_sword_message: (data.message || '').trim(),
  } };
  try {
    let contact = await lookup(env, email);
    if (!contact) {
      const response = await resend(env, '/contacts', { method: 'POST', body: { email, ...details, unsubscribed: false } });
      if (!response.ok && response.status !== 409) throw new Error(`Resend create failed (${response.status})`);
      // Re-read after creation or a duplicate race: never override another signup's opt-out.
      contact = await lookup(env, email);
    }
    if (!contact?.id) throw new Error('Contact lookup missing ID');
    if (contact.unsubscribed) return reply({ code: 'unsubscribed' }, 409);
    const path = `/contacts/${encodeURIComponent(contact.id)}`;
    const member = await isMember(env, contact.id);
    const welcomeProperty = contact.properties?.big_sword_welcome_sent;
    const welcomeSent = welcomeProperty?.value ?? welcomeProperty;
    const needsWelcome = !member || welcomeSent !== 1;
    // Only these project fields and the supplied name change; other lists/preferences remain intact.
    await checked(env, path, { method: 'PATCH', body: {
      ...details, ...(!member ? { properties: { ...details.properties, big_sword_welcome_sent: 0 } } : {}),
    } });
    if (!member) await checked(env, `${path}/segments/${env.BIG_SWORD_SEGMENT_ID}`, { method: 'POST' });
    if (needsWelcome) {
      const unsubscribe = await unsubscribeUrl(contact.id, env, 'big-sword');
      const emailContent = createBigSwordEmail({ unsubscribeUrl: unsubscribe });
      await sendSubscriptionConfirmation({ env, email, unsubscribe,
        from: 'Big Sword · Dust Wave <newsletter@dustwave.xyz>',
        idempotencyKey: `big-sword-welcome/v1/${contact.id}`, message: emailContent,
      });
      await checked(env, path, { method: 'PATCH', body: { properties: { big_sword_welcome_sent: 1 } } });
    }
    return reply({ success: true });
  } catch (error) {
    // Log stage/status only, never form content or provider bodies.
    console.error('Big Sword signup incomplete:', error.message);
    return reply({ code: 'unavailable' }, 503);
  }
}
