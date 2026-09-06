# AGENTS.md - Dust Wave Website

## Read first

Start with [README.md](README.md) and the guide for the area being changed:

- [Development and deployment](documentation/development.md): architecture,
  immutable shared-code pin, build commands, hosting, and release procedure.
- [Content publishing](documentation/content-publishing.md): Pages CMS,
  frontmatter, image locations, feeds, Substack cleanup, and sharing.
- [Podcast integration](documentation/podcasts.md): site/API ownership,
  staging configuration, publication, and review contracts.
- [Testing and performance](documentation/testing.md): required checks and
  focused validation commands.
- [Roadmap](documentation/roadmap.md): plans and links to dated evidence.
- [Newsletter Worker](workers/newsletter-subscribe/README.md): signup and
  welcome-email behavior, configuration, and deployment.

Keep detailed procedures in those guides and link to them here.

## Repository rules

- Source lives in `src/`. Eleventy 3 renders Nunjucks templates and Markdown;
  Gulp compiles Bootstrap 5/custom SCSS and prepares production assets.
- `main` contains source only. GitHub Pages deploys artifacts; CI never commits
  generated output to `main`, and there is no `gh-pages` deployment branch.
- `documentation/` contains maintained documentation. `dev/` and `docs/` are
  disposable build output; cleanup and dev-server shutdown delete their contents.
- Keep `README.md`, `AGENTS.md`, `CHANGELOG.md`, `LICENSE`, and
  `THIRD_PARTY_NOTICES.md` at the root. The build and attribution validators
  consume the root third-party notices.
- Preserve unrelated worktree changes. Keep shared-platform docs and code in
  their submodule, following its own guidance when working there.
- Extend existing shared templates, selection flows, styles, and contracts.
  The site, Newsletter Worker, and Podcast backend own separate deployments.

## Commands and checks

Run commands from the repository root unless a guide says otherwise.

- Install: `git submodule update --init --recursive`, then `npm ci`.
- Develop: `npm run watch` (Eleventy server plus Gulp asset watcher).
- Eleventy only: `npm run serve` or `npx eleventy`.
- Production build: `npm run build`; Pages/WebP build: `npm run build:ci`.
  The explicit Podcast staging wrapper also uses the Pages/WebP pipeline.
- Full Podcast/security gate: `npm run check:podcasts`. CI runs this separately
  from the build; `npm run build` does not replace it.
- Clean generated output: `npm run clean` / `npm run clean-prod`.
- Run checks appropriate to the change and `git diff --check`; use the
  [testing guide](documentation/testing.md) for focused commands and release gates.

## Contracts to preserve

- SCSS follows Bootstrap variable conventions; use the existing theme partials.
- Content uses YAML frontmatter and Markdown/raw HTML. Project creation updates
  the canonical page, localized page, and taxonomy together. Keep interface
  translations in sync; News remains in its published language.
- Keep Substack cleanup in `lib/substack-export.cjs`; `.eleventy.js` only
  registers it. Run `npm run test:substack-export` after changes.
- Phone-width and narrow-column Digest players share `audio-card-grid-layout`
  in `src/scss/themes/base/_audio-player.scss`. Keep grid structure there;
  `_digest.scss` supplies Digest artwork sizes and responsive overrides.
- Keep Podcast-only styles in the appropriate additive bundle and validate
  visual changes in the rendered UI at relevant widths.
- Treat dated QA/provider evidence as historical. Local tests, deployment,
  provider acceptance, and manual device checks are separate claims.
