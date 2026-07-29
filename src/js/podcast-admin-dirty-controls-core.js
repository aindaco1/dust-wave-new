export function syncReviewDraftButton(
  button,
  dirty,
  text,
  setDirtyButtonState
) {
  const label = text("saveReviewDraft");
  return setDirtyButtonState(button, dirty, label, label);
}
