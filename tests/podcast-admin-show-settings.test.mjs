import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const moduleSource = await readFile(
  new URL("../src/js/podcast-admin-show-settings.js", import.meta.url),
  "utf8"
);
const {
  needsShowArchiveConfirmation,
  populateShowSettingsForm,
  readShowSettingsPayload
} = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`
);

test("populates every editable field and keeps permanent destinations display-only", () => {
  const form = fixtureForm();
  populateShowSettingsForm(form, {
    title: "Ópera en la Selva",
    language: "es",
    status: "active",
    authorName: "Dust Wave",
    category: "Arts",
    description: "Descripción",
    descriptionEn: "Description",
    artworkUrl: "https://dustwave.xyz/artwork.png",
    canonicalUrl: "https://dustwave.xyz/podcasts/opera-en-la-selva/",
    feedUrl: "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml",
    earlyAccessDays: 7,
    youtubeChannelUrl: "https://youtube.com/@dustwavecollective",
    premiumEnabled: true,
    freeMiniEpisodeEnabled: true,
    explicit: false
  });

  assert.equal(form.elements.status.value, "active");
  assert.equal(form.elements.earlyAccessDays.value, 7);
  assert.equal(
    form.elements.canonicalUrl.value,
    "https://dustwave.xyz/podcasts/opera-en-la-selva/"
  );
  assert.equal(
    form.elements.feedUrl.value,
    "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml"
  );
  assert.equal(form.elements.premiumEnabled.checked, true);
  assert.equal(form.elements.explicit.checked, false);
});

test("builds the existing PATCH payload without mutable permanent addresses", () => {
  const form = fixtureForm({
    title: "Ópera en la Selva",
    language: "es",
    status: "coming_soon",
    authorName: "Dust Wave",
    category: "Arts",
    description: "Descripción",
    descriptionEn: "Description",
    artworkUrl: "https://dustwave.xyz/artwork.png",
    canonicalUrl: "https://attacker.invalid/change-me",
    feedUrl: "https://attacker.invalid/change-me.xml",
    earlyAccessDays: "",
    youtubeChannelUrl: "https://youtube.com/@dustwavecollective",
    premiumEnabled: true,
    freeMiniEpisodeEnabled: true,
    explicit: false
  });

  assert.deepEqual(readShowSettingsPayload(form), {
    title: "Ópera en la Selva",
    language: "es",
    status: "coming_soon",
    authorName: "Dust Wave",
    category: "Arts",
    description: "Descripción",
    descriptionEn: "Description",
    artworkUrl: "https://dustwave.xyz/artwork.png",
    earlyAccessDays: null,
    youtubeChannelUrl: "https://youtube.com/@dustwavecollective",
    premiumEnabled: true,
    freeMiniEpisodeEnabled: true,
    explicit: false
  });
});

test("requires confirmation only when entering the archived state", () => {
  assert.equal(
    needsShowArchiveConfirmation({ status: "active" }, "archived"),
    true
  );
  assert.equal(
    needsShowArchiveConfirmation({ status: "archived" }, "archived"),
    false
  );
  assert.equal(
    needsShowArchiveConfirmation({ status: "coming_soon" }, "active"),
    false
  );
});

function fixtureForm(values = {}) {
  const checkboxFields = new Set([
    "premiumEnabled",
    "freeMiniEpisodeEnabled",
    "explicit"
  ]);
  const fields = [
    "title",
    "language",
    "status",
    "authorName",
    "category",
    "description",
    "descriptionEn",
    "artworkUrl",
    "canonicalUrl",
    "feedUrl",
    "earlyAccessDays",
    "youtubeChannelUrl",
    ...checkboxFields
  ];
  return {
    elements: Object.fromEntries(fields.map((field) => [
      field,
      checkboxFields.has(field)
        ? { checked: Boolean(values[field]) }
        : { value: values[field] ?? "" }
    ]))
  };
}
