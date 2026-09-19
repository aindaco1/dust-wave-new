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
git submodule update --init --recursive
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
- [src/resend-client.js](src/resend-client.js): shared provider requests and
  confirmation dispatch for general and project signups and unsubscribe actions.
- [wrangler.toml](wrangler.toml): entry point and non-secret configuration.
- [package.json](package.json): local scripts and Node/Wrangler requirements.
- [Public footer](../../src/_includes/snippets/footer1.njk) and
  [newsletter page](../../src/newsletter.njk): form markup and submission handlers.
- [Form styles](../../src/scss/themes/base/_style-theme.scss): shared form styling.
- [Site documentation](../../README.md#documentation): development and publishing.

## Big Sword project list

The bilingual `/project/big-sword.html` page uses the same Worker at
`POST /big-sword`. It subscribes visitors only to the **Big Sword** Resend segment,
configured by `BIG_SWORD_SEGMENT_ID`; it does not join the general newsletter or
send an administrator notification. The project form requires name, email,
one of the seven interest categories, and explicit signup consent. An optional
message is limited to 500 characters. The shared origin and edge rate limits
apply, with additional field/body validation and a honeypot.

All three public signup surfaces use
[`newsletter-signup.js`](../../src/js/newsletter-signup.js) and the shared
localized copy snippet. The form supplies its endpoint and fields; validation,
busy state, duplicate-submit protection, error preservation and success feedback
stay in one controller. Run `node --test tests/newsletter-signup.test.mjs` from
the repository root to exercise the real markup for all three in both languages.

The current global Resend Contacts API stores the name plus the custom
`big_sword_interest` and `big_sword_message` properties. Existing unrelated
properties, segment memberships, and global opt-outs are preserved. A globally
unsubscribed contact is directed to the support address instead of silently
resubscribing them to every list.

[big-sword-email.js](src/big-sword-email.js) is the canonical HTML/plain-text
confirmation, sent through Resend with the existing sender domain and reply-to.
`big_sword_welcome_sent` records provider acceptance. A failed send returns a
retryable error and remains pending; another form submission retries with the
same Resend idempotency key. A completed signup sends no additional welcome.
Resend's idempotency window is 24 hours; if the email succeeds but saving its
delivery marker fails for longer than that, a later retry may send it again.
There is no background delivery queue for this project flow.

Big Sword welcome emails use the existing signed unsubscribe endpoint with
`list=big-sword` included in the signature scope. GET is scanner-safe and POST
removes only the Big Sword segment membership. Existing general-newsletter
unsubscribe links retain their original global opt-out behavior.

For future Big Sword broadcasts, select **Big Sword** as the recipient segment.
Do not select `mailchimp`, `General`, or all contacts. The signup confirmation is
automatic; deploying the Worker does not send a broadcast. Local tests mock
Resend. Provider checks use only the documented `delivered+label@resend.dev`
simulation addresses and remove those test subscriptions using their signed
unsubscribe links afterwards. Simulated delivery is separate from real-inbox
acceptance.

## Delivery defaults

The welcome dispatcher uses the pinned Platform email helper. `RESEND_REPLY_TO` points to the existing Dust Wave support address; `Auto-Submitted: auto-generated` identifies the automatic message. The canonical subject and main message remain unchanged; the existing optional unsubscribe footer is now populated and checked by the new-subscriber fixture. Existing-contact and duplicate-contact protections remain in place. No broadcast is sent by deploying this change.

Platform 0.36.0 is pinned by the root contract. The previous platform pin is `2e79a8d70cb6d30805ea141e53d32f9387441756`. Once an unsubscribe link has been issued, preserve the opt-out endpoint and its signing secret during rollback; disable new welcome sends instead of breaking existing opt-out links. The website and Community Worker deploy independently. See [the shared guide](https://github.com/aindaco1/dust-wave-platform/blob/main/docs/email-deliverability.md) for authentication, suppression, tracking and recipient verification.

## Unsubscribe and signup protection

`UNSUBSCRIBE_SECRET` is a stable random Worker secret; `UNSUBSCRIBE_ORIGIN` supplies the branded URL at `https://dustwave.xyz/newsletter/unsubscribe`. HMAC-signed links contain a contact ID, not an email address. The existing welcome template adds its original opt-out footer and the sender supplies RFC 8058 one-click headers. GET only shows a confirmation; an explicit form or one-click POST sets the contact's global Resend marketing opt-out. It does not stop transactional mail. Provider errors return a retryable failure page rather than reporting success. Keep the signing key stable for old links.

This uses Resend's current [global contact unsubscribe API](https://resend.com/docs/api-reference/contacts/update-contact), which applies to all Broadcasts, not only the legacy audience. The confirmation page states that scope. No existing contacts are changed during deployment or testing.

Public signup rejects foreign browser origins and uses a Cloudflare edge limit of 20 requests per minute per connecting IP before provider calls. This is a coarse abuse limit, not identity verification or a globally strict counter; its generous allowance accommodates shared networks. Existing-contact checks prevent repeated welcome sends. Unit fixtures cover throttling, forged opt-out tokens, scanner-safe GET, repeated POST and provider failures.
