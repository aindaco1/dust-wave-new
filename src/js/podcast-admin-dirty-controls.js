import {
  setDirtyButtonState
} from "./dust-wave-admin-shell/dirty-controls.js?v=0.8.1";
import {
  syncReviewDraftButton as syncDraftButton
} from "./podcast-admin-dirty-controls-core.js";

export function syncReviewDraftButton(button, dirty, text) {
  return syncDraftButton(button, dirty, text, setDirtyButtonState);
}
