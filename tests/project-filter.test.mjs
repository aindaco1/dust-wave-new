import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [archiveTemplate, filterScript, themeStyles] = await Promise.all([
  readFile(new URL("../src/blog.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/js/project-filter.js", import.meta.url), "utf8"),
  readFile(new URL("../src/scss/themes/base/_style-theme.scss", import.meta.url), "utf8")
]);

test("the projects archive keeps real links and loads the live-filter enhancement", () => {
  assert.match(archiveTemplate, /href="\{\{ projectsUrl \}\}\?type=\{\{ type\.slug \}\}"/);
  assert.match(archiveTemplate, /data-project-filter="\{\{ type\.slug \}\}"/);
  assert.match(archiveTemplate, /<script src="\/js\/project-filter\.js" defer><\/script>/);
  assert.match(filterScript, /window\.history\.pushState/);
  assert.match(filterScript, /window\.addEventListener\("popstate"/);
});

test("filtered Bootstrap flex rows are actually removed from layout", () => {
  assert.match(
    themeStyles,
    /\.project-list-item\[hidden\]\s*\{\s*display:\s*none\s*!important;/
  );
});
