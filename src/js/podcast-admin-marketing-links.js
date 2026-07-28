export function mountSavedMarketingLinks({
  client,
  form,
  saveButton,
  cancelButton,
  listRoot,
  listStatus,
  loadMoreButton,
  refreshButton,
  getShow,
  canWrite,
  text,
  setStatus,
  friendlyError,
  applyLink,
  resetBuilder,
  downloadQr
}) {
  let rows = [];
  let cursor = null;
  let loading = false;
  let requestId = 0;
  let editingId = "";
  let editingUpdatedAt = "";

  form?.addEventListener("submit", save);
  cancelButton?.addEventListener("click", () => resetForm());
  refreshButton?.addEventListener("click", () => load({ reset: true }));
  loadMoreButton?.addEventListener("click", () => load({ reset: false }));
  listRoot?.addEventListener("click", handleAction);

  function resetForm({ keepStatus = false } = {}) {
    editingId = "";
    editingUpdatedAt = "";
    resetBuilder();
    if (saveButton) {
      saveButton.textContent = text("saveLink");
      saveButton.hidden = !canWrite();
      saveButton.disabled = false;
    }
    if (cancelButton) cancelButton.hidden = true;
    if (!keepStatus) setStatus(formStatus(), "");
  }

  function resetForShow() {
    rows = [];
    cursor = null;
    loading = false;
    requestId += 1;
    listRoot?.replaceChildren();
    if (loadMoreButton) {
      loadMoreButton.hidden = true;
      loadMoreButton.disabled = false;
    }
    setStatus(listStatus, "");
    resetForm();
  }

  function reset() {
    resetForShow();
  }

  function refreshPermissions() {
    if (saveButton) saveButton.hidden = !canWrite();
    render();
  }

  async function load({ reset = false } = {}) {
    const show = getShow();
    if ((!reset && loading) || !show?.id || !listRoot) return;
    if (!reset && !cursor) return;
    const requestedShowId = show.id;
    const currentRequestId = ++requestId;
    if (reset) {
      rows = [];
      cursor = null;
      listRoot.replaceChildren();
    }
    loading = true;
    if (loadMoreButton) loadMoreButton.disabled = true;
    setStatus(listStatus, text("loadingSavedLinks"));
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (!reset && cursor) params.set("cursor", cursor);
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(requestedShowId)}/marketing/links?${params}`
      );
      if (
        currentRequestId !== requestId
        || requestedShowId !== getShow()?.id
      ) return;
      const incoming = Array.isArray(payload.links) ? payload.links : [];
      rows = reset ? incoming : [...rows, ...incoming];
      cursor = payload.pagination?.nextCursor || null;
      if (editingId && !rows.some(({ id }) => id === editingId)) {
        resetForm();
      }
      render();
      setStatus(listStatus, rows.length ? "" : text("noSavedLinks"));
    } catch (error) {
      if (currentRequestId === requestId) {
        setStatus(listStatus, friendlyError(error), true);
      }
    } finally {
      if (currentRequestId === requestId) {
        loading = false;
        if (loadMoreButton) {
          loadMoreButton.disabled = false;
          loadMoreButton.hidden = !cursor;
        }
      }
    }
  }

  function render() {
    if (!listRoot) return;
    const writable = canWrite();
    listRoot.replaceChildren(
      ...rows.map((row) => {
        const article = document.createElement("article");
        article.className = "podcast-admin__card";

        const heading = document.createElement("h5");
        heading.textContent = String(row.label || row.code || "");
        const code = document.createElement("p");
        code.className = "podcast-admin__eyebrow";
        code.textContent = `${text("savedLinkCode")}: ${row.code || "—"}`;
        const link = document.createElement("a");
        link.className = "podcast-admin__marketing-saved-url";
        const safeUrl = safeSavedUrl(row.taggedUrl);
        if (safeUrl) {
          link.href = safeUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        link.textContent = String(row.taggedUrl || "");
        const updated = document.createElement("p");
        updated.textContent =
          `${text("savedLinkUpdated")}: ${formatDate(row.updatedAt)}`;
        const actions = document.createElement("div");
        actions.className = "podcast-admin__clip-actions";
        if (writable) {
          actions.append(actionButton("edit", row.id, text("useSavedLink")));
        }
        actions.append(
          actionButton("copy", row.id, text("copyLink")),
          actionButton("png", row.id, text("downloadQrPng")),
          actionButton("svg", row.id, text("downloadQrSvg"))
        );
        if (writable) {
          actions.append(
            actionButton(
              "delete",
              row.id,
              text("deleteSavedLink"),
              true
            )
          );
        }
        article.append(heading, code, link, updated, actions);
        return article;
      })
    );
  }

  function actionButton(action, linkId, label, danger = false) {
    const button = document.createElement("button");
    button.className = danger
      ? "btn btn-danger"
      : "btn btn-outline-light";
    button.type = "button";
    button.dataset.podcastMarketingLinkAction = action;
    button.dataset.podcastMarketingLinkId = String(linkId || "");
    button.textContent = label;
    return button;
  }

  async function save(event) {
    event.preventDefault();
    const show = getShow();
    if (!form || !show?.id || !canWrite()) return;
    if (!form.reportValidity() || !form.elements.taggedUrl.value) return;
    if (saveButton) saveButton.disabled = true;
    setStatus(formStatus(), text("savingTaggedLink"));
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(show.id)}/marketing/links`,
        {
          method: "POST",
          body: {
            ...(editingId
              ? {
                id: editingId,
                expectedUpdatedAt: editingUpdatedAt,
                code: rows.find(({ id }) => id === editingId)?.code || ""
              }
              : {}),
            label: form.elements.label.value,
            utmSource: form.elements.source.value,
            utmMedium: form.elements.medium.value,
            utmCampaign: form.elements.campaign.value,
            utmContent: form.elements.content.value,
            referralCode: form.elements.ref.value
          }
        }
      );
      const updated = Boolean(result.updated);
      resetForm({ keepStatus: true });
      setStatus(
        formStatus(),
        text(updated ? "updatedTaggedLink" : "savedTaggedLink")
      );
      await load({ reset: true });
    } catch (error) {
      setStatus(formStatus(), friendlyError(error), true);
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  function handleAction(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(
      "[data-podcast-marketing-link-action]"
    );
    if (!button) return;
    const row = rows.find(
      ({ id }) => id === button.dataset.podcastMarketingLinkId
    );
    if (!row) return;
    const action = button.dataset.podcastMarketingLinkAction;
    if (action === "edit") {
      edit(row);
      return;
    }
    if (action === "copy") {
      copy(row);
      return;
    }
    if (action === "delete") {
      remove(row);
      return;
    }
    if (action === "png" || action === "svg") {
      editingId = "";
      editingUpdatedAt = "";
      applyLink(row, { edit: false });
      downloadQr(action);
    }
  }

  function edit(row) {
    if (!canWrite()) return;
    editingId = String(row.id || "");
    editingUpdatedAt = String(row.updatedAt || "");
    applyLink(row, { edit: true });
    if (saveButton) saveButton.textContent = text("updateLink");
    if (cancelButton) cancelButton.hidden = false;
    setStatus(
      formStatus(),
      text("editingTaggedLink", {
        label: row.label || row.code || ""
      })
    );
  }

  async function copy(row) {
    const safeUrl = safeSavedUrl(row.taggedUrl);
    if (!safeUrl) {
      setStatus(listStatus, text("taggedLinkFailed"), true);
      return;
    }
    try {
      await navigator.clipboard.writeText(safeUrl);
      setStatus(listStatus, text("savedLinkCopied"));
    } catch {
      editingId = "";
      editingUpdatedAt = "";
      applyLink(row, { edit: false });
      form.elements.taggedUrl.focus();
      form.elements.taggedUrl.select();
      setStatus(listStatus, text("clipboardLinkSelected"));
    }
  }

  async function remove(row) {
    const show = getShow();
    if (
      !show?.id
      || !canWrite()
      || !window.confirm(text("confirmDeleteTaggedLink", {
        label: row.label || row.code || ""
      }))
    ) return;
    setStatus(listStatus, text("deletingTaggedLink"));
    try {
      await client.request(
        `/v1/admin/shows/${encodeURIComponent(show.id)}/marketing/links/${encodeURIComponent(row.id)}`,
        { method: "DELETE" }
      );
      if (editingId === row.id) resetForm();
      await load({ reset: true });
      setStatus(listStatus, text("deletedTaggedLink"));
    } catch (error) {
      setStatus(listStatus, friendlyError(error), true);
    }
  }

  function safeSavedUrl(value) {
    const show = getShow();
    if (!show?.canonicalUrl) return "";
    try {
      const url = new URL(String(value || ""));
      const canonical = new URL(show.canonicalUrl);
      if (
        url.protocol !== "https:"
        || url.origin !== canonical.origin
        || url.username
        || url.password
        || url.hash
      ) return "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function formatDate(value) {
    const date = new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(document.documentElement.lang || "en", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function formStatus() {
    return form?.querySelector("[data-podcast-marketing-link-status]");
  }

  return {
    load,
    refreshPermissions,
    reset,
    resetForShow
  };
}
