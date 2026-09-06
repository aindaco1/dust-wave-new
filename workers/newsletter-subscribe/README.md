# Newsletter signup Worker

Newsletter signups are handled via a Cloudflare Worker that adds contacts to [Resend](https://resend.com).

## Architecture

- **Frontend**: Forms in `src/_includes/snippets/footer1.njk` (popup) and `src/newsletter.njk` (full page)
- **Backend**: Cloudflare Worker at `workers/newsletter-subscribe/`
- **Email service**: Resend (contacts added to 'mailchimp' audience)

## Deployment

Worker development and deployment require Node.js 22+ (Wrangler 4).
Run the following from the site repository root:

```bash
cd workers/newsletter-subscribe
npm ci
npx wrangler secret put RESEND_API_KEY  # Full Access key required
npm run deploy
```

## Configuration

- `wrangler.toml` — Worker config with `RESEND_AUDIENCE_ID` and `ALLOWED_ORIGIN`
- Worker URL: `https://dustwave-newsletter.jogo.workers.dev`
- CORS allows the configured origin plus `http://localhost:8080` and
  `http://localhost:3000`. These are the exact development origins in the Worker.

## Signup and welcome-email behavior

The source Worker checks the exact normalized address before creating a contact.
Existing contacts and duplicate-contact races return successfully without
sending a welcome email. A newly created contact queues a welcome message with
a contact-ID-based Resend idempotency key.

Canonical subject, HTML, and plain text live in
[src/welcome-email.js](src/welcome-email.js). The
[welcome-email guide](WELCOME_EMAIL.md) owns the detailed test-send procedure
and follow-up work. Code behavior does not by itself verify provider delivery.

## Testing

From `workers/newsletter-subscribe/`:

```sh
npm ci
npm test
```

Unit tests are separate from `npm run test:welcome-email`, which sends actual
messages to the hard-coded recipients documented in
[WELCOME_EMAIL.md](WELCOME_EMAIL.md#test-safety).

## Files and related guides

- [src/index.js](src/index.js): signup request, contact lookup/creation, and
  welcome dispatch.
- [wrangler.toml](wrangler.toml): entry point and non-secret configuration.
- [package.json](package.json): local scripts and Node/Wrangler requirements.
- [Public footer](../../src/_includes/snippets/footer1.njk) and
  [newsletter page](../../src/newsletter.njk): form markup and submission handlers.
- [Form styles](../../src/scss/themes/base/_style-theme.scss): shared form styling.
- [Site documentation](../../README.md#documentation): development and publishing.
