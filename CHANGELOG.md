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
- Advanced `@dustwave/admin-shell` to 0.8.0 and added one bilingual,
  fail-closed review-draft guard. Unsaved transcript and chapter edits now
  survive canceled show, episode, language, chapter, and logout transitions,
  while browser exit uses the native warning and accepted discards remain
  explicitly browser-local.
- Added one bilingual create/edit episode form with immutable URL slugs,
  role-scoped edit controls, local release-time restoration, and responsive
  Pool/Store action spacing. Stored notes re-enter the editor only through the
  new shared `@dustwave/admin-shell` 0.7.1 sanitizer boundary; update payloads
  never send the canonical slug.
- Added an English/Spanish, current-page speaker-range review aid for long
  transcripts. Producer+ editors can apply an optional explicitly confirmed
  public name to a bounded set of visible cues without changing caption text,
  timing, or server state; the existing versioned Save action remains the only
  persistence path and approval stays disabled after changes.
- Added a self-hosted, checksum-pinned Datatype 1.2.2 pilot to Podcast audience
  analytics. Its English/Spanish, font-ready summary uses shared normalization,
  compact container axes, a text-only narrow state, and the existing exact
  trend as the accessible font-failure fallback.
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
- Extracted the existing Digest/podcast waveform player from the monolithic
  footer into one cached, reusable runtime and one shared Sass partial, pinned
  and self-hosted WaveSurfer 7.12.11, and stopped player/vendor loading on pages
  without an audio card.
- Added one noindex, CSP-constrained portable player page beside every
  published canonical Podcast News episode. It reuses the exact waveform,
  seek, speed, artwork, language-aware accessible labels, and download contract
  and links back to the canonical News page.
- Added a responsive Pool-inspired portable-player generator to Podcast
  Marketing. It exposes only due public revisions, enforces the selected
  show's exact same-origin canonical path, builds escaped lazy iframe markup,
  provides live preview/copy/open controls, and performs no server write.
- Added deterministic 1200×630 social cards for each published Podcast News
  episode. The static build reuses the Pool-characterized shared SVG primitive,
  validates and embeds only bounded local show artwork, rasterizes through the
  existing Sharp dependency, and emits crawler-safe PNGs without a browser,
  upload, or image SaaS. The canonical News page references that card, while
  Podcast Marketing can preview, copy, download, or open only due public
  revisions through the same exact canonical-path gate as the portable player.
- Made Streamlined Publishing show-scoped and operationally explicit across 11
  launch directories. The responsive Distribution tab now separates one-time
  owner setup from RSS ingestion, shows the selected show's exact canonical
  feed and readiness totals, renders the latest episode observation state,
  links to provider setup/public listings, and lets only show-scoped
  Admin/Super-admin roles update enabled/setup/listing state through the
  CSRF/audit-protected Podcast runtime.
- Added an episode release selector and bounded root-channel cards for the
  immutable publication revision. RSS, canonical News, and YouTube now expose
  queued/running/succeeded/failed truth, attempts, timing, safe provider/site
  evidence, and bounded errors separately from downstream directory ingestion.
- Added confirmed, role-scoped retry controls for failed immutable RSS, News,
  and YouTube root jobs. Producer/Admin/Super-admin roles can recover the exact
  current revision while Analysts retain read-only release evidence.
- Added evidence-backed per-episode directory reconciliation. Producer+ roles
  can mark the exact current revision observed only with an HTTPS evidence link,
  or record a bounded failure detail; incomplete owner setup stays immutable.
- Added a credential-free show/directory owner-action checklist for
  Admin/Super-admin roles: responsible account label, verification state,
  submission date, safe receipt/dashboard link, public listing, and bounded
  notes. The UI explicitly prohibits provider passwords and verification codes.
