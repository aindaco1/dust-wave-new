import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const [navbarBrand, homepage, gulpfile, compactLogo, legacyLogo] = await Promise.all([
  readFile(
    new URL("src/_includes/snippets/navbar-brand.njk", repositoryRoot),
    "utf8"
  ),
  readFile(new URL("src/index.njk", repositoryRoot), "utf8"),
  readFile(new URL("gulpfile.js", repositoryRoot), "utf8"),
  stat(new URL("src/img/favicon/favicon.png", repositoryRoot)),
  stat(new URL("src/img/favicon/dust-wave-square.png", repositoryRoot))
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

console.log("Site performance contract validation passed.");
