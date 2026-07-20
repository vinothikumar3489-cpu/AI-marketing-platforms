import fetch from 'node-fetch';

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

const GOOGLE_ENGINES = {
  search: 'google',
  shopping: 'google_shopping',
  news: 'google_news',
  trends: 'google_trends',
  autocomplete: 'google_autocomplete',
  knowledge_graph: 'google_knowledge_graph'
};

let _lastCheck = 0;
let _serpapiAvailable = true;

export function getSerpAPIStatus() {
  return {
    configured: !!SERPAPI_API_KEY,
    available: !!SERPAPI_API_KEY && _serpapiAvailable,
    provider: 'SerpAPI'
  };
}

export function isSerpAPIConfigured() {
  return !!SERPAPI_API_KEY;
}

export function isSerpAPIAvailable() {
  return !!SERPAPI_API_KEY && _serpapiAvailable;
}

async function serpapiRequest(endpoint, params = {}) {
  if (!SERPAPI_API_KEY) {
    return { success: false, error: 'SerpAPI key not configured', unavailable: true };
  }

  if (!_serpapiAvailable) {
    return { success: false, error: 'SerpAPI unavailable: previous failure', unavailable: true };
  }

  const url = `https://serpapi.com${endpoint}`;
  const queryParams = new URLSearchParams({
    api_key: SERPAPI_API_KEY,
    ...params
  });

  try {
    const response = await fetch(`${url}?${queryParams}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 401 || response.status === 403) {
      _serpapiAvailable = false;
      return { success: false, error: 'SerpAPI authentication failed', unavailable: true };
    }

    if (response.status === 429) {
      return { success: false, error: 'SerpAPI rate limited', retryAfter: 60, unavailable: false };
    }

    if (!response.ok) {
      return { success: false, error: `SerpAPI error: ${response.status}` };
    }

    const data = await response.json();

    if (data.search_information?.organic_results_state === 'Fully empty') {
      return { success: false, error: 'No results found', data: [] };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, unavailable: false };
  }
}

function extractDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeSearchResult(item) {
  return {
    position: item.position || item.rank || 0,
    title: item.title || '',
    url: item.link || item.url || '',
    domain: extractDomain(item.link || item.url),
    snippet: item.snippet || item.description || '',
    source: 'SerpAPI',
    confidence: 100,
    retrievedAt: new Date().toISOString(),
    status: 'measured'
  };
}

function normalizeAutocompleteResult(data) {
  if (!data?.suggestions) return [];
  return data.suggestions
    .filter(s => s.value && s.value.trim().length > 2)
    .map(s => ({
      keyword: s.value.trim(),
      relevance: s.relevance || 50,
      source: 'SerpAPI_autocomplete',
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }));
}

function normalizeRelatedSearches(data) {
  if (!data?.related_searches) return [];
  return data.related_searches
    .filter(r => r.query && r.query.trim().length > 2)
    .map(r => ({
      keyword: r.query.trim(),
      link: r.link || '',
      source: 'SerpAPI_related',
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }));
}

function normalizePeopleAlsoAsk(data) {
  if (!data?.people_also_ask) return [];
  return data.people_also_ask
    .filter(q => q.question && q.question.trim().length > 5)
    .map(q => ({
      question: q.question.trim(),
      answer: q.snippet || q.answer || '',
      source: 'SerpAPI_people_also_ask',
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }));
}

function normalizeKnowledgeGraph(data) {
  if (!data?.knowledge_graph) return null;
  const kg = data.knowledge_graph;
  return {
    title: kg.title || '',
    type: kg.type || '',
    description: kg.description || '',
    source: 'SerpAPI_knowledge_graph',
    attributes: kg.attributes || {},
    retrievedAt: new Date().toISOString(),
    status: 'measured'
  };
}

function normalizeTrendsResult(data) {
  if (!data?.interest_over_time?.timeline_data) return [];
  return data.interest_over_time.timeline_data.map(t => ({
    date: t.date || '',
    value: t.value?.[0] || t.value || 0,
    source: 'SerpAPI_trends',
    retrievedAt: new Date().toISOString(),
    status: 'measured'
  }));
}

function normalizeShoppingResult(item) {
  return {
    position: item.position || 0,
    title: item.title || '',
    price: item.price || '',
    source: item.source || item.store_name || '',
    rating: item.rating || null,
    reviews: item.reviews || null,
    url: item.link || item.url || '',
    source: 'SerpAPI_shopping',
    retrievedAt: new Date().toISOString(),
    status: 'measured'
  };
}

function normalizeNewsResult(item) {
  return {
    position: item.position || 0,
    title: item.title || '',
    source: item.source || item.source_name || '',
    date: item.date || item.publication_date || '',
    snippet: item.snippet || item.description || '',
    url: item.link || item.url || '',
    source: 'SerpAPI_news',
    retrievedAt: new Date().toISOString(),
    status: 'measured'
  };
}

export async function googleSearch(query, options = {}) {
  const { num = 10, location = 'United States', device = 'desktop' } = options;

  const result = await serpapiRequest('/search', {
    engine: 'google',
    q: query,
    num: Math.min(num, 100),
    location: location,
    device: device,
    google_domain: 'google.com',
    hl: 'en',
    gl: 'us'
  });

  if (!result.success) return result;

  const d = result.data;
  const organic = (d.organic_results || []).map(normalizeSearchResult);

  return {
    success: true,
    data: {
      organic,
      totalResults: d.search_information?.total_results || 0,
      features: {
        knowledgeGraph: normalizeKnowledgeGraph(d),
        relatedSearches: normalizeRelatedSearches(d),
        peopleAlsoAsk: normalizePeopleAlsoAsk(d),
        topStories: (d.top_stories || []).map(normalizeSearchResult),
        localResults: (d.local_results || []).map(normalizeSearchResult)
      },
      raw: {
        searchParameters: d.search_parameters || {},
        searchInformation: d.search_information || {}
      },
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googleAutocomplete(query, options = {}) {
  const result = await serpapiRequest('/search', {
    engine: 'google_autocomplete',
    q: query,
    client: 'chrome'
  });

  if (!result.success) return result;

  return {
    success: true,
    data: {
      suggestions: normalizeAutocompleteResult(result.data),
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googleRelatedSearches(query, options = {}) {
  const result = await googleSearch(query, options);
  if (!result.success) return result;

  return {
    success: true,
    data: {
      related: result.data.features.relatedSearches,
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googlePeopleAlsoAsk(query, options = {}) {
  const result = await googleSearch(query, options);
  if (!result.success) return result;

  return {
    success: true,
    data: {
      questions: result.data.features.peopleAlsoAsk,
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googleTrends(query, options = {}) {
  const result = await serpapiRequest('/search', {
    engine: 'google_trends',
    q: query,
    data_type: 'TIMESERIES'
  });

  if (!result.success) return result;

  return {
    success: true,
    data: {
      interest: normalizeTrendsResult(result.data),
      relatedQueries: result.data?.related_queries || [],
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googleKnowledgeGraph(query, options = {}) {
  const result = await serpapiRequest('/search', {
    engine: 'google_knowledge_graph',
    q: query,
    limit: 5
  });

  if (!result.success) return result;

  return {
    success: true,
    data: {
      entities: (result.data?.entities || []).map(e => ({
        title: e.title || '',
        type: e.type || '',
        description: e.description || '',
        score: e.score || 0,
        source: 'SerpAPI_knowledge_graph',
        retrievedAt: new Date().toISOString(),
        status: 'measured'
      })),
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googleShopping(query, options = {}) {
  const result = await serpapiRequest('/search', {
    engine: 'google_shopping',
    q: query,
    num: 10
  });

  if (!result.success) return result;

  return {
    success: true,
    data: {
      results: (result.data?.shopping_results || []).map(normalizeShoppingResult),
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function googleNews(query, options = {}) {
  const result = await serpapiRequest('/search', {
    engine: 'google_news',
    q: query,
    num: 10
  });

  if (!result.success) return result;

  return {
    success: true,
    data: {
      results: (result.data?.news_results || []).map(normalizeNewsResult),
      provider: 'SerpAPI',
      confidence: 100,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }
  };
}

export async function comprehensiveSearch(query, options = {}) {
  const results = await Promise.allSettled([
    googleSearch(query, options),
    googleAutocomplete(query, options),
    googleTrends(query, options)
  ]);

  const search = results[0].status === 'fulfilled' ? results[0].value : null;
  const autocomplete = results[1].status === 'fulfilled' ? results[1].value : null;
  const trends = results[2].status === 'fulfilled' ? results[2].value : null;

  const data = {
    organic: search?.data?.organic || [],
    totalResults: search?.data?.totalResults || 0,
    autocomplete: autocomplete?.data?.suggestions || [],
    trends: trends?.data?.interest || [],
    features: search?.data?.features || {},
    providers: {
      organic: search?.data?.provider || null,
      autocomplete: autocomplete?.data?.provider || null,
      trends: trends?.data?.provider || null
    },
    confidence: calculateOverallConfidence([search, autocomplete, trends]),
    retrievedAt: new Date().toISOString(),
    status: 'measured'
  };

  return { success: true, data };
}

function calculateOverallConfidence(results) {
  const available = results.filter(r => r?.success);
  if (available.length === 0) return 0;
  return Math.round((available.length / results.length) * 100);
}

export async function getSerpCompetitors(productName, industry, websiteUrl) {
  const queries = [
    `${productName} alternatives`,
    `${productName} competitors`,
    `best ${industry} software`,
    `top ${industry} tools`,
    `${industry} platforms`
  ].filter(Boolean);

  const domain = extractDomain(websiteUrl);
  const allResults = [];

  for (const query of queries.slice(0, 3)) {
    const result = await googleSearch(query, { num: 10 });
    if (result.success && result.data.organic.length > 0) {
      allResults.push(...result.data.organic);
    }
  }

  const seen = new Set();
  const competitors = allResults
    .filter(r => {
      const d = r.domain;
      if (!d || d === domain || d.includes(domain) || seen.has(d)) return false;
      seen.add(d);
      return true;
    })
    .filter(r => !isNonSaaS(r.domain, r.title, r.snippet))
    .slice(0, 15)
    .map(r => ({
      name: extractCompanyName(r.title, r.domain),
      domain: r.domain,
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      competitorType: 'serp',
      relevanceScore: calculateRelevance(r, productName),
      source: 'SerpAPI',
      confidence: 80,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    }));

  return { success: true, data: competitors };
}

function isNonSaaS(domain, title, snippet) {
  const lower = `${domain} ${title} ${snippet}`.toLowerCase();
  const nonSaaSPatterns = [
    /reddit\.com/, /youtube\.com/, /wikipedia\.org/, /medium\.com/,
    /blog\./, /news\./, /docs\./, /github\.com/, /stackoverflow\.com/,
    /quora\.com/, /facebook\.com/, /instagram\.com/, /twitter\.com/,
    /linkedin\.com/, /pinterest\.com/, /tiktok\.com/, /snapchat\.com/,
    /capterra\.com/, /g2\.com/, /trustpilot\.com/, /crunchbase\.com/,
    /producthunt\.com/, /alternativeto\.net/, /getapp\.com/,
    /softwareadvice\.com/, /sitejabber\.com/, /saasworthy\.com/,
    /gartner\.com/, /forrester\.com/, /similarweb\.com/,
    /semrush\.com/, /ahrefs\.com/, /moz\.com/,
    /forbes\.com/, /techcrunch\.com/, /theverge\.com/, /wired\.com/,
    /businessinsider\.com/, /entrepreneur\.com/, /inc\.com/, /venturebeat\.com/,
    /techradar\.com/, /zdnet\.com/, /cnet\.com/, /pcmag\.com/,
    /hubspot\.com/, /neilpatel\.com/, /backlinko\.com/, /wordstream\.com/,
    /searchengineland\.com/, /searchenginejournal\.com/
  ];
  return nonSaaSPatterns.some(p => p.test(lower));
}

function extractCompanyName(title, domain) {
  if (!title) return domain;
  let name = title
    .replace(/\s*[-|–]\s*.*/g, '')
    .replace(/\s*:\s*.*/g, '')
    .replace(/\s*\|\s*.*/g, '')
    .trim();
  if (name.split(' ').length > 5 || /\d+\s+Best/i.test(name) || /Top\s+\d+/i.test(name)) {
    name = '';
  }
  if (name && name.length > 2 && name.length < 60) return name;
  return domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function calculateRelevance(result, productName) {
  let score = 50;
  const text = `${result.title} ${result.snippet || ''}`.toLowerCase();
  const product = (productName || '').toLowerCase();

  if (product && text.includes(product)) score += 20;
  if (text.includes('alternative') || text.includes('competitor')) score += 15;
  if (text.includes('vs') || text.includes('versus')) score += 10;
  if (text.includes('software') || text.includes('platform') || text.includes('tool')) score += 10;
  if (text.includes('review') || text.includes('comparison')) score += 5;
  if (result.position && result.position <= 3) score += 10;

  return Math.min(95, score);
}

export async function searchOpportunityScore(query, productName) {
  const [searchResult, autoResult, trendResult] = await Promise.allSettled([
    googleSearch(query, { num: 10 }),
    googleAutocomplete(query),
    googleTrends(query)
  ]);

  const serpStrength = calculateSerpStrength(searchResult);
  const autocompleteSignal = autoResult.status === 'fulfilled' && autoResult.value?.success
    ? autoResult.value.data.suggestions.length : 0;
  const trendSignal = trendResult.status === 'fulfilled' && trendResult.value?.success
    ? calculateTrendStrength(trendResult.value.data.interest) : 0;
  const commercialIntent = detectCommercialIntent(query);
  const competition = estimateCompetition(searchResult);

  const opportunityScore = Math.round(
    (serpStrength * 0.25) +
    (autocompleteSignal * 0.15) +
    (trendSignal * 0.15) +
    (commercialIntent * 0.25) +
    (competition * 0.20)
  );

  return {
    opportunityScore: Math.min(100, opportunityScore),
    searchVolume: null,
    displayVolume: 'Estimated',
    serpStrength,
    autocompleteSignal,
    trendSignal,
    commercialIntent,
    competition,
    provider: 'SerpAPI',
    confidence: 70,
    retrievedAt: new Date().toISOString(),
    status: 'estimated'
  };
}

function calculateSerpStrength(searchResult) {
  if (searchResult.status !== 'fulfilled' || !searchResult.value?.success) return 0;
  const organic = searchResult.value.data.organic || [];
  if (organic.length === 0) return 0;
  const hasAds = organic.some(r => r.title && r.url);
  const resultDiversity = new Set(organic.map(r => r.domain)).size;
  return Math.min(100, (organic.length * 5) + (resultDiversity * 3) + (hasAds ? 10 : 0));
}

function calculateTrendStrength(trends) {
  if (!trends || trends.length === 0) return 0;
  const recent = trends.slice(-3);
  const avg = recent.reduce((s, t) => s + (t.value || 0), 0) / recent.length;
  return Math.min(100, avg * 10);
}

function detectCommercialIntent(query) {
  const lower = query.toLowerCase();
  const commercial = ['buy', 'price', 'pricing', 'best', 'top', 'review', 'compare', 'vs',
    'alternative', 'discount', 'deal', 'coupon', 'cheap', 'affordable', 'software', 'tool', 'platform'];
  const commercialCount = commercial.filter(c => lower.includes(c)).length;
  return Math.min(100, commercialCount * 20);
}

function estimateCompetition(searchResult) {
  if (searchResult.status !== 'fulfilled' || !searchResult.value?.success) return 50;
  const totalResults = searchResult.value.data.totalResults || 0;
  if (totalResults > 10000000) return 90;
  if (totalResults > 1000000) return 70;
  if (totalResults > 100000) return 50;
  if (totalResults > 10000) return 30;
  return 10;
}
