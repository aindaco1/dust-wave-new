# Podcast platform execution strategy

Strategy source date: 2026-08-02
Documentation consolidated: 2026-09-06

This document preserves the agreed product contract and delivery strategy.
The delivery sequence describes the plan, not a current completion checklist.
Dated staging results, the former immediate queue, and owner decisions are in
the [August 2 evidence record](../archive/2026-08-02-podcast-staging-evidence.md).
Use the backend references at the end of this document and the Worker's live
readiness projection for current launch state. The move did not refresh
provider evidence or authorize production promotion.

Back to the [roadmap](../roadmap.md); see [site integration](../podcasts.md) for
the current frontend contract.

Primary launch show: `Ópera en la Selva`

Delivery model: multi-show-ready architecture with a single-show launch UI

Environments: staging evidence first; production remains fail-closed until every applicable promotion gate passes

## Outcome

Finish Dust Wave's self-hosted podcast platform as an episode-centered,
low-maintenance publishing system. A producer should upload audio or video once,
review only the decisions that require judgment, schedule a release, and let the
system perform the repeatable work:

1. source verification, quality control, enhancement, and delivery rendering;
2. transcription, bilingual review, alignment, chapters, clips, captions, and
   audiograms;
3. premium early access, ad-free and bonus delivery, subscriptions, and Pool
   benefits;
4. one root public-release event for the canonical News page, show page, RSS,
   YouTube, announcements, and directory monitoring;
5. real-time house and direct-sponsor ad decisions;
6. analytics, reconciliation, retries, alerting, and rollback.

After each directory's one-time account verification and feed submission, one
publish action should send an episode live through the canonical feed to 10+
platforms. Provider review and ingestion latency must remain visible rather
than being represented as synchronous file uploads.

## Product contract

### Public and premium publishing

- Every episode has a canonical Dust Wave News page.
- Every podcast has a Dust Wave show page, including before it has episodes.
- Public and free-mini episodes appear in the public RSS feed.
- Early-access episodes appear in entitled private feeds at the configured
  premium time and in public RSS at public release.
- Premium-only bonuses have public teaser pages without protected media or
  metadata leakage and never publish to YouTube.
- YouTube receives native video when available and an audio-only rendition
  otherwise. Early episodes reach YouTube only at public release.
- The existing Dust Wave Digest/podcast player remains the playback and download
  component on canonical pages.

### Membership and revenue

- Per-show monthly and annual USD pricing remains configurable.
- `Ópera en la Selva` launches at $5 monthly or $50 annually, without a trial.
- Initial benefits are ad-free listening, seven-day early access with
  per-episode override, bonus episodes, and at most one free mini-episode.
- The Store's versioned tax calculator remains the tax engine. Stripe Tax stays
  disabled.
- Pool can issue signed, show-scoped benefit grants or redeemable codes while
  Dust Wave owns redemption, private feeds, and listener access.
- Resend magic links provide listener access and Stripe Customer Portal entry.

### Marketing, clips, and ads

- Generate editable transcripts, chapters, captioned clips, audiograms, and
  social copy from the approved media revision.
- Reuse the Pool/Store WYSIWYG and timed-text primitives for editing rather than
  adding a separate editor.
- Select ads at request time by show, episode, position, date, device, and app.
- Support Dust Wave house promotions and directly sold sponsors with explicit
  disclosures, qualified-download rules, privacy-minimized analytics, and a
  static enclosure fallback.

## DRY architecture rules

1. **D1 is the source of truth.** GitHub Actions, Stripe, Resend, and YouTube are
   processors or providers, never alternate workflow databases.
2. **Reuse the existing Worker job engine.** Extend its D1 rows, Cloudflare
   Queue, five-minute recovery trigger, revision guards, and signed callbacks.
   Do not add a second orchestration product unless the current model becomes
   insufficient.
