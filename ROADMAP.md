# Dust Wave Roadmap

## Planned

### Self-hosted embeddable paid video player

Status: Proposed  
Added: 2026-06-23  
Priority: High when the first paid online screening or subscriber-only release is scheduled

#### Goal

Add a Dust Wave controlled embedded video player for paid films, premieres, and member-only screenings. It must work cleanly on dustwave.xyz, but the core player should be portable enough for other site owners to embed on domains they control. The player and paywall should live on Dust Wave infrastructure, use Cloudflare where practical, and use Stripe for checkout, billing, and customer self-service.

#### Security reality check

The literal requirement "cannot be ripped, downloaded, or screen recorded" is not technically achievable for browser playback. If a viewer can see and hear the film, a sufficiently motivated viewer can capture it with external hardware or another camera.

The practical target is:

- No public MP4 files or raw video URLs.
- No right-click/direct download path.
- No reusable shared playback links.
- No unauthenticated playback.
- No Stripe redirect bypass.
- Short-lived signed playback tokens.
- Revocable Stripe-backed entitlements.
- Visible buyer/session watermarking as a redistribution deterrent.
- Domain-verified embeds so the player can run on partner sites without exposing raw playback credentials to the parent page.
- A clear upgrade path to multi-DRM or forensic watermarking if a distributor, festival, or sales contract requires stronger controls than Cloudflare Stream signed URLs provide.

#### Current architecture fit

- The public site is an Eleventy static site deployed through GitHub Pages artifacts.
- The source branch intentionally does not commit `docs/` build output.
- There is one existing Cloudflare Worker at `workers/newsletter-subscribe/`, used for Resend newsletter signups.
- Project pages currently use raw Markdown/HTML and YouTube/Vimeo embeds.
- There is no user account system, session store, entitlement database, or Stripe integration yet.
- Dust Wave should be treated as the first embed consumer. The paid player should not depend on Eleventy internals or Dust Wave page templates.

#### Proposed Cloudflare plus Stripe architecture

- Video delivery: Cloudflare Stream for transcoding, adaptive playback, signed URLs, allowed origins, and disabled download tokens.
- Player shell: a hosted iframe application on a Dust Wave controlled player domain, for example `watch.dustwave.xyz`.
- Embed SDK: a small versioned JavaScript loader, for example `https://watch.dustwave.xyz/embed/v1.js`, that creates/resizes the iframe, opens checkout/auth windows, and uses `postMessage` for non-sensitive events.
- Plain iframe fallback: publishers who cannot run third-party JavaScript can paste an iframe embed with an `embed_id`.
- Paywall API: a Cloudflare Worker deployed with the player, not coupled to the Eleventy site. Candidate hostname: `watch.dustwave.xyz`.
- Entitlement store: Cloudflare D1 as the source of truth for videos, Stripe customers, purchases, subscriptions, rentals, refunds, verified domains, embeds, and active playback rights.
- Optional cache: Cloudflare KV only for low-risk, derived reads such as public catalog metadata or short-lived session lookups. Do not use KV as the source of truth for payment state.
- Payments: Stripe Checkout Sessions for the payment UI. Start with one-time purchase/rental access unless the product decision is membership; use `mode: subscription` for recurring membership.
- Subscription management: Stripe Customer Portal for cancellations, payment method updates, invoices, and plan changes.
- Webhooks: Stripe webhooks into the Worker for entitlement creation, renewal, revocation, refund handling, and idempotent reconciliation.

#### Repository boundary

Create a separate repo once implementation starts, unless the first spike proves the scope is smaller than expected. Recommended repo shape:

- `dustwave-player/`
  - `apps/player-frame/`: iframe UI for locked, checkout, auth, playback, watermark, and error states.
  - `apps/api/`: Cloudflare Worker routes for embeds, checkout, entitlement, playback, webhooks, and admin.
  - `packages/embed-sdk/`: tiny public loader used by Dust Wave and external sites.
  - `packages/shared/`: shared types, validation, event names, and constants.
  - `migrations/`: D1 schema and seed data.
  - `docs/`: embed guide, domain verification guide, support playbooks, and API notes.

Dust Wave's current repo should only consume the player through an Eleventy shortcode/snippet that emits the public embed code. This keeps the paid player portable and prevents the static site build from becoming the platform boundary.

#### Embed model

- Every external embed uses an `embed_id` tied to a video, allowed domains, access model, and visual settings.
- A site owner must prove control of a domain before that domain is allowed to frame the player.
- Verification options:
  - DNS TXT record, preferred for durable verification.
  - Static HTML file at `/.well-known/dustwave-player-verification.txt`.
  - Manual approval for trusted partners or festival sites.
