import fetch from 'node-fetch';

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN?.trim();
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD?.trim();
const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3';


let _dataforseoVerified = false;
let _dataforseoAuthFailed = false;
let _dataforseoPaymentRequired = false;
let _dataforseoBlockedUntil = 0;

const GENERIC_KEYWORDS = new Set([
  'business', 'custom', 'systems', 'built', 'everything', 'right', 'before',
  'https', 'apple', 'services', 'customer', 'product', 'all', 'software',
  'company', 'free', 'best', 'premium', 'plan', 'month', 'features',
  'get', 'make', 'use', 'work', 'time', 'new', 'good', 'great', 'top',
  'started', 'alerts', 'content', 'research', 'home', 'page', 'login',
  'signup', 'pricing', 'blog', 'about', 'contact', 'faq', 'help', 'support',
  'download', 'sign', 'learn', 'watch', 'read', 'view', 'click', 'search'
]);

const VALID_ENDPOINTS = new Set([
  '/keywords_data/google_ads/search_volume/live',
  '/keywords_data/google_ads/keywords_for_keywords/live',
  '/serp/google/organic/live/regular',
  '/backlinks/summary/live',
  '/backlinks/referring_domains/live',
  '/domain_analytics/domain_intersection/live',
]);

const LOCATION_MAP = {
  'global': { location_code: 2840, language_code: 'en', location_name: 'United States' },
  'worldwide': { location_code: 2840, language_code: 'en', location_name: 'United States' },
  'united states': { location_code: 2840, language_code: 'en', location_name: 'United States' },
  'us': { location_code: 2840, language_code: 'en', location_name: 'United States' },
  'india': { location_code: 2034, language_code: 'en', location_name: 'India' },
  'united kingdom': { location_code: 2826, language_code: 'en', location_name: 'United Kingdom' },
  'uk': { location_code: 2826, language_code: 'en', location_name: 'United Kingdom' },
  'canada': { location_code: 2124, language_code: 'en', location_name: 'Canada' },
  'australia': { location_code: 2036, language_code: 'en', location_name: 'Australia' },
  'germany': { location_code: 2276, language_code: 'de', location_name: 'Germany' },
  'france': { location_code: 2250, language_code: 'fr', location_name: 'France' },
  'brazil': { location_code: 2076, language_code: 'pt', location_name: 'Brazil' },
  'japan': { location_code: 2392, language_code: 'ja', location_name: 'Japan' },
};

const DIRECTORY_SITES = new Set([
  'gartner.com', 'similarweb.com', 'clutch.co', 'capterra.com', 'g2.com',
  'trustpilot.com', 'softwareadvice.com', 'getapp.com', 'pcmag.com',
  'forbes.com', 'techradar.com', 'cnet.com', 'zdnet.com', 'wikipedia.org'
]);

function getAuthHeader() {
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    console.warn('⚠️ DataForSEO credentials not configured');
    return null;
  }
  const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
  return `Basic ${auth}`;
}

export function resolveLocation(location) {
  const input = (location || '').trim().toLowerCase();

  if (!input || input === 'global' || input === 'worldwide') {
    return {
      ...LOCATION_MAP['global'],
      requestedLocation: location || null,
      fallbackApplied: true,
    };
  }

  const known = LOCATION_MAP[input];
  if (known) {
    return {
      ...known,
      requestedLocation: location,
      fallbackApplied: false,
    };
  }

  return {
    location_name: location,
    language_name: 'English',
    requestedLocation: location,
    fallbackApplied: false,
    unresolved: true,
  };
}

