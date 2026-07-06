import { researchCompetitors } from '../tavily.service.js';
import { getKeywordMetrics, getKeywordSuggestions, isDataForSEOConfigured } from '../dataforseo.service.js';

export async function collectMarketIntelligence({ websiteUrl, productName, industry, targetCountry }) {
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

  // Phase 1: Try DataForSEO for keyword-based market insights
  if (isDataForSEOConfigured()) {
    try {
      const seedKeywords = [
        productName,
        industry,
        `${industry} market size`,
        `${industry} industry`,
        `${industry} trends`,
        `${industry} regulations`,
        `${industry} investment`
      ].filter(Boolean);

      const keywordData = await getKeywordMetrics(seedKeywords, targetCountry || 'United States');
      if (keywordData?.success && keywordData?.data?.length > 0) {
        const volumes = keywordData.data.filter(k => k.volume > 0);
        if (volumes.length > 0) {
          market.sources.push({ type: 'market_search_volume', source: 'DataForSEO', keywordsFound: volumes.length });
        }
        // Attempt to infer industry size from search volume
        const avgVolume = volumes.reduce((sum, k) => sum + k.volume, 0) / volumes.length;
        if (avgVolume > 10000) {
          market.industrySize = 'Large market (10k+ monthly search volume)';
        } else if (avgVolume > 1000) {
          market.industrySize = 'Medium market (1k-10k monthly search volume)';
        } else if (avgVolume > 0) {
          market.industrySize = 'Niche market (<1k monthly search volume)';
        }
      }

      const suggestions = await getKeywordSuggestions([industry || productName].filter(Boolean));
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
    } catch (e) {
      market.warnings.push(`DataForSEO market research failed: ${e.message}`);
    }
  }

  // Phase 2: Try Tavily for market research
  try {
    const researchQuery = `${productName || industry} market size trends analysis regulations investment 2025 2026`;
    const tavilyResult = await researchCompetitors(productName || industry, industry || 'technology', 'market');
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

  // Phase 3: Infer growth rate from trends data
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

  // Phase 4: Infer investment trends
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

  // Deduplicate trends
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
