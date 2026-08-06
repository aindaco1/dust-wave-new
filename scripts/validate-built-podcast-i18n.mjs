import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PODCAST_I18N_PAGES,
  validatePodcastI18nPage,
  validatePodcastI18nShowPair
} from "./lib/podcast-i18n-page-contract.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const directoryArgument = process.argv.find((argument) =>
  argument.startsWith("--directory=")
);
const outputDirectory = directoryArgument?.slice("--directory=".length)
  || "docs";
const outputRoot = path.resolve(repositoryRoot, outputDirectory);

const renderedPages = new Map();
for (const contract of PODCAST_I18N_PAGES) {
  const html = await readFile(path.join(outputRoot, contract.file), "utf8");
  validatePodcastI18nPage(html, contract, contract.file);
  renderedPages.set(contract.pathname, html);
}
validatePodcastI18nShowPair(
  renderedPages.get("/podcasts/opera-en-la-selva/"),
  renderedPages.get("/es/podcasts/opera-en-la-selva/")
);

console.log(
  `Rendered podcast i18n validation passed for ${PODCAST_I18N_PAGES.length} EN/ES admin, account, and show pages in ${outputDirectory}.`
);
