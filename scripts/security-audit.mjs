import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Approved October 6, 2026 for trusted build-time glob patterns only.
// See documentation/testing.md. All other high/critical advisories still fail.
export const BRACES_ADVISORY = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
export const EXCEPTION_EXPIRES = Date.parse('2026-10-21T00:00:00Z');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const isBlocking = severity => severity === 'high' || severity === 'critical';

export function evaluateAudit(report, lockfile, now = Date.now()) {
  if (report?.auditReportVersion !== 2 || report.error || !report.vulnerabilities ||
      !report.metadata?.vulnerabilities || !lockfile?.packages || !Number.isFinite(now)) {
    throw new Error('Invalid npm audit report, lockfile or clock; refusing to pass the audit.');
  }
  const entries = Object.entries(report.vulnerabilities);
  const counts = report.metadata.vulnerabilities;
  if (counts.total !== entries.length || severities.some(severity =>
    counts[severity] !== entries.filter(([, item]) => item.severity === severity).length)) {
    throw new Error('Inconsistent npm audit vulnerability counts.');
  }
  const direct = new Map();
  const roots = (name, ancestors = []) => {
    const item = report.vulnerabilities[name];
    if (!item || item.name !== name || ancestors.includes(name) ||
        !severities.includes(item.severity) || !Array.isArray(item.via) || !item.via.length ||
        !Array.isArray(item.nodes) || !item.nodes.length) {
      throw new Error(`Invalid or cyclic npm audit dependency: ${name}`);
    }
    return item.via.flatMap(via => {
      if (typeof via === 'string') return roots(via, [...ancestors, name]);
      if (!via || via.name !== name || typeof via.url !== 'string' ||
          !severities.includes(via.severity)) {
        throw new Error(`Invalid npm audit advisory for ${name}`);
      }
      const key = `${name}:${via.url}:${via.severity}:${via.range}`;
      direct.set(key, { advisory: via, item });
      return [via];
    });
  };
  for (const [name, item] of entries) {
    const causes = roots(name);
    if (isBlocking(item.severity) && !causes.some(cause => isBlocking(cause.severity))) {
      throw new Error(`Unexplained high/critical vulnerability: ${name}`);
    }
  }
  const allowed = [];
  const blocked = [];
  for (const { advisory, item } of direct.values()) {
    if (!isBlocking(advisory.severity)) continue;
    const exceptionApplies = advisory.url === BRACES_ADVISORY &&
      advisory.name === 'braces' && advisory.dependency === 'braces' &&
      advisory.severity === 'high' && advisory.range === '<=3.0.3' &&
      item.nodes.every(path => /(^|\/)node_modules\/braces$/.test(path) &&
        lockfile.packages[path]?.version === '3.0.3') && now < EXCEPTION_EXPIRES;
    (exceptionApplies ? allowed : blocked).push(advisory);
  }
  return { allowed, blocked };
}

function main() {
  const result = spawnSync('npm', ['audit', '--json'], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120_000,
  });
  if (result.error || ![0, 1].includes(result.status)) {
    throw new Error(`npm audit failed to run: ${result.error?.message || result.stderr || result.status}`);
  }
  const report = JSON.parse(result.stdout);
  const lockfile = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const { allowed, blocked } = evaluateAudit(report, lockfile);
  console.log('npm audit vulnerability counts:', JSON.stringify(report.metadata.vulnerabilities));
  for (const advisory of allowed) {
    console.warn(`APPROVED EXCEPTION through October 20, 2026 (UTC): ${advisory.name} 3.0.3 — ${advisory.url}`);
  }
  for (const advisory of blocked) console.error(`BLOCKED ${advisory.severity}: ${advisory.name} — ${advisory.url}`);
  if (blocked.length) process.exitCode = 1;
  else console.log('Dependency audit gate passed with the exceptions reported above.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
