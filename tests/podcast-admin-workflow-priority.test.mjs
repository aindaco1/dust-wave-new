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
    dataset: {},
    hidden: false,
    listeners: {},
    textContent: "",
    append(...children) {
      this.children.push(...children);
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    click() {
      this.listeners.click?.();
    },
    replaceChildren(...children) {
      this.children = children;
    }
  };
}

test("every release blocker links to its exact owning workflow step", () => {
  const document = { createElement: element };
  const navigated = [];
  const priority = mountWorkflowPriority({
    document,
    nodeLabel: ({ label }) => label,
    nodeDescription: ({ description }) => description,
    nodeStep: ({ step }) => step,
    onNavigate(node) {
      navigated.push(node.label);
    }
  });
  const media = {
    label: "Exact delivery audio",
    description: "Exact delivery audio is missing required evidence.",
    step: "media"
  };
  const review = {
    label: "Editorial approval",
    description: "Editorial approval is required.",
    step: "review"
  };

  priority.render({
    nodes: [media, review]
  });

  const [blockers] = priority.elements;
  assert.equal(blockers.hidden, false);
  assert.equal(blockers.children.length, 2);
  const [mediaLink, reviewLink] = blockers.children.map(
    (item) => item.children[0]
  );
  assert.equal(
    mediaLink.className,
    "podcast-admin__workflow-blocker-link"
  );
  assert.equal(mediaLink.dataset.podcastWorkflowBlockerStep, "media");
  assert.equal(reviewLink.dataset.podcastWorkflowBlockerStep, "review");
  assert.equal(
    mediaLink.children[0].textContent,
    "Exact delivery audio"
  );
  assert.equal(
    mediaLink.children[1].textContent,
    "Exact delivery audio is missing required evidence."
  );
  mediaLink.click();
  reviewLink.click();
  assert.deepEqual(navigated, ["Exact delivery audio", "Editorial approval"]);

  priority.clear();
  assert.equal(blockers.hidden, true);
  assert.equal(blockers.children.length, 0);
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
