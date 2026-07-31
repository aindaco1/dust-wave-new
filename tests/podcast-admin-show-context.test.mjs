import assert from "node:assert/strict";
import test from "node:test";
import { mountPodcastShowContext } from "../src/js/podcast-admin-show-context.js";

function fixture() {
  const ownerDocument = {
    createElement() {
      return { selected: false, textContent: "", value: "" };
    }
  };
  const name = { hidden: true, textContent: "" };
  const select = {
    hidden: false,
    options: [],
    ownerDocument,
    value: "",
    replaceChildren(...options) {
      this.options = options;
      this.value = options.find(({ selected }) => selected)?.value
        || options[0]?.value
        || "";
    }
  };
  const container = {
    hidden: false,
    querySelector(selector) {
      return selector === "[data-podcast-show-name]" ? name : select;
    }
  };
  const root = {
    querySelectorAll() {
      return [container];
    }
  };
  return { container, name, root, select };
}

test("single-show launch replaces selector chrome with the show name", () => {
  const { container, name, root, select } = fixture();
  const context = mountPodcastShowContext(root);
  context.setShows([{ id: "show-one", title: "Show one" }], "show-one");

  assert.equal(container.hidden, false);
  assert.equal(name.hidden, false);
  assert.equal(name.textContent, "Show one");
  assert.equal(select.hidden, true);
  assert.equal(select.value, "show-one");
  assert.deepEqual(context.selects, [select]);
});

test("multi-show mode restores the synchronized accessible selector", () => {
  const { name, root, select } = fixture();
  const context = mountPodcastShowContext(root);
  context.setShows([
    { id: "show-one", title: "Show one" },
    { id: "show-two", title: "Show two" }
  ], "show-two");

  assert.equal(name.hidden, true);
  assert.equal(select.hidden, false);
  assert.equal(select.value, "show-two");
  assert.deepEqual(
    select.options.map(({ textContent }) => textContent),
    ["Show one", "Show two"]
  );
});

test("empty show state conceals both presentation modes", () => {
  const { container, name, root, select } = fixture();
  mountPodcastShowContext(root).setShows([], "");

  assert.equal(container.hidden, true);
  assert.equal(name.hidden, true);
  assert.equal(select.hidden, false);
  assert.equal(select.value, "");
});
