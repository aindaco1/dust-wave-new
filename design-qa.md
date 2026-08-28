# Design QA

## Result

Passed.

## Objective

- Keep the newsletter popup anchored to the bottom of a mobile Safari viewport.
- Prevent Safari from rendering the close `X` in its default blue control color.
- Reduce the popup's mobile footprint without removing content or shrinking tap targets below 44px.

## Reference and implementation

- Reference screenshot: `/Users/aindaco1/Downloads/Screenshot 2026-08-27 at 12.11.46 PM.png`
- Implementation screenshot: `/Users/aindaco1/.codex/visualizations/2026/08/27/01a0443d-64b6-78b1-99e6-709000bfea26/newsletter-popup-mobile-after.png`
- Combined before/after comparison: `/Users/aindaco1/.codex/visualizations/2026/08/27/01a0443d-64b6-78b1-99e6-709000bfea26/newsletter-popup-before-after.png`
- Local preview: `http://127.0.0.1:4173/projects.html`
- QA viewport: 440 x 844 CSS pixels

The reference was cropped to the app-owned browser content and scaled to the implementation width for comparison. Safari chrome is therefore excluded from the implementation image.

## Visual checks

- Popup remains bottom-anchored with a measured 5px bottom gap.
- Popup content height is 191px at the mobile QA viewport, substantially shorter than the reference.
- Close control computes to black (`rgb(0, 0, 0)`) with native appearance disabled.
- Close control, email field, and submit button each retain a 44px minimum interactive height.
- Heading, label, input, and button remain legible and visually balanced.
- No horizontal overflow was detected.
- Tablet breakpoint remains on the existing layout rules; the new compaction is scoped to widths of 480px and below.

## Interaction and regression checks

- Close button dismissed the popup successfully through its accessible name.
- Browser console reported no warnings or errors.
- Production build completed successfully, including the repository's 11 automated tests.
