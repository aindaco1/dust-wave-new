const JSON_LD_ESCAPES = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

function safeJsonLd(value) {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => JSON_LD_ESCAPES[character]
  );
}

function peopleJsonLd(names) {
  const people = (Array.isArray(names) ? names : [])
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => ({ "@type": "Person", name: name.trim() }));

  return safeJsonLd(people);
}

module.exports = { peopleJsonLd, safeJsonLd };
