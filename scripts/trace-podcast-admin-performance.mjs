import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  rm,
  stat
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const DEFAULT_URL =
  "https://dust-wave-website-staging.pages.dev/admin/podcasts/";
const DEFAULT_DURATION_SECONDS = 8;
const DEFAULT_VIEWPORT = "1440x900";
const SUPPORTED_EXECUTABLE_NAMES = new Set([
  "chrome",
  "chrome.exe",
  "chromium",
  "chromium-browser",
  "google chrome",
  "google chrome for testing",
  "google-chrome",
  "google-chrome-stable"
]);
const TRACE_CATEGORIES = [
  "blink.user_timing",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "loading",
  "net",
  "v8.execute"
].join(",");
const SAFE_CHROME_STARTUP_DOCUMENTS = new Set([
  "about:blank",
  "chrome://new-tab-page/",
  "chrome://newtab/",
  "chrome://webui-toolbar.top-chrome/"
]);

function usage() {
  return `Capture an isolated Chrome performance trace for Podcast Admin.

Usage:
  npm run perf:podcast-admin:trace -- [options]

Options:
  --url <https-url>       Page to trace (default: isolated staging)
  --output <file.json>    Trace destination (default: .artifacts/performance/)
  --duration <seconds>    Recording time, 3-60 (default: ${DEFAULT_DURATION_SECONDS})
  --viewport <WIDTHxHEIGHT>
                          Browser viewport (default: ${DEFAULT_VIEWPORT})
  --chrome <path>         Chrome/Chromium executable
  --help                  Show this help

The trace uses a temporary, extension-free browser profile and contains no
existing Chrome cookies. Trace files can still contain visited URLs and page
content metadata; review them before sharing.
`;
}

function readArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      values.set("help", true);
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    values.set(key, value);
    index += 1;
  }
  return values;
}

function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Trace URL must use HTTPS (HTTP is allowed only for localhost).");
  }
  return url.toString();
}

function validateDuration(value) {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 3 || seconds > 60) {
    throw new Error("Trace duration must be an integer from 3 through 60 seconds.");
  }
  return seconds;
}

function validateViewport(value) {
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(value);
  if (!match) {
    throw new Error("Viewport must use WIDTHxHEIGHT, for example 1440x900.");
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 320 || width > 3840 || height < 568 || height > 2160) {
    throw new Error("Viewport must be between 320x568 and 3840x2160.");
  }
  return { width, height };
}

function assertSupportedExecutable(candidate) {
  if (!SUPPORTED_EXECUTABLE_NAMES.has(basename(candidate).toLowerCase())) {
    throw new Error(
      `Unsupported browser executable "${basename(candidate)}". ` +
        "Use a dedicated Google Chrome or Chromium executable; wrappers " +
        "and Chromium-derived personal browsers can reuse live profiles."
    );
  }
}

async function playwrightChromeCandidates() {
  const configuredCache = String(
    process.env.PLAYWRIGHT_BROWSERS_PATH || ""
  ).trim();
  const cacheRoots = configuredCache && configuredCache !== "0"
    ? [resolve(configuredCache)]
    : process.platform === "darwin"
      ? [join(homedir(), "Library", "Caches", "ms-playwright")]
      : process.platform === "win32"
        ? [
            join(
              process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
              "ms-playwright"
            )
          ]
        : [join(homedir(), ".cache", "ms-playwright")];
  const relativeExecutables = process.platform === "darwin"
    ? [
        join(
          "chrome-mac-arm64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing"
        ),
        join(
          "chrome-mac",
          "Chromium.app",
          "Contents",
          "MacOS",
          "Chromium"
        )
      ]
    : process.platform === "win32"
      ? [
          join("chrome-win64", "chrome.exe"),
          join("chrome-win", "chrome.exe")
        ]
      : [
          join("chrome-linux64", "chrome"),
          join("chrome-linux", "chrome")
        ];
  const candidates = [];

  for (const cacheRoot of cacheRoots) {
    let entries;
    try {
      entries = await readdir(cacheRoot, { withFileTypes: true });
    } catch {
      continue;
    }

    const browsers = entries
      .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
      .sort((left, right) =>
        right.name.localeCompare(left.name, undefined, { numeric: true })
      );
    for (const browser of browsers) {
      for (const executable of relativeExecutables) {
        candidates.push(join(cacheRoot, browser.name, executable));
      }
    }
  }

  return candidates;
}

