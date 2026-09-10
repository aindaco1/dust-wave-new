# Community calendar and Writers Group

This independently deployed Worker serves the Microcinema calendar, Writers
Group agendas, submissions, and `/admin/community/` API. Eleventy owns the
English/Spanish page shells; the Worker injects fresh public markup and month
metadata into their versioned `data-community-slot="1"` slots.

Both pages use the same meeting records. Approved scripts fill two slots per
meeting in queue order. The recurring anchor is September 21, 2026, every
other Monday from 19:00–21:00 in `America/Denver`. A daily trigger extends the
materialized schedule six months ahead. Cancelled, rescheduled and deleted
records retain their IDs so the daily trigger cannot recreate an exception.
Deleted records disappear from both public calendars and the admin lists.
Started agendas retain title/author snapshots, even when an admin changes the
meeting date or deletes the meeting; already-read scripts stay out of the queue.
Only future meetings without a historical agenda are reallocated. Admin reordering saves automatically; an atomic revision
check commits the queue and agendas together.

The Writers Group script submission and Microcinema event proposal forms are
always visible, with no trailing divider. Both initialize the same shared
responsive Turnstile control immediately. Public PDF
upload grants require server-side Turnstile verification, and the resulting
grant is consumed with the script submission. Retrying a submission reuses that
grant instead of consuming the Turnstile token twice. Success removes the
widget and disconnects its resize observer.

## Shared code

The repository's immutable Platform pin supplies Worker Core crypto, cookies,
time-zone handling, HTTP headers and Turnstile verification. The browser uses
Admin Shell's API client, passwordless session, responsive Turnstile, tabs,
confirmation dialog, unsaved-change guard and private download
helper. The existing site share panel and calendar use `src/js/share-actions.js`.
Community owns its D1 schema, R2 bucket, user directory, domain policy and
deployment. It shares no Store, Pool, Podcast or Newsletter memberships,
sessions or data. Role policy follows Store; the pinned Platform has no shared
user-directory component, so Community composes its existing fields and
Platform session, tabs and unsaved-change controls.

Images are signature-checked, decoded, cropped to 320/640-pixel squares and
converted to WebP through the Images binding. PDFs are parsed with pdf-lib,
must be unencrypted, at most 35 pages and 10 MB, and have no public route.
Public events require approval; only published image derivatives are served.
Month cards are actual 1200×630 PNGs rendered with resvg WASM and bundled Inter.
Their URLs include a digest of the public month content. No browser execution
is needed for month-specific Open Graph tags or readable calendar navigation.
With JavaScript, month links and the month picker fetch this same server-rendered
markup and replace only the calendar. Scroll position, list view and entered
proposal details are preserved; browser history, language links and share
metadata track the selected month. Failed requests leave the current month
readable and allow retrying the same controls. Share/copy URLs include
`#calendar`: opening one in a new page uses native fragment scrolling to the
selected month; in-place month controls update history without following the
fragment again. Canonical and Open Graph URLs retain the month query without
a fragment.

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
```

In another terminal, from `workers/community/`:

```sh
npm run migrate:local
npm run dev -- --port 8787 --test-scheduled
```

Open `http://localhost:8787/microcinema.html`, `/writers-group.html`, or
`/admin/community/`. Explicit loopback local mode returns a test sign-in link
instead of sending an email. That bypass is unavailable in staging/production.
After requesting sign-in, click **Open local test sign-in** on the page.
Migration `0003_admin_users.sql` seeds **alonso@dustwave.xyz** as the initial
Super-admin. Use that address for the local preview, then **Users** to manage
other Community users. `COMMUNITY_ADMIN_EMAILS` is obsolete and ignored; remove
it from older `.dev.vars` files. Local user creation never sends invitations.
With `LOCAL_CHALLENGE_BYPASS="true"`, public forms display Cloudflare's always-pass
test widget using its documented test site key. This is a visual development
fixture, not human verification. Local admin login still skips the challenge.
The test key and server bypass require explicit loopback local mode; staging
and production use the configured real site key and server verification.

Use `npm run dev` so Wrangler keeps the HTTP origin at `localhost:8787` instead
of inferring the production host from its routes. Otherwise Wrangler rewrites
the browser's `Origin` header and the login/submission origin check rejects it.
If changing the local hostname or port, update `SITE_BASE` and pass matching
`--port` and `--local-upstream` overrides. Keep the application origin checks
unchanged; this setting affects only the local development server.

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

Miniflare's `sharp` dependency is overridden to `0.35.4` to address
[GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c)
while retaining the reviewed Miniflare/Wrangler versions. Remove the override
when an adopted upstream release pins a patched version. This only affects
local/CI tooling; production image processing uses the Cloudflare Images binding.

### Console diagnostics

