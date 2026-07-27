import { isSerpAPIConfigured, isSerpAPIAvailable, getSerpAPIStatus, getCachedSerpAPIStatus, googleSearch, googleAutocomplete, googleTrends, getSerpCompetitors, searchOpportunityScore, comprehensiveSearch } from "../serpapi.service.js";
import {
  isDataForSEOConfigured, isDataForSEOAvailable, getDataForSEOStatus, verifyDataForSEO,
  getKeywordMetrics, getKeywordSuggestions,
  getSerpResults, getSerpCompetitors as dfsGetSerpCompetitors, getDomainData, getBacklinksSummary,
  getDataForSEOConnectionStatus
} from "../../providers/dataforseo.service.js";

const SEO_PROVIDER_DATAFORSEO_ENABLED = process.env.SEO_PROVIDER_DATAFORSEO_ENABLED !== 'false';
const SEO_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const memoryCache = new Map();
let _dataforseoStartupVerified = false;
let _dataforseoStartupStatus = 'PENDING';

function getCached(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SEO_CACHE_TTL) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttl = SEO_CACHE_TTL) {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
}

function cacheKey(prefix, ...args) {
  return `${prefix}:${args.filter(Boolean).join(':').toLowerCase().replace(/\s+/g, '_')}`;
}

export function getDataForSEOStartupStatus() {
  return { verified: _dataforseoStartupVerified, status: _dataforseoStartupStatus };
}

export async function verifyDataForSEOAtStartup() {
  _dataforseoStartupStatus = 'VERIFYING';
  if (!isDataForSEOConfigured()) {
    _dataforseoStartupVerified = false;
    _dataforseoStartupStatus = 'NOT_CONFIGURED';
    console.log('[SEO DATAFORSEO STARTUP] Credentials not configured');
    return { connected: false, status: 'NOT_CONFIGURED' };
  }
  try {
    const result = await verifyDataForSEO();
    if (result.success) {
      _dataforseoStartupVerified = true;
      _dataforseoStartupStatus = 'CONNECTED';
      console.log('[SEO DATAFORSEO STARTUP] Verification successful - CONNECTED');
      return { connected: true, status: 'CONNECTED' };
    }
    if (result.reason === 'INVALID_CREDENTIALS') {
      _dataforseoStartupVerified = false;
      _dataforseoStartupStatus = 'INVALID_CREDENTIALS';
      console.warn('[SEO DATAFORSEO STARTUP] Invalid credentials');
      return { connected: false, status: 'INVALID_CREDENTIALS', error: result.error };
    }
    if (result.reason === 'RATE_LIMITED') {
      _dataforseoStartupVerified = false;
      _dataforseoStartupStatus = 'RATE_LIMITED';
      console.warn('[SEO DATAFORSEO STARTUP] Rate limited');
      return { connected: false, status: 'RATE_LIMITED', error: result.error };
    }
    _dataforseoStartupVerified = false;
    _dataforseoStartupStatus = 'FAILED';
    console.warn('[SEO DATAFORSEO STARTUP] Verification failed:', result.error);
    return { connected: false, status: 'FAILED', error: result.error };
  } catch (e) {
    _dataforseoStartupVerified = false;
    _dataforseoStartupStatus = 'FAILED';
    console.warn('[SEO DATAFORSEO STARTUP] Verification error:', e.message);
    return { connected: false, status: 'FAILED', error: e.message };
  }
}

export function selectSeoSearchProvider(serpApiStatus, dataForSeoStatus, cachedSnapshot) {
  if (serpApiStatus?.status === 'AVAILABLE' && serpApiStatus?.available) {
    console.log('[SEO PROVIDER SELECTED]', { selected: 'SERPAPI', reason: 'primary provider available and authenticated' });
    return {
      selectedProvider: 'SERPAPI',
      reason: 'Primary search provider available',
      confidence: serpApiStatus.searchesRemaining > 100 ? 100 : 85,
      capabilities: {
        serpResults: true, autocomplete: true, trends: true,
        keywordVolume: true, technicalAudit: true, onPageAudit: true, crawlEvidence: true
      }
    };
  }

  const dataForSeoEffective = getDataForSEOConnectionStatus();
  const dfsAvailable = dataForSeoEffective.connected &&
    (dataForSeoEffective.status === 'CONNECTED' || dataForSeoEffective.status === 'AVAILABLE');

  if (SEO_PROVIDER_DATAFORSEO_ENABLED && dfsAvailable) {
    console.log('[SEO PROVIDER SELECTED]', { selected: 'DATAFORSEO', reason: 'SerpAPI unavailable, DataForSEO verified and available' });
    return {
      selectedProvider: 'DATAFORSEO',
      reason: 'SerpAPI unavailable; DataForSEO fallback operational',
      confidence: 80,
      capabilities: {
        serpResults: true, autocomplete: false, trends: false,
        keywordVolume: true, technicalAudit: true, onPageAudit: true, crawlEvidence: true
      }
    };
  }

  if (cachedSnapshot) {
    console.log('[SEO PROVIDER SELECTED]', { selected: 'CACHE', reason: 'live providers unavailable, cached snapshot found' });
    return {
      selectedProvider: 'CACHE',
      reason: 'No live search provider available; using cached snapshot',
      confidence: 60,
      capabilities: { serpResults: false, autocomplete: false, trends: false, keywordVolume: false, technicalAudit: true, onPageAudit: true, crawlEvidence: true }
    };
  }

  console.log('[SEO PROVIDER SELECTED]', { selected: 'AI_FALLBACK', reason: 'all search providers unavailable, using AI fallback' });
  return {
    selectedProvider: 'AI_FALLBACK',
    reason: 'No search data provider available; will use AI-generated estimates',
    confidence: 30,
    capabilities: { serpResults: false, autocomplete: false, trends: false, keywordVolume: false, technicalAudit: true, onPageAudit: true, crawlEvidence: true }
  };
}

