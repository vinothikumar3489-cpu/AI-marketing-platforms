import fetch from 'node-fetch';

// ============================================
// DATAFORSEO SERVICE
// Real keyword data from DataForSEO API
// ============================================

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN?.trim();
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD?.trim();
const DATAFORSEO_BASE_URL = process.env.DATAFORSEO_BASE_URL || 'https://api.dataforseo.com/v3';

// Centralized endpoint definitions
const DATAFORSEO_ENDPOINTS = {
  keywordSearchVolume: '/keywords_data/google_ads/search_volume/live',
  keywordSuggestions: '/keywords_data/google_ads/keyword_suggestions/live',
  relatedKeywords: '/keywords_data/google_ads/keywords_for_keywords/live',
  serpLive: '/serp/google/organic/live/regular',
  backlinksSummary: '/backlinks/summary/live',
  referringDomains: '/backlinks/referring_domains/live',
  domainAnalytics: '/domain_analytics/domain_intersection/live'
};

// Authentication failure cache to prevent repeated calls
let dataforseoAuthFailed = false;
let dataforseoAuthFailureTime = 0;
const AUTH_FAILURE_COOLDOWN_MS = 300000; // 5 minutes

// Safe debug logging
console.log("[DataForSEO] login loaded", !!DATAFORSEO_LOGIN);
console.log("[DataForSEO] password loaded", !!DATAFORSEO_PASSWORD);

// Generic junk keywords to filter out (must be multi-word real topics)
const GENERIC_KEYWORDS = new Set([
  'business', 'custom', 'systems', 'built', 'everything', 'right', 'before',
  'https', 'apple', 'services', 'customer', 'product', 'all', 'software',
  'company', 'free', 'best', 'premium', 'plan', 'month', 'features',
  'get', 'make', 'use', 'work', 'time', 'new', 'good', 'great', 'top',
  'started', 'alerts', 'content', 'research', 'home', 'page', 'login',
  'signup', 'pricing', 'blog', 'about', 'contact', 'faq', 'help', 'support',
  'download', 'sign', 'learn', 'watch', 'read', 'view', 'click', 'search'
]);

