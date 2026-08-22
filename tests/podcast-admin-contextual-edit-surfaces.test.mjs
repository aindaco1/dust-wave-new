import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("show cards route into the one canonical show-settings editor", async () => {
  const [catalog, contextual] = await Promise.all([
    read("src/js/podcast-admin-catalog.js"),
    read("src/js/podcast-admin-contextual-editing.js")
  ]);

  assert.match(catalog, /type:\s*"show"/);
  assert.match(catalog, /data-podcast-show-actions/);
  assert.match(contextual, /tabs\.select\("settings"\)/);
  assert.match(contextual, /revealContextualEditor\(showForm/);
});

test("top-episode analytics routes into the existing episode editor", async () => {
  const [analytics, contextual] = await Promise.all([
    read("src/js/podcast-admin-analytics.js"),
    read("src/js/podcast-admin-contextual-editing.js")
  ]);

  assert.match(analytics, /renderContextualAnalyticsEpisodes/);
  assert.match(contextual, /type:\s*"episode"/);
  assert.match(contextual, /id:\s*row\.episodeId/);
  assert.match(contextual, /selectEpisode\(current\.id\)/);
  assert.match(contextual, /navigateEpisode\("details", current\)/);
});

test("marketing clips route into the existing recipe editor", async () => {
  const [admin, contextual] = await Promise.all([
    read("src/js/podcast-admin.js"),
    read("src/js/podcast-admin-contextual-editing.js")
  ]);

  assert.match(admin, /prependClipRecipeEditButton/);
  assert.match(contextual, /type:\s*"clip"/);
  assert.match(contextual, /parentId:\s*clip\.episodeId/);
  assert.match(
    contextual,
    /navigateEpisode\("review", current, "promotion_clips"\)/
  );
  assert.match(contextual, /await loadTranscript\(\)/);
  assert.match(contextual, /return selectClipRecipe\(id\)/);
});

test("saved marketing-link edits reveal the existing shared link builder", async () => {
  const [admin, contextual] = await Promise.all([
    read("src/js/podcast-admin.js"),
    read("src/js/podcast-admin-contextual-editing.js")
  ]);

  assert.match(admin, /applyContextualMarketingLink\(marketingLinkForm/);
  assert.match(contextual, /revealContextualFormField\(form, "label"\)/);
  assert.doesNotMatch(admin, /data-podcast-contextual-marketing-form/);
});