3. **Use one serializable event envelope.** Send only durable job ID, show and
   episode IDs, exact revision, manifest digest, request time, and correlation
   ID. Never put credentials, private URLs, listener identity, transcript text,
   or media in queue messages or logs.
4. **Use one readiness projection.** The admin Autopilot card, CLI gate, email
   digest, and promotion workflow consume the same versioned readiness result.
5. **Use one processor dispatch boundary.** A small durable ledger connects an
   existing processor job to its GitHub workflow/run, retries, heartbeat, and
   reconciliation state. Do not duplicate processor-specific media tables.
6. **Reuse CI plumbing.** Checkout, dependency setup, manifest validation,
   signed callback, artifact policy, cancellation, and failure reporting belong
   in one reusable workflow or composite action.
7. **Share only proven cross-runtime primitives.** Move code into
   `dust-wave-platform` only after characterization and at least two real
   consumers. Similar business rules remain behind injected policies.
8. **Keep runtimes and secrets separate.** Site, Podcast, Pool, and Store retain
   independent sessions, provider scopes, deployments, and least-privilege
   credentials even when they reuse the same package or configuration shape.
9. **Make replay safe.** Every provider call has a stable idempotency key,
   revision check, bounded retry policy, reconciliation path, kill switch, and
   terminal failure state.
10. **Keep manual controls as break glass.** Routine work is automatic; a
    Super-admin can inspect, retry, cancel, or reconcile without bypassing
    revision and authorization checks.

## Target episode workflow

1. Save episode metadata and upload source audio or video.
2. Verify the source manifest and run source-audio QC.
3. Create enhancement previews and evaluate technical evidence.
4. Pause only for a promote/reject master decision.
5. Render delivery MP3, player peaks, and YouTube audio rendition.
6. Transcribe privately and propose Spanish-primary metadata, English
   translation, show notes, captions, and social copy. Keep unapproved
   transcripts and transcript-dependent resources private.
7. Consolidate launch-critical audio, metadata, rights, release, and ad-plan
   decisions into one approval surface.
8. Freeze an exact publication snapshot and schedule premium/public release.
9. At premium time, expose entitled private-feed content only.
10. At public time, commit one publication revision and fan out News, RSS,
    YouTube, announcement, and directory-observation jobs.
11. Reconcile provider outcomes, retry safely, and alert only on an actionable
    decision or terminal failure.
12. Post-launch, review the bilingual transcript, pass H1 word alignment, and
    approve transcript-dependent chapters, word-level controls, and clips.

## Automation-first remainder

The remaining work is executed as durable jobs and versioned gates, not as an
operator checklist. Each row below extends an existing primitive; none creates
a second scheduler, readiness model, editor, identity store, or provider ledger.

