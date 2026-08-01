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

The content-free staging episode gate was rerun against the authorized Dust
Don't Settle source-test episode on 2026-08-01. After the reviewed transcript
revision and exact forced-alignment result completed, it reported eight passes,
two human-review blockers, zero waits, zero failures, and clean D1 referential
integrity. The exact alignment is durably ready with all 10,176 words aligned,
zero unaligned, interpolated, invalid, or projection-issue words, and aligned
ratio `1.0`. The remaining episode blockers are deliberately sequenced: pass
and reproduce the H1 bilingual benchmark, approve this exact alignment, then
review the automatically generated chapter proposal. Media, production,
delivery, transcript, and alignment processing itself now pass.

| Area | Verified state | Remaining promotion evidence |
|---|---|---|
| Environment | PASS | Staging and production provider modes are fail-closed; required staging secret names are installed |
| Show | PASS | Premium, RSS, canonical page, and YouTube show settings exist |
| Episode | BLOCK | Enhanced master revision 2, its exact delivery MP3/player peaks, the current-audio production review, and English transcript revision 4 are approved. Exact alignment job `alignment_job_0426ec9ac766e5b43e626dd75695f128` is structurally eligible at 10,176/10,176 words. Complete the H1 benchmark and exact human alignment approval, then review the automatically proposed chapter and clip/audiogram evidence |
| Stripe | BLOCK | Import accountant-approved tax policy and complete controlled lifecycle tests |
| Distribution | BLOCK | Certify at least 10 destinations through setup, validation, ingestion, and recovery evidence |
| YouTube | BLOCK | Complete and reconcile one tightly controlled unlisted production-channel test |
| Resend | BLOCK | Complete one consented staging delivery and suppression exercise |
| Dynamic ads | BLOCK | Synthetic virtual-audio/load evidence passes automatically; approve the episode plan, select a decision, and complete a qualified direct-sponsor pilot |

The Podcast Worker remains the authoritative source for live gate state. This
document records the execution strategy; it must not become a second manually
maintained readiness database.

## Execution progress

