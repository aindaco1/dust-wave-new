import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const DEFAULT_URL =
  "https://dust-wave-website-staging.pages.dev/admin/podcasts/";
const DEFAULT_DURATION_SECONDS = 8;
const DEFAULT_VIEWPORT = "1440x900";
const ADMIN_TABS = new Set([
  "overview",
  "episodes",
  "production",
  "distribution",
  "marketing",
  "sponsors",
  "analytics",
  "subscribers",
  "billing"
]);
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
const CSP_VIOLATION_PROBE = `(() => {
  globalThis.__dustWaveCspViolations = [];
  document.addEventListener("securitypolicyviolation", (event) => {
    globalThis.__dustWaveCspViolations.push({
      blockedUrl: event.blockedURI,
      disposition: event.disposition,
      effectiveDirective: event.effectiveDirective,
      lineNumber: event.lineNumber,
      sourceFile: event.sourceFile
    });
  });
})();`;

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
  --admin-tab <name>      Open a specific admin tab before recording
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

function validateAdminTab(value) {
  const tab = String(value || "").trim();
  if (tab && !ADMIN_TABS.has(tab)) {
    throw new Error(
      `Admin tab must be one of: ${[...ADMIN_TABS].join(", ")}.`
    );
  }
  return tab;
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

async function connectToCdp(
  profileDirectory,
  child,
  getLaunchError
) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (getLaunchError()) {
      throw getLaunchError();
    }
    if (child.exitCode !== null) {
      throw new Error("Chrome exited before DevTools became available.");
    }
    try {
      const activePort = await readFile(
        join(profileDirectory, "DevToolsActivePort"),
        "utf8"
      );
      const port = Number(activePort.split(/\r?\n/, 1)[0]);
      if (Number.isInteger(port) && port > 0 && port < 65_536) {
        const response = await fetch(
          `http://127.0.0.1:${port}/json/list`,
          { signal: AbortSignal.timeout(2_000) }
        );
        if (!response.ok) {
          throw new Error(`DevTools target lookup failed (${response.status}).`);
        }
        const targets = await response.json();
        const page = targets.find((target) =>
          target.type === "page"
          && typeof target.webSocketDebuggerUrl === "string"
        );
        if (page) {
          return new CdpSession(page.webSocketDebuggerUrl);
        }
      }
    } catch {
      // Chrome may not have written its DevTools endpoint yet.
    }
    await delay(100);
  }
  throw new Error("Chrome did not expose a DevTools page within 15 seconds.");
}

class CdpSession {
  constructor(url) {
    if (typeof WebSocket !== "function") {
      throw new Error(
        "This trace command requires the Node.js WebSocket runtime."
      );
    }
    this.nextId = 1;
    this.pending = new Map();
    this.queuedEvents = new Map();
    this.eventWaiters = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolveReady, rejectReady) => {
      const timeout = setTimeout(
        () => rejectReady(new Error("DevTools WebSocket connection timed out.")),
        10_000
      );
      this.socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolveReady();
      }, { once: true });
      this.socket.addEventListener("error", () => {
        clearTimeout(timeout);
        rejectReady(new Error("DevTools WebSocket connection failed."));
      }, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      this.receive(event.data);
    });
    this.socket.addEventListener("close", () => {
      const error = new Error("DevTools WebSocket closed unexpectedly.");
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.pending.clear();
    });
  }

  async send(method, params = {}, timeoutMs = 30_000) {
    await this.ready;
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveResult, rejectResult) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectResult(new Error(`DevTools command timed out: ${method}.`));
      }, timeoutMs);
      this.pending.set(id, {
        method,
        reject: rejectResult,
        resolve: resolveResult,
        timeout
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async waitForEvent(method, timeoutMs = 30_000) {
    await this.ready;
    const queued = this.queuedEvents.get(method);
    if (queued?.length) {
      return queued.shift();
    }
    return new Promise((resolveEvent, rejectEvent) => {
      const timeout = setTimeout(() => {
        const waiters = this.eventWaiters.get(method) ?? [];
        this.eventWaiters.set(
          method,
          waiters.filter((waiter) => waiter.resolve !== resolveEvent)
        );
        rejectEvent(new Error(`DevTools event timed out: ${method}.`));
      }, timeoutMs);
      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push({
        resolve: resolveEvent,
        reject: rejectEvent,
        timeout
      });
      this.eventWaiters.set(method, waiters);
    });
  }

  close() {
    if (this.socket.readyState < WebSocket.CLOSING) {
      this.socket.close();
    }
  }

  receive(raw) {
    let message;
    try {
      message = JSON.parse(typeof raw === "string" ? raw : String(raw));
    } catch {
      return;
    }
    if (Number.isInteger(message.id)) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) {
        pending.reject(
          new Error(
            `DevTools ${pending.method} failed: `
            + String(message.error.message || "unknown error")
          )
        );
      } else {
        pending.resolve(message.result ?? {});
      }
      return;
    }
    if (!message.method) return;
    const waiters = this.eventWaiters.get(message.method) ?? [];
    const waiter = waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timeout);
      waiter.resolve(message.params ?? {});
      this.eventWaiters.set(message.method, waiters);
      return;
    }
    const queued = this.queuedEvents.get(message.method) ?? [];
    queued.push(message.params ?? {});
    this.queuedEvents.set(message.method, queued.slice(-10));
  }
}

