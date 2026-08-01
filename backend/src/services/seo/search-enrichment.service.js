import { resolveAutocomplete, resolveTrends, resolveSerpData } from "./seo-provider-router.service.js";

export async function generateSearchEnrichment({ query, location = 'United States', keywords = [], productName = '', websiteUrl = '' }) {
  console.log('[Search Enrichment] Starting enrichment for query:', query);

  const autocomplete = await resolveAutocomplete(query);
  const trends = await resolveTrends(query);
  const serp = await resolveSerpData(query, { location, num: 10 });

  const suggests = autocomplete.success ? (autocomplete.data?.suggestions || []) : [];
  const trendData = trends.success ? (trends.data?.interest || []) : [];
  const serpData = serp.success ? serp.data : null;

  const serpAnalysis = buildSerpAnalysis(serpData, query, productName, websiteUrl, keywords);
  const features = serpAnalysis.features;

  const enriched = {
    autocomplete: buildAutocomplete(suggests, query),
    trends: buildTrends(trendData),
    peopleAlsoAsk: buildPeopleAlsoAsk(suggests, query),
    relatedSearches: buildRelatedSearches(suggests, query),
    serpFeatures: features,
    serpAnalysis,
    topicClusters: buildTopicClusters(suggests, query),
    contentOpportunities: buildContentOpportunities(suggests, query),
    provider: serp.provider || autocomplete.provider || trends.provider || null,
    status: (serp.success || autocomplete.success || trends.success) ? 'enriched' : 'unavailable'
  };

  console.log('[Search Enrichment] Complete:', {
    autocompleteCount: enriched.autocomplete.length,
    peopleAlsoAskCount: enriched.peopleAlsoAsk.length,
    relatedSearchesCount: enriched.relatedSearches.length,
    serpFeatures: features.length,
    provider: enriched.provider,
    status: enriched.status
  });

  return enriched;
}

