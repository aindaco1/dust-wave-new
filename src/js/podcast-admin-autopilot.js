import { deriveEpisodeAutopilot } from "./podcast-admin-autopilot-core.js";

const METRICS = [
  ["runningWork", "autopilotRunningWork"],
  ["approvalWaits", "autopilotApprovalWaits"],
  ["providerDelays", "autopilotProviderDelays"],
  ["terminalFailures", "autopilotTerminalFailures"]
];

export function mountEpisodeAutopilot({ document, text }) {
  const section = document.createElement("section");
  section.className = "podcast-admin__autopilot";
  const heading = document.createElement("div");
  heading.className = "podcast-admin__autopilot-heading";
  const headingCopy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = text("autopilotHeading");
  const intro = document.createElement("p");
  intro.textContent = text("autopilotIntro");
  headingCopy.append(title, intro);
  const state = document.createElement("strong");
  state.className = "podcast-admin__autopilot-state";
  state.setAttribute("role", "status");
  state.setAttribute("aria-live", "polite");
  heading.append(headingCopy, state);
  const metrics = document.createElement("dl");
  metrics.className = "podcast-admin__autopilot-metrics";
  const values = new Map();
  for (const [key, labelKey] of METRICS) {
    const metric = document.createElement("div");
    const label = document.createElement("dt");
    label.textContent = text(labelKey);
    const value = document.createElement("dd");
    value.textContent = "0";
    metric.append(label, value);
    metrics.append(metric);
    values.set(key, value);
  }
  section.append(heading, metrics);

  function render(readiness) {
    const derived = deriveEpisodeAutopilot(readiness);
    state.dataset.state = derived.state;
    state.textContent = text(`autopilotState_${derived.state}`);
    for (const [key] of METRICS) {
      values.get(key).textContent = String(derived[key].length);
    }
    return derived;
  }

  render(null);
  return { element: section, render };
}
