import assert from "node:assert/strict";
import test from "node:test";

import {
  readinessNodeLabel,
  readinessNodeSummary
} from "../src/js/podcast-admin-readiness-copy.js";
import { mountWorkflowPriority } from "../src/js/podcast-admin-workflow-priority.js";

function element(tagName) {
  return {
    tagName,
    children: [],
    className: "",
    hidden: false,
    textContent: "",
    append(...children) {
      this.children.push(...children);
    },
    addEventListener() {},
    replaceChildren(...children) {
      this.children = children;
    }
  };
}

function findByClass(root, className) {
  if (root.className === className) return root;
  for (const child of root.children || []) {
    const match = findByClass(child, className);
    if (match) return match;
  }
  return null;
}

test("next action pairs the exact task with its localized explanation", () => {
  const document = { createElement: element };
  const priority = mountWorkflowPriority({
    document,
    text: (key, values = {}) => key === "workflowOtherBlocker"
      ? `${values.count} other blocker`
      : key,
    nodeLabel: ({ label }) => label,
    nodeDescription: ({ description }) => description,
    onNavigate() {}
  });
  const next = {
    label: "Exact delivery audio",
    description: "Exact delivery audio is missing required evidence."
  };

  priority.render({
    nodes: [next, { label: "Chapters", description: "Missing chapters." }],
    next
  });

  const [nextAction, remaining] = priority.elements;
  assert.equal(nextAction.hidden, false);
  assert.equal(
    findByClass(nextAction, "podcast-admin__workflow-next-title")
      ?.textContent,
    "Exact delivery audio"
  );
  assert.equal(
    findByClass(nextAction, "podcast-admin__workflow-next-description")
      ?.textContent,
    "Exact delivery audio is missing required evidence."
  );
  assert.equal(remaining.hidden, false);

  priority.clear();
  assert.equal(nextAction.hidden, true);
  assert.equal(remaining.hidden, true);
});

test("readiness cards and next actions share the same localized copy", () => {
  const translations = {
    dependencyFallback: "Dependency",
    readinessNode_core_delivery_audio: "Exact delivery audio",
    readinessSummary_missing: "%{label} is missing required evidence."
  };
  const text = (key, fallback = "", values = {}) => {
    const template = translations[key] || fallback;
    return template.replace(/%\{(\w+)\}/g, (_, name) => values[name] || "");
  };
  const node = {
    id: "core.delivery-audio",
    label: "Delivery audio",
    status: "missing"
  };

  assert.equal(readinessNodeLabel(text, node), "Exact delivery audio");
  assert.equal(
    readinessNodeSummary(text, node),
    "Exact delivery audio is missing required evidence."
  );
});
