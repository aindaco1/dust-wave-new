# Dust Wave Podcast Platform Completion Plan

Status date: 2026-08-02
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
ratio `1.0`. The August 1 launch-scope decision moves reviewed public
transcripts, H1 word alignment, and chapters past launch. The current media,
production, delivery, and approved segment transcript pass; word-level
controls and public chapter resources remain disabled until their unchanged
post-launch gates pass.

The composed read-only launch gate was rerun after the scheduled YouTube
channel-access monitor passed on 2026-08-02. It reported eight passes, five
intentional blockers, zero waits, zero failures, and confirmed that every
launch-state query wrote zero rows.
The nested episode gate is launch-ready at eight passes, zero blocks/waits,
and two explicit post-launch deferrals. Staging matches 14 fail-closed
provider modes, production matches 17, all 17 required staging secret names are
installed, the launch show and D1 foreign keys pass, and the system is safe to
continue but not launch-ready.

The separate staging Launch Lab now projects 41 immutable, content-free
provider-lifecycle scenarios through one read-only Super-admin endpoint. Its
current exact state is 21 passed, 19 pending, one running, and zero failed.
That matrix is evidence for Resend, Stripe, YouTube, RSS, directories, dynamic
ads, and Pool benefit behavior; it is not a substitute for the composed launch
gate. Fixture rows are excluded from normal show listings, no listener, media,
recipient, provider-object, or transcript data enters the response, and live
provider reconciliation can only advance an allowlisted lifecycle state. In
particular, the synthetic Resend suppression scenario remains running while
the provider reports `accepted`; the platform does not manufacture a pass.

