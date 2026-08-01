# Dust Wave Podcast Platform Completion Plan

Status date: 2026-08-01
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

## Verified staging baseline

The content-free staging launch gate was run against the authorized Dust Don't
Settle source-test episode on 2026-07-31. It reported six passes, six blockers,
zero failures, and clean D1 referential integrity.

| Area | Verified state | Remaining promotion evidence |
|---|---|---|
| Environment | PASS | Staging and production provider modes are fail-closed; required staging secret names are installed |
| Show | PASS | Premium, RSS, canonical page, and YouTube show settings exist |
| Episode | BLOCK | The exact-master action link was delivered; complete the private listen and decide the enhanced master. Staging will then render delivery audio automatically; approve current audio, transcript, alignment, and chapters |
| Stripe | BLOCK | Import accountant-approved tax policy and complete controlled lifecycle tests |
| Distribution | BLOCK | Certify at least 10 destinations through setup, validation, ingestion, and recovery evidence |
| YouTube | BLOCK | Complete and reconcile one tightly controlled unlisted production-channel test |
| Resend | BLOCK | Complete one consented staging delivery and suppression exercise |
| Dynamic ads | BLOCK | Pass virtual-audio/load evidence and a qualified direct-sponsor pilot |

The Podcast Worker remains the authoritative source for live gate state. This
document records the execution strategy; it must not become a second manually
maintained readiness database.

## Execution progress

| Slice | State | Evidence |
|---|---|---|
| Completion plan | Complete | This document is checked into `dust-wave-new` |
| Processor discovery and dispatch | Deployed to staging; first live media-job evidence pending | Migration `0067` and the signed Worker/GitHub boundary are deployed; four protected-environment smoke runs claimed an empty ledger successfully, including run `30691943578` against the current incident-reconciliation contract, while production remains disabled and unmigrated |
| Shared processor CI setup | Implemented | Nine processor workflows and the dispatcher use one local composite action with a commit-SHA-pinned Node action and locked installs |
| Dispatcher regression coverage | Passing locally and in CI | Source discovery, exclusive lease, signature rejection, idempotent acknowledgement, bounded retry, accepted-run ambiguity, closed registry, least permissions, shared-action, and D1 compound-query-limit contracts are automated |
| Processor mode projection | Complete in staging | Five admin processor surfaces reuse one fail-closed mode primitive and report `staging_automatic` only when the durable pull dispatcher and processor prerequisites are present; delivery queue responses derive break-glass state from the same contract |
| Dispatch health evidence | Complete in staging | Every signed claim returns internally consistent, content-free durable ledger counts; the scheduled Action publishes them in its run summary and warns on terminal dispatch failures. Protected run `30691943578` verified an empty healthy ledger without a D1 operator query |
| Dispatch incident lifecycle | Complete in staging | A terminal ledger failure opens or updates one marker-owned GitHub issue containing only aggregate counts and its Actions evidence URL; recovery closes it. Human-authored lookalikes remain untouched. Unit tests cover open, update, close, ownership, validation, and bounded provider responses; protected healthy run `30691943578` exercised live `issues: write` reconciliation and correctly created no issue |
| Full Podcast verification | Passing locally and in CI | Secret scan, high-severity dependency audit, Cloudflare types, typecheck, 124 test files / 503 tests, workflow lint, and staging/production dry-run bundles pass |
| Durable terminal Queue evidence | Complete in staging | Exhausted staging jobs enter isolated `dust-wave-podcast-jobs-staging-dlq`; a staging-only consumer persists one content-free, SHA-256-deduplicated D1 incident with bounded storage retries and no replay/provider capability. Migration `0068`, both consumers, and current Worker version `de82b6d0-0533-4244-a96a-1ec4c0548d61` are verified; production remains unchanged and unmigrated |
| Admin automatic-processing copy | Implemented; passing locally and in CI | English and Spanish status copy no longer asks producers to dispatch the eight automated workflows manually; clip rendering no longer downloads an obsolete manual manifest, and regression tests enforce both contracts |
| Episode Autopilot | Implemented on the staging branch | The publication workflow separates automatic work, approval waits, platform delays, and terminal failures; transcript processing and review use exact content-free lifecycle evidence included in current Worker staging version `de82b6d0-0533-4244-a96a-1ec4c0548d61`, so pending work is labeled Processing and no longer creates a misleading Fix/Continue action. Bilingual unit, i18n, performance-budget, desktop/mobile overflow, CLS, and browser-console checks pass at 1440×900 and 320×700 |
| Approval handoff deep links | Implemented on the staging branch | An allowlisted `show`/`episode`/`step`/`target` contract reuses the existing workflow navigator to select the authorized episode, open nested production tools, focus the exact decision, and remove navigation parameters after use. Unknown, cross-step, unsafe, and oversized values fail closed. Unit/integration tests and authenticated English/Spanish Chrome checks pass at 1440×900 and 320×700 with zero horizontal overflow and zero measured CLS |
| Enhanced-master action delivery | Complete in staging | Migration `0069` and Worker version `de82b6d0-0533-4244-a96a-1ec4c0548d61` discover the same current-master/QC predicate used by promote/reject, authorize the secret recipient as a Super-admin, and send one bilingual 15-minute single-use deep link to the existing Working master UI. The 2026-08-01 09:15 UTC trigger sent the sole exact candidate on attempt one, recorded one provider ID and one unconsumed hashed link, accepted the signed Resend webhook, and left foreign-key checks clean. Three byte-identical retries, lease recovery, obsolete-action resolution, same-origin return paths, privacy, and real-schema SQL preparation are automated; production remains disabled and unmigrated |
| Automatic delivery-audio handoff | Complete in staging | After the enhanced-master decision becomes final, Worker version `de82b6d0-0533-4244-a96a-1ec4c0548d61` reuses the existing exact-master/QC/R2/manifest/multipart queue primitive to create the normalized MP3/player-peaks job and let the durable dispatcher claim it. Deterministic IDs, a one-active-job constraint, a three-render-attempt ceiling, system audit evidence, scan-failure isolation, and a production pre-D1/R2 exit are automated. The pre-deploy exact eligibility query returned zero candidates and zero writes; after the first 09:35 UTC scheduled boundary, health passed with zero active delivery jobs and zero system queue audits, so the current undecided episode did not advance |
| Automatic transcription handoff | Complete in staging | Worker version `de82b6d0-0533-4244-a96a-1ec4c0548d61` creates a missing source-language transcription job only after the same final-master predicate used by delivery audio. Admin and scheduler callers reuse one deterministic fingerprint/current-policy-QC/artifact/chunk/audit primitive; direct work is deferred to the existing Queue scheduler, large work to the existing processor dispatcher, and production exits before D1. The pre-deploy exact eligibility query returned zero candidates and zero writes. After the first 09:45 UTC scheduled boundary, health passed with zero active delivery jobs, zero automatic transcription jobs, and zero system queue audits for either path, so the pending enhanced-master decision remains authoritative |