| Slice | State | Evidence |
|---|---|---|
| Completion plan | Complete | This document is checked into `dust-wave-new` |
| Processor discovery and dispatch | Complete in staging | Migration `0067` and the signed Worker/GitHub boundary are deployed. The ledger has dispatched and reconciled real delivery-audio and transcription-chunk work; after runs `30700252473`, `30701049128`, and `30701774189`, its three rows are all `succeeded` with zero queued, leased, running, failed, or canceled rows. Production remains disabled and unmigrated |
| Shared processor CI setup | Implemented | Nine processor workflows and the dispatcher use one local composite action with a commit-SHA-pinned Node action and locked installs |
| Dispatcher regression coverage | Passing locally and in CI | Source discovery, exclusive lease, signature rejection, idempotent acknowledgement, bounded retry, accepted-run ambiguity, closed registry, least permissions, shared-action, and D1 compound-query-limit contracts are automated |
| Processor mode projection | Complete in staging | Five admin processor surfaces reuse one fail-closed mode primitive and report `staging_automatic` only when the durable pull dispatcher and processor prerequisites are present; delivery queue responses derive break-glass state from the same contract |
| Dispatch health evidence | Complete in staging | Every signed claim returns internally consistent, content-free durable ledger counts; the scheduled Action publishes them in its run summary and warns on terminal dispatch failures. Protected run `30691943578` verified an empty healthy ledger without a D1 operator query |
| Dispatch incident lifecycle | Complete in staging | A terminal ledger failure opens or updates one marker-owned GitHub issue containing only aggregate counts and its Actions evidence URL; recovery closes it. Human-authored lookalikes remain untouched. Unit tests cover open, update, close, ownership, validation, and bounded provider responses; protected healthy run `30691943578` exercised live `issues: write` reconciliation and correctly created no issue |
| Full Podcast verification | Passing locally and in CI | Secret scan across 419 tracked text files, zero dependency vulnerabilities at the configured audit threshold, generated Cloudflare types, typecheck, 139 test files / 576 tests, workflow contracts, and staging/production dry-run bundles pass through Podcast merge `7f1e906` and green CI run `30707511080` |
| Durable terminal Queue evidence | Complete in staging | Exhausted staging jobs enter isolated `dust-wave-podcast-jobs-staging-dlq`; a staging-only consumer persists one content-free, SHA-256-deduplicated D1 incident with bounded storage retries and no replay/provider capability. Migration `0068`, both consumers, and current Worker version `4888a7bf-b621-4905-be09-81f9cd2a3240` are verified; production remains unchanged and unmigrated |
| Admin automatic-processing copy | Implemented; passing locally and in CI | English and Spanish status copy no longer asks producers to dispatch the eight automated workflows manually; clip rendering no longer downloads an obsolete manual manifest, and regression tests enforce both contracts |
| Episode Autopilot | Implemented on the staging branch | The publication workflow separates automatic work, approval waits, platform delays, and terminal failures; transcript processing and review use exact content-free lifecycle evidence included in current Worker staging version `4888a7bf-b621-4905-be09-81f9cd2a3240`, so pending work is labeled Processing and no longer creates a misleading Fix/Continue action. Bilingual unit, i18n, performance-budget, desktop/mobile overflow, CLS, and browser-console checks pass at 1440×900 and 320×700 |
| Approval handoff deep links | Implemented on the staging branch | An allowlisted `show`/`episode`/`step`/`target` contract reuses the existing workflow navigator to select the authorized episode, open nested production tools, focus the exact decision, and remove navigation parameters after use. The same contract now routes transcript-review email actions to the selected episode's transcript workbench. Unknown, cross-step, unsafe, and oversized values fail closed. Unit/integration tests and authenticated English/Spanish Chrome checks pass at 1440×900 and 320×700 with zero horizontal overflow and zero measured CLS |
| Enhanced-master action delivery | Complete in staging | Migration `0069` and the current Worker discover the same current-master/QC predicate used by promote/reject, authorize the secret recipient as a Super-admin, and send one bilingual 15-minute single-use deep link to the existing Working master UI. The 2026-08-01 action reached the authorized operator and enhanced revision 2 (`master_71dacb310b70426288969e6103cd9d15`) was approved only after exact SHA-256 verification, full-file FFmpeg decode, and D1 QC review: 62:25, -16.1 LUFS, 8.7 LU LRA, -1.1 dBTP, zero clipped samples, zero warnings, and zero blockers. Podcast merge `b1dae18` replaces unreliable batch-result metadata with two transaction guards, and its regression test reproduces committed writes with zero statement metadata. The current master is the approved derivative and foreign keys are clean; production remains disabled and unmigrated |
| Review action delivery | Complete in staging | Migration `0070` losslessly extends the shared action ledger to delivery-audio approval and transcript review. The current Worker sends bilingual, expiring, single-use links through the same Resend/auth/audit primitives and resolves actions in the approval transaction. Delivery approval uses exact media-selection and job-state transaction guards rather than unreliable batch-result metadata; Podcast merge `b544f17` enforces that a stale or conflicting request cannot partially approve media. The matching Admin acknowledgement describes the full-file decode, MP3-frame, checksum, duration, and waveform evidence instead of requiring a false listening assertion. The exact current delivery job is approved and the gate passes; production remains disabled and unmigrated |
| Alignment-review action delivery | Complete in staging; first qualified alignment pending | Migration `0072` losslessly adds an `alignment_review` action to the same notification ledger. Worker version `2c113657-9f26-43e2-9cdc-4e838ba52697` requires the exact final working master, current approved transcript revision and digest, a structurally eligible ready alignment result, and matching pinned passing-benchmark evidence before sending one bilingual, expiring, single-use link to the existing alignment workbench. Approval resolves only the exact passed revision inside the approval transaction. CI and the full 127-file / 516-test gate pass, including real-schema query preparation, row preservation, privacy, deep-link, and conditional-resolution coverage. The staging migration preserved the sole sent working-master action and left `PRAGMA foreign_key_check` empty. After the first 11:00 UTC scheduled boundary, there were zero eligible candidates and zero alignment-review rows, while the existing action remained sent at one attempt, proving that no premature or duplicate email was created. Production remains disabled and unmigrated |
| Automatic delivery-audio handoff | Complete in staging | Promoting enhanced master revision 2 created exactly one delivery job (`delivery_audio_auto_ba8b2c530b14328dce9425746f72035a`). Its first protected run exposed a clean-environment dependency gap before media access; Podcast merge `1a882ca` moved conditional FFmpeg/FFprobe provisioning into the shared processor setup action and removed duplicate workflow installation. Recovery run `30700252473` rendered and uploaded the same immutable job successfully: 59,926,987-byte 44.1 kHz stereo CBR128 MP3, 3,745,437 ms, SHA-256 `00abaeb123cf38bdb9e481c9db64811d1eb03c1cb26790d7775b6eb0ef05828d`; 8,109-pair waveform, SHA-256 `b283d05a39e1e0263ee5e2fd2ebc95e1ad22b3dacd34d29873e03c7be3ea50e7`; report SHA-256 `0fdac8fcaa1bbdcdeedb6fd59b8c900e457423a981025839fc40b8943e6cd7b8`. Those exact bytes and the current production review are approved, the delivery/peaks and production-review gate nodes pass, D1 foreign keys are clean, and production remains untouched |
| Automatic transcription handoff | Complete in staging; current transcript approved | The Worker creates source-language transcription work only after the shared final-master predicate. Podcast merge `b6d4dd8` made a retry revive a terminal dispatcher row without duplicating the source job; protected recovery run `30701049128` prepared five immutable chunks, and revision 2 completed with all five provider calls successful. Shared Platform merge `ed90dd1` adds one opt-in readable-caption policy, and Podcast merge `fc928ef` fingerprints it as `workers-ai-segment-caption-v2` for both direct and chunked paths while retaining legacy retry compatibility and excluding approved transcripts from automatic replacement. Worker version `496029bb-8f9f-465e-b8aa-7403f7f43215` created the readable-caption revision against the exact current master; protected run `30701774189` and the Queue completed all five chunks with no failures. The final reviewed revision 4 is approved with content SHA-256 `25eb7fa47d640611942b6dc564a43ea0c242e1db408ab9176f77e7fd8826e76a`, speaker labels confirmed, zero structural review signals, and the independent reference evidence recorded below. Podcast merges `e3f1f82` and `c16345d` replace unreliable D1 batch-result metadata in revision-save and approval responses with exact post-commit transaction verification, including immutable revision, audit, digest, speaker gate, and approving-admin identity. Production remains untouched |
| Content-safe transcript reference audit | Complete for the current revision; human approval remains authoritative | Shared Platform merge `6f668c9` releases Platform `0.11.0` and `@dustwave/timed-text` `0.5.0` with one bilingual, bounded, content-safe reference-audit primitive. Podcast merge `7eb55f3` and green CI run `30704824149` add its CLI adapter and regression coverage without logging transcript or reference text. The current 10,176-word transcript was compared with 10,249 reference-caption words across 62 one-minute windows: weighted similarity `0.905337`, zero missing-coverage windows, zero windows below the `0.72` gate, and exact input SHA-256 evidence `25eb7fa47d640611942b6dc564a43ea0c242e1db408ab9176f77e7fd8826e76a` / `182c44856acd31629fd55c992718dd4e3c6375b1c7a1e3b9ea63d18bd6af36fc`. The lowest reference-caption window scored `0.807947`; an independent locally cached Whisper-medium pass over that same minute scored `0.858209` against the current transcript. These automated checks support but never replace the human approval gate. The Admin staging branch also adds an explicit, versioned acknowledgement for reviewed intentionally unlabeled cues: it reuses the existing transcript-save transaction, cannot confirm a draft containing an unconfirmed named speaker, and does not bypass the separate approval endpoint. Production remains untouched |
| Automatic word-alignment handoff | Exact result complete in staging; H1 benchmark and human approval remain | The first approved transcript automatically created and dispatched exact job `alignment_job_9ec4d819c3ba49c02031e9f4d036f87e`; protected run `30705967509` exposed Python/ECMAScript canonical-number drift and closed without accepting an unverified result. Alignment-runner PRs #2/#3 release `0.2.2`: execution commit `e611801d2af82dcdb079444b7e8a7eea4309d1a6` uses ECMAScript-compatible finite-number serialization with 27 tests and exact Python/Node parity vectors; reproducible Git-archive digest `8a7cda2702487a1d542d5fb740efe8580ca9edd99f405d722d610536c73a3a11`. Podcast PR #38 / merge `280c001` pinned that identity, and the scheduler created replacement job `alignment_job_0426ec9ac766e5b43e626dd75695f128`. Protected run `30706834848` completed exact WhisperX inference and canonical validation. D1 contains immutable manifest SHA-256 `b60b845414ae52a78987530550be58b10d5e416b2567d876ce51842f567a1706`, 10,176/10,176 aligned words, zero unaligned/interpolated/invalid/projection issues, ratio `1.0`, structurally eligible status, and clean foreign keys. Its first callback durably committed but returned a false 409 because D1 batch change metadata reported zero. Podcast PR #40 / merge `7f1e906` replaces that metadata dependency with exact revision/job/audit/manifest/quality/word-count post-commit verification and tests the zero-change case; it also masks timestamp-bound derived callback signatures in all processor Actions. Green CI run `30707511080` and staging Worker version `a2e32272-1cc3-4982-bf3e-5ff3bda5bcfa` include the repair. The disclosed derived signature was not key material and its replay window expired; future values are masked before downstream use. H1 benchmark import, clean reproduction, and exact human approval remain mandatory |
| Automatic show-notes proposals | Complete and proven in staging; first proposal ready for editing | Migration `0071` adds private, review-only proposals keyed by the final working master, approved transcript identity/revision/digest, episode-copy digest, output language, model, and prompt version. Staging discovery prepares the transcript language and, when different, the show language with four claims per scheduler run, three attempts per fingerprint, short lease recovery, strict bounded output validation, and content-minimal system audits. Current-only reads hide stale master, transcript, or episode-copy proposals. The existing bilingual Admin editor loads a ready proposal automatically without applying it; manual regeneration is collapsed as a secondary tool. Podcast PR #37 / merge `b8e6ca1` centralizes the Workers AI structured-output contract for show notes, chapters, and clips, pins supported model `@cf/meta/llama-3.1-8b-instruct-fast`, and accepts the documented direct-object response while retaining the bounded legacy-string shape. At the 15:40 UTC boundary, staging created an English show-notes proposal that reached `ready` on attempt 1; the exhausted legacy-model proposal remains immutable diagnostic history. Its first Admin read exposed ambiguous unqualified columns only on the fully migrated schema; Podcast PR #39 / merge `fb8fc10` qualifies every draft field and executes the exact read from migration zero through current in CI. Authenticated staging now loads the proposal and its bounded transcript evidence without console failure. The current proposal remains unapplied because inferred names and speaker attribution require editorial correction; the next prompt revision adds entity-grounding and unlabeled-speaker checks rather than weakening explicit apply/save review. Episode, WYSIWYG, News, RSS, YouTube, media, and publication state remain unchanged until explicit apply and save. Production exits before D1 with both automation and Workers AI disabled |
| Automatic chapter proposals | Complete in staging; first approved alignment pending | Migration `0073`, Podcast merge `690a91d`, and Worker version `265169c5-775c-42e0-be9e-7981030d21cb` reuse the editorial proposal ledger and add private, review-only chapter candidates. Discovery requires the exact final working master, latest speaker-confirmed approved transcript, exact ready alignment job, passed alignment revision, and human alignment approval; a real chapter revision suppresses generation. Fingerprints bind the proposal to master, transcript, alignment, title, duration, model, and prompt. Staging allows four short leased claims per run and three attempts per fingerprint; production exits before D1 and AI. Current-only Admin reads hide stale evidence, automatic proposals load without applying, and manual generation remains available only as a collapsed recovery tool. The complete 128-file / 520-test Podcast gate, both dry bundles, and the site Podcast gate pass. The staging migration exposed the expected columns with zero rows and clean foreign keys. After the first scheduled boundary, chapter proposals, passed alignments, human approvals, and automatic completion/failure audits all remained zero, proving that the current review gate did not advance prematurely. Exact Admin commit `6c70ece916d0a5937ac3207c20bcda6b549de72a` is deployed at `https://2b6187f4.dust-wave-website-staging.pages.dev` and its staging branch alias; authenticated Chrome traces at 320×700 and 1440×900 both measured document width equal to viewport width and CLS `0.0000`, while staging headers retain no-store, noindex, anti-framing, referrer, permissions, and CSP controls |
| Automatic clip/audiogram proposals | Complete in staging; first approved alignment pending | Migration `0074`, Podcast merge `6502f9c`, and Worker version `8a6fb851-7b80-4a95-ace0-bee95e970e2d` extend the same private editorial ledger with `clips`. Chapters and clips now share one exact aligned-editorial eligibility query requiring the current final master, latest speaker-confirmed approved transcript, exact ready alignment job, passed alignment revision, and human approval, while clip prompt, validation, fingerprint, and audits remain domain-specific. One to six chronological, non-overlapping 15–90 second ranges are derived from immutable cue IDs; generation never writes a clip, recipe, alignment, render, publication, or YouTube row. Fingerprints bind master, transcript, alignment, episode title/duration, language, model, and prompt. Staging allows four short leased claims per run and three attempts; production exits before D1 and AI. The current-only bilingual Admin loads but never applies candidates, keeps manual generation collapsed, and leaves save/render/publish as separate explicit actions. The 129-file / 525-test Podcast gate, row-preservation and schema-query tests, both dry bundles, and the full site Podcast gate pass. Staging migration exposed 27 columns, zero proposal rows, and clean foreign keys. After the first 11:45 UTC boundary, clip proposals, passed alignments, human approvals, and automatic completion/failure audits all remained zero. Exact Admin commit `6593915ea5d21d8c0493a6b79803292ee5117e6a` is deployed at `https://a6032e3b.dust-wave-website-staging.pages.dev`; authenticated Chrome traces at 320×700 and 1440×900 both measured exact document/viewport width and CLS `0.0000`, and the deployed private shell retains no-store, noindex, anti-framing, referrer, permissions, and CSP controls |
| Automatic directory observations | Complete in staging; owner setup and first public listing pending | Podcast merge `0b3d526` and Worker version `23f01e71-985e-4300-951f-078d85b2e360` use the existing `automated_probe` evidence source after one-time owner verification, a current feed validation, a current publication, and a provider-specific listing URL exist. A staging-only kill switch, exact provider-host suffix registry, HTTPS/credential/port/fragment checks, per-redirect revalidation, 10-second timeout, 512 KiB body limit, and show-or-episode identity match prevent arbitrary or generic pages from certifying ingestion. At most four due listings are checked per five-minute run; immutable failed→observed events provide real recovery evidence, while the current publication and content-minimal audit are updated through one shared manual/automatic persistence primitive with exact post-commit verification rather than D1 batch metadata. Production remains disabled. The 134-file / 551-test gate includes SSRF/lookalike/redirect/size/identity, scan-isolation, idempotency, conflict, and real zero-to-current schema coverage. The staging preflight and post-schedule audit both found zero configured listing URLs, zero current directory publications, zero automated events/audits, and clean foreign keys, proving the deployed scheduler had no authorized external target and made no readiness claim |
| Credential-free directory submission packet | Complete in staging; provider login/verification remains an owner action | Podcast merge `02d55b0`, clean CI run `30702996996`, and Worker version `e40a99ca-950e-44fb-ad5a-9c0443746dcb` extend the existing protected Distribution read rather than adding a duplicate endpoint or state store. One versioned packet is derived from canonical show/contact/feed-validation data and the existing directory registry; its response model omits internal notes, account labels, submission receipts, passwords, tokens, verification codes, and sessions by construction. The bilingual Admin can copy the exact JSON or download a deterministic show-scoped filename. Feed copy and packet controls share one responsive component, while the main Admin script remains below its enforced unminified budget. API, schema-rejection, exact copy/download, clipboard fallback, i18n, and clean-environment tests pass. Exact Admin commit `045b3e8aceb509f3cc8e0ec25e2a2423dc8437c9` is deployed at `https://f104b956.dust-wave-website-staging.pages.dev` and the canonical staging alias; authenticated Distribution traces at 320×700 and 1440×900 both measured document width equal to viewport width and CLS `0.0000`, with the established one-open-directory disclosure contract. Production remains untouched |
| Canonical feed resource preflight | Complete for the current zero-item staging feed; first public episode evidence remains automatic | Platform merge `18c2c5e` releases one byte-safe PNG/JPEG dimension parser for the Worker and site gate instead of duplicating media parsing. Podcast merge `47c6f14`, green CI run `30703993790`, migration `0076`, and Worker version `db35a895-e99a-426d-a37f-cf26cc4eabcf` advance the exact-feed contract to `dustwave-rss-launch-v4`. The validator permits only permanent HTTPS URLs on exact approved site/feed/media origins, revalidates up to three redirects, uses a 10-second timeout and 64 KiB artwork probe, requires square 1400–3000 pixel JPEG/PNG artwork, exercises the existing static enclosure HEAD and one-byte range path without ad decisions or analytics, and verifies public transcript/chapter status, type, ETag, and cache policy through their existing handlers. The rights-provided 505×505 source remains untouched; site commit `ed5cfad` adds a deterministic 3000×3000, 409 KiB progressive JPEG derivative with SHA-256 `c1a8a4badb127eaa2ec31b31897adba99b8019a9cda49157f4cde1d71eba5137`, enforced by the static-site gate and deployed at `https://25e7d4cc.dust-wave-website-staging.pages.dev`. Authenticated staging validation persisted a current 64-character feed digest at `2026-08-01T14:37:02.259Z`, zero failures, zero public items, and zero foreign-key violations. Consequently the public show page and artwork are real staging evidence; enclosure, transcript, chapter, and episode-page runtime checks will execute automatically when the first episode enters the public feed. Production remains untouched and unmigrated |
| Automatic virtual-audio evidence | Complete in staging | Podcast merges `060356a`, `e36ee73`, and `9221f68`, migration `0075`, and Worker version `35c66bd2-bcb0-4830-8f47-15a343a65321` move the synthetic gate to one protected Action every three days. It uses only the existing purpose-bound callback secret—no Cloudflare account, D1, or R2 credential—creates and deletes an exact hashed lease through the staging Worker, uploads only hash-bound fixtures through the capability route, retains redacted artifacts, and stores immutable aggregate evidence for 90 days. The fixture generator expands canonical self-contained MPEG seed frames, so exact bytes are independent of the host FFmpeg/libmp3lame encoder; FFmpeg remains a decode validator. Protected run `30699459602` on commit `9221f6885582a73ee1f7b57ca2ab662555020fff` passed 24 protocol probes and 10,000 measured requests with zero request errors, zero content mismatches, and `72.02 ms` added p95 against the `250 ms` ceiling. The wrapper and independent audit confirmed zero residual leases and all four exact R2 fixture objects absent; the artifact contains no lease token, capability, signature, or authorization value; D1 foreign keys are clean. The composed launch gate accepted the current durable row without a file argument and narrowed the dynamic-ad block to approved-plan, selected-decision, and qualified-direct-sponsor evidence. Production remains unchanged and unmigrated |

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

