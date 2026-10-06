import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAudit, BRACES_ADVISORY, EXCEPTION_EXPIRES } from '../scripts/security-audit.mjs';

function fixture() {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      braces: { name: 'braces', severity: 'high', nodes: ['node_modules/braces'], via: [
        { name: 'braces', dependency: 'braces', severity: 'high', range: '<=3.0.3', url: BRACES_ADVISORY },
      ] },
      chokidar: { name: 'chokidar', severity: 'high', nodes: ['node_modules/chokidar'], via: ['braces'] },
    },
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 2, critical: 0, total: 2 } },
  };
}
const lock = { packages: { 'node_modules/braces': { version: '3.0.3' } } };
const now = Date.parse('2026-10-06T12:00:00Z');

test('allows only the approved braces advisory and its transitive reports until expiry', () => {
  const result = evaluateAudit(fixture(), lock, EXCEPTION_EXPIRES - 1);
  assert.equal(result.allowed.length, 1);
  assert.deepEqual(result.blocked, []);
  assert.equal(evaluateAudit(fixture(), lock, EXCEPTION_EXPIRES).blocked.length, 1);
});

test('other high and critical advisories still block, including on braces itself', () => {
  for (const severity of ['high', 'critical']) {
    const report = fixture();
    report.vulnerabilities.braces.via.push({ name: 'braces', severity, url: 'https://github.com/advisories/GHSA-new' });
    assert.equal(evaluateAudit(report, lock, now).blocked.length, 1);
  }
  const report = fixture();
  report.vulnerabilities.chokidar.via.push({ name: 'chokidar', severity: 'high', url: 'https://github.com/advisories/GHSA-other' });
  assert.equal(evaluateAudit(report, lock, now).blocked.length, 1);
});

test('changed versions, advisory ranges or severity cannot reuse the exception', () => {
  const changedLock = { packages: { 'node_modules/braces': { version: '3.0.2' } } };
  assert.equal(evaluateAudit(fixture(), changedLock, now).blocked.length, 1);
  assert.equal(evaluateAudit(fixture(), { packages: {} }, now).blocked.length, 1);
  for (const [key, value] of [['range', '<=3.0.4'], ['severity', 'critical'], ['dependency', 'another-package']]) {
    const report = fixture();
    report.vulnerabilities.braces.via[0][key] = value;
    assert.equal(evaluateAudit(report, lock, now).blocked.length, 1);
  }
});

test('malformed, incomplete and cyclic reports fail closed', () => {
  assert.throws(() => evaluateAudit({}, lock, now));
  for (const mutate of [
    r => { r.error = { message: 'registry unavailable' }; },
    r => { r.metadata.vulnerabilities.total = 0; },
    r => { r.vulnerabilities.chokidar.via = ['missing']; },
    r => { r.vulnerabilities.braces.via = ['chokidar']; },
    r => { r.vulnerabilities.braces.via = []; },
    r => { r.vulnerabilities.braces.via[0].severity = 'moderate'; },
  ]) {
    const report = fixture(); mutate(report);
    assert.throws(() => evaluateAudit(report, lock, now));
  }
});

test('clean reports pass after expiry and moderate advisories retain the high threshold', () => {
  const report = fixture();
  report.vulnerabilities = {};
  report.metadata.vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  assert.deepEqual(evaluateAudit(report, lock, EXCEPTION_EXPIRES), { allowed: [], blocked: [] });
  report.vulnerabilities.example = { name: 'example', severity: 'moderate', nodes: ['node_modules/example'], via: [
    { name: 'example', severity: 'moderate', url: 'https://github.com/advisories/GHSA-moderate' },
  ] };
  report.metadata.vulnerabilities.moderate = report.metadata.vulnerabilities.total = 1;
  assert.deepEqual(evaluateAudit(report, lock, now), { allowed: [], blocked: [] });
});
