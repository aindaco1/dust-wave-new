# Development and deployment

For developers and release maintainers. Run shell commands from the repository
root unless a section names another working directory.

## Architecture and installation

The site uses Eleventy 3, Nunjucks templates, Markdown/YAML content, and Bootstrap
5 with custom SCSS. Eleventy renders `src/` into `dev/`; Gulp compiles styles,
copies assets into `dev/`, then prepares, purges, and minifies production output
in `docs/`.

Use Node.js 24+; [.nvmrc](../.nvmrc) selects the local/CI major version.
Install the recorded dependency tree:

```sh
git submodule update --init --recursive
npm ci
```

Clone with `--recurse-submodules` when possible. Existing checkouts must initialize the recorded `shared/dust-wave-platform` commit before installing or testing; CI pins that gitlink and does not follow the shared repository's moving branch.

The current immutable pin is Dust Wave Platform `v0.36.0` at
`af2a5e5e4b65f218e627652b8243feb9704c48a1`. An executable contract verifies
that gitlink plus the exact Admin Shell and Media Core versions used by this
site. Dust Wave retains its content, templates, Podcast UI policy, Newsletter
Worker credentials, Pages deployment, and independent one-commit rollback.

The site consumes Admin Shell `0.10.2` directly for characterized Podcast admin
browser assets and Media Core `0.4.0` as an exact package dependency for media
contracts. It does not inherit Pool, Store, or Podcast routes, data, sessions,
credentials, product policy, or deployments through Platform.

The shared repository's [README](../shared/dust-wave-platform/README.md) and
[AGENTS](../shared/dust-wave-platform/AGENTS.md) stay with its pinned source.

## Commands and generated output

| Command | Behavior |
|---|---|
| `npm run watch` | Starts the Eleventy development server and Gulp asset watcher with live reload |
| `npm run build-dev` | Builds a local preview, assets, and Podcast cards into `dev/` |
| `npm run serve` | Runs Eleventy with its server; use `watch` for the complete asset workflow |
| `npx eleventy` | Renders templates into `dev/` without the asset watcher |
| `npm run build` | Runs focused content/export tests, builds production output in `docs/`, generates social cards, and validates rendered i18n |
| `npm run build:ci` | Runs the production build with WebP URLs and generates the referenced WebP files |
| `npm run check:podcasts` | Runs the platform, credential, dependency, and Podcast validation gate separately |
| `npm run clean` | Removes generated `dev/` contents |
| `npm run clean-prod` | Removes generated `docs/` contents |

When `npm run watch` stops, including with Ctrl+C, its wrapper removes and
recreates both `dev/` and `docs/`. Gulp cleanup tasks also reset their output
directories. Never store maintained documentation or original media there.
Maintained guides live in `documentation/`; original site assets live in `src/`.

## Deployment

Push to `main` branch → GitHub Actions builds and deploys via GitHub Pages artifacts automatically. No manual build needed.

You can also trigger a manual deploy from the Actions tab → "Build and Deploy" → "Run workflow".

Deployment and semantic release are separate. Every accepted push to `main`
updates production, while version tags mark stable user-facing milestones.

### Releases

Use semantic versions for the website and Podcast Admin:

- Patch releases cover backward-compatible fixes, accessibility corrections,
  and performance improvements.
- Minor releases add backward-compatible user-facing capabilities.
- Major releases are reserved for intentionally incompatible contracts or
  workflows.

Release checklist:

1. Move the completed entries from `Unreleased` in [CHANGELOG.md](../CHANGELOG.md) to a dated
   version heading.
2. Update `package.json` and `package-lock.json` to the same version.
3. Run `npm run check:podcasts`, `npm run build`, and `git diff --check`.
4. Commit the release metadata, create an annotated `vX.Y.Z` tag, and push
   `main` plus the tag.
5. Confirm the Build and Deploy workflow, Cloudflare cache purge and header
   checks, then verify the live homepage, mobile navigation, and authenticated
   Podcast shell. A deployment is not complete merely because Pages accepted
   the artifact.

CI runs `npm run check:podcasts` before `npm run build:ci` as a separate
step. The gate verifies the shared-platform pin, scans tracked text through
the shared credential-leak gate, fails on high-severity dependency advisories,
and validates the bilingual Podcast surfaces. `npm run build` runs its own
focused content/export and rendered-i18n checks; it does not invoke that full
gate. See [Testing](testing.md) for the exact command scopes.

GitHub Actions are pinned to immutable commits. The post-deploy Cloudflare
purge calls the official API directly so no third-party action receives
credentials. Prefer a zone-scoped `CLOUDFLARE_CACHE_PURGE_TOKEN` with Cache Purge
permission; the existing email/global-key pair is a temporary compatibility
fallback.

Because production is served by GitHub Pages through Cloudflare, GitHub Pages
does not consume `_headers`. After every production deploy, the workflow
therefore translates the four authenticated route blocks in `_headers` into
one idempotent Cloudflare Response Header Transform Rule. The sync owns only
the stable `dust_wave_authenticated_shell_response_headers` rule, preserves
unrelated zone rules, and verifies both authenticated and public Podcast
responses after the cache purge. Prefer a zone-scoped
`CLOUDFLARE_TRANSFORM_RULES_TOKEN` with Zone Transform Rules Write permission;
the existing email/global-key pair remains a temporary fallback.

