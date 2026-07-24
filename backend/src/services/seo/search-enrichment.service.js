import { resolveAutocomplete, resolveTrends } from "./seo-provider-router.service.js";

export async function generateSearchEnrichment({ query, location = 'United States' }) {
  console.log('[Search Enrichment] Starting enrichment for query:', query);

  const autocomplete = await resolveAutocomplete(query);
  const trends = await resolveTrends(query);

  const suggests = autocomplete.success ? (autocomplete.data?.suggestions || []) : [];
  const trendData = trends.success ? (trends.data?.interest || []) : [];

  const enriched = {
    autocomplete: buildAutocomplete(suggests, query),
    trends: buildTrends(trendData),
    peopleAlsoAsk: buildPeopleAlsoAsk(suggests, query),
    relatedSearches: buildRelatedSearches(suggests, query),
    serpFeatures: buildSerpFeatures(suggests, trendData),
    topicClusters: buildTopicClusters(suggests, query),
    contentOpportunities: buildContentOpportunities(suggests, query),
    provider: autocomplete.provider || trends.provider || null,
    status: (autocomplete.success || trends.success) ? 'enriched' : 'unavailable'
  };

  console.log('[Search Enrichment] Complete:', {
    autocompleteCount: enriched.autocomplete.length,
    peopleAlsoAskCount: enriched.peopleAlsoAsk.length,
    relatedSearchesCount: enriched.relatedSearches.length,
    provider: enriched.provider,
    status: enriched.status
  });

  return enriched;
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

function buildSerpFeatures(suggestions, trendData) {
  const features = [];
  if (suggestions.length > 0) {
    features.push({ type: 'autocomplete', available: true, count: suggestions.length });
  }
  if (trendData.length > 0) {
    features.push({ type: 'trends', available: true, dataPoints: trendData.length });
  }
  return features;
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