- The iframe response should set a per-embed `Content-Security-Policy` with `frame-ancestors` restricted to the verified domains for that `embed_id`.
- The parent page never receives the Cloudflare Stream UID, signed Stream token, Stripe secret data, or entitlement details.
- The SDK should expose only safe events such as `ready`, `locked`, `checkout_started`, `playback_started`, `playback_error`, and `height_changed`.
- The iframe should handle layout, paywall copy, player UI, token refresh, watermark, and restore-purchase flows internally.
- Cross-domain embeds must not depend on third-party cookies. Browsers increasingly block or partition third-party storage, so the default flow should use one-time checkout/auth state, popup or top-level redirect completion, and iframe polling/token exchange instead of ambient cookies.

#### Data model

Minimum D1 tables:

- `videos`: `slug`, `title`, `stream_uid`, `poster_url`, `stripe_price_id`, `access_model`, `rental_duration_hours`, `published`, timestamps.
- `customers`: `id`, `email`, `stripe_customer_id`, timestamps.
- `entitlements`: `id`, `customer_id`, `video_slug`, `status`, `source`, `stripe_checkout_session_id`, `stripe_subscription_id`, `expires_at`, timestamps.
- `stripe_events`: Stripe event id, type, processed timestamp, and status for webhook idempotency.
- `publishers`: owner/contact metadata for domains that can embed the player.
- `publisher_domains`: publisher id, domain, verification method, verification token hash, status, verified timestamp.
- `embeds`: public embed id, video slug, publisher/domain scope, access model override, theme settings, status.
- `embed_bootstrap_sessions`: one-time state id, embed id, referrer/origin evidence, expiry, and status.
- `playback_sessions`: entitlement id, embed id, token expiry, IP hash, user-agent hash, and timestamps for abuse review without storing raw personal network data.
- `viewer_auth_sessions`: short-lived checkout/auth state used to reconnect a Stripe completion or magic-link auth flow to the iframe without relying on third-party cookies.

#### Worker endpoints

- `GET /embed/v1.js`: serve the versioned embed SDK with long-cache immutable URLs by version.
- `GET /embed/:embed_id`: render the iframe application, validate the embed id, emit per-embed CSP `frame-ancestors`, and create a short-lived bootstrap session.
- `POST /checkout`: create a Stripe Checkout Session for a film rental, purchase, or subscription price, including `embed_id` and return context.
- `GET /checkout/complete`: verify the Checkout Session server-side, create or refresh the entitlement, and connect the result to the waiting iframe through a one-time state.
- `POST /auth/magic-link` and `GET /auth/complete`: restore purchases without relying on third-party cookies inside embeds.
- `POST /portal`: create a Stripe Customer Portal session for an authenticated customer.
- `GET /videos/:slug/playback`: verify the bootstrap session, embed authorization, viewer session, and entitlement; generate a short-lived Cloudflare Stream token; and return only the data needed by the iframe player.
- `POST /webhooks/stripe`: verify Stripe signatures against the raw request body, process only required event types, and write idempotent entitlement changes.
- `POST /domains/verify`: admin/self-service endpoint for domain verification.
- `GET /oembed`: optional future endpoint for platforms that support oEmbed-style discovery.
- `GET /health`: lightweight operational check for deploy and monitoring.

#### Cloudflare implementation notes

- Use a separate Worker from the newsletter Worker because payment/session/video access logic has a different security profile.
- Prefer a separate repository for the player/Worker/SDK once the spike starts; this avoids coupling reusable embed infrastructure to the Eleventy site.
- Prefer TypeScript for the new Worker and generate binding types with `wrangler types`.
- Set a current `compatibility_date`, enable `nodejs_compat`, and turn on Worker observability.
- Store secrets with `wrangler secret put`; never commit Stripe keys, webhook secrets, token signing secrets, or Cloudflare API tokens.
- Use Cloudflare bindings where possible: D1 binding for entitlements and Stream binding for token generation.
- Configure Cloudflare Stream videos with `requireSignedURLs: true`.
- Set Stream `allowedOrigins` to the player domain first. Do not set each publisher domain as a Stream origin unless testing proves Cloudflare's origin checks require it for nested embeds.
- Use dynamic CSP `frame-ancestors` on the player iframe to restrict each embed to verified domains.
- Serve SDK assets from stable versioned URLs so external embeds do not break when new versions ship.
- Do not include the Stream UID, signed token, or source URL in static frontmatter or HTML when avoidable; use the public content slug and resolve the private Stream UID inside the Worker.
- Do not include the Cloudflare Stream `downloadable` token flag for paid videos.

