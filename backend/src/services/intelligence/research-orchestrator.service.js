/**
 * Research Orchestrator Service
 * Collects verified research data once for reuse by Growth Workspace and SEO Intelligence
 * Uses available APIs in priority order, never invents data
 */

import { scrapeWebsite } from '../scraping/unified-scraper.service.js';
import { getDesktopAndMobilePageSpeed } from '../pagespeed.service.js';
import { getSerpCompetitors } from '../dataforseo.service.js';
import { researchCompetitors } from '../tavily.service.js';
import { sanitizeText } from '../../utils/text.util.js';

/**
 * Collect comprehensive research data for a website/product
 * @param {Object} params - { websiteUrl, productName, companyName }
 * @returns {Promise<Object>} Normalized research data
 */
export async function collectResearchData({ websiteUrl, productName, companyName }) {
  const sources = [];
  const warnings = [];
  const result = {
    identity: {
      websiteUrl,
      productName: productName || '',
      companyName: companyName || '',
      domain: extractDomain(websiteUrl)
    },
    websiteContent: null,
    technical: null,
    keywords: [],
    competitors: [],
    serpResults: [],
    trends: [],
    technologyStack: [],
    companySignals: [],
    newsSignals: [],
    marketSignals: [],
    sources,
    warnings
  };

  try {
    // Phase 1: Website Scraping
    console.log('[Research Orchestrator] Starting website scraping for:', websiteUrl);
    const scrapedContent = await scrapeWebsiteOrchestrator(websiteUrl);
    if (scrapedContent) {
      result.websiteContent = scrapedContent;
      sources.push({ type: 'website_scrape', source: scrapedContent.source, success: true });
    } else {
      warnings.push('Website scraping failed - no content retrieved');
      sources.push({ type: 'website_scrape', success: false, error: 'No content retrieved' });
    }

    // Phase 2: Technical Audit (PageSpeed - both mobile and desktop)
    console.log('[Research Orchestrator] Running PageSpeed audit for:', websiteUrl);
    const pageSpeedResult = await getDesktopAndMobilePageSpeed(websiteUrl);
    if (pageSpeedResult && pageSpeedResult.success) {
      result.technical = normalizeTechnicalAudit(pageSpeedResult);
      sources.push({ type: 'pagespeed', success: true });
    } else {
      warnings.push('PageSpeed audit failed - API key may be missing');
      sources.push({ type: 'pagespeed', success: false });
    }
    console.log('[Research Orchestrator] Continuing after PageSpeed');

    // Phase 3: SERP / Competitor Discovery
    console.log('[Research Orchestrator] Running SERP search for:', websiteUrl);
    const serpData = await performSerpSearch(websiteUrl, productName);
    if (serpData.competitors.length > 0) {
      result.competitors = serpData.competitors;
      result.serpResults = serpData.serpResults;
      sources.push({ type: 'serp', source: serpData.source, success: true, competitorsFound: serpData.competitors.length });
    } else {
      warnings.push('No competitors found from SERP');
      sources.push({ type: 'serp', success: false, error: 'No competitors found' });
    }

    // Phase 4: Keyword Research (if we have website content or competitors)
    if (result.websiteContent || result.competitors.length > 0) {
      console.log('[Research Orchestrator] Collecting keyword data');
      const keywordData = await collectKeywords(websiteUrl, result.websiteContent, result.competitors);
      if (keywordData.length > 0) {
        result.keywords = keywordData;
        sources.push({ type: 'keywords', success: true, count: keywordData.length });
      } else {
        warnings.push('No keywords collected');
        sources.push({ type: 'keywords', success: false });
      }
    }

    // Phase 5: Market/Company Signals
    console.log('[Research Orchestrator] Collecting market signals');
    const marketData = await collectMarketSignals(websiteUrl, companyName);
    if (marketData.news.length > 0 || marketData.companies.length > 0) {
      result.newsSignals = marketData.news;
      result.companySignals = marketData.companies;
      result.marketSignals = marketData.market;
      sources.push({ type: 'market_signals', success: true });
    } else {
      warnings.push('No market signals collected');
      sources.push({ type: 'market_signals', success: false });
    }

    console.log('[Research Orchestrator] Research collection complete:', {
      hasWebsite: !!result.websiteContent,
      hasTechnical: !!result.technical,
      competitorsCount: result.competitors.length,
      keywordsCount: result.keywords.length,
      newsCount: result.newsSignals.length,
      warningsCount: warnings.length
    });
    
    // ==== DEBUG: Print detailed research output ====
    console.log('===== RESEARCH ORCHESTRATOR OUTPUT =====');
    console.log('website:', result.websiteContent ? '✓ (title: ' + (result.websiteContent.title || result.websiteContent.metadata?.title || 'N/A') + ')' : '✗ null');
    console.log('technical:', result.technical ? '✓ (performanceScore: ' + result.technical.performanceScore + ')' : '✗ null');
    console.log('keywords:', result.keywords.length, result.keywords.length > 0 ? '(first: ' + result.keywords[0].keyword + ')' : '(empty array)');
    console.log('competitors:', result.competitors.length, result.competitors.length > 0 ? '(first: ' + (result.competitors[0].name || result.competitors[0].domain) + ')' : '(empty array)');
    console.log('serpResults:', result.serpResults.length);
    console.log('trends:', result.trends.length);
    console.log('technologyStack:', result.technologyStack.length);
    console.log('sources used:', result.sources.filter(s => s.success).map(s => s.type));
    console.log('sources failed:', result.sources.filter(s => !s.success).map(s => s.type));
    console.log('===== END RESEARCH ORCHESTRATOR OUTPUT =====');

    // Add canonical return structure
    result.fallbackSourcesUsed = sources.filter(s => s.success && s.source).map(s => s.source);
    result.unavailableSources = sources.filter(s => !s.success).map(s => s.type);

    return result;
  } catch (error) {
    console.error('[Research Orchestrator] Error collecting research:', error);
    warnings.push(`Research collection error: ${error.message}`);
    return result;
  }
}

