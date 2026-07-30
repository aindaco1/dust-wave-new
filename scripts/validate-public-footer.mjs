import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [footer, icons, styles, notFound] = await Promise.all([
  readFile(new URL("../src/_includes/snippets/footer1.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/social-icon.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/scss/themes/base/_style-theme.scss", import.meta.url), "utf8"),
  readFile(new URL("../src/404.njk", import.meta.url), "utf8")
]);

assert.match(footer, /from "snippets\/social-icon\.njk" import socialIcon/);
assert.doesNotMatch(footer, /fa-brands|font-awesome/i);
assert.equal(
  (footer.match(/class="site-footer__item/g) || []).length,
  4,
  "The public footer must keep four equally spaced top-level items."
);

for (const name of ["instagram", "youtube", "tiktok", "bluesky", "mastodon"]) {
  assert.match(footer, new RegExp(`socialIcon\\("${name}"\\)`));
  assert.match(icons, new RegExp(`name == "${name}"`));
}

assert.match(styles, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
);
assert.match(styles, /\.site-footer__language\s*\{[\s\S]*justify-content:\s*flex-end/);
assert.match(
  styles,
  /\.footer-social a\s*\{[\s\S]*min-height:\s*1\.5rem;[\s\S]*min-width:\s*1\.5rem;/
);
assert.match(notFound, /^disableFontAwesome:\s*true$/m);

console.log("Public footer validation passed.");
