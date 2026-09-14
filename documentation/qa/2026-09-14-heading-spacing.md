# Public heading spacing — September 14, 2026

## Change

Public pages now share heading spacing through
[`_heading-spacing.scss`](../../src/scss/themes/base/_heading-spacing.scss).
Major headings have 24–32px below them; editorial sections have 40–64px above
them. Smaller subheadings have a 16px following gap, and compact cards use
12px. First headings do not add space above their container, and consecutive
headings stay together. Grid containers continue to own their outer spacing.

The Project and News layouts normalize legacy heading-adjacent breaks in
rendered content, including the boundary to generated galleries and videos.
The source articles, credit line breaks, linked captions, and feed rendering
remain intact. Shared media templates no longer insert `<br><br>` spacers.
Page summaries no longer combine heading margins with extra top padding.

## Validation

- Final `npm run build` passed, including project-frontmatter, Pages CMS,
  Substack export, generated social cards, and six rendered Podcast i18n pages.
- `npm run test:public-shell` passed, including three content-preservation
  cases for the heading-spacer filter.
- `npm run test:footer` passed all eight shell/language cases across its
  phone, tablet, and desktop widths.
- Site performance and shared Podcast/Digest player validators passed; both
  mobile player regression cases passed.
- Production CSS was inspected after purging. Explicit editorial container
  selectors retain the rules in the production stylesheet.
- Responsive audit: 13 public routes in English and Spanish at 320, 768,
  and 1440px (78 combinations), all HTTP 200, no document-width overflow.
  The audit exits 1 for the existing Projects filter links outside the
  320px viewport in both languages; they belong to the intentional horizontal
  filter scroller. There were no other overflow flags.
- A focused final pass covered eight project/article/terms/donation routes
  at 390 and 1440px (16 combinations). Tecolote's Making heading measured
  40px above / 24px below at 390px and 64px above / 32px below at 1440px,
  in both languages. The heading-to-embed gap matches the bottom margin.
- Visually reviewed the loaded Instagram embed, multiline mobile heading,
  older article headings, media galleries, Digest sections and compact cards,
  Microcinema, Branded Content, newsletter, and bilingual page layouts.

The isolated Chrome 148 headless processes stalled during browser shutdown
after completing their checks. Only those temporary browser processes were
terminated; the scripts then wrote their results and exited (0 for the focused
heading and footer checks; 1 for the documented responsive scroller flags).

## Local evidence

Evidence is kept under the ignored `.artifacts/heading-spacing/` directory:

- `build-final.log`, `footer.log`
- `responsive-final/report.json` and screenshots
- `final-detail/report.json` and screenshots
- `before/report.json` and `final/report.json` for the broader spacing comparison

The preview uses the built `docs/` output at `http://127.0.0.1:4173`.
This is local validation; no deployment or publication was performed.
