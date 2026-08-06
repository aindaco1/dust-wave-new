import assert from "node:assert/strict";
import test from "node:test";

const {
  formatTaxPercentage,
  taxPolicyMatchesCandidate,
  taxPolicyRequestBody
} = await import("../src/js/podcast-admin-tax-policy.js");

const candidate = {
  applicableMode: "test",
  jurisdictionCode: "US-NM-87120",
  ratePartsPerMillion: 76_250,
  inclusive: false,
  providerName: "nm_grt",
  sourceReference: "github:aindaco1/store@fixture:_config.yml",
  effectiveAt: "2026-08-02T00:00:00.000Z",
  expiresAt: null,
  displayName: "NM GRT",
  confirmation:
    "APPROVE_TAX_POLICY show_opera_en_la_selva US-NM-87120 76250"
};

test("formats the exact parts-per-million rate without tax math drift", () => {
  assert.equal(formatTaxPercentage(76_250), "7.625%");
  assert.equal(formatTaxPercentage(100_000), "10%");
  assert.equal(formatTaxPercentage(1_000_001), "—");
});

test("requires every immutable field before treating a candidate as assigned", () => {
  const policy = {
    ...candidate,
    providerMode: "test",
    status: "approved",
    assigned: true,
    providerReady: true
  };
  assert.equal(taxPolicyMatchesCandidate(policy, candidate), true);
  assert.equal(taxPolicyMatchesCandidate({
    ...policy,
    sourceReference: "github:aindaco1/store@other:_config.yml"
  }, candidate), false);
  assert.equal(taxPolicyMatchesCandidate({
    ...policy,
    providerReady: false
  }, candidate), false);
});

test("sends only allowlisted policy fields and trimmed confirmation", () => {
  assert.deepEqual(
    taxPolicyRequestBody(
      { ...candidate, ignoredProviderId: "txr_must_not_leave_browser" },
      `  ${candidate.confirmation}  `
    ),
    {
      jurisdictionCode: candidate.jurisdictionCode,
      ratePartsPerMillion: candidate.ratePartsPerMillion,
      inclusive: candidate.inclusive,
      providerName: candidate.providerName,
      sourceReference: candidate.sourceReference,
      effectiveAt: candidate.effectiveAt,
      expiresAt: candidate.expiresAt,
      displayName: candidate.displayName,
      confirmation: candidate.confirmation
    }
  );
});