| Order | Trigger | Zero-touch work | The only permitted pause |
|---|---|---|---|
| 1. Publication snapshot | Launch-critical media, metadata, rights, release, and ad-plan gates pass | Freeze one immutable revision; render News/show/RSS/private-feed/YouTube projections; validate canonical URLs, artwork, enclosure range behavior, premium timing, bonus exclusions, ad-free variants, and player/download parity; confirm that unapproved transcript/chapter resources are absent; schedule premium and public root events | Confirm final rights-sensitive copy, release time, and public/premium intent once |
| 2. Stripe and tax | A versioned accountant policy document is present | Validate and import policy through `@dustwave/tax-core`; reconcile test Product, monthly/annual Prices, Portal, and webhooks; run test-clock purchase, renewal, failure, recovery, cancellation, refund, duplicate, and out-of-order suites; persist only content-minimal evidence | Accountant approval of registration and taxability facts; live capability promotion remains separate |
| 3. Pool benefit | Synthetic lifecycle contract passes | Reuse the signed grant/revoke boundary; generate scoped redemption codes; continuously rehearse redeem, duplicate, revoke, expiry, subscription overlap, and private-feed rotation without copying unnecessary Pool identity | Approve the Pool tier/add-on policy and benefit duration, then run one controlled mapped grant |
| 4. YouTube and Resend | A frozen staging publication exists | Create revision-bound resumable uploads; force unlisted mode; reconcile the exact video ID; test audio-only and native-video paths, early/public timing, and bonus exclusion; send consented bilingual staging mail; reconcile delivery, unsubscribe, suppression, retry, and unordered events | Authenticate/2FA if the provider requires it and inspect one unlisted production-channel result plus one consented message |
| 5. Directories | Feed preflight passes with a public item | Generate the credential-free packet; prefill or browser-assist supported forms; record verification state; poll allowlisted listing URLs; verify show/episode identity; record setup, validation, ingestion, and failed-to-recovered evidence; enable the “10+ platforms” claim only at ten fully certified destinations | Provider login, terms, ownership codes, or provider review that cannot legally or technically be automated |
| 6. Direct sponsor pilot | Exact episode plan and sponsor contract are present | Validate disclosure/creative/date/position/device/app rules; select decisions in real time; run house fallback and virtual load matrices; observe one native-client qualified download; prove HEAD, partial, canceled, failed, and house-fallback requests do not qualify; reconcile pacing and billing evidence | Approve sponsor contract facts, creative, disclosure, and final episode plan |
| 7. Production promotion | Every staging launch node passes | Back up D1; apply ordered migrations; reconcile secret names and resources; deploy fail-closed; attach domains; run canary/range/private-leakage checks; promote capabilities independently; run focused gates after each flag; automatically roll back a flag or Worker version on failure | One explicit Super-admin promotion approval bound to the complete evidence snapshot |
| 8. Post-launch transcript and H1 | Core launch is stable and a pinned runner identity lacks current passing evidence | Build a versioned bilingual corpus bundle; verify rights manifests and digests; select representative English/Spanish windows and cut previews; pre-align words; generate a bounded review packet; dispatch the protected benchmark Action; validate resource, idempotency, clean-environment, and Python/JavaScript digest parity; persist the signed result; retry or reconcile ambiguity | Review public bilingual transcripts and gold word boundaries through expiring deep links; each approval names the exact corpus, runner revision, digest, and report hash |
| 9. Post-launch chapters and alignment-dependent clips | H1 evidence and exact transcript alignment pass | Offer exact alignment approval; on approval, discover chapter and clip proposals; run entity-grounding and unlabeled-speaker validators; render private caption/audiogram previews; group all current-revision proposals in one editorial review surface | Accept or edit subjective chapter boundaries, excerpts, captions, and social copy; no IDs, CLIs, or workflow dispatches |

Automation implementation rules:

1. Every job is discovered from D1 state and claims one exact immutable input
   fingerprint. Scheduled scans are bounded and safe to repeat.
2. Every external mutation has a stable idempotency key, persisted provider
   identity, signed callback, reconciliation query, terminal failure, and
   audited retry. A timeout is `unknown`, never `failed`, until reconciled.
3. Every automated proposal is private and current-revision-only. It may fill an
   editor but may not silently apply, approve, publish, charge, email, or upload.
4. Every human pause arrives as one bilingual, expiring, single-use Resend link
   to the exact existing Admin surface. The link carries no private content and
   cannot bypass recent-auth, role, CSRF, revision, or readiness guards.
5. Every gate exposes structured JSON consumed by Admin, CI, alerts, and
   promotion. Documents explain evidence but never duplicate readiness state.
6. Every new automated path adds success, stale-input, duplicate, timeout,
   retry, reconciliation, permission, leakage, and post-commit-metadata tests
   before staging deployment.

## Execution sequence

Completed implementation details belong in [CHANGELOG.md](../../CHANGELOG.md)
or the owning repository's release history. Reconcile remaining work against
the backend roadmap before starting a slice; the steps below retain their
original order and acceptance intent.

### P0 — autonomous control plane

