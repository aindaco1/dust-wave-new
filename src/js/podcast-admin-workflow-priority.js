export function mountWorkflowPriority({
  document,
  nodeLabel,
  nodeDescription = () => "",
  nodeStep = () => "",
  onNavigate
}) {
  const blockers = document.createElement("ul");
  blockers.className = "podcast-admin__workflow-blockers";
  blockers.hidden = true;

  function render({ nodes }) {
    const actionable = Array.from(nodes || []);
    blockers.replaceChildren(...actionable.map((node) => {
      const item = document.createElement("li");
      const link = document.createElement("button");
      link.className = "podcast-admin__workflow-blocker-link";
      link.type = "button";
      link.dataset.podcastWorkflowBlockerStep = nodeStep(node);
      const title = document.createElement("strong");
      title.textContent = nodeLabel(node);
      const description = document.createElement("span");
      description.textContent = nodeDescription(node);
      description.hidden = !description.textContent;
      link.append(title, description);
      link.addEventListener("click", () => onNavigate(node));
      item.append(link);
      return item;
    }));
    blockers.hidden = actionable.length === 0;
  }

  return {
    elements: [blockers],
    render,
    clear() {
      render({ nodes: [] });
    }
  };
}
