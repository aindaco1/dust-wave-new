import {
  mountUnsavedChangesGuard
} from "./dust-wave-admin-shell/unsaved-changes.js?v=0.10.1";
import {
  mountPodcastReviewDraftGuard as mountReviewDraftGuard
} from "./podcast-admin-unsaved-changes-core.js";

export function mountPodcastReviewDraftGuard(options) {
  return mountReviewDraftGuard({ ...options, mountUnsavedChangesGuard });
}