export function sanitizeKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  const seen = new Set();
  return keywords
    .map(kw => {
      if (typeof kw !== 'string') return null;
      let cleaned = kw.normalize('NFKC').trim();
      cleaned = cleaned.replace(/&/g, ' and ');
      cleaned = cleaned.replace(/[^\w\s\-'&]/g, ' ');
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    })
    .filter(kw => {
      if (!kw) return false;
      if (kw.length < 3) return false;
      const words = kw.split(' ');
      if (words.length === 1 && GENERIC_KEYWORDS.has(words[0].toLowerCase())) return false;
      const lower = kw.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
}

async function dataforseoRequest(endpoint, method = 'POST', body = null) {
  if (Date.now() < _dataforseoBlockedUntil) {
    return { success: false, error: 'DataForSEO temporarily blocked', unavailable: true, available: false, reason: 'PAYMENT_REQUIRED', statusCode: 40200, httpStatus: 402, status: 'PAYMENT_REQUIRED' };
  }

  if (_dataforseoAuthFailed) {
    return { success: false, error: 'DataForSEO unavailable: authentication previously failed', unavailable: true, available: false, reason: 'AUTHENTICATION_FAILED' };
  }

  if (!VALID_ENDPOINTS.has(endpoint)) {
    console.error(`❌ [DataForSEO] Invalid endpoint: ${endpoint}`);
    return { success: false, error: `Invalid DataForSEO endpoint: ${endpoint}`, statusCode: 40400 };
  }

  const authHeader = getAuthHeader();
  if (!authHeader) {
    _dataforseoAuthFailed = true;
    return { success: false, error: 'DataForSEO credentials not configured', unavailable: true };
  }

  console.log('[DataForSEO] Request:', {
    service: 'DataForSEO',
    endpoint,
    method,
    taskCount: Array.isArray(body) ? body.length : 1,
  });

  try {
    const url = `${DATAFORSEO_API_URL}${endpoint}`;
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

    console.log(`[DataForSEO] Response Status: ${response.status}`);

    if (response.status === 401) {
      _dataforseoAuthFailed = true;
      _dataforseoVerified = false;
      const errorText = await response.text();
      console.warn('⚠️ [DataForSEO] Authentication failed');

      if (errorText.includes('40104') || errorText.includes('verify your account')) {
        return {
          success: false,
          error: 'DataForSEO account not verified',
          unavailable: true,
          available: false,
          reason: 'DataForSEO account not verified',
          source: 'DataForSEO',
          statusCode: 40104
        };
      }

      return {
        success: false,
        error: 'DataForSEO unavailable: authentication failed',
        unavailable: true,
        available: false,
        reason: 'DataForSEO authentication failed',
        source: 'DataForSEO'
      };
    }

    if (response.status === 402) {
      const errorText = await response.text();
      console.warn(`⚠️ [DataForSEO] Payment Required (402): ${endpoint}`);
      _dataforseoBlockedUntil = Date.now() + 300000;
      _dataforseoPaymentRequired = true;
      _dataforseoVerified = false;
      return {
        success: false,
        error: 'DataForSEO credits exhausted (HTTP 402)',
        unavailable: true,
        available: false,
        reason: 'DataForSEO account has no credits',
        source: 'DataForSEO',
        statusCode: 40200,
        httpStatus: 402,
        status: 'PAYMENT_REQUIRED'
      };
    }

    if (response.status === 404) {
      const errorText = await response.text();
      console.error(`❌ [DataForSEO] 404 Not Found: ${endpoint} - ${errorText}`);
      return { success: false, error: `DataForSEO endpoint not found: ${endpoint}`, statusCode: 40400, httpStatus: 404 };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [DataForSEO] API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (data && data.tasks && data.tasks.length > 0) {
      const failedTask = data.tasks.find(t => t.status_code && t.status_code !== 20000);
      if (failedTask) {
        console.error(`❌ [DataForSEO] Task failed: ${failedTask.status_code} - ${failedTask.status_message}`);
        return {
          success: false,
          error: failedTask.status_message || `DataForSEO task error: ${failedTask.status_code}`,
          statusCode: failedTask.status_code,
          statusMessage: failedTask.status_message,
          results: [],
        };
      }
    }

    _dataforseoVerified = true;
    _dataforseoAuthFailed = false;
    _dataforseoPaymentRequired = false;
    return { success: true, data };
  } catch (error) {
    console.error(`❌ [DataForSEO] Request failed:`, error.message);
    return { success: false, error: error.message };
  }
}

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

export async function getKeywordMetrics(keywords, location = 'United States', language = 'English') {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { success: false, error: 'No keywords provided' };
  }

  const filteredKeywords = sanitizeKeywords(keywords);

  if (filteredKeywords.length === 0) {
    return { success: false, error: 'No valid keywords after sanitization' };
  }

  const loc = resolveLocation(location);

  const body = [{
    keywords: filteredKeywords,
    location_code: loc.location_code,
    language_code: loc.language_code,
  }];

  const endpoint = '/keywords_data/google_ads/search_volume/live';

  console.log('[DataForSEO] Keywords sent to API:', {
    endpoint,
    count: filteredKeywords.length,
    keywords: filteredKeywords,
    location,
    resolvedCode: loc.location_code,
    resolvedName: loc.location_name,
    fallbackApplied: loc.fallbackApplied,
  });

  const response = await dataforseoRequest(endpoint, 'POST', body);

  if (!response.success) {
    return response;
  }

  const normalized = (response.data.tasks || [])
    .filter(task => task.status_code === 20000)
    .flatMap(task => {
      if (!task.result) return [];
      const taskResults = Array.isArray(task.result) ? task.result : [task.result];
      return taskResults.flatMap(result => {
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

  if (normalized.length === 0) {
    return {
      success: false,
      error: 'No valid metrics returned',
      message: 'Metrics unavailable from DataForSEO',
      data: []
    };
  }

  return { success: true, data: normalized };
}

export async function getKeywordSuggestions(seedKeywords, location = 'United States', language = 'English') {
  if (!Array.isArray(seedKeywords) || seedKeywords.length === 0) {
    return { success: false, error: 'No seed keywords provided' };
  }

  const loc = resolveLocation(location);

  const body = [{
    keywords: seedKeywords,
    location_code: loc.location_code,
    language_code: loc.language_code,
    limit: 10
  }];

  const response = await dataforseoRequest('/keywords_data/google_ads/keywords_for_keywords/live', 'POST', body);

  if (!response.success) {
    return response;
  }

  const suggestions = (response.data.tasks || [])
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
        evidence: 'Retrieved from DataForSEO Keywords for Keywords API'
      }));
    })
    .filter(item => {
      const lowerKw = item.keyword.toLowerCase().trim();
      if (lowerKw.split(' ').length === 1 && GENERIC_KEYWORDS.has(lowerKw)) {
        return false;
      }
      return true;
    });

  return { success: true, data: suggestions };
}

export async function getRelatedKeywords(seedKeyword, location = 'United States', language = 'English') {
  if (!seedKeyword || typeof seedKeyword !== 'string') {
    return { success: false, error: 'Invalid seed keyword' };
  }

  const loc = resolveLocation(location);

  const body = [{
    keywords: [seedKeyword],
    location_code: loc.location_code,
    language_code: loc.language_code,
    limit: 20
  }];

  const response = await dataforseoRequest('/keywords_data/google_ads/keywords_for_keywords/live', 'POST', body);

  if (!response.success) {
    return response;
  }

  const related = (response.data.tasks || [])
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
      const lowerKw = item.keyword.toLowerCase().trim();
      if (lowerKw.split(' ').length === 1 && GENERIC_KEYWORDS.has(lowerKw)) {
        return false;
      }
      return true;
    });

  return { success: true, data: related };
}

