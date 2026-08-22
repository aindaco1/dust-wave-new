const RELEASE_EPISODE_STATUSES = new Set(["scheduled", "published"]);

export function distributionReleaseEpisodes(episodes = []) {
  return Array.from(episodes).filter((episode) => (
    RELEASE_EPISODE_STATUSES.has(String(episode?.status || ""))
  ));
}

export function distributionDirectoryView(destination = {}, episodeId = "") {
  const ownerSetupStatus = String(destination.ownerSetupStatus || "");
  const publicationStatus = String(destination.publicationStatus || "");

  if (!destination.enabled) {
    return { key: "distributionNotUsed", tone: "", rank: 6 };
  }
  if (!["verified", "not_required"].includes(ownerSetupStatus)) {
    return ownerSetupStatus === "pending"
      ? { key: "distributionSetupInProgress", tone: "", rank: 2 }
      : { key: "distributionSetupRequired", tone: "is-attention", rank: 1 };
  }
  if (episodeId) {
    if (publicationStatus === "failed") {
      return {
        key: "distributionNeedsAttention",
        tone: "is-attention",
        rank: 0
      };
    }
    if (publicationStatus === "observed") {
      return { key: "distributionLive", tone: "is-ready", rank: 5 };
    }
    if ([
      "waiting_for_feed",
      "queued",
      "running",
      "processing",
      "succeeded"
    ].includes(publicationStatus)) {
      return { key: "distributionCheckingListing", tone: "", rank: 3 };
    }
  }
  if (destination.certification?.certified) {
    return { key: "distributionReady", tone: "is-ready", rank: 5 };
  }
  return { key: "distributionNeedsVerification", tone: "", rank: 3 };
}

export function orderDistributionDestinations(destinations = [], episodeId = "") {
  return Array.from(destinations).sort((left, right) => {
    const rankDifference = distributionDirectoryView(left, episodeId).rank
      - distributionDirectoryView(right, episodeId).rank;
    if (rankDifference) return rankDifference;
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  });
}

export function createDistributionProgress({
  document,
  formatInteger,
  release = false,
  summary = {},
  text
}) {
  const section = document.createElement("section");
  section.className = "podcast-admin__distribution-progress";
  const heading = document.createElement("h3");
  heading.textContent = text(
    release ? "episodeDistributionProgress" : "showDistributionProgress"
  );
  const description = document.createElement("p");
  description.textContent = text("distributionProgressSummary", {
    ready: formatInteger(summary.certified),
    total: formatInteger(summary.total)
  });
  const metrics = document.createElement("div");
  metrics.className =
    "podcast-admin__metric-grid podcast-admin__distribution-summary";
  for (const [value, label] of [
    [summary.total, text("distributionDirectories")],
    [summary.setupRequired, text("distributionNeedSetup")],
    [summary.certified, text("distributionReady")],
    ...(release ? [[summary.observed, text("distributionLive")]] : [])
  ]) {
    const card = document.createElement("article");
    const strong = document.createElement("strong");
    strong.textContent = Number.isFinite(Number(value))
      ? String(Number(value))
      : "—";
    const span = document.createElement("span");
    span.textContent = label;
    card.append(strong, span);
    metrics.append(card);
  }
  section.append(heading, description, metrics);
  return section;
}
