import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(repositoryRoot, "src");
const i18nRoot = path.join(sourceRoot, "_data", "i18n");
const [config, english, spanish] = await Promise.all([
  readJson(path.join(i18nRoot, "config.json")),
  readJson(path.join(i18nRoot, "en.json")),
  readJson(path.join(i18nRoot, "es.json"))
]);
const { default: staticLocalePages } = await import(
  new URL("../src/_data/staticLocalePages.js", import.meta.url)
);

assert.deepEqual(config.supportedLangs, ["en", "es"]);
assert.equal(config.defaultLang, "en");
for (const [translationKey, routes] of Object.entries(config.pages)) {
  assert.equal(typeof routes.en, "string", `${translationKey} needs an English route`);
  assert.equal(typeof routes.es, "string", `${translationKey} needs a Spanish route`);
  assert(routes.es.startsWith("/es/"), `${translationKey} Spanish route must use /es/`);
}

assert.deepEqual(
  shapeOf(english),
  shapeOf(spanish),
  "English and Spanish dictionaries must expose the same contract"
);

const sourceFiles = await listFiles(sourceRoot);
const templateFiles = sourceFiles.filter((file) => file.endsWith(".njk"));
const publicTemplates = templateFiles.filter(
  (file) => !file.includes(`${path.sep}admin${path.sep}`)
);
const templateSources = await Promise.all(
  templateFiles.map(async (file) => [file, await readFile(file, "utf8")])
);
const publicSources = templateSources.filter(([file]) =>
  publicTemplates.includes(file)
);

for (const [file, source] of templateSources) {
  for (const match of source.matchAll(
    /i18n\s*\|\s*t\([^,]+,\s*["']([^"']+)["']/g
  )) {
    for (const [language, dictionary] of [
      ["en", english],
      ["es", spanish]
    ]) {
      assert.notEqual(
        valueAtPath(dictionary, match[1]),
        undefined,
        `${path.relative(repositoryRoot, file)} references missing ${language} key ${match[1]}`
      );
    }
  }
}

const doubledLanguagePattern =
  /(?:English|Ingl[eé]s)\s*(?:\/|·|\||—)\s*(?:Espa[nñ]ol|Spanish)|(?:Espa[nñ]ol|Spanish)\s*(?:\/|·|\||—)\s*(?:English|Ingl[eé]s)/i;
for (const [file, source] of publicSources) {
  assert.doesNotMatch(
    source,
    doubledLanguagePattern,
    `${path.relative(repositoryRoot, file)} must render one active language`
  );
}

const localizedMarketingTemplates = new Map([
  ["index.njk", "home"],
  ["blog.njk", "projects"],
  ["about.njk", "about"],
  ["news.njk", "news"],
  ["partners.njk", "partners"],
  ["contact.njk", "contact"],
  ["microcinema.njk", "microcinema"],
  ["newsletter.njk", "newsletter"],
  ["404.njk", "error404"],
  ["dds-donation.njk", "ddsDonate"],
  ["secret.njk", "secret"],
  ["slac-terms.njk", "slacTerms"],
  ["survey.njk", "survey"]
]);
for (const [relativePath, translationKey] of localizedMarketingTemplates) {
  const source = await readFile(path.join(sourceRoot, relativePath), "utf8");
  assert.match(source, /data: i18n\.config\.supportedLangs/);
  assert.match(source, new RegExp(`translationKey: ${translationKey}`));
}

assert.deepEqual(
  shapeOf(staticLocalePages.survey.en),
  shapeOf(staticLocalePages.survey.es),
  "legacy survey locale data must expose the same form contract"
);
for (const language of config.supportedLangs) {
  const terms = staticLocalePages.slacTerms[language];
  assert(terms.title.trim().length > 0);
  assert(terms.content.trim().length > 500);
  assert.doesNotMatch(terms.content, /<script|on[a-z]+\s*=/i);
  for (const group of [
    "projectOptions",
    "expenseOptions",
    "fundraisingOptions",
    "contributionOptions"
  ]) {
    const keys = staticLocalePages.survey[language][group].map(({ key }) => key);
    assert.equal(new Set(keys).size, keys.length, `${language} ${group} keys must be unique`);
  }
}

const englishProjects = (await readdir(path.join(sourceRoot, "posts")))
  .filter((file) => file.endsWith(".md"));
const spanishProjects = (await readdir(path.join(sourceRoot, "es", "project")))
  .filter((file) => file.endsWith(".md"));
const memberCards = (await readdir(path.join(sourceRoot, "members")))
  .filter((file) => file.endsWith(".md"));
const memberDirectoryData = await readJson(
  path.join(sourceRoot, "members", "members.json")
);
assert.equal(englishProjects.length, 36, "expected the 36 established project pages");
assert.equal(
  spanishProjects.length,
  englishProjects.length,
  "every project needs a Spanish locale sidecar"
);
assert.equal(memberCards.length, 34, "expected the 34 established About-page member cards");
assert.equal(
  memberDirectoryData.permalink,
  false,
  "data-only member cards must not emit empty public pages"
);
for (const file of spanishProjects) {
  const source = await readFile(path.join(sourceRoot, "es", "project", file), "utf8");
  const slug = file.replace(/\.md$/, "");
  assert.match(source, /^language: es$/m);
  assert.match(source, /^isProject: true$/m);
  assert.match(source, new RegExp(`^  en: /project/${escapeRegExp(slug)}\\.html$`, "m"));
  assert.match(source, new RegExp(`^  es: /es/project/${escapeRegExp(slug)}\\.html$`, "m"));
  assert.doesNotMatch(source, /ZXQPH|DWTEMPLATE/);
}

const head = await readFile(
  path.join(sourceRoot, "_includes", "snippets", "head.njk"),
  "utf8"
);
assert.match(
  head,
  /{% if i18nRuntime %}[\s\S]+dust-wave-runtime-i18n[\s\S]+{% endif %}/,
  "interactive translations must not inflate every marketing page"
);

const languageRuntime = await readFile(
  path.join(sourceRoot, "js", "site-i18n.js"),
  "utf8"
);
assert.match(
  languageRuntime,
  /admin_login\|code\|magic\(\?:-link\)\?\|t\|token/
);
assert.match(
  languageRuntime,
  /code\|magic\(\?:-link\)\?\|token/
);
assert.match(languageRuntime, /protectedPage[\s\S]+window\.location\.hash/);

const sharePanel = await readFile(
  path.join(sourceRoot, "_includes", "snippets", "share-panel.njk"),
  "utf8"
);
assert.match(sharePanel, /normalizeMastodonInstance/);
assert.match(sharePanel, /parsed\.username \|\| parsed\.password/);

const newsIndex = await readFile(path.join(sourceRoot, "news.njk"), "utf8");
assert.match(newsIndex, /pages\.news\.authoredNotice/);
assert.doesNotMatch(
  newsIndex,
  /\/es\/news\/.+\{\{/,
  "News bodies must keep their authored-language canonical URLs"
);

console.log(
  "i18n contract validation passed: one active locale, 36 translated projects, 34 data-only member cards, authored-language News."
);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    })
  );
  return nested.flat();
}

function valueAtPath(source, key) {
  return key.split(".").reduce((value, part) => value?.[part], source);
}

function shapeOf(value, prefix = "") {
  if (Array.isArray(value)) {
    return [
      `${prefix}:array:${value.length}`,
      ...value.flatMap((item, index) => shapeOf(item, `${prefix}[${index}]`))
    ];
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .flatMap((key) => shapeOf(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [`${prefix}:${typeof value}`];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
