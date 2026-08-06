import assert from "node:assert/strict";

export const PODCAST_I18N_PAGES = Object.freeze([
  page({
    file: "admin/podcasts/index.html",
    pathname: "/admin/podcasts/",
    language: "en",
    runtime: ["admin"],
    expected: ["Podcast Admin — Dust Wave", "Sign in", "Send link"],
    rejected: ["Administración de podcasts — Dust Wave", "Iniciar sesión"]
  }),
  page({
    file: "es/admin/podcasts/index.html",
    pathname: "/es/admin/podcasts/",
    language: "es",
    runtime: ["admin"],
    expected: [
      "Administración de podcasts — Dust Wave",
      "Iniciar sesión",
      "Enviar enlace"
    ],
    rejected: ["Podcast Admin — Dust Wave", ">Sign in<"]
  }),
  page({
    file: "podcasts/account/index.html",
    pathname: "/podcasts/account/",
    language: "en",
    runtime: ["member"],
    expected: [
      "Your podcast account — Dust Wave",
      "Your account",
      "Get a secure link"
    ],
    rejected: ["Tu cuenta de podcasts — Dust Wave", "Recibe un enlace seguro"]
  }),
  page({
    file: "es/podcasts/account/index.html",
    pathname: "/es/podcasts/account/",
    language: "es",
    runtime: ["member"],
    expected: [
      "Tu cuenta de podcasts — Dust Wave",
      "Tu cuenta",
      "Recibe un enlace seguro"
    ],
    rejected: ["Your podcast account — Dust Wave", "Get a secure link"]
  }),
  page({
    file: "podcasts/opera-en-la-selva/index.html",
    pathname: "/podcasts/opera-en-la-selva/",
    language: "en",
    runtime: ["checkout"],
    expected: [
      "Ópera en la Selva — Dust Wave Podcasts",
      "A Dust Wave podcast",
      "Choose your plan",
      "$50/year",
      "New Mexico"
    ],
    rejected: [
      "Un podcast de Dust Wave",
      "Elige tu plan",
      "$50/año",
      "Nuevo México"
    ]
  }),
  page({
    file: "es/podcasts/opera-en-la-selva/index.html",
    pathname: "/es/podcasts/opera-en-la-selva/",
    language: "es",
    runtime: ["checkout"],
    expected: [
      "Ópera en la Selva — Podcasts de Dust Wave",
      "Un podcast de Dust Wave",
      "Elige tu plan",
      "$50/año",
      "Nuevo México"
    ],
    rejected: [
      "A Dust Wave podcast",
      "Choose your plan",
      "$50/year",
      "New Mexico"
    ]
  })
]);

export function validatePodcastI18nPage(html, contract, source) {
  assert.match(
    html,
    new RegExp(`<html[^>]+lang=["']${contract.language}["']`, "i"),
    `${source} must declare ${contract.language}`
  );
  assert.doesNotMatch(html, /\[missing:/i, `${source} rendered a missing key`);
  for (const text of contract.expected) {
    assert(html.includes(text), `${source} must render ${JSON.stringify(text)}`);
  }
  for (const text of contract.rejected) {
    assert(!html.includes(text), `${source} leaked ${JSON.stringify(text)}`);
  }
  assert.deepEqual(
    Object.keys(runtimePayload(html, source)).sort(),
    contract.runtime.slice().sort(),
    `${source} must ship only its required runtime namespaces`
  );
}

export function validatePodcastI18nShowPair(englishHtml, spanishHtml) {
  assert.match(
    englishHtml,
    /href=["']\/es\/podcasts\/opera-en-la-selva\/["']/
  );
  assert.match(
    spanishHtml,
    /href=["']\/podcasts\/opera-en-la-selva\/["']/
  );
  assert.match(englishHtml, /hreflang=["']es["']/);
  assert.match(spanishHtml, /hreflang=["']en["']/);
}

function page(contract) {
  return Object.freeze({
    ...contract,
    runtime: Object.freeze(contract.runtime),
    expected: Object.freeze(contract.expected),
    rejected: Object.freeze(contract.rejected)
  });
}

function runtimePayload(html, source) {
  const match = html.match(
    /<script[^>]+id=["']dust-wave-runtime-i18n["'][^>]*>([\s\S]*?)<\/script>/i
  );
  assert(match, `${source} must include a scoped runtime translation payload`);
  return JSON.parse(match[1]);
}
