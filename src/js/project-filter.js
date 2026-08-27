(() => {
  "use strict";

  const rows = Array.from(document.querySelectorAll("[data-project-row]"));
  const filters = Array.from(document.querySelectorAll("[data-project-filter]"));
  const filterNav = document.querySelector("[data-project-filters]");
  const emptyState = document.querySelector("[data-project-filter-empty]");
  const statusRow = document.querySelector("[data-project-filter-status-row]");
  const status = document.querySelector("[data-project-filter-status]");
  const announcement = document.querySelector("[data-project-filter-announcement]");
  const clearLink = document.querySelector("[data-project-filter-clear]");
  const labelsNode = document.getElementById("project-filter-labels");

  if (!rows.length || !filterNav || !labelsNode) return;

  let labels = { types: {}, tags: {} };
  try {
    labels = JSON.parse(labelsNode.textContent || "{}");
  } catch {
    return;
  }

  const typePrefix = statusRow?.dataset.typePrefix || "Filter projects by type";
  const tagPrefix = statusRow?.dataset.tagPrefix || "Tag";
  const validTypes = new Set(Object.keys(labels.types || {}));
  const validTags = new Set(Object.keys(labels.tags || {}));

  const stateFromLocation = () => {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type") || "";
    const requestedTag = params.get("tag") || "";
    return {
      type: validTypes.has(requestedType) ? requestedType : "",
      tag: validTags.has(requestedTag) ? requestedTag : ""
    };
  };

  const setLocation = ({ type = "", tag = "" }) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("type");
    nextUrl.searchParams.delete("tag");
    if (type) nextUrl.searchParams.set("type", type);
    if (tag) nextUrl.searchParams.set("tag", tag);
    window.history.pushState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  };

  const applyFilter = ({ type = "", tag = "" }) => {
    let visibleCount = 0;

    rows.forEach((row) => {
      const rowTags = new Set((row.dataset.projectTags || "").split(/\s+/).filter(Boolean));
      const matchesType = !type || row.dataset.projectType === type;
      const matchesTag = !tag || rowTags.has(tag);
      const visible = matchesType && matchesTag;
      row.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    filters.forEach((filter) => {
      const active = !tag && filter.dataset.projectFilter === type;
      if (active) filter.setAttribute("aria-current", "page");
      else filter.removeAttribute("aria-current");
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;

    const selectedLabel = tag
      ? labels.tags?.[tag]
      : type
        ? labels.types?.[type]
        : "";
    const prefix = tag ? tagPrefix : typePrefix;

    if (announcement) {
      announcement.textContent = selectedLabel
        ? `${prefix}: ${selectedLabel}. ${visibleCount}.`
        : `${visibleCount}.`;
    }

    if (statusRow && status) {
      statusRow.hidden = !tag;
      status.textContent = tag ? `${tagPrefix}: ${selectedLabel}` : "";
    }
  };

  const activateType = (type) => {
    const nextState = { type: validTypes.has(type) ? type : "", tag: "" };
    setLocation(nextState);
    applyFilter(nextState);
  };

  filterNav.addEventListener("click", (event) => {
    const link = event.target.closest("[data-project-filter]");
    if (!link) return;
    event.preventDefault();
    activateType(link.dataset.projectFilter || "");
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href*='?type=']");
    if (!link || filterNav.contains(link)) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;

    const type = url.searchParams.get("type") || "";
    if (!validTypes.has(type)) return;
    event.preventDefault();
    activateType(type);
  });

  clearLink?.addEventListener("click", (event) => {
    event.preventDefault();
    activateType("");
  });

  window.addEventListener("popstate", () => applyFilter(stateFromLocation()));
  applyFilter(stateFromLocation());
})();