- Add a durable processor-dispatch ledger keyed by the existing processor job.
- Dispatch GitHub Actions automatically from a scheduled workflow using its
  built-in short-lived `GITHUB_TOKEN`, least `actions: write` permission, and
  only the durable job identifier. Do not place a GitHub token in the Worker.
- Refactor repeated processor Actions setup into a shared, SHA-pinned boundary.
- Reconcile missing callbacks and ambiguous GitHub outcomes from the existing
  scheduled Worker handler.
- Configure Queue dead-letter handling and bounded replay.
- Add an episode-centered Autopilot card showing current state, next action,
  running work, approval waits, provider delays, and terminal failures.
- Preserve manual workflow dispatch as an audited Super-admin recovery action.

Exit criterion: an uploaded source reaches the next genuine approval without a
CLI command or manual GitHub Actions dispatch.

### P1 — launch episode media and editorial evidence

- Technically evaluate and privately compare the ready enhanced candidate.
- Promote or reject it; staging then generates delivery audio and player peaks
  automatically through the same guarded queue primitive.
- Complete launch-critical exact-revision production, rights, release, and
  metadata reviews. Keep unapproved transcripts and transcript-dependent
  resources private.
- Validate that segment captions and the existing player work without enabling
  word-level navigation, public transcript/chapter resources, or
  alignment-dependent clip controls.
- Finalize the first `Ópera en la Selva` title, Spanish-primary summary, English
  translation, release intent, and canonical News/show projections.

Exit criterion: the episode gate has no block, wait, or failure node.

### P2 — subscriptions, tax, and Pool benefits

- Define and validate a machine-importable accountant approval document with
  jurisdiction, registration, taxability, rate, effective date, evidence
  reference, and approval digest.
- Import the approved policy through `@dustwave/tax-core`; keep Stripe Tax off.
- Replace temporary Stripe credentials with a restricted Podcast test key.
- Idempotently reconcile Podcast test/live Product, Prices, Portal, and webhook
  configuration.
- Retain the completed 11/11 real-provider Launch Lab: hosted Checkout,
  renewal, failed renewal, recovery, refund, cancellation, webhook contract,
  product/price verification, duplicate delivery, and older-event
  reconciliation. Retain the automated Customer Portal configuration rehearsal;
  complete an authenticated listener return only when a consented fixture
  exists, without enabling public Checkout.
- Configure Pool benefit mapping as show-scoped policy; issue and revoke signed
  grants without copying unnecessary Pool identity into Podcast.

Exit criterion: the Stripe gate passes and both direct subscription and Pool
benefit paths have controlled end-to-end evidence.

### P3 — YouTube and announcements

- Use resumable, revision-bound YouTube uploads with persisted reconciliation
  state.
- Complete one unlisted production-channel full-episode test; reconcile
  ambiguous outcomes rather than retrying blindly.
- Enforce public-release timing and premium-bonus exclusion.
- Retain the current 4/4 Resend delivery, bounce, complaint, and suppression
  evidence; add unsubscribe evidence when a consented listener fixture exists.
- Keep provider-event deduplication and unordered delivery in every scheduled
  regression run.

Exit criterion: YouTube and Resend launch nodes pass while production public
delivery remains disabled.

### P4 — 10+ platform certification

- Generate a credential-free directory submission packet from canonical show
  state.
- Validate RSS, artwork, enclosure HEAD/range behavior, GUID stability,
  transcripts, chapters, and permanent URLs before submission.
- Browser-assist provider forms where permitted; stop only for login, 2FA,
  terms, ownership codes, or provider review.
- Poll public listings and record immutable setup, validation, ingestion, and
  failed-to-recovered evidence per destination.
- Enable the public “10+ platforms” promise only after ten enabled destinations
  pass every certification dimension.

Exit criterion: the distribution launch node certifies at least 10 targets.

### P5 — dynamic-ad pilot

- Pass the signed virtual-audio protocol and load matrices.
- Approve an exact-revision episode ad plan with show/episode/position/date and
  device/app rules.
