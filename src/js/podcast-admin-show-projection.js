export function mountShowSiteProjection({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  canPublish
}) {
  const panel = root.querySelector("[data-podcast-site-projection]");
  const previewButton = root.querySelector(
    "[data-podcast-site-projection-preview]"
  );
  const status = root.querySelector("[data-podcast-site-projection-status]");
  const summary = root.querySelector("[data-podcast-site-projection-summary]");
  const form = root.querySelector("[data-podcast-site-projection-form]");
  const confirmationHint = root.querySelector(
    "[data-podcast-site-projection-confirmation-hint]"
  );
  let show = null;
  let preview = null;
  let requestId = 0;

  previewButton?.addEventListener("click", loadPreview);
  form?.addEventListener("submit", publishProjection);

  return { setShow };

  function setShow(nextShow) {
    show = nextShow || null;
    preview = null;
    requestId += 1;
    if (panel) panel.hidden = !show;
    if (summary) {
      summary.hidden = true;
      summary.replaceChildren();
    }
    if (form) {
      form.hidden = true;
      form.reset();
    }
    setStatus(status, "");
  }

  async function loadPreview() {
    if (!show || !previewButton) return;
    const showId = show.id;
    const currentRequest = ++requestId;
    previewButton.disabled = true;
    setStatus(status, text("loadingSiteProjection"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/site-projection`
      );
      if (currentRequest !== requestId || show?.id !== showId) return;
      preview = payload;
      renderPreview(payload);
      setStatus(status, text("siteProjectionPreviewReady"));
    } catch (error) {
      if (currentRequest === requestId) {
        setStatus(status, friendlyError(error), true);
      }
    } finally {
      if (currentRequest === requestId) previewButton.disabled = false;
    }
  }

  function renderPreview(payload) {
    if (!summary || !form || !confirmationHint || !show) return;
    summary.replaceChildren();
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      evidence,
      text("siteProjectionCatalogSha"),
      String(payload.catalogSha || "—")
    );
    appendEvidence(
      evidence,
      text("siteProjectionMode"),
      text(payload.mode === "live" ? "liveMode" : "dryRunMode")
    );
    const target = payload.target || {};
    appendEvidence(
      evidence,
      text("siteProjectionTargetLabel"),
      text("siteProjectionTarget", {
        owner: target.owner || "—",
        repository: target.repository || "—",
        ref: target.ref || "—",
        path: target.path || "—"
      })
    );
    summary.append(evidence);
    summary.append(
      projectionList(
        text("siteProjectionChanges"),
        Array.isArray(payload.changedFields) ? payload.changedFields : [],
        "siteProjectionField_",
        text("siteProjectionNoChanges")
      )
    );
    summary.append(
      projectionList(
        text("siteProjectionBlockers"),
        Array.isArray(payload.blockers) ? payload.blockers : [],
        "siteProjectionBlocker_",
        text("siteProjectionNoBlockers")
      )
    );
    summary.hidden = false;

    const confirmation = `PUBLISH_SHOW_CATALOG ${show.id}`;
    confirmationHint.textContent = text("siteProjectionConfirmationValue", {
      confirmation
    });
    form.elements.confirmation.value = "";
    form.elements.confirmation.placeholder = confirmation;
    form.hidden = !(
      canPublish()
      && payload.changed === true
      && Array.isArray(payload.blockers)
      && payload.blockers.length === 0
      && /^[a-f0-9]{40,64}$/u.test(String(payload.catalogSha || ""))
    );
  }

  async function publishProjection(event) {
    event.preventDefault();
    if (!show || !preview || !form) return;
    const showId = show.id;
    const button = form.querySelector('button[type="submit"]');
    const confirmation = String(form.elements.confirmation.value || "").trim();
    button.disabled = true;
    setStatus(status, text("publishingSiteProjection"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/site-projection`,
        {
          method: "POST",
          body: {
            expectedCatalogSha: preview.catalogSha,
            confirmation
          }
        }
      );
      if (show?.id !== showId) return;
      if (payload.idempotent) {
        setStatus(status, text("siteProjectionIdempotent"));
      } else if (payload.dryRun) {
        setStatus(status, text("siteProjectionDryRunComplete"));
      } else {
        setStatus(status, text("siteProjectionPublished", {
          commit: String(payload.commitSha || "").slice(0, 12)
        }));
      }
      form.elements.confirmation.value = "";
      if (payload.published || payload.idempotent) form.hidden = true;
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

  function projectionList(headingText, values, prefix, emptyText) {
    const section = document.createElement("section");
    const heading = document.createElement("h4");
    const list = document.createElement("ul");
    heading.textContent = headingText;
    list.className = "podcast-admin__certification-list";
    const items = values.length ? values : [""];
    list.replaceChildren(...items.map((value) => {
      const item = document.createElement("li");
      if (!value) item.classList.add("is-ready");
      item.textContent = value ? text(`${prefix}${value}`) : emptyText;
      return item;
    }));
    section.append(heading, list);
    return section;
  }
}