export function sanitizeKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  const seen = new Set();
  return keywords
    .map(kw => {
      if (typeof kw !== 'string') return null;
      let cleaned = kw.normalize('NFKC').trim();
      // Replace ampersands with "and"
      cleaned = cleaned.replace(/&/g, ' and ');
      // Remove unsupported punctuation (keep hyphens, apostrophes, spaces)
      cleaned = cleaned.replace(/[^\w\s\-'&]/g, ' ');
      // Collapse multiple spaces
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    })
    .filter(kw => {
      if (!kw) return false;
      if (kw.length < 3) return false;
      // Reject single-word generic terms
      const words = kw.split(' ');
      if (words.length === 1 && GENERIC_KEYWORDS.has(words[0].toLowerCase())) return false;
      // Deduplicate case-insensitively
      const lower = kw.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
}

// Directory and research sites to classify separately
const DIRECTORY_SITES = new Set([
  'gartner.com', 'similarweb.com', 'clutch.co', 'capterra.com', 'g2.com',
  'trustpilot.com', 'softwareadvice.com', 'getapp.com', 'pcmag.com',
  'forbes.com', 'techradar.com', 'cnet.com', 'zdnet.com', 'wikipedia.org'
]);

/**
 * Create Basic Auth header for DataForSEO
 */
function getAuthHeader() {
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    console.warn('⚠️ DataForSEO credentials not configured');
    return null;
  }
  const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
  return `Basic ${auth}`;
}

/**
 * Make authenticated request to DataForSEO API
 */
async function dataforseoRequest(endpoint, method = 'POST', body = null) {
  // Check auth failure cache to prevent repeated calls
  if (dataforseoAuthFailed && Date.now() - dataforseoAuthFailureTime < AUTH_FAILURE_COOLDOWN_MS) {
    console.warn('[DataForSEO] Skipping request due to recent authentication failure (cooldown active)');
    return { 
      success: false, 
      error: 'DataForSEO authentication failed (cooldown active)', 
      unavailable: true,
      statusCode: 401 
    };
  }

  const authHeader = getAuthHeader();
  if (!authHeader) {
    return { success: false, error: 'DataForSEO credentials not configured', unavailable: true };
  }

  try {
    const url = `${DATAFORSEO_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Log response status only
    console.log(`📊 [DataForSEO] Response Status: ${response.status}`);

    if (response.status === 401) {
      const errorText = await response.text();
      console.warn('[DataForSEO] Authentication failed - marking as unavailable and setting cooldown');
      
      // Set auth failure cache
      dataforseoAuthFailed = true;
      dataforseoAuthFailureTime = Date.now();

      if (errorText.includes('40104') || errorText.includes('verify your account')) {
        return {
          success: false,
          error: 'DataForSEO account not verified',
          unavailable: true,
          available: false,
          reason: 'DataForSEO account not verified',
          source: 'DataForSEO',
          statusCode: 401
        };
      }

      return {
        success: false,
        error: 'DataForSEO unavailable: authentication failed',
        unavailable: true,
        available: false,
        reason: 'DataForSEO authentication failed',
        source: 'DataForSEO',
        statusCode: 401
      };
    }

    if (response.status === 404) {
      const errorText = await response.text();
      console.warn(`[DataForSEO] Endpoint not found: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Endpoint not found: ${response.status}`,
        statusCode: 404
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DataForSEO] API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}`, statusCode: response.status };
    }

    // Clear auth failure cache on success
    if (dataforseoAuthFailed) {
      dataforseoAuthFailed = false;
      dataforseoAuthFailureTime = 0;
      console.log('[DataForSEO] Authentication recovered - clearing cooldown');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`❌ [DataForSEO] Request failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Normalize keyword metrics from DataForSEO response
 */
function normalizeKeywordMetrics(response) {
  if (!response || !response.tasks || !response.tasks[0]) {
    return null;
  }

  const task = response.tasks[0];
  if (task.status_code !== 20000 || !task.result) {
    console.warn(`⚠️ [DataForSEO] Task failed: ${task.status_message}`);
    return null;
  }

  const result = Array.isArray(task.result) ? task.result[0] : task.result;

  return {
    keyword: result.keyword || '',
    searchVolume: result.search_volume || 0,
    keywordDifficulty: result.keyword_difficulty || 0,
    cpc: result.cpc || 0,
    competition: result.competition || 0,
    intent: result.keyword_info?.intent || 'Unknown',
    trend: result.keyword_info?.last_search_volume || [],
    source: 'DataForSEO',
    confidence: 100,
    evidence: 'Retrieved from DataForSEO Keyword Data API'
  };
}

/**
 * Get keyword metrics for specific keywords
 */
export async function getKeywordMetrics(keywords, location = 'United States', language = 'English') {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { success: false, error: 'No keywords provided' };
  }

  // Sanitize keywords (normalize, replace &, remove punctuation, deduplicate)
  const filteredKeywords = sanitizeKeywords(keywords);

  if (filteredKeywords.length === 0) {
    return { success: false, error: 'No valid keywords after sanitization' };
  }

  // DataForSEO v3 expects a single task with 'keywords' array
  const body = [{
    keywords: filteredKeywords,
    location_name: location,
    language_name: language
  }];

  const endpoint = DATAFORSEO_ENDPOINTS.keywordSearchVolume;
  
  console.log('🔍 [DataForSEO] Keywords sent to API:', {
    endpoint,
    count: filteredKeywords.length,
    keywords: filteredKeywords,
    location,
    language
  });

  const response = await dataforseoRequest(endpoint, 'POST', body);

  console.log('� [DataForSEO] Response status:', {
    success: response.success,
    statusCode: response.statusCode,
    error: response.error
  });

  if (!response.success) {
    console.log('⚠️ [DataForSEO] Metrics unavailable from DataForSEO:', response.error);
    return { success: false, error: response.error, message: 'Metrics unavailable from DataForSEO' };
  }

  // Log task status_code
  if (response.data && response.data.tasks) {
    console.log('🔍 [DataForSEO] Task status codes:', response.data.tasks.map(t => ({
      keyword: t.keyword,
      status_code: t.status_code,
      status_message: t.status_message
    })));
  }

  const normalized = response.data.tasks
    .filter(task => task.status_code === 20000)
    .flatMap(task => {
      if (!task.result) return [];
      // Flatten all task result records - handle nested arrays
      const taskResults = Array.isArray(task.result) ? task.result : [task.result];
      return taskResults.flatMap(result => {
        // Handle nested result arrays (some endpoints return arrays of arrays)
        const items = Array.isArray(result) ? result : [result];
        return items.map(item => ({
          keyword: item.keyword || '',
          volume: item.search_volume ?? null,
          keywordDifficulty: null,
          cpc: item.cpc ?? null,
          competition: item.competition ?? null,
          competitionIndex: item.competition_index ?? null,
          monthlySearches: item.monthly_searches ?? null,
          intent: item.keyword_info?.intent || null,
          source: 'DataForSEO',
          confidence: 100,
          evidence: 'Retrieved from DataForSEO Keyword Data API'
        }));
      });
    })
    .filter(item => item !== null && item.keyword && item.keyword.length > 0);

  // Log first 3 normalized results
  console.log('🔍 [DataForSEO] First 3 normalized results:', normalized.slice(0, 3));

  if (normalized.length === 0) {
    console.log('⚠️ [DataForSEO] No valid metrics returned from DataForSEO');
    return { 
      success: false, 
      error: 'No valid metrics returned', 
      message: 'Metrics unavailable from DataForSEO',
      data: []
    };
  }

  const successfulResults = normalized.filter(
    item => typeof item.keyword === 'string' && item.keyword.length > 0
  );
  console.log('🔍 [DataForSEO] Normalized keyword results:', {
    total: normalized.length,
    successful: successfulResults.length,
    first3: normalized.slice(0, 3).map(k => ({ keyword: k.keyword, volume: k.volume }))
  });

  return { success: true, data: normalized };
}

/**
 * Get keyword suggestions based on seed keywords
 */
export async function getKeywordSuggestions(seedKeywords, location = 'United States', language = 'English') {
  if (!Array.isArray(seedKeywords) || seedKeywords.length === 0) {
    return { success: false, error: 'No seed keywords provided' };
  }

  const body = [{
    keywords: seedKeywords,
    location_name: location,
    language_name: language,
    limit: 10
  }];

  const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.keywordSuggestions, 'POST', body);

  if (!response.success) {
    return response;
  }

  const suggestions = response.data.tasks
    .filter(task => task.status_code === 20000)
    .flatMap(task => {
      if (!task.result) return [];
      const results = Array.isArray(task.result) ? task.result : [task.result];
      return results.map(item => ({
        keyword: item.keyword,
        volume: item.search_volume || null,
        keywordDifficulty: item.keyword_difficulty || null,
        cpc: item.cpc || null,
        competition: item.competition || null,
        source: 'DataForSEO',
        confidence: 100,
        evidence: 'Retrieved from DataForSEO Keyword Suggestions API'
      }));
    })
    .filter(item => {
      // Filter generic keywords
      const lowerKw = item.keyword.toLowerCase().trim();
      if (lowerKw.split(' ').length === 1 && GENERIC_KEYWORDS.has(lowerKw)) {
        return false;
      }
      return true;
    });

  return { success: true, data: suggestions };
}

/**
 * Get related keywords for a seed keyword
 */
export async function getRelatedKeywords(seedKeyword, location = 'United States', language = 'English') {
  if (!seedKeyword || typeof seedKeyword !== 'string') {
    return { success: false, error: 'Invalid seed keyword' };
  }

  const body = [{
    keywords: [seedKeyword],
    location_name: location,
    language_name: language,
    limit: 20
  }];

  const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.relatedKeywords, 'POST', body);

  if (!response.success) {
    return response;
  }

  const related = response.data.tasks
    .filter(task => task.status_code === 20000)
    .flatMap(task => {
      if (!task.result) return [];
      const results = Array.isArray(task.result) ? task.result : [task.result];
      return results.map(item => ({
        keyword: item.keyword,
        volume: item.search_volume || null,
        keywordDifficulty: item.keyword_difficulty || null,
        cpc: item.cpc || null,
        competition: item.competition || null,
        source: 'DataForSEO',
        confidence: 100,
        evidence: 'Retrieved from DataForSEO Related Keywords API'
      }));
    })
    .filter(item => {
      // Filter generic keywords
      const lowerKw = item.keyword.toLowerCase().trim();
      if (lowerKw.split(' ').length === 1 && GENERIC_KEYWORDS.has(lowerKw)) {
        return false;
      }
      return true;
    });

  return { success: true, data: related };
}

/**
 * Get SERP results for a keyword
 */
export async function getSerpResults(keyword, location = 'United States', language = 'English') {
  if (!keyword || typeof keyword !== 'string') {
    return { success: false, error: 'Invalid keyword' };
  }

  const body = [{
    keyword,
    location_name: location,
    language_name: language,
    depth: 10,
    device: 'desktop'
  }];

  const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.serpLive, 'POST', body);

  if (!response.success) {
    return response;
  }

  const results = response.data.tasks
    .filter(task => task.status_code === 20000)
    .flatMap(task => {
      if (!task.result) return [];
      const items = task.result[0]?.items || [];
      return items
        .filter(item => item.type === 'organic')
        .map(item => ({
          domain: item.domain || '',
          url: item.url || '',
          title: item.title || '',
          snippet: item.description || '',
          rank: item.rank_absolute || 0
        }));
    });

  return { success: true, data: results };
}

/**
 * Get SERP competitors from multiple keywords
 */
export async function getSerpCompetitors(keywords, location = 'United States', language = 'English') {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { success: false, error: 'No keywords provided' };
  }

  // Filter out generic keywords
  const filteredKeywords = keywords.filter(kw => {
    const lowerKw = kw.toLowerCase().trim();
    if (lowerKw.split(' ').length === 1 && GENERIC_KEYWORDS.has(lowerKw)) {
      return false;
    }
    return true;
  });

  if (filteredKeywords.length === 0) {
    return { success: false, error: 'No valid keywords after filtering' };
  }

  // Limit to top 5 keywords to avoid excessive API calls
  const keywordsToUse = filteredKeywords.slice(0, 5);

  const allResults = [];
  for (const keyword of keywordsToUse) {
    const result = await getSerpResults(keyword, location, language);
    if (result.success && result.data) {
      allResults.push(...result.data);
    }
  }

  return { success: true, data: allResults };
}

/**
 * Normalize SERP competitors and classify types
 */
export function normalizeSerpCompetitors(serpResults, identity = {}) {
  if (!Array.isArray(serpResults) || serpResults.length === 0) {
    return [];
  }

  const domainMap = new Map();

  serpResults.forEach(result => {
    const domain = result.domain.toLowerCase();
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        name: extractCompanyName(result.title, domain),
        domain,
        url: result.url,
        title: result.title,
        snippet: result.snippet,
        rank: result.rank,
        appearances: 1
      });
    } else {
      const existing = domainMap.get(domain);
      existing.appearances++;
      if (result.rank < existing.rank) {
        existing.rank = result.rank;
      }
    }
  });

  const competitors = Array.from(domainMap.values()).map(comp => {
    const classified = classifyCompetitorType(comp, identity);
    return {
      name: comp.name,
      domain: comp.domain,
      url: comp.url,
      title: comp.title,
      snippet: comp.snippet,
      competitorType: classified.type,
      relevanceScore: classified.relevanceScore,
      overlapReason: classified.overlapReason,
      source: 'DataForSEO_SERP',
      confidence: calculateConfidence(comp.appearances, comp.rank),
      evidence: `Found in ${comp.appearances} SERP results, best rank: ${comp.rank}`
    };
  });

  return competitors;
}

/**
 * Classify competitor type
 */
function classifyCompetitorType(competitor, identity = {}) {
  const domain = competitor.domain.toLowerCase();
  const title = competitor.title.toLowerCase();
  const snippet = competitor.snippet.toLowerCase();

  // Check if it's a directory/research site
  for (const dirSite of DIRECTORY_SITES) {
    if (domain.includes(dirSite)) {
      return {
        type: 'directoryOrResearchSite',
        relevanceScore: 20,
        overlapReason: 'Directory or research platform'
      };
    }
  }

  // Check for blog/content sites
  if (title.includes('blog') || title.includes('news') || title.includes('guide') || 
      snippet.includes('blog') || snippet.includes('article')) {
    return {
      type: 'serpCompetitor',
      relevanceScore: 30,
      overlapReason: 'Content/blog site'
    };
  }

  // Check for business relevance based on identity
  const industry = (identity.industry || '').toLowerCase();
  const productName = (identity.productName || '').toLowerCase();

  // High relevance: industry-specific terms in title/snippet
  if (industry && (title.includes(industry) || snippet.includes(industry))) {
    return {
      type: 'directBusinessCompetitor',
      relevanceScore: 90,
      overlapReason: `Industry match: ${industry}`
    };
  }

  // Medium relevance: similar business terms
  const businessTerms = ['software', 'development', 'consulting', 'services', 'solutions', 'company', 'agency'];
  const hasBusinessTerms = businessTerms.some(term => title.includes(term) || snippet.includes(term));

  if (hasBusinessTerms) {
    return {
      type: 'directBusinessCompetitor',
      relevanceScore: 70,
      overlapReason: 'Business service provider'
    };
  }

  // Low relevance: general SERP result
  return {
    type: 'serpCompetitor',
    relevanceScore: 40,
    overlapReason: 'SERP result'
  };
}

/**
 * Extract company name from title
 */
function extractCompanyName(title, domain) {
  if (!title) return domain;
  
  // Remove common suffixes
  const cleaned = title
    .replace(/\s*-\s*.+$/, '') // Remove everything after dash
    .replace(/\s*\|\s*.+$/, '') // Remove everything after pipe
    .replace(/\s*:\s*.+$/, '') // Remove everything after colon
    .replace(/\s*\(.+\)$/, '') // Remove parenthetical content
    .trim();

  return cleaned || domain;
}

/**
 * Calculate confidence based on appearances and rank
 */
function calculateConfidence(appearances, rank) {
  // More appearances and better rank = higher confidence
  const appearanceScore = Math.min(appearances * 10, 50);
  const rankScore = Math.max(0, 50 - rank * 2);
  return Math.min(100, appearanceScore + rankScore);
}

/**
 * Separate competitors by type
 */
export function separateCompetitorsByType(competitors) {
  if (!Array.isArray(competitors)) {
    return {
      directBusinessCompetitors: [],
      serpCompetitors: [],
      directoryOrResearchSites: [],
      irrelevantFilteredSites: []
    };
  }

  return {
    directBusinessCompetitors: competitors.filter(c => c.competitorType === 'directBusinessCompetitor' && c.relevanceScore >= 70),
    serpCompetitors: competitors.filter(c => c.competitorType === 'serpCompetitor' || c.competitorType === 'directBusinessCompetitor'),
    directoryOrResearchSites: competitors.filter(c => c.competitorType === 'directoryOrResearchSite'),
    irrelevantFilteredSites: competitors.filter(c => c.relevanceScore < 40)
  };
}

/**
 * Check if DataForSEO is configured
 */
export function isDataForSEOConfigured() {
  return !!(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD);
}

// ============================================
// BACKLINKS & DOMAIN ANALYTICS
// ============================================

/**
 * Get backlinks summary for a domain
 */
export async function getBacklinksSummary(domain) {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const body = [{
    target: domain,
    limit: 100
  }];

  const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.backlinksSummary, 'POST', body);

  if (!response.success) {
    return response;
  }

  const normalized = normalizeBacklinkSummary(response.data);
  return { success: true, data: normalized };
}

/**
 * Get referring domains for a domain
 */
export async function getReferringDomains(domain) {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const body = [{
    target: domain,
    limit: 50,
    order_by: ['domain_rank_alexa,desc']
  }];

  const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.referringDomains, 'POST', body);

  if (!response.success) {
    return response;
  }

  const results = response.data.tasks
    .filter(task => task.status_code === 20000)
    .flatMap(task => {
      if (!task.result) return [];
      const items = Array.isArray(task.result) ? task.result : [task.result];
      return items.map(item => ({
        domain: item.domain || item.referring_domain,
        domainRank: item.domain_rank || item.rank,
        backlinks: item.backlinks || 0,
        firstSeen: item.first_seen,
        source: 'DataForSEO_Backlinks'
      }));
    });

  return { success: true, data: results };
}

/**
 * Get domain analytics
 */
export async function getDomainAnalytics(domain) {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const body = [{
    target: domain
  }];

  const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.domainAnalytics, 'POST', body);

  if (!response.success) {
    return response;
  }

  const normalized = normalizeDomainAuthority(response.data);
  return { success: true, data: normalized };
}

/**
 * Normalize backlink summary response
 */
function normalizeBacklinkSummary(response) {
  if (!response || !response.tasks || !response.tasks[0]) {
    return null;
  }

  const task = response.tasks[0];
  if (task.status_code !== 20000 || !task.result) {
    console.warn(`⚠️ [DataForSEO] Backlink task failed: ${task.status_message}`);
    return null;
  }

  const result = Array.isArray(task.result) ? task.result[0] : task.result;

  return {
    domain: result.target || '',
    totalBacklinks: result.total_backlinks || null,
    referringDomains: result.referring_domains || null,
    referringPages: result.referring_pages || null,
    dofollowBacklinks: result.dofollow_backlinks || null,
    nofollowBacklinks: result.nofollow_backlinks || null,
    dofollowRatio: result.dofollow_backlinks && result.total_backlinks 
      ? (result.dofollow_backlinks / result.total_backlinks * 100).toFixed(2) 
      : null,
    domainRank: result.domain_rank || null,
    spamScore: result.spam_score || null,
    source: 'DataForSEO_Backlinks',
    confidence: 100,
    evidence: 'Retrieved from DataForSEO Backlinks API'
  };
}

/**
 * Normalize domain authority response
 */
function normalizeDomainAuthority(response) {
  if (!response || !response.tasks || !response.tasks[0]) {
    return null;
  }

  const task = response.tasks[0];
  if (task.status_code !== 20000 || !task.result) {
    console.warn(`⚠️ [DataForSEO] Domain analytics task failed: ${task.status_message}`);
    return null;
  }

  const result = Array.isArray(task.result) ? task.result[0] : task.result;

  return {
    domain: result.target || '',
    domainRank: result.domain_rank || null,
    organicTraffic: result.organic_traffic || null,
    paidTraffic: result.paid_traffic || null,
    backlinks: result.backlinks || null,
    referringDomains: result.referring_domains || null,
    source: 'DataForSEO_DomainAnalytics',
    confidence: 100,
    evidence: 'Retrieved from DataForSEO Domain Analytics API'
  };
}

/**
 * Get comprehensive domain data (backlinks + analytics)
 */
export async function getDomainData(domain) {
  if (!domain) {
    return { success: false, error: 'Domain is required' };
  }

  try {
    const [backlinksResult, analyticsResult] = await Promise.all([
      getBacklinksSummary(domain),
      getDomainAnalytics(domain)
    ]);

    return {
      success: backlinksResult.success || analyticsResult.success,
      data: {
        backlinks: backlinksResult.success ? backlinksResult.data : null,
        analytics: analyticsResult.success ? analyticsResult.data : null
      }
    };
  } catch (error) {
    console.error(`[DataForSEO] Domain data fetch failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// DATAFORSEO HEALTH CHECK
// ============================================

export async function checkDataForSeoHealth() {
  const configured = isDataForSEOConfigured();
  if (!configured) {
    return {
      configured: false,
      authenticated: false,
      baseUrlValid: false,
      endpointValid: false,
      failureType: 'NOT_CONFIGURED',
      statusCode: null,
      message: 'DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.'
    };
  }

  // Test the keyword search volume endpoint
  try {
    const testBody = [{
      keywords: ['test keyword health check'],
      location_name: 'United States',
      language_name: 'English'
    }];
    const response = await dataforseoRequest(DATAFORSEO_ENDPOINTS.keywordSearchVolume, 'POST', testBody);

    if (!response.success) {
      if (response.statusCode === 401 || (response.error && response.error.includes('401'))) {
        const statusCode = response.statusCode || 401;
        return {
          configured: true,
          authenticated: false,
          baseUrlValid: true,
          endpointValid: false,
          failureType: 'AUTH_FAILED',
          statusCode,
          message: response.reason || 'DataForSEO authentication failed. Check DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.'
        };
      }

      if (response.statusCode === 402) {
        return {
          configured: true,
          authenticated: true,
          baseUrlValid: true,
          endpointValid: true,
          failureType: 'INSUFFICIENT_FUNDS',
          statusCode: 402,
          message: 'DataForSEO API responded (credentials valid) but account has insufficient balance for this endpoint.'
        };
      }

      if (response.statusCode === 404) {
        return {
          configured: true,
          authenticated: true,
          baseUrlValid: true,
          endpointValid: false,
          failureType: 'ENDPOINT_NOT_FOUND',
          statusCode: 404,
          message: `DataForSEO endpoint returned 404. Check endpoint path: ${DATAFORSEO_ENDPOINTS.keywordSearchVolume}`
        };
      }

      return {
        configured: true,
        authenticated: true,
        baseUrlValid: true,
        endpointValid: false,
        failureType: 'UNEXPECTED_STATUS',
        statusCode: response.statusCode || 0,
        message: `DataForSEO returned unexpected status ${response.statusCode}. ${response.error || ''}`
      };
    }

    return {
      configured: true,
      authenticated: true,
      baseUrlValid: true,
      endpointValid: true,
      failureType: 'AVAILABLE',
      statusCode: 200,
      message: 'DataForSEO API is available and authenticated.'
    };
  } catch (error) {
    return {
      configured: true,
      authenticated: false,
      baseUrlValid: false,
      endpointValid: false,
      failureType: 'NETWORK_FAILED',
      statusCode: null,
      message: `DataForSEO network error: ${error.message}`
    };
  }
}

/**
 * Clear DataForSEO auth failure cache (for testing/recovery)
 */
export function clearDataForSeoAuthFailureCache() {
  dataforseoAuthFailed = false;
  dataforseoAuthFailureTime = 0;
  console.log('[DataForSEO] Auth failure cache cleared');
}

// Log DataForSEO configuration status at startup
console.log('[DataForSEO Config]', JSON.stringify({
  provider: 'DataForSEO',
  loginConfigured: !!DATAFORSEO_LOGIN,
  passwordConfigured: !!DATAFORSEO_PASSWORD,
  baseUrl: DATAFORSEO_BASE_URL
}));

