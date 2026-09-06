# Podcast site integration

For developers working on Dust Wave's public Podcast pages and private
English/Spanish interfaces. This guide describes the site contract; it does
not report live launch readiness.

## Ownership and sources of truth

| Owner | Responsibility |
|---|---|
| This repository | Public show/News/embed pages, shared player, Admin/member/Checkout interfaces, i18n, accessibility, and Pages deployment |
| `dust-wave-podcast` | Worker API, durable jobs and data, provider adapters, entitlements, readiness, and production promotion |
| `dust-wave-platform` | The exact shared primitives recorded by this site's submodule and package pins |

The current shared-code pin is documented in
[Development](development.md#architecture-and-installation). Runtime readiness
comes from the Podcast Worker and its immutable provider evidence; a dated
document or passing site build cannot replace it.

Use the [Podcast execution strategy](plans/podcast-platform.md) for planned
workflow and repository ownership. Its
[implementation references](plans/podcast-platform.md#authoritative-implementation-references)
identify the backend's roadmap, owner actions, staging runbook, and API docs.
The [August 2 staging record](archive/2026-08-02-podcast-staging-evidence.md)
preserves historical results.

## Build configuration

The Pages build reads the following GitHub Actions repository variables:

- `PODCAST_ADMIN_API_ORIGIN`
- `PODCAST_ADMIN_TURNSTILE_SITE_KEY`
- `PODCAST_MEMBER_API_ORIGIN`
- `PODCAST_MEMBER_TURNSTILE_SITE_KEY`
- `PODCAST_CHECKOUT_TURNSTILE_SITE_KEY`

Cloudflare Pages previews consume the checked-in `_headers` file, and the
production edge sync described in the
[development guide](development.md#deployment) consumes the same
authenticated-route policy. All `pages.dev` deployment hosts are noindex, while `/admin/*`,
`/es/admin/*`, `/podcasts/account/*`, and `/es/podcasts/account/*`
additionally use `no-store`, deny framing, suppress referrers, and disable
browser capabilities those authenticated shells do not need. The rules
deliberately do not apply anti-framing headers to public Podcast pages or
embeds.

The public premium form remains hidden unless the Podcast API reports
`checkoutEnabled: true`, returns at least one valid USD price, and the build
has a Checkout Turnstile site key. Subscriber billing controls appear only
when the authenticated, non-secret session projection reports a show-scoped
Stripe billing source.

## Staging build

Build the isolated Cloudflare Pages staging artifact with:

```bash
PODCAST_STAGING_TURNSTILE_SITE_KEY="<public staging site key>" \
npm run build:podcast-staging
```

The staging build retrieves Cloudflare's secret-free widget list and fails
before building unless that public key identifies exactly one managed
`Dust Wave Podcasts staging` widget whose only hostname is
`dust-wave-website-staging.pages.dev`. This prevents a Pool, Store, production,
or expanded-hostname widget from being embedded accidentally. Wrangler must be
authenticated, but the build never reads or prints a Turnstile secret.

That command deliberately overrides the public, member, Admin, and Checkout
API origins with
`https://dust-wave-podcast-staging.jogo.workers.dev`. Keep the staging override;
`feeds.dustwave.xyz` and `media.dustwave.xyz` are production-route names, whose
live DNS and promotion state must be checked in the owning backend workflow.
The staging build also resolves the exact current Git commit and uses that SHA for
every browser asset cache key; CI uses `GITHUB_SHA`, and an explicit
`DUST_WAVE_ASSET_VERSION` must likewise be a full Git SHA-1 or SHA-256. The
command contains no secret. The Turnstile site key is public and remains
explicitly applied to member and Checkout surfaces, while the owner-approved
isolated staging build deliberately leaves the Admin widget absent. Production
builds continue to use `PODCAST_ADMIN_TURNSTILE_SITE_KEY`.

## Publication and review contracts

Canonical podcast News pages progressively fetch the episode's approved
English/Spanish transcript URL from the immutable publication snapshot. The
browser validates the bounded response again, builds the transcript only with
DOM text nodes, and uses the existing Digest/Podcast player contract for
timestamp seek-and-play. If no approved public transcript is available, the
audio player and episode notes remain usable and the bilingual empty state is
preserved.

The same canonical page progressively loads an approved Podcasting 2.0 chapter
document. Chapter titles and links are validated, rendered with DOM text nodes,
and wired to the existing player's seek/time-subscription API so the current
chapter follows playback. The page deliberately does not load remote chapter
artwork; related links open with no referrer and opener isolation. Missing or
ineligible chapters preserve a bilingual empty state without affecting audio,
notes, or transcripts.

The publication JSON is a versioned `full_episode|premium_teaser`
discriminated contract. Premium-bonus public snapshots are deliberately
media-free: the canonical News page, show aggregate, and noindex embed render
only public teaser copy and a subscription CTA, without the shared player,
download, transcript/chapter clients, media CSP origins, duration, private
timing, or token-shaped data. Build validation rejects a teaser that contains
any of those fields. Podcast episode and show JSON-LD use the shared
HTML-significant-character-safe serializer.

The private Production workbench within Episodes layers timestamped plain-text review over the
Worker's exact current audio, transcript, chapter, clip, and ad-plan revisions.
It renders review text only through DOM text nodes, distinguishes current from
historical targets, exposes resolve/reopen and role-gated approval state, and
labels readiness as non-enforcing until the later publication dependency gate.
Producer+ transcript review can read a WebVTT or SubRip file locally into that
same unsaved editor. The bounded parser performs no upload or API call, caps
the normalized review at 1 MB and 10,000 ordered non-overlapping cues, keeps
VTT voice labels unconfirmed, preserves ambiguous SRT prefixes as caption
text, and requires confirmation before replacing existing work. The existing
versioned Save action remains the only persistence path. A companion local
search navigator scans at most those same 10,000 loaded cues, folds
English/Spanish case and accents, excludes hidden Markdown link destinations,
and opens ordered caption or speaker matches through the existing paginated
cue focus path. It stores nothing and makes no request.

## Shared Podcast and Digest player layout

Phone-width players and Digest players in narrow desktop columns share
`audio-card-grid-layout` in `src/scss/themes/base/_audio-player.scss`.
Keep structural grid behavior in that mixin; `_digest.scss` supplies
Digest-specific artwork sizing and responsive overrides.

The [testing guide](testing.md#focused-checks) lists the source contract,
mobile regression checks, and browser trace workflow. Source checks do not
replace a rendered mobile Safari check.

## Related guides

- [Content publishing](content-publishing.md): canonical content and syndication.
- [Testing and performance](testing.md#podcast-admin-performance-traces):
  staging traces, local mock API, and workflow fixtures.
- [Datatype rollout](plans/datatype-analytics.md): scoped analytics pilot and
  outstanding expansion gates.
