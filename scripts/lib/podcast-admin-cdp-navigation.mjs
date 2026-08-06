const NAVIGATION_TIMEOUT_PATTERN = /DevTools command timed out: Page\.navigate\./;

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function assertNavigationResult(result) {
  if (result?.errorText) {
    throw new Error(`Chrome navigation failed: ${result.errorText}.`);
  }
  return result;
}

export async function navigatePodcastAdminTrace(
  cdp,
  url,
  {
    attemptTimeoutMs = 5_000,
    retryDelayMs = 250
  } = {}
) {
  try {
    return assertNavigationResult(
      await cdp.send("Page.navigate", { url }, attemptTimeoutMs)
    );
  } catch (error) {
    if (!NAVIGATION_TIMEOUT_PATTERN.test(String(error?.message || error))) {
      throw error;
    }
  }

  await delay(retryDelayMs);
  return assertNavigationResult(
    await cdp.send("Page.navigate", { url }, attemptTimeoutMs)
  );
}
