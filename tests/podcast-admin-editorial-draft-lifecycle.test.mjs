import assert from "node:assert/strict";
import test from "node:test";

import {
  createEditorialDraftLifecycle,
  preferredEditorialDraft
} from "../src/js/podcast-admin-editorial-draft-lifecycle.js";

test("invalidates stale editorial responses when context changes", async () => {
  let contextKey = "episode_1";
  let resolveRequest;
  const successes = [];
  const lifecycle = createEditorialDraftLifecycle({
    getContextKey: () => contextKey
  });

  const pending = lifecycle.run("loading", {
    request: () => new Promise((resolve) => { resolveRequest = resolve; }),
    onSuccess: (value) => successes.push(value)
  });
  assert.equal(lifecycle.isBusy("loading"), true);
  contextKey = "episode_2";
  lifecycle.invalidate();
  resolveRequest("stale");

  assert.equal(await pending, false);
  assert.deepEqual(successes, []);
  assert.equal(lifecycle.isBusy("loading"), false);
});

test("reports only current request failures and releases busy state", async () => {
  const failures = [];
  const lifecycle = createEditorialDraftLifecycle({
    getContextKey: () => "episode_1"
  });
  const completed = await lifecycle.run("generating", {
    request: async () => { throw new Error("draft failed"); },
    onError: (error) => failures.push(error.message)
  });

  assert.equal(completed, false);
  assert.deepEqual(failures, ["draft failed"]);
  assert.equal(lifecycle.isBusy("generating"), false);
});

test("selects exact-language, output-language, then first saved draft", () => {
  const drafts = [
    { source: { language: "en" }, outputLanguage: "en", id: "first" },
    { source: { language: "es" }, outputLanguage: "en", id: "exact" },
    { source: { language: "es" }, outputLanguage: "es", id: "output" }
  ];
  assert.equal(preferredEditorialDraft(drafts, "es", "en").id, "exact");
  assert.equal(preferredEditorialDraft(drafts, "fr", "es").id, "output");
  assert.equal(preferredEditorialDraft(drafts, "fr", "fr").id, "first");
  assert.equal(preferredEditorialDraft([], "es", "es"), null);
});
