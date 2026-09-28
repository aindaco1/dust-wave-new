# Big Sword transition sound — September 27, 2026

Four transition videos now contain timed CC0 sound effects. Slide numbers below
are actual deck slides, rather than Keynote's build-scene URL hashes.

| Transition | Sound timing |
|---|---|
| 3 — spinning sword | Five short air swishes from 0.16 to 2.34 seconds, gently panned left to right |
| 10 — heart pierce and tear | Piercing sound at 0.17 seconds; heartbeat from 0.37 seconds, with strong beats aligned near 0.88 and 1.58; downward rip at 1.92 seconds |
| 14 — horizontal sword wipe | Broader swish at 0.08 seconds and metallic scrape at 0.50 seconds |
| 27 — final center split | Metallic sheath sound and soft swish from 0.17 seconds, aligned to the cut and flash |

## Sources and media integrity

The four Freesound recordings have explicit CC0 1.0 declarations. Credits and
primary source links are in [third-party notices](../../THIRD_PARTY_NOTICES.md).
The [recipe](../../workers/big-sword-pitch/scripts/transition-audio.json) records
the downloaded public preview URLs, SHA-256 hashes, trims, gains and timing.
No stock-service account or restricted download was used.

The mix uses 48 kHz stereo, short fades and AAC audio. Peak levels range from
−10.81 to −5.17 dBFS before AAC encoding. The loudest cue is the downward tear.
Each clip has room below clipping and no sound continues past the transition.

AVFoundation passthrough preserves the original encoded video packets,
dimensions, frame counts, durations and HEVC alpha configuration. Both video
packet and codec-configuration hashes were checked. Generic FFmpeg stream copy
was rejected because it stripped the auxiliary HEVC alpha configuration.
Decoded pixel hashes also matched the originals for all four videos.

Only the four transition assets changed in the 355-file manifest, adding
157,030 bytes. The opening teaser, GIF/video loops, team collage, slide metadata
and player code are byte-for-byte unchanged. The sound preview is a separate,
private review artifact; it is not loaded by the presentation.

## Acceptance

- Twelve Worker/preloader/GIF tests and the Wrangler dry run passed.
- Local desktop and phone-emulated browsers decoded audible audio on all four
  transitions entered through normal keyboard/tap navigation. The audio test
  did not call `play()`, mute videos or override autoplay policy.
- All four stopped when navigating away during playback and played once to
  completion when revisited. Controls stayed hidden and playback stayed inline.
- All four outputs decoded without video errors. Source recordings and mixes
  were checked for empty cues, timing, source integrity and clipping headroom.
- The full local navigation regression passed all 27 slides in both directions,
  keyboard/click/tap navigation during playback, hidden controls, stopped
  departed videos, viewport fit and the team collage's final-frame hold/revisit.
- Live integrity checks matched all 355 asset lengths and private cache headers,
  plus hashes for all four updated transitions, the player, opening teaser,
  montage and team collage. Login, wrong-password rejection, anonymous asset
  denial and authenticated byte ranges passed.
- The same audio checks passed on the live protected route for all four
  transitions in desktop and phone-emulated browsers, including departure and
  one-shot replay. No browser page errors were reported.
- Live media checks also passed all 14 silent loops and eight distinct
  transparent GIFs. The large montage's first frame after prefetch took 295 ms
  on desktop and 318 ms on the phone viewport, with no duplicate media request.
- Browser audio analysis confirms a nonzero decoded signal, not subjective
  listening quality, physical speaker output or physical iOS acceptance.

## Deployment and rollback

Worker version: `a07f7166-ca30-4d88-a253-42d1484f1ff5`.
Asset prefix: `exports/440b873abc8bd588c233`.
Prepared export: 355 files, 216,261,954 bytes.

Restore `exports/8a44c83cb9c2490ae1fb` as `ASSET_PREFIX` and deploy the Worker
to roll back this sound update. The previous private export remains available.