/**
 * Scrape website using available APIs in priority order
 */
async function scrapeWebsiteOrchestrator(url) {
  // Priority: unified scraper
  try {
    console.log(`[Research Orchestrator] Trying unified scraper`);
    const result = await scrapeWebsite(url, {
      timeout: 30000,
      extractSchema: true,
      extractImages: true,
      extractLinks: true
    });
    if (result && result.success && result.data) {
      return {
        ...result.data,
        source: 'unified_scraper'
      };
    }
  } catch (error) {
    console.warn(`[Research Orchestrator] Unified scraper failed:`, error.message);
  }

  // Fallback: Basic fetch with timeout
  try {
    console.log('[Research Orchestrator] Trying basic fetch fallback');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const html = await response.text();
      return {
        html,
        text: extractTextFromHtml(html),
        source: 'basic_fetch'
      };
    }
  } catch (error) {
    console.warn('[Research Orchestrator] Basic fetch failed:', error.message);
  }

  return null;
}

/**
 * Perform SERP search for competitors
 */
async function performSerpSearch(url, productName) {
  const competitors = [];
  const serpResults = [];
  let source = 'unknown';

  try {
    // Try DataForSEO first using product name as keyword
    const keywords = [productName || extractDomain(url)];
    const serpResult = await getSerpCompetitors(keywords);
    if (serpResult && serpResult.success && serpResult.data && serpResult.data.length > 0) {
      source = 'dataforseo';
      serpResult.data.forEach(item => {
        const domain = extractDomain(item.url);
        if (domain && !domain.includes(extractDomain(url))) {
          competitors.push({
            name: item.title || domain,
            domain,
            url: item.url,
            snippet: item.description || '',
            source: 'dataforseo_serp'
          });
          serpResults.push(item);
        }
      });
    }
  } catch (error) {
    console.warn('[Research Orchestrator] DataForSEO SERP failed:', error.message);
  }

  // Fallback to Tavily if no competitors found
  if (competitors.length === 0) {
    try {
      const tavilyResult = await researchCompetitors(productName || extractDomain(url), 'technology', 'software');
      if (tavilyResult && tavilyResult.success && tavilyResult.competitors) {
        source = 'tavily';
        tavilyResult.competitors.forEach(comp => {
          const domain = extractDomain(comp.website || comp.url);
          if (domain && !domain.includes(extractDomain(url))) {
            competitors.push({
              name: comp.name || domain,
              domain,
              url: comp.website || comp.url,
              snippet: comp.description || '',
              source: 'tavily'
            });
            serpResults.push(comp);
          }
        });
      }
    } catch (error) {
      console.warn('[Research Orchestrator] Tavily search failed:', error.message);
    }
  }

  // Fallback to AI-estimated if still no competitors
  if (competitors.length === 0) {
    console.warn('[Research Orchestrator] No competitors found from APIs, using AI-estimated fallback');
    source = 'ai_estimated';
    // Return empty array - let competitor service handle AI estimation
  }

  // Filter competitors by relevance to product category
  const filteredCompetitors = filterCompetitorsByCategory(competitors, productName || extractDomain(url));

  return { competitors: filteredCompetitors, serpResults, source };
}

