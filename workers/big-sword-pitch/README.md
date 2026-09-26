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

Preparation copies the export, sets its document title and noindex metadata,
and removes Keynote's normal-window 720px width cap. The existing aspect-ratio
layout now expands and contracts to fit the viewport. Ordinary clicks, taps,
forward swipes, Right Arrow and Space advance a complete slide. Left Arrow,
backward swipes and right-click return to the previous complete slide, including
after automatic animations. Input during a transition waits for a safe state.
Only the leftmost 24 pixels of a swipe open the slide menu. The team collage
plays once and holds on the full team; preparation removes its GIF repeat
metadata without re-encoding any frames. Other animations and media remain intact.
Videos play inline without native controls and pass clicks and taps through to
slide navigation. Leaving a slide pauses its video so audio cannot continue
behind the next slide. The original video volume is preserved.
The patch fails if the known player code changes.
Source files are never edited. A previously prepared export can also be used
as input when kept outside the generated presentation directory.

Create `dustwave-big-sword-pitch-private` once with `wrangler r2 bucket create`.
Supply `CLOUDFLARE_ACCOUNT_ID` and a Cloudflare token with R2 write access as
environment variables, then run `npm run upload`. The uploader verifies hashes
and writes into an immutable export prefix; it resumes using its local
checkpoint. After all files upload, set `vars.ASSET_PREFIX` in `wrangler.jsonc`
to the prefix printed by preparation. Keep the manifest locally for integrity
checks. To republish after remote deletion, remove the corresponding local
upload checkpoint first.

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

See the [September 25 acceptance record](../../documentation/archive/2026-09-25-big-sword-pitch.md)
for the initial deployment checks. Keep the gate's `same-origin` referrer policy:
`no-referrer` makes browser form POSTs send a null Origin and fail the origin check.

Rollback an asset update by restoring the previous `ASSET_PREFIX` and deploying.
Use `wrangler rollback` for Worker code. Remove this Worker's route to unpublish;
the GitHub Pages origin has no presentation copy. Keep private R2 exports until
their removal is separately intended.
