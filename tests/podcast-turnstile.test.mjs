import assert from "node:assert/strict";
import test from "node:test";

import {
  createPodcastTurnstileLoader,
  resetPodcastTurnstile
} from "../src/js/podcast-turnstile.js";

function loaderFixture({ fail = false } = {}) {
  const scope = {};
  const scripts = [];
  const document = {
    createElement() {
      const listeners = new Map();
      return {
        addEventListener(name, listener) {
          listeners.set(name, listener);
        },
        dispatch(name, value) {
          listeners.get(name)?.(value);
        }
      };
    },
    head: {
      append(script) {
        scripts.push(script);
        queueMicrotask(() => {
          if (fail) script.dispatch("error", new Error("network"));
          else {
            scope.turnstile = { render() {} };
            script.dispatch("load");
          }
        });
      }
    }
  };
  return { scope, scripts, load: createPodcastTurnstileLoader({ scope, document }) };
}

test("loads one privacy-hardened explicit Turnstile script per page", async () => {
  const fixture = loaderFixture();
  const first = fixture.load();
  const second = fixture.load();

  assert.strictEqual(first, second);
  assert.equal(await first, fixture.scope.turnstile);
  assert.equal(fixture.scripts.length, 1);
  assert.equal(fixture.scripts[0].async, true);
  assert.equal(fixture.scripts[0].defer, true);
  assert.equal(fixture.scripts[0].referrerPolicy, "no-referrer");
  assert.equal(
    fixture.scripts[0].src,
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  );
});

test("surfaces loader failures and resets only mounted widgets", async () => {
  const failure = loaderFixture({ fail: true });
  await assert.rejects(failure.load(), /network/);

  const resets = [];
  const scope = { turnstile: { reset: (id) => resets.push(id) } };
  resetPodcastTurnstile(undefined, scope);
  resetPodcastTurnstile("widget-1", scope);
  assert.deepEqual(resets, ["widget-1"]);
});