| Area | Verified state | Remaining promotion evidence |
|---|---|---|
| Environment | PASS | Staging and production provider modes are fail-closed; required staging secret names are installed |
| Show | PASS | Premium, RSS, canonical page, and YouTube show settings exist |
| Episode | PASS for launch scope | Enhanced master revision 2, its exact delivery MP3/player peaks, the current-audio production review, and English transcript revision 4 are approved. Word alignment and chapters are recorded as post-launch; word-level controls and public chapter resources remain disabled until their existing gates pass |
| Stripe | BLOCK | The test-mode gate has 14 passes and one blocker. The Store-derived Podcast subscription policy is checked in as an explicitly unapproved staging candidate; review and import that exact version before activation. Checkout remains disabled, and no Stripe Tax Rate has been created from unapproved facts |
| Distribution | BLOCK | Certify at least 10 destinations through setup, validation, ingestion, and recovery evidence |
| YouTube | Access PASS; upload evidence BLOCK | Scheduled OAuth refresh and exact-channel verification are current. Complete and reconcile one tightly controlled unlisted production-channel test only after a publishable fixture exists |
| Resend | BLOCK | Complete one consented staging delivery and suppression exercise |
| Dynamic ads | BLOCK | The signed virtual-audio/load evidence is current. Approve the episode ad plan, select a decision, and complete a qualified direct-sponsor download |

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
| Full Podcast verification | Passing locally and in CI | Podcast `0.2.6`, PR #71 / merge `75428af532766bf39fba7af1e37e231faecb44d7`, and green CI run `30737171251` pass the 471-file tracked secret scan, zero-vulnerability audit, generated Cloudflare types, typecheck, 160 test files / 648 tests, workflow contracts, and staging/production dry bundles. Staging migration `0082` and Worker version `1042181d-ff37-479b-8e9d-0ae98c14fce5` are deployed; production remains untouched and unmigrated |
| Staging Launch Lab | Worker and bilingual Admin complete in staging | One staging-only, Super-admin-only, private/no-store endpoint derives a fixed 41-scenario ledger from immutable fixture evidence and exact provider reconciliation without resending mail or writing on reads. Normal show listings and billing readiness exclude every fixture row. Site commit `8e9cc3a3ac89955e53de86dd70198881a71b98a0` is deployed to the canonical staging Pages project and the PR preview. The Admin reuses the existing Settings panel, metric, disclosure, spacing, i18n, and authorization primitives rather than adding a seventh workspace. Unit, route-boundary, privacy, no-write, no-resend, locale-parity, and performance-budget tests pass. Authenticated Chrome contracts at 1440×900 English and 320×700 Spanish show exact viewport/document width, four summary metrics, seven collapsed provider groups, and CLS `0.0001` / `0.0000` |
| Stripe webhook lifecycle contract | Synthetic contract complete; real provider lifecycle pending | Migration `0081` stores only the latest Stripe provider event ID and creation second on the existing source ledger. Atomic upsert/update guards make newer state win regardless of arrival order and use first-wins behavior for ambiguous same-second events. A signed, test-mode, real-schema contract covers checkout, monthly renewal, failure/recovery, cancellation, Pool overlap, duplicate delivery, delayed delivery, and safe ignored refunds without network calls or charges. The read-only Stripe preflight is again 14 PASS / one intentional tax BLOCK / zero FAIL after excluding fixtures from Product, Price, and assigned/effective tax inventory. Launch Lab advances only `stripe:webhook_contract`; real Checkout, test-clock renewal/refund, and lifecycle evidence remain pending. Pre-migration staging Time Travel bookmark: `00000b20-00000000-000050bb-5be205457f34c10dcb5ee84fa55d1874`. Production remains untouched |
| Pool benefit lifecycle contract | Seven synthetic scenarios complete; real benefit mapping pending | Podcast `0.2.4`, PR #69 / merge `3b183d16fa828c993681a5d63ed4c90a4a89f3f5`, migration `0082`, and protected rehearsal `30736681713` exercise the signed grant and replay, authenticated redemption and replay, Stripe/Pool overlap, private-feed issue/rotation and bearer invalidation, bounded scheduled expiry plus interrupted-pass recovery, and revocation against every migration from zero. Both expiry queries are indexed, foreign keys remain clean, and no raw email, code, or feed bearer is persisted. Pool is 7/7 in Launch Lab; synthetic success is not launch evidence and the owner-approved tier/add-on mapping remains a real-provider step. Pre-migration staging Time Travel bookmark: `00000b23-00000000-000050bb-563a8be3c8b6682af395b6172bf891b2`. Production remains untouched and unmigrated |
| Resend ordered-event reconciliation | Provider rehearsal repaired in staging | Podcast `0.2.5`, PR #70, and real-schema tests model Resend's documented complaint sequence: delivery remains intermediate until the later complaint/suppression event. A read-only retry can repair an older premature mismatch through the exact stored provider ID and original idempotency key without resending or retaining recipient/provider payload evidence. Protected same-commit rerun `30737285193` leaves delivered, bounced, and complained passed; the dedicated suppressed address remains honestly provider-accepted. The matrix remains `launchGateEligible: false` |
| RSS delivery contract | Four synthetic scenarios complete; publishable item still absent | Podcast `0.2.6`, PR #71, and protected same-commit rerun `30737285193` execute the production public feed/media route contract for a body-free enclosure `HEAD`, streamed byte range, and approved-only Podcasting 2.0 transcript/chapter declarations. Transcript digest tampering removes only the affected declaration, fixture feeds remain directory-blocked, and the fixture remains publicly hidden. RSS is 4/4; exact Launch Lab state is 21 passed / 19 pending / one running / zero failed, with no publishable episode or production mutation |
| Automatic launch-readiness monitor | Implemented; durable read credential intentionally outstanding | Podcast PRs #45 and #47 add one daily/on-demand, least-permission GitHub Action that runs the existing content-free composed gate, writes the bounded summary, retains exact evidence for 30 days, and never invents a second readiness store. GitHub environment variable `PODCAST_LAUNCH_EPISODE_ID` is configured. The Pool/Store local configuration and the Podcast GitHub environment contain no durable scoped Cloudflare API token; protected on-demand run `30710000206` therefore reported the missing credential as a safe `BLOCK`, skipped evidence generation, and completed successfully instead of copying a short-lived Wrangler OAuth token or failing noisily. Configure one read-only staging token when an operator can create it; until then, local authenticated gate runs remain read-only and authoritative |
| Scheduled YouTube channel-access health | Complete in staging | Podcast PR #61 / merge `dd27d5f`, migration `0079`, and Worker version `57b041fb-8367-4107-be06-fdefffa3c0de` add one generic content-free provider-health row, an expiring lease, 12-hour success/one-hour failure cadence, and a separate launch-gate node. A remote no-secret probe identified Cloudflare's Google compatibility failure with `redirect: error`; the shared YouTube adapter now uses manual redirect handling and rejects every `3xx` without following or forwarding credentials. The scheduled Worker refreshed the grant and matched the exact configured `mine=true` channel at `2026-08-02 02:40:13 UTC`, stored no tokens or provider body, cleared its lease, scheduled the next check, and uploaded nothing. The composed gate is now 8 PASS / 5 BLOCK / 0 FAIL / 0 WAIT; the separately inspected unlisted-upload gate remains held until a publishable fixture exists. Production remains untouched and unmigrated |
| Podcast subscription tax-policy import | Implemented in staging; exact owner review remains | Platform PR #14 / merge `deddd82` releases one shared, content-free Stripe Tax Rate client rather than duplicating provider plumbing. Podcast PR #62 / merge `3437cf9` adds a Super-admin-only, recent-auth, same-origin, typed-confirmation import that accepts only the checked-in immutable candidate, creates or retrieves an exact test-mode manual Tax Rate with a stable idempotency key, attests the returned object before an atomic D1 assignment, audits replacement, and never enables checkout. The candidate carries the existing Store policy's `7.625%` exclusive New Mexico rate and exact source revision but is explicitly unapproved and ZIP-specific, so it is evidence for review rather than inferred coverage. Five stateful D1/Stripe tests cover unsafe input, replay, recent auth, provider mismatch, and no-mutation failure. Worker version `172a6e2b-0ad7-40e6-9bca-2b118ff6f982` is deployed only to staging. The bilingual Admin on open site PR #13 exposes the exact candidate and assigned-policy state without Stripe IDs or a checkout control; local authenticated Chrome traces of its Billing workspace at 1440×900 and 390×844 report exact viewport/document width and CLS `0.0000`. Production remains untouched |
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
| Private H1 review automation | Released in alignment-runner 0.3.4; Spanish candidates prepared, human review remains | Alignment-runner PR #4 / merge `5d2f21b` adds two additive private CLI contracts around the existing immutable bundler. The packet builder revalidates exact pinned request/result/audio/transcript/adapter identities, rejects ineligible timing, and deterministically balances up to 500 words plus 60 cut previews per language across fixtures and timelines. It emits no local paths and reports content-free shortfalls rather than fabricating samples. The materializer requires one exact packet-bound decision per word, enforces bounded monotonic intervals and preview applicability, and atomically creates mode-`0600` gold, preview, and checksummed path-index files. PR #6 / merge `17b14cd` adds backward-compatible workspace v2, which consumes that exact materialization index, requires the gold fixture set to match exactly, and verifies every gold/preview file digest before the existing projection/replay/resource evaluator, eliminating manual path copying. PR #7 / merge `74cd458` releases a checked-in network-isolated English/Spanish review app: it matches selected audio by SHA-256 and measured duration, previews padded local cuts, invalidates changed decisions, exports only explicitly reviewed progress, resumes exact packet-bound work, and keeps final export disabled until all words and exact fixture audio are complete. Its meta CSP permits only sibling script/style and local blob media, with no network, browser storage, telemetry, service worker, HTML sink, or external asset. CI checks JavaScript syntax plus 36 Python security/contract/regression tests. Chrome `file://` checks at 1440×900 and 320×700 found exact document/viewport width, 44px language controls, correct one-column mobile fields and language switching, and zero console messages. PR #8 / merge `68d7483` releases convention-based private fixture discovery: complete `fixtures/<fixtureId>/request.json` and `result-primary.json` pairs are sorted deterministically, exact pins and two-to-five-minute bounds are revalidated, partial/symlinked/escaping fixtures fail closed, and the existing immutable mode-`0600` review-workspace schema is generated without copying IDs or paths. Podcast PR #54 / merge `95aab4d` closes the remaining resource-artifact gap for future exact runs: the no-shell wrapper samples immutable input bytes plus peak filesystem growth during the adapter command, and content-free evidence v2 retains source language, input duration, wall time, peak memory, peak disk, and runner identity without paths, transcript, object keys, provider bodies, or credentials. The change passes 142 files / 591 tests and both dry bundles. Alignment-runner PR #9 / merge `5ce8b7c` then imports those closed artifacts directly into the existing resource-run schema: exact runner/adapter pins, structural counters, language, positive measurements, and disk-sampling method are revalidated; only timing/memory/disk/runner values enter immutable mode-`0600` output; content-free per-language 60-minute shortfalls remain explicit. PR #10 / merge `7609973` releases the attested finalizer: it discovers each exact sibling `result-replay.json`, builds workspace v2, and invokes the unchanged independent bundler in one step, while refusing to proceed without explicit no-duplicate-billing and clean-environment confirmations. Both outputs are immutable mode `0600`; paths and schemas are automated, but billing, clean-run, and rights facts are not inferred. Runner CI passes 46 tests and the 0.3.4 source/wheel build. The prior English artifact truthfully proves a 62.423-minute run in 6.831 minutes with 1,946.996 MB peak memory but predates disk/language retention, so it is useful diagnostic evidence and is not promoted into H1. Release branches `release/0.3.0` through `release/0.3.4` remain available; the exact model execution pin is unchanged. The approved native-Spanish interview `KVlzIKhqIWw` is now a private 12-fixture candidate set: 27:00 total, 135 seconds per fixture, 2,888 original-Spanish automatic-reference words, at least 104 per window, exact media/reference hashes, non-overlapping source ranges, and explicit rights scope. Its automatic captions remain unreviewed and no media or transcript content entered Git. English/Spanish human transcript and boundary review, 100 preview decisions, primary/replay results, and measured 60-minute resource runs remain truthful inputs rather than generated evidence |
| Approved Spanish source preparation | Complete privately; transcript review remains | Podcast PR #55 / merge `c603afe` adds one fail-closed local command that reuses the existing JSON3 parser, globally selects an exact number of non-overlapping caption-dense windows, rejects duration/word-density shortfalls, streams source hashes, writes mode-`0600` private PCM/reference/hash evidence, and labels every automatic caption unreviewed. The approved `KVlzIKhqIWw` run created twelve 135-second fixtures with 2,888 reference words and a 104-word minimum; all WAVs independently probe as 16 kHz mono PCM with exact 135-second duration. A second full preparation was byte-for-byte identical and its disposable 52 MB copy was moved to Trash. Secret scan, zero-vulnerability audit, generated types, typecheck, 143 test files / 594 tests, staging/production dry bundles, and protected CI run `30716025868` pass. No deployment, D1/R2 write, media commit, transcript commit, or H1 claim occurred |
| Automatic show-notes proposals | Complete in staging; intentionally unapplied on the private fixture | Migration `0071` keeps every proposal private, review-only, exact-revision-bound, and unapplied. Podcast PRs #41–#44 add source-evidence checks, content-free failures, bounded repair, and the JSON-schema-capable `@cf/meta/llama-4-scout-17b-16e-instruct` model. Private v5 review found undeclared attribution prose and flat H1-heavy Markdown, so PRs #46/#48 require empty speaker attributions, neutral topic prose, and deterministic H2/list Markdown. PR #49 persists exact safe failure codes. PRs #50–#52 separate structured model sections from deterministic Markdown, derive exact source-cased grounding evidence, and raise the shared bounded transcript projection enough to include all 723 approved cues without truncation. Full-source v9 still declared one absent name and failed closed. PR #53 / merge `81df8a0` therefore source-canonicalizes grounded names, removes only model-declared ungrounded named headings/bullets/keywords, falls back to the already reviewed episode summary when needed, and still fails closed if no usable section remains. Green CI run `30711587678` reproduced the 141-file / 587-test gate and both dry bundles. Staging Worker `c5efe7d1-1dfc-4190-8a97-028581f9952c` produced v10 draft `editorial_draft_67776fdfe01bd530096adf729cd944aa9a58962c` as `ready` on attempt one: 723/723 cues, zero truncation, 664 bounded draft bytes, and no failure code. Editorial review found the result source-safe but generic and repetitive, while the selected episode itself is explicitly titled `STAGING ONLY`, remains draft revision `0`, and says `Do not publish`. The proposal is therefore deliberately left unapplied rather than turning test evidence into public copy. News, RSS, YouTube, media, and publication state remain unchanged. Production exits before D1 with all editorial AI disabled |
| Automatic chapter proposals | Complete in staging; first approved alignment pending | Migration `0073`, Podcast merge `690a91d`, and Worker version `265169c5-775c-42e0-be9e-7981030d21cb` reuse the editorial proposal ledger and add private, review-only chapter candidates. Discovery requires the exact final working master, latest speaker-confirmed approved transcript, exact ready alignment job, passed alignment revision, and human alignment approval; a real chapter revision suppresses generation. Fingerprints bind the proposal to master, transcript, alignment, title, duration, model, and prompt. Staging allows four short leased claims per run and three attempts per fingerprint; production exits before D1 and AI. Current-only Admin reads hide stale evidence, automatic proposals load without applying, and manual generation remains available only as a collapsed recovery tool. The complete 128-file / 520-test Podcast gate, both dry bundles, and the site Podcast gate pass. The staging migration exposed the expected columns with zero rows and clean foreign keys. After the first scheduled boundary, chapter proposals, passed alignments, human approvals, and automatic completion/failure audits all remained zero, proving that the current review gate did not advance prematurely. Exact Admin commit `6c70ece916d0a5937ac3207c20bcda6b549de72a` is deployed at `https://2b6187f4.dust-wave-website-staging.pages.dev` and its staging branch alias; authenticated Chrome traces at 320×700 and 1440×900 both measured document width equal to viewport width and CLS `0.0000`, while staging headers retain no-store, noindex, anti-framing, referrer, permissions, and CSP controls |
| Automatic clip/audiogram proposals | Complete in staging; first approved alignment pending | Migration `0074`, Podcast merge `6502f9c`, and Worker version `8a6fb851-7b80-4a95-ace0-bee95e970e2d` extend the same private editorial ledger with `clips`. Chapters and clips now share one exact aligned-editorial eligibility query requiring the current final master, latest speaker-confirmed approved transcript, exact ready alignment job, passed alignment revision, and human approval, while clip prompt, validation, fingerprint, and audits remain domain-specific. One to six chronological, non-overlapping 15–90 second ranges are derived from immutable cue IDs; generation never writes a clip, recipe, alignment, render, publication, or YouTube row. Fingerprints bind master, transcript, alignment, episode title/duration, language, model, and prompt. Staging allows four short leased claims per run and three attempts; production exits before D1 and AI. The current-only bilingual Admin loads but never applies candidates, keeps manual generation collapsed, and leaves save/render/publish as separate explicit actions. The 129-file / 525-test Podcast gate, row-preservation and schema-query tests, both dry bundles, and the full site Podcast gate pass. Staging migration exposed 27 columns, zero proposal rows, and clean foreign keys. After the first 11:45 UTC boundary, clip proposals, passed alignments, human approvals, and automatic completion/failure audits all remained zero. Exact Admin commit `6593915ea5d21d8c0493a6b79803292ee5117e6a` is deployed at `https://a6032e3b.dust-wave-website-staging.pages.dev`; authenticated Chrome traces at 320×700 and 1440×900 both measured exact document/viewport width and CLS `0.0000`, and the deployed private shell retains no-store, noindex, anti-framing, referrer, permissions, and CSP controls |
| Automatic directory observations | Complete in staging; owner setup and first public listing pending | Podcast merge `0b3d526` and Worker version `23f01e71-985e-4300-951f-078d85b2e360` use the existing `automated_probe` evidence source after one-time owner verification, a current feed validation, a current publication, and a provider-specific listing URL exist. A staging-only kill switch, exact provider-host suffix registry, HTTPS/credential/port/fragment checks, per-redirect revalidation, 10-second timeout, 512 KiB body limit, and show-or-episode identity match prevent arbitrary or generic pages from certifying ingestion. At most four due listings are checked per five-minute run; immutable failed→observed events provide real recovery evidence, while the current publication and content-minimal audit are updated through one shared manual/automatic persistence primitive with exact post-commit verification rather than D1 batch metadata. Production remains disabled. The 134-file / 551-test gate includes SSRF/lookalike/redirect/size/identity, scan-isolation, idempotency, conflict, and real zero-to-current schema coverage. The staging preflight and post-schedule audit both found zero configured listing URLs, zero current directory publications, zero automated events/audits, and clean foreign keys, proving the deployed scheduler had no authorized external target and made no readiness claim |
| Credential-free directory submission packet | Complete in staging; provider login/verification remains an owner action | Podcast merge `02d55b0`, clean CI run `30702996996`, and Worker version `e40a99ca-950e-44fb-ad5a-9c0443746dcb` extend the existing protected Distribution read rather than adding a duplicate endpoint or state store. One versioned packet is derived from canonical show/contact/feed-validation data and the existing directory registry; its response model omits internal notes, account labels, submission receipts, passwords, tokens, verification codes, and sessions by construction. The bilingual Admin can copy the exact JSON or download a deterministic show-scoped filename. Feed copy and packet controls share one responsive component, while the main Admin script remains below its enforced unminified budget. API, schema-rejection, exact copy/download, clipboard fallback, i18n, and clean-environment tests pass. Exact Admin commit `045b3e8aceb509f3cc8e0ec25e2a2423dc8437c9` is deployed at `https://f104b956.dust-wave-website-staging.pages.dev` and the canonical staging alias; authenticated Distribution traces at 320×700 and 1440×900 both measured document width equal to viewport width and CLS `0.0000`, with the established one-open-directory disclosure contract. Production remains untouched |
| Directory registry and browser readiness | Current in staging; submissions intentionally held | Podcast PRs #59 and #60 / merges `e42846c` and `db70c95` encode Overcast's no-owner-setup semantics and current first-party entry points for Spotify for Creators, Amazon Music, Player FM, Castbox, and iHeartRadio. Migration tests prove these global registry corrections cannot alter show-scoped setup, submission, listing, error, or operational evidence. Staging migration `0078` was applied after Time Travel bookmark `00000ad3-00000000-000050bb-9de6cc41e994dad39d5b463e02cf3d1c`; exact URL queries, table-scoped quick check, foreign keys, and the no-pending-migration check pass. Browser inspection found Spotify and Apple authenticated, YouTube Studio on the Dust Wave brand channel, Amazon and Pocket Casts ready for a feed URL, and Castbox still signed out. No feed was submitted, no show was claimed, and no provider evidence was overstated because a publishable episode does not yet exist |
| YouTube OAuth bootstrap | Complete in staging; controlled upload intentionally held | YouTube Data API v3 is enabled in the existing Dust Wave Google Cloud project. A dedicated `Dust Wave Podcast Staging` Web client uses the exact OAuth Playground redirect and only `youtube.upload` plus `youtube.readonly`. Consent selected the Dust Wave brand channel; both the initial access token and an independent refresh-token exchange returned its exact immutable ID through authenticated `channels?mine=true`. `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, and `YOUTUBE_CHANNEL_ID` are installed only as staging Worker secrets, temporary browser credential surfaces were closed, and no reusable credential entered Git, shell output, or shared evidence. Because the shared consent app remains in Testing, refresh the grant if it expires before the first controlled test. No upload was attempted without a rights-cleared publishable fixture; production remains untouched |
| Canonical feed resource preflight | Complete for the current zero-item staging feed; first public episode evidence remains automatic | Platform merge `18c2c5e` releases one byte-safe PNG/JPEG dimension parser for the Worker and site gate instead of duplicating media parsing. Podcast merge `47c6f14`, green CI run `30703993790`, migration `0076`, and Worker version `db35a895-e99a-426d-a37f-cf26cc4eabcf` advance the exact-feed contract to `dustwave-rss-launch-v4`. The validator permits only permanent HTTPS URLs on exact approved site/feed/media origins, revalidates up to three redirects, uses a 10-second timeout and 64 KiB artwork probe, requires square 1400–3000 pixel JPEG/PNG artwork, exercises the existing static enclosure HEAD and one-byte range path without ad decisions or analytics, and verifies public transcript/chapter status, type, ETag, and cache policy through their existing handlers. The rights-provided 505×505 source remains untouched; site commit `ed5cfad` adds a deterministic 3000×3000, 409 KiB progressive JPEG derivative with SHA-256 `c1a8a4badb127eaa2ec31b31897adba99b8019a9cda49157f4cde1d71eba5137`, enforced by the static-site gate and deployed at `https://25e7d4cc.dust-wave-website-staging.pages.dev`. Authenticated staging validation persisted a current 64-character feed digest at `2026-08-01T14:37:02.259Z`, zero failures, zero public items, and zero foreign-key violations. Consequently the public show page and artwork are real staging evidence; enclosure, transcript, chapter, and episode-page runtime checks will execute automatically when the first episode enters the public feed. Production remains untouched and unmigrated |
| Automatic virtual-audio evidence | Complete in staging | Podcast merges `060356a`, `e36ee73`, and `9221f68`, migration `0075`, and Worker version `35c66bd2-bcb0-4830-8f47-15a343a65321` move the synthetic gate to one protected Action every three days. It uses only the existing purpose-bound callback secret—no Cloudflare account, D1, or R2 credential—creates and deletes an exact hashed lease through the staging Worker, uploads only hash-bound fixtures through the capability route, retains redacted artifacts, and stores immutable aggregate evidence for 90 days. The fixture generator expands canonical self-contained MPEG seed frames, so exact bytes are independent of the host FFmpeg/libmp3lame encoder; FFmpeg remains a decode validator. Exact-current protected run `30718535255` on Podcast merge `42867addae1fbd79f3ace0dfcb56bc357e84b6ef` passed 24 protocol probes and 10,000 measured requests with zero request errors, zero content mismatches, and `57.07 ms` added p95 against the `250 ms` ceiling. The wrapper confirmed cleanup, published content-free durable evidence, and retained only three redacted aggregate files. The artifact contains no lease token, capability, signature, or authorization value; D1 foreign keys are clean. The refreshed composed launch gate is 7 PASS / 5 BLOCK / 0 FAIL / 0 WAIT and narrows the dynamic-ad block to approved-plan, selected-decision, and qualified-direct-sponsor evidence. Production remains unchanged and unmigrated |
| Dust Wave direct-sponsor rehearsal | Automated and passing; real pilot evidence remains | Podcast 0.1.2, PR #63 / merge `25aac37`, and green CI run `30732677353` add one deterministic network-free gate around the existing production selector, MP3 validator, and virtual-media length primitive rather than a second campaign engine. The exact checked-in synthetic spot passes the `mp3-44100-stereo-cbr128-frame-v1` profile at 32,526 bytes / 2,038 ms / 78 frames; show, episode, position, date, device, and app targeting pass one positive and seven negative checks; the Dust Wave direct primary and distinct Dust Wave house fallback both compile to 193,488 bytes under `equal-byte-length-v1`. The evidence is explicitly synthetic, non-mutating, non-billable, zero-qualified, not native-client-validated, and ineligible for the launch gate. PR #64 / merge `f104786` reuses that exact gate in the existing protected three-day virtual-audio workflow. Exact-current run `30732876350` passed the sponsor rehearsal, 24 signed staging protocol probes, and 10,000 paired requests with zero request errors, zero content mismatches, and `54.21 ms` added p95; it retained only redacted aggregates, cleaned its exact objects and lease, and left zero diagnostic leases and clean D1 foreign keys. Full verification passes at 149 files / 616 tests and both dry bundles. Staging Worker version `95d7156c-52df-46f1-a8ae-222afa76cc67` is healthy; production is untouched. The composed read-only gate correctly remains 8 PASS / 5 BLOCK / 0 FAIL / 0 WAIT and still requires an approved episode ad plan, real selected decision, and one qualified native-client direct-sponsor download |
| Staging listener Turnstile recovery | Complete; human challenge remains intentionally manual | The listener page exposed a Pool site key even though Cloudflare already had an exact-host Podcast staging widget, so the HEY magic-link request failed before reaching the API. Staging was rebuilt with the dedicated key. During verification, Wrangler's alpha single-widget JSON response unexpectedly disclosed the secret; Codex immediately created a replacement exact-host managed widget, installed the replacement secret in only the staging Worker, stored only the public site key as the site repository variable, rebuilt/redeployed the staging Pages project, verified the real challenge renders, and deleted the disclosed widget. The staging build now checks Cloudflare's secret-free widget list and rejects Pool, Store, production, wrong-host, expanded-host, wrong-mode, wrong-clearance, and wrong-region keys before building; four regression tests cover the pure policy contract. Production remains untouched |