/**
 * Filter competitors by product category to avoid irrelevant results
 */
function filterCompetitorsByCategory(competitors, productName) {
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return [];
  }

  // Define category-specific competitor patterns
  const categoryPatterns = {
    'presentation': ['canva', 'beautiful.ai', 'tome', 'plus ai', 'presentations.ai', 'pitch', 'slidesai', 'powerpoint', 'google slides', 'prezi', 'slides'],
    'design': ['canva', 'figma', 'sketch', 'adobe', 'invision', 'figjam', 'mural', 'miro'],
    'ai': ['chatgpt', 'claude', 'gemini', 'copilot', 'openai', 'anthropic', 'google ai'],
    'marketing': ['hubspot', 'mailchimp', 'marketo', 'salesforce', 'pardot', 'activecampaign'],
    'default': []
  };

  // Determine product category from name
  const lowerProductName = productName.toLowerCase();
  let category = 'default';
  
  if (lowerProductName.includes('presentation') || lowerProductName.includes('slide') || lowerProductName.includes('deck')) {
    category = 'presentation';
  } else if (lowerProductName.includes('design') || lowerProductName.includes('figma') || lowerProductName.includes('ui')) {
    category = 'design';
  } else if (lowerProductName.includes('ai') && !lowerProductName.includes('presentation')) {
    category = 'ai';
  } else if (lowerProductName.includes('marketing') || lowerProductName.includes('campaign')) {
    category = 'marketing';
  }

  const patterns = categoryPatterns[category] || categoryPatterns.default;

  // If no specific patterns, return all competitors
  if (patterns.length === 0) {
    return competitors;
  }

  // Filter competitors that match category patterns
  const filtered = competitors.filter(comp => {
    const lowerName = comp.name.toLowerCase();
    const lowerDomain = comp.domain.toLowerCase();
    const lowerSnippet = comp.snippet.toLowerCase();

    // Check if competitor matches any pattern
    const matchesCategory = patterns.some(pattern => 
      lowerName.includes(pattern) || 
      lowerDomain.includes(pattern) ||
      lowerSnippet.includes(pattern)
    );

    // Also reject known irrelevant competitors
    const irrelevantKeywords = ['h2o.ai', 'datarobot', 'google cloud ai', 'ml platform', 'machine learning platform', 'data science'];
    const isIrrelevant = irrelevantKeywords.some(keyword => 
      lowerName.includes(keyword) || 
      lowerDomain.includes(keyword) ||
      lowerSnippet.includes(keyword)
    );

    return matchesCategory && !isIrrelevant;
  });

  // If filtering removes all competitors, return original but flag as unfiltered
  if (filtered.length === 0) {
    console.warn('[Research Orchestrator] Category filtering removed all competitors, returning unfiltered results');
    return competitors;
  }

  console.log(`[Research Orchestrator] Filtered ${competitors.length} competitors to ${filtered.length} for category: ${category}`);
  return filtered;
}

/**
 * Collect keyword data
 */