This progress table records code delivery, not launch readiness. The live
Worker readiness projection and immutable provider evidence remain the source
of truth for promotion.

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
6. Transcribe and propose Spanish-primary metadata, English translation,
   speaker labels, chapters, show notes, clip candidates, captions, and social
   copy.
7. Run word alignment and quality thresholds against the exact approved
   transcript and working master.
8. Consolidate revision-aware audio, transcript, chapter, clip, and ad-plan
   review into one approval surface.
9. Freeze an exact publication snapshot and schedule premium/public release.
10. At premium time, expose entitled private-feed content only.
11. At public time, commit one publication revision and fan out News, RSS,
    YouTube, announcement, and directory-observation jobs.
12. Reconcile provider outcomes, retry safely, and alert only on an actionable
    decision or terminal failure.

## Execution sequence

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
- Complete the transcript, public speaker-label, chapter, and exact-revision
  production reviews.
- Pass the bilingual word-alignment launch benchmark: rights-cleared fixtures,
  human-marked words, cut previews, resource bounds, idempotent reruns, and a
  clean-environment reproduction.
- Render and inspect captioned clip and audiogram candidates.
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
- Automate purchase, renewal, failed renewal, recovery, cancellation, refund,
  Portal, duplicated-webhook, and out-of-order-webhook tests with Stripe test
  clocks.
- Configure Pool benefit mapping as show-scoped policy; issue and revoke signed
  grants without copying unnecessary Pool identity into Podcast.

Exit criterion: the Stripe gate passes and both direct subscription and Pool
benefit paths have controlled end-to-end evidence.

### P3 — YouTube, clips, and announcements

- Use resumable, revision-bound YouTube uploads with persisted reconciliation
  state.
- Complete one unlisted production-channel full-episode test and one controlled
  clip test; reconcile ambiguous outcomes rather than retrying blindly.
- Enforce public-release timing and premium-bonus exclusion.
- Complete one consented Resend staging send, signed delivery transition,
  unsubscribe, and suppression exercise.
- Deduplicate and tolerate unordered provider events.

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

- Expose the multi-show/network UI already supported by the data model.
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
- Captioned clips, audiograms, transcripts, chapters, bilingual metadata, and
  the existing player pass their launch gates.
- Security, accessibility, performance, responsiveness, and recovery suites
  pass in CI and staging.
- Production promotion and rollback require no undocumented manual procedure.

## Authoritative implementation references

- Podcast roadmap: `dust-wave-podcast/docs/ROADMAP.md`
- Current human/provider inputs: `dust-wave-podcast/docs/OWNER_ACTIONS.md`
- Staging execution and rollback: `dust-wave-podcast/docs/STAGING_RUNBOOK.md`
- Security boundary: `dust-wave-podcast/docs/SECURITY.md`
- API contract: `dust-wave-podcast/docs/API.md`
- Alignment evidence: `dust-wave-podcast/docs/ALIGNMENT_GATE.md`
- Dynamic-ad evidence: `dust-wave-podcast/docs/DYNAMIC_ADS_GATE.md`
- Clip evidence: `dust-wave-podcast/docs/CLIP_RENDER_GATE.md`
- Virtual-audio evidence: `dust-wave-podcast/docs/VIRTUAL_AUDIO_GATE.md`
