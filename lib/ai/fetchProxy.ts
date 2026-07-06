/**
 * Helper to perform a fetch request with a realistic browser User‑Agent header.
 *
 * Vercel serverless functions run from datacenter IP ranges which are often
 * blocked by YouTube when the request looks like a generic Node.js fetch.
 * Adding a common browser User‑Agent (Chrome on Windows) makes the request
 * appear to originate from a regular browser and bypasses the most common
 * blocks.
 *
 * The function mirrors the native `fetch` signature so it can be used as a drop‑in
 * replacement for `globalThis.fetch` during caption fetching.
 */
export async function fetchWithBrowserHeaders(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const browserUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  // Preserve any existing headers while ensuring the User‑Agent is set.
  const existingHeaders = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
  if (!existingHeaders.has("User-Agent")) {
    existingHeaders.set("User-Agent", browserUserAgent);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers: existingHeaders,
  };

  return fetch(input, mergedInit);
}

// Export a default for convenience when monkey‑patching.
export default fetchWithBrowserHeaders;
