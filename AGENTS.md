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
- `src/posts/` - Film project pages (Markdown)
- `src/news/` - News articles; `src/news/digests/` for DIY Digests
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
- Featured images → `src/img/stills/`
- Hover GIFs → `src/img/gifs/`
- News images → `src/img/news/`
- Digest headers → `src/img/digest/header/`
