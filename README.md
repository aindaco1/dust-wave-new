# Dust Wave Website

Static website for [dustwave.xyz](https://dustwave.xyz), built with Eleventy and Bootstrap 5.

## Requirements

Node.js v14+ required. Check your version:
```bash
node --version
```

## Installation

```bash
npm install
```

## Development

Run local dev server with hot reload:
```bash
npm run watch
```
Builds to `/dev` and starts BrowserSync with auto-refresh on changes.

## Deployment

Push to `main` branch → GitHub Actions builds and deploys via GitHub Pages artifacts automatically. No manual build needed.

You can also trigger a manual deploy from the Actions tab → "Build and Deploy" → "Run workflow".

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
│   ├── webp/        # WebP versions (mirrors structure above)
│   └── [project]/   # Per-project galleries (behind-the-scenes, posters)
├── members/         # Team member profiles (Markdown)
├── posts/           # Film project pages (Markdown)
├── news/
│   ├── digests/     # Auto-generated DIY Digests
│   └── *.md         # Regular news articles
└── scss/
    └── themes/      # Custom Bootstrap theme

dev/                 # Local dev build output (gitignored)
docs/                # Production build output (gitignored, deployed via CI)
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
og_alt: "Description of the image"   # Alt text for OG image
```

Every page automatically generates Open Graph and Twitter Card meta tags, plus JSON-LD structured data for SEO.

### Substack Export

Posts with `syndicate: ["substack"]` get a clean HTML export for manual copy/paste into Substack:

1. Run `npm run watch`
2. Open `dev/substack-export/{slug}.html` in browser
3. Copy and paste into Substack editor

The export automatically converts relative URLs to absolute, transforms YouTube/Vimeo iframes to plain URLs (Substack auto-embeds), and strips unnecessary markup.

Use `<!-- more:substack -->` in your markdown to control where the RSS excerpt ends — content after the marker stays only on dustwave.xyz.

See [AGENTS.md](AGENTS.md) for full syndication documentation including RSS feeds and Bridgy Fed setup.

## Key Files

- `.eleventy.js` — Eleventy config, shortcodes, and `toWebp` filter
- `.pages.yml` — Pages CMS collection definitions
- `gulpfile.js` — Sass compilation, CSS purge, asset pipeline
- `webp.mjs` — WebP image conversion script
- `src/_includes/snippets/meta-social.njk` — OG/Twitter/JSON-LD meta tags
- `src/_includes/snippets/share-panel.njk` — Share UI component

## Shortcodes

```njk
{% youtube "VIDEO_ID" %}        {# Responsive YouTube embed #}
{% vimeo "VIDEO_ID" %}          {# Responsive Vimeo embed #}
{% img "/img/photo.jpg", "alt" %} {# Styled image #}
{% bgImg "name" %}              {# Background image (webp) #}
```

## License

See [LICENSE](LICENSE) file.