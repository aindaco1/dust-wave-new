import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readNunjucksSource } from "./lib/read-nunjucks-source.mjs";
import { readSassSource } from "./lib/read-sass-source.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readTemplate = (path) => readNunjucksSource(
  new URL(`../${path}`, import.meta.url)
);

const [
  admin,
  adminLayout,
  analytics,
  defaultLayout,
  embed,
  memberLayout,
  newLayout,
  player,
  memberStyles,
  podcastStyles,
  styleTheme,
  show,
  socialIcon,
  workflow
] = await Promise.all([
  readTemplate("src/admin/podcasts/index.njk"),
  read("src/_includes/layouts/podcast-admin.njk"),
  read("src/js/podcast-admin-analytics.js"),
  read("src/_includes/layouts/default.njk"),
  read("src/news/podcasts/embed.njk"),
  read("src/_includes/layouts/podcast-member.njk"),
  read("src/_includes/layouts/new.njk"),
  read("src/_includes/snippets/audio-player.njk"),
  read("src/scss/themes/base/_podcast-member.scss"),
  readSassSource(
    new URL("../src/scss/themes/base/_podcast-admin.scss", import.meta.url)
  ),
  read("src/scss/themes/base/_style-theme.scss"),
  read("src/podcasts/show.njk"),
  read("src/_includes/snippets/social-icon.njk"),
  read("shared/dust-wave-platform/packages/admin-shell/src/workflow-progress.js")
]);

for (const [name, layout] of [
  ["default", defaultLayout],
  ["Podcast admin", adminLayout],
  ["Podcast member", memberLayout],
  ["episode", newLayout]
]) {
  assert.match(layout, /<html[^>]+lang="{{[^}]+}}"/);
  assert.match(layout, /<a class="skip-link" href="#main-content">/);
  assert.match(layout, /<main[^>]+id="main-content"[^>]+tabindex="-1"/);
  assert.ok(
    layout.indexOf('class="skip-link"') < layout.indexOf("<main"),
    `${name} skip navigation must precede its main landmark.`
  );
}

for (const tab of [
  "episodes",
  "distribution",
  "marketing",
  "audience",
  "monetization",
  "settings"
]) {
  assert.match(
    admin,
    new RegExp(
      `<button id="podcast-tab-${tab}"[^>]+role="tab"[^>]+`
      + `aria-controls="podcast-panel-${tab}"`
    )
  );
  assert.match(
    admin,
    new RegExp(
      `<section id="podcast-panel-${tab}"[^>]+role="tabpanel"[^>]+`
      + `aria-labelledby="podcast-tab-${tab}"`
    )
  );
}

assert.match(workflow, /if \(usesTabs\) item\.setAttribute\("role", "presentation"\)/);
assert.match(workflow, /button\.setAttribute\("role", "tab"\)/);
assert.match(workflow, /button\.setAttribute\("aria-selected", active \? "true" : "false"\)/);
assert.match(workflow, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/);

assert.match(analytics, /bar\.setAttribute\("role", "meter"\)/);
for (const attribute of ["aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow"]) {
  assert.ok(
    analytics.includes(`bar.setAttribute("${attribute}"`),
    `Analytics meters must set ${attribute}.`
  );
}
assert.doesNotMatch(
  podcastStyles,
  /\.podcast-admin__progressive-section\s*\{[^}]*content-visibility/s
);
assert.match(
  podcastStyles,
  /\.podcast-admin__analytics-bar-value\s*\{[^}]*background: #101010;[^}]*color: #fff;/s
);
assert.match(analytics, /fill\.setAttribute\("aria-hidden", "true"\)/);
assert.match(
  podcastStyles,
  /\.podcast-admin__subscriber-card code\s*\{[^}]*color: #fff;/s
);
assert.match(
  styleTheme,
  /\.podcast-show__eyebrow,[\s\S]+?color: #ff8b7e;/
);
assert.match(
  styleTheme,
  /\.skip-link\s*\{[^}]*background: #fff;[^}]*color: #000 !important;/s
);
assert.match(
  memberStyles,
  /\.podcast-member__eyebrow\s*\{[^}]*color: #ff8b7e;/s
);
assert.match(podcastStyles, /:focus-visible\s*\{[^}]*outline:/s);
assert.match(podcastStyles, /--dw-admin-control-min-height: 2\.75rem;/);
assert.match(
  podcastStyles,
  /\.podcast-admin \.btn-danger\s*\{[^}]*background-color: #c92f41;[^}]*color: #fff;/s
);
assert.match(
  podcastStyles,
  /\.podcast-admin__progressive-state\s*\{[^}]*background: #101010;[^}]*color: #fff;/s
);

assert.match(show, /class="podcast-show__wordmark"[\s\S]+?alt=""/);
assert.match(show, /class="podcast-show__artwork"[\s\S]+?alt="{{/);
for (const className of ["playpause", "skip-back", "skip-fwd", "speed"]) {
  assert.match(
    player,
    new RegExp(`<button[^>]+class="${className}"[^>]+aria-label=`)
  );
}
assert.match(player, /<a class="download"[^>]+aria-label=/);
assert.match(player, /<svg[^>]+aria-hidden="true"/);
assert.match(socialIcon, /<svg[^>]+aria-hidden="true"[^>]+focusable="false"/);
assert.match(embed, /<html lang="{{/);
assert.match(embed, /<main class="podcast-embed">/);

console.log("Podcast accessibility contracts passed.");
