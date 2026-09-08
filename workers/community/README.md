# Community calendar and Writers Group

This independently deployed Worker serves the Microcinema calendar, Writers
Group agendas, submissions, and `/admin/community/` API. Eleventy owns the
English/Spanish page shells; the Worker injects fresh public markup and month
metadata into their versioned `data-community-slot="1"` slots.

Both pages use the same meeting records. Approved scripts fill two slots per
meeting in queue order. The recurring anchor is September 21, 2026, every
other Monday from 19:00–21:00 in `America/Denver`. A daily trigger extends the
materialized schedule six months ahead. A cancelled or rescheduled record is
preserved; started agendas retain title/author snapshots. Only future meetings
are reallocated. Admin reordering previews dates before an atomic revision
check commits the queue and agendas together.

## Shared code

The repository's immutable Platform pin supplies Worker Core crypto, cookies,
time-zone handling, HTTP headers and Turnstile verification. The browser uses
Admin Shell's API client, passwordless session, responsive Turnstile, tabs,
confirmation dialog, unsaved-change guard, dirty controls and private download
helper. The existing site share panel and calendar use `src/js/share-actions.js`.
Community owns its D1 schema, R2 bucket, allowlist, domain policy and deployment.
It shares no Podcast or Newsletter sessions or data.

Images are signature-checked, decoded, cropped to 320/640-pixel squares and
converted to WebP through the Images binding. PDFs are parsed with pdf-lib,
must be unencrypted, at most 20 pages and 10 MB, and have no public route.
Public events require approval; only published image derivatives are served.
Month cards are actual 1200×630 PNGs rendered with resvg WASM and bundled Inter.
Their URLs include a digest of the public month content. No browser execution
is needed for month-specific Open Graph tags or readable calendar navigation.

## Local development and checks

From the repository root:

```sh
npm ci
npm ci --prefix workers/community
npm run build-dev
python3 -m http.server 8080 --directory dev --bind 127.0.0.1
```

Create an ignored `workers/community/.dev.vars` file:

```dotenv
SITE_BASE="http://localhost:8787"
SHELL_ORIGIN="http://127.0.0.1:8080"
APP_MODE="local"
LOCAL_CHALLENGE_BYPASS="true"
COMMUNITY_ADMIN_EMAILS="admin@example.test"
```

In another terminal, from `workers/community/`:

```sh
npm run migrate:local
npm run dev -- --port 8787 --test-scheduled
```

Open `http://localhost:8787/microcinema.html`, `/writers-group.html`, or
`/admin/community/`. Explicit loopback local mode returns a test sign-in link
instead of sending an email. That bypass is unavailable in staging/production.

```sh
npm run test:community                 # from the repository root
npm run check:podcasts
npm run build:community-staging
git diff --check
```

Tests use synthetic data and an isolated workerd/D1/R2 runtime, with a fixed
clock. They cover privacy, file validation, session replay, CSRF/Origin,
idempotent submissions, concurrent revision claims, scheduling and DST,
archive limits, server markup and actual PNG rendering. They send no emails.

## Configuration and administration

Production and staging have separate D1, R2 and Turnstile resources. R2 public
access stays disabled. The stored `COMMUNITY_ADMIN_EMAILS` secret is a
comma-separated, lowercase allowlist, checked on every authenticated request.
Also update the `EMAIL.allowed_destination_addresses` binding when adding an
admin. Changing the allowlist immediately revokes removed users' sessions.

Required secrets: `COMMUNITY_ADMIN_EMAILS`, `TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY`. Use separate host-restricted widgets for `dustwave.xyz`
and `dustwave-community-staging.jogo.workers.dev`. The pinned verifier checks
the challenge/action; the dedicated widget restricts its accepted hostname.

Email uses Cloudflare's existing onboarded `digest.dustwave.xyz` sender domain,
with `community@digest.dustwave.xyz` and the display name Dust Wave Community.
The email binding is restricted to that sender and the Community administrators.
No additional Resend key is needed. Login links last 15 minutes, are single-use,
and exchange for a 12-hour HttpOnly, Secure, SameSite=Strict cookie plus CSRF
token. Tokens and private upload grants must never be logged or committed.

Admin controls create/edit/moderate events, edit script title/author/contact
details, replace PDFs/images, download private PDFs, reorder with drag or
keyboard buttons, and cancel/restore/reschedule future meetings. Approval
publishes the approved title/author in the next available reading slot.
Rejecting/withdrawing a script removes it from future agendas. Requeueing a
read script preserves the earlier agenda. None of these actions emails writers.

Incomplete uploads become unusable after one hour and are removed by the daily
cleanup once 24 hours old. Submitted PDFs remain private and retained for the
group; the form discloses this. For an authorized removal request, withdraw the
script, then use D1/R2 administrator tools to remove its contact data and PDF
objects (including any replacement/history references). Keep only public
historical title/author snapshots when appropriate. The audit records actor,
action, revision and time without file contents or tokens.

## Deploy and roll back

Build the site and run the checks above first. The site and Worker remain
separate releases. From the repository root, prepare the six staging shells:

```sh
node scripts/prepare-community-staging.mjs docs
```

From `workers/community/`:

```sh
npx wrangler d1 migrations apply COMMUNITY_DB --remote --env staging
npx wrangler deploy --env staging
npx wrangler secret bulk /absolute/path/to/private-staging-secrets.json --env staging
```

The secrets file is a JSON object containing only the three names above. Store
it outside tracked files with restrictive filesystem permissions. Staging
must expose `local:false` and a real, hostname-restricted challenge. Its assets
reuse the root `_headers`; all staging responses should remain out of search.

Verify both languages, current/next two months, invalid months, private-route
denials, upload normalization, queue preview/save, no mobile overflow, and a
downloadable month-specific PNG. Then deploy the Eleventy changes through the
normal Pages workflow, confirm its Cloudflare header step, and only then apply
the production Worker routes:

```sh
npx wrangler d1 migrations apply COMMUNITY_DB --remote
npx wrangler deploy
npx wrangler secret bulk /absolute/path/to/private-production-secrets.json
```

For first activation, provision secrets on the uploaded Worker before attaching
routes. Inspect `wrangler deployments list` and `wrangler rollback` for a Worker
rollback; revert the site commit for the Pages shell. Do not roll back additive
D1 migrations or delete submitted records as part of a code rollback. Removing
only Community routes restores the static shell and visible unavailable state.
The existing Podcast/Newsletter/checkout routes must remain untouched.

Local tests, deployed smoke checks, provider acceptance of a login email and
actual inbox delivery are separate evidence. The first real sign-in is the
inbox-delivery check; never claim it from a synthetic local login.
