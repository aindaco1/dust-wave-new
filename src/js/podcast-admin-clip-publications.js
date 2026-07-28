export function mountClipPublications({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  findClip,
  applyPublication,
  renderClips,
  canApprove
}) {
  const form = root.querySelector(
    "[data-podcast-clip-publication-form]"
  );
  const meta = root.querySelector(
    "[data-podcast-clip-publication-meta]"
  );
  const status = root.querySelector(
    "[data-podcast-clip-publication-status]"
  );
  const approveButton = root.querySelector(
    "[data-podcast-clip-publication-approve]"
  );
  const withdrawButton = root.querySelector(
    "[data-podcast-clip-publication-withdraw]"
  );
  let selectedClip = null;
  let publicationId = "";

  form?.addEventListener("submit", saveDraft);
  approveButton?.addEventListener("click", approve);
  withdrawButton?.addEventListener("click", withdraw);
  form
    ?.querySelector("[data-podcast-clip-publication-close]")
    ?.addEventListener("click", close);

  function open(clipId) {
    if (!form) return false;
    const clip = findClip(clipId);
    if (
      !clip
      || clip.render?.status !== "ready"
      || clip.render?.clipRevision !== clip.revision
    ) {
      return false;
    }
    selectedClip = clip;
    const publication = clip.publicPublication;
    publicationId =
      publication?.id || operationId("clip_publication");
    form.elements.publicSlug.value =
      publication?.publicSlug
      || slugify(clip.title).slice(0, 100);
    form.elements.title.value =
      publication?.title || String(clip.title || "").slice(0, 160);
    form.elements.description.value =
      publication?.description || "";
    const immutable = Boolean(publication);
    for (const field of ["publicSlug", "title", "description"]) {
      form.elements[field].disabled = immutable;
    }
    const save = form.querySelector(
      "[data-podcast-clip-publication-save]"
    );
    if (save) save.hidden = immutable;
    if (approveButton) {
      approveButton.hidden = !(
        canApprove()
        && publication?.status === "draft"
        && publication.evidenceCurrent !== false
      );
    }
    if (withdrawButton) {
      withdrawButton.hidden = !(
        canApprove()
        && publication?.status === "approved"
      );
    }
    if (meta) {
      meta.textContent = [
        clip.episodeTitle || text("episodeFallback"),
        clip.title,
        text("renderLabel", { id: clip.render.id }),
        publication
          ? localizedCode(text, "clipPublicationStatus", publication.status)
          : text("newImmutablePublicSelection")
      ].join(" · ");
    }
    setStatus(status, "");
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return true;
  }

  async function saveDraft(event) {
    event.preventDefault();
    const clip = selectedClip;
    const button = form?.querySelector(
      "[data-podcast-clip-publication-save]"
    );
    if (!clip?.render || !button) return;
    button.disabled = true;
    setStatus(status, text("preparingPublicClip"));
    try {
      const payload = await client.request(
        `/v1/admin/clip-renders/${encodeURIComponent(clip.render.id)}/publication`,
        {
          method: "POST",
          body: {
            publicationId,
            expectedClipRevision: Number(clip.revision),
            publicSlug: form.elements.publicSlug.value,
            title: form.elements.title.value,
            description: form.elements.description.value
          }
        }
      );
      applyPublication(clip.render.id, payload.publication);
      renderClips();
      open(clip.id);
      setStatus(
        status,
        payload.idempotent
          ? text("publicClipDraftExists")
          : text("publicClipDraftPrepared")
      );
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function approve() {
    const clip = selectedClip;
    const publication = clip?.publicPublication;
    if (!clip || !publication || !approveButton) return;
    approveButton.disabled = true;
    setStatus(status, text("approvingPublicClip"));
    try {
      const payload = await client.request(
        `/v1/admin/clip-publications/${encodeURIComponent(publication.id)}/approve`,
        { method: "POST", body: {} }
      );
      applyPublication(
        publication.renderId || clip.render?.id,
        payload.publication
      );
      renderClips();
      open(clip.id);
      setStatus(status, text("publicClipApproved"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      approveButton.disabled = false;
    }
  }

  async function withdraw() {
    const clip = selectedClip;
    const publication = clip?.publicPublication;
    if (!clip || !publication || !withdrawButton) return;
    withdrawButton.disabled = true;
    setStatus(status, text("withdrawingPublicClip"));
    try {
      const payload = await client.request(
        `/v1/admin/clip-publications/${encodeURIComponent(publication.id)}/withdraw`,
        { method: "POST", body: {} }
      );
      applyPublication(
        publication.renderId || clip.render?.id,
        payload.publication
      );
      renderClips();
      open(clip.id);
      setStatus(status, text("publicClipWithdrawn"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      withdrawButton.disabled = false;
    }
  }

  function close() {
    selectedClip = null;
    publicationId = "";
    form?.reset();
    if (form) form.hidden = true;
    setStatus(status, "");
  }

  return { open, close };
}

function operationId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function localizedCode(text, prefix, value) {
  const code = String(value || "").trim();
  return text(`${prefix}_${code}`, code.replaceAll("_", " "));
}
