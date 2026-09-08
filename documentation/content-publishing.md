# Content publishing

For editors and developers maintaining pages, media, feeds, and social previews.
Source paths below are relative to the repository root. Use the
[development guide](development.md) to install dependencies and start a preview.

## Content Management

Content is managed via [Pages CMS](https://pagescms.org/) configured in `.pages.yml`.

### Collections

- **👥 Members** (`src/members/`) — Team member profiles for the About page
- **🎬 Film Projects** (`src/posts/`) — Edit existing project pages and structured media fields — [How-To Guide](https://www.notion.so/dustwave/2ca86545942d806c8077ef5b7ee5fa60#2ca86545942d80f7b446c2f1edc4afc2)
- **📢 News** (`src/news/`) — Announcements with raw HTML/Markdown content — [How-To Guide](https://www.notion.so/dustwave/2ca86545942d806c8077ef5b7ee5fa60#2ca86545942d80a8b1bfe2c2225602f9)
- **📜 DIY Digests** (`src/news/digests/`) — Weekly digests (HTML editing only)

Pages CMS merges editor changes into existing frontmatter so newer or
template-owned metadata is not silently removed. Film Projects and DIY Digests
are edit-only: create, rename, and delete are disabled because those workflows
also depend on files outside their collection.

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

### Editing Film Projects

Pages CMS exposes the current project metadata model, including directors,
featured-image alt text, WebM/MP4 hover previews, accessible galleries, posters,
embedded YouTube/Vimeo videos, coming-soon state, syndication, and social-card
overrides.

Creating a project remains a repository workflow rather than a CMS action. A
new project must add all three of the following together so the production
frontmatter gate remains valid:

1. The canonical page in `src/posts/`
2. Its localized page in `src/es/project/`
3. Its entry in `src/_data/projectTaxonomy.json`

News creation remains available. Pages CMS prompts for the filename on creation
so editors can choose a stable, concise URL slug independently of the headline.

### Image Guidelines

| Type | Size | Max File Size |
|------|------|---------------|
| Member Photo (about/) | 800×800px (1:1) | 200KB |
| Featured Image/GIF | 1800×1012px (16:9) | 400KB image / 8MB GIF |
| Hover Video (project-videos/) | 16:9 short loop | Keep web-optimized |
| Hover Video Poster | Match the project card crop | 400KB |
| News Header (news/) | 1600×900px (16:9) | 350KB |
| Digest Header (digest/header/) | 1600×900px (16:9) | 350KB |

Square app icons can use `imgDisplay: compact`. Color inversion is separate:
set `imgInvert: true` only when the artwork needs it against the page background.
For a square social preview, set `og_image_width` and `og_image_height` to the
image's actual pixel dimensions. These options are editable in Pages CMS.

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

Every page automatically generates Open Graph and Twitter Card meta tags,
JSON-LD structured data, theme colors, and PWA-related metadata. Social-image
precedence and generation are described below.

Film-project Movie JSON-LD reads its director list from each canonical project
page's `directors` frontmatter. Pages CMS exposes this as **Director(s)**, with
one person per entry; localized project pages reuse the canonical project's
structured `Person` entries.

### RSS Feeds

| Feed | URL | Content |
|------|-----|---------|
| Main/Substack | `/feed` | Excerpt only + "Continue reading" link |
| Syndicate | `/syndicate.xml` | Full HTML content |
| JSON Feed | `/syndicate.json` | Full HTML content (JSON format) |

All feeds use Mountain Time for dates and absolute URLs for images/links.

### Substack Export (Copy/Paste)

Posts with `syndicate: ["substack"]` get a clean HTML export at `dev/substack-export/{slug}.html` for manual copy/paste into Substack's editor.

**To use:**

1. Run `npm run watch` (or `npx eleventy`)
2. Open `dev/substack-export/{slug}.html` in browser or editor
3. Copy content and paste into Substack editor (Cmd+V)

The reusable cleanup contract lives in `lib/substack-export.cjs`; `.eleventy.js` only registers it as a filter. Run `npm run test:substack-export` after changing that module. The production `npm run build` includes this focused regression gate.

**What gets cleaned:**

- Relative URLs → absolute (`https://dustwave.xyz/...`)
- Digest YouTube videos → standalone canonical URLs for Substack's native embeds; other YouTube/Vimeo embeds → plain URLs
- `<h3>` → `<h2>` with `<hr>` divider before each
- Digest podcast players → linked Overcast artwork/title, without a bare URL embed
- Digest podcast images → responsive with a 450px maximum width
- Digest promo/postface images → semantic figures/captions with a 500px maximum width
- Digest article and podcast/video cards → dividers between items only
- Image captions → `<figure>/<figcaption>` (Substack supports these)
- Video captions → removed (Substack doesn't support)
- Author signature block → removed
- Classes, styles, scripts, navs, SVGs → stripped
- `<!-- more:substack -->` marker → removed

**Header format:**
```
Originally published on July 4, 2025 at dustwave.xyz
```

**Note:** These files are dev-only — excluded from production build (`docs/`).

**Substack editor limitation:** Substack does not support custom post CSS/HTML as a stable contract. The export uses semantic figures, alt text, linked media, and intrinsic width hints for copy/paste. After pasting, verify each imported image in Substack's web editor; use its native image resize and caption controls if the editor normalizes imported dimensions or captions.

### Substack Excerpt Marker (for RSS feed)

Add `<!-- more:substack -->` in your markdown to control where the RSS feed excerpt ends:

```markdown
This content appears in both Substack feed and the website.

<!-- more:substack -->

This content only appears on the website.
{% youtube "VIDEO_ID" %}
```

- Content **before** the marker goes to Substack RSS feed with a "Continue reading" link
- Content **after** the marker stays only on dustwave.xyz
- The marker is invisible on the website
- If no marker: falls back to first paragraph
- Images use absolute URLs automatically (`https://dustwave.xyz/img/...`)

### Fediverse via Bridgy Fed

Posts with `syndicate: ["fediverse"]` are federated via [Bridgy Fed](https://fed.brid.gy/):

- Microformats2 markup (`h-entry`, `p-name`, `e-content`, etc.) is automatically added; the author remains available to parsers while hidden visually
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
- Newly published posts after connecting are the reliable path; do not assume historical posts will backfill
- The ping script waits five seconds between posts to limit request volume
- Bluesky federation is slower; posts may take several minutes to appear

### Open Graph images and sharing

`npm ci` installs the declared Puppeteer development dependency. Generate
1200×630 OG images with:

```sh
npm run build:og
```

This generator is also part of `npm run build`. It writes generated cards to
`dev/img/og/` and `docs/img/og/`; the source fallback is
`src/img/og/default.png`.

For non-GIF project heroes and other pages, the social preview fallback is
`og_image` → `img` → `/img/og/default.png`. Eligible JPG/PNG `img` paths become
WebP only in the Pages/WebP build. A project hero GIF takes precedence over
`og_image`, consistently across OG, Twitter, and Movie JSON-LD.

### Share panel

Every news/project page includes a share panel with: Share button (Web Share API), Mastodon (with instance selector), Bluesky, X, Threads, LinkedIn, Facebook, Reddit, Email, Copy Link.

## Media upload locations

| Asset | Source location |
|---|---|
| Member photos | `src/img/about/` |
| Featured project images | `src/img/stills/` |
| Hover GIFs | `src/img/gifs/` |
| News images | `src/img/news/` |
| Digest header images | `src/img/digest/header/` |
| Favicons and branding | `src/img/favicon/` |
| Homepage background media | `src/img/home/` |

Pages CMS maps the configured `src/img` media input to public `/img` URLs.
Follow the size guidance above and preserve originals. Generated WebPs belong
only in build output; see [WebP images](development.md#webp-images).

## Shortcodes

```njk
{% youtube "VIDEO_ID" %}                 {# Responsive YouTube embed #}
{% vimeo "VIDEO_ID" %}                   {# Responsive Vimeo embed #}
{% img "/img/photo.jpg", "alt" %}        {# Styled image #}
{% bgImg "home/name", "jpg" %}           {# Background image #}
```

## Implementation and validation

- [.pages.yml](../.pages.yml): collections, edit permissions, and image locations.
- [meta-social.njk](../src/_includes/snippets/meta-social.njk): social meta tags
  and structured data; [social-preview-image.cjs](../lib/social-preview-image.cjs)
  owns preview-image precedence.
- [share-panel.njk](../src/_includes/snippets/share-panel.njk): shared share UI.
- [bridgy-opt-in.njk](../src/_includes/snippets/bridgy-opt-in.njk): federation
  opt-in; [head.njk](../src/_includes/snippets/head.njk) holds the webmention endpoint.
- [substack-export.cjs](../lib/substack-export.cjs): the single cleanup contract.
- [feed.njk](../src/feeds/feed.njk), [syndicate.njk](../src/feeds/syndicate.njk),
  and [syndicate-json.njk](../src/feeds/syndicate-json.njk): feed outputs.
- [render-og-cards.mjs](../scripts/render-og-cards.mjs) and
  [ping-bridgy.mjs](../scripts/ping-bridgy.mjs): generation and federation tools.

Run the [focused content/export checks](testing.md#focused-checks) for changed
contracts. Inspect the actual rendered page and any pasted Substack images or
captions before reporting publication acceptance.
