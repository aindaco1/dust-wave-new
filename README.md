# Dust Wave Website

Static website for [dustwave.xyz](https://dustwave.xyz), built with Eleventy and Bootstrap 5.

## Requirements

Node.js 20.9+ is required for the site build. Check your version:
```bash
node --version
```

## Installation

```bash
git submodule update --init --recursive
npm install
```

Clone with `--recurse-submodules` when possible. Existing checkouts must initialize the recorded `shared/dust-wave-platform` commit before installing or testing; CI pins that gitlink and does not follow the shared repository's moving branch.

The current immutable pin is Dust Wave Platform `v0.15.0` at
`2e79a8d70cb6d30805ea141e53d32f9387441756`. An executable contract verifies
that gitlink plus the exact Admin Shell and Media Core versions used by this
site. Dust Wave retains its content, templates, Podcast UI policy, Newsletter
Worker credentials, Pages deployment, and independent one-commit rollback.

## Development

Run local dev server with hot reload:
```bash
npm run watch
```
Builds to `/dev` and starts BrowserSync with auto-refresh on changes.
When the server stops (including with `Ctrl+C`), the generated `dev/` and
`docs/` contents are removed automatically. Both directories are recreated
empty and will be populated again by the next local or production build.

## Deployment

Push to `main` branch → GitHub Actions builds and deploys via GitHub Pages artifacts automatically. No manual build needed.

You can also trigger a manual deploy from the Actions tab → "Build and Deploy" → "Run workflow".

The build runs `npm run check:podcasts`, which scans tracked text through the
shared Dust Wave credential-leak gate, fails on high-severity dependency
advisories, and then validates the bilingual Podcast surfaces. GitHub Actions
are pinned to immutable commits. The post-deploy Cloudflare purge calls the
official API directly so no third-party action receives credentials. Prefer a
zone-scoped `CLOUDFLARE_CACHE_PURGE_TOKEN` with Cache Purge permission; the
existing email/global-key pair is a temporary compatibility fallback.

Because production is served by GitHub Pages through Cloudflare, GitHub Pages
does not consume `_headers`. After every production deploy, the workflow
therefore translates the four authenticated route blocks in `_headers` into
one idempotent Cloudflare Response Header Transform Rule. The sync owns only
the stable `dust_wave_authenticated_shell_response_headers` rule, preserves
unrelated zone rules, and verifies both authenticated and public Podcast
responses after the cache purge. Prefer a zone-scoped
`CLOUDFLARE_TRANSFORM_RULES_TOKEN` with Zone Transform Rules Write permission;
the existing email/global-key pair remains a temporary fallback.

### Podcast UI configuration

The Pages build reads the following GitHub Actions repository variables:

- `PODCAST_ADMIN_API_ORIGIN`
- `PODCAST_ADMIN_TURNSTILE_SITE_KEY`
- `PODCAST_MEMBER_API_ORIGIN`
- `PODCAST_MEMBER_TURNSTILE_SITE_KEY`
- `PODCAST_CHECKOUT_TURNSTILE_SITE_KEY`

Cloudflare Pages previews consume the checked-in `_headers` file, and the
production edge sync described above consumes the same authenticated-route
policy. All `pages.dev` deployment hosts are noindex, while `/admin/*`,
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
`https://dust-wave-podcast-staging.jogo.workers.dev`. Do not substitute
`feeds.dustwave.xyz` or `media.dustwave.xyz`: those names remain reserved for
the future production Worker routes and may not have DNS records during
staging. It also resolves the exact current Git commit and uses that SHA for
every browser asset cache key; CI uses `GITHUB_SHA`, and an explicit
`DUST_WAVE_ASSET_VERSION` must likewise be a full Git SHA-1 or SHA-256. The
command contains no secret. The Turnstile site key is public and remains
explicitly applied to member and Checkout surfaces, while the owner-approved
isolated staging build deliberately leaves the Admin widget absent. Production
builds continue to use `PODCAST_ADMIN_TURNSTILE_SITE_KEY`.

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

The private Production tab also layers timestamped plain-text review over the
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

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned product and infrastructure work, including the paid embedded video player plan.

## Project Structure

```
src/
├── _data/           # Global data files (JSON)
├── _includes/
│   ├── layouts/     # Nunjucks page templates
│   └── snippets/    # Reusable components
├── img/
│   ├── about/       # Member photos (800×800px, <200KB)
│   ├── gifs/        # Project hover GIFs (800×450px, <8MB)
│   ├── stills/      # Project featured images (1800×1012px, <400KB)
│   ├── favicon/     # Favicons, logos, and branding assets
│   ├── home/        # Homepage background GIFs
│   ├── digest/header/ # DIY Digest header images
│   ├── news/        # News article images and GIFs
│   └── [project]/   # Per-project galleries (behind-the-scenes, posters)
├── members/         # Team member profiles (Markdown)
├── posts/           # Film project pages (Markdown)
├── news/
│   ├── digests/     # Auto-generated DIY Digests
│   └── *.md         # Regular news articles
└── scss/
    └── themes/      # Custom Bootstrap theme

workers/
└── newsletter-subscribe/  # Cloudflare Worker for Resend integration

dev/                 # Local dev build output (gitignored)
docs/                # Production build output (gitignored, deployed via CI)
└── img/
    └── webp/        # WebP derivatives generated only by GitHub Actions
```

## Content Management

Content is managed via [Pages CMS](https://pagescms.org/) configured in `.pages.yml`.

### Collections
- **👥 Members** (`src/members/`) — Team member profiles for the About page
- **🎬 Film Projects** (`src/posts/`) — Project pages with raw HTML/Markdown content — [How-To Guide](https://www.notion.so/dustwave/2ca86545942d806c8077ef5b7ee5fa60#2ca86545942d80f7b446c2f1edc4afc2)
- **📢 News** (`src/news/`) — Announcements with raw HTML/Markdown content — [How-To Guide](https://www.notion.so/dustwave/2ca86545942d806c8077ef5b7ee5fa60#2ca86545942d80a8b1bfe2c2225602f9)
- **📜 DIY Digests** (`src/news/digests/`) — Weekly digests (HTML editing only)

### Adding a New Member
1. Go to **👥 Members** in Pages CMS
2. Click "New"
3. Fill in:
   - **Filename (slug)**: Lowercase with hyphens (e.g., `jane-doe`)
   - **Display Name**: Full name as shown on site (e.g., `Jane Doe`)
   - **Photo**: Upload to `img/about/` (800×800px, <200KB)
   - **Instagram Handle**: Username without @ (optional)
   - **Column**: Left or Right
   - **Order**: Position within column (1 = top)
4. Save

### Image Guidelines
| Type | Size | Max File Size |
|------|------|---------------|
| Member Photo (about/) | 800×800px (1:1) | 200KB |
| Featured Image (stills/) | 1800×1012px (16:9) | 400KB |
| Hover GIF (gifs/) | 800×450px (16:9) | 8MB |
| News Header (news/) | 1600×900px (16:9) | 350KB |
| Digest Header (digest/header/) | 1600×900px (16:9) | 350KB |

## Syndication & Social Sharing

Posts and news can include optional frontmatter for cross-platform syndication:

```yaml
syndicate:
  - substack    # Include in Substack feed (excerpt only)
  - fediverse   # Federate via Bridgy Fed
og_image: /img/og/custom-image.png   # Custom OG image (1200×630)
og_video: /img/og/custom-video.mp4   # Optional OG video
og_alt: "Description of the image"   # Alt text for OG image
share_text: "Custom share text"      # Override default share text
```

Every page automatically generates Open Graph and Twitter Card meta tags, plus JSON-LD structured data for SEO.

### RSS Feeds

| Feed | URL | Content |
|------|-----|---------|
| Main/Substack | `/feed` | Excerpt only + "Continue reading" link |
| Syndicate | `/syndicate.xml` | Full HTML content |
| JSON Feed | `/syndicate.json` | Full HTML content (JSON format) |

All feeds use Mountain Time for dates and absolute URLs for images/links.

### Substack Export

Posts with `syndicate: ["substack"]` get a clean HTML export for manual copy/paste into Substack:

1. Run `npm run watch`
2. Open `dev/substack-export/{slug}.html` in browser
3. Copy and paste into Substack editor

The export automatically converts relative URLs to absolute, transforms YouTube/Vimeo iframes to plain URLs (Substack auto-embeds), and strips unnecessary markup.

Use `<!-- more:substack -->` in your markdown to control where the RSS excerpt ends — content after the marker stays only on dustwave.xyz.

### Fediverse via Bridgy Fed

Posts with `syndicate: ["fediverse"]` are federated via [Bridgy Fed](https://fed.brid.gy/):

- Microformats2 markup (`h-entry`, `p-name`, `e-content`, etc.) is automatically added
- `p-bridgy-bluesky-content` provides plain text summary for Bluesky
- CI job sends webmentions after deploy (requires `BRIDGY_FED_ENABLED=true` repo variable)

**Setup:**
1. Register at [webmention.io](https://webmention.io)
2. Set up Bridgy Fed at https://fed.brid.gy/
3. Add `BRIDGY_FED_ENABLED=true` as GitHub repo variable

**Commands:**
```bash
npm run ping:bridgy      # Send webmentions for changed posts
npm run ping:bridgy:all  # Send webmentions for all fediverse posts
```

**Limitations:**
- Bridgy Fed has anti-backfill protection — posts older than ~2-4 weeks may be silently dropped
- Bluesky federation is slower; posts may take several minutes to appear

### Open Graph Images

Generate OG images (requires Puppeteer):
```bash
npm install puppeteer
npm run build:og
```

Create a default fallback image at `src/img/og/default.png` (1200×630).

### Podcast Admin performance traces

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

### WebP Images

Local development and `npm run build` use the original JPG/PNG image paths and
never generate WebPs. The GitHub Pages workflow runs `npm run build:ci`, which
generates every WebP referenced by the deployed site directly in
`docs/img/webp/`. The CI build fails if a referenced WebP lacks a JPG/PNG
source. Generated WebPs are not stored in `src/` or committed to the repository.

## Newsletter

Newsletter signups are handled via a Cloudflare Worker that adds contacts to [Resend](https://resend.com).

### Architecture
- **Frontend**: Forms in `src/_includes/snippets/footer1.njk` (popup) and `src/newsletter.njk` (full page)
- **Backend**: Cloudflare Worker at `workers/newsletter-subscribe/`
- **Email service**: Resend (contacts added to 'mailchimp' audience)

### Worker Deployment

Worker development and deployment require Node.js 22+ (Wrangler 4).

```bash
cd workers/newsletter-subscribe
npm install
wrangler secret put RESEND_API_KEY  # Full Access key required
wrangler deploy
```

### Configuration
- `wrangler.toml` — Worker config with `RESEND_AUDIENCE_ID` and `ALLOWED_ORIGIN`
- Worker URL: `https://dustwave-newsletter.jogo.workers.dev`
- CORS allows `https://dustwave.xyz` and localhost for dev

## Key Files

- `.eleventy.js` — Eleventy config, shortcodes, and `toWebp` filter
- `.pages.yml` — Pages CMS collection definitions
- `gulpfile.js` — Sass compilation, CSS purge, asset pipeline
- `webp.mjs` — WebP image conversion script
- `src/_includes/snippets/meta-social.njk` — OG/Twitter/JSON-LD meta tags
- `src/_includes/snippets/share-panel.njk` — Share UI component
- `src/_includes/snippets/footer1.njk` — Footer with newsletter popup
- `src/_includes/snippets/bridgy-opt-in.njk` — Bridgy Fed opt-in link
- `src/feeds/feed.njk` — Main RSS feed (for Substack import)
- `src/feeds/syndicate.njk` — Full-content RSS feed
- `scripts/render-og-cards.mjs` — OG image generator
- `scripts/ping-bridgy.mjs` — Bridgy Fed webmention sender
- `workers/newsletter-subscribe/src/index.js` — Newsletter signup Worker
- `ROADMAP.md` — Planned product and infrastructure work

## Shortcodes

```njk
{% youtube "VIDEO_ID" %}                 {# Responsive YouTube embed #}
{% vimeo "VIDEO_ID" %}                   {# Responsive Vimeo embed #}
{% img "/img/photo.jpg", "alt" %}        {# Styled image #}
{% bgImg "home/name", "jpg" %}           {# Background image #}
```

## License

See [LICENSE](LICENSE) file.
