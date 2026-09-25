# Big Sword pitch initial acceptance — September 25, 2026

The independent `dustwave-big-sword-pitch` Worker was deployed on
`dustwave.xyz/big-sword-pitch*`. Accepted Worker version:
`b952a7af-44c8-4aeb-b6a0-0ff04ee0d379`.

The supplied Keynote HTML export contains 27 slides, 355 files and 517,242,200
bytes. Its private R2 prefix is `exports/3be438640fb6d9a05f5e` in
`dustwave-big-sword-pitch-private`. Both public development access and custom
domains were checked: disabled / none. No presentation files or passwords
were added to Git or GitHub Pages. The original Desktop export was preserved.

Only the prepared HTML title/metadata and the exported player's normal-window
width cap changed. The other 353 files matched the original export by SHA-256.

## Observed checks

- Six Worker tests passed for anonymous denial, wrong passwords, origin checks,
  rate limiting, signed sessions, tampering, password rotation, byte ranges,
  cache headers, missing configuration and invalid requests.
- Wrangler 4.141.0 deployed successfully; its dependency audit reported no
  vulnerabilities. `git diff --check` passed.
- Live HTTP checks verified every asset's authenticated status and byte count,
  plus exact HTML/player hashes, correct-password login, wrong-password denial,
  unauthenticated GET/HEAD denial for metadata/player/video, and a matching
  1,024-byte partial video response. Protected responses used private/no-store
  caching headers.
- Chrome on macOS successfully submitted the live password form, played the
  opening video and retained access after reload. No console warnings/errors
  or requests outside `/big-sword-pitch/` were observed on the live opening.
- The slide occupied 1440 × 810 pixels in a 1440 × 900 desktop viewport and
  390 × 219.375 pixels in a 390 × 844 emulated phone viewport. A local landscape
  check used 693.33 × 390 pixels within an 844 × 390 viewport. The complete
  16:9 image remained visible with no horizontal overflow.
- Local browser checks also covered GIF playback, keyboard navigation and the
  exported HEVC movie transition. No physical phone or other-browser acceptance
  is claimed. Media was not transcoded.

The browser form check caught a `no-referrer` / null-Origin conflict that direct
HTTP checks did not reproduce. The accepted revision uses `same-origin`, and
the actual form submission was repeated successfully after deployment.

The local manifest and machine-readable HTTP evidence are under the ignored
`.artifacts/big-sword-pitch/` directory. This record is historical; recheck the
live route and private bucket before reporting later deployment state.