#### Stripe implementation notes

- Use Stripe Checkout Sessions rather than building a custom card form.
- Use Stripe Prices, not deprecated Plans.
- Use Customer Portal instead of custom subscription cancellation and billing-management screens.
- Do not put a custom Stripe payment form inside the player iframe for v1. Use Stripe-hosted Checkout or a top-level/popup flow because embedded payment flows can be constrained by iframe sandboxing and payment-method redirects.
- Preserve `embed_id`, checkout state, and return URL context through Checkout so the viewer lands back in the correct embedded player.
- Verify webhook signatures and store processed Stripe event ids to prevent duplicate processing.
- Do not trust `session_id` from the browser by itself; retrieve and verify the Checkout Session server-side before granting access.
- Required initial webhook events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and refund/dispute events if one-time purchases or rentals are refundable.

#### Eleventy/site work

- Add a protected video shortcode or snippet, for example `{% protectedVideo "embed_id" %}`, that emits the same embed code external sites use.
- Do not implement Dust Wave-only player logic in Eleventy. Dust Wave should load `watch.dustwave.xyz/embed/v1.js` or the iframe fallback.
- Add local preview support so editors can see locked player states in `npm run watch` without production Stripe or Stream credentials.
- Add frontmatter conventions for paid video pages, for example:
  - `paid_video: true`
  - `embed_id: dw_long_night_premiere`
  - `price_label: "$5 rental"`
  - `access_model: rental`
- Keep free trailers on YouTube/Vimeo if desired, but do not embed the full paid film through YouTube/Vimeo.
- Add captions/subtitles support before launch.

#### External site owner workflow

1. Site owner requests or creates an embed for a film.
2. Site owner verifies domain control with DNS TXT or a `.well-known` file.
3. Dust Wave approves the domain/embed if manual approval is still required.
4. Site owner pastes a script embed:

```html
<div data-dustwave-player data-embed-id="dw_long_night_premiere"></div>
<script async src="https://watch.dustwave.xyz/embed/v1.js"></script>
```

Or a plain iframe fallback:

```html
<iframe
  src="https://watch.dustwave.xyz/embed/dw_long_night_premiere"
  title="Dust Wave video player"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen
  loading="lazy"
></iframe>
```

5. The player validates that the iframe is being framed by an allowed domain and then handles paywall, checkout, restore purchase, and playback.

#### Anti-rip controls

- Use Cloudflare Stream signed URLs with short expiry, renewed only after entitlement checks.
- Disable downloadable MP4 links for paid videos.
- Use domain restrictions/allowed origins.
- Do not depend on third-party cookies for cross-domain embeds. Use secure first-party cookies only for top-level player/auth pages, and use short-lived one-time state to reconnect iframe sessions.
- Add a visible moving watermark overlay with purchaser email or a short session code.
- Rate-limit checkout claim and playback token endpoints.
- Rate-limit by embed id, verified domain, viewer session, and network heuristics.
- Use CSP `frame-ancestors` to prevent unapproved domains from framing the player.
- Log suspicious repeated token generation, many devices, or unusual playback-session churn.
- Keep signed Stream tokens inside the player iframe; never post them to the parent page.
- If "screen recording must be blocked" is a hard contractual requirement, run a technical spike on a multi-DRM provider before implementation. Cloudflare Stream signed URLs are access control, not a complete DRM/capture-prevention system.

#### Execution phases

1. Product and platform decision
   - Choose one-time rental, permanent purchase, membership subscription, or a mix.
   - Decide whether users identify by email magic link only or whether a fuller account system is needed.
   - Decide the minimum acceptable anti-piracy posture: Cloudflare Stream signed URLs only, or multi-DRM evaluation required.
   - Decide whether external embeds are self-serve, manually approved, or invitation-only for v1.
   - Decide whether to create the separate `dustwave-player` repo immediately or after a short spike in this repo.

2. Repository and platform foundation
   - Create the separate player repo with Worker, iframe app, SDK, D1 migrations, and docs.
   - Configure CI/CD for the Worker/player deployment independent of the Eleventy GitHub Pages build.
   - Establish player hostname, likely `watch.dustwave.xyz`.

3. Vendor setup
   - Create Cloudflare Stream account/settings and upload one pilot film.
   - Create Stripe products and prices in test mode.
   - Configure Stripe Customer Portal branding and policies.
   - Decide the API hostname/route, CORS policy, iframe CSP policy, and allowed embed origins.

