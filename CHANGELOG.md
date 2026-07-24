# Changelog

## v1.2.0 - Unreleased

- Added the pinned `aindaco1/dust-wave-platform` submodule and recursive CI checkout as the independently versioned shared-code boundary for Dust Wave, Pool, Store, and Podcast.
- Advanced that boundary to `@dustwave/worker-core` 0.2.0 so all four
  consumers pin the typed crypto, Stripe, and Turnstile release while the
  static site remains independent of Worker-only code.
- Added the private `/admin/podcasts/` workbench on the stacked shared
  `@dustwave/admin-shell` boundary, with passwordless session exchange, show
  settings, episode drafts, multipart media upload, idempotent publication,
  directory status, and fail-closed premium readiness.
- Added a Sponsors tab that previews show-scoped house/direct sponsor decisions
  against episode, position, date, device, and app context while keeping public
  playback full-file-only and leaving decision/impression state untouched.
- Added show-scoped house/direct campaign drafting, readiness/blocker lists,
  approval controls, and a confirmed kill switch; campaign mutations remain
  limited to Admin/Super-admin roles and backend audit/approval gates.
- Added a data-driven, zero-episode-capable Podcast show route and seeded **Ópera en la Selva** with its authorized Substack artwork, free public access, and launch prices of $5/month or $50/year for early access and bonus episodes.
- Reserved `feeds.dustwave.xyz` and `media.dustwave.xyz`, added bilingual Spanish/English show copy, and configured seven-day early access plus one free mini episode for **Ópera en la Selva**.
- Added the generated Podcast publication contract so one canonical Worker publication can create a News episode page, appear in the show aggregate, and reuse the deployed Digest player.
- Added an executable Podcast show-data validation gate; no episode or checkout is fabricated before the corresponding runtime records and Stripe prices exist.
