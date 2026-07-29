export function mountPodcastReviewDraftGuard({
  mountUnsavedChangesGuard,
  eventTarget = globalThis,
  confirmDiscard,
  showSelects = [],
  transcriptEpisodeSelect,
  transcriptLanguageSelect,
  chapterEpisodeSelect,
  logoutButton,
  hasTranscriptChanges,
  hasChapterChanges,
  discardTranscriptChanges,
  discardChapterChanges,
  loadTranscript,
  loadChapters,
  message
} = {}) {
  if (typeof mountUnsavedChangesGuard !== "function") {
    throw new TypeError("An unsaved-change controller is required");
  }
  for (const callback of [
    hasTranscriptChanges,
    hasChapterChanges,
    discardTranscriptChanges,
    discardChapterChanges
  ]) {
    if (typeof callback !== "function") {
      throw new TypeError("Podcast review draft callbacks are required");
    }
  }

  const hasReviewDraftChanges = () =>
    hasTranscriptChanges() || hasChapterChanges();
  const guard = mountUnsavedChangesGuard({
    eventTarget,
    confirmDiscard,
    hasUnsavedChanges: hasReviewDraftChanges
  });
  const contextControls = [];
  const cleanup = [];

  function confirmationMessage() {
    return typeof message === "function" ? message() : String(message || "");
  }

  function protectControl(control, {
    hasChanges,
    discardChanges,
    onAccepted,
    eventName = "change"
  }) {
    if (!control?.addEventListener) return;
    let acceptedValue = String(control.value || "");
    const remember = () => {
      acceptedValue = String(control.value || "");
    };
    const change = (event) => {
      if (
        !guard.confirmTransition(confirmationMessage(), hasChanges)
      ) {
        control.value = acceptedValue;
        event?.preventDefault?.();
        event?.stopImmediatePropagation?.();
        return;
      }
      discardChanges();
      remember();
      onAccepted?.();
    };
    control.addEventListener("focus", remember);
    control.addEventListener("pointerdown", remember);
    control.addEventListener(eventName, change);
    contextControls.push(remember);
    cleanup.push(() => {
      control.removeEventListener?.("focus", remember);
      control.removeEventListener?.("pointerdown", remember);
      control.removeEventListener?.(eventName, change);
    });
  }

  for (const showSelect of showSelects) {
    protectControl(showSelect, {
      hasChanges: hasReviewDraftChanges,
      discardChanges() {
        discardTranscriptChanges();
        discardChapterChanges();
        queueMicrotask(() => controller.syncContexts());
      }
    });
  }
  for (const control of [
    transcriptEpisodeSelect,
    transcriptLanguageSelect
  ]) {
    protectControl(control, {
      hasChanges: hasTranscriptChanges,
      discardChanges: discardTranscriptChanges,
      onAccepted: loadTranscript
    });
  }
  protectControl(chapterEpisodeSelect, {
    hasChanges: hasChapterChanges,
    discardChanges: discardChapterChanges,
    onAccepted: loadChapters
  });
  protectControl(logoutButton, {
    eventName: "click",
    hasChanges: hasReviewDraftChanges,
    discardChanges() {
      discardTranscriptChanges();
      discardChapterChanges();
    }
  });

  const controller = Object.freeze({
    confirmTransition: guard.confirmTransition,
    disconnect() {
      cleanup.splice(0).forEach((remove) => remove());
      guard.disconnect();
    },
    hasUnsavedChanges: guard.hasUnsavedChanges,
    syncContexts() {
      contextControls.forEach((remember) => remember());
    }
  });
  return controller;
}
