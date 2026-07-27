import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const [
  head,
  show,
  admin,
  member,
  adminLayout,
  memberLayout,
  tracer,
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
  readFile(new URL("package.json", repositoryRoot), "utf8"),
  readFile(new URL(".gitignore", repositoryRoot), "utf8")
]);

assert.match(
  head,
  /{% if not disableLegacyMediaPreconnects %}[\s\S]+stitcher\.simplecastaudio\.com[\s\S]+{% endif %}/,
  "legacy media preconnects must remain suppressible on Podcast surfaces"
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
  ["src/js/podcast-admin.js", 300_000],
  ["src/js/podcast-admin-analytics.js", 20_000],
  ["src/js/podcast-member.js", 30_000],
  ["src/js/podcast-checkout.js", 25_000]
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