async function collectKeywords(url, websiteContent, competitors) {
  const keywords = [];
  
  // Extract potential keywords from website content
  if (websiteContent && websiteContent.text) {
    const text = websiteContent.text.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Get top frequent words as potential keywords
    Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([word, freq]) => {
        if (!isStopWord(word)) {
          keywords.push({
            keyword: word,
            volume: null, // Will be filled by API if available
            cpc: null,
            difficulty: null,
            source: 'website_content',
            confidence: Math.min(freq * 5, 50) // Low confidence from content alone
          });
        }
      });
  }

  // Extract competitor domains as potential keywords
  competitors.forEach(comp => {
    if (comp.name && !keywords.find(k => k.keyword === comp.name.toLowerCase())) {
      keywords.push({
        keyword: comp.name.toLowerCase(),
        volume: null,
        cpc: null,
        difficulty: null,
        source: 'competitor_name',
        confidence: 30
      });
    }
  });

  return keywords;
}

/**
 * Collect market signals (news, company info)
 */
async function collectMarketSignals(url, companyName) {
  const news = [];
  const companies = [];
  const market = [];

  try {
    // Use Tavily for news search
    const query = companyName || extractDomain(url);
    const tavilyResult = await researchCompetitors(query, 'technology', 'software');
    if (tavilyResult && tavilyResult.success && tavilyResult.marketSignals) {
      tavilyResult.marketSignals.forEach(signal => {
        news.push({
          title: signal.title || signal.topic,
          url: signal.url || '',
          publishedDate: signal.date || '',
          snippet: signal.description || signal.summary,
          source: 'tavily_news'
        });
      });
    }
  } catch (error) {
    console.warn('[Research Orchestrator] News search failed:', error.message);
  }

  return { news, companies, market };
}

/**
 * Normalize PageSpeed audit data from getDesktopAndMobilePageSpeed
 */
function normalizeTechnicalAudit(result) {
  if (!result || !result.success) return null;

  const mobileData = result.data?.mobile || null;
  const desktopData = result.data?.desktop || null;

  if (!mobileData && !desktopData) return null;

  const mobileScores = mobileData?.lighthouseScores || {};
  const desktopScores = desktopData?.lighthouseScores || {};

  const mobilePerf = mobileScores.performance ?? null;
  const desktopPerf = desktopScores.performance ?? null;

  const mobileSeo = mobileScores.seo ?? null;
  const desktopSeo = desktopScores.seo ?? null;

  const mobileA11y = mobileScores.accessibility ?? null;
  const desktopA11y = desktopScores.accessibility ?? null;

  const mobileBP = mobileScores.bestPractices ?? null;
  const desktopBP = desktopScores.bestPractices ?? null;

  // Average mobile + desktop where both exist
  const avg = (a, b) => (a !== null && b !== null) ? Math.round((a + b) / 2) : (a !== null ? a : b);

  return {
    performanceScore: avg(mobilePerf, desktopPerf),
    seoScore: avg(mobileSeo, desktopSeo),
    accessibilityScore: avg(mobileA11y, desktopA11y),
    bestPracticesScore: avg(mobileBP, desktopBP),
    mobileScore: mobilePerf,
    desktopScore: desktopPerf,
    auditData: {
      performanceScore: avg(mobilePerf, desktopPerf),
      seoScore: avg(mobileSeo, desktopSeo),
      accessibilityScore: avg(mobileA11y, desktopA11y),
      bestPracticesScore: avg(mobileBP, desktopBP),
      mobileScore: mobilePerf,
      desktopScore: desktopPerf,
      pageSpeed: {
        mobile: mobileData,
        desktop: desktopData
      }
    },
    source: 'pagespeed_api'
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Extract text from HTML
 */
function extractTextFromHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if word is a stop word
 */
function isStopWord(word) {
  const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'with', 'this', 'that', 'from', 'they', 'will', 'have', 'been', 'more', 'when', 'into', 'some', 'than', 'them', 'very', 'just', 'over', 'such', 'your', 'about', 'would', 'which', 'their', 'said', 'each', 'she', 'does', 'both', 'after', 'also', 'were', 'many', 'before', 'through', 'being', 'under', 'while', 'should', 'where', 'because', 'does', 'other', 'those', 'been', 'could', 'first', 'like', 'most', 'then', 'than', 'only', 'come', 'its', 'who', 'now', 'make', 'time', 'made'];
  return stopWords.includes(word.toLowerCase());
}