The 2026-08-01 read-only source inventory also closed two unsafe H1 shortcuts.
The authorized Ópera en la Selva Substack currently publishes no podcast feed
and reports podcast/free/subscriber-podcast disabled, so its branding and text
assets are not treated as Spanish audio. The Dust Wave YouTube catalog exposes
original-language metadata as English for the inspected show episodes and *La
Grima*; YouTube's generated Spanish translations are not source-language
fixtures. Those assets may support the English corpus after an explicit rights
record. Later that day, the owner approved the native-Spanish 36:28 interview
`KVlzIKhqIWw` for private testing. The local source-preparation tool selected
twelve non-overlapping 135-second speech-dense windows with 2,888 source-caption
words and wrote exact 16 kHz mono PCM fixtures plus clipped unreviewed caption
references outside Git. This closes Spanish source acquisition, not Spanish
human transcript review or H1 evidence.

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

Immediate execution queue:

1. Keep the composed launch gate and the 41-scenario Launch Lab matrix current
   through their existing read-only reconciliation paths. A scenario advances
   only from exact durable or provider evidence; synthetic rehearsal, an
   accepted-but-not-suppressed message, or an unavailable provider must remain
   visibly non-passing.
2. Freeze and validate a dry-run release snapshot for a publishable staging
   fixture. Exercise canonical News, show page, RSS, existing player/download,
   premium/private feed, public absence of unapproved transcript/chapter
   resources, and rollback without public release. Do not publish the current
   source-test episode, which explicitly says `Do not publish`.
