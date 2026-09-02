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
  socialLanding,
  socialPrivacy,
  socialTerms,
  socialPageRenderer,
  i18nConfigRaw,
  newsLayout,
  postLayout,
  entryNavigation,
  languageSwitcher,
  brandedContent
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
  readFile(new URL("../src/social.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/social-privacy.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/social-terms.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/social-page.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_data/i18n/config.json", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/layouts/new.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/layouts/post.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/entryprevnext.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/_includes/snippets/language-switcher.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/branded-content.njk", import.meta.url), "utf8")
]);
const { default: socialPages } = await import("../src/_data/socialPages.js");
const i18nConfig = JSON.parse(i18nConfigRaw);

assert.match(footer, /snippets\/site-footer\.njk/);
assert.match(siteFooter, /from "snippets\/social-icon\.njk" import socialIcon/);
assert.doesNotMatch(siteFooter, /href="\/social\/(?:privacy|terms)"/);
for (const [template, key] of [
  [socialLanding, "socialHome"],
  [socialPrivacy, "socialPrivacy"],
  [socialTerms, "socialTerms"]
]) {
  assert.match(template, new RegExp(`translationKey: ${key}`));
  assert.match(template, /data: i18n\.config\.supportedLangs/);
  assert.match(template, /snippets\/social-page\.njk/);
}
assert.deepEqual(i18nConfig.pages.socialHome, { en: "/social/", es: "/es/social/" });
assert.deepEqual(i18nConfig.pages.socialPrivacy, { en: "/social/privacy/", es: "/es/social/privacy/" });
assert.deepEqual(i18nConfig.pages.socialTerms, { en: "/social/terms/", es: "/es/social/terms/" });
assert.match(socialPages.home.en.content, /href="\/social\/privacy\/"/);
assert.match(socialPages.home.en.content, /href="\/social\/terms\/"/);
assert.match(socialPages.home.es.content, /href="\/es\/social\/privacy\/"/);
assert.match(socialPages.home.es.content, /href="\/es\/social\/terms\/"/);
assert.match(socialPageRenderer, /socialPage\.content \| safe/);
assert.doesNotMatch(siteFooter, /fa-brands|font-awesome/i);
assert.equal(
  (siteFooter.match(/class="site-footer__item/g) || []).length,
  3,
  "The shared footer must keep three top-level items."
);
assert.doesNotMatch(siteFooter, /site-footer__updates|footer\.newsletter/);
assert.match(siteFooter, /class="site-footer__brand-mark"/);
assert.match(siteFooter, /src="\/img\/favicon\/favicon\.png"/);
assert.match(
  languageSwitcher,
  /\{% if not pagePaths %\}[\s\S]*en: page\.url if currentLanguage == "en" else i18n\.config\.pages\.home\.en,[\s\S]*es: page\.url if currentLanguage == "es" else i18n\.config\.pages\.home\.es/
);

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
  /@media only screen and \(max-width:\s*480px\)[\s\S]*#footer-items-column\s*\{[\s\S]*font-size:\s*\.72rem;[\s\S]*grid-template-columns:\s*max-content\s+minmax\(0,\s*1fr\)\s+max-content;[\s\S]*padding-inline:\s*clamp\(\.75rem,\s*4vw,\s*1rem\);[\s\S]*row-gap:\s*0;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*\.site-footer__copyright\s*\{[\s\S]*font-size:\s*\.66rem;[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*1;[\s\S]*justify-content:\s*flex-start;/
);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*\.footer-social\s*\{[\s\S]*grid-column:\s*2;[\s\S]*grid-row:\s*1;/
);
assert.match(styles, /\.site-footer__language\s*\{[\s\S]*justify-content:\s*flex-end/);
assert.match(
  styles,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*\.site-footer__lang-link\s*\{[\s\S]*font-size:\s*\.62rem;/
);
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

assert.match(
  styles,
  /\.branded-content-inquiry__form-wrap\s*\{[\s\S]*min-width:\s*0;/
);
assert.match(
  styles,
  /\.branded-content-form__row\s*\{[\s\S]*min-width:\s*0;/
);
assert.match(brandedContent, /window\.matchMedia\('\(max-width: 575\.98px\)'\)/);
assert.match(brandedContent, /turnstileWidget\.dataset\.size = 'compact';/);
assert.ok(
  brandedContent.indexOf("turnstileWidget.dataset.size = 'compact'") <
    brandedContent.indexOf("https://challenges.cloudflare.com/turnstile/v0/api.js"),
  "The mobile Turnstile size must be selected before the external widget script loads."
);

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

assert.match(newsLayout, /class="display-huge p-name news-entry-title"/);
for (const layout of [newsLayout, postLayout]) {
  assert.match(layout, /<nav class="entry-nav container-100"/);
}
assert.match(entryNavigation, /entryCollection \| getPreviousCollectionItem/);
assert.match(entryNavigation, /entryCollection \| getNextCollectionItem/);
assert.match(entryNavigation, /class="entry-nav__title link-fancy gambado"/);
assert.match(entryNavigation, /rel="prev"/);
assert.match(entryNavigation, /rel="next"/);
assert.match(styles, /\.entry-nav\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(
  styles,
  /@media \(max-width: 575\.98px\)[\s\S]*\.news-entry-title\s*\{[\s\S]*font-size: clamp\(2rem, 9vw, 2\.25rem\)[\s\S]*\.entry-nav\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/
);

console.log("Public shell validation passed.");
