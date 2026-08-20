export function canDeletePodcastShow(identity, show) {
  const superAdmin = (identity?.roles || []).some(({ role }) =>
    role === "super_admin"
  );
  return Boolean(superAdmin && show?.deletionCandidate);
}

export function showDeletionConfirmation(slug) {
  return `DELETE_SHOW ${String(slug || "").trim()}`;
}

export function readShowDeletionPayload(form, requestId) {
  return {
    requestId,
    confirmation: form.elements.confirmation.value
  };
}

export function mountPodcastShowDeletion({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  onDeleted
}) {
  const section = root.querySelector("[data-podcast-show-delete]");
  const toggle = root.querySelector("[data-podcast-show-delete-toggle]");
  const form = root.querySelector("[data-podcast-show-delete-form]");
  const cancel = root.querySelector("[data-podcast-show-delete-cancel]");
  const status = root.querySelector("[data-podcast-show-delete-status]");
  const confirmationValue = root.querySelector(
    "[data-podcast-show-delete-confirmation]"
  );
  let identity = null;
  let show = null;
  let requestId = "";

  function allowed() {
    return canDeletePodcastShow(identity, show);
  }

  function closeForm() {
    form?.reset();
    requestId = "";
    if (form) form.hidden = true;
    toggle?.setAttribute("aria-expanded", "false");
    setStatus(status, "");
  }

  function render() {
    const visible = allowed();
    if (section) section.hidden = !visible;
    if (!visible) {
      closeForm();
      return;
    }
    if (confirmationValue) {
      confirmationValue.textContent = showDeletionConfirmation(show.slug);
    }
  }

  function openForm() {
    if (!allowed() || !form) return;
    form.hidden = false;
    toggle?.setAttribute("aria-expanded", "true");
    form.elements.confirmation?.focus();
  }

  async function deleteShow(event) {
    event.preventDefault();
    if (!allowed() || !form || !show) return;
    const confirmation = showDeletionConfirmation(show.slug);
    if (form.elements.confirmation.value !== confirmation) {
      setStatus(status, text("showDeleteConfirmationMismatch"), true);
      form.elements.confirmation.focus();
      return;
    }
    if (!requestId) {
      requestId = `show_delete_${crypto.randomUUID().replaceAll("-", "")}`;
    }
    const deletingShow = show;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, text("deletingShow", { title: deletingShow.title }));
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(deletingShow.id)}`,
        {
          method: "DELETE",
          body: readShowDeletionPayload(form, requestId)
        }
      );
      await onDeleted(deletingShow, result);
      closeForm();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  toggle?.addEventListener("click", openForm);
  cancel?.addEventListener("click", closeForm);
  form?.addEventListener("submit", deleteShow);
  form?.addEventListener("input", () => {
    requestId = "";
  });
  closeForm();

  return Object.freeze({
    setIdentity(nextIdentity) {
      identity = nextIdentity || null;
      render();
    },
    setShow(nextShow) {
      if (nextShow?.id !== show?.id) closeForm();
      show = nextShow || null;
      render();
    },
    reset() {
      identity = null;
      show = null;
      if (section) section.hidden = true;
      closeForm();
    }
  });
}
