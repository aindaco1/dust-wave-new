const TARGETS = Object.freeze({
  attach_media: [
    "[data-podcast-upload-form]",
    "[data-podcast-upload-form] [name=episodeId]"
  ],
  working_master: [
    "[data-podcast-audio-master]",
    "[data-podcast-audio-master-episode]"
  ],
  delivery_audio: [
    "[data-podcast-delivery-audio]",
    "[data-podcast-delivery-audio-episode]"
  ],
  alignment: [
    "[data-podcast-alignment]",
    "[data-podcast-transcript-episode]"
  ],
  chapters: [
    "[data-podcast-chapter-workbench]",
    "[data-podcast-chapter-episode]"
  ],
  production_review: [
    "[data-podcast-review-form]",
    "[data-podcast-review-episode]"
  ],
  promotion_clips: [
    "[data-podcast-clip-form]",
    "[data-podcast-transcript-episode]"
  ]
});

export function selectWorkflowEpisode(control, episodeId) {
  if (!control || !episodeId) return;
  control.value = String(episodeId);
  const EventConstructor = control.ownerDocument?.defaultView?.Event;
  if (EventConstructor) {
    control.dispatchEvent(new EventConstructor("change", { bubbles: true }));
  }
}

export function revealWorkflowTarget(target, document) {
  let disclosure = target?.closest?.("details") || null;
  while (disclosure) {
    if (disclosure.classList.contains("podcast-admin__progressive-section")) {
      for (const sibling of disclosure.parentElement?.children || []) {
        if (
          sibling !== disclosure
          && sibling.matches?.(
            "details.podcast-admin__progressive-section[open]"
          )
        ) {
          sibling.open = false;
        }
      }
    }
    disclosure.open = true;
    disclosure = disclosure.parentElement?.closest?.("details") || null;
  }
  queueMicrotask(() => {
    const reduceMotion = document.defaultView
      ?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView?.({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
    const focusTarget = target?.matches?.("button, input, select, textarea")
      ? target
      : target?.querySelector?.("button, input, select, textarea");
    focusTarget?.focus?.({ preventScroll: true });
  });
}

export function createExactWorkflowNavigator(root) {
  if (!root?.ownerDocument) {
    throw new TypeError("A workflow root is required");
  }
  return function navigateExactWorkflowTarget(target, episodeId) {
    const [targetSelector, controlSelector] = TARGETS[target] || [];
    const element = targetSelector && root.querySelector(targetSelector);
    if (!element) return false;
    selectWorkflowEpisode(root.querySelector(controlSelector), episodeId);
    revealWorkflowTarget(element, root.ownerDocument);
    return true;
  };
}
