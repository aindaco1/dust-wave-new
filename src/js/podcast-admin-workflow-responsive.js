import {
  mountResponsiveTabSelect
} from "./dust-wave-admin-shell/tabs.js?v=0.10.2";
import {
  workflowOptionLabel
} from "./podcast-admin-workflow-option-label.js";

export function mountWorkflowResponsiveSelect(root, {
  label,
  onSelect
}) {
  const tabList = root?.querySelector?.('[role="tablist"]');
  if (!tabList) throw new TypeError("A workflow tab list is required");
  return mountResponsiveTabSelect(root, {
    activeValue: "details",
    buttonSelector: "[data-workflow-step]",
    id: "podcast-publish-workflow-section",
    label,
    optionLabel: workflowOptionLabel,
    tabList,
    value: (button) => button.dataset.workflowStep,
    activate: (value) => onSelect?.(value)
  });
}
