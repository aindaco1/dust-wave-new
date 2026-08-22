import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readSassSource } from "./lib/read-sass-source.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const fontPath = path.join(
  repositoryRoot,
  "src/fonts/datatype-v1.2.2-b7bd0abb.woff2"
);
const font = await readFile(fontPath);
const license = await readFile(
  path.join(repositoryRoot, "src/fonts/datatype-OFL-1.1.txt"),
  "utf8"
);
const provenance = await readFile(
  path.join(
    repositoryRoot,
    "src/fonts/datatype-v1.2.2-PROVENANCE.txt"
  ),
  "utf8"
);
const notices = await readFile(
  path.join(repositoryRoot, "THIRD_PARTY_NOTICES.md"),
  "utf8"
);
const styles = await readSassSource(
  new URL("../src/scss/themes/base/_podcast-admin.scss", import.meta.url)
);
const analytics = await readFile(
  path.join(repositoryRoot, "src/js/podcast-admin-analytics.js"),
  "utf8"
);
const helper = await readFile(
  path.join(repositoryRoot, "src/js/datatype-chart.js"),
  "utf8"
);
const english = JSON.parse(
  await readFile(path.join(repositoryRoot, "src/_data/i18n/en.json"), "utf8")
);
const spanish = JSON.parse(
  await readFile(path.join(repositoryRoot, "src/_data/i18n/es.json"), "utf8")
);

assert.equal(font.byteLength, 81904);
assert.equal(
  createHash("sha256").update(font).digest("hex"),
  "b7bd0abb2cad57bfa29129228d93e4cd78b1d46045899f9284938ced0ee68489"
);
assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
assert.match(license, /Reserved Font Name "Plex"/);
assert.match(provenance, /Release: v1\.2\.2/);
assert.match(
  provenance,
  /Pinned commit: 04e189f3222ab436fb7f84a20c62c48a1a7689f7/
);
assert.match(provenance, /width \(`wdth`\) 50–150, default 100/);
assert.match(provenance, /weight \(`wght`\) 100–900, default\s+400/);
assert.match(notices, /## Datatype 1\.2\.2/);
assert.match(notices, /SIL Open Font License 1\.1/);

assert.match(styles, /@font-face\s*\{/);
assert.match(styles, /font-family: "Dust Wave Datatype"/);
assert.match(styles, /font-display: swap/);
assert.match(styles, /font-stretch: 50% 150%/);
assert.match(styles, /font-weight: 100 900/);
assert.match(
  styles,
  /url\("\/fonts\/datatype-v1\.2\.2-b7bd0abb\.woff2"\)/
);
assert.doesNotMatch(styles, /local\(/);
assert.match(styles, /font-feature-settings: "liga" 1, "calt" 1/);
assert.match(styles, /letter-spacing: 0/);
assert.match(styles, /font-stretch: 100%/);
assert.match(
  styles,
  /@container podcast-datatype-trend \(max-width: 34rem\)[\s\S]*font-stretch: 75%/
);
assert.match(
  styles,
  /@container podcast-datatype-trend \(max-width: 18rem\)[\s\S]*display: none/
);

assert.match(helper, /MAX_DATATYPE_VALUES = 20/);
assert.match(helper, /Math\.round\(Math\.min\(numericValue \/ upperBound, 1\) \* 100\)/);
assert.match(helper, /summary\.hidden = true/);
assert.match(helper, /waitForDatatypeFont\(documentRef\.fonts\)\.then/);
assert.match(helper, /chart\.setAttribute\("aria-hidden", "true"\)/);
assert.match(helper, /chart\.dir = "ltr"/);
assert.match(analytics, /import\("\.\/datatype-chart\.js"\)\.catch\(\(\) => null\)/);
assert.match(analytics, /trend\.append\(list\)/);
assert.match(analytics, /module\.createDatatypeTrendSummary\(summaryOptions\)/);
assert.doesNotMatch(analytics, /innerHTML/);

assert.match(
  english.runtime.admin.analyticsDatatypeNote,
  /Exact localized values follow/
);
assert.match(
  spanish.runtime.admin.analyticsDatatypeNote,
  /valores exactos localizados/
);
assert.equal(english.runtime.admin.analyticsLatest, "Latest: %{value}");
assert.equal(spanish.runtime.admin.analyticsLatest, "Último valor: %{value}");

console.log(
  "Datatype analytics font provenance, rendering, fallback, responsive, and i18n contracts are valid."
);
