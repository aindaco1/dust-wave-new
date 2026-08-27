import { createWelcomeEmail } from './welcome-email.js';

export const WELCOME_TEST_RECIPIENTS = Object.freeze([
  'alonso@hey.com',
  'alonso@dustwave.xyz',
]);

export async function sendWelcomeTests({
  apiKey,
  from = 'Dust Wave <newsletter@dustwave.xyz>',
  meetupImageBase64 = '',
}) {
  if (!apiKey) throw new Error('RESEND_API_KEY is required. No email was sent.');

  const { html, subject, text } = createWelcomeEmail({
    meetupImageUrl: meetupImageBase64 ? 'cid:dust-wave-meetup' : undefined,
  });
  const attachments = meetupImageBase64
    ? [{
        content: meetupImageBase64,
        content_type: 'image/jpeg',
        content_id: 'dust-wave-meetup',
        filename: 'dust-wave-meetup.jpg',
      }]
    : undefined;
  const sends = [];

  for (const to of WELCOME_TEST_RECIPIENTS) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[TEST] ${subject}`,
        html,
        text,
        ...(attachments ? { attachments } : {}),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Resend rejected the test for ${to}: ${result.message || response.statusText}`);
    }

    sends.push({ to, id: result.id || 'accepted' });
  }

  return sends;
}
