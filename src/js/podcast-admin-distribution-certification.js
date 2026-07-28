export function renderDistributionLaunchClaim({
  launchClaim,
  text,
  formatDate,
  formatInteger,
  badge
}) {
  const ready = Boolean(launchClaim.ready);
  const required = Math.max(
    10,
    Number(launchClaim.requiredDestinations) || 0
  );
  const certified = Math.max(
    0,
    Number(launchClaim.certifiedDestinations) || 0
  );
  const remaining = Math.max(
    0,
    Number(launchClaim.remainingDestinations)
      || required - certified
  );
  const section = document.createElement("section");
  section.className = ready
    ? "podcast-admin__distribution-claim is-ready"
    : "podcast-admin__distribution-claim";
  section.setAttribute(
    "aria-labelledby",
    "podcast-distribution-launch-claim-title"
  );
  const heading = document.createElement("div");
  heading.className = "podcast-admin__directory-heading";
  const title = document.createElement("h3");
  title.id = "podcast-distribution-launch-claim-title";
  title.textContent = ready
    ? text("launchClaimReady")
    : text("launchClaimPending");
  heading.append(
    title,
    badge(
      ready
        ? text("certificationComplete")
        : text("certificationIncomplete"),
      ready ? "is-ready" : ""
    )
  );
  const summary = document.createElement("p");
  summary.textContent = ready
    ? text("launchClaimReadySummary", { count: certified })
    : text("launchClaimPendingSummary", {
        certified,
        required,
        remaining
      });
  const feed = launchClaim.feedValidation || {};
  const feedStatus = document.createElement("p");
  feedStatus.className = "podcast-admin__directory-details";
  if (feed.status === "valid" && feed.currentValidator === false) {
    feedStatus.classList.add("podcast-admin__status", "is-error");
    feedStatus.textContent = text("feedValidationStale", {
      version: String(feed.validatorVersion || "unknown")
    });
  } else if (feed.status === "valid") {
    feedStatus.textContent = text("feedValidationSummary", {
      date: formatDate(feed.validatedAt),
      items: formatInteger(Math.max(0, Number(feed.itemCount) || 0))
    });
  } else if (feed.status === "failed") {
    feedStatus.classList.add("podcast-admin__status", "is-error");
    feedStatus.textContent = text("feedValidationFailed", {
      code: String(feed.failureCode || "feed_validation_failed")
    });
  } else {
    feedStatus.textContent = text("feedValidationPending");
  }
  section.append(heading, summary, feedStatus);
  return section;
}

export function distributionCertificationList({
  certification,
  text
}) {
  const list = document.createElement("ul");
  list.className = "podcast-admin__certification-list";
  list.setAttribute(
    "aria-label",
    text("launchCertification")
  );
  for (const [label, ready] of [
    [
      text("ownerVerificationEvidence"),
      Boolean(certification.ownerVerified)
    ],
    [
      text("feedValidationEvidence"),
      Boolean(certification.feedValidated)
    ],
    [
      text("ingestionObservationEvidence"),
      Boolean(certification.ingestionObserved)
    ],
    [
      text("failureRecoveryEvidence"),
      Boolean(certification.failureRecoveryVerified)
    ]
  ]) {
    const item = document.createElement("li");
    if (ready) item.classList.add("is-ready");
    const name = document.createElement("span");
    name.textContent = label;
    const status = document.createElement("strong");
    status.textContent = ready
      ? text("evidenceVerified")
      : text("evidenceMissing");
    item.append(name, status);
    list.append(item);
  }
  return list;
}