- Validate house-promo fallback independently.
- Onboard a real direct sponsor through structured contract, disclosure, and
  creative fields.
- Record one qualified direct-sponsor download from a native podcast client and
  prove HEAD, partial, canceled, failed, and house-fallback requests do not
  qualify.

Exit criterion: the dynamic-ad durable pilot node passes with production mode
still disabled.

### P6 — production promotion

- Back up D1, apply ordered production migrations, and reconcile resource and
  secret-name posture.
- Run the complete check suite and both Wrangler dry deployments.
- Deploy the production Worker with provider switches still fail-closed.
- Attach `feeds.dustwave.xyz` and `media.dustwave.xyz`, then run canary and
  byte-range smoke tests.
- Promote exact-snapshot enforcement and provider capabilities independently:
  feed/media, News, YouTube, Resend, Checkout, Pool, then dynamic ads.
- Run focused smoke and launch gates after every change; automatically revert
  the flag or Worker version when a focused gate fails.

Exit criterion: every launch node passes in production, rollback is proven,
and the first scheduled public release reconciles across all applicable
destinations.

### P7 — post-launch completion

- The site's guarded show-management and shared show-selection UI is recorded
  in [v1.4.0](../../CHANGELOG.md#v140---2026-08-25). Verify any remaining
  backend/network launch requirements in the owning roadmap.
- Review and approve public Spanish/English transcripts through the existing
  WYSIWYG/timed-text surface.
- Complete the bilingual H1 gold corpus, previews, primary/replay outputs,
  measured clean resource runs, signed benchmark evidence, and exact alignment
  approval before enabling word-level controls.
- Generate and approve transcript-dependent chapters and captioned
  clip/audiogram candidates only after their exact alignment inputs pass.
- Add saved and scheduled reports, richer sponsor pacing, live/video clips,
  collaboration, listener questions, and deeper transcript discovery.
- Treat remote multitrack recording as a separate feasibility and recovery
  program, not an implicit extension of the hosting launch.

Archive.org remains out of scope.

## Automated verification

### Every pull request

- secrets scan, dependency audit, action SHA-pin validation, type checking,
  linting, unit tests, D1 migration/foreign-key checks, and staging/production
  dry builds;
- provider-contract and event-envelope tests;
- English/Spanish interface-key completeness while leaving News content in its
  published language;
- authenticated Playwright coverage at phone, tablet, laptop, and wide-desktop
  sizes, including keyboard/focus, accessible names, contrast, reduced motion,
  horizontal overflow, field spacing, and six-section admin navigation;
- Chrome performance traces with budgets for admin startup, episode switching,
  editor interaction, and publication review;
- media golden fixtures validated by digest and `ffprobe`.

### Failure and recovery matrix

- duplicate Queue delivery;
- lost, late, replayed, or incorrectly signed processor callback;
- processor completion after its source/publication revision changes;
- stale GitHub or YouTube run/session;
- provider 429 and 5xx responses;
- Worker interruption during provider work;
- duplicate and unordered Stripe/Resend webhooks;
- failed release followed by idempotent recovery;
- cancellation, refund, entitlement expiry, and private-feed rotation;
- premium token/content leakage and public 404 parity;
- disagreement between canonical News, RSS, show page, and YouTube applicability.

## Security, privacy, performance, and responsiveness

- Use GitHub App installation tokens instead of long-lived PATs.
- Keep production GitHub/YouTube/Resend/Stripe mutations behind independent
  environment modes and kill switches.
- Keep private masters, transcripts, manifests, provider payloads, and listener
  identities out of public artifacts and structured logs.
- Register every derived callback signature with the GitHub masking command
  before exposing it as a step output; retain only content-free evidence.
- Verify webhook signatures before parsing provider payloads and deduplicate by
  provider event ID.
- Keep Turnstile required for production admin/listener/Checkout flows and
  preserve origin, CSRF, rate-limit, single-use-link, and recent-auth checks.
- Stream large media, retain byte-range support, and keep content-addressed
  public derivatives cacheable and immutable.
- Keep heavyweight FFmpeg/Python work in GitHub runners rather than Worker
  request paths.
- Load admin workspaces progressively, preserve draft state during navigation,
  and keep advanced evidence collapsed until requested.
- Apply shared field/grid/action spacing primitives across breakpoints; no
  control or identifier may overflow its container.
- Retain privacy-minimized analytics: no durable raw IP/user agent, bounded
  uniqueness windows, methodology versioning, and honest non-IAB labeling.

## Repository ownership

| Repository | Responsibility |
|---|---|
| `dust-wave-podcast` | D1/Queue orchestration, provider adapters, media jobs, premium, ads, analytics, gates, and promotion safety |
| `dust-wave-new` | Public show/episode pages, existing player, common admin shell, approval UX, i18n, accessibility, and responsive layout |
| `dust-wave-alignment-runner` | Reproducible alignment adapters, resource limits, manifests, and benchmark evidence |
| `dust-wave-platform` | Versioned framework-neutral primitives with at least two characterized consumers |
| Pool | Benefit policy and signed grant/revoke boundary |
| Store | Shared tax-core characterization; no Podcast business logic |
| GitHub Actions | Stateless heavyweight processing; never durable business state |

## Human-decision boundary

Routine processing, scheduling, retries, reconciliation, reporting, staging
deployment, and monitoring should be zero-touch. External facts still require
an accountable decision:

- accountant approval of tax registrations and policy;
- provider login, 2FA, terms, ownership verification, and review;
- rights-sensitive or subjective approval of final master, metadata, sponsor
  creative, and first public promotion.

Reduce each to a concise, signed, expiring Resend approval link. Do not require
copying IDs, editing configuration, running CLIs, or inspecting technical logs.

## Definition of done

- One source upload advances automatically to its next genuine decision.
- No normal media processor requires manual GitHub Actions dispatch.
- Every job is idempotent, revision-bound, observable, retryable, and has a
  terminal recovery path.
- Public and private releases obey their timing and leakage contracts.
- Direct subscription and Pool benefit lifecycles work end to end.
- One exact revision drives canonical News, show page, RSS, YouTube,
  announcements, and directory monitoring.
- At least ten directories are fully certified.
- Dynamic ads pass native-client, load, privacy, fallback, and direct-sponsor
  evidence.
- Bilingual metadata and the existing player pass their launch gates. After
  launch, captioned clips, audiograms, public transcripts, and chapters pass
  their unchanged feature gates before those capabilities are enabled.
- Security, accessibility, performance, responsiveness, and recovery suites
  pass in CI and staging.
- Production promotion and rollback require no undocumented manual procedure.

## Authoritative implementation references

These files live in the separate Podcast backend repository. Its roadmap and
runtime gates own current completion and promotion state.

- Podcast roadmap: [ROADMAP.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/ROADMAP.md)
- Current human/provider inputs: [OWNER_ACTIONS.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/OWNER_ACTIONS.md)
- Staging execution and rollback: [STAGING_RUNBOOK.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/STAGING_RUNBOOK.md)
- Security boundary: [SECURITY.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/SECURITY.md)
- API contract: [API.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/API.md)
- Alignment evidence: [ALIGNMENT_GATE.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/ALIGNMENT_GATE.md)
- Dynamic-ad evidence: [DYNAMIC_ADS_GATE.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/DYNAMIC_ADS_GATE.md)
- Clip evidence: [CLIP_RENDER_GATE.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/CLIP_RENDER_GATE.md)
- Virtual-audio evidence: [VIRTUAL_AUDIO_GATE.md](https://github.com/aindaco1/dust-wave-podcast/blob/main/docs/VIRTUAL_AUDIO_GATE.md)
