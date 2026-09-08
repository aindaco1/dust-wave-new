# Dust Wave Website

Website for [dustwave.xyz](https://dustwave.xyz), built with Eleventy 3,
Nunjucks, and Bootstrap 5 SCSS. Current release: `v1.4.0`.

This repository owns the public website, bilingual Podcast interfaces, and
newsletter signup Worker. Shared code is consumed through the pinned
`shared/dust-wave-platform` submodule; the Podcast backend has its own repository
and deployment.

## Get started

Use Node.js 24+; [.nvmrc](.nvmrc) selects the shared local/CI major version.

```sh
git submodule update --init --recursive
npm ci
npm run watch
```

The Eleventy development server and Gulp asset watcher rebuild into `dev/`.
Stopping the server removes and recreates both generated output directories,
`dev/` and `docs/`.

## Documentation

Maintained project documentation lives in `documentation/`. The separate
`docs/` directory is disposable production output, ignored by Git and uploaded
to GitHub Pages.

| Guide | Use it for |
|---|---|
| [Development and deployment](documentation/development.md) | Architecture, shared-code pin, commands, builds, releases, and hosting |
| [Content publishing](documentation/content-publishing.md) | Pages CMS, bilingual projects, media, feeds, Substack, and social previews |
| [Podcast integration](documentation/podcasts.md) | Site/API boundaries, staging configuration, and publication/review contracts |
| [Testing and performance](documentation/testing.md) | Required checks, focused regression commands, mock API, and browser traces |
| [Roadmap](documentation/roadmap.md) | Active plans, proposed work, and historical evidence |
| [Newsletter Worker](workers/newsletter-subscribe/README.md) | Signup behavior, configuration, deployment, and welcome-email testing |

[AGENTS.md](AGENTS.md) contains repository-wide working instructions.
[CHANGELOG.md](CHANGELOG.md) records releases. Shared-platform documentation
stays with the [submodule](shared/dust-wave-platform/README.md).

## Deployment

Push source changes to `main` to trigger the Build and Deploy workflow.
CI validates the site, builds a Pages artifact, deploys it, and runs the
Cloudflare cache/header steps. See the
[deployment and release procedure](documentation/development.md#deployment)
for acceptance checks.

## License

See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Community calendars

The Microcinema calendar and Writers Group queue share one independent
[Community Worker](workers/community/README.md). See its guide for admin access,
private submissions, testing, deployment and rollback.
