import { AdminApiError } from "./dust-wave-admin-shell/api-client.js?v=0.10.2";
import { AdminDownloadError } from "./dust-wave-admin-shell/credentialed-download.js?v=0.10.2";
import { adminText } from "./podcast-admin-text.js";

export function friendlyPodcastAdminError(error) {
  if (error instanceof AdminDownloadError) {
    if (error.code === "download_too_large") {
      return adminText("downloadTooLarge");
    }
    if (error.code === "download_content_type_invalid") {
      return adminText("downloadTypeInvalid");
    }
    return adminText("downloadFailed");
  }
  if (!(error instanceof AdminApiError)) {
    return adminText("serviceUnavailable");
  }
  const groupedCode = {
    audio_qc_completion_conflict: "audio_qc_run_conflict",
    publication_conflict: "publication_snapshot_stale",
    review_comment_revision_conflict: "review_revision_conflict",
    review_comment_id_conflict: "review_mutation_conflict"
  }[error.code] || (
    error.code.startsWith("publication_override_")
      ? "publication_override_invalid"
      : error.code.startsWith("transcription_")
        ? "transcription_invalid"
        : error.code
  );
  const translated = window.DustWaveI18n?.t(
    `admin.error_${groupedCode}`,
    {
      details: (
        error.code === "campaign_not_ready"
          || error.code === "show_delete_blocked"
          ? error.details?.blockers || []
          : error.details?.missing || []
      ).map(humanizeCode).join(", ")
    }
  );
  if (translated && !translated.startsWith("[missing:")) return translated;
  return adminText("unknownError");
}

function humanizeCode(value) {
  return String(value || "").replace(/_/g, " ");
}
