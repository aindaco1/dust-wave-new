import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  versionModuleImports
} from "./version-module-imports.mjs";

const repositoryRoot = new URL("../", import.meta.url);
const [
  head,
  show,
  admin,
  member,
  adminLayout,
  memberLayout,
  tracer,
  traceContract,
  navigationContract,
  stagingBuild,
  webpBuild,
  publicStyles,
  packageJson,
  gitignore
] = await Promise.all([
  readFile(new URL("src/_includes/snippets/head.njk", repositoryRoot), "utf8"),
  readFile(new URL("src/podcasts/show.njk", repositoryRoot), "utf8"),
  readFile(new URL("src/admin/podcasts/index.njk", repositoryRoot), "utf8"),
  readFile(new URL("src/podcasts/account.njk", repositoryRoot), "utf8"),
  readFile(
    new URL("src/_includes/layouts/podcast-admin.njk", repositoryRoot),
    "utf8"
  ),
  readFile(
    new URL("src/_includes/layouts/podcast-member.njk", repositoryRoot),
    "utf8"
  ),
  readFile(
    new URL("scripts/trace-podcast-admin-performance.mjs", repositoryRoot),
    "utf8"
  ),
  readFile(
    new URL("scripts/lib/podcast-admin-trace-contract.mjs", repositoryRoot),
    "utf8"
  ),
  readFile(
    new URL(
      "scripts/lib/podcast-admin-cdp-navigation.mjs",
      repositoryRoot
    ),
    "utf8"
  ),
  readFile(
    new URL("scripts/build-podcast-staging.mjs", repositoryRoot),
    "utf8"
  ),
  readFile(new URL("webp.mjs", repositoryRoot), "utf8"),
  readFile(
    new URL("src/scss/themes/base/_style-theme.scss", repositoryRoot),
    "utf8"
  ),
  readFile(new URL("package.json", repositoryRoot), "utf8"),
  readFile(new URL(".gitignore", repositoryRoot), "utf8")
]);

assert.match(
  head,
  /{% if not disableLegacyMediaPreconnects %}[\s\S]+stitcher\.simplecastaudio\.com[\s\S]+{% endif %}/,
  "legacy media preconnects must remain suppressible on Podcast surfaces"
);
assert.match(
  head,
  /{% if not disableFontAwesome %}[\s\S]+cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.2\/css\/all\.min\.css[\s\S]+{% endif %}/,
  "Font Awesome must remain suppressible on icon-free performance surfaces"
);
assert.match(
  head,
  /{% if not disableTypekit %}[\s\S]+use\.typekit\.net\/hoj2yet\.css[\s\S]+{% endif %}/,
  "Typekit must remain suppressible on pages that use only system fonts"
);
assert.match(
  admin,
  /disableFontAwesome: true/,
  "Podcast Admin must not block first paint on its unused icon font"
);
assert.match(
  admin,
  /customFont: true/,
  "Podcast Admin must load the existing first-party Inter font bundle"
);
assert.doesNotMatch(
  admin,
  /disableTypekit: true/,
  "Podcast Admin must retain the licensed Gambado display font used by its headings"
);
assert.match(
  member,
  /disableFontAwesome: true/,
  "Podcast member auth must not load its unused external icon font"
);
assert.match(
  member,
  /disableTypekit: true/,
  "Podcast member auth must not load its unused external brand font"
);
assert.match(
  memberLayout,
  /snippets\/podcast-auth-footer\.njk/,
  "Podcast member auth must use the lightweight bilingual auth footer"
);
assert.doesNotMatch(
  memberLayout,
  /snippets\/footer1\.njk/,
  "Podcast member auth must not load the public footer's legacy scripts"
);
assert.match(
  admin,
  /class="podcast-auth-turnstile podcast-admin__turnstile"/,
  "Podcast Admin must reserve the responsive Turnstile footprint"
);
assert.match(
  member,
  /class="podcast-auth-turnstile podcast-member__turnstile"/,
  "Podcast member auth must reserve the responsive Turnstile footprint"
);
for (const [name, template] of [
  ["show", show],
  ["admin", admin],
  ["member", member]
]) {
  assert.match(
    template,
    /disableLegacyMediaPreconnects: true/,
    `${name} must not establish unused legacy media connections`
  );
}

