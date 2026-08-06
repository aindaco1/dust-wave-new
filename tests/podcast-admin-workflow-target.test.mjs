import assert from "node:assert/strict";
import test from "node:test";
import {
  createExactWorkflowNavigator,
  revealWorkflowTarget
} from "../src/js/podcast-admin-workflow-target.js";

test("workflow target moves focus after the initiating click completes", () => {
  let scheduled = null;
  let scrollCalled = false;
  let focusOptions = null;
  let hiddenFocusCalled = false;
  const sibling = {
    open: true,
    matches(selector) {
      return selector === "details.podcast-admin__progressive-section[open]";
    }
  };
  const disclosure = {
    classList: {
      contains(value) {
        return value === "podcast-admin__progressive-section";
      }
    },
    closest() {
      return null;
    },
    open: false,
    parentElement: null
  };
  disclosure.parentElement = { children: [sibling, disclosure] };
  const focusTarget = {
    closest() {
      return null;
    },
    focus(options) {
      focusOptions = options;
    }
  };
  const summary = {
    closest() {
      return null;
    },
    focus() {
      assert.fail("the visible form control should precede the summary");
    }
  };
  const hiddenTarget = {
    closest(selector) {
      return selector === "[hidden]" ? {} : null;
    },
    focus() {
      hiddenFocusCalled = true;
    }
  };
  const target = {
    closest(selector) {
      if (selector === "details") return disclosure;
      return null;
    },
    matches() {
      return false;
    },
    querySelectorAll() {
      return [hiddenTarget, focusTarget];
    },
    scrollIntoView() {
      scrollCalled = true;
    }
  };
  disclosure.querySelector = (selector) =>
    selector === ":scope > summary" ? summary : null;
  const document = {
    defaultView: {
      matchMedia() {
        return { matches: false };
      },
      getComputedStyle() {
        return { display: "block", visibility: "visible" };
      },
      setTimeout(callback, delay) {
        assert.equal(delay, 0);
        scheduled = callback;
        return 1;
      }
    }
  };

  revealWorkflowTarget(target, document);

  assert.equal(disclosure.open, true);
  assert.equal(sibling.open, false);
  assert.equal(typeof scheduled, "function");
  assert.equal(scrollCalled, false);
  assert.equal(focusOptions, null);

  scheduled();

  assert.equal(scrollCalled, false);
  assert.deepEqual(focusOptions, { preventScroll: true });
  assert.equal(hiddenFocusCalled, false);
});

test("transcript review selects the linked episode and reveals the editor", () => {
  let selectedEpisode = "";
  let scrolled = false;
  const control = {
    ownerDocument: {
      defaultView: {
        Event: class {
          constructor(type) { this.type = type; }
        }
      }
    },
    value: "",
    dispatchEvent(event) {
      assert.equal(event.type, "change");
      selectedEpisode = this.value;
    }
  };
  const workbench = {
    closest() { return null; },
    matches() { return false; },
    querySelectorAll() { return []; },
    scrollIntoView() { scrolled = true; }
  };
  const root = {
    ownerDocument: {
      defaultView: {
        matchMedia: () => ({ matches: true }),
        getComputedStyle: () => ({ display: "block", visibility: "visible" }),
        setTimeout(callback) { callback(); }
      }
    },
    querySelector(selector) {
      if (selector === "[data-podcast-transcript-workbench]") return workbench;
      if (selector === "[data-podcast-transcript-episode]") return control;
      return null;
    }
  };

  const navigate = createExactWorkflowNavigator(root);
  assert.equal(navigate("transcript_review", "episode_1"), true);
  assert.equal(selectedEpisode, "episode_1");
  assert.equal(scrolled, false);
});
