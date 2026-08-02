import assert from "node:assert/strict";
import test from "node:test";
import {
  EPISODE_PUBLISH_STEPS,
  mountEpisodePublishSections,
  productionSectionStep
} from "../src/js/podcast-admin-publish-sections.js";

function classList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    contains: (name) => values.has(name),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle(name, force) {
      const enabled = force === undefined ? !values.has(name) : Boolean(force);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    }
  };
}

function element({ selectors = [], progressive = false } = {}) {
  return {
    classList: classList(),
    dataset: {},
    open: false,
    ownerDocument: {},
    querySelector(selector) {
      return selectors.includes(selector) ? {} : null;
    },
    matches(selector) {
      return progressive
        && selector === "details.podcast-admin__progressive-section";
    }
  };
}

function tool(section) {
  return {
    closest(selector) {
      return selector === "details.podcast-admin__progressive-section"
        ? section
        : null;
    }
  };
}

test("production sections map to exactly one publish submenu section", () => {
  assert.equal(productionSectionStep(element({
    selectors: ["[data-podcast-audio-master]"]
  })), "media");
  assert.equal(productionSectionStep(element({
    selectors: ["[data-podcast-transcript-workbench]"]
  })), "transcript");
  assert.equal(productionSectionStep(element({
    selectors: ["[data-podcast-publication-readiness]"]
  })), "review");
  assert.equal(productionSectionStep(element()), "");
});

test("publish submenu shows only its section without moving or scrolling", () => {
  const root = element();
  const details = element({ progressive: true });
  const upload = element({ progressive: true });
  const monetization = element({ progressive: true });
  const publish = element();
  const media = element({
    progressive: true,
    selectors: ["[data-podcast-audio-qc]"]
  });
  const transcript = element({
    progressive: true,
    selectors: ["[data-podcast-chapter-workbench]"]
  });
  const review = element({
    progressive: true,
    selectors: ["[data-podcast-review-form]"]
  });
  const episodeList = element();
  const productionGroup = element({ progressive: true });
  const mounted = mountEpisodePublishSections({
    root,
    publishPanel: publish,
    episodeList,
    episodeForm: tool(details),
    uploadForm: tool(upload),
    adPlanForm: tool(monetization),
    productionGroup,
    productionSections: [media, transcript, review]
  });

  mounted.setEnabled(true);
  const sections = {
    details,
    upload,
    monetization,
    publish,
    media,
    transcript,
    review
  };
  const expectedVisible = {
    details: ["details"],
    media: ["upload", "media"],
    transcript: ["transcript"],
    monetization: ["monetization"],
    review: ["review"],
    publish: ["publish"]
  };

  for (const step of [...EPISODE_PUBLISH_STEPS, "details"]) {
    assert.equal(mounted.select(step), true);
    assert.equal(mounted.getActive(), step);
    for (const [name, section] of Object.entries(sections)) {
      assert.equal(
        section.classList.contains("is-workflow-hidden"),
        !expectedVisible[step].includes(name),
        `${name} visibility must be replaced when ${step} is selected`
      );
    }
    assert.equal(
      productionGroup.classList.contains("is-workflow-hidden"),
      !["media", "transcript", "review"].includes(step)
    );
  }

  assert.equal(episodeList.classList.contains("is-workflow-hidden"), true);
  assert.equal(
    productionGroup.dataset.podcastWorkflowContainer,
    ""
  );
  assert.equal(mounted.select("unknown"), false);

  mounted.setEnabled(false);
  for (const section of [details, upload, monetization, publish, media,
    transcript, review, episodeList, productionGroup]) {
    assert.equal(section.classList.contains("is-workflow-hidden"), false);
  }

  mounted.destroy();
  assert.equal(
    "podcastWorkflowContainer" in productionGroup.dataset,
    false
  );
});

test("new production sections fail closed until assigned to the submenu", () => {
  assert.throws(() => mountEpisodePublishSections({
    root: element(),
    publishPanel: element(),
    episodeForm: tool(element({ progressive: true })),
    uploadForm: tool(element({ progressive: true })),
    adPlanForm: tool(element({ progressive: true })),
    productionSections: [element({ progressive: true })]
  }), /Every production section needs a publish step/);
});