## Automation-first remainder

The remaining work is executed as durable jobs and versioned gates, not as an
operator checklist. Each row below extends an existing primitive; none creates
a second scheduler, readiness model, editor, identity store, or provider ledger.

| Order | Trigger | Zero-touch work | The only permitted pause |
|---|---|---|---|
| 1. H1 alignment benchmark | A pinned runner identity lacks current passing evidence | Build a versioned bilingual corpus bundle; verify rights manifests and digests; select representative English/Spanish windows and cut previews; pre-align words; generate a bounded review packet; dispatch the protected benchmark Action; validate resource, idempotency, clean-environment, and Python/JavaScript digest parity; persist the signed result; retry or reconcile ambiguity | One concise review of rights and gold word boundaries, delivered through an expiring deep link; approval must name the exact corpus, runner revision, digest, and report hash |
| 2. Alignment, chapters, clips, and show notes | H1 evidence passes for the exact adapter identity | Offer exact alignment approval; on approval, discover chapter and clip proposals; run entity-grounding and unlabeled-speaker validators; create Spanish-primary and English metadata variants; render private caption/audiogram previews; group all current-revision proposals in one editorial review surface | Accept or edit subjective titles, names, chapter boundaries, excerpts, captions, and social copy; no IDs, CLIs, or workflow dispatches |
| 3. Publication snapshot | Editorial and ad-plan gates pass | Freeze one immutable revision; render News/show/RSS/private-feed/YouTube projections; validate canonical URLs, artwork, enclosure range behavior, transcript and chapter resources, premium timing, bonus exclusions, ad-free variants, and player/download parity; schedule premium and public root events | Confirm final rights-sensitive copy, release time, and public/premium intent once |
| 4. Stripe and tax | A versioned accountant policy document is present | Validate and import policy through `@dustwave/tax-core`; reconcile test Product, monthly/annual Prices, Portal, and webhooks; run test-clock purchase, renewal, failure, recovery, cancellation, refund, duplicate, and out-of-order suites; persist only content-minimal evidence | Accountant approval of registration and taxability facts; live capability promotion remains separate |
| 5. Pool benefit | Direct subscription lifecycle passes | Reuse the signed grant/revoke boundary; generate scoped redemption codes; test redeem, duplicate, revoke, expiry, subscription overlap, and private-feed rotation without copying unnecessary Pool identity | Approve the Pool tier/add-on policy and benefit duration |
| 6. YouTube and Resend | A frozen staging publication exists | Create revision-bound resumable uploads; force unlisted mode; reconcile the exact video ID; test audio-only and native-video paths, early/public timing, and bonus exclusion; send consented bilingual staging mail; reconcile delivery, unsubscribe, suppression, retry, and unordered events | Authenticate/2FA if the provider requires it and inspect one unlisted production-channel result plus one consented message |
| 7. Directories | Feed preflight passes with a public item | Generate the credential-free packet; prefill or browser-assist supported forms; record verification state; poll allowlisted listing URLs; verify show/episode identity; record setup, validation, ingestion, and failed-to-recovered evidence; enable the “10+ platforms” claim only at ten fully certified destinations | Provider login, terms, ownership codes, or provider review that cannot legally or technically be automated |
| 8. Direct sponsor pilot | Exact episode plan and sponsor contract are present | Validate disclosure/creative/date/position/device/app rules; select decisions in real time; run house fallback and virtual load matrices; observe one native-client qualified download; prove HEAD, partial, canceled, failed, and house-fallback requests do not qualify; reconcile pacing and billing evidence | Approve sponsor contract facts, creative, disclosure, and final episode plan |
| 9. Production promotion | Every staging launch node passes | Back up D1; apply ordered migrations; reconcile secret names and resources; deploy fail-closed; attach domains; run canary/range/private-leakage checks; promote capabilities independently; run focused gates after each flag; automatically roll back a flag or Worker version on failure | One explicit Super-admin promotion approval bound to the complete evidence snapshot |

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

Immediate execution queue:

1. Extend the alignment benchmark bundler to prepare the H1 review packet and
   exact protected-workflow input from approved, rights-cleared fixtures.
2. Add entity-grounding and unlabeled-speaker checks to the shared editorial
   proposal validator; regenerate show notes only after its prompt/version bump.
3. Once H1 passes, let the existing scheduler generate chapters and clips, then
   consolidate their exact-revision decisions into one review handoff.
4. Freeze a dry-run publication snapshot and exercise News, RSS, player,
   premium, YouTube-unlisted, Resend, and directory observation without public
   release.
5. Run Stripe/tax/Pool, 10+ directory, and direct-sponsor evidence programs in
   parallel only where they do not share mutable state or human credentials.

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
