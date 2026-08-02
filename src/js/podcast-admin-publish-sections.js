export const EPISODE_PUBLISH_STEPS = Object.freeze([
  "details",
  "media",
  "transcript",
  "monetization",
  "review",
  "publish"
]);

const PRODUCTION_SECTION_SELECTORS = Object.freeze({
  media: [
    "[data-podcast-audio-qc]",
    "[data-podcast-audio-master]",
    "[data-podcast-delivery-audio]",
    "[data-podcast-youtube-audio-episode]"
  ],
  transcript: [
    "[data-podcast-transcription-workbench]",
    "[data-podcast-transcript-workbench]",
    "[data-podcast-chapter-workbench]"
  ],
  review: [
    "[data-podcast-review-form]",
    "[data-podcast-publication-readiness]",
    "[data-podcast-clip-form]"
  ]
});

function disclosureFor(element) {
  return element?.closest?.("details.podcast-admin__progressive-section")
    || element
    || null;
}

export function productionSectionStep(section) {
  for (const [step, selectors] of Object.entries(
    PRODUCTION_SECTION_SELECTORS
  )) {
    if (selectors.some((selector) => section?.querySelector?.(selector))) {
      return step;
    }
  }
  return "";
}

export function mountEpisodePublishSections({
  root,
  publishPanel,
  episodeList,
  episodeForm,
  uploadForm,
  adPlanForm,
  productionGroup,
  productionSections
}) {
  if (!root?.ownerDocument || !publishPanel) {
    throw new TypeError("Publish-section root and publish panel are required");
  }

  const sections = new Map(
    EPISODE_PUBLISH_STEPS.map((step) => [step, new Set()])
  );
  const add = (step, element) => {
    const section = disclosureFor(element);
    if (!section) return;
    sections.get(step)?.add(section);
    const previous = section.dataset.podcastWorkflowPanels || "";
    section.dataset.podcastWorkflowPanels = Array.from(new Set(
      `${previous} ${step}`.trim().split(/\s+/).filter(Boolean)
    )).join(" ");
  };

  add("details", episodeForm);
  add("media", uploadForm);
  add("monetization", adPlanForm);
  add("publish", publishPanel);

  const unmatched = [];
  for (const section of Array.from(productionSections || [])) {
    const step = productionSectionStep(section);
    if (!step) {
      unmatched.push(section);
      continue;
    }
    add(step, section);
  }
  if (unmatched.length > 0) {
    throw new TypeError(
      `Every production section needs a publish step (${unmatched.length} missing)`
    );
  }

  const controlledSections = Array.from(new Set(
    Array.from(sections.values()).flatMap((entries) => Array.from(entries))
  ));
  const productionSteps = new Set(["media", "transcript", "review"]);
  let activeStep = "details";
  let enabled = false;

  function render() {
    root.dataset.podcastWorkflowStep = enabled ? activeStep : "";
    for (const section of controlledSections) {
      const steps = String(section.dataset.podcastWorkflowPanels || "")
        .split(/\s+/)
        .filter(Boolean);
      section.classList.toggle(
        "is-workflow-hidden",
        enabled && !steps.includes(activeStep)
      );
      if (
        enabled
        && steps.includes(activeStep)
        && section.matches?.("details.podcast-admin__progressive-section")
        && !productionSections?.includes?.(section)
      ) {
        section.open = true;
      }
    }
    episodeList?.classList?.toggle("is-workflow-hidden", enabled);
    if (productionGroup) {
      const showProduction = enabled && productionSteps.has(activeStep);
      productionGroup.classList.toggle(
        "is-workflow-hidden",
        enabled && !showProduction
      );
      productionGroup.classList.toggle(
        "podcast-admin__workflow-production",
        showProduction
      );
      if (enabled) productionGroup.open = showProduction;
    }
  }

  render();
  return Object.freeze({
    select(step) {
      const normalized = String(step || "");
      if (!sections.has(normalized)) return false;
      activeStep = normalized;
      render();
      return true;
    },
    setEnabled(value) {
      enabled = Boolean(value);
      render();
    },
    getActive() {
      return activeStep;
    },
    destroy() {
      enabled = false;
      render();
      delete root.dataset.podcastWorkflowStep;
      for (const section of controlledSections) {
        delete section.dataset.podcastWorkflowPanels;
      }
    }
  });
}
