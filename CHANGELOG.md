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
- Added producer/admin sponsor-creative upload and validation: the browser
  streams a bounded MP3 to private R2, declares its byte size explicitly, and
  requires exact frame/profile/duration/digest evidence before approval.
- Added producer-reviewed episode ad plans: marker intent, isolated FFmpeg
  processor manifests, and explicit approval controls for frame-aligned program
  segments remain separate from the still-disabled request-time delivery gate.
- Added a data-driven, zero-episode-capable Podcast show route and seeded **Ópera en la Selva** with its authorized Substack artwork, free public access, and launch prices of $5/month or $50/year for early access and bonus episodes.
- Reserved `feeds.dustwave.xyz` and `media.dustwave.xyz`, added bilingual Spanish/English show copy, and configured seven-day early access plus one free mini episode for **Ópera en la Selva**.
- Added the generated Podcast publication contract so one canonical Worker publication can create a News episode page, appear in the show aggregate, and reuse the deployed Digest player.
- Added an executable Podcast show-data validation gate; no episode or checkout is fabricated before the corresponding runtime records and Stripe prices exist.
- Advanced the shared boundary to `@dustwave/admin-shell` 0.2.0 and reused its
  policy-injected tagged-link and accessible PNG/SVG QR primitives in a
  responsive Podcast Marketing share kit; no campaign state or alternate QR
  implementation is introduced.
- Added a Pool/Store-style WYSIWYG announcement review that normalizes
  English/Spanish content and shows only the explicitly opted-in, currently
  entitled audience count plus pseudonymous revision hashes. The UI has no send
  action and the Worker has no announcement delivery route or Resend call.
- Added explicit, reversible per-show announcement opt-in and English/Spanish
  preference controls to the Podcast member account. Subscription access does
  not imply consent, and member responses continue to omit email and provider
  identifiers.
