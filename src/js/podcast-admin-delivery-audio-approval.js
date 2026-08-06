import {
  normalizeAdminIdentifier,
  normalizeAdminReason
} from "./podcast-admin-request-security.js";

export function buildDeliveryAudioApprovalRequest({
  job,
  selectedEpisodeId,
  currentMasterId,
  approvalReason,
  acknowledged
}) {
  const jobId = normalizeAdminIdentifier(job?.id);
  const episodeId = normalizeAdminIdentifier(selectedEpisodeId);
  const jobEpisodeId = normalizeAdminIdentifier(job?.episodeId);
  const masterId = normalizeAdminIdentifier(currentMasterId);
  const sourceMasterId = normalizeAdminIdentifier(job?.sourceMasterId);
  const reason = normalizeAdminReason(approvalReason, {
    minimumLength: 10,
    maximumLength: 500
  });
  if (
    !jobId
    || !episodeId
    || jobEpisodeId !== episodeId
    || !masterId
    || sourceMasterId !== masterId
    || job?.status !== "ready"
    || job?.current !== true
    || job?.approval?.eligible !== true
    || acknowledged !== true
    || !reason
  ) return null;
  return {
    path: `/v1/admin/delivery-audio-jobs/${encodeURIComponent(jobId)}/approve`,
    options: {
      method: "POST",
      body: {
        workingMasterId: masterId,
        approvalReason: reason
      }
    }
  };
}