async function captureTrace({
  adminTab,
  cdp,
  durationSeconds,
  outputPath,
  url,
  viewport
}) {
  const mobile = viewport.width < 768;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: CSP_VIOLATION_PROBE
  });
  if (adminTab) {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source:
        `sessionStorage.setItem("dustwave-podcast-admin-tab", ${
          JSON.stringify(adminTab)
        });`
    });
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    positionX: 0,
    positionY: 0,
    dontSetVisibleSize: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: mobile,
    maxTouchPoints: mobile ? 5 : 1
  });
  await cdp.send("Tracing.start", {
    categories: TRACE_CATEGORIES,
    options: "record-as-much-as-possible",
    transferMode: "ReturnAsStream"
  });
  const navigation = await cdp.send("Page.navigate", { url });
  if (navigation.errorText) {
    throw new Error(`Chrome navigation failed: ${navigation.errorText}.`);
  }
  await delay(durationSeconds * 1_000);
  const measured = await cdp.send("Runtime.evaluate", {
    expression:
      "({ innerWidth, innerHeight, "
      + "scrollWidth: document.documentElement.scrollWidth, "
      + "securityPolicyViolations: "
      + "globalThis.__dustWaveCspViolations ?? null, "
      + "activeTab: document.querySelector("
      + "'[role=\"tab\"][aria-selected=\"true\"]'"
      + ")?.dataset.tab ?? null })",
    returnByValue: true
  });
  const observed = measured.result?.value;
  if (!Array.isArray(observed?.securityPolicyViolations)) {
    throw new Error(
      "Chrome did not install the CSP violation probe before navigation."
    );
  }
  const enforcedViolations = observed.securityPolicyViolations.filter(
    (violation) => violation?.disposition !== "report"
  );
  if (enforcedViolations.length > 0) {
    throw new Error(
      "The page triggered enforced Content Security Policy violations: "
      + JSON.stringify(enforcedViolations)
    );
  }
  if (
    observed?.innerWidth !== viewport.width
    || observed?.innerHeight !== viewport.height
    || observed?.scrollWidth > viewport.width
  ) {
    throw new Error(
      "Chrome did not honor the exact requested viewport or the page "
      + "overflowed horizontally. "
      + `Expected ${viewport.width}x${viewport.height}; observed `
      + `${observed?.innerWidth ?? "unknown"}x`
      + `${observed?.innerHeight ?? "unknown"} with `
      + `${observed?.scrollWidth ?? "unknown"}px document width.`
    );
  }
  if (adminTab && observed?.activeTab !== adminTab) {
    throw new Error(
      `Chrome did not activate the requested admin tab "${adminTab}". `
      + `Observed: "${observed?.activeTab ?? "none"}".`
    );
  }
  const tracingComplete = cdp.waitForEvent(
    "Tracing.tracingComplete",
    30_000
  );
  await cdp.send("Tracing.end");
  const completed = await tracingComplete;
  if (!completed.stream) {
    throw new Error("Chrome completed tracing without a result stream.");
  }
  const chunks = [];
  while (true) {
    const result = await cdp.send(
      "IO.read",
      { handle: completed.stream, size: 1_048_576 },
      30_000
    );
    chunks.push(
      result.base64Encoded
        ? Buffer.from(result.data, "base64")
        : Buffer.from(result.data, "utf8")
    );
    if (result.eof) break;
  }
  await cdp.send("IO.close", { handle: completed.stream });
  await writeFile(outputPath, Buffer.concat(chunks), { mode: 0o600 });
  return observed;
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
  const adminTab = validateAdminTab(argumentsMap.get("admin-tab"));
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
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${Math.max(viewport.width, 500)},${viewport.height}`,
    "about:blank"
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

  let cdp;
  try {
    cdp = await connectToCdp(
      profileDirectory,
      child,
      () => launchError
    );
    const observed = await captureTrace({
      adminTab,
      cdp,
      durationSeconds,
      outputPath,
      url,
      viewport
    });
    cdp.close();
    await stopChrome(child);
    await verifyJsonTrace(outputPath, url);
    const traceDetails = await stat(outputPath);
    process.stdout.write(
      [
        "Podcast Admin Chrome trace captured.",
        `URL: ${url}`,
        `Viewport: ${viewport.width}x${viewport.height}`,
        `Verified CSS viewport: ${observed.innerWidth}x${observed.innerHeight}`,
        `Document width: ${observed.scrollWidth}px`,
        `Active admin tab: ${observed.activeTab || "not detected"}`,
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
    cdp?.close();
    await stopChrome(child);
    await rm(outputPath, { force: true });
    const details = stderr.trim() ? `\nChrome output:\n${stderr.trim()}` : "";
    throw new Error(`${error.message}${details}`);
  } finally {
    cdp?.close();
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
