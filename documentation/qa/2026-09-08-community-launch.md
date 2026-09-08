# Community calendar launch — September 8, 2026

The Microcinema calendar, Writers Group schedule, moderated submissions and
separate Community admin were implemented and deployed with the owner's
confirmed scope. The source implementation is commit `96c47225957fe683831534f70d008455cb2f10cc`.

## Live surfaces

- [Microcinema](https://dustwave.xyz/microcinema.html?month=2026-09#calendar)
- [Writers Group](https://dustwave.xyz/writers-group.html#readings)
- [Community admin](https://dustwave.xyz/admin/community/)
- [Separate staging site](https://dustwave-community-staging.jogo.workers.dev/microcinema.html)

English and Spanish versions share records. Production contains only the
confirmed biweekly meeting series beginning September 21, 19:00–21:00 Albuquerque
time, with two slots per meeting. No event or script fixtures were seeded into
production. The first approved administrator is configured in the separate
runtime allowlist and restricted email binding.

## Evidence

- [Build and Deploy run 34205560981](https://github.com/aindaco1/dust-wave-new/actions/runs/34205560981)
  passed the existing Podcast/security gate, Community tests, production WebP
  build, Pages deployment, Cloudflare header synchronization and cache purge.
- Community checks passed: 2 site contracts and 14 Worker tests, including an
  isolated workerd/D1/R2 workflow. Tests cover PDF limits, privacy, one-use login,
  CSRF/Origin, retry receipts, revision conflicts, queue allocation, started
  agenda preservation, DST/month boundaries and real 1200×630 PNG generation.
- Browser validation used three synthetic scripts locally: approving them
  allocated two to September 21 and one to October 5. Moving the third to
  position two, previewing, and saving moved the affected readings together.
  Private download/replacement controls remained present in the active queue.
- Desktop and 390-pixel public layouts were inspected, including Spanish
  agendas and long fixture titles. Both phone documents had a 390-pixel scroll
  width and viewport. Calendar list/grid styling, inherited link colors and
  legacy list indentation were corrected during review.
- Staging's real Images binding normalized a synthetic PNG. The stored
  derivative was downloaded through authenticated R2 tooling and verified as
  320×320 WebP. Its unauthenticated pending-image URL returned 404. That
  unattached synthetic upload expires through the normal cleanup job.
- `node scripts/smoke-community.mjs` passed against staging and production:
  six distinct current/next-two-month EN/ES PNGs, server-rendered page markup,
  admin no-store/CSP/frame headers, private PDF/state denials, malformed month
  handling and retained production CSS selectors.
- Production Worker version: `87e6e05f-677c-45d7-bb7a-7f677269c266`. Its seven
  routes cover only the two public pages, Community admin and Community API.
  Pages shells were deployed and verified before route activation.
- Tracked-secret scan, dependency audits and whitespace checks passed. The
  isolated local production build excluded two unrelated untracked news drafts;
  one draft references a missing image. Those original files remain untouched
  and were not part of the production commit. CI independently built the exact
  committed source successfully.

## Operational boundary

Login uses the existing Cloudflare Email Service domain with the restricted
Community sender and recipient binding. No real login email was sent during
this work. Local synthetic login and deployed configuration checks do not prove
inbox delivery; the administrator's first real sign-in verifies that final
provider/mailbox step.

See the [Community Worker guide](../../workers/community/README.md) for updates,
private-file removal, deployment and independent rollback. This is dated
release evidence; rerun the smoke script after future deployments.