function buildSerpAnalysis(serpData, query, productName, websiteUrl, keywords) {
  if (!serpData) {
    return {
      status: 'unavailable',
      reason: 'No live SERP provider available — results derived from autocomplete only',
      features: [],
      aiOverview: null,
      featuredSnippet: null,
      organic: [],
      ownDomainRank: null,
      keywordChecks: [],
      provider: null
    };
  }

  const features = [];
  const organic = serpData.organic || [];
  const aiOverview = serpData.aiOverview || serpData.features?.aiOverview || null;
  const featuredSnippet = serpData.featuredSnippet || serpData.features?.featuredSnippet || null;

  if (aiOverview) features.push({ type: 'ai_overview', available: true, keyword: query });
  if (featuredSnippet) features.push({ type: 'featured_snippet', available: true, keyword: query });
  const kg = serpData.features?.knowledgeGraph;
  if (kg) features.push({ type: 'knowledge_graph', available: true, title: kg.title || '' });
  const paa = serpData.features?.peopleAlsoAsk;
  if (paa && paa.length > 0) features.push({ type: 'people_also_ask', available: true, count: paa.length });
  const related = serpData.features?.relatedSearches;
  if (related && related.length > 0) features.push({ type: 'related_searches', available: true, count: related.length });
  const local = serpData.features?.localResults;
  if (local && local.length > 0) features.push({ type: 'local_pack', available: true, count: local.length });
  const stories = serpData.features?.topStories;
  if (stories && stories.length > 0) features.push({ type: 'top_stories', available: true, count: stories.length });
  if (organic.length > 0) features.push({ type: 'organic', available: true, count: organic.length });

  const ownDomain = (websiteUrl || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const ownRankEntry = organic.find(r => {
    const d = (r.domain || '').toLowerCase();
    return ownDomain && (d === ownDomain || d.endsWith('.' + ownDomain));
  });

  return {
    status: 'measured',
    provider: serpData.provider || serp.provider || null,
    features,
    aiOverview,
    featuredSnippet,
    organic: organic.slice(0, 10).map(r => ({
      rank: r.position || r.rank || null,
      domain: r.domain || '',
      url: r.url || '',
      title: (r.title || '').slice(0, 120),
      snippet: (r.snippet || '').slice(0, 200)
    })),
    ownDomain,
    ownDomainRank: ownRankEntry ? (ownRankEntry.position || ownRankEntry.rank || null) : null,
    peopleAlsoAsk: (serpData.features?.peopleAlsoAsk || []).slice(0, 8),
    relatedSearches: (serpData.features?.relatedSearches || []).slice(0, 8),
    keywordChecks: [],
    retrievedAt: new Date().toISOString()
  };
}

function buildAutocomplete(suggestions, query) {
  if (!suggestions || suggestions.length === 0) return [];
  const lower = query.toLowerCase();
  return suggestions
    .filter(s => typeof s === 'string' && s.toLowerCase() !== lower)
    .slice(0, 10)
    .map(s => ({
      suggestion: s,
      source: 'autocomplete',
      status: 'measured',
      category: inferCategory(s)
    }));
}

function buildPeopleAlsoAsk(suggestions, query) {
  if (!suggestions || suggestions.length === 0) return [];
  const questionStarters = ['how', 'what', 'why', 'when', 'where', 'which', 'who', 'does', 'can', 'is', 'are', 'will', 'should'];
  return suggestions
    .filter(s => typeof s === 'string' && questionStarters.some(q => s.toLowerCase().startsWith(q)))
    .slice(0, 8)
    .map(s => ({
      question: s,
      source: 'autocomplete',
      status: 'measured'
    }));
}

function buildRelatedSearches(suggestions, query) {
  if (!suggestions || suggestions.length === 0) return [];
  const lower = query.toLowerCase();
  return suggestions
    .filter(s => typeof s === 'string' && s.toLowerCase() !== lower && !s.toLowerCase().includes(lower))
    .slice(0, 8)
    .map(s => ({
      search: s,
      source: 'autocomplete',
      status: 'measured'
    }));
}

function buildTrends(trendData) {
  if (!trendData || trendData.length === 0) return [];
  return trendData.slice(0, 12).map(t => ({
    date: t.date || t.timestamp || null,
    value: t.value ?? t.interest ?? null,
    source: 'trends',
    status: 'measured'
  }));
}

function buildTopicClusters(suggestions, query) {
  if (!suggestions || suggestions.length === 0) return [];
  const clusters = [];
  const seen = new Set();
  for (const s of suggestions) {
    if (typeof s !== 'string' || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    const words = s.split(' ');
    if (words.length >= 2) {
      const topic = words.slice(0, 2).join(' ');
      if (!seen.has(topic)) {
        seen.add(topic);
        clusters.push({ name: topic, keywords: [s], source: 'autocomplete', status: 'measured' });
      }
    }
  }
  return clusters.slice(0, 5);
}

function buildContentOpportunities(suggestions, query) {
  if (!suggestions || suggestions.length === 0) return [];
  const lower = query.toLowerCase();
  const questionStarters = ['how', 'what', 'why', 'when', 'where', 'which', 'who'];
  return suggestions
    .filter(s => typeof s === 'string' && !s.toLowerCase().includes(lower))
    .slice(0, 5)
    .map(s => ({
      keyword: s,
      type: 'informational',
      reason: 'Derived from search enrichment',
      source: 'autocomplete',
      status: 'measured',
      estimatedImpact: 'medium'
    }));
}

function inferCategory(suggestion) {
  const lower = suggestion.toLowerCase();
  if (['buy', 'purchase', 'price', 'pricing', 'cost', 'deal', 'discount', 'coupon'].some(w => lower.includes(w))) {
    return 'commercial';
  }
  if (['how', 'what', 'why', 'when', 'where', 'which', 'who', 'guide', 'tutorial'].some(w => lower.startsWith(w))) {
    return 'informational';
  }
  if (['vs', 'versus', 'alternative', 'compare', 'comparison', 'review', 'best'].some(w => lower.includes(w))) {
    return 'comparison';
  }
  return 'informational';
}
