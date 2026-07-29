import {
  mountProgressiveTools
} from "./podcast-admin-progressive-sections.js";

export function mountPodcastAdminToolDisclosure({
  root,
  text,
  episodeForm,
  uploadForm,
  adPlanForm,
  adPlanResult,
  audioQcPolicyForm,
  marketingLinkForm,
  embedForm,
  shareCardForm,
  announcementForm,
  announcementHistory,
  campaignForm,
  creativeForm
}) {
  const episodeTools = mountProgressiveTools([
    { element: episodeForm },
    { element: uploadForm },
    { element: adPlanForm, related: [adPlanResult] }
  ], {
    label: text("episodeToolsAria")
  });
  mountProgressiveTools([{ element: audioQcPolicyForm }], {
    label: text("productionToolsAria")
  });
  mountProgressiveTools([
    { element: marketingLinkForm },
    { element: embedForm },
    { element: shareCardForm },
    {
      element: announcementForm,
      related: [
        announcementHistory?.closest(".podcast-admin__announcement-history")
      ]
    }
  ], {
    label: text("marketingToolsAria")
  });
  mountProgressiveTools([
    "[data-podcast-transcript-import]",
    "[data-podcast-transcript-diagnostics]",
    "[data-podcast-transcript-search]",
    "[data-podcast-transcript-speaker-range]",
    "[data-podcast-alignment]"
  ].map((selector) => ({ element: root.querySelector(selector) })), {
    label: text("transcriptToolsAria")
  });
  mountProgressiveTools([
    { element: campaignForm },
    { element: creativeForm }
  ], {
    label: text("sponsorToolsAria")
  });
  mountProgressiveTools([
    "[data-podcast-show-prices]",
    "[data-podcast-site-projection]"
  ].map((selector) => ({ element: root.querySelector(selector) })), {
    label: text("settingsToolsAria")
  });
  return episodeTools;
}
