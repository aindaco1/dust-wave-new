import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const repositoryRoot = new URL("../", import.meta.url);
const testsDirectory = new URL("tests/", repositoryRoot);
const testFiles = (await readdir(testsDirectory))
  .filter((name) => name.startsWith("podcast-") && name.endsWith(".test.mjs"))
  .map((name) => `tests/${name}`)
  .sort();
testFiles.push(
  "tests/cloudflare-response-headers.test.mjs",
  "tests/datatype-chart.test.mjs"
);
assert(testFiles.length >= 45, "Podcast regression manifest is unexpectedly small");

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: new URL(repositoryRoot),
  encoding: "utf8",
  stdio: "inherit"
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
