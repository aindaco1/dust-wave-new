# Big Sword media update — September 26, 2026

The protected pitch now opens with the supplied captioned teaser. Fourteen
large opaque GIFs use silent inline H.264 loops, and the player preloads the
next whole slide's textures and media. Transparent decorations retain their
original GIFs; the team collage still plays once and holds its final frame.

## Size and fidelity

- Supplied captioned teaser: 100,055,116 → 29,928,850 bytes. The web copy is
  2000×1150, retains all 509 frames and the 42.416667-second duration, and has
  an identical AAC audio stream. Captions were visually reviewed.
- Large montage: 72,765,257 → 9,989,979 bytes (86.3% smaller), retaining
  1280×720, all 410 frames and the 20.5-second duration.
- Fourteen converted animations together: 225,564,125 → 40,148,741 bytes
  (82.2% smaller). All use fast-start metadata. Minor variable-frame-duration
  rounding remained below 0.11 seconds; no source frames were removed.
- Full-frame SSIM: 0.99562 for the teaser against its scaled source;
  0.94906 for the montage against its GIF source. Representative frames were
  visually checked. Private media and detailed reports remain outside Git.

## Acceptance

- Twelve Worker/preloader/GIF tests and Wrangler dry run passed.
- Local browser regression passed all 27 slides forward/back, boundaries,
  keyboard/click/tap input during playback, no controls on hover, stopped
  departed videos, viewport fit, and team final-frame hold/revisit.
- Live desktop and phone-emulated browsers verified all 14 silent loops
  start without test-forced playback. All eight distinct transparent GIFs
  on the decoration-heavy slide loaded from prefetch (21 placed instances).
- The large montage's first presented frame after prefetch took 323 ms on
  desktop and 325 ms on the phone viewport, with no duplicate download.
  These are prepared-next-slide measurements, not cold-network guarantees.
- Live opening-video click/Right Arrow/Space/tap navigation passed. Input
  was accepted in 2–34 ms; the next slide appeared in 466–1600 ms. Departed
  audio stopped and native controls stayed hidden. No browser page errors.
- All 355 live asset lengths and private cache headers matched the manifest.
  HTML/player/team/teaser/montage hashes, media byte ranges, correct login,
  wrong-password rejection and anonymous asset denial passed.
- Mobile checks use browser emulation, not physical-device acceptance.

## Deployment and rollback

Worker version: `63cc7916-81c7-4537-89b1-2c6ba454312c`.
Asset prefix: `exports/8a44c83cb9c2490ae1fb`.
Prepared export: 355 files, 216,104,924 bytes.

To roll back the media/player update, restore
`exports/a3750aca88c9be53ce0a` as `ASSET_PREFIX` and deploy the Worker. The
previous private export is retained. Authentication and public-cache policy
were not changed.
