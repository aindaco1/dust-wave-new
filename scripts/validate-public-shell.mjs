import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [footer, icons, styles, notFound, navbar, navbarContent, sticky] = await Promise.all([
  readFile(new URL("../src/_includes/snippets/footer1.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/social-icon.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/scss/themes/base/_style-theme.scss", import.meta.url), "utf8"),
  readFile(new URL("../src/404.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/navbar1.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/navbar-content.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/sticky.njk", import.meta.url), "utf8")
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

assert.match(navbar, /site-navbar__inner/);
assert.match(navbar, /site-navbar__brand/);
assert.match(navbarContent, /site-navbar__content/);
assert.match(navbarContent, /site-navbar__links/);
assert.match(
  styles,
  /@media \(min-width:\s*992px\)[\s\S]*\.site-navbar__inner\s*\{[\s\S]*justify-content:\s*center !important;/
);
assert.match(styles, /\.site-navbar__brand\s*\{[\s\S]*position:\s*absolute;/);

assert.match(sticky, /<a[\s\S]*id="sticky-button"/);
assert.doesNotMatch(sticky, /<button/);
assert.match(styles, /#sticky-button\s*\{[\s\S]*display:\s*inline-flex;/);
assert.match(styles, /#sticky-button\s*\{[\s\S]*border:\s*1px solid/);
assert.match(styles, /#sticky-button\s*\{[\s\S]*padding:\s*\.6rem \.8rem;/);
assert.match(styles, /#sticky-button\s*\{[\s\S]*text-decoration:\s*none;/);
assert.match(
  styles,
  /@media screen and \(max-width:\s*1024px\)[\s\S]*width:\s*fit-content;/
);
assert.match(styles, /left:\s*min\(80%,\s*var\(--sticky-safe-left\)\)/);
assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)/);

console.log("Public shell validation passed.");
