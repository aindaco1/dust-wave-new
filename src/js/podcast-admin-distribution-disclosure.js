const CERTIFICATION_FIELDS = [
  "ownerVerified",
  "feedValidated",
  "ingestionObserved",
  "failureRecoveryVerified"
];

export function distributionEvidenceProgress(certification = {}) {
  return {
    ready: CERTIFICATION_FIELDS.filter((field) => Boolean(certification[field]))
      .length,
    total: CERTIFICATION_FIELDS.length
  };
}

export function distributionEvidenceSummary(destination, text) {
  const providerType = destination?.mode === "direct_api"
    ? text("directProviderAdapter")
    : text("rssFollowingDirectory");
  const automatic = destination?.listingUrl
    && ["verified", "not_required"].includes(
      String(destination?.ownerSetupStatus || "")
    )
    ? ` · ${text("automaticListingChecksActive")}`
    : "";
  return `${providerType} · ${text(
    "directoryEvidenceReadySummary",
    distributionEvidenceProgress(destination?.certification)
  )}${automatic}`;
}

export function distributionSetupLinkLabelKey(destination) {
  return String(destination?.ownerSetupStatus || "") === "not_required"
    ? "openProviderInfo"
    : "openOwnerSetup";
}

export function createDistributionDisclosureState() {
  const expandedByShow = new Map();
  const initializedShows = new Set();

  function expandedSet(showId) {
    const key = String(showId || "");
    if (!expandedByShow.has(key)) expandedByShow.set(key, new Set());
    return expandedByShow.get(key);
  }

  return {
    prepare(showId, destinations = []) {
      const key = String(showId || "");
      const expanded = expandedSet(key);
      if (!initializedShows.has(key)) {
        const firstActionable = destinations.find((destination) => (
          destination?.enabled && !destination?.certification?.certified
        ));
        const destinationId = String(firstActionable?.id || "");
        if (destinationId) expanded.add(destinationId);
        initializedShows.add(key);
      }
      return new Set(expanded);
    },

    context(showId, destinations) {
      const key = String(showId || "");
      return {
        showId: key,
        openDestinationIds: this.prepare(key, destinations)
      };
    },

    set(showId, destinationId, open) {
      const expanded = expandedSet(showId);
      const key = String(destinationId || "");
      if (!key) return;
      if (open) expanded.add(key);
      else expanded.delete(key);
    },

    mount(card, context, destinationId) {
      const key = String(destinationId || "");
      card.dataset.destinationId = key;
      card.open = context.openDestinationIds.has(key);
      card.addEventListener("toggle", () => {
        this.set(context.showId, key, card.open);
      });
    }
  };
}