## Contact form provider

The bilingual Contact page (`src/contact.njk`) uses Cloudflare Turnstile and
`src/js/contact-form.js` to POST to Formspree's `xrgrjbwo` (Inquiries) endpoint
with `Accept: application/json`. Verification and submission results remain on
the Contact page. Keep CAPTCHA enabled and select **Turnstile** in Formspree's
CAPTCHA settings, with the secret matching the public site key in the template.
The secret belongs only in Formspree's provider settings, never in site source.
See [Formspree's Turnstile guide](https://help.formspree.io/articles/form-and-project-settings/protecting-your-forms-with-cloudflare-turnstile).

The form reuses `src/js/turnstile.js` (also exposed through the existing Podcast
loader exports) and Platform's responsive widget sizing. Submission stays disabled
until JavaScript and verification are ready. Failed requests preserve entered
text; a lost response is reported as uncertain delivery and never automatically
retried. Loading copy clears when the widget mounts, before visitor verification.
Failed attempts reset verification for a retry. A confirmed submission replaces
the fields and controls with the success message, removes the widget, and stops
its resize observer; late callbacks cannot restart verification. Local regression
tests stub the provider and challenge and never send a real message.

The provider setting is independent of a Pages deployment. After changing this
integration, verify both Contact page languages and the Formspree setting;
end-to-end delivery additionally requires a real, explicitly authorized test
submission. The Community forms use their own Worker and are separate.

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
    ├── theme.scss   # Main public stylesheet entry point
    └── themes/      # Custom Bootstrap theme

workers/
└── newsletter-subscribe/  # Cloudflare Worker for Resend integration

documentation/       # Maintained guides, plans, and historical evidence
shared/
└── dust-wave-platform/ # Pinned shared-code submodule

dev/                 # Local dev build output (gitignored)
docs/                # Production build output (gitignored, deployed via CI)
└── img/
    └── webp/        # WebP derivatives from the Pages/WebP pipeline
```

## Key implementation files

- [.eleventy.js](../.eleventy.js): templates, collections, filters, shortcodes,
  and the `src/` → `dev/` render configuration.
- [gulpfile.js](../gulpfile.js): SCSS, assets, CSS purge, and production copying.
- [package.json](../package.json): authoritative command definitions.
- [Build and Deploy](../.github/workflows/workflow.yml): CI checks, artifact
  upload, deployment, cache purge, and response-header sync.
- [watch-with-cleanup.mjs](../scripts/watch-with-cleanup.mjs): server lifecycle
  and generated-output cleanup.
- [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md): root attribution source
  copied into the built site and checked by player/Datatype validators.

## Frontend performance architecture

The public shell intentionally has no Font Awesome request and no Bootstrap
JavaScript runtime. Font Awesome Free vectors are inlined at build time, the
shared mobile navigation uses `src/js/site-navigation.js`, and the Mastodon
share prompt uses native `<dialog>` semantics. Bootstrap SCSS remains the
validated layout foundation.

Production CSS is split into the public `theme` bundle and additive
`podcast-public`, `podcast-member`, and `podcast-admin` route bundles. Keep new
Podcast-only selectors in the appropriate additive entrypoint so ordinary
pages do not pay for authenticated or episode tooling.

The home/projects animated background prefers `src/img/home/intro.webm`, falls
back to H.264 MP4, then to the existing small GIF when native video is
unavailable. Preserve the source GIF as the visual master; any future encode
must retain the 960×636 framing, 8 fps cadence, 6.75-second loop, and current
crop at the supported viewport matrix.

`scripts/validate-site-performance.mjs` keeps the optimized shell from
silently regressing. It enforces the native media sources and their byte
budgets, the small shared navigation controller, build-time icons, deferred
Quicklink loading, and the absence of global Font Awesome and Bootstrap
runtime requests.

## WebP Images

Local development and `npm run build` use the original JPG/PNG image paths and
never generate WebPs. The GitHub Pages workflow runs `npm run build:ci`, which
generates every WebP referenced by the deployed site directly in
`docs/img/webp/`. The CI build fails if a referenced WebP lacks a JPG/PNG
source. Generated WebPs are not stored in `src/` or committed to the repository.

The explicit [Podcast staging build](podcasts.md#staging-build) also uses
`build:ci` so its preview artifact contains the referenced WebP derivatives.

## Documentation maintenance

The [root README](../README.md#documentation) is the documentation index.
Keep each procedure in one guide and link to it from README and AGENTS.
Keep plans under `documentation/plans/` and dated evidence under
`documentation/archive/`. An archived result records its original scope and
does not establish current runtime or provider state.

Worker-specific procedures stay beside the Worker. Shared-platform docs stay
inside its submodule. Keep site content in `src/` so documentation is not
rendered or published as site content.

## Community calendar and Writers Group

The [Community Worker guide](../workers/community/README.md) owns the separate
D1/R2 deployment, email login, moderation and recurring meeting schedule.
`npm run build:community-staging` reuses the production WebP build and prepares
six page shells for its assets binding. Public calendar and agenda routes are
rendered at the edge from shared meeting records; page assets remain in Pages.