The public-form and admin module tags opt out of Rocket Loader with
`data-cfasync="false"` before `src`, using Cloudflare's
[script exclusion](https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/).
Keep this attribute in both templates: Rocket Loader otherwise generates
classic-script preloads whose credentials mode differs from module requests.
Imported modules and the on-demand Turnstile API load through the native browser.

Cloudflare can sample responses with a
[report-only resource monitoring policy](https://developers.cloudflare.com/client-side-security/reference/csp-header/)
containing `script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'`.
Those reports are observational; distinguish them from enforced CSP failures.
Do not loosen the authenticated shell policy to silence report-only messages.

The zone's **Agent Readiness → WebMCP → Site MCP server** option must remain off
unless a real MCP endpoint is deployed. It otherwise injects a bridge that
POSTs to the nonexistent `/mcp` endpoint, producing HTTP 405 on every page.
Content Credentials (C2PA) is independent and can remain enabled.

When investigating Turnstile sandbox, font or GPU diagnostics, capture the
source frame and repeat in a fresh browser profile without extensions.
Messages from `challenges.cloudflare.com` or SingleFile hooks are distinct
from first-party module failures. Verify widget rendering and the actual
reported failure before changing site code; never hide all console errors.

## Configuration and administration

Production and staging have separate D1, R2 and Turnstile resources. R2 public
access stays disabled. The D1 `community_admin_directory` is the authoritative
Community user list, checked on every authenticated request.

Required secrets: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
Use separate host-restricted widgets for `dustwave.xyz`
and `dustwave-community-staging.jogo.workers.dev`. The pinned verifier checks
the challenge/action; the dedicated widget restricts its accepted hostname.

Email uses Cloudflare's existing onboarded `digest.dustwave.xyz` sender domain,
with `community@digest.dustwave.xyz` and the display name Dust Wave Community.
The [email binding](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
is restricted to that sender; the Worker restricts recipients to current
Community users. Do not retain the old `allowed_destination_addresses` list:
it would prevent new users from receiving their sign-in emails.
No additional Resend key is needed. Login links last 15 minutes, are single-use,
and exchange for a 12-hour HttpOnly, Secure, SameSite=Strict cookie plus CSRF
token. Tokens and private upload grants must never be logged or committed.

### Users and roles

- **Super-admin** (`super_admin`) can manage events, meetings, scripts and users.
- **Limited-admin** (`limited_admin`) has the same event, meeting and script
  access, including private PDFs, but cannot see or call the Users API.

**Users → Add user** starts with Limited-admin selected. Name is optional
(100 characters); a valid, unique sign-in email and role are required. Email
addresses are stored lowercase. The directory allows at most 100 users and
must retain at least one Super-admin. As in Store, a signed-in user can edit
their own name, but cannot change their own email/role or delete themselves.
Another Super-admin must make those access changes.

**Save users** applies additions, edits and deletions together; Users does not
autosave. Revision checks prevent one admin from replacing another admin's
newer changes. A conflict retains the draft and offers **Use saved version**.
An atomic D1 batch saves the directory, audit entry, and revocations: deleted
accounts and changed emails/roles lose existing sessions and pending sign-in
links. Public calendars never include this directory or private account fields.

New users and changed email addresses receive a 15-minute sign-in email after
saving in staging/production. If email delivery fails, the account stays saved
and the UI identifies the affected address; they can request a new link from
the sign-in page. Local mode skips invitations. A save retry reads back the
directory before reporting a failed response, avoiding duplicate additions or
automatic duplicate invitations.

### Events, meetings and scripts

Admin controls create/edit/moderate events, add scripts directly to the approved
queue, edit script title/author/contact details, replace PDFs/images, download
private PDFs, reorder with drag or keyboard buttons, and
add/edit/delete Writers Group meetings, including past meetings.
**Add event** lives in **Events**; each tab has its own heading and primary action.
The pinned Platform tab component provides keyboard navigation, session-based
tab selection and a native section picker below 576 pixels. Controls and editor
fields follow Scheduler's spacing, focus and 44-pixel minimum target patterns,
while keeping the site's existing typography. Event date/time fields share a row
on larger screens and stack on phones. Users fields stack below 992 pixels;
the admin page uses less top padding on phones/tablets. Public form inputs use
at least 16-pixel text so focusing a field does not force an iOS zoom.

Lists update after successful changes and check for new submissions when a tab
opens, the page regains focus or visibility, the connection returns, and every
30 seconds while visible. There is no general Refresh button. Background reads
pause during editing, dragging, confirmation and unsaved queue/user changes; unchanged
revisions leave the DOM intact, and an older read cannot replace a newer save.
Recoverable connection failures retry automatically. This uses the existing
Platform API client and local Community update policy; no shared package fork
or dependency change is needed.
**Meetings → Add Writers Group meeting** uses the same event editor and the
recurrence defaults; saving publishes the new meeting and assigns up to two
queued scripts. Ordinary events are saved as drafts; attach their square image
and approve them to publish. **Delete** removes either kind from both public
calendars and moves scripts from a future meeting to the next available slots.
**Cancel event** retains a visible cancellation notice and can be restored.
Deletion retains an internal tombstone for recurrence and history; it cannot be
restored using the active admin controls. No schema migration is required. **Script queue → Add script** requires
a title, author and PDF under the same 35-page/10-MB limits as public submissions;
contact name and email are optional and private. Saving appends the script to
the queue and publishes its title/author in the next available slot. The uploaded
PDF's filename appears privately in admin and is used for downloads. Replacing
the PDF updates its name, contents and page count together; editing a script's
public title or author leaves the uploaded filename intact. Older uploads without
a stored name fall back to a filename derived from the title and author.
Names are normalized for safe downloads while retaining Unicode letters and
draft/version markers. Filename metadata uses the existing upload/record JSON;
no schema migration is needed.

Queue moves save automatically, including consecutive drag or keyboard moves
made while a save is in flight. Desktop pointer users get a visible drag grip
and before/after insertion indicator; arrow buttons remain available at all
widths, and a focused grip supports Up/Down. Admin Shell `0.10.2` has no
reorder component, so this small native drag adapter stays with Community;
the API, session, confirmation and unsaved-change controls remain shared.
Existing script title, author and contact edits
save after a short typing pause; **Close** finishes any pending valid edit.
Incomplete fields stay in the editor until corrected. New scripts still use
**Add to queue** once their required title, author and PDF are ready.

Autosave reuses the authenticated action endpoint and Platform API client.
The action response can include the committed admin state and revision, keeping
future dates current without a second request. Failed responses are read back
to confirm whether the exact change landed. Other conflicts keep the draft
visible and offer **Retry save** or **Use saved order/version** instead of
overwriting another admin's changes.
The shared unsaved-change guard remains active while writes are pending or
unconfirmed. Using the saved version requires discarding the conflicting draft.

Admin creation reuses the public submission receipt, upload authorization,
file validation and atomic attachment path through authenticated
`POST /api/community/v1/admin/scripts`. The existing approval/allocator commits
the queue and future agendas with the new record. Retrying the same submission
after a lost response returns its receipt without duplicating it. Appending a new
script or event retries once against the latest revision if another admin saved
while its form was open. Existing-record edits and queue reorder conflicts retain
their drafts and require an explicit choice.
No schema migration or Platform package change is required. Public submissions
still require local-attendance/consent confirmations, contact details and review.

Approval
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

The secrets file is a JSON object containing only the two names above. Store
it outside tracked files with restrictive filesystem permissions. Staging
must expose `local:false` and a real, hostname-restricted challenge. Its assets
reuse the root `_headers`; all staging responses should remain out of search.

Verify both languages, current/next two months, invalid months, private-route
denials, upload normalization, queue/detail autosave, no mobile overflow, and a
downloadable month-specific PNG. For the roles release, apply the production
migration and deploy the Worker before publishing the matching Eleventy shell:
the previous browser code tolerates the added role fields, while the new code
needs those fields. Keep this order to avoid an interim broken admin dashboard.

```sh
npx wrangler d1 migrations apply COMMUNITY_DB --remote
npx wrangler deploy
npx wrangler secret bulk /absolute/path/to/private-production-secrets.json
```

Existing deployments already have their Turnstile secrets; preserve them instead
of replacing them. Then deploy Eleventy through the normal Pages workflow and
confirm its Cloudflare header/cache steps. The new user directory must be
verified on the production Worker before removing the obsolete allowlist secret.

Apply migration **0003** before deploying the role-aware Worker and its matching
admin shell. It initializes the owner as **alonso@dustwave.xyz**, with no grant
for **alonso@hey.com**, and removes outstanding sessions/links for other legacy
addresses. It does not change events, scripts or private files. Inspect any
existing Community membership before the first remote migration; add any
explicitly approved additional accounts through Users after migration rather
than inheriting Store/Pool accounts or assigning roles from the retired secret.
Remove the obsolete `COMMUNITY_ADMIN_EMAILS` secret after the new Worker is
verified. Do not roll back to the allowlist-based Worker without reviewing its
old secret: that would reinstate the old access policy.

For first activation, provision secrets on the uploaded Worker before attaching
routes. Inspect `wrangler deployments list` and `wrangler rollback` for a Worker
rollback; revert the site commit for the Pages shell. Do not roll back additive
D1 migrations or delete submitted records as part of a code rollback. Removing
only Community routes restores the static shell and visible unavailable state.
The existing Podcast/Newsletter/checkout routes must remain untouched.

Local tests, deployed smoke checks, provider acceptance of a login email and
actual inbox delivery are separate evidence. The first real sign-in is the
inbox-delivery check; never claim it from a synthetic local login.