export async function getSEOProviderStatus() {
  let serpapi;
  try {
    serpapi = await getSerpAPIStatus();
  } catch (e) {
    console.warn('[SEO PROVIDER FALLBACK] SerpAPI status check failed:', e.message);
    serpapi = getCachedSerpAPIStatus();
  }

  const dataforseoStatus = getDataForSEOConnectionStatus();
  const dataforseo = {
    provider: 'DataForSEO',
    enabled: SEO_PROVIDER_DATAFORSEO_ENABLED,
    configured: isDataForSEOConfigured(),
    connected: dataforseoStatus.connected,
    status: dataforseoStatus.status,
    available: dataforseoStatus.connected && dataforseoStatus.status === 'CONNECTED',
    startupVerified: _dataforseoStartupVerified,
    reason: dataforseoStatus.status
  };

  const status = { serpapi, dataforseo, cacheAvailable: memoryCache.size > 0 };
  const selection = selectSeoSearchProvider(serpapi, dataforseo, memoryCache.size > 0 ? 'available' : null);

  console.log('[SEO PROVIDER STATUS]', {
    serpapiConfigured: serpapi?.configured,
    serpapiStatus: serpapi?.status,
    dataforseoConfigured: dataforseo.configured,
    dataforseoConnected: dataforseo.connected,
    dataforseoStatus: dataforseo.status,
    selectedProvider: selection.selectedProvider
  });

  return { ...status, selection };
}