export async function getSerpResults(keyword, location = 'United States', language = 'English') {
  if (!keyword || typeof keyword !== 'string') {
    return { success: false, error: 'Invalid keyword' };
  }

  const loc = resolveLocation(location);

  const body = [{
    keyword,
    location_code: loc.location_code,
    language_code: loc.language_code,
    depth: 10,
    device: 'desktop'
  }];

  const response = await dataforseoRequest('/serp/google/organic/live/regular', 'POST', body);

  if (!response.success) {
    return response;
  }

  const results = (response.data.tasks || [])
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

export async function getSerpCompetitors(keywords, location = 'United States', language = 'English') {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { success: false, error: 'No keywords provided' };
  }

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

const ARTICLE_TITLE_PATTERNS = [
  /^what\s+is\s+/i,
  /^how\s+to\s+/i,
  /^top\s+\d+/i,
  /^best\s+/i,
  /^guide\s+to\s+/i,
  /^ultimate\s+guide/i,
  /^introducing\s+/i,
  /^why\s+/i,
  /^when\s+/i,
  /^\d+\s+/,
];

function isArticleTitle(title) {
  if (!title) return true;
  return ARTICLE_TITLE_PATTERNS.some(p => p.test(title.trim()));
}

function isKnowledgeDomain(domain) {
  if (!domain) return true;
  const lower = domain.toLowerCase();
  return /(wikipedia|reddit|quora|medium\.com|hubspot\.com|blog\.|news\.|docs\.)/.test(lower);
}

function isJobOrCareerPage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return /\/jobs\b|\/careers\b|\/apply\b/i.test(lower);
}

function isHelpOrSupportPage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return /\/help\b|\/support\b|\/faq\b|\/knowledge.?base|\/tutorials?\b|\/guide|\/manual|\/documentation|\/docs\b/i.test(lower);
}

