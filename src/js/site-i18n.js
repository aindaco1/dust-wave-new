"use strict";

(() => {
  const payload = document.getElementById("dust-wave-runtime-i18n");
  let messages = {};
  try {
    messages = JSON.parse(payload?.textContent || "{}");
  } catch {
    messages = {};
  }

  function valueAtPath(key) {
    return String(key || "")
      .split(".")
      .filter(Boolean)
      .reduce((value, part) => value?.[part], messages);
  }

  function t(key, variables = {}) {
    const value = valueAtPath(key);
    if (typeof value !== "string") return `[missing: ${key}]`;
    return Object.entries(variables).reduce(
      (result, [name, replacement]) =>
        result.replaceAll(`%{${name}}`, String(replacement ?? "")),
      value
    );
  }

  function safeLanguageSuffix() {
    const protectedPage =
      /^\/(?:[a-z]{2}\/)?(?:admin\/|podcasts\/account\/?)/i.test(
        window.location.pathname
      );
    const params = new URLSearchParams(window.location.search);
    for (const key of Array.from(params.keys())) {
      if (
        /^(?:admin_login|code|magic(?:-link)?|t|token)$/i.test(key)
      ) params.delete(key);
    }
    const search = params.toString();
    const hash =
      protectedPage
        && /(?:code|magic(?:-link)?|token)=/i.test(window.location.hash)
        ? ""
        : window.location.hash;
    return `${search ? `?${search}` : ""}${hash}`;
  }

  const suffix = safeLanguageSuffix();
  if (suffix) {
    document
      .querySelectorAll('[data-lang-switcher-link="true"]')
      .forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        const rawHref = link.getAttribute("href") || "";
        if (!rawHref || /[?#]/.test(rawHref)) return;
        link.setAttribute("href", rawHref + suffix);
      });
  }

  window.DustWaveI18n = Object.freeze({
    language: document.documentElement.lang || "en",
    t
  });
})();