async function findChrome(explicitPath) {
  if (explicitPath) {
    await access(explicitPath);
    assertSupportedExecutable(explicitPath);
    return explicitPath;
  }

  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    ...await playwrightChromeCandidates()
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
    } catch {
      // Try the next known executable.
      continue;
    }

    assertSupportedExecutable(candidate);
    return candidate;
  }

  throw new Error(
    "Chrome was not found. Pass --chrome /absolute/path or set CHROME_BIN."
  );
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForTrace(
  outputPath,
  child,
  durationSeconds,
  getLaunchError
) {
  const deadline = Date.now() + durationSeconds * 1_000 + 15_000;
  let previousSize = -1;
  let stableChecks = 0;

  while (Date.now() < deadline) {
    if (getLaunchError()) {
      throw getLaunchError();
    }
    if (child.exitCode !== null) {
      break;
    }
    try {
      const details = await stat(outputPath);
      stableChecks = details.size > 1_024 && details.size === previousSize
        ? stableChecks + 1
        : 0;
      previousSize = details.size;
      if (stableChecks >= 2) {
        return details;
      }
    } catch {
      // Chrome writes the trace only after the configured recording duration.
    }
    await delay(500);
  }

  try {
    return await stat(outputPath);
  } catch {
    throw new Error("Chrome exited without producing a trace file.");
  }
}

async function stopChrome(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    delay(5_000)
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function verifyJsonTrace(outputPath, targetUrl) {
  const file = await open(outputPath, "r");
  try {
    const buffer = Buffer.alloc(65_536);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const header = buffer.subarray(0, bytesRead).toString("utf8");
    if (!header.includes("traceEvents")) {
      throw new Error(
        "Chrome produced a file, but it is not a DevTools-compatible JSON trace."
      );
    }
  } finally {
    await file.close();
  }

  const parsed = JSON.parse(await readFile(outputPath, "utf8"));
  const events = Array.isArray(parsed) ? parsed : parsed.traceEvents;
  if (!Array.isArray(events)) {
    throw new Error("Chrome trace does not contain a traceEvents array.");
  }

  const outermostDocuments = new Set(
    events
      .filter(
        (event) =>
          event.name === "navigationStart" &&
          event.args?.data?.isOutermostMainFrame === true &&
          event.args.data.documentLoaderURL
      )
      .map((event) => event.args.data.documentLoaderURL)
  );
  const unexpectedDocuments = [...outermostDocuments].filter(
    (documentUrl) =>
      documentUrl !== targetUrl
      && !SAFE_CHROME_STARTUP_DOCUMENTS.has(documentUrl)
  );
  if (!outermostDocuments.has(targetUrl) || unexpectedDocuments.length > 0) {
    throw new Error(
      "Trace isolation check failed because an unexpected top-level page was " +
        "recorded. The generated trace has been removed. Recorded pages: " +
        ([...outermostDocuments].join(", ") || "(none)")
    );
  }
}

async function main() {
  const argumentsMap = readArguments(process.argv.slice(2));
  if (argumentsMap.get("help")) {
    process.stdout.write(usage());
    return;
  }

  const url = validateUrl(
    argumentsMap.get("url") || process.env.PODCAST_PERF_URL || DEFAULT_URL
  );
  const durationSeconds = validateDuration(
    argumentsMap.get("duration") || DEFAULT_DURATION_SECONDS
  );
  const viewport = validateViewport(
    argumentsMap.get("viewport") || DEFAULT_VIEWPORT
  );
  const chromePath = await findChrome(argumentsMap.get("chrome"));
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const outputPath = resolve(
    argumentsMap.get("output") ||
      `.artifacts/performance/podcast-admin-${timestamp}.json`
  );

  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await stat(outputPath);
    throw new Error(
      `Refusing to overwrite existing trace: ${outputPath}. Choose another --output.`
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  const profileDirectory = await mkdtemp(
    join(tmpdir(), "dust-wave-podcast-trace-")
  );

  const chromeArguments = [
    "--headless",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-breakpad",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${viewport.width},${viewport.height}`,
    `--trace-startup=${TRACE_CATEGORIES}`,
    `--trace-startup-duration=${durationSeconds}`,
    `--trace-startup-file=${outputPath}`,
    "--trace-startup-format=json",
    url
  ];

  const child = spawn(chromePath, chromeArguments, {
    stdio: ["ignore", "ignore", "pipe"]
  });
  let launchError;
  child.on("error", (error) => {
    launchError = error;
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8_192);
  });

  try {
    const traceDetails = await waitForTrace(
      outputPath,
      child,
      durationSeconds,
      () => launchError
    );
    await stopChrome(child);
    await verifyJsonTrace(outputPath, url);
    process.stdout.write(
      [
        "Podcast Admin Chrome trace captured.",
        `URL: ${url}`,
        `Viewport: ${viewport.width}x${viewport.height}`,
        `Duration: ${durationSeconds}s`,
        `Trace: ${outputPath}`,
        `Size: ${traceDetails.size.toLocaleString("en-US")} bytes`,
        "",
        "Open the JSON file in Chrome DevTools Performance > Load profile.",
        "Review trace URLs and metadata before sharing the artifact.",
        ""
      ].join("\n")
    );
  } catch (error) {
    await stopChrome(child);
    await rm(outputPath, { force: true });
    const details = stderr.trim() ? `\nChrome output:\n${stderr.trim()}` : "";
    throw new Error(`${error.message}${details}`);
  } finally {
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
