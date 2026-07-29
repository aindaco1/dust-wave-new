import assert from "node:assert/strict";
import test from "node:test";

import {
  datetimeInputIsoOrNull,
  datetimeLocalInputValue,
  findEditableEpisode,
  readEpisodeFormPayload
} from "../src/js/podcast-admin-episode-editor.js";

test("restores UTC release timestamps as browser-local datetime values", () => {
  const value = "2026-07-29T18:45:00.000Z";
  const date = new Date(value);
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  ).toISOString().slice(0, 16);

  assert.equal(datetimeLocalInputValue(value), local);
  assert.equal(datetimeInputIsoOrNull(local), value);
  assert.equal(datetimeLocalInputValue("not-a-date"), "");
  assert.equal(datetimeInputIsoOrNull("not-a-date"), null);
  assert.equal(datetimeInputIsoOrNull(""), null);
});

test("creates one canonical form payload and keeps slugs out of PATCH updates", () => {
  const form = fixtureForm({
    title: "Episodio revisado",
    slug: "episodio-permanente",
    summary: "Resumen actualizado.",
    access: "early_access",
    sourceLanguage: "es",
    premiumAt: "2026-08-01T09:00",
    publicAt: "2026-08-08T09:00"
  });
  const update = readEpisodeFormPayload(
    form,
    "<p><strong>Notas</strong> seguras.</p>"
  );
  const create = readEpisodeFormPayload(form, update.contentHtml, {
    includeSlug: true
  });

  assert.deepEqual(update, {
    title: "Episodio revisado",
    summary: "Resumen actualizado.",
    contentHtml: "<p><strong>Notas</strong> seguras.</p>",
    access: "early_access",
    sourceLanguage: "es",
    premiumAt: new Date("2026-08-01T09:00").toISOString(),
    publicAt: new Date("2026-08-08T09:00").toISOString()
  });
  assert.equal("slug" in update, false);
  assert.equal(create.slug, "episodio-permanente");
});

test("matches edit targets by exact API identity", () => {
  const episodes = [
    { id: "episode_one" },
    { id: "episode_one_extra" }
  ];

  assert.equal(findEditableEpisode(episodes, "episode_one"), episodes[0]);
  assert.equal(findEditableEpisode(episodes, "episode"), null);
});

function fixtureForm(values) {
  return {
    elements: Object.fromEntries(
      [
        "title",
        "slug",
        "summary",
        "access",
        "sourceLanguage",
        "premiumAt",
        "publicAt"
      ].map((field) => [field, { value: values[field] ?? "" }])
    )
  };
}
