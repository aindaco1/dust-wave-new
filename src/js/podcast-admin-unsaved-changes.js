import {
  mountUnsavedChangesGuard
} from "./dust-wave-admin-shell/unsaved-changes.js?v=0.8.0";
import {
  mountPodcastReviewDraftGuard as mountReviewDraftGuard
} from "./podcast-admin-unsaved-changes-core.js";

export function mountPodcastReviewDraftGuard(options) {
  return mountReviewDraftGuard({ ...options, mountUnsavedChangesGuard });
}
