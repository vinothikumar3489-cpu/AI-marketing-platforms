/**
 * Enterprise Provider Fallback Service
 * 
 * Implements intelligent cascading fallback for SEO and research providers.
 * Every fallback preserves confidence scores and data quality markers.
 * 
 * FALLBACK PRIORITY:
 * 1. DataForSEO (Primary - verified data)
 * 2. SerpAPI (Secondary - verified data)
 * 3. Tavily (Tertiary - research-grade data)
 * 4. Jina (Quaternary - extraction-grade data)
 * 5. Firecrawl (Quinary - scraping-grade data)
 * 6. Website extraction (Senary - basic extraction)
 * 7. AI reasoning (Last resort - inferred data)
 */

import { 
  DataSource, 
  ConfidenceLevel, 
  markDataQuality, 
  gracefulDegrade 
} from '../../utils/data-quality.util.js';

import { 
  getKeywordMetrics, 
  getKeywordIdeaMetrics, 
  isDataForSEOConfigured 
} from '../dataforseo.service.js';

import { 
  getSerpCompetitors, 
  normalizeSerpCompetitors 
} from '../dataforseo.service.js';

import { 
  researchCompetitors, 
  researchCompany 
} from '../tavily.service.js';

import { scrapeWebsite } from '../../domains/research/services/scraper.service.js';

import { callAI } from '../../ai/services/aiRouter.service.js';

/**
 * Provider priority configuration
 */
const PROVIDER_PRIORITY = {
  DATAFORSEO: { priority: 1, name: 'DataForSEO', type: 'verified' },
  SERPAPI: { priority: 2, name: 'SerpAPI', type: 'verified' },
  TAVILY: { priority: 3, name: 'Tavily', type: 'research' },
  JINA: { priority: 4, name: 'Jina', type: 'extraction' },
  FIRECRAWL: { priority: 5, name: 'Firecrawl', type: 'scraping' },
  WEBSITE_EXTRACTION: { priority: 6, name: 'Website Extraction', type: 'basic' },
  AI_REASONING: { priority: 7, name: 'AI Reasoning', type: 'inferred' }
};

/**
 * Fallback result structure
 */
