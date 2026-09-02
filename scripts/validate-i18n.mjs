import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(repositoryRoot, "src");
const i18nRoot = path.join(sourceRoot, "_data", "i18n");
const [config, english, spanish, projectTaxonomy] = await Promise.all([
  readJson(path.join(i18nRoot, "config.json")),
  readJson(path.join(i18nRoot, "en.json")),
  readJson(path.join(i18nRoot, "es.json")),
  readJson(path.join(sourceRoot, "_data", "projectTaxonomy.json"))
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
const englishLeaves = translationLeaves(english);
const spanishLeaves = translationLeaves(spanish);
assert.equal(englishLeaves.length, spanishLeaves.length);
assert(
  englishLeaves.length > 2_000,
  "the established bilingual catalog unexpectedly lost substantial coverage"
);
for (let index = 0; index < englishLeaves.length; index += 1) {
  const [englishPath, englishValue] = englishLeaves[index];
  const [spanishPath, spanishValue] = spanishLeaves[index];
  assert.equal(englishPath, spanishPath);
  assert(englishValue.trim(), `${englishPath} has an empty English translation`);
  assert(spanishValue.trim(), `${spanishPath} has an empty Spanish translation`);
  assert.deepEqual(
    placeholders(englishValue),
    placeholders(spanishValue),
    `${englishPath} must preserve interpolation variables across languages`
  );
  assert.doesNotMatch(englishValue, /\[missing:/i);
  assert.doesNotMatch(spanishValue, /\[missing:/i);
}

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

  for (const match of source.matchAll(/workbench\.([A-Za-z0-9_.]+)/g)) {
    const key = `podcast.admin.workbench.${match[1]}`;
    assert.notEqual(
      valueAtPath(english, key),
      undefined,
      `${path.relative(repositoryRoot, file)} references missing workbench key ${key}`
    );
  }
}

const podcastJavascript = sourceFiles.filter((file) =>
  file.endsWith(".js") && path.basename(file).startsWith("podcast-")
);
for (const file of podcastJavascript) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/adminText\(\s*["']([^"']+)["']/g)) {
    assert.notEqual(
      valueAtPath(english.runtime.admin, match[1]),
      undefined,
      `${path.relative(repositoryRoot, file)} references missing runtime.admin.${match[1]}`
    );
  }
  for (const match of source.matchAll(/translate\(\s*["']([^"']+)["']/g)) {
    assert.notEqual(
      valueAtPath(english.runtime, match[1]),
      undefined,
      `${path.relative(repositoryRoot, file)} references missing runtime.${match[1]}`
    );
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
  ["branded-content.njk", "brandedContent"],
  ["writers-group.njk", "writersGroup"],
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
assert.equal(
  englishProjects.length,
  Object.keys(projectTaxonomy.projects).length,
  "the English project collection must match the configured taxonomy"
);
assert.equal(
  spanishProjects.length,
  englishProjects.length,
  "every project needs a Spanish locale sidecar"
);
assert.equal(memberCards.length, 35, "expected the 35 established About-page member cards");
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
assert.match(
  head,
  /runtimeTranslations\(i18nRuntimeSections\)/,
  "interactive pages must ship only the translation namespaces they use"
);

const runtimeContracts = new Map([
  ["admin/podcasts/index.njk", ["admin"]],
  ["podcasts/account.njk", ["member"]],
  ["podcasts/show.njk", ["checkout"]],
  ["news/podcasts/episode.njk", ["chapters", "clips", "transcript"]]
]);
for (const [relativePath, sections] of runtimeContracts) {
  const source = await readFile(path.join(sourceRoot, relativePath), "utf8");
  assert.match(source, /^i18nRuntime: true$/m);
  for (const section of sections) {
    assert.match(
      source,
      new RegExp(`^  - ${escapeRegExp(section)}$`, "m"),
      `${relativePath} must include the ${section} runtime namespace`
    );
    assert.notEqual(english.runtime[section], undefined);
  }
}

const podcastShowTemplate = await readFile(
  path.join(sourceRoot, "podcasts", "show.njk"),
  "utf8"
);
assert.match(podcastShowTemplate, /localizedPodcastPrice\(language,/);
assert.match(podcastShowTemplate, /set playerLanguage = language/);
assert.match(podcastShowTemplate, /for state in usStates/);
assert.doesNotMatch(
  podcastShowTemplate,
  /<option value="(?:NM|NY|WV)">/,
  "US subdivision labels must come from the shared bilingual data source"
);
assert.doesNotMatch(
  podcastShowTemplate,
  /"año"\s+if\s+language\s*==\s*"es"\s+else\s+"year"/,
  "billing-period copy belongs in the translation catalog"
);

const episodeTemplate = await readFile(
  path.join(sourceRoot, "news", "podcasts", "episode.njk"),
  "utf8"
);
assert.match(episodeTemplate, /readablePodcastDate\(language\)/);

const embedTemplate = await readFile(
  path.join(sourceRoot, "news", "podcasts", "embed.njk"),
  "utf8"
);
assert.match(embedTemplate, /podcast\.episode\.notesOnDustWave/);
assert.doesNotMatch(embedTemplate, /Episode notes on Dust Wave.+if/s);

const playerTemplate = await readFile(
  path.join(sourceRoot, "_includes", "snippets", "audio-player.njk"),
  "utf8"
);
assert.match(playerTemplate, /runtime\.player\.playTitle/);
assert.match(playerTemplate, /data-player-text-play-now/);
assert.doesNotMatch(playerTemplate, /"Play "\s+if|"Reproducir "\s+if/);

const adminRuntime = await readFile(
  path.join(sourceRoot, "js", "podcast-admin.js"),
  "utf8"
);
assert.doesNotMatch(
  adminRuntime,
  /return error\.message \|\| error\.code/,
  "unknown server messages must not bypass the active UI language"
);

const checkoutRuntime = await readFile(
  path.join(sourceRoot, "js", "podcast-checkout.js"),
  "utf8"
);
assert.match(checkoutRuntime, /language:\s*pageLanguage/);
assert.match(checkoutRuntime, /Intl\.DisplayNames\(\s*\[pageLanguage, "en"\]/);
assert.match(checkoutRuntime, /Intl\.NumberFormat\(pageLanguage/);

const memberRuntime = await readFile(
  path.join(sourceRoot, "js", "podcast-member.js"),
  "utf8"
);
assert.match(memberRuntime, /preferredLanguage:\s*pageLanguage/);
assert.match(
  memberRuntime,
  /billing\/portal[\s\S]{0,180}body:\s*\{\s*language:\s*pageLanguage\s*\}/
);
assert.match(memberRuntime, /Intl\.DateTimeFormat\(pageLanguage/);

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
assert.doesNotMatch(
  newsIndex,
  /pages\.news\.authoredNotice/,
  "The News index must not display an authored-language notice"
);
assert.equal(english.pages.news.authoredNotice, undefined);
assert.equal(spanish.pages.news.authoredNotice, undefined);
assert.doesNotMatch(
  newsIndex,
  /\/es\/news\/.+\{\{/,
  "News bodies must keep their authored-language canonical URLs"
);

console.log(
  `i18n contract validation passed: ${englishLeaves.length} bilingual messages, scoped interactive catalogs, one active locale, ${englishProjects.length} translated projects, 35 data-only member cards, authored-language News.`
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

function translationLeaves(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      translationLeaves(item, `${prefix}[${index}]`)
    );
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .flatMap((key) =>
        translationLeaves(value[key], prefix ? `${prefix}.${key}` : key)
      );
  }
  return typeof value === "string" ? [[prefix, value]] : [];
}

function placeholders(value) {
  return Array.from(String(value).matchAll(/%\{([^}]+)\}/g))
    .map((match) => match[1])
    .sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
