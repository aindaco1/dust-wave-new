# Dust Wave newsletter welcome email

Status: sent once to brand-new subscribers through the public signup route.

The canonical subject, HTML, and plain-text versions live in `src/welcome-email.js`. Before creating a contact, the public Worker checks the exact submitted address. Existing contacts and duplicate-contact races return successfully without sending. Only a successfully created contact queues a welcome email, and that request uses the new contact ID as its Resend idempotency key.

The public route never lists or iterates the audience, so deploying this code cannot send the welcome email to the existing subscriber list.

## Test safety

`npm run test:welcome-email` sends separate test messages only to:

- `alonso@hey.com`
- `alonso@dustwave.xyz`

The recipients are hard-coded in `src/send-welcome-test.js`; both test entry points call that one shared sender and never read or send to the newsletter audience.

The command requires `RESEND_API_KEY` in the shell. It uses `Dust Wave <newsletter@dustwave.xyz>` by default; set `RESEND_FROM` only if a different verified sender is required.

`scripts/welcome-test-worker.js` provides the same hard-limited test through an authenticated, ephemeral Wrangler preview when the local shell does not have the production secret. It is a separate entry point and is never deployed by the Worker’s normal `npm run deploy` command.

The normal signup route now supplies the template’s existing unsubscribe footer and RFC 8058 one-click headers. A signed branded endpoint persists the opt-out with Resend; see [configuration and rollback](README.md#unsubscribe-and-signup-protection). Standalone preview/test sends still omit a real subscriber-specific link. Spanish-language signup selection remains future work.
