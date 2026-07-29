import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const [
  navbarBrand,
  homepage,
  gulpfile,
  compactLogo,
  legacyLogo,
  assetData,
  packageSource,
  localAssetTemplates
] = await Promise.all([
  readFile(
    new URL("src/_includes/snippets/navbar-brand.njk", repositoryRoot),
    "utf8"
  ),
  readFile(new URL("src/index.njk", repositoryRoot), "utf8"),
  readFile(new URL("gulpfile.js", repositoryRoot), "utf8"),
  stat(new URL("src/img/favicon/favicon.png", repositoryRoot)),
  stat(new URL("src/img/favicon/dust-wave-square.png", repositoryRoot)),
  readFile(new URL("src/_data/assets.js", repositoryRoot), "utf8"),
  readFile(new URL("package.json", repositoryRoot), "utf8"),
  Promise.all([
    "src/_includes/snippets/head.njk",
    "src/_includes/snippets/footer1.njk",
    "src/_includes/layouts/podcast-admin.njk",
    "src/_includes/layouts/podcast-member.njk",
    "src/news/podcasts/episode.njk",
    "src/news/podcasts/embed.njk",
    "src/podcasts/show.njk"
  ].map((path) => readFile(new URL(path, repositoryRoot), "utf8")))
]);

assert.match(
  navbarBrand,
  /<img src="\/img\/favicon\/favicon\.png"[^>]+height="35"[^>]+width="35"/,
  "the global navigation must use the compact, explicitly sized logo"
);
assert.doesNotMatch(
  navbarBrand,
  /dust-wave-square\.png/,
  "the global navigation must not download the full-resolution logo"
);
assert.match(
  homepage,
  /class="u-photo"[\s\S]+src="https:\/\/dustwave\.xyz\/img\/favicon\/favicon\.png"[\s\S]+width="96"[\s\S]+height="96"[\s\S]+loading="lazy"[\s\S]+decoding="async"/,
  "the hidden IndieWeb identity image must use the compact, lazy logo"
);
assert(
  compactLogo.size <= 10_000,
  `the compact global logo exceeds its 10 KB budget (${compactLogo.size})`
);
assert(
  compactLogo.size * 10 < legacyLogo.size,
  "the compact global logo should remain at least 10x smaller than the source artwork"
);
assert.match(
  gulpfile,
  /src\(`\$\{DIR\.dist\}\/\*\*\/\*\.html`\)/,
  "production HTML minification must include nested routes"
);
assert.match(
  gulpfile,
  /css: `\/css\/theme\.min\.css\?v=\$\{assetVersion\}`/,
  "the production stylesheet replacement must retain the release cache key"
);
assert.match(
  assetData,
  /process\.env\.DUST_WAVE_ASSET_VERSION/,
  "deployed asset cache keys must accept the exact build revision"
);
assert.match(
  assetData,
  /process\.env\.GITHUB_SHA/,
  "GitHub builds must use the exact source revision without workflow duplication"
);
assert.match(
  assetData,
  /\^\[A-Za-z0-9\._-\]\{1,64\}\$/,
  "build revision cache keys must be length-bounded and character-allowlisted"
);
assert.match(
  assetData,
  /: packageVersion/,
  "local asset cache keys must fall back to the package release version"
);
assert.match(
  gulpfile,
  /require\('\.\/src\/_data\/assets\.js'\)/,
  "Eleventy and the production CSS injector must share one asset version source"
);
assert.equal(
  JSON.parse(packageSource).version,
  "1.3.0",
  "the release asset version must remain aligned with the website package"
);
const localEntryUrls = localAssetTemplates
  .flatMap((template) => [
    ...template.matchAll(/(?:src|href)="\/(?:js|css)\/[^"]+"/g)
  ])
  .map(([url]) => url);
assert(localEntryUrls.length > 0, "local entry assets must be present");
for (const url of localEntryUrls) {
  assert.match(
    url,
    /\?v=\{\{ assets\.version \| default\('dev'\) \}\}/,
    `local entry asset must use the release cache key: ${url}`
  );
}

console.log("Site performance contract validation passed.");
