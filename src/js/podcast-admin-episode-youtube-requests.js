import { normalizeAdminIdentifier } from "./podcast-admin-request-security.js";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const TITLE_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const DESCRIPTION_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function buildEpisodeYouTubeDraftRequest({
  episodeId,
  publicationId,
  publicationRevision,
  title,
  description,
  privacyStatus,
  confirmChannelUrl
}) {
  const normalizedEpisodeId = normalizeAdminIdentifier(episodeId);
  const normalizedPublicationId = normalizeAdminIdentifier(publicationId);
  const revision = Number(publicationRevision);
  const normalizedTitle = String(title || "").trim();
  const normalizedDescription = String(description || "").trim();
  const normalizedChannelUrl = String(confirmChannelUrl || "").trim();
  if (
    !normalizedEpisodeId
    || !normalizedPublicationId
    || !Number.isSafeInteger(revision)
    || revision <= 0
    || privacyStatus !== "unlisted"
    || !normalizedTitle
    || normalizedTitle.length > 100
    || TITLE_CONTROL_PATTERN.test(normalizedTitle)
    || normalizedDescription.length > 5_000
    || DESCRIPTION_CONTROL_PATTERN.test(normalizedDescription)
    || !normalizedChannelUrl
    || normalizedChannelUrl.length > 2_000
  ) return null;
  return {
    path: `/v1/admin/episodes/${encodeURIComponent(normalizedEpisodeId)}/youtube`,
    options: {
      method: "POST",
      body: {
        publicationId: normalizedPublicationId,
        expectedPublicationRevision: revision,
        title: normalizedTitle,
        description: normalizedDescription,
        privacyStatus: "unlisted",
        confirmChannelUrl: normalizedChannelUrl
      }
    }
  };
}

export function buildEpisodeYouTubeReconciliationRequest({
  publicationId,
  outcome,
  providerVideoId,
  confirmed
}) {
  const normalizedPublicationId = normalizeAdminIdentifier(publicationId);
  if (!normalizedPublicationId) return { error: "invalid" };
  if (outcome !== "uploaded" && outcome !== "not_uploaded") {
    return { error: "invalid" };
  }
  if (!confirmed) return { error: "confirmation_required" };
  const normalizedProviderVideoId = String(providerVideoId || "").trim();
  if (
    outcome === "uploaded"
    && !VIDEO_ID_PATTERN.test(normalizedProviderVideoId)
  ) return { error: "provider_id_required" };
  return {
    request: {
      path: `/v1/admin/episode-youtube-publications/${encodeURIComponent(
        normalizedPublicationId
      )}/reconcile`,
      options: {
        method: "POST",
        body: {
          outcome,
          providerVideoId: outcome === "uploaded"
            ? normalizedProviderVideoId
            : "",
          confirmation: outcome === "uploaded"
            ? "CONFIRM_VERIFIED_UNLISTED_VIDEO"
            : "CONFIRM_NO_CHANNEL_VIDEO_REMAINS"
        }
      }
    }
  };
}

export function validEpisodeYouTubeIdentifier(value) {
  return Boolean(normalizeAdminIdentifier(value));
}
