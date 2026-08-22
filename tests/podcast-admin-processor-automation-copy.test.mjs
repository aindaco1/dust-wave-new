import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readNunjucksSource } from "../scripts/lib/read-nunjucks-source.mjs";

const localePaths = {
  en: new URL("../src/_data/i18n/en.json", import.meta.url),
  es: new URL("../src/_data/i18n/es.json", import.meta.url)
};

const automaticProcessorKeys = [
  "deliveryAudioQueued",
  "deliveryAudioRunWorkflow",
  "youtubeAudioQueued",
  "youtubeAudioRunWorkflow",
  "transcriptionChunkWorkflow",
  "runAlignmentWorkflow",
  "alignmentRecorded",
  "noAlignmentJob",
  "qcQueuedNoChange",
  "qcRunQueued",
  "enhancementPreviewQueued",
  "derivativeQueued",
  "runDerivativeWorkflow",
  "waitingForStagingWorkflow",
  "renderManifestExists",
  "renderManifestCreated"
];

test("processor status copy describes automatic work in both locales", async () => {
  for (const [locale, path] of Object.entries(localePaths)) {
    const messages = JSON.parse(await readFile(path, "utf8"));
    const admin = messages.runtime.admin;
    for (const key of automaticProcessorKeys) {
      const value = admin[key];
      assert.equal(typeof value, "string", `${locale}.${key} must exist`);
      assert.ok(value.length > 0, `${locale}.${key} must not be empty`);
      assert.doesNotMatch(
        value,
        locale === "en"
          ? /\b(?:manually dispatch|dispatch the|run the|run process-)\b/i
          : /\b(?:manualmente|ejecuta|despacha)\b/i,
        `${locale}.${key} must not instruct a manual processor dispatch`
      );
      assert.match(
        value,
        locale === "en" ? /automatic/i : /automátic/i,
        `${locale}.${key} must explain the automatic processor state`
      );
    }
  }
});

test("alignment recovery stays secondary to automatic processing", async () => {
  const template = await readNunjucksSource(
    new URL("../src/admin/podcasts/index.njk", import.meta.url)
  );
  const alignment = template.match(
    /<section class="podcast-admin__alignment"[\s\S]*?<section class="podcast-admin__benchmark"/
  )?.[0];
  assert.equal(typeof alignment, "string");
  assert.match(
    alignment,
    /<details class="podcast-admin__advanced-tools podcast-admin__distribution-guidance">/
  );
  assert.match(alignment, /alignmentRecoveryIntro/);
  assert.match(
    alignment,
    /class="btn btn-outline-light"[^>]+data-podcast-alignment-queue/
  );
  assert.doesNotMatch(
    alignment,
    /class="btn btn-danger"[^>]+data-podcast-alignment-queue/
  );
});

test("queueing a clip render does not download a manual processor manifest", async () => {
  const source = await readFile(
    new URL("../src/js/podcast-admin.js", import.meta.url),
    "utf8"
  );
  const prepareClipRender = source.match(
    /async function prepareClipRender\(\) \{[\s\S]*?\n  \}\n\n  function updateAdPlanFields/
  )?.[0];
  assert.equal(typeof prepareClipRender, "string");
  assert.doesNotMatch(prepareClipRender, /downloadJson\(/);
  assert.match(prepareClipRender, /\/v1\/admin\/clips\/.*\/render/);
});