3. Continue autonomous contract and recovery tests for Stripe test clocks,
   tax-core, Pool grants, YouTube resumable uploads, Resend lifecycle events,
   directories, and ads. Feed the resulting content-free evidence into the
   existing ledger; do not create provider-specific readiness stores.
4. Once a publishable fixture or irreducible provider input exists, execute its
   purpose-bound staging workflow and
   reconcile outcomes automatically. Keep provider operations unlisted,
   consented, test-mode, or observation-only as applicable.
5. After core launch, resume bilingual transcript review, H1 gold review and
   clean resource runs, exact alignment approval, and transcript-dependent
   chapter/clip generation. The prepared private Spanish fixtures remain valid
   inputs and need no manual schema or path copying.

Current human/external launch boundary:

| Blocker | Everything Codex can complete first | Irreducible input |
|---|---|---|
| Tax | Validate the policy schema, tax-core import, Stripe test reconciliation, and lifecycle/recovery tests | Accountant-approved registration and taxability facts |
| YouTube | Validate resumable/idempotent/unlisted upload contracts and reconciliation | Channel OAuth/2FA and inspection of one controlled unlisted result |
| Resend | Validate signed delivery, unordered-event, retry, and suppression contracts | One consented staging recipient and an approved suppression exercise |
| Directories | Generate/validate the submission packet and poll public listings | Provider login, terms, ownership codes, and provider review |
| Direct sponsor | Validate plan, disclosure, selection, fallback, accounting, and load behavior | Approved contract/creative and one qualified native-client download |
| Production | Build a complete immutable evidence snapshot and rollback plan | One exact-snapshot Super-admin promotion approval |

