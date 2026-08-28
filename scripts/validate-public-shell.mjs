import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  footer,
  siteFooter,
  icons,
  styles,
  notFound,
  navbar,
  navbarContent,
  sticky,
  adminLayout,
  memberLayout,
  socialLanding
] = await Promise.all([
  readFile(new URL("../src/_includes/snippets/footer1.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/site-footer.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/social-icon.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/scss/themes/base/_style-theme.scss", import.meta.url), "utf8"),
  readFile(new URL("../src/404.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/navbar1.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/navbar-content.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/sticky.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/layouts/podcast-admin.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/layouts/podcast-member.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/social.njk", import.meta.url), "utf8")
]);

assert.match(footer, /snippets\/site-footer\.njk/);
assert.match(siteFooter, /from "snippets\/social-icon\.njk" import socialIcon/);
assert.doesNotMatch(siteFooter, /href="\/social\/(?:privacy|terms)"/);
assert.match(socialLanding, /permalink: \/social\/index\.html/);
assert.match(socialLanding, /href="\/social\/privacy"/);
assert.match(socialLanding, /href="\/social\/terms"/);
assert.doesNotMatch(siteFooter, /fa-brands|font-awesome/i);
assert.equal(
  (siteFooter.match(/class="site-footer__item/g) || []).length,
  3,
  "The shared footer must keep three top-level items."
);
assert.doesNotMatch(siteFooter, /site-footer__updates|footer\.newsletter/);

for (const [name, layout] of [
  ["Podcast Admin", adminLayout],
  ["Podcast member account", memberLayout]
]) {
  assert.match(
    layout,
    /snippets\/site-footer\.njk/,
    `${name} must render the same shared site footer`
  );
}

for (const name of ["instagram", "youtube", "tiktok", "bluesky", "mastodon"]) {
  assert.match(siteFooter, new RegExp(`socialIcon\\("${name}"\\)`));
  assert.match(icons, new RegExp(`name == "${name}"`));
}

assert.match(styles, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content\s+minmax\(0,\s*1fr\);[\s\S]*margin-inline:\s*auto;[\s\S]*padding-inline:\s*clamp\(1rem,\s*4vw,\s*2rem\);[\s\S]*width:\s*100% !important;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*\.footer-social\s*\{[\s\S]*flex-wrap:\s*nowrap;[\s\S]*justify-self:\s*center;[\s\S]*max-width:\s*none;/
);
assert.match(styles, /\.footer-sep\s*\{[\s\S]*display:\s*none;/);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*\.footer-social a\s*\{[\s\S]*min-height:\s*1\.5rem;[\s\S]*min-width:\s*1\.5rem;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*\.site-footer__social-icon\s*\{[\s\S]*height:\s*1rem;[\s\S]*width:\s*1rem;/
);
assert.match(styles, /\.site-footer__copyright\s*\{[\s\S]*white-space:\s*nowrap;/);
assert.match(styles, /\.site-footer__language\s*\{[\s\S]*justify-content:\s*flex-end;[\s\S]*width:\s*100%;/);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*\.site-footer__lang-switcher\s*\{[\s\S]*justify-content:\s*flex-end;[\s\S]*width:\s*100%;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*400px\)[\s\S]*#footer-items-column\s*\{[\s\S]*font-size:\s*\.8rem;[\s\S]*grid-template-columns:\s*1fr;[\s\S]*row-gap:\s*\.75rem;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*400px\)[\s\S]*\.site-footer__copyright,[\s\S]*\.site-footer__language\s*\{[\s\S]*justify-content:\s*center;[\s\S]*text-align:\s*center;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*400px\)[\s\S]*\.site-footer__lang-switcher\s*\{[\s\S]*justify-content:\s*center;/
);
assert.match(styles, /\.site-footer__language\s*\{[\s\S]*justify-content:\s*flex-end/);
assert.match(
  styles,
  /\.footer-social a\s*\{[\s\S]*min-height:\s*1\.5rem;[\s\S]*min-width:\s*1\.5rem;/
);
assert.match(navbar, /site-navbar__inner/);
assert.match(navbar, /site-navbar__brand/);
assert.match(navbar, /data-site-nav-toggle/);
assert.doesNotMatch(navbar, /data-bs-toggle/);
assert.match(navbarContent, /site-navbar__content/);
assert.match(navbarContent, /site-navbar__links/);
assert.match(navbarContent, /data-site-subnav/);
assert.match(navbarContent, /data-site-subnav-toggle/);
assert.match(navbarContent, /localizedUrl\(language, 'newsletter', '\/newsletter\.html'\)/);
assert.match(styles, /\.site-nav-group__menu/);
assert.match(styles, /\.site-nav-group\.is-open \.site-nav-group__menu/);
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
