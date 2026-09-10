# Testing and performance

For developers validating changes. Run these commands from the repository
root after [installation](development.md#architecture-and-installation).
Choose checks that exercise the changed contract; visual changes also need a
rendered browser check at relevant widths.

## Validation gates

Before a release, run:

```sh
npm run check:podcasts
npm run build
git diff --check
```

`check:podcasts` verifies the exact shared-platform pin, scans tracked text for
credentials, runs `npm audit --audit-level=high`, and runs the Podcast source,
i18n, accessibility, performance, hosting-header, module, and behavior checks.

`build` separately runs project-frontmatter, Pages CMS, and Substack export
tests, rebuilds the site/assets/social cards, and validates rendered Podcast
i18n. It does not invoke `check:podcasts`. CI explicitly runs that gate and then
`build:ci`, which adds WebP generation and missing-source validation.

The newsletter Worker has its own [unit tests](../workers/newsletter-subscribe/README.md#testing).
Its welcome-email send command is a separate provider action.

## Focused checks

| Changed contract | Commands |
|---|---|
| Project pages, bilingual metadata, taxonomy | `npm run test:project-frontmatter` |
| Pages CMS collections and editor fields | `npm run test:pages-cms` |
| Substack HTML cleanup | `npm run test:substack-export` |
| Public navigation/footer and asset budgets | `npm run test:public-shell` and `node scripts/validate-site-performance.mjs` |
| Shared Podcast/Digest player | `node scripts/validate-podcast-player.mjs` and `node --test tests/podcast-player-mobile-regression.test.mjs` |
| Datatype asset integrity and rendering contract | `node scripts/validate-datatype.mjs` |
| Interface translations | `npm run test:i18n`; after building, `npm run test:i18n:rendered` |
| Shared-platform adoption | `npm run test:platform-pin` |
| Broader Podcast behavior | `npm run test:podcasts` |

The mobile player regression file checks source-level duration/retry and
phone-width heading contracts. Pair it with real rendered checks when changing
layout or playback; it does not launch a browser or establish device acceptance.

## Documentation changes

Check relative file links and heading anchors in changed guides, confirm each
documented `npm run` command exists in the relevant `package.json`, and search
for old filenames after moves. Keep documentation outside `dev/` and `docs/`.
Run `git diff --check`. Use a render/build check when templates, asset paths,
or the build contract also change.

Historical QA reports are linked from the [roadmap](roadmap.md#historical-evidence).
Their results and local screenshot paths belong to the recorded run.

## Podcast Admin performance traces

Capture a Chrome DevTools-compatible JSON trace against the isolated staging
admin with the repository's dependency-free tracer:

```bash
npm run perf:podcast-admin:trace
```

The command launches a temporary, extension-free Chrome profile, records an
8-second desktop trace, and writes it below `.artifacts/performance/` (ignored
by Git). It never reuses browser cookies or an authenticated session. The
tracer discovers system Chrome/Chromium and Playwright's standard browser cache;
set `PLAYWRIGHT_BROWSERS_PATH` or pass `--chrome` for a custom installation.
It also verifies the exact CSS viewport, enforced CSP, requested admin context,
and clipped descendants outside intentional horizontal scrollers. The summary
reports cumulative layout shift and rejects authenticated traces above the 0.1
good-experience threshold.

Use `--viewport 390x844` for the mobile breakpoint, or override the safe
staging default explicitly:

```bash
npm run perf:podcast-admin:trace -- \
  --viewport 390x844 \
  --url https://dust-wave-website-staging.pages.dev/es/admin/podcasts/
```

Use `--admin-tab episodes --admin-group production` with the repository mock
API to capture the transcript workbench directly. For a bounded
large-transcript regression,
build once and run the next two server commands in separate terminals:

```bash
PODCAST_ADMIN_API_ORIGIN=http://127.0.0.1:4174 \
  PODCAST_PUBLIC_API_ORIGIN=http://127.0.0.1:4174 \
  PODCAST_MEMBER_API_ORIGIN=http://127.0.0.1:4174 \
  npm run build-dev
python3 -m http.server 4173 --bind 127.0.0.1 --directory dev
PODCAST_ADMIN_MOCK_TRANSCRIPT_CUES=1300 npm run qa:podcast-admin:mock-api
npm run perf:podcast-admin:trace -- \
  --url http://127.0.0.1:4173/admin/podcasts/ \
  --admin-tab episodes \
  --admin-group production
```

Use `--admin-tab settings` to measure the bilingual show form, dry-run-first
public-page projection controls, and Super-admin Launch Lab at 320 px or
desktop width. Authenticated Settings traces fail closed unless the Launch Lab
has exactly four summary metrics, seven provider groups, and collapsed
technical evidence by default.

Use `--admin-tab all` with the authenticated repository mock to audit all six
top-level workspaces in navigation order within one isolated browser session.
The matrix verifies the exact desktop or mobile viewport, horizontal fit, CSP,
layout stability, active-tab state, shared list spacing, and progressive
disclosure defaults for every workspace:

```bash
npm run perf:podcast-admin:trace -- \
  --url http://127.0.0.1:4173/admin/podcasts/ \
  --admin-tab all \
  --viewport 1440x900
npm run perf:podcast-admin:trace -- \
  --url http://127.0.0.1:4173/admin/podcasts/ \
  --admin-tab all \
  --viewport 320x700
```

Keep focused `--admin-group` traces separate from `--admin-tab all`; they test
an explicitly expanded workbench rather than the concise launch state.

Load the resulting JSON from Chrome DevTools **Performance → Load profile**.
Trace files contain visited URLs and page metadata, so review them before
sharing. Run `npm run perf:podcast-admin:trace -- --help` for all options.

The mock API also exposes a deterministic public clip response for the
canonical News-page consumer. `ready` is the default; use `empty` or `missing`
to exercise withdrawal/concealment without publishing an episode or media:

```bash
PODCAST_ADMIN_MOCK_PUBLIC_CLIPS=empty npm run qa:podcast-admin:mock-api
node --test tests/podcast-clips-dom.test.mjs
```

The fixture endpoint is
`/v1/shows/opera-en-la-selva/episodes/episodio-de-prueba/clips`. Keep it local;
the browser contract validates Spanish/English labels, canonical sharing,
safe text-only rendering, MP4 download URLs, and complete concealment when no
approved selection remains.

Set `PODCAST_ADMIN_MOCK_WORKFLOW_TARGET` to `attach_media`,
`working_master`, `delivery_audio`, `alignment`, `chapters`,
`production_review`, or `promotion_clips` to expose one controlled readiness
state and verify that the guided workflow opens and focuses the exact repair
control.

## Responsive review

Run `npm run qa:responsive` against the local Community preview on port 8787.
It checks eight recent public/admin entry points in both languages at 320,
390, 768, 1024 and 1440 pixels (80 page/viewport combinations), saves screenshots
at phone/tablet/desktop widths, and reports document or visible-element overflow.
Set `QA_ORIGIN`, `QA_OUTPUT`, `QA_WIDTHS` or `QA_ROUTES` to target a deployed
origin, retain a named run, or narrow a follow-up. It blocks outgoing submissions;
web fonts and Turnstile may load, but this is not an email-delivery or CAPTCHA
acceptance test. Inspect the screenshots for vertical rhythm and clipping;
an overflow check alone cannot establish good layout.

`npm run test:footer` tests all four page shells in both languages across nine
widths, with short and long content and external fonts blocked. It checks
footer placement, readable labels, non-overlapping links and 44-pixel touch
targets. Keep these rendered checks instead of prescribing exact CSS rules
in the source validator. The full Podcast gate includes them.

Authenticated Community tests separately cover all tabs and editors, long
filenames, tablet layouts, user roles, validation and save/recovery states using
synthetic records. Keep the real local `.wrangler` data out of these fixtures.
See the [September 10 review](qa/2026-09-10-responsive-community.md).

## Community calendar and queue

Install `npm ci --prefix workers/community`, then run `npm run test:community`.
This covers EN/ES contracts, domain tests, PDF limits, real PNG cards, and an
isolated workerd/D1/R2 workflow with session, privacy, retry and concurrency
checks. A headless browser regression covers in-place month navigation, scroll
position, browser history, retained proposals, metadata, request races and
connection failures at desktop and phone widths in both languages.
`npm run test:community:admin` also renders the real admin template and styles
against an isolated Worker/D1/R2 instance. It covers event and Writers Group
meeting creation, editing and deletion, as well as adding scripts, required
PDFs and optional contacts, drag/keyboard reordering with automatic scheduling,
private download/replacement (including uploaded filenames), and detail autosave
in English/Spanish at desktop and 320-pixel widths.
It checks rapid changes, invalid drafts, stale revisions and lost-response retries
and real desktop mouse drags with before/after insertion feedback. Navigation
checks cover keyboard tabs, the mobile picker, saved selection and tab-specific
actions. Automatic-update checks exercise focus/interval/reconnection, retained
editors and failed queue drafts, keyboard focus, stale reads after saves, and
recovery when the initial data load fails. It blocks external requests
and uses only synthetic PDFs and local sign-in links. Set
`COMMUNITY_ADMIN_SCREENSHOTS=.artifacts/community-admin` to retain screenshots.
Role tests cover Super-admin user creation/editing/deletion in both languages,
Limited-admin operational access with no Users tab or mobile option, retained
drafts across tabs, conflicts, failed/lost saves, and private-data cleanup after
session revocation. The Worker tests directly exercise permission denials,
unique emails, self-account and last-Super-admin protection, atomic concurrent
user writes, session/link revocation, and independence from legacy allowlists
and other apps. They run all schema migrations, including the initial
`alonso@dustwave.xyz` Super-admin. Invitation tests use a fake email binding;
they do not verify real provider acceptance or inbox delivery.
The submission browser test renders the shared form in English and Spanish
at 320 and 1440 pixels, checking always-visible script and event forms,
immediate challenge mounting, token expiry,
retry, success cleanup and the absence of a trailing form divider. A provider
fixture verifies that missing, invalid, reused or wrong-action tokens cannot
issue public upload grants. Worker tests also check deletion across both public
projections, the daily recurrence trigger, and preserved past reading history.
Run
`npm run build:community-staging` for the production WebP pipeline.
After deploying, `node scripts/smoke-community.mjs <origin>` checks all six
current/upcoming month cards, both page languages, admin headers and private
route denials. Also inspect the rendered UI at desktop and phone widths.
See the [Worker guide](../workers/community/README.md) for setup and release order.

## Contact form

Run `npm run test:contact` after changing Contact markup, submission behavior,
translations, or verification styling. Browser tests render the actual template
and theme with local Turnstile and Formspree fixtures; external requests are
blocked. They cover both languages, success, retained drafts on errors, duplicate
submission protection, verification recovery, loading-copy dismissal, a completed
state that cannot reload verification, and mobile/desktop gutters. CI runs
this before building. These tests do not send email or prove provider delivery.
