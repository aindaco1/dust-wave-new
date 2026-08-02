export function mountShowTaxPolicy({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  canConfigure,
  onSaved
}) {
  const panel = root.querySelector("[data-podcast-tax-policy]");
  const currentSummary = root.querySelector(
    "[data-podcast-tax-policy-current]"
  );
  const candidateSummary = root.querySelector(
    "[data-podcast-tax-policy-candidate]"
  );
  const form = root.querySelector("[data-podcast-tax-policy-form]");
  const confirmationHint = root.querySelector(
    "[data-podcast-tax-policy-confirmation-hint]"
  );
  const status = root.querySelector("[data-podcast-tax-policy-status]");
  let show = null;
  let candidate = null;
  let requestId = 0;

  form?.addEventListener("submit", approveCandidate);

  return { setShow, load: loadPolicy };

  function setShow(nextShow) {
    show = nextShow || null;
    candidate = null;
    requestId += 1;
    const visible = Boolean(show && canConfigure());
    if (panel) panel.hidden = !visible;
    currentSummary?.replaceChildren();
    candidateSummary?.replaceChildren();
    if (form) {
      form.hidden = true;
      form.reset();
    }
    setStatus(status, "");
    if (visible) void loadPolicy();
  }

  async function loadPolicy() {
    if (!show) return;
    const showId = show.id;
    const currentRequest = ++requestId;
    setStatus(status, text("loadingTaxPolicy"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/tax-policy`
      );
      if (currentRequest !== requestId || show?.id !== showId) return;
      renderConfiguration(payload);
    } catch (error) {
      if (currentRequest === requestId) {
        setStatus(status, friendlyError(error), true);
      }
    }
  }

  function renderConfiguration(payload) {
    if (
      !show
      || !currentSummary
      || !candidateSummary
      || !form
      || !confirmationHint
    ) return;
    const policies = Array.isArray(payload?.policies) ? payload.policies : [];
    candidate = validCandidate(payload?.candidate) ? payload.candidate : null;
    currentSummary.replaceChildren();
    if (policies.length) {
      appendEvidence(
        currentSummary,
        text("taxPolicyCurrent"),
        policies.map(policySummary).join(" · ")
      );
    } else {
      appendEvidence(
        currentSummary,
        text("taxPolicyCurrent"),
        text("taxPolicyNotApproved")
      );
    }
    candidateSummary.replaceChildren();
    if (!candidate) {
      form.hidden = true;
      setStatus(status, text("taxPolicyNoCandidate"));
      return;
    }
    appendEvidence(
      candidateSummary,
      text("taxPolicyCandidateRate"),
      `${formatTaxPercentage(candidate.ratePartsPerMillion)} · ${
        candidate.inclusive
          ? text("taxPolicyInclusive")
          : text("taxPolicyExclusive")
      }`
    );
    appendEvidence(
      candidateSummary,
      text("taxPolicyCandidateJurisdiction"),
      candidate.jurisdictionCode
    );
    appendEvidence(
      candidateSummary,
      text("taxPolicyCandidateSource"),
      candidate.sourceReference
    );
    appendEvidence(
      candidateSummary,
      text("taxPolicyCandidateEffective"),
      new Intl.DateTimeFormat(document.documentElement.lang || "en", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(candidate.effectiveAt))
    );
    const alreadyAssigned = policies.some((policy) =>
      taxPolicyMatchesCandidate(policy, candidate)
    );
    const canApprove = Boolean(payload.showReady && !alreadyAssigned);
    form.hidden = !canApprove;
    form.elements.confirmation.value = "";
    form.elements.confirmation.placeholder = candidate.confirmation;
    confirmationHint.textContent = text("taxPolicyConfirmationValue", {
      confirmation: candidate.confirmation
    });
    setStatus(
      status,
      alreadyAssigned
        ? text("taxPolicyConfigured")
        : payload.showReady
          ? text("taxPolicyCandidateReady")
          : text("taxPolicyShowNotReady"),
      !payload.showReady
    );
  }

  async function approveCandidate(event) {
    event.preventDefault();
    if (!show || !candidate || !form) return;
    const showId = show.id;
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    setStatus(status, text("savingTaxPolicy"));
    try {
      await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/tax-policy`,
        {
          method: "PUT",
          body: taxPolicyRequestBody(
            candidate,
            form.elements.confirmation.value
          )
        }
      );
      if (show?.id !== showId) return;
      setStatus(status, text("taxPolicySaved"));
      await loadPolicy();
      onSaved?.();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function appendEvidence(list, label, value) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    list.append(term, detail);
  }

  function policySummary(policy) {
    return `${String(policy.jurisdictionCode || "")} · ${
      formatTaxPercentage(policy.ratePartsPerMillion)
    } · ${
      policy.providerReady
        ? text("taxPolicyProviderReady")
        : text("taxPolicyProviderPending")
    }`;
  }
}

export function formatTaxPercentage(ratePartsPerMillion) {
  const rate = Number(ratePartsPerMillion);
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 1_000_000) return "—";
  const language = globalThis.document?.documentElement?.lang || "en";
  return `${(rate / 10_000).toLocaleString(
    language === "es" ? "es-US" : "en-US",
    { maximumFractionDigits: 4 }
  )}%`;
}

export function taxPolicyMatchesCandidate(policy, candidate) {
  return Boolean(
    policy
    && candidate
    && policy.assigned === true
    && policy.providerReady === true
    && policy.status === "approved"
    && policy.providerMode === candidate.applicableMode
    && policy.jurisdictionCode === candidate.jurisdictionCode
    && policy.ratePartsPerMillion === candidate.ratePartsPerMillion
    && policy.inclusive === candidate.inclusive
    && policy.providerName === candidate.providerName
    && policy.sourceReference === candidate.sourceReference
    && policy.effectiveAt === candidate.effectiveAt
    && (policy.expiresAt || null) === (candidate.expiresAt || null)
  );
}

export function taxPolicyRequestBody(candidate, confirmation) {
  if (!validCandidate(candidate)) throw new Error("Invalid tax policy candidate");
  return {
    jurisdictionCode: candidate.jurisdictionCode,
    ratePartsPerMillion: candidate.ratePartsPerMillion,
    inclusive: candidate.inclusive,
    providerName: candidate.providerName,
    sourceReference: candidate.sourceReference,
    effectiveAt: candidate.effectiveAt,
    expiresAt: candidate.expiresAt,
    displayName: candidate.displayName,
    confirmation: String(confirmation || "").trim()
  };
}

function validCandidate(candidate) {
  return Boolean(
    candidate
    && typeof candidate === "object"
    && typeof candidate.jurisdictionCode === "string"
    && Number.isSafeInteger(candidate.ratePartsPerMillion)
    && typeof candidate.inclusive === "boolean"
    && typeof candidate.providerName === "string"
    && typeof candidate.sourceReference === "string"
    && typeof candidate.effectiveAt === "string"
    && (candidate.expiresAt === null || typeof candidate.expiresAt === "string")
    && typeof candidate.displayName === "string"
    && (candidate.applicableMode === "test" || candidate.applicableMode === "live")
    && typeof candidate.confirmation === "string"
  );
}
