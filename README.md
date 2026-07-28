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

### Podcast UI configuration

The Pages build reads the following GitHub Actions repository variables:

- `PODCAST_ADMIN_API_ORIGIN`
- `PODCAST_ADMIN_TURNSTILE_SITE_KEY`
- `PODCAST_MEMBER_API_ORIGIN`
- `PODCAST_MEMBER_TURNSTILE_SITE_KEY`
- `PODCAST_CHECKOUT_TURNSTILE_SITE_KEY`

Cloudflare Pages previews consume the checked-in `_headers` file. All
`pages.dev` deployment hosts are noindex, while `/admin/*` and
`/podcasts/account/*` additionally use `no-store`, deny framing, suppress
referrers, and disable browser capabilities those authenticated shells do not
need. The rules deliberately do not apply anti-framing headers to public
podcast embeds.

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

That command deliberately overrides the public, member, Admin, and Checkout
API origins with
`https://dust-wave-podcast-staging.jogo.workers.dev`. Do not substitute
`feeds.dustwave.xyz` or `media.dustwave.xyz`: those names remain reserved for
the future production Worker routes and may not have DNS records during
staging. It also resolves the exact current Git commit and uses that SHA for
every browser asset cache key; CI uses `GITHUB_SHA`, and an explicit
`DUST_WAVE_ASSET_VERSION` must likewise be a full Git SHA-1 or SHA-256. The
command contains no secret; the Turnstile site key is public, but it is
supplied explicitly so a production widget is never selected by accident.

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

Use `--viewport 390x844` for the mobile breakpoint, or override the safe
staging default explicitly:

```bash
npm run perf:podcast-admin:trace -- \
  --viewport 390x844 \
  --url https://dust-wave-website-staging.pages.dev/es/admin/podcasts/
```

Load the resulting JSON from Chrome DevTools **Performance → Load profile**.
Trace files contain visited URLs and page metadata, so review them before
sharing. Run `npm run perf:podcast-admin:trace -- --help` for all options.

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
