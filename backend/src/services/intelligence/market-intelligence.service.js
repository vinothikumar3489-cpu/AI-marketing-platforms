import { researchCompetitors } from '../tavily.service.js';
import { getKeywordMetrics, getKeywordSuggestions, isDataForSEOConfigured } from '../dataforseo.service.js';

export async function collectMarketIntelligence({ websiteUrl, productName, industry, targetCountry }) {
  const market = {
    tam: 'Unknown',
    sam: 'Unknown',
    som: 'Unknown',
    growthRate: 'Unknown',
    trends: [],
    opportunities: [],
    risks: [],
    sources: [],
    warnings: []
  };

  // Phase 1: Try DataForSEO for keyword-based market insights
  if (isDataForSEOConfigured()) {
    try {
      const seedKeywords = [
        productName,
        industry,
        `${industry} market size`,
        `${industry} industry`,
        `${industry} trends`
      ].filter(Boolean);

      const keywordData = await getKeywordMetrics(seedKeywords, targetCountry || 'United States');
      if (keywordData?.success && keywordData?.data?.length > 0) {
        const volumes = keywordData.data.filter(k => k.volume > 0);
        if (volumes.length > 0) {
          market.sources.push({ type: 'market_search_volume', source: 'DataForSEO', keywordsFound: volumes.length });
        }
      }

      const suggestions = await getKeywordSuggestions([industry || productName].filter(Boolean));
      if (suggestions?.success && suggestions?.data?.length > 0) {
        market.trends = suggestions.data
          .filter(s => s.volume > 100)
          .slice(0, 8)
          .map(s => ({
            keyword: s.keyword,
            volume: s.volume,
            difficulty: s.keywordDifficulty,
            source: 'DataForSEO'
          }));
        market.sources.push({ type: 'keyword_trends', source: 'DataForSEO', count: market.trends.length });
      }
    } catch (e) {
      market.warnings.push(`DataForSEO market research failed: ${e.message}`);
    }
  }

  // Phase 2: Try Tavily for market research
  try {
    const researchQuery = `${productName || industry} market size trends analysis 2025 2026`;
    const tavilyResult = await researchCompetitors(productName || industry, industry || 'technology', 'market');
    if (tavilyResult?.success) {
      if (tavilyResult.marketSignals?.length > 0) {
        market.trends.push(...tavilyResult.marketSignals.slice(0, 5).map(s => ({
          signal: s,
          source: 'Tavily'
        })));
        market.sources.push({ type: 'market_signals', source: 'Tavily', count: tavilyResult.marketSignals.length });
      }
      if (tavilyResult.competitors?.length > 0) {
        market.sources.push({ type: 'market_competitor_context', source: 'Tavily', count: tavilyResult.competitors.length });
      }
    }
  } catch (e) {
    market.warnings.push(`Tavily market research failed: ${e.message}`);
  }

  // Deduplicate trends
  const seenTrends = new Set();
  market.trends = market.trends.filter(t => {
    const key = typeof t === 'string' ? t : t.keyword || t.signal;
    if (seenTrends.has(key)) return false;
    seenTrends.add(key);
    return true;
  });

  market.trends = market.trends.slice(0, 10);

  return market;
}
