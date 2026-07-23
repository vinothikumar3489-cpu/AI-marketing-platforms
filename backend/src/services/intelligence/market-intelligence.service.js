import { researchCompetitors } from "../../providers/tavily.service.js";
import { getKeywordMetrics, getKeywordSuggestions, isDataForSEOConfigured } from "../../providers/dataforseo.service.js";

const INDUSTRY_TO_MARKET_QUERIES = {
  'social media': ['competitors', 'alternatives', 'social media platforms', 'social networking apps', 'creator platforms'],
  'video streaming': ['competitors', 'alternatives', 'video streaming platforms', 'entertainment apps', 'streaming services'],
  'communication': ['competitors', 'alternatives', 'messaging apps', 'communication platforms'],
  'business communication': ['competitors', 'alternatives', 'team collaboration tools', 'business communication software'],
  'design software': ['competitors', 'alternatives', 'design tools', 'creative software', 'design platforms'],
  'productivity software': ['competitors', 'alternatives', 'productivity tools', 'workspace platforms'],
  'marketing software': ['competitors', 'alternatives', 'marketing platforms', 'marketing automation tools'],
  'enterprise software': ['competitors', 'alternatives', 'enterprise software', 'business software'],
  'e-commerce': ['competitors', 'alternatives', 'e-commerce platforms', 'online shopping platforms'],
  'fintech': ['competitors', 'alternatives', 'fintech platforms', 'payment solutions'],
  'web services': ['competitors', 'alternatives', 'website builders', 'web hosting platforms'],
  'professional networking': ['competitors', 'alternatives', 'professional networking platforms', 'career platforms'],
  'entertainment': ['competitors', 'alternatives', 'entertainment platforms', 'media services'],
  'music streaming': ['competitors', 'alternatives', 'music streaming services', 'audio platforms'],
  'consumer technology': ['competitors', 'alternatives', 'consumer tech', 'technology products'],
  'internet services': ['competitors', 'alternatives', 'internet platforms', 'online services'],
  'travel': ['competitors', 'alternatives', 'travel platforms', 'travel services'],
  'transportation': ['competitors', 'alternatives', 'transportation apps', 'mobility platforms'],
};

function buildMarketQueries(productName, industry, category, domain) {
  const queries = [];

  if (productName && productName !== 'Unknown' && productName !== 'Unknown Product') {
    queries.push(`${productName} competitors`);
    queries.push(`${productName} alternatives`);
  }

  const lowerIndustry = (industry || '').toLowerCase().trim();
  const lowerCategory = (category || '').toLowerCase().trim();

  const industryQueries = INDUSTRY_TO_MARKET_QUERIES[lowerIndustry] || [];
  for (const suffix of industryQueries) {
    if (lowerCategory) {
      queries.push(`${lowerCategory} ${suffix}`);
    }
    if (lowerIndustry) {
      queries.push(`${lowerIndustry} ${suffix}`);
    }
  }

  if (!queries.length && domain) {
    const domainName = domain.split('.')[0];
    if (domainName && domainName.length > 2) {
      queries.push(`${domainName} competitors`);
      queries.push(`${domainName} market`);
    }
  }

  return [...new Set(queries)].filter(Boolean).slice(0, 10);
}

