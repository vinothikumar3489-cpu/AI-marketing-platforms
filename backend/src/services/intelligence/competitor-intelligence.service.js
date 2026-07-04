import { researchCompetitors } from '../tavily.service.js';
import { getSerpCompetitors, normalizeSerpCompetitors, getKeywordMetrics, isDataForSEOConfigured } from '../dataforseo.service.js';

export async function collectCompetitorIntelligence({ websiteUrl, productName, companyName, industry, marketData }) {
  const competitors = [];
  const sources = [];
  const warnings = [];
  const domain = extractDomain(websiteUrl);

  // Phase 1: SERP-based competitors via DataForSEO
  if (isDataForSEOConfigured()) {
    try {
      const searchTerms = [
        productName,
        companyName,
        `${industry} software`,
        `${industry} platform`,
        `${industry} tools`
      ].filter(Boolean);

      const serpResult = await getSerpCompetitors(searchTerms);
      if (serpResult?.success && serpResult?.data?.length > 0) {
        const identity = { domain, industry, productName };
        const serpCompetitors = normalizeSerpCompetitors(serpResult.data, identity);
        const filtered = serpCompetitors.filter(c =>
          c.domain !== domain &&
          c.relevanceScore >= 40
        );
        for (const comp of filtered) {
          competitors.push({
            name: comp.name,
            domain: comp.domain,
            url: comp.url,
            type: comp.competitorType === 'directBusinessCompetitor' ? 'direct' : 'serp',
            similarityScore: comp.relevanceScore,
            featureOverlap: null,
            pricingOverlap: null,
            trafficEstimate: null,
            evidence: comp.evidence,
            source: 'DataForSEO_SERP',
            snippet: comp.snippet || '',
            confidence: comp.confidence
          });
        }
        sources.push({ type: 'competitor_serp', source: 'DataForSEO', count: filtered.length });
      }
    } catch (e) {
      warnings.push(`DataForSEO competitor search failed: ${e.message}`);
    }
  }

  // Phase 2: Tavily competitor research
  try {
    const tavilyResult = await researchCompetitors(productName || companyName || domain, industry || 'technology', 'software');
    if (tavilyResult?.success && tavilyResult?.competitors?.length > 0) {
      for (const comp of tavilyResult.competitors) {
        const compDomain = extractDomain(comp.website || comp.url || '');
        if (compDomain && compDomain !== domain && !competitors.find(c => c.domain === compDomain)) {
          competitors.push({
            name: comp.name || compDomain,
            domain: compDomain,
            url: comp.website || comp.url || '',
            type: 'direct',
            similarityScore: 70,
            featureOverlap: null,
            pricingOverlap: null,
            trafficEstimate: null,
            evidence: comp.description || 'Identified via Tavily competitive research',
            source: 'Tavily',
            snippet: comp.description || '',
            confidence: 60
          });
        }
      }
      sources.push({ type: 'competitor_tavily', source: 'Tavily', count: tavilyResult.competitors.length });
    }
  } catch (e) {
    warnings.push(`Tavily competitor research failed: ${e.message}`);
  }

  // Classify competitors
  for (const comp of competitors) {
    if (!comp.type || comp.type === 'serp') {
      if (comp.similarityScore >= 70) {
        comp.type = 'direct';
      } else if (comp.similarityScore >= 40) {
        comp.type = 'indirect';
      } else {
        comp.type = 'serp_listing';
      }
    }
  }

  // Categorize
  const result = {
    direct: competitors.filter(c => c.type === 'direct'),
    indirect: competitors.filter(c => c.type === 'indirect'),
    emerging: competitors.filter(c => c.type === 'emerging'),
    serp: competitors.filter(c => c.type === 'serp_listing'),
    all: competitors,
    sources,
    warnings
  };

  return result;
}

function extractDomain(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}
