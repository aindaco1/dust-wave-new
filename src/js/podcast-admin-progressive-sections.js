export function mountProgressiveSections(panel, {
  label = "Workflow sections",
  defaultOpen = 0
} = {}) {
  if (!panel?.ownerDocument) {
    throw new TypeError("A progressive-section panel is required");
  }
  const document = panel.ownerDocument;
  const headings = Array.from(
    panel.querySelectorAll(":scope > .podcast-admin__panel-heading")
  ).filter((heading) => heading.querySelector("h2"));
  const sections = [];

  headings.forEach((heading, index) => {
    const nextHeading = headings[index + 1] || null;
    const sourceTitle = heading.querySelector("h2");
    const titleText = sourceTitle.textContent.trim();
    const details = document.createElement("details");
    details.className = "podcast-admin__progressive-section";
    details.dataset.progressiveSection = String(index);
    if (index === defaultOpen) details.open = true;
    const summary = document.createElement("summary");
    const title = document.createElement("h2");
    title.textContent = titleText;
    const state = document.createElement("span");
    state.className = "podcast-admin__progressive-state";
    state.textContent = details.open ? "−" : "+";
    state.setAttribute("aria-hidden", "true");
    summary.append(title, state);
    const body = document.createElement("div");
    body.className = "podcast-admin__progressive-body";
    details.setAttribute("aria-label", `${label}: ${titleText}`);
    panel.insertBefore(details, heading);

    let current = heading;
    while (current && current !== nextHeading) {
      const next = current.nextSibling;
      body.append(current);
      current = next;
    }
    sourceTitle.remove();
    details.append(summary, body);
    details.addEventListener("toggle", () => {
      state.textContent = details.open ? "−" : "+";
    });
    sections.push(details);
  });

  return {
    sections,
    openFor(element) {
      const details = element?.closest?.(
        ".podcast-admin__progressive-section"
      );
      if (!details) return false;
      details.open = true;
      return true;
    }
  };
}

export function mountProgressiveTools(entries, {
  label = "Episode tool"
} = {}) {
  const normalizedEntries = Array.from(entries || [])
    .map((entry) => entry?.element ? entry : { element: entry })
    .filter(({ element }) => element?.ownerDocument);
  const sections = normalizedEntries.map(({ element, related = [] }, index) => {
    const document = element.ownerDocument;
    const sourceTitle = element.querySelector("h2, h3");
    if (!sourceTitle) {
      throw new TypeError("A progressive tool requires a heading");
    }
    const details = document.createElement("details");
    details.className = "podcast-admin__progressive-section";
    details.dataset.progressiveTool = String(index);
    const summary = document.createElement("summary");
    const title = document.createElement(sourceTitle.tagName.toLowerCase());
    const state = document.createElement("span");
    state.className = "podcast-admin__progressive-state";
    state.setAttribute("aria-hidden", "true");
    summary.append(title, state);
    const body = document.createElement("div");
    body.className = "podcast-admin__progressive-body";
    element.parentNode.insertBefore(details, element);
    body.append(element, ...related.filter(Boolean));
    details.append(summary, body);
    sourceTitle.classList.add("visually-hidden");

    function sync() {
      const titleText = sourceTitle.textContent.trim();
      title.textContent = titleText;
      details.hidden = element.hidden;
      details.setAttribute("aria-label", `${label}: ${titleText}`);
      state.textContent = details.open ? "−" : "+";
    }

    details.addEventListener("toggle", sync);
    const observer = new MutationObserver(sync);
    observer.observe(element, { attributes: true, attributeFilter: ["hidden"] });
    observer.observe(sourceTitle, {
      characterData: true,
      childList: true,
      subtree: true
    });
    sync();
    return { details, element, observer };
  });

  return {
    sections: sections.map(({ details }) => details),
    openFor(element) {
      const section = sections.find((candidate) =>
        candidate.element === element
        || candidate.details.contains(element)
      );
      if (!section) return false;
      section.details.open = true;
      return true;
    },
    setOpen(element, open) {
      const section = sections.find((candidate) =>
        candidate.element === element
      );
      if (!section) return false;
      section.details.open = Boolean(open);
      return true;
    },
    destroy() {
      for (const { observer } of sections) observer.disconnect();
    }
  };
}
