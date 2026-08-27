import { sendWelcomeTests } from '../src/send-welcome-test.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ready: Boolean(env.RESEND_API_KEY) });
    }

    if (request.method === 'GET' && url.pathname === '/automations') {
      if (!env.WELCOME_TEST_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.WELCOME_TEST_TOKEN}`) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const response = await fetch('https://api.resend.com/automations', {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        return json({ error: result.message || response.statusText }, response.status);
      }

      const automations = (result.data || []).map((automation) => ({
        name: automation.name,
        status: automation.status,
        trigger: automation.steps?.find((step) => step.type === 'trigger')?.config?.event_name || null,
      }));
      return json({ count: automations.length, automations });
    }

    if (request.method !== 'POST' || url.pathname !== '/send') {
      return json({ error: 'Not found' }, 404);
    }

    if (!env.WELCOME_TEST_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.WELCOME_TEST_TOKEN}`) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!env.RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY is unavailable in this test session' }, 503);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const sends = await sendWelcomeTests({
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM,
        meetupImageBase64: body.meetupImageBase64,
      });
      return json({ success: true, sends });
    } catch (error) {
      return json({ error: error.message }, 502);
    }
  },
};
