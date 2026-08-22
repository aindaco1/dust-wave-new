export function mountPodcastShowContext(root) {
  const contexts = [...root.querySelectorAll("[data-podcast-show-context]")]
    .map((container) => ({
      container,
      name: container.querySelector("[data-podcast-show-name]"),
      select: container.querySelector("[data-podcast-show-select]"),
      switcher: container.querySelector("[data-podcast-show-switcher]")
    }))
    .filter(({ name, select }) => name && select);
  const selects = contexts.map(({ select }) => select);
  const scopedNames = [...root.querySelectorAll(
    "[data-podcast-current-show-name]"
  )];

  return Object.freeze({
    selects,
    setShows(shows, selectedShowId) {
      const normalized = Array.from(shows || []).map((show) => ({
        id: String(show?.id || ""),
        title: String(show?.title || "")
      })).filter(({ id }) => id);
      const singleShow = normalized.length === 1 ? normalized[0] : null;
      const selectedShow = normalized.find(({ id }) => id === selectedShowId)
        || normalized[0]
        || null;
      for (const { container, name, select, switcher } of contexts) {
        select.replaceChildren(...normalized.map(({ id, title }) => {
          const option = select.ownerDocument.createElement("option");
          option.value = id;
          option.textContent = title;
          option.selected = id === selectedShowId;
          return option;
        }));
        if (!select.value && normalized[0]) select.value = normalized[0].id;
        container.hidden = normalized.length === 0;
        select.hidden = Boolean(singleShow);
        if (switcher) switcher.hidden = Boolean(singleShow);
        name.hidden = !selectedShow;
        name.textContent = selectedShow?.title || "";
      }
      for (const name of scopedNames) {
        name.textContent = selectedShow?.title || "";
      }
    }
  });
}
