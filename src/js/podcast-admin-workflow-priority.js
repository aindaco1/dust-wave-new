export function mountWorkflowPriority({
  document,
  text,
  nodeLabel,
  nodeDescription = () => "",
  onNavigate
}) {
  const blockers = document.createElement("ul");
  blockers.className = "podcast-admin__workflow-blockers";
  const nextAction = document.createElement("section");
  nextAction.className = "podcast-admin__workflow-next-action";
  nextAction.hidden = true;
  const nextActionLabel = document.createElement("strong");
  nextActionLabel.textContent = text("workflowNextRequiredAction");
  const nextActionTitle = document.createElement("p");
  nextActionTitle.className = "podcast-admin__workflow-next-title";
  const nextActionDescription = document.createElement("p");
  nextActionDescription.className = "podcast-admin__workflow-next-description";
  nextAction.append(
    nextActionLabel,
    nextActionTitle,
    nextActionDescription
  );
  const remaining = document.createElement("details");
  remaining.className = "podcast-admin__workflow-more-blockers";
  remaining.hidden = true;
  const remainingSummary = document.createElement("summary");
  remaining.append(remainingSummary, blockers);

  function render({ nodes, next }) {
    nextAction.hidden = !next;
    nextActionTitle.textContent = next ? nodeLabel(next) : "";
    nextActionDescription.textContent = next ? nodeDescription(next) : "";
    nextActionDescription.hidden = !nextActionDescription.textContent;
    const others = nodes.filter((node) => node !== next);
    blockers.replaceChildren(...others.map((node) => {
      const item = document.createElement("li");
      const copy = document.createElement("span");
      copy.textContent = nodeLabel(node);
      const fix = document.createElement("button");
      fix.className = "btn btn-outline-light";
      fix.type = "button";
      fix.textContent = text("fixWorkflowIssue");
      fix.addEventListener("click", () => onNavigate(node));
      item.append(copy, fix);
      return item;
    }));
    remaining.hidden = others.length === 0;
    if (!others.length) remaining.open = false;
    remainingSummary.textContent = text(
      others.length === 1
        ? "workflowOtherBlocker"
        : "workflowOtherBlockers",
      { count: others.length }
    );
  }

  return {
    elements: [nextAction, remaining],
    render,
    clear() {
      render({ nodes: [], next: null });
    }
  };
}
