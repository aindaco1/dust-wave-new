import { AdminApiError } from "./dust-wave-admin-shell/api-client.js?v=0.9.0";

function unresolvedBlocker(node) {
  return node?.severity === "blocker"
    && !["ready", "not_applicable"].includes(String(node?.status || ""));
}

function publicationBody(readiness) {
  if (String(readiness?.publicationGateMode || "legacy") === "legacy") {
    return {};
  }
  return {
    snapshotDigest: String(readiness?.snapshotDigest || ""),
    basePublicationRevision: Number(readiness?.publicationRevision || 0)
  };
}

function publishedStatus(result, text, humanizeCode) {
  if (result.idempotent) {
    return text("alreadyPublishedRevision", {
      revision: result.publicationRevision
    });
  }
  const gate = result.publicationGate || {};
  return [
    text("revisionStatus", {
      revision: result.publicationRevision,
      status: humanizeCode(result.status)
    }),
    text("directoryStatesCreated", { count: result.distributionTargets }),
    gate.overridden
      ? text("candidateBlockersOverridden")
      : gate.mode === "shadow"
        ? gate.snapshotMatched
          ? text("shadowSnapshotMatched")
          : text("shadowSnapshotMismatch")
        : ""
  ].filter(Boolean).join(" ");
}

export function createEpisodePublisher({
  client,
  confirmationDialog,
  text,
  nodeLabel,
  operationId,
  report,
  friendlyError,
  humanizeCode,
  onReadiness,
  onPublished
}) {
  if (!client?.request || !confirmationDialog?.open) {
    throw new TypeError("Publication client and confirmation dialog are required");
  }

  return async function publishEpisode(episodeId, button) {
    button.disabled = true;
    report(text("refreshingPublicationEvidence"));
    try {
      const readiness = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/readiness`
      );
      onReadiness?.(episodeId, readiness);
      const mode = String(readiness.publicationGateMode || "legacy");
      const candidate = readiness.candidateGate || {};
      const body = publicationBody(readiness);
      let publicationConfirmed = false;

      if (mode === "enforce" && !candidate.ready) {
        if (!candidate.overrideAvailable) {
          throw new AdminApiError(text("resolvePublicationBlockers"), {
            status: 409,
            code: "publication_not_ready",
            details: readiness
          });
        }
        const override = await confirmationDialog.open({
          title: text("publishOverrideTitle"),
          description: text("overrideConfirm"),
          items: (readiness.nodes || [])
            .filter(unresolvedBlocker)
            .map(nodeLabel),
          field: {
            label: text("enterOverrideReason"),
            maxLength: 500,
            required: true,
            requiredMessage: text("overrideReasonInvalid")
          },
          confirmLabel: text("publishWithBlockers"),
          returnFocus: button
        });
        if (!override.confirmed) {
          report(text("publicationOverrideCanceled"));
          return;
        }
        const normalizedReason = override.value
          .normalize("NFKC")
          .replace(/\s+/g, " ")
          .trim();
        if (!normalizedReason || normalizedReason.length > 500) {
          throw new AdminApiError(text("overrideReasonInvalid"), {
            status: 400,
            code: "publication_override_reason_invalid"
          });
        }
        body.override = {
          id: operationId("publication_override"),
          reason: normalizedReason,
          confirmation: "PUBLISH_WITH_BLOCKERS"
        };
        publicationConfirmed = true;
      }

      if (!publicationConfirmed) {
        const confirmation = await confirmationDialog.open({
          title: text("publishConfirmTitle"),
          description: text("publishConfirmDescription"),
          items: [
            text("publishDestinationNews"),
            text("publishDestinationRss"),
            text("publishDestinationYoutube")
          ],
          confirmLabel: text("publishReviewedEpisode"),
          returnFocus: button
        });
        if (!confirmation.confirmed) {
          report(text("publicationCanceled"));
          return;
        }
      }

      report(
        mode === "enforce"
          ? text("publishingEnforcedSnapshot")
          : mode === "shadow"
            ? text("publishingShadowSnapshot")
            : text("publishingLegacyChecks")
      );
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/publish`,
        { method: "POST", body }
      );
      report(publishedStatus(result, text, humanizeCode));
      await onPublished?.(episodeId, result);
    } catch (error) {
      report(friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  };
}
