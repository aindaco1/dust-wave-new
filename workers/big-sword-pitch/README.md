# Big Sword pitch

Independent password-protected Keynote export at `https://dustwave.xyz/big-sword-pitch/`.
The Worker authenticates every page and asset request before reading private R2.
It loads only the exported player, with no Eleventy layout, site styles, site
JavaScript, header, footer, analytics or navigation.

The original export remains outside the repository. **Never put the presentation
or password in Git, `src/`, `dev/`, `docs/`, or a public bucket.** This repository
is public. The ignored `.artifacts/big-sword-pitch/` directory holds prepared
assets, a SHA-256 manifest and upload checkpoints. The R2 bucket must have no
public development URL or custom domains.

## Prepare and publish

From this directory:

```sh
npm ci
npm run prepare:assets -- /path/to/Keynote-export
npm test
```

For optimized media and a replacement opening clip (FFmpeg/ffprobe and Python
with Pillow required):

```sh
npm run prepare:assets -- /path/to/Keynote-export --optimize-media --opening-video /path/to/captioned-teaser.mp4
```

The opening clip becomes a fast-start H.264 copy up to 2000 pixels wide, with
its original audio stream copied intact. Large opaque GIFs become silent,
inline H.264 loops with their original frames and dimensions (odd dimensions
receive one padding pixel). Small or transparent GIFs and the team collage
remain GIFs. Encodes are cached by source hash and recipe in the ignored
artifact directory. A replacement should match the original clip's duration;
review new timings/layout when changing to a different edit.

Preparation copies the export, sets its document title and noindex metadata,
and removes Keynote's normal-window 720px width cap. The existing aspect-ratio
layout now expands and contracts to fit the viewport. Ordinary clicks, taps,
forward swipes, Right Arrow and Space advance a complete slide. Left Arrow,
backward swipes and right-click return to the previous complete slide, including
after automatic animations. Input during a transition waits for a safe state.
Only the leftmost 24 pixels of a swipe open the slide menu. The team collage
plays once and holds on the full team; preparation removes its GIF repeat
metadata without re-encoding any frames.
Videos play inline without native controls and pass clicks and taps through to
slide navigation. Leaving a slide pauses its video so audio cannot continue
behind the next slide. The original video volume is preserved.
The patch fails if the known player code changes.
Source files are never edited. A previously prepared export can also be used
as input when kept outside the generated presentation directory.

At idle the player preloads the next actual slide's textures and media. Media
prefetch uses two requests at a time, retains only the current and neighboring
slides in tab memory, and reuses blob URLs without a second download. A fast
jump falls back to normal streaming and cancels incomplete duplicate fetches.
No persistent browser storage or public caching is enabled.

Create `dustwave-big-sword-pitch-private` once with `wrangler r2 bucket create`.
Supply `CLOUDFLARE_ACCOUNT_ID` and a Cloudflare token with R2 write access as
environment variables, then run `npm run upload`. The uploader verifies hashes
and writes into an immutable export prefix; it resumes using its local
checkpoint. After all files upload, set `vars.ASSET_PREFIX` in `wrangler.jsonc`
to the prefix printed by preparation. Keep the manifest locally for integrity
checks. To republish after remote deletion, remove the corresponding local
upload checkpoint first.
Uploads use bounded batches of four buffered requests, with retries and a
checkpoint after each batch; an incomplete upload must never be deployed.

Set `PITCH_PASSWORD` and a random `SESSION_SECRET` using `wrangler secret put`.
Secrets belong only in Cloudflare (or ignored `.dev.vars` for local testing).
Then run `npm run check` and `npm run deploy`. This Worker deploys independently
of GitHub Pages and does not require a website build or release.

The gate issues a signed, HttpOnly, Secure, same-site cookie scoped to this
path for seven days. Changing either secret invalidates sessions. Login
attempts are limited to ten per IP per minute at the Cloudflare location.
All responses are private, non-cacheable and noindex. R2 supports authenticated
video byte ranges. Worker development and preview URLs are disabled.

## Acceptance and rollback

Verify the live password screen, a wrong password, the correct password,
refresh persistence, direct unauthenticated media denial, video byte ranges,
hidden video controls even on hover, navigation during active video playback,
and fitted slides at desktop and phone widths. Check that
requests stay within this route, with no website bundles or external assets.
Local tests do not establish live provider or browser acceptance.

With the prepared private export served locally on port 8799, run
`node workers/big-sword-pitch/scripts/verify-player.mjs` from the repository root.
This browser regression uses the site's Puppeteer dependency to check all 27
slides in both directions, slide boundaries, right-click, phone tap/swipe input,
viewport fit, and the team collage's final frame across multiple cycle lengths.
It starts every video, checks that hover does not expose controls, navigates
while playback is active, and verifies the departed video is paused. Test videos
are muted only in the browser test to avoid autoplay-policy false positives.
Also verify those controls in the deployed browser; simulated swipe events do
not establish physical-device acceptance.

For optimized exports, also run `node workers/big-sword-pitch/scripts/verify-media.mjs`.
It checks all 14 converted loops on desktop and phone without forcing playback,
verifies that the teaser retains audio, and measures the large montage's first
frame after prefetch while confirming no duplicate media request. Pass the
live presentation URL and set `PITCH_PASSWORD` in the environment for the same
deployed checks. Inspect captions and representative frames, compare encoded
duration/frame counts, and verify fast-start metadata and copied audio before
uploading. Prefetch timings describe a prepared next slide, not a guarantee on
every network or a cold direct jump.

See the [September 25 acceptance record](../../documentation/archive/2026-09-25-big-sword-pitch.md)
for the initial deployment checks and the
[September 26 media update](../../documentation/archive/2026-09-26-big-sword-pitch-media.md)
for encoding, prefetch and live playback evidence. Keep the gate's `same-origin` referrer policy:
`no-referrer` makes browser form POSTs send a null Origin and fail the origin check.

Rollback an asset update by restoring the previous `ASSET_PREFIX` and deploying.
Use `wrangler rollback` for Worker code. Remove this Worker's route to unpublish;
the GitHub Pages origin has no presentation copy. Keep private R2 exports until
their removal is separately intended.