4. Worker foundation
   - Create the video access Worker with Wrangler, TypeScript, D1 migrations, Stream binding, observability, and local `.dev.vars` examples.
   - Add D1 schema and seed data for a pilot video.
   - Implement embed, domain verification, checkout, auth restore, portal, playback, webhook, and health endpoints.

5. Player and SDK foundation
   - Build the iframe app for locked, checkout, restore purchase, loading, playback, expired, and error states.
   - Build the SDK loader for auto-sizing, iframe creation, and safe `postMessage` events.
   - Add iframe fallback documentation.

6. Dust Wave site integration
   - Add the Eleventy protected-video snippet/shortcode that emits the same embed used externally.
   - Add player JavaScript and SCSS states for locked, loading, unlocked, expired, and error views.
   - Add one hidden or draft pilot page using the new protected player.

7. External embed pilot
   - Register one controlled external test domain.
   - Verify DNS/file-based domain ownership.
   - Confirm the embed works outside dustwave.xyz without third-party cookies.
   - Confirm unverified domains cannot frame or initialize the player.

8. Payment and entitlement hardening
   - Test Checkout redirect, webhook delivery, repeated webhooks, failed payments, refunds, subscription cancellation, and expired rental access.
   - Add customer support flows for resending access links and revoking/refunding access.

9. Playback hardening
   - Confirm no public direct video file appears in page source.
   - Confirm signed playback tokens expire and cannot be reused after expiry.
   - Confirm no download token is granted.
   - Confirm playback fails from unauthorized origins.
   - Confirm the parent page cannot read playback tokens from the iframe.
   - Add watermark overlay and abuse logging.

10. Launch readiness
   - Add captions, poster image, metadata, and accessibility pass.
   - Run Stripe test-mode checklist, then switch to live keys.
   - Deploy player repo and GitHub Pages changes.
   - Test on desktop Chrome, Safari, Firefox, iOS Safari, and Android Chrome.
   - Document operational steps for uploading a film, creating a Stripe Price, adding D1 catalog data, verifying a domain, creating an embed, and embedding the player.

#### Acceptance criteria

- A visitor can pay through Stripe Checkout and return to Dust Wave to watch the paid video without manual intervention.
- A visitor can pay through Stripe Checkout from an approved external embed and return to that embedded player without manual intervention.
- An unpaid visitor cannot request a playback token or load the paid stream.
- A paid viewer receives only short-lived signed playback data.
- The static site does not expose raw paid video URLs.
- External parent pages do not receive raw Stream UIDs, signed playback tokens, or entitlement internals.
- Download links are not available for paid videos.
- A verified third-party domain can embed the player with a script tag or iframe.
- An unverified domain cannot frame or initialize the paid player.
- Refunds, failed subscription payments, and cancellations remove or expire access.
- Customer Portal works for billing self-service.
- Webhook processing is idempotent.
- The implementation has a written limitation note: it deters ripping and casual capture, but cannot guarantee impossible screen recording prevention.

#### Open questions

- Is the first product a rental, permanent purchase, monthly membership, or festival-style timed screening?
- Do viewers need accounts, or is email plus secure magic-link/session access enough?
- Should external embeds be open self-serve, manual approval, or partner-only at launch?
- What should the public player hostname and separate repo name be?
- Should publishers get theme controls, or should every embed preserve one Dust Wave-controlled look?
- Are there contractual DRM requirements for any current or planned films?
- Should original masters live only in Cloudflare Stream, or should archival masters also live in R2/private storage?
- What refund policy and support workflow should be published before launch?

#### References checked

- Cloudflare Stream signed URLs: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
- Cloudflare Stream player embeds: https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/
- Cloudflare Stream Player API: https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/using-the-player-api/
- Cloudflare Stream downloads and `downloadable` tokens: https://developers.cloudflare.com/stream/viewing-videos/download-videos/
- Cloudflare Stream Worker binding: https://developers.cloudflare.com/stream/manage-video-library/bindings/
- Cloudflare Workers best practices: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Cloudflare Worker security headers: https://developers.cloudflare.com/workers/examples/security-headers/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Stripe Checkout subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Stripe Checkout iframe redirect caveat: https://docs.stripe.com/payments/checkout/pricing-table
- Stripe Customer Portal: https://docs.stripe.com/customer-management
- Stripe webhooks: https://docs.stripe.com/webhooks
- MDN third-party cookies: https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies
- MDN Storage Access API: https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API/Using
