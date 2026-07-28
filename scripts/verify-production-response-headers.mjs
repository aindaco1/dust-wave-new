import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  buildCloudflareResponseHeaderRule,
  PRODUCTION_HOSTNAME
} from "./cloudflare-response-headers.mjs";

export const AUTHENTICATED_PRODUCTION_PATHS = Object.freeze([
  "/admin/podcasts/",
  "/es/admin/podcasts/",
  "/podcasts/account/",
  "/es/podcasts/account/"
]);
export const PUBLIC_PRODUCTION_PATH = "/podcasts/opera-en-la-selva/";

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY_MS = 2_000;

function fail(message) {
  throw new Error(message);
}

export function validateAuthenticatedResponse(response, desiredRule, url) {
  if (!response.ok) {
    fail(`${url} returned HTTP ${response.status}.`);
  }

  const expectedHeaders = desiredRule.action_parameters.headers;
  for (const [name, operation] of Object.entries(expectedHeaders)) {
    const actual = response.headers.get(name);
    if (operation.operation === "remove") {
      if (actual !== null) {
        fail(`${url} unexpectedly returned ${name}.`);
      }
      continue;
    }
    if (actual !== operation.value) {
      fail(
        `${url} returned an unexpected ${name} value: `
        + `${JSON.stringify(actual)}.`
      );
    }
  }
}

export function validatePublicResponse(response, url) {
  if (!response.ok) {
    fail(`${url} returned HTTP ${response.status}.`);
  }
  for (const name of [
    "Content-Security-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
    "X-Robots-Tag"
  ]) {
    if (response.headers.has(name)) {
      fail(`${url} unexpectedly returned authenticated-only ${name}.`);
    }
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function verifyProductionResponseHeaders({
  headersText,
  fetchImpl = globalThis.fetch,
  hostname = PRODUCTION_HOSTNAME,
  attempts = DEFAULT_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  logger = console
}) {
  if (typeof fetchImpl !== "function") {
    fail("A Fetch API implementation is required.");
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    fail("Verification attempts must be a positive integer.");
  }

  const desiredRule = buildCloudflareResponseHeaderRule(headersText);
  const baseUrl = `https://${hostname}`;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      for (const route of AUTHENTICATED_PRODUCTION_PATHS) {
        const url = `${baseUrl}${route}`;
        const response = await fetchImpl(url, {
          method: "HEAD",
          headers: { "Cache-Control": "no-cache" }
        });
        validateAuthenticatedResponse(response, desiredRule, url);
      }

      const publicUrl = `${baseUrl}${PUBLIC_PRODUCTION_PATH}`;
      const publicResponse = await fetchImpl(publicUrl, {
        method: "HEAD",
        headers: { "Cache-Control": "no-cache" }
      });
      validatePublicResponse(publicResponse, publicUrl);
      logger.log(
        "Production response-header verification passed for authenticated "
        + "and public Podcast routes."
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(retryDelayMs);
    }
  }

  throw lastError;
}

async function run() {
  const headersText = await readFile(
    new URL("../_headers", import.meta.url),
    "utf8"
  );
  await verifyProductionResponseHeaders({ headersText });
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
