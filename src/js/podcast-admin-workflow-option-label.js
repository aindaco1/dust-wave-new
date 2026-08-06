export function workflowOptionLabel(button) {
  const title = button?.querySelector?.("strong")?.textContent?.trim() || "";
  const status = button?.querySelector?.(
    ".dw-admin-workflow__status"
  )?.textContent?.trim() || "";
  return [title, status].filter(Boolean).join(" — ");
}
