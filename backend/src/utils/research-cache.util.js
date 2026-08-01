/**
 * Shared research-engine cache with in-flight deduplication.
 *
 * Solves three pipeline defects at once:
 *  1. Duplicate crawling  — the orchestrator, evidence module and product-analysis
 *     flow all scrape / call the same provider for the same URL. The first call
 *     seeds the cache; later calls within the TTL window reuse the result.
 *  2. Duplicate API spend — Tavily/DataForSEO/PageSpeed calls are memoized per key,
 *     so ~30 Tavily + ~13 DataForSEO calls per growth run collapse into the first
 *     unique request for each key.
 *  3. Thundering herd     — concurrent callers of the same key share a single
 *     in-flight Promise instead of firing N duplicate requests.
 *
 * Only successful (non-null / non-undefined) values are cached, so a transient
 * failure never poisons the cache: the next call re-attempts the real request.
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

const cache = new Map();
const inFlight = new Map();

function evictIfNeeded() {
  while (cache.size >= MAX_ENTRIES && cache.size > 0) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export function getCached(key) {
  if (typeof key !== "string" || !key) return undefined;
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  // LRU refresh
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function setCached(key, value, ttlMs = DEFAULT_TTL_MS) {
  if (typeof key !== "string" || !key) return;
  if (value === null || value === undefined) return;
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  evictIfNeeded();
}

/**
 * Returns a memoized value for `key`. While the loader is running, all callers
 * of the same key share one Promise (dedupe). Successfully loaded values are
 * cached for `ttlMs`. Loader failures are NOT cached and are re-thrown.
 */
export async function memoize(key, ttlMs, loader) {
  if (typeof ttlMs === "function") {
    loader = ttlMs;
    ttlMs = DEFAULT_TTL_MS;
  }
  if (typeof loader !== "function") {
    throw new TypeError("memoize requires a loader function");
  }

  const hit = getCached(key);
  if (hit !== undefined) return hit;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      inFlight.delete(key);
      setCached(key, value, ttlMs);
      return value;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}

/** Same as memoize, but resolves to null instead of throwing (fail-open). */
export async function memoizeSettled(key, ttlMs, loader) {
  return memoize(key, ttlMs, loader).catch(() => null);
}

export function clearResearchCache() {
  cache.clear();
  inFlight.clear();
}

export function getResearchCacheStats() {
  return { entries: cache.size, inFlight: inFlight.size };
}

/** Normalize a website URL so equivalent forms share one cache key. */
export function cacheKeyUrl(url) {
  if (!url || typeof url !== "string") return url || "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    u.hash = "";
    u.search = "";
    return u.href.replace(/\/+$/, "");
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}
