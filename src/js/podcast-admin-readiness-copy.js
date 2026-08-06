export function readinessNodeLabel(text, readinessNode) {
  const id = String(readinessNode?.id || "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return text(
    `readinessNode_${id}`,
    String(readinessNode?.label || text("dependencyFallback"))
  );
}

export function readinessNodeSummary(text, readinessNode) {
  const status = String(readinessNode?.status || "missing");
  return text(
    `readinessSummary_${status}`,
    String(readinessNode?.summary || ""),
    { label: readinessNodeLabel(text, readinessNode) }
  );
}
