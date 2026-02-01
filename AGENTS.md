# AGENTS.md - Dust Wave Website

## Commands
- **Dev server**: `npm run watch` (Eleventy + BrowserSync with hot reload)
- **Production build**: `npm run build` (outputs to `docs/` for GitHub Pages)
- **Eleventy only**: `npm run serve` or `npx eleventy`
- **Clean**: `npm run clean` (dev) | `npm run clean-prod` (docs)

## Git Workflow
- **`main` branch**: Source code only — no build output committed
- **Deployment**: Via GitHub Pages artifacts (no gh-pages branch)
- **Local development**: Use `npm run watch` → previews in `dev/` folder
- **To deploy**: Push source changes to `main` → GitHub Actions builds and deploys automatically
- **Manual deploy**: Actions tab → "Build and Deploy" → "Run workflow"
- **Pages CMS edits**: Trigger the same workflow, no conflicts
- **No pull conflicts**: CI never commits to `main`, so you can push freely

## Architecture
- **Static site generator**: Eleventy (11ty) v2 with Nunjucks templates
- **Styling**: Bootstrap 5 + custom SCSS in `src/scss/`, compiled via Gulp
- **Build pipeline**: Gulp handles SCSS, asset copying, CSS purge, and minification
- **Source**: `src/` → **Dev output**: `dev/` → **Prod output**: `docs/`

## Structure
- `src/_includes/layouts/` - Base templates (Nunjucks)
- `src/_includes/snippets/` - Reusable components
- `src/_data/` - Global data files (JSON)
- `src/members/` - Team member profiles (Markdown with frontmatter)
- `src/posts/` - Film project pages (Markdown)
- `src/news/` - News articles; `src/news/digests/` for DIY Digests
- `src/img/about/` - Member photos (800×800px, <200KB)
- `src/img/gifs/` - Project hover GIFs
- `src/img/stills/` - Project featured images
- `src/img/favicon/` - Favicons, logos, and branding
- `src/img/home/` - Homepage background GIFs
- `src/img/digest/header/` - DIY Digest header images
- `src/img/news/` - News article images and GIFs
- `src/img/webp/` - WebP versions (mirrors img/ structure)
- `src/scss/theme.scss` - Main stylesheet entry point

## Code Style
- Templates use Nunjucks (`.njk`) with frontmatter for metadata
- Content uses raw HTML/Markdown with YAML frontmatter (date, title, tags)
- SCSS follows Bootstrap variable conventions; custom styles in `theme.scss`

## Pages CMS Image Uploads
- Member photos → `src/img/about/`
- Featured images → `src/img/stills/`
- Hover GIFs → `src/img/gifs/`
- News images → `src/img/news/`
- Digest headers → `src/img/digest/header/`

## Syndication & Social Sharing

### Commands
- `npm run build:og` - Generate Open Graph images (requires Puppeteer)
- `npm run ping:bridgy` - Send webmentions for changed fediverse posts
- `npm run ping:bridgy:all` - Send webmentions for all fediverse posts

### Frontmatter Fields for Syndication
Posts and news (including `src/news/digests/`) can include these optional fields:

```yaml
syndicate:
  - substack    # Include in Substack feed (excerpt only)
  - fediverse   # Federate via Bridgy Fed
og_image: /img/og/custom-image.png   # Custom OG image (1200×630)
og_video: /img/og/custom-video.mp4   # Optional OG video
og_alt: "Description of the image"   # Alt text for OG image
share_text: "Custom share text"      # Override default share text
```

### Substack Export (Copy/Paste)
Posts with `syndicate: ["substack"]` get a clean HTML export at `dev/substack-export/{slug}.html` for manual copy/paste into Substack's editor.

**To use:**
1. Run `npm run watch` (or `npx eleventy`)
2. Open `dev/substack-export/{slug}.html` in browser or editor
3. Copy content and paste into Substack editor (Cmd+V)

**What gets cleaned:**
- Relative URLs → absolute (`https://dustwave.xyz/...`)
- YouTube/Vimeo iframes → plain URLs (Substack auto-embeds)
- `<h3>` → `<h2>` with `<hr>` divider before each
- Audio players → plain MP3 URLs (Substack auto-embeds)
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

### Feed Outputs
| Feed | URL | Content |
|------|-----|---------|
| Main/Substack | `/feed` | Excerpt only + "Continue reading" link |
| Syndicate | `/syndicate.xml` | Full HTML content |
| JSON Feed | `/syndicate.json` | Full HTML content (JSON format) |

All feeds use Mountain Time for dates and absolute URLs for images/links.

### Share Panel
Every news/project page includes a share panel with: Share button (Web Share API), Mastodon (with instance selector), Bluesky, X, Threads, LinkedIn, Facebook, Reddit, Email, Copy Link.

### Open Graph & Twitter Cards
Every page automatically generates OG and Twitter Card meta tags using:
- `og_image` frontmatter (if provided)
- `img` frontmatter converted to WebP (fallback)
- `/img/og/default.png` (last resort fallback)

Also includes JSON-LD structured data (Organization, Article/Movie, BreadcrumbList), theme colors, and PWA meta tags.

### Fediverse via Bridgy Fed
Posts with `syndicate: ["fediverse"]` include:
- Microformats2 markup (`h-entry`, `p-name`, `e-content`, etc.) — author is hidden visually but preserved for microformats
- `p-bridgy-bluesky-content` provides plain text summary for Bluesky (avoids HTML rendering issues)
- Bridgy Fed opt-in link for federation
- CI job sends webmentions after deploy (requires `BRIDGY_FED_ENABLED=true` repo variable)

**Limitations:**
- Bridgy Fed has anti-backfill protection — posts older than ~2-4 weeks may be silently dropped
- Only new posts published after connecting to Bridgy Fed will reliably federate
- The ping script adds 5-second delays between posts to avoid rate limiting
- Bluesky federation is slower than Fediverse; posts may take several minutes to appear

### Files
- `src/_includes/snippets/meta-social.njk` - OG/Twitter meta tags
- `src/_includes/snippets/share-panel.njk` - Share UI
- `src/_includes/snippets/bridgy-opt-in.njk` - Bridgy Fed opt-in link
- `src/feeds/feed.njk` → `/feed` (main RSS feed for Substack import)
- `src/feeds/syndicate.njk` → `/syndicate.xml`
- `src/feeds/syndicate-json.njk` → `/syndicate.json`
- `scripts/render-og-cards.mjs` - OG image generator (Puppeteer)
- `scripts/ping-bridgy.mjs` - Bridgy Fed webmention sender

### Setup Checklist
1. Install Puppeteer for OG cards: `npm install puppeteer`
2. Create default OG image: `src/img/og/default.png` (1200×630)
3. Register at webmention.io and update endpoint in `src/_includes/snippets/head.njk`
4. Set up Bridgy Fed at https://fed.brid.gy/
5. Add `BRIDGY_FED_ENABLED=true` as GitHub repo variable to enable CI federation