function isLoginSignupPage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return /\/login|\/signin|\/sign.?up|\/register|\/auth|\/forgot|\/reset|\/logout/i.test(lower);
}

function isTargetDomainPage(url, targetDomain) {
  if (!url || !targetDomain) return false;
  const lower = url.toLowerCase();
  const targetLower = targetDomain.toLowerCase();
  return lower.includes(targetLower) && /\/support|\/help|\/docs|\/login|\/signin|\/signup|\/pricing|\/blog\/|\/news\/|\/about|\/contact/i.test(lower);
}

function isArticleOrListicle(title, url, snippet) {
  if (!title) return true;
  const lowerTitle = (title || '').toLowerCase();
  const lowerUrl = (url || '').toLowerCase();
  const lowerSnippet = (snippet || '').toLowerCase();
  const articleIndicators = [
    /^\d+\s+(best|top|ways|tips|reasons|steps|things|ideas)/i,
    /(article|blog|news|press|review|vs\.|versus|guide|how\s+to|what\s+is)/i,
    /^\d{4}\s/,
    /\b(best|top|amazing|incredible|ultimate)\s+.+\s+(for|in|of|to)\b/i,
  ];
  if (articleIndicators.some(p => p.test(lowerTitle))) return true;
  if (/\/blog\/|\/news\/|\/articles\/|\.blog\./.test(lowerUrl)) return true;
  if (/^\d{4}\s+(best|top|trend|prediction)/i.test(lowerTitle)) return true;
  if (lowerSnippet.includes('list of') || lowerSnippet.includes('top ') || lowerSnippet.startsWith('best ')) return true;
  return false;
}

