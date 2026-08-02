import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const directoryArgument = process.argv.find((argument) =>
  argument.startsWith("--directory=")
);
const outputDirectory = directoryArgument?.slice("--directory=".length)
  || "docs";
const outputRoot = path.resolve(repositoryRoot, outputDirectory);

const pages = [
  {
    file: "admin/podcasts/index.html",
    language: "en",
    runtime: ["admin"],
    expected: ["Podcast Admin — Dust Wave", "Sign in", "Send link"],
    rejected: ["Administración de podcasts — Dust Wave", "Iniciar sesión"]
  },
  {
    file: "es/admin/podcasts/index.html",
    language: "es",
    runtime: ["admin"],
    expected: ["Administración de podcasts — Dust Wave", "Iniciar sesión", "Enviar enlace"],
    rejected: ["Podcast Admin — Dust Wave", ">Sign in<"]
  },
  {
    file: "podcasts/account/index.html",
    language: "en",
    runtime: ["member"],
    expected: ["Your podcast account — Dust Wave", "Your account", "Get a secure link"],
    rejected: ["Tu cuenta de podcasts — Dust Wave", "Recibe un enlace seguro"]
  },
  {
    file: "es/podcasts/account/index.html",
    language: "es",
    runtime: ["member"],
    expected: ["Tu cuenta de podcasts — Dust Wave", "Tu cuenta", "Recibe un enlace seguro"],
    rejected: ["Your podcast account — Dust Wave", "Get a secure link"]
  },
  {
    file: "podcasts/opera-en-la-selva/index.html",
    language: "en",
    runtime: ["checkout"],
    expected: ["Ópera en la Selva — Dust Wave Podcasts", "A Dust Wave podcast", "Choose your plan", "$50/year", "New Mexico"],
    rejected: ["Un podcast de Dust Wave", "Elige tu plan", "$50/año", "Nuevo México"]
  },
  {
    file: "es/podcasts/opera-en-la-selva/index.html",
    language: "es",
    runtime: ["checkout"],
    expected: ["Ópera en la Selva — Podcasts de Dust Wave", "Un podcast de Dust Wave", "Elige tu plan", "$50/año", "Nuevo México"],
    rejected: ["A Dust Wave podcast", "Choose your plan", "$50/year", "New Mexico"]
  }
];

for (const page of pages) {
  const html = await readFile(path.join(outputRoot, page.file), "utf8");
  assert.match(
    html,
    new RegExp(`<html[^>]+lang=["']${page.language}["']`, "i"),
    `${page.file} must declare ${page.language}`
  );
  assert.doesNotMatch(html, /\[missing:/i, `${page.file} rendered a missing key`);
  for (const text of page.expected) {
    assert(
      html.includes(text),
      `${page.file} must render ${JSON.stringify(text)}`
    );
  }
  for (const text of page.rejected) {
    assert(
      !html.includes(text),
      `${page.file} leaked ${JSON.stringify(text)} from the other locale`
    );
  }
  const runtime = runtimePayload(html, page.file);
  assert.deepEqual(
    Object.keys(runtime).sort(),
    page.runtime.slice().sort(),
    `${page.file} must ship only its required runtime namespaces`
  );
}

const englishShow = await readFile(
  path.join(outputRoot, "podcasts/opera-en-la-selva/index.html"),
  "utf8"
);
const spanishShow = await readFile(
  path.join(outputRoot, "es/podcasts/opera-en-la-selva/index.html"),
  "utf8"
);
assert.match(englishShow, /href=["']\/es\/podcasts\/opera-en-la-selva\/["']/);
assert.match(spanishShow, /href=["']\/podcasts\/opera-en-la-selva\/["']/);
assert.match(englishShow, /hreflang=["']es["']/);
assert.match(spanishShow, /hreflang=["']en["']/);

console.log(
  `Rendered podcast i18n validation passed for ${pages.length} EN/ES admin, account, and show pages in ${outputDirectory}.`
);

function runtimePayload(html, file) {
  const match = html.match(
    /<script[^>]+id=["']dust-wave-runtime-i18n["'][^>]*>([\s\S]*?)<\/script>/i
  );
  assert(match, `${file} must include a scoped runtime translation payload`);
  return JSON.parse(match[1]);
}
