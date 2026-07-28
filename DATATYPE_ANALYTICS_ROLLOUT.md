# Datatype analytics rollout

## Decision

Use the self-hosted Datatype variable font for compact, decorative data
visualizations while retaining localized text and exact numeric values as the
source of truth. Start in the private Podcast analytics workbench. Do not make
Datatype a global UI font and do not extract a shared package until a second
Dust Wave consumer supplies characterization and migration evidence.

The pilot pins Datatype 1.2.2 at upstream commit
`04e189f3222ab436fb7f84a20c62c48a1a7689f7`. The unmodified WOFF2 is 81,904
bytes with SHA-256
`b7bd0abb2cad57bfa29129228d93e4cd78b1d46045899f9284938ced0ee68489`.

## Pilot contract

- Scope: the qualified-download and engaged-play summary in
  `/admin/podcasts/`.
- Data: at most 14 daily values per series, normalized against the same highest
  daily value across both series and rounded to integers from 0 through 100.
- Default axes: `wdth` 100 and `wght` 500.
- Compact axes: `wdth` 75 and `wght` 500 below a 34rem component container.
- Very narrow behavior: below an 18rem component container, hide the decorative
  glyph and retain localized labels, the latest value, and the existing exact
  daily trend.
- Loading failure: keep the Datatype summary hidden unless `document.fonts`
  confirms the matching face loaded; the existing trend remains unchanged.
- Accessibility: Datatype syntax is `aria-hidden` and forced left-to-right.
  Localized headings, latest values, dates, numeric values, and the existing
  trend remain available to assistive technology.
- Languages: English and Spanish ship together and remain subject to the
  repository's i18n parity validator. Datatype does not render prose.

## Delivery phases

### 1. Consumer pilot

- [x] Vendor the pinned WOFF2 under a content-identifying filename.
- [x] Ship the OFL 1.1 text, copyright notices, upstream commit, byte size, and
  checksum.
- [x] Keep the font face and visualization styles inside the Podcast admin
  bundle.
- [x] Encode only validated, bounded numeric arrays through a consumer-local
  helper.
- [x] Preserve the existing detailed trend as the font, layout, and
  accessibility fallback.
- [x] Add English/Spanish copy and automated integrity, encoding, font-loading,
  responsive-contract, and fallback checks.

Exit gate: `npm run test:podcasts`, `npm run build`, and targeted browser checks
pass without a raw-syntax flash, layout overflow, or loss of exact values.

### 2. Broader release validation

- [ ] Exercise 7-, 30-, and 90-day API ranges, including empty, zero-only, and
  malformed-count responses. The visual summary must remain bounded to the
  latest 14 days.
- [ ] Check the component at container widths of 1180px, 544px, 320px, and
  288px in current Chrome, Safari, and Firefox.
- [ ] Check 200% and 400% browser zoom, increased text spacing, forced colors,
  reduced motion, keyboard navigation, VoiceOver, and one additional screen
  reader/browser pairing.
- [ ] Block the WOFF2 request and test with `document.fonts` unavailable. In
  both cases, the original exact trend must remain usable and no Datatype
  expression may become visible or announced.
- [ ] Compare English and Spanish dates, number grouping, headings, and status
  announcements using production-shaped analytics fixtures.
- [ ] Record the WOFF2 transfer, cache result, and analytics-tab rendering cost.
  Do not preload the font because this private, initially hidden panel is not
  above the fold.
- [ ] Attach screenshots, assistive-technology notes, and rollback evidence to
  the consumer pull request.

Exit gate: before Datatype expands beyond this pilot, the release evidence is
reviewed and rollback has been demonstrated without a data or API migration.

### 3. Second-consumer trial

- [ ] Select one existing analytics or visualization surface in another Dust
  Wave consumer; do not create a synthetic use case.
- [ ] Preserve that consumer's domain model, API, templates, routes, and
  deployment ownership.
- [ ] Add behavior-focused tests before copying or adapting the encoder and
  font-ready reveal policy.
- [ ] Document differences in normalization, axes, density, locale, CSP,
  caching, and fallback behavior.
- [ ] Verify that both consumers can independently remove the visualization and
  roll back their shared submodule pointers.

Exit gate: both current consumers have compatible release branches,
characterization coverage, migration evidence, and independent rollback
evidence.

### 4. Shared primitive decision

Extract to `dust-wave-platform` only if the second trial demonstrates an exact
duplicate. A near-duplicate requires an injected normalization or rendering
policy, with independent evidence for each consumer.

The first possible shared release should:

- expose only bounded encoding/normalization and font-readiness primitives;
- document accepted values, the 20-value limit, rounding, errors, and failure
  semantics;
- include no Podcast models, copy, templates, routes, credentials, customer
  data, or deployment configuration;
- retain the OFL and immutable upstream provenance;
- use Node.js 20+ and Web Platform APIs;
- pass platform `npm test` plus every consumer's characterization suite; and
- be published as an immutable exact version that each consumer pins alongside
  an exact submodule commit.

If behavior or policy still differs, keep the implementations consumer-local.

## Regression and rollback controls

- Raw Datatype expressions must never be visible or announced.
- Values must be finite, non-negative, no longer than 20 points, and encoded
  only as integers from 0 through 100.
- All series in one comparison must share the same explicit maximum.
- `liga` and `calt` stay enabled and letter spacing stays zero.
- The WOFF2 checksum validator detects upstream or accidental asset drift.
- The existing trend is additive fallback coverage, not a second data source.
- Removal requires only deleting the summary call, helper, scoped styles, font
  assets, notices, translations, and tests. No API, stored data, or deployment
  migration is involved.

## Verification commands

```sh
npm ci
npm run test:podcasts
npm run build
git diff --check
```

Before merging, also confirm the built output contains the pinned WOFF2 and
does not contain an external Datatype or font-CDN request.
