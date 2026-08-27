import { sendWelcomeTests } from '../src/send-welcome-test.js';

const apiKey = process.env.RESEND_API_KEY;
const sends = await sendWelcomeTests({
  apiKey,
  from: process.env.RESEND_FROM,
});

for (const send of sends) {
  console.log(`Welcome test sent to ${send.to}: ${send.id}`);
}