assert.match(
  show,
  /srcset="{{ show\.wordmarkWebpSmall }} 640w, {{ show\.wordmarkWebp }} 1280w, {{ show\.wordmarkWebpLarge }} 2560w"/,
  "show wordmark must use responsive generated WebPs"
);
assert.match(
  show,
  /srcset="{{ show\.artworkWebpSmall }} 256w, {{ show\.artworkWebp }} 505w"/,
  "show artwork must use responsive generated WebPs"
);
assert.match(
  show,
  /class="podcast-show__artwork"[\s\S]+width="505"[\s\S]+height="505"[\s\S]+fetchpriority="high"/,
  "show artwork must reserve layout space and prioritize the likely LCP image"
);
assert.doesNotMatch(
  show.match(/<img[\s\S]+?class="podcast-show__artwork"[\s\S]+?>/)?.[0] ?? "",
  /loading="lazy"/,
  "above-the-fold artwork must not be lazy loaded"
);
assert.match(
  publicStyles,
  /\.podcast-show__actions \.btn\s*\{[\s\S]{0,180}min-height:\s*44px/,
  "public show actions must retain 44px targets"
);
assert.match(
  publicStyles,
  /\.podcast-show__actions \.btn-light\s*\{[\s\S]{0,100}color:\s*#151515 !important/,
  "the light hero action must override the legacy white-link rule"
);
assert.match(
  publicStyles,
  /\.podcast-tier-card__label\s*\{[\s\S]{0,100}color:\s*#8c170f/,
  "tier labels must retain AA contrast on the light card"
);
assert.match(
  publicStyles,
  /\.podcast-tier-card--premium a\s*\{[\s\S]{0,120}color:\s*#8c170f !important/,
  "the account link must override the legacy white-link rule"
);

for (const [name, layout] of [
  ["admin", adminLayout],
  ["member", memberLayout]
]) {
  assert.match(
    layout,
    /{% if podcast(?:Admin|Member)\.turnstileSiteKey %}[\s\S]+<link rel="preconnect" href="https:\/\/challenges\.cloudflare\.com" crossorigin>/,
    `${name} must preconnect only when its Turnstile script will load`
  );
}

const scriptBudgets = new Map([
  ["src/js/podcast-admin.js", 304_200],
  ["src/js/podcast-admin-episode-context.js", 5_000],
  ["src/js/podcast-admin-episode-context-setup.js", 3_000],
  ["src/js/podcast-admin-show-context.js", 2_000],
  ["src/js/podcast-admin-show-settings.js", 4_000],
  ["src/js/podcast-admin-show-prices.js", 8_000],
  ["src/js/podcast-admin-transcript-review.js", 12_000],
  ["src/js/podcast-admin-transcript-label-review.js", 2_000],
  ["src/js/podcast-admin-transcript-diagnostic-navigation.js", 7_000],
  ["src/js/podcast-admin-transcript-speaker-range.js", 7_000],
  ["src/js/podcast-admin-transcript-import.js", 12_000],
  ["src/js/podcast-admin-transcript-search.js", 7_000],
  ["src/js/podcast-admin-unsaved-changes.js", 1_000],
  ["src/js/podcast-admin-unsaved-changes-core.js", 5_000],
  ["src/js/podcast-admin-dirty-controls.js", 1_000],
  ["src/js/podcast-admin-dirty-controls-core.js", 1_000],
  ["src/js/podcast-admin-text.js", 1_000],
  ["src/js/podcast-admin-constants.js", 1_000],
  ["src/js/podcast-admin-autopilot.js", 4_000],
  ["src/js/podcast-admin-autopilot-core.js", 5_000],
  ["src/js/podcast-admin-publish-workflow.js", 8_500],
  ["src/js/podcast-admin-publish-workflow-core.js", 5_000],
  ["src/js/podcast-admin-workflow-priority.js", 3_000],
  ["src/js/podcast-admin-progressive-sections.js", 5_000],
  ["src/js/podcast-admin-workspaces.js", 2_500],
  ["src/js/podcast-admin-tool-disclosure.js", 3_000],
  ["src/js/podcast-admin-publication.js", 5_000],
  ["src/js/podcast-admin-publication-security.js", 1_000],
  ["src/js/podcast-admin-request-security.js", 1_000],
  ["src/js/podcast-admin-workflow-navigation.js", 3_000],
  ["src/js/podcast-admin-workflow-controller.js", 1_000],
  ["src/js/podcast-admin-deep-link.js", 3_500],
  ["src/js/podcast-admin-workflow-target.js", 3_500],
  ["src/js/podcast-admin-clip-publications.js", 10_000],
  ["src/js/podcast-admin-distribution-certification.js", 5_000],
  ["src/js/podcast-admin-catalog.js", 8_000],
  ["src/js/podcast-admin-episode-editor.js", 8_000],
  ["src/js/podcast-admin-show-notes.js", 9_000],
  ["src/js/podcast-admin-show-notes-contract.js", 5_000],
  ["src/js/podcast-admin-chapter-draft.js", 9_000],
  ["src/js/podcast-admin-chapter-draft-contract.js", 5_000],
  ["src/js/podcast-admin-clip-draft.js", 12_000],
  ["src/js/podcast-admin-clip-draft-contract.js", 6_000],
  ["src/js/podcast-admin-clip-preview.js", 5_000],
  ["src/js/podcast-admin-download-actions.js", 3_000],
  ["src/js/podcast-admin-episode-youtube.js", 10_000],
  ["src/js/podcast-admin-episode-youtube-requests.js", 3_500],
  ["src/js/podcast-admin-youtube-audio-renditions.js", 9_000],
  ["src/js/podcast-admin-delivery-audio.js", 14_000],
  ["src/js/podcast-admin-delivery-audio-approval.js", 2_000],
  ["src/js/podcast-admin-retriable-operation.js", 2_000],
  ["src/js/podcast-admin-analytics.js", 20_000],
  ["src/js/podcast-admin-launch-lab.js", 12_000],
  ["src/js/podcast-admin-rss-import.js", 35_000],
  ["src/js/podcast-admin-rss-reconciliation.js", 18_000],
  ["src/js/podcast-admin-rss-cutover.js", 9_000],
  ["src/js/podcast-admin-rss-activation-approval.js", 6_000],
  ["src/js/podcast-member.js", 30_000],
  ["src/js/podcast-checkout.js", 25_000],
  ["src/js/podcast-clips.js", 15_000]
]);
for (const [relativePath, maximumBytes] of scriptBudgets) {
  const { size } = await stat(new URL(relativePath, repositoryRoot));
  assert(
    size <= maximumBytes,
    `${relativePath} exceeds its ${maximumBytes}-byte unminified budget (${size})`
  );
}

assert.match(
  packageJson,
  /"perf:podcast-admin:trace": "node scripts\/trace-podcast-admin-performance\.mjs"/,
  "Podcast Admin must expose its repeatable Chrome trace command"
);
assert.match(
  packageJson,
  /"build:podcast-staging": "node scripts\/build-podcast-staging\.mjs"/,
  "the isolated Podcast staging artifact must have a repeatable build command"
);
assert.match(
  packageJson,
  /gulp prod-copy && npm run version:module-imports && gulp inject-min-css/,
  "production builds must version local module edges before HTML finalization"
);
const moduleRevision = "a".repeat(40);
assert.equal(
  versionModuleImports(
    [
      'import { one } from "./one.js";',
      'const two = import("./two.js");',
      'import "./three.js";',
      'import { fixed } from "./fixed.js?v=0.7.0";'
    ].join("\n"),
    moduleRevision
  ),
  [
    `import { one } from "./one.js?v=${moduleRevision}";`,
    `const two = import("./two.js?v=${moduleRevision}");`,
    `import "./three.js?v=${moduleRevision}";`,
    'import { fixed } from "./fixed.js?v=0.7.0";'
  ].join("\n"),
  "local static, dynamic, and side-effect imports must share one revision"
);
assert.match(
  stagingBuild,
  /https:\/\/dust-wave-podcast-staging\.jogo\.workers\.dev/,
  "the staging build must target only the isolated Podcast Worker"
);
assert.match(
  stagingBuild,
  /git", \["rev-parse", "--verify", "HEAD"\]/,
  "local staging builds must resolve their exact checkout revision"
);
assert.match(
  stagingBuild,
  /DUST_WAVE_ASSET_VERSION: assetRevision/,
  "staging builds must key browser assets by the exact source revision"
);
assert.match(
  stagingBuild,
  /spawnSync\(npmCommand, \["run", "build:ci"\]/,
  "staging must reuse the production CI asset pipeline"
);
assert.match(
  stagingBuild,
  /PODCAST_STAGING_BUILD: "true"/,
  "staging must explicitly authorize generated responsive images"
);
assert.match(
  webpBuild,
  /process\.env\.GITHUB_ACTIONS === 'true'[\s\S]+process\.env\.PODCAST_STAGING_BUILD === 'true'/,
  "WebP generation must remain restricted to CI or the isolated staging build"
);
assert.match(
  stagingBuild,
  /\(\?:\[A-Fa-f0-9\]\{40\}\|\[A-Fa-f0-9\]\{64\}\)/,
  "staging asset revisions must be exact Git SHA-1 or SHA-256 values"
);
for (const environmentName of [
  "PODCAST_ADMIN_API_ORIGIN",
  "PODCAST_MEMBER_API_ORIGIN",
  "PODCAST_PUBLIC_API_ORIGIN"
]) {
  assert.match(
    stagingBuild,
    new RegExp(`${environmentName}: STAGING_API_ORIGIN`),
    `${environmentName} must be pinned by the isolated staging build`
  );
}
for (const environmentName of [
  "PODCAST_CHECKOUT_TURNSTILE_SITE_KEY",
  "PODCAST_MEMBER_TURNSTILE_SITE_KEY"
]) {
  assert.match(
    stagingBuild,
    new RegExp(`${environmentName}: turnstileSiteKey`),
    `${environmentName} must use the explicit staging Turnstile site key`
  );
}
assert.match(
  stagingBuild,
  /PODCAST_ADMIN_TURNSTILE_SITE_KEY: ""/,
  "isolated staging must omit only the Admin Turnstile widget"
);
assert.doesNotMatch(
  stagingBuild,
  /feeds\.dustwave\.xyz|media\.dustwave\.xyz/,
  "the isolated staging artifact must not depend on reserved production DNS"
);
assert.match(
  tracer,
  /https:\/\/dust-wave-website-staging\.pages\.dev\/admin\/podcasts\//,
  "performance traces must default to isolated staging"
);
assert.match(
  tracer,
  /mkdtemp\([\s\S]+dust-wave-podcast-trace-/,
  "performance traces must use a temporary browser profile"
);
assert.match(
  tracer,
  /--disable-extensions/,
  "performance traces must not load personal browser extensions"
);
assert.match(
  tracer,
  /Emulation\.setDeviceMetricsOverride/,
  "performance traces must request the exact CSS viewport"
);
assert.match(
  tracer,
  /observed\?\.innerWidth !== viewport\.width[\s\S]+observed\?\.innerHeight !== viewport\.height[\s\S]+observed\?\.scrollWidth > viewport\.width/,
  "performance traces must verify the exact CSS viewport and horizontal fit"
);
assert.match(
  tracer,
  /ADMIN_TABS = new Set\(\[\.\.\.PODCAST_ADMIN_TRACE_TABS, "all"\]\)/,
  "performance traces must support a bounded admin-tab fixture"
);
assert.match(
  tracer,
  /dustwave-podcast-admin-tab/,
  "performance traces must seed their requested admin tab"
);
assert.match(
  tracer,
  /observed\?\.activeTab !== adminTab/,
  "performance traces must verify their requested admin tab"
);
assert.match(
  tracer,
  /PODCAST_ADMIN_TRACE_TABS[\s\S]+adminTab === "all"[\s\S]+assertPodcastAdminTabMatrixContract\(tabMatrix\)/,
  "performance traces must audit all six admin workspaces in one session"
);
assert.match(
  tracer,
  /ADMIN_GROUPS[\s\S]+data-podcast-workspace-group[\s\S]+activeGroups[\s\S]+adminGroup/,
  "performance traces must open and verify contextual admin workspaces"
);
assert.match(
  tracer,
  /securitypolicyviolation/,
  "performance traces must listen for CSP violations before navigation"
);
assert.match(
  tracer,
  /Page\.addScriptToEvaluateOnNewDocument[\s\S]+source: RUNTIME_PROBE/,
  "performance traces must install the CSP and CLS probes before navigation"
);
assert.match(
  tracer,
  /securityPolicyViolations[\s\S]+enforcedViolations\.length > 0/,
  "performance traces must fail closed on enforced CSP violations"
);
assert.match(
  tracer,
  /LAYOUT_PROBE[\s\S]+viewportOverflow[\s\S]+Clipped elements/,
  "performance traces must reject clipped descendants outside intentional scrollers"
);
assert.match(
  tracer,
  /distribution:[\s\S]+guidancePresent[\s\S]+actionableDirectoryCount[\s\S]+openDirectoryCount[\s\S]+summaryCount/,
  "Distribution traces must observe the progressive provider interaction contract"
);
assert.match(
  tracer,
  /assertLayoutObservation\(observed, \{ adminGroup, adminTab, viewport \}\)/,
  "performance traces must enforce the selected admin interaction contract"
);
assert.match(
  traceContract,
  /EXPECTED_OPEN_GROUPS[\s\S]+episodes: \[\][\s\S]+audience: \["analytics"\][\s\S]+monetization: \["sponsors"\][\s\S]+settings: \[\]/,
  "all-tab traces must preserve concise progressive-disclosure defaults"
);
assert.match(
  traceContract,
  /assertPodcastAdminTabMatrixContract[\s\S]+every workspace once in[\s\S]+requires an authenticated session[\s\S]+progressively disclose only their/,
  "the admin matrix must fail closed on incomplete, signed-out, or overwhelming workspaces"
);
assert.match(
  traceContract,
  /guidanceOpen !== false[\s\S]+directoryCount < MINIMUM_LAUNCH_DIRECTORIES[\s\S]+actionableDirectoryCount > 0 \? 1 : 0[\s\S]+openDirectoryCount !== expectedOpenCount[\s\S]+summaryCount !== distribution\.directoryCount/,
  "Distribution traces must fail closed on guidance, directory, and proof-summary regressions"
);
assert.match(
  traceContract,
  /Distribution trace requires an authenticated Podcast admin session/,
  "selected Distribution traces must reject signed-out shells"
);
assert.match(
  tracer,
  /PerformanceObserver[\s\S]+layout-shift[\s\S]+MAX_AUTHENTICATED_CLS/,
  "performance traces must enforce the good CLS threshold for authenticated admin sessions"
);
assert.match(
  tracer,
  /Tracing\.start[\s\S]+navigatePodcastAdminTrace[\s\S]+Tracing\.end[\s\S]+IO\.read/,
  "performance traces must capture navigation through a bounded CDP stream"
);
assert.match(
  navigationContract,
  /attemptTimeoutMs = 5_000[\s\S]+Page\.navigate[\s\S]+NAVIGATION_TIMEOUT_PATTERN[\s\S]+Page\.navigate/,
  "performance navigation must be bounded and retry one transient CDP timeout"
);
assert.match(
  tracer,
  /Trace isolation check failed[\s\S]+await rm\(outputPath, \{ force: true \}\)/,
  "performance traces must fail closed when browser isolation is violated"
);
assert.doesNotMatch(
  tracer,
  /--no-sandbox/,
  "performance traces must retain the Chrome sandbox"
);
assert.match(
  gitignore,
  /^\.artifacts\/$/m,
  "performance traces must never be committed"
);

console.log("Podcast performance contract validation passed.");
