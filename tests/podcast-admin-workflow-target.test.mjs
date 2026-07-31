import assert from "node:assert/strict";
import test from "node:test";
import { revealWorkflowTarget } from "../src/js/podcast-admin-workflow-target.js";

test("workflow target moves focus after the initiating click completes", () => {
  let scheduled = null;
  let scrollOptions = null;
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
    scrollIntoView(options) {
      scrollOptions = options;
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
  assert.equal(scrollOptions, null);
  assert.equal(focusOptions, null);

  scheduled();

  assert.deepEqual(scrollOptions, { behavior: "smooth", block: "start" });
  assert.deepEqual(focusOptions, { preventScroll: true });
  assert.equal(hiddenFocusCalled, false);
});