export async function collectMarketIntelligence({ websiteUrl, productName, industry, targetCountry, category, domain }) {
  const market = {
    tam: 'Unknown',
    sam: 'Unknown',
    som: 'Unknown',
    industrySize: 'Unknown',
    growthRate: 'Unknown',
    cagr: 'Unknown',
    trends: [],
    regulations: [],
    seasonality: [],
    investmentTrends: [],
    opportunities: [],
    risks: [],
    sources: [],
    warnings: []
  };

  const marketQueries = buildMarketQueries(productName, industry, category, domain);

  if (marketQueries.length === 0) {
    market.warnings.push('No market queries could be generated from product identity');
    return market;
  }

  if (isDataForSEOConfigured()) {
    try {
      const keywordData = await getKeywordMetrics(marketQueries, targetCountry || 'United States');
      if (keywordData?.success && keywordData?.data?.length > 0) {
        const volumes = keywordData.data.filter(k => k.volume > 0);
        if (volumes.length > 0) {
          market.sources.push({ type: 'market_search_volume', source: 'DataForSEO', keywordsFound: volumes.length });
        }
        const avgVolume = volumes.reduce((sum, k) => sum + k.volume, 0) / volumes.length;
        if (avgVolume > 10000) {
          market.industrySize = 'Large market (10k+ monthly search volume)';
        } else if (avgVolume > 1000) {
          market.industrySize = 'Medium market (1k-10k monthly search volume)';
        } else if (avgVolume > 0) {
          market.industrySize = 'Niche market (<1k monthly search volume)';
        }
      }

      const suggestionSeed = productName || industry || (domain || '').split('.')[0];
      if (suggestionSeed) {
        const suggestions = await getKeywordSuggestions([suggestionSeed].filter(Boolean));
        if (suggestions?.success && suggestions?.data?.length > 0) {
          const trends = suggestions.data
            .filter(s => s.volume > 100)
            .slice(0, 8)
            .map(s => ({
              keyword: s.keyword,
              volume: s.volume,
              difficulty: s.keywordDifficulty,
              source: 'DataForSEO',
              evidence: {
                source: 'DataForSEO keyword API',
                confidence: 85,
                collectedAt: new Date().toISOString()
              }
            }));
          market.trends = trends;
          market.sources.push({ type: 'keyword_trends', source: 'DataForSEO', count: market.trends.length });
        }
      }
    } catch (e) {
      market.warnings.push(`DataForSEO market research failed: ${e.message}`);
    }
  }

  try {
    const researchQuery = `${productName || (domain || '').split('.')[0] || 'market'} ${industry || ''} market trends analysis 2025 2026`.trim();
    const tavilyResult = await researchCompetitors(productName || (domain || '').split('.')[0] || 'technology', industry || 'technology', 'market');
    if (tavilyResult?.success) {
      if (tavilyResult.marketSignals?.length > 0) {
        const signals = tavilyResult.marketSignals.slice(0, 5).map(s => ({
          signal: s,
          source: 'Tavily',
          evidence: {
            source: 'Tavily web research API',
            confidence: 65,
            collectedAt: new Date().toISOString()
          }
        }));
        market.trends.push(...signals);
        market.sources.push({ type: 'market_signals', source: 'Tavily', count: tavilyResult.marketSignals.length });
      }
      if (tavilyResult.competitors?.length > 0) {
        market.sources.push({ type: 'market_competitor_context', source: 'Tavily', count: tavilyResult.competitors.length });
      }
    }
  } catch (e) {
    market.warnings.push(`Tavily market research failed: ${e.message}`);
  }

  if (market.trends.length > 0) {
    const trendVolume = market.trends.filter(t => t.volume).reduce((sum, t) => sum + t.volume, 0);
    if (trendVolume > 50000) {
      market.growthRate = 'High growth market based on strong search volume signals';
    } else if (trendVolume > 10000) {
      market.growthRate = 'Moderate growth market based on search volume signals';
    } else if (trendVolume > 0) {
      market.growthRate = 'Established market with stable search demand';
    }
  }

  const industryLower = (industry || '').toLowerCase();
  const highInvestmentIndustries = ['ai', 'artificial intelligence', 'machine learning', 'fintech', 'healthtech', 'saas', 'cybersecurity', 'climate', 'biotech'];
  if (highInvestmentIndustries.some(i => industryLower.includes(i))) {
    market.investmentTrends.push({
      trend: `High VC/PE investment activity in ${industry} sector`,
      source: 'Industry analysis',
      evidence: {
        source: 'Industry pattern analysis',
        confidence: 70,
        collectedAt: new Date().toISOString()
      }
    });
  }

  const seenTrends = new Set();
  market.trends = market.trends.filter(t => {
    const key = typeof t === 'string' ? t : t.keyword || t.signal || '';
    if (seenTrends.has(key)) return false;
    seenTrends.add(key);
    return true;
  });

  market.trends = market.trends.slice(0, 10);

  return market;
}
