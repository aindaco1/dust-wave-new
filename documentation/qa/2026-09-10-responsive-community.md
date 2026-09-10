# Responsive and Community review — September 10, 2026

## Scope and findings

Reviewed Home, Microcinema, Writers Group, Contact, Branded Content, CutNotes,
Record, and Community sign-in in English and Spanish at 320, 390, 768, 1024 and
1440 pixels. All 80 final combinations returned the intended pages without
visible horizontal overflow. Inspected phone/tablet/desktop screenshots with
loaded site fonts, plus independent fallback-font checks.

Changes from the review:

- The footer's small-screen single row relied on tiny text and could overlap
  when web fonts were unavailable. It now uses two rows below 992 pixels,
  readable labels and 44-pixel social/language targets.
- Contact's nested padding left only about 60% of a 320-pixel viewport for
  fields. The form now uses its existing column gutters, with more writing
  room and the same spacing before Submit and around verification.
- Community admin's heading started too far down on phones. Responsive top
  padding removes that blank space; Users fields stack on tablets, and empty
  local-login verification containers no longer add a blank gap.
- Public Community inputs have at least 16-pixel text. Script/event forms stay
  visible, retain their verification spacing, and have no trailing divider.
- The Branded Content PDF sentence no longer adds a second divider beneath
  the Albuquerque/Santa Fe note. Its PDF is unchanged.

## Validation

- Read-only responsive browser audit: 80 page/viewport combinations.
- Shared footer: four page shells × two languages × nine widths × short/long
  content, including blocked external fonts and non-overlapping touch targets.
- Community: public calendar/history/share links, forms/Turnstile lifecycle,
  private PDF limits and filenames, all admin tabs/editors, queue/metadata
  autosave, drag-and-drop, conflict recovery, and Super/Limited-admin permissions.
  Added English/Spanish tablet cases for event/meeting and user editing.
- Contact: six browser tests covering success, verification cleanup, retained
  drafts, provider/network failures, retries, and mobile/tablet/desktop gutters.
- Full Podcast/security gate, production Pages/WebP build and deployed checks
  remain separate release evidence; the deployment outcome is recorded below.

Reproduce with the commands in [Testing](../testing.md#responsive-review).
Generated screenshots/reports are disposable `.artifacts` output, not source.
Synthetic fixtures never send email or modify local/production Community data.
Browser viewport checks do not substitute for physical-device acceptance.

## Release and cleanup procedure

The Community role migration seeds `alonso@dustwave.xyz` as Super-admin and
keeps Store/Pool/Podcast memberships independent. Production was inspected
before migration: only that Community session identity was present; event data
and private upload metadata must remain unchanged by the role migration.
Deploy the compatible Worker first, then publish the new site assets.

Verify both deployed languages, month cards, PDF delivery, private-route denials,
role storage and Pages header/cache steps before declaring the release complete.
Retain local settings, dependencies, the current development preview, and
Community `.wrangler` data. Preserve unrelated untracked News drafts. Remove
only merged branches and recoverably archive obsolete generated output.
