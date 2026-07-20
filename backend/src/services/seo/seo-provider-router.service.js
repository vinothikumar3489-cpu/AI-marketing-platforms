import { isSerpAPIConfigured, isSerpAPIAvailable, googleSearch, googleAutocomplete, googleTrends, getSerpCompetitors, searchOpportunityScore, comprehensiveSearch } from '../serpapi.service.js';
import {
  isDataForSEOConfigured, isDataForSEOAvailable, getKeywordMetrics, getKeywordSuggestions,
  getSerpResults, getSerpCompetitors as dfsGetSerpCompetitors, getDomainData, getBacklinksSummary
} from '../dataforseo.service.js';

const SEO_PROVIDER_DATAFORSEO_ENABLED = process.env.SEO_PROVIDER_DATAFORSEO_ENABLED !== 'false';
const SEO_CACHE_TTL = 24 * 60 * 60 * 1000;

const memoryCache = new Map();

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
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
}

function cacheKey(prefix, ...args) {
  return `${prefix}:${args.filter(Boolean).join(':').toLowerCase().replace(/\s+/g, '_')}`;
}

export function getSEOProviderStatus() {
  return {
    serpapi: getSerpAPIStatus(),
    dataforseo: {
      configured: isDataForSEOConfigured(),
      available: isDataForSEOAvailable() && SEO_PROVIDER_DATAFORSEO_ENABLED,
      enabled: SEO_PROVIDER_DATAFORSEO_ENABLED
    },
    cacheAvailable: memoryCache.size > 0
  };
}

export async function withProviderFallback(operation, options = {}) {
  const { useCache = true, cachePrefix = 'seo', cacheArgs = [], forceRefresh = false } = options;
  const cacheKeyStr = cachePrefix ? cacheKey(cachePrefix, ...cacheArgs) : null;

  if (useCache && cacheKeyStr && !forceRefresh) {
    const cached = getCached(cacheKeyStr);
    if (cached) {
      return { ...cached, provider: 'cache', confidence: Math.min(cached.confidence || 80, 90), retrievedAt: new Date().toISOString(), status: 'cached' };
    }
  }

  if (isSerpAPIConfigured() && isSerpAPIAvailable()) {
    try {
      const result = await operation('serpapi');
      if (result && result.success !== false) {
        const enriched = { ...result, provider: 'SerpAPI', confidence: result.confidence || 100, retrievedAt: new Date().toISOString(), status: 'measured' };
        if (useCache && cacheKeyStr) setCache(cacheKeyStr, enriched);
        return enriched;
      }
    } catch (e) {
      console.warn(`[ProviderRouter] SerpAPI failed for ${cachePrefix}:`, e.message);
    }
  }

  if (isDataForSEOAvailable() && SEO_PROVIDER_DATAFORSEO_ENABLED) {
    try {
      const result = await operation('dataforseo');
      if (result && result.success !== false) {
        const enriched = { ...result, provider: 'DataForSEO', confidence: result.confidence || 100, retrievedAt: new Date().toISOString(), status: 'measured' };
        if (useCache && cacheKeyStr) setCache(cacheKeyStr, enriched);
        return enriched;
      }
    } catch (e) {
      console.warn(`[ProviderRouter] DataForSEO failed for ${cachePrefix}:`, e.message);
    }
  }

  if (useCache && cacheKeyStr) {
    const cached = getCached(cacheKeyStr);
    if (cached) {
      return { ...cached, provider: 'cache', confidence: Math.min(cached.confidence || 70, 80), retrievedAt: new Date().toISOString(), status: 'cached' };
    }
  }

  return {
    success: false,
    error: 'All providers unavailable',
    provider: null,
    confidence: 0,
    retrievedAt: new Date().toISOString(),
    status: 'unavailable'
  };
}

export async function resolveKeywordMetrics(keywords, location = 'United States') {
  if (!keywords || keywords.length === 0) {
    return { success: false, data: [], provider: null, confidence: 0, status: 'unavailable' };
  }

  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') {
      const results = await Promise.allSettled(
        keywords.slice(0, 10).map(kw => searchOpportunityScore(kw))
      );
      const metrics = results
        .filter(r => r.status === 'fulfilled' && r.value?.success !== false)
        .map(r => r.value);
      return { success: true, data: metrics };
    }

    if (provider === 'dataforseo') {
      return await getKeywordMetrics(keywords, location);
    }

    return { success: false, data: [] };
  }, {
    cachePrefix: 'kw_metrics',
    cacheArgs: [...keywords.slice(0, 5), location]
  });
}

export async function resolveSerpData(query, options = {}) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') {
      return await comprehensiveSearch(query, options);
    }
    if (provider === 'dataforseo') {
      return await getSerpResults(query, options.location || 'United States');
    }
    return { success: false, data: [] };
  }, {
    cachePrefix: 'serp',
    cacheArgs: [query, options.location, options.device]
  });
}

export async function resolveCompetitors(productName, industry, websiteUrl) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') {
      return await getSerpCompetitors(productName, industry, websiteUrl || '');
    }
    if (provider === 'dataforseo') {
      const result = await dfsGetSerpCompetitors(
        [`${productName} alternatives`, `${productName} competitors`, `best ${industry} software`].filter(Boolean),
        'United States'
      );
      return { success: true, data: result.data || [] };
    }
    return { success: false, data: [] };
  }, {
    cachePrefix: 'competitors',
    cacheArgs: [productName, industry]
  });
}

export async function resolveAutocomplete(query) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') {
      return await googleAutocomplete(query);
    }
    return { success: false, data: { suggestions: [] } };
  }, {
    cachePrefix: 'autocomplete',
    cacheArgs: [query]
  });
}

export async function resolveTrends(query) {
  return withProviderFallback(async (provider) => {
    if (provider === 'serpapi') {
      return await googleTrends(query);
    }
    return { success: false, data: { interest: [] } };
  }, {
    cachePrefix: 'trends',
    cacheArgs: [query]
  });
}

export async function resolveDomainData(domain) {
  return withProviderFallback(async (provider) => {
    if (provider === 'dataforseo') {
      return await getDomainData(domain);
    }
    return { success: false, data: null };
  }, {
    cachePrefix: 'domain',
    cacheArgs: [domain]
  });
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
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()).slice(0, 20),
    ttl: SEO_CACHE_TTL
  };
}