export function normalizeSerpCompetitors(serpResults, identity = {}) {
  if (!Array.isArray(serpResults) || serpResults.length === 0) {
    return [];
  }

  const targetDomain = extractDomain(identity?.websiteUrl || identity?.domain || '');

  const domainMap = new Map();

  serpResults.forEach(result => {
    const domain = result.domain.toLowerCase();

    if (isKnowledgeDomain(domain)) return;
    if (isJobOrCareerPage(result.url)) return;
    if (isArticleTitle(result.title)) return;
    if (isHelpOrSupportPage(result.url)) return;
    if (isLoginSignupPage(result.url)) return;
    if (isArticleOrListicle(result.title, result.url, result.snippet)) return;
    if (targetDomain && isTargetDomainPage(result.url, targetDomain)) return;
    if (targetDomain && (domain === targetDomain || domain.includes(targetDomain) || targetDomain.includes(domain))) return;
    if (targetDomain && (domain.endsWith('.' + targetDomain) || targetDomain.endsWith('.' + domain))) return;

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

function classifyCompetitorType(competitor, identity = {}) {
  const domain = competitor.domain.toLowerCase();
  const title = competitor.title.toLowerCase();
  const snippet = competitor.snippet.toLowerCase();

  for (const dirSite of DIRECTORY_SITES) {
    if (domain.includes(dirSite)) {
      return {
        type: 'directoryOrResearchSite',
        relevanceScore: 20,
        overlapReason: 'Directory or research platform'
      };
    }
  }

  if ((title.includes('blog') || title.includes('news') || title.includes('guide') ||
       snippet.includes('blog') || snippet.includes('article')) &&
      !title.includes('software') && !title.includes('platform') && !title.includes('solution')) {
    return {
      type: 'serpCompetitor',
      relevanceScore: 30,
      overlapReason: 'Content/blog site'
    };
  }

  const industry = (identity.industry || '').toLowerCase();
  const productName = (identity.productName || '').toLowerCase();

  if (industry && (title.includes(industry) || snippet.includes(industry))) {
    return {
      type: 'directBusinessCompetitor',
      relevanceScore: 90,
      overlapReason: `Industry match: ${industry}`
    };
  }

  const businessTerms = ['software', 'development', 'consulting', 'services', 'solutions', 'company', 'agency'];
  const hasBusinessTerms = businessTerms.some(term => title.includes(term) || snippet.includes(term));

  if (hasBusinessTerms) {
    return {
      type: 'directBusinessCompetitor',
      relevanceScore: 70,
      overlapReason: 'Business service provider'
    };
  }

  return {
    type: 'serpCompetitor',
    relevanceScore: 40,
    overlapReason: 'SERP result'
  };
}

function extractCompanyName(title, domain) {
  if (!title) return domain;

  const cleaned = title
    .replace(/\s*-\s*.+$/, '')
    .replace(/\s*\|\s*.+$/, '')
    .replace(/\s*:\s*.+$/, '')
    .replace(/\s*\(.+\)$/, '')
    .trim();

  return cleaned || domain;
}

function calculateConfidence(appearances, rank) {
  const appearanceScore = Math.min(appearances * 10, 50);
  const rankScore = Math.max(0, 50 - rank * 2);
  return Math.min(100, appearanceScore + rankScore);
}

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
    directBusinessCompetitors: competitors.filter(c =>
      c.competitorType === 'directBusinessCompetitor' && c.relevanceScore >= 70
    ),
    serpCompetitors: competitors.filter(c =>
      c.competitorType === 'serpCompetitor' && c.relevanceScore >= 40
    ),
    directoryOrResearchSites: competitors.filter(c =>
      c.competitorType === 'directoryOrResearchSite'
    ),
    irrelevantFilteredSites: competitors.filter(c =>
      c.relevanceScore < 40 || c.competitorType === 'serpCompetitor' && c.relevanceScore < 70
    )
  };
}

export function isDataForSEOConfigured() {
  if (process.env.SEO_PROVIDER_DATAFORSEO_ENABLED === 'false') return false;
  return !!(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD);
}

export function isDataForSEOAvailable() {
  return isDataForSEOConfigured() && _dataforseoVerified && !_dataforseoPaymentRequired && Date.now() >= _dataforseoBlockedUntil;
}

export function getDataForSEOStatus() {
  const configured = isDataForSEOConfigured();
  if (!configured) {
    return { provider: 'DataForSEO', enabled: true, configured: false, available: false, status: 'NOT_CONFIGURED', reason: 'DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD not set', searchesRemaining: null, checkedAt: new Date().toISOString() };
  }
  if (Date.now() < _dataforseoBlockedUntil || _dataforseoPaymentRequired) {
    return { provider: 'DataForSEO', enabled: true, configured: true, available: false, status: 'PAYMENT_REQUIRED', reason: 'DataForSEO credits exhausted (HTTP 402)', searchesRemaining: null, checkedAt: new Date().toISOString() };
  }
  if (_dataforseoAuthFailed) {
    return { provider: 'DataForSEO', enabled: true, configured: true, available: false, status: 'AUTHENTICATION_FAILED', reason: 'DataForSEO authentication failed', searchesRemaining: null, checkedAt: new Date().toISOString() };
  }
  if (_dataforseoVerified) {
    return { provider: 'DataForSEO', enabled: true, configured: true, available: true, status: 'AVAILABLE', reason: null, searchesRemaining: null, checkedAt: new Date().toISOString() };
  }
  return { provider: 'DataForSEO', enabled: true, configured: true, available: false, status: 'CONFIGURED_UNVERIFIED', reason: 'Credentials present but not yet verified', searchesRemaining: null, checkedAt: new Date().toISOString() };
}

// ============================================
// BACKLINKS & DOMAIN ANALYTICS
// ============================================

export async function getBacklinksSummary(domain) {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const body = [{
    target: domain,
    limit: 100
  }];

  const response = await dataforseoRequest('/backlinks/summary/live', 'POST', body);

  if (!response.success) {
    return response;
  }

  const normalized = normalizeBacklinkSummary(response.data);
  return { success: true, data: normalized };
}

export async function getReferringDomains(domain) {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const body = [{
    target: domain,
    limit: 50,
    order_by: ['domain_rank_alexa,desc']
  }];

  const response = await dataforseoRequest('/backlinks/referring_domains/live', 'POST', body);

  if (!response.success) {
    return response;
  }

  const results = (response.data.tasks || [])
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

export async function getDomainAnalytics(domain) {
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const body = [{
    target: domain
  }];

  const response = await dataforseoRequest('/domain_analytics/domain_intersection/live', 'POST', body);

  if (!response.success) {
    return response;
  }

  const normalized = normalizeDomainAuthority(response.data);
  return { success: true, data: normalized };
}

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
    console.error(`❌ [DataForSEO] Domain data fetch failed:`, error.message);
    return { success: false, error: error.message };
  }
}

function extractDomain(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    return cleaned.split('/')[0].split('?')[0].toLowerCase();
  } catch {
    return '';
  }
}
