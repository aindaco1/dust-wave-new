# AGENTS.md - Dust Wave Website

## Commands
- **Dev server**: `npm run watch` (Eleventy + BrowserSync with hot reload)
- **Production build**: `npm run build` (outputs to `docs/` for GitHub Pages)
- **Eleventy only**: `npm run serve` or `npx eleventy`
- **Clean**: `npm run clean` (dev) | `npm run clean-prod` (docs)

## Git Workflow
- **`main` branch**: Source code only — no build output committed
- **`gh-pages` branch**: Build output — managed entirely by GitHub Actions
- **Local development**: Use `npm run watch` → previews in `dev/` folder
- **To deploy**: Push source changes to `main` → GitHub Actions builds and deploys to `gh-pages`
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
- `src/posts/`, `src/news/`, `src/events/` - Content collections (Markdown)
- `src/scss/theme.scss` - Main stylesheet entry point

## Code Style
- Templates use Nunjucks (`.njk`) with frontmatter for metadata
- Content uses Markdown with YAML frontmatter (date, title, tags)
- SCSS follows Bootstrap variable conventions; custom styles in `theme.scss`
- Use `{% bgImg "name" %}` shortcode for WebP background images