export function getCachedSEOProviderStatus() {
  const serpapi = getCachedSerpAPIStatus();
  const dataforseoStatus = getDataForSEOConnectionStatus();
  const dataforseo = {
    ...dataforseoStatus,
    enabled: SEO_PROVIDER_DATAFORSEO_ENABLED,
    configured: isDataForSEOConfigured(),
    available: dataforseoStatus.connected && dataforseoStatus.status === 'CONNECTED'
  };
  return {
    serpapi,
    dataforseo,
    cacheAvailable: memoryCache.size > 0,
    selection: selectSeoSearchProvider(serpapi, dataforseo, memoryCache.size > 0 ? 'available' : null)
  };
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

let _dataforseoReconnecting = false;

async function ensureDataForSEOReady() {
  if (isDataForSEOConfigured()) {
    const connStatus = getDataForSEOConnectionStatus();
    if (connStatus.connected) return true;
    if (_dataforseoReconnecting) return false;
    _dataforseoReconnecting = true;
    try {
      console.log('[SEO PROVIDER] Attempting DataForSEO reconnection...');
      const result = await verifyDataForSEO();
      if (result.success) {
        console.log('[SEO PROVIDER] DataForSEO reconnection successful');
        return true;
      }
      console.warn('[SEO PROVIDER] DataForSEO reconnection failed:', result.error);
      return false;
    } catch (e) {
      console.warn('[SEO PROVIDER] DataForSEO reconnection error:', e.message);
      return false;
    } finally {
      _dataforseoReconnecting = false;
    }
  }
  return false;
}

export async function withProviderFallback(operation, options = {}) {
  const { useCache = true, cachePrefix = 'seo', cacheArgs = [], forceRefresh = false, timeout = 30000 } = options;
  const cacheKeyStr = cachePrefix ? cacheKey(cachePrefix, ...cacheArgs) : null;

  if (useCache && cacheKeyStr && !forceRefresh) {
    const cached = getCached(cacheKeyStr);
    if (cached) {
      return { ...cached, provider: 'cache', confidence: Math.min(cached.confidence || 80, 90), retrievedAt: new Date().toISOString(), status: 'cached' };
    }
  }

  let serpapiAttempted = false;
  let dfsAttempted = false;

  if (isSerpAPIConfigured()) {
    serpapiAttempted = true;
    if (isSerpAPIAvailable()) {
      try {
        const result = await withTimeout(operation('serpapi'), timeout, `SerpAPI ${cachePrefix}`);
        if (result && result.success !== false) {
          const enriched = { ...result, provider: 'SerpAPI', confidence: result.confidence || 100, retrievedAt: new Date().toISOString(), status: 'measured' };
          if (useCache && cacheKeyStr) setCache(cacheKeyStr, enriched);
          return enriched;
        }
        console.log('[SEO PROVIDER FALLBACK]', { from: 'SerpAPI', reason: 'operation returned unsuccessful', operation: cachePrefix });
      } catch (e) {
        console.warn('[SEO PROVIDER FALLBACK]', { from: 'SerpAPI', reason: e.message, operation: cachePrefix });
      }
    } else {
      console.log('[SEO PROVIDER] SerpAPI configured but not available, skipping');
    }
  }

  if (SEO_PROVIDER_DATAFORSEO_ENABLED && isDataForSEOConfigured()) {
    const dfsReady = await ensureDataForSEOReady();
    if (dfsReady) {
      dfsAttempted = true;
      try {
        const result = await withTimeout(operation('dataforseo'), timeout, `DataForSEO ${cachePrefix}`);
        if (result && result.success !== false) {
          const enriched = { ...result, provider: 'DataForSEO', confidence: result.confidence || 100, retrievedAt: new Date().toISOString(), status: 'measured' };
          if (useCache && cacheKeyStr) setCache(cacheKeyStr, enriched);
          return enriched;
        }
        console.log('[SEO PROVIDER FALLBACK]', { from: 'DataForSEO', reason: 'operation returned unsuccessful', operation: cachePrefix });
      } catch (e) {
        console.warn('[SEO PROVIDER FALLBACK]', { from: 'DataForSEO', reason: e.message, operation: cachePrefix });
      }
    }
  }

  if (useCache && cacheKeyStr) {
    const cached = getCached(cacheKeyStr);
    if (cached) {
      return { ...cached, provider: 'cache', confidence: Math.min(cached.confidence || 70, 80), retrievedAt: new Date().toISOString(), status: 'cached' };
    }
  }

  return {
    success: false, error: 'All providers unavailable',
    provider: null, confidence: 0,
    serpapiAttempted, dfsAttempted,
    retrievedAt: new Date().toISOString(), status: 'unavailable'
  };
}

export async function resolveKeywordMetrics(keywords, location = 'United States') {
  if (!keywords || keywords.length === 0) {
    return { success: false, data: [], provider: null, confidence: 0, status: 'unavailable', reason: 'No keywords provided' };
  }
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') {
      const results = await Promise.allSettled(keywords.slice(0, 10).map(kw => searchOpportunityScore(kw)));
      const metrics = results.filter(r => r.status === 'fulfilled' && r.value?.success !== false).map(r => r.value);
      return { success: true, data: metrics };
    }
    if (provider === 'dataforseo') {
      return await getKeywordMetrics(keywords, location);
    }
    return { success: false, data: [] };
  }, { cachePrefix: 'kw_metrics', cacheArgs: [...keywords.slice(0, 5), location] });
}

export async function resolveSerpData(query, options = {}) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') return await comprehensiveSearch(query, options);
    if (provider === 'dataforseo') return await getSerpResults(query, options.location || 'United States');
    return { success: false, data: [] };
  }, { cachePrefix: 'serp', cacheArgs: [query, options.location, options.device] });
}

export async function resolveCompetitors(productName, industry, websiteUrl) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') return await getSerpCompetitors(productName, industry, websiteUrl || '');
    if (provider === 'dataforseo') {
      const queries = [
        `${productName} alternatives`, `${productName} competitors`,
        `best ${industry} software`, `top ${industry} tools`
      ].filter(Boolean);
      const result = await dfsGetSerpCompetitors(queries, 'United States');
      return { success: true, data: result.data || [] };
    }
    return { success: false, data: [] };
  }, { cachePrefix: 'competitors', cacheArgs: [productName, industry] });
}

export async function resolveAutocomplete(query) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') return await googleAutocomplete(query);
    return { success: false, data: { suggestions: [] } };
  }, { cachePrefix: 'autocomplete', cacheArgs: [query] });
}

export async function resolveTrends(query) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') return await googleTrends(query);
    return { success: false, data: { interest: [] } };
  }, { cachePrefix: 'trends', cacheArgs: [query] });
}

export async function resolveDomainData(domain) {
  return withProviderFallback(async (provider) => {
    if (provider === 'dataforseo') return await getDomainData(domain);
    return { success: false, data: null };
  }, { cachePrefix: 'domain', cacheArgs: [domain] });
}

export function clearSEOCache(chatId) {
  if (chatId) {
    for (const [key] of memoryCache) {
      if (key.includes(chatId)) memoryCache.delete(key);
    }
  } else {
    memoryCache.clear();
  }
}

export function getCacheStats() {
  return { size: memoryCache.size, keys: Array.from(memoryCache.keys()).slice(0, 20), ttl: SEO_CACHE_TTL, maxEntries: MAX_CACHE_ENTRIES };
}
