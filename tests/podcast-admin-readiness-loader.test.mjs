import assert from "node:assert/strict";
import test from "node:test";
import {
  createPublicationReadinessLoader
} from "../src/js/podcast-admin-readiness-loader.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function fixture() {
  const requests = [];
  const statuses = [];
  const readiness = [];
  const summary = { textContent: "" };
  const groups = { clears: 0, replaceChildren() { this.clears += 1; } };
  const client = {
    request(path) {
      const request = deferred();
      requests.push({ path, ...request });
      return request.promise;
    }
  };
  const load = createPublicationReadinessLoader({
    client,
    summary,
    groups,
    status: {},
    text: (key) => key,
    setStatus: (_root, message, error) => statuses.push({ message, error }),
    friendlyError: () => "friendly-error",
    selectedEpisodeId: () => "selected-episode",
    onReadiness: (value) => readiness.push(value)
  });
  return { groups, load, readiness, requests, statuses, summary };
}

test("automatic readiness refreshes coalesce one in-flight episode request", async () => {
  const state = fixture();
  const first = state.load("episode / one");
  const duplicate = state.load("episode / one");
  assert.equal(state.requests.length, 1);
  assert.equal(
    state.requests[0].path,
    "/v1/admin/episodes/episode%20%2F%20one/readiness"
  );
  const payload = { candidateGate: { ready: true } };
  state.requests[0].resolve(payload);
  assert.equal(await first, payload);
  assert.equal(await duplicate, payload);
  assert.equal(state.readiness.at(-1), payload);

  const refreshed = state.load("episode / one");
  assert.equal(state.requests.length, 2);
  state.requests[1].resolve(payload);
  await refreshed;
});

test("page and menu refreshes use the selected episode by default", async () => {
  const state = fixture();
  const loading = state.load();
  assert.equal(
    state.requests[0].path,
    "/v1/admin/episodes/selected-episode/readiness"
  );
  state.requests[0].resolve({ candidateGate: { ready: false } });
  await loading;
  assert.equal(state.groups.clears, 1);
  assert.equal(state.statuses[0].message, "loadingReadiness");
});

test("an explicit empty selection clears readiness without a request", async () => {
  const state = fixture();
  assert.equal(await state.load(""), null);
  assert.equal(state.requests.length, 0);
  assert.equal(state.summary.textContent, "createBeforeReadiness");
  assert.equal(state.readiness.at(-1), null);
});

test("readiness failures stay bounded and return a failed snapshot", async () => {
  const state = fixture();
  const loading = state.load("episode-1");
  state.requests[0].reject(new Error("provider details"));
  assert.equal(await loading, null);
  assert.equal(state.summary.textContent, "readinessFailed");
  assert.deepEqual(state.statuses.at(-1), {
    message: "friendly-error",
    error: true
  });
});
