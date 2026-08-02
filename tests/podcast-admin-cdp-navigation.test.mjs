import assert from "node:assert/strict";
import test from "node:test";
import { navigatePodcastAdminTrace } from
  "../scripts/lib/podcast-admin-cdp-navigation.mjs";

function fakeCdp(responses) {
  const calls = [];
  return {
    calls,
    async send(method, params, timeoutMs) {
      calls.push({ method, params, timeoutMs });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    }
  };
}

test("navigates with the bounded DevTools timeout", async () => {
  const cdp = fakeCdp([{ frameId: "frame-1" }]);
  const result = await navigatePodcastAdminTrace(
    cdp,
    "https://example.test/admin/podcasts/",
    { attemptTimeoutMs: 123, retryDelayMs: 0 }
  );
  assert.equal(result.frameId, "frame-1");
  assert.deepEqual(cdp.calls, [{
    method: "Page.navigate",
    params: { url: "https://example.test/admin/podcasts/" },
    timeoutMs: 123
  }]);
});

test("retries one transient Page.navigate timeout", async () => {
  const cdp = fakeCdp([
    new Error("DevTools command timed out: Page.navigate."),
    { frameId: "frame-2" }
  ]);
  const result = await navigatePodcastAdminTrace(
    cdp,
    "https://example.test/admin/podcasts/",
    { attemptTimeoutMs: 123, retryDelayMs: 0 }
  );
  assert.equal(result.frameId, "frame-2");
  assert.equal(cdp.calls.length, 2);
});

test("does not retry protocol errors or failed navigations", async () => {
  const protocolCdp = fakeCdp([new Error("DevTools Page.navigate failed")]);
  await assert.rejects(
    navigatePodcastAdminTrace(
      protocolCdp,
      "https://example.test/admin/podcasts/",
      { retryDelayMs: 0 }
    ),
    /DevTools Page\.navigate failed/
  );
  assert.equal(protocolCdp.calls.length, 1);

  const navigationCdp = fakeCdp([{ errorText: "net::ERR_FAILED" }]);
  await assert.rejects(
    navigatePodcastAdminTrace(
      navigationCdp,
      "https://example.test/admin/podcasts/",
      { retryDelayMs: 0 }
    ),
    /Chrome navigation failed: net::ERR_FAILED/
  );
  assert.equal(navigationCdp.calls.length, 1);
});