class FallbackResult {
  constructor(success, data, provider, confidence, metadata = {}) {
    this.success = success;
    this.data = data;
    this.provider = provider;
    this.confidence = confidence;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Keyword Research with Intelligent Fallback
 */
export async function getKeywordsWithFallback(keywords, location = 'United States', language = 'English') {
  const results = [];
  const fallbackChain = [];

  // Priority 1: DataForSEO
  if (isDataForSEOConfigured()) {
    try {
      console.log('🔍 [Provider Fallback] Trying DataForSEO for keyword research...');
      const dataforseoResult = await getKeywordIdeaMetrics(keywords, location, language);
      
      if (dataforseoResult.success && dataforseoResult.data) {
        const enriched = dataforseoResult.data.map(kw => markDataQuality(
          kw,
          DataSource.VERIFIED,
          ConfidenceLevel.HIGH,
          { provider: 'DataForSEO', method: 'labs_keyword_ideas' }
        ));
        fallbackChain.push({ provider: 'DataForSEO', success: true, confidence: ConfidenceLevel.HIGH });
        return new FallbackResult(true, enriched, 'DataForSEO', ConfidenceLevel.HIGH, {
          fallbackChain,
          qualityScore: 100
        });
      }
      fallbackChain.push({ provider: 'DataForSEO', success: false, reason: dataforseoResult.error });
    } catch (error) {
      console.warn('⚠️ [Provider Fallback] DataForSEO failed:', error.message);
      fallbackChain.push({ provider: 'DataForSEO', success: false, reason: error.message });
    }
  }

  // Priority 2: SerpAPI (if configured)
  // Note: SerpAPI integration would go here
  
  // Priority 3: Tavily
  try {
    console.log('🔍 [Provider Fallback] Trying Tavily for keyword research...');
    // Tavily doesn't directly support keyword metrics, skip to AI
    fallbackChain.push({ provider: 'Tavily', success: false, reason: 'Not applicable for keyword metrics' });
  } catch (error) {
    fallbackChain.push({ provider: 'Tavily', success: false, reason: error.message });
  }

  // Priority 4-6: Jina, Firecrawl, Website Extraction
  // These don't provide keyword metrics directly, skip to AI

  // Priority 7: AI Reasoning (last resort)
  try {
    console.log('🤖 [Provider Fallback] Using AI reasoning for keyword estimation...');
    const aiResult = await estimateKeywordsWithAI(keywords);
    
    if (aiResult.success && aiResult.data) {
      const enriched = aiResult.data.map(kw => markDataQuality(
        kw,
          DataSource.ESTIMATED,
          ConfidenceLevel.MEDIUM,
        { provider: 'AI', method: 'ai_keyword_estimation', reason: 'all_providers_failed' }
      ));
      fallbackChain.push({ provider: 'AI Reasoning', success: true, confidence: ConfidenceLevel.MEDIUM });
      return new FallbackResult(true, enriched, 'AI Reasoning', ConfidenceLevel.MEDIUM, {
        fallbackChain,
        qualityScore: 60,
        warning: 'Keywords estimated by AI - no verified data available'
      });
    }
  } catch (error) {
    console.error('❌ [Provider Fallback] AI reasoning failed:', error.message);
    fallbackChain.push({ provider: 'AI Reasoning', success: false, reason: error.message });
  }

  // All providers failed
  return new FallbackResult(false, [], 'None', ConfidenceLevel.UNKNOWN, {
    fallbackChain,
    error: 'All keyword research providers failed'
  });
}

/**
 * Competitor Research with Intelligent Fallback
 */
export async function getCompetitorsWithFallback(domain, location = 'United States') {
  const fallbackChain = [];

  // Priority 1: DataForSEO
  if (isDataForSEOConfigured()) {
    try {
      console.log('🔍 [Provider Fallback] Trying DataForSEO for competitor research...');
      const dataforseoResult = await getSerpCompetitors(domain, location);
      
      if (dataforseoResult.success && dataforseoResult.data) {
        const enriched = dataforseoResult.data.map(comp => markDataQuality(
          comp,
          DataSource.VERIFIED,
          ConfidenceLevel.HIGH,
          { provider: 'DataForSEO', method: 'serp_competitors' }
        ));
        fallbackChain.push({ provider: 'DataForSEO', success: true, confidence: ConfidenceLevel.HIGH });
        return new FallbackResult(true, enriched, 'DataForSEO', ConfidenceLevel.HIGH, {
          fallbackChain,
          qualityScore: 100
        });
      }
      fallbackChain.push({ provider: 'DataForSEO', success: false, reason: dataforseoResult.error });
    } catch (error) {
      console.warn('⚠️ [Provider Fallback] DataForSEO failed:', error.message);
      fallbackChain.push({ provider: 'DataForSEO', success: false, reason: error.message });
    }
  }

  // Priority 2: SerpAPI (if configured)
  // Note: SerpAPI integration would go here

  // Priority 3: Tavily
  try {
    console.log('🔍 [Provider Fallback] Trying Tavily for competitor research...');
    const tavilyResult = await researchCompetitors(domain);
    
    if (tavilyResult && Array.isArray(tavilyResult) && tavilyResult.length > 0) {
      const enriched = tavilyResult.map(comp => markDataQuality(
        comp,
          DataSource.VERIFIED,
          ConfidenceLevel.MEDIUM,
        { provider: 'Tavily', method: 'competitor_research' }
      ));
      fallbackChain.push({ provider: 'Tavily', success: true, confidence: ConfidenceLevel.MEDIUM });
      return new FallbackResult(true, enriched, 'Tavily', ConfidenceLevel.MEDIUM, {
        fallbackChain,
        qualityScore: 70
      });
    }
    fallbackChain.push({ provider: 'Tavily', success: false, reason: 'No competitors found' });
  } catch (error) {
    console.warn('⚠️ [Provider Fallback] Tavily failed:', error.message);
    fallbackChain.push({ provider: 'Tavily', success: false, reason: error.message });
  }

  // Priority 4-6: Jina, Firecrawl, Website Extraction
  try {
    console.log('🔍 [Provider Fallback] Trying website extraction for competitor research...');
    const scrapeResult = await scrapeWebsite(`https://${domain}`);
    
    if (scrapeResult && scrapeResult.content) {
      // Extract competitors from website content using AI
      const aiCompetitors = await extractCompetitorsFromContent(scrapeResult.content, domain);
      
      if (aiCompetitors && aiCompetitors.length > 0) {
        const enriched = aiCompetitors.map(comp => markDataQuality(
          comp,
          DataSource.ESTIMATED,
          ConfidenceLevel.LOW,
          { provider: 'Website Extraction', method: 'content_analysis' }
        ));
        fallbackChain.push({ provider: 'Website Extraction', success: true, confidence: ConfidenceLevel.LOW });
        return new FallbackResult(true, enriched, 'Website Extraction', ConfidenceLevel.LOW, {
          fallbackChain,
          qualityScore: 40
        });
      }
    }
    fallbackChain.push({ provider: 'Website Extraction', success: false, reason: 'No competitors extracted' });
  } catch (error) {
    console.warn('⚠️ [Provider Fallback] Website extraction failed:', error.message);
    fallbackChain.push({ provider: 'Website Extraction', success: false, reason: error.message });
  }

  // Priority 7: AI Reasoning (last resort)
  try {
    console.log('🤖 [Provider Fallback] Using AI reasoning for competitor estimation...');
    const aiResult = await estimateCompetitorsWithAI(domain);
    
    if (aiResult.success && aiResult.data) {
      const enriched = aiResult.data.map(comp => markDataQuality(
        comp,
          DataSource.AI_INFERRED,
          ConfidenceLevel.VERY_LOW,
        { provider: 'AI', method: 'ai_competitor_estimation', reason: 'all_providers_failed' }
      ));
      fallbackChain.push({ provider: 'AI Reasoning', success: true, confidence: ConfidenceLevel.VERY_LOW });
      return new FallbackResult(true, enriched, 'AI Reasoning', ConfidenceLevel.VERY_LOW, {
        fallbackChain,
        qualityScore: 20,
        warning: 'Competitors estimated by AI - no verified data available'
      });
    }
  } catch (error) {
    console.error('❌ [Provider Fallback] AI reasoning failed:', error.message);
    fallbackChain.push({ provider: 'AI Reasoning', success: false, reason: error.message });
  }

  // All providers failed
  return new FallbackResult(false, [], 'None', ConfidenceLevel.UNKNOWN, {
    fallbackChain,
    error: 'All competitor research providers failed'
  });
}

/**
 * SERP Analysis with Intelligent Fallback
 */
export async function getSerpAnalysisWithFallback(keyword, location = 'United States') {
  const fallbackChain = [];

  // Priority 1: DataForSEO
  if (isDataForSEOConfigured()) {
    try {
      console.log('🔍 [Provider Fallback] Trying DataForSEO for SERP analysis...');
      // DataForSEO SERP API call would go here
      fallbackChain.push({ provider: 'DataForSEO', success: false, reason: 'SERP endpoint not implemented' });
    } catch (error) {
      fallbackChain.push({ provider: 'DataForSEO', success: false, reason: error.message });
    }
  }

  // Priority 2: SerpAPI (if configured)
  // Note: SerpAPI integration would go here

  // Priority 3: Tavily
  try {
    console.log('🔍 [Provider Fallback] Trying Tavily for SERP analysis...');
    // Tavily search would go here
    fallbackChain.push({ provider: 'Tavily', success: false, reason: 'SERP analysis not available' });
  } catch (error) {
    fallbackChain.push({ provider: 'Tavily', success: false, reason: error.message });
  }

  // Priority 7: AI Reasoning (last resort)
  try {
    console.log('🤖 [Provider Fallback] Using AI reasoning for SERP estimation...');
    const aiResult = await estimateSerpWithAI(keyword);
    
    if (aiResult.success && aiResult.data) {
      const enriched = markDataQuality(
        aiResult.data,
        DataSource.AI_INFERRED,
        ConfidenceLevel.LOW,
        { provider: 'AI', method: 'ai_serp_estimation', reason: 'all_providers_failed' }
      );
      fallbackChain.push({ provider: 'AI Reasoning', success: true, confidence: ConfidenceLevel.LOW });
      return new FallbackResult(true, enriched, 'AI Reasoning', ConfidenceLevel.LOW, {
        fallbackChain,
        qualityScore: 30,
        warning: 'SERP estimated by AI - no verified data available'
      });
    }
  } catch (error) {
    console.error('❌ [Provider Fallback] AI reasoning failed:', error.message);
    fallbackChain.push({ provider: 'AI Reasoning', success: false, reason: error.message });
  }

  // All providers failed
  return new FallbackResult(false, null, 'None', ConfidenceLevel.UNKNOWN, {
    fallbackChain,
    error: 'All SERP analysis providers failed'
  });
}

// ============================================
// AI ESTIMATION HELPERS
// ============================================

async function estimateKeywordsWithAI(keywords) {
  try {
    const uniqueKeywords = [...new Set(keywords)].slice(0, 30);
    const prompt = `You are a senior SEO data analyst. Estimate realistic US Google search metrics for these keywords.

Keywords: ${uniqueKeywords.map(k => `"${k}"`).join(', ')}

Return ONLY compact JSON:
{"keywords":[{"keyword":"exact keyword as given","volume":1234,"difficulty":45,"cpc":2.10,"intent":"informational|commercial|transactional|navigational"}]}

Rules:
- volume: 0 to 1,000,000 (honest estimate; niche long-tails should be small, e.g. 10-300)
- difficulty: 0-100
- cpc: 0-50 (US$)
- intent: one of informational, commercial, transactional, navigational
- Must return an entry for EVERY keyword. Never null, never -1.`;

    const result = await callAI(prompt, 4000);
    if (result.success && result.data?.keywords) {
      return new FallbackResult(true, result.data.keywords, 'AI', ConfidenceLevel.MEDIUM);
    }
  } catch (error) {
    console.error('[AI Estimation] Keyword estimation failed:', error.message);
  }
  return new FallbackResult(false, [], 'AI', ConfidenceLevel.UNKNOWN);
}

async function extractCompetitorsFromContent(content, domain) {
  try {
    const prompt = `You are a competitive intelligence analyst. Extract competitor companies from this website content.

Domain: ${domain}

Content: ${content.substring(0, 10000)}

Return ONLY compact JSON:
{"competitors":[{"name":"company name","website":"example.com","description":"brief description","reason":"why they are a competitor"}]}

Rules:
- Extract 3-5 direct competitors
- Include their website if mentioned
- Explain why they are competitors
- Return empty array if no competitors found`;

    const result = await callAI(prompt, 4000);
    if (result.success && result.data?.competitors) {
      return new FallbackResult(true, result.data.competitors, 'AI', ConfidenceLevel.LOW);
    }
  } catch (error) {
    console.error('[AI Estimation] Competitor extraction failed:', error.message);
  }
  return new FallbackResult(false, [], 'AI', ConfidenceLevel.UNKNOWN);
}

async function estimateCompetitorsWithAI(domain) {
  try {
    const prompt = `You are a competitive intelligence analyst. Estimate likely competitors for this domain.

Domain: ${domain}

Return ONLY compact JSON:
{"competitors":[{"name":"company name","website":"example.com","description":"brief description","estimatedAuthority":75}]}

Rules:
- Estimate 3-5 likely competitors based on the domain
- Authority: 0-100 estimate
- These are ESTIMATES - mark as low confidence`;

    const result = await callAI(prompt, 4000);
    if (result.success && result.data?.competitors) {
      return new FallbackResult(true, result.data.competitors, 'AI', ConfidenceLevel.VERY_LOW);
    }
  } catch (error) {
    console.error('[AI Estimation] Competitor estimation failed:', error.message);
  }
  return new FallbackResult(false, [], 'AI', ConfidenceLevel.UNKNOWN);
}

async function estimateSerpWithAI(keyword) {
  try {
    const prompt = `You are an SEO analyst. Estimate SERP features for this keyword.

Keyword: ${keyword}

Return ONLY compact JSON:
{"serpFeatures":[{"feature":"featured_snippet","likelihood":75},{"feature":"people_also_ask","likelihood":60}],"topIntent":"informational","difficulty":45}

Rules:
- Estimate likelihood of common SERP features (0-100)
- Determine primary search intent
- Estimate keyword difficulty (0-100)`;

    const result = await callAI(prompt, 4000);
    if (result.success && result.data) {
      return new FallbackResult(true, result.data, 'AI', ConfidenceLevel.LOW);
    }
  } catch (error) {
    console.error('[AI Estimation] SERP estimation failed:', error.message);
  }
  return new FallbackResult(false, null, 'AI', ConfidenceLevel.UNKNOWN);
}

/**
 * Get provider health status
 */
export function getProviderHealth() {
  return {
    dataforseo: {
      configured: isDataForSEOConfigured(),
      status: isDataForSEOConfigured() ? 'available' : 'not_configured'
    },
    serpapi: {
      configured: !!process.env.SERPAPI_KEY,
      status: !!process.env.SERPAPI_KEY ? 'available' : 'not_configured'
    },
    tavily: {
      configured: !!process.env.TAVILY_API_KEY,
      status: !!process.env.TAVILY_API_KEY ? 'available' : 'not_configured'
    },
    jina: {
      configured: !!process.env.JINA_API_KEY,
      status: !!process.env.JINA_API_KEY ? 'available' : 'not_configured'
    },
    firecrawl: {
      configured: !!process.env.FIRECRAWL_API_KEY,
      status: !!process.env.FIRECRAWL_API_KEY ? 'available' : 'not_configured'
    },
    ai: {
      configured: !!process.env.GROQ_API_KEY || !!process.env.GEMINI_API_KEY,
      status: !!process.env.GROQ_API_KEY || !!process.env.GEMINI_API_KEY ? 'available' : 'not_configured'
    }
  };
}

export default {
  getKeywordsWithFallback,
  getCompetitorsWithFallback,
  getSerpAnalysisWithFallback,
  getProviderHealth,
  PROVIDER_PRIORITY
};