Owner decisions recorded on 2026-08-01 narrow that boundary further:

- there is no publishable episode, so publication, full-episode YouTube, and
  real directory-ingestion work remain held rather than reusing the private
  `Do not publish` source test;
- the owner reports tax registration and taxability settled, while the gate
  still requires the exact versioned Podcast subscription policy facts and
  effective date rather than inferring them from a Store checkout rate;
- a consented HEY staging recipient and suppression exercise are approved, but
  the real Turnstile challenge and one-time magic-link click remain human;
- Dust Wave is the first direct sponsor. A staging-only demo direct campaign
  and byte-identical house fallback may exercise every non-billing primitive;
  no synthetic request may be represented as a qualified native-client
  delivery;
- production promotion remains undecided until the exact staging snapshot is
  complete.

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
- Automate purchase, renewal, failed renewal, recovery, cancellation, refund,
  Portal, duplicated-webhook, and out-of-order-webhook tests with Stripe test
  clocks.
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

- Podcast roadmap: `dust-wave-podcast/docs/ROADMAP.md`
- Current human/provider inputs: `dust-wave-podcast/docs/OWNER_ACTIONS.md`
- Staging execution and rollback: `dust-wave-podcast/docs/STAGING_RUNBOOK.md`
- Security boundary: `dust-wave-podcast/docs/SECURITY.md`
- API contract: `dust-wave-podcast/docs/API.md`
- Alignment evidence: `dust-wave-podcast/docs/ALIGNMENT_GATE.md`
- Dynamic-ad evidence: `dust-wave-podcast/docs/DYNAMIC_ADS_GATE.md`
- Clip evidence: `dust-wave-podcast/docs/CLIP_RENDER_GATE.md`
- Virtual-audio evidence: `dust-wave-podcast/docs/VIRTUAL_AUDIO_GATE.md`
