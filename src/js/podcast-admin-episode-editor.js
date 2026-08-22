import {
  revealContextualEditor
} from "./podcast-admin-contextual-editing.js";

const EPISODE_ACCESS_VALUES = new Set([
  "public",
  "early_access",
  "premium_bonus",
  "free_mini"
]);

export function datetimeLocalInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return local.toISOString().slice(0, 16);
}

export function datetimeInputIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function readEpisodeFormPayload(
  form,
  contentHtml,
  { includeSlug = false } = {}
) {
  const payload = {
    title: form.elements.title.value,
    summary: form.elements.summary.value,
    contentHtml,
    access: form.elements.access.value,
    sourceLanguage: form.elements.sourceLanguage.value,
    premiumAt: datetimeInputIsoOrNull(form.elements.premiumAt.value),
    publicAt: datetimeInputIsoOrNull(form.elements.publicAt.value)
  };
  if (includeSlug) payload.slug = form.elements.slug.value;
  return payload;
}

export function findEditableEpisode(episodes, episodeId) {
  return episodes.find(({ id }) => id === episodeId) || null;
}

export function revealEpisodeEditor(form, title, {
  focus = true,
  scroll = true
} = {}) {
  revealContextualEditor(form, title, { focus, scroll });
}

export function mountEpisodeEditor({
  form,
  list,
  notesEditor,
  client,
  text,
  setStatus,
  friendlyError,
  getSelectedShowId,
  getShows,
  canEdit,
  onModeChange = () => {},
  onPermissionsChange = () => {},
  onSaved
}) {
  if (!form || !list || !notesEditor) {
    throw new TypeError("Episode editor controls are required");
  }
  const heading = form.querySelector(
    "[data-podcast-episode-form-heading]"
  );
  const submit = form.querySelector('button[type="submit"]');
  const cancel = form.querySelector("[data-podcast-episode-edit-cancel]");
  const slugHelp = form.querySelector("[data-podcast-episode-slug-help]");
  const status = form.querySelector("[data-podcast-episode-status]");
  const title = form.elements.title;
  const slug = form.elements.slug;
  let episodes = [];
  let showId = "";
  let editingEpisodeId = "";
  let submitting = false;

  form.addEventListener("submit", saveEpisode);
  title.addEventListener("input", () => {
    if (!editingEpisodeId && !slug.dataset.edited) {
      slug.value = slugify(title.value);
    }
  });
  slug.addEventListener("input", () => {
    if (!editingEpisodeId) slug.dataset.edited = "true";
  });
  cancel?.addEventListener("click", () => {
    reset({ focus: true });
    setStatus(status, text("episodeEditCanceled"));
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-episode]");
    if (!button || !list.contains(button)) return;
    edit(button.dataset.editEpisode);
  });

  function refreshPermissions() {
    const editable = Boolean(canEdit());
    form.hidden = !editable || !showId;
    submit.disabled = submitting || !editable || !showId;
    if (cancel) cancel.disabled = submitting;
    onPermissionsChange({ editable, showId, submitting });
  }

  function reset({ focus = false, clearStatus = true } = {}) {
    editingEpisodeId = "";
    form.dataset.episodeMode = "create";
    form.reset();
    notesEditor.setValue("");
    slug.dataset.edited = "";
    slug.readOnly = false;
    slug.removeAttribute("aria-readonly");
    if (slugHelp) slugHelp.hidden = true;
    if (cancel) cancel.hidden = true;
    if (heading) heading.textContent = text("newEpisode");
    submit.textContent = text("createDraft");
    const show = getShows().find(({ id }) => id === showId);
    form.elements.sourceLanguage.value =
      show?.language === "en" ? "en" : "es";
    onModeChange({
      episodeId: "",
      sourceLanguage: form.elements.sourceLanguage.value
    });
    if (clearStatus) setStatus(status, "");
    refreshPermissions();
    if (focus && !form.hidden) title.focus();
  }

  function edit(episodeId, revealOptions) {
    if (!canEdit()) return false;
    const episode = findEditableEpisode(episodes, episodeId);
    if (!episode) return false;
    editingEpisodeId = episode.id;
    form.dataset.episodeMode = "edit";
    title.value = episode.title || "";
    slug.value = episode.slug || "";
    slug.dataset.edited = "true";
    slug.readOnly = true;
    slug.setAttribute("aria-readonly", "true");
    form.elements.summary.value = episode.summary || "";
    form.elements.access.value = EPISODE_ACCESS_VALUES.has(episode.access)
      ? episode.access
      : "public";
    form.elements.sourceLanguage.value =
      episode.sourceLanguage === "en" ? "en" : "es";
    form.elements.premiumAt.value = datetimeLocalInputValue(
      episode.premiumAt
    );
    form.elements.publicAt.value = datetimeLocalInputValue(episode.publicAt);
    notesEditor.setHtml(episode.contentHtml || "");
    onModeChange({
      episodeId: episode.id,
      sourceLanguage: form.elements.sourceLanguage.value
    });
    if (slugHelp) slugHelp.hidden = false;
    if (cancel) cancel.hidden = false;
    if (heading) heading.textContent = text("editEpisode");
    submit.textContent = text("updateDraft");
    setStatus(status, text("editingEpisode", { title: episode.title }));
    revealEpisodeEditor(form, title, revealOptions);
    return true;
  }

  async function saveEpisode(event) {
    event.preventDefault();
    if (submitting || !canEdit()) return;
    const selectedShowId = getSelectedShowId();
    if (!selectedShowId) return;
    const episodeId = editingEpisodeId;
    const updating = Boolean(episodeId);
    submitting = true;
    refreshPermissions();
    setStatus(status, text(updating ? "updatingDraft" : "creatingDraft"));
    try {
      await client.request(
        updating
          ? `/v1/admin/episodes/${encodeURIComponent(episodeId)}`
          : `/v1/admin/shows/${encodeURIComponent(selectedShowId)}/episodes`,
        {
          method: updating ? "PATCH" : "POST",
          body: readEpisodeFormPayload(form, notesEditor.getHtml(), {
            includeSlug: !updating
          })
        }
      );
      reset({ clearStatus: false });
      setStatus(status, text(updating ? "draftUpdated" : "draftCreated"));
      await onSaved();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      submitting = false;
      refreshPermissions();
    }
  }

  reset();
  return {
    edit,
    refreshPermissions,
    reset,
    setEpisodes(nextEpisodes) {
      episodes = Array.isArray(nextEpisodes) ? nextEpisodes : [];
      if (
        editingEpisodeId
        && !findEditableEpisode(episodes, editingEpisodeId)
      ) {
        reset();
      }
    },
    setShow(nextShowId) {
      const normalized = String(nextShowId || "");
      if (normalized !== showId) {
        showId = normalized;
        reset();
        return;
      }
      if (!editingEpisodeId) {
        const show = getShows().find(({ id }) => id === showId);
        form.elements.sourceLanguage.value =
          show?.language === "en" ? "en" : "es";
      }
      refreshPermissions();
    }
  };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
