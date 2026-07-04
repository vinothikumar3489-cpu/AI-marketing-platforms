/**
 * Evidence Collector
 * Wraps every data collection operation with consistent evidence metadata.
 * Every recommendation includes: source, confidence, collector, api, url, timestamp.
 * Never invents data — returns 'No verified data available' when APIs fail.
 */
import { scrapeWebsite } from '../scraping/unified-scraper.service.js';
import { getDesktopAndMobilePageSpeed } from '../pagespeed.service.js';
import { getSerpCompetitors, getKeywordMetrics, getKeywordSuggestions, getRelatedKeywords, normalizeSerpCompetitors, isDataForSEOConfigured } from '../dataforseo.service.js';
import { researchCompetitors } from '../tavily.service.js';
import { sanitizeText } from '../../utils/text.util.js';

const EVIDENCE_VERSION = '2.0.0';

export class EvidenceCollector {
  constructor(options = {}) {
    this.collectorId = `collector-${Date.now()}`;
    this.sources = [];
    this.warnings = [];
    this.websiteUrl = options.websiteUrl || '';
    this.productName = options.productName || '';
    this.companyName = options.companyName || '';
  }

  _evidence(source, api, confidence, data) {
    return {
      value: data,
      evidence: {
        source,
        api: api || source,
        confidence: Math.min(100, Math.max(0, confidence)),
        collectedAt: new Date().toISOString(),
        collector: `EvidenceCollector v${EVIDENCE_VERSION}`,
        url: this.websiteUrl,
        supported: true,
      }
    };
  }

  _noEvidence(reason = 'No verified data available', api = 'unknown') {
    return {
      value: null,
      evidence: {
        source: 'none',
        api,
        confidence: 0,
        collectedAt: new Date().toISOString(),
        collector: `EvidenceCollector v${EVIDENCE_VERSION}`,
        url: this.websiteUrl,
        supported: false,
        reason,
      }
    };
  }

  async collectWebsiteIntelligence() {
    try {
      const result = await scrapeWebsite(this.websiteUrl, {
        timeout: 30000,
        extractSchema: true,
        extractImages: true,
        extractLinks: true
      });
      if (result?.success && result?.data) {
        const data = result.data;
        this.sources.push({ type: 'website_scrape', provider: result.provider, success: true });
        return {
          technical: this._collectTechnicalSEO(data),
          content: this._collectContentStructure(data),
          structured: data.structured || {},
          social: data.content?.socialLinks || {},
          internalLinks: data.content?.internalLinks || [],
          externalLinks: data.content?.externalLinks || [],
          images: data.content?.images || [],
        };
      }
    } catch (e) {
      this.warnings.push(`Website scrape failed: ${e.message}`);
    }
    return null;
  }

  _collectTechnicalSEO(data) {
    const tech = data.technical || {};
    return {
      titleTag: this._evidence('html_title_tag', 'firecrawl_scrape', 100, tech.titleTag || ''),
      metaDescription: this._evidence('html_meta_description', 'firecrawl_scrape', 100, tech.metaDescription || ''),
      canonicalUrl: this._evidence('html_link_canonical', 'firecrawl_scrape', 100, tech.canonicalUrl || ''),
      robotsMeta: this._evidence('html_meta_robots', 'firecrawl_scrape', 100, tech.robotsMeta || ''),
      viewport: this._evidence('html_meta_viewport', 'firecrawl_scrape', 100, tech.viewport || ''),
      language: this._evidence('html_lang_attr', 'firecrawl_scrape', 100, tech.language || 'en'),
      openGraph: {
        title: this._evidence('html_meta_og_title', 'firecrawl_scrape', 100, tech.openGraph?.title || ''),
        description: this._evidence('html_meta_og_description', 'firecrawl_scrape', 100, tech.openGraph?.description || ''),
        image: this._evidence('html_meta_og_image', 'firecrawl_scrape', 100, tech.openGraph?.image || ''),
        url: this._evidence('html_meta_og_url', 'firecrawl_scrape', 100, tech.openGraph?.url || ''),
        type: this._evidence('html_meta_og_type', 'firecrawl_scrape', 100, tech.openGraph?.type || ''),
        siteName: this._evidence('html_meta_og_site_name', 'firecrawl_scrape', 100, tech.openGraph?.siteName || ''),
      },
      twitterCard: {
        card: this._evidence('html_meta_twitter_card', 'firecrawl_scrape', 100, tech.twitterCard?.card || ''),
        title: this._evidence('html_meta_twitter_title', 'firecrawl_scrape', 100, tech.twitterCard?.title || ''),
        description: this._evidence('html_meta_twitter_description', 'firecrawl_scrape', 100, tech.twitterCard?.description || ''),
        image: this._evidence('html_meta_twitter_image', 'firecrawl_scrape', 100, tech.twitterCard?.image || ''),
      },
    };
  }

  _collectContentStructure(data) {
    const content = data.content || {};
    return {
      headings: this._evidence('html_heading_structure', 'firecrawl_scrape', 100, content.headings || []),
      wordCount: this._evidence('html_text_word_count', 'firecrawl_scrape', 100, content.wordCount || 0),
      headingsCount: this._evidence('html_heading_count', 'firecrawl_scrape', 100, content.headings?.length || 0),
    };
  }

  async collectPageSpeedAudit() {
    try {
      const result = await getDesktopAndMobilePageSpeed(this.websiteUrl);
      if (result?.success) {
        this.sources.push({ type: 'pagespeed', success: true });
        return {
          mobile: result.data?.mobile ? {
            performance: this._evidence('lighthouse_performance_score', 'google_pagespeed_api', 100, result.data.mobile.lighthouseScores?.performance),
            seo: this._evidence('lighthouse_seo_score', 'google_pagespeed_api', 100, result.data.mobile.lighthouseScores?.seo),
            accessibility: this._evidence('lighthouse_accessibility_score', 'google_pagespeed_api', 100, result.data.mobile.lighthouseScores?.accessibility),
            bestPractices: this._evidence('lighthouse_best_practices_score', 'google_pagespeed_api', 100, result.data.mobile.lighthouseScores?.bestPractices),
            coreWebVitals: this._evidence('lighthouse_core_web_vitals', 'google_pagespeed_api', 100, result.data.mobile.coreWebVitals),
            opportunities: this._evidence('lighthouse_opportunities', 'google_pagespeed_api', 100, result.data.mobile.opportunities || []),
          } : null,
          desktop: result.data?.desktop ? {
            performance: this._evidence('lighthouse_performance_score', 'google_pagespeed_api', 100, result.data.desktop.lighthouseScores?.performance),
            seo: this._evidence('lighthouse_seo_score', 'google_pagespeed_api', 100, result.data.desktop.lighthouseScores?.seo),
            coreWebVitals: this._evidence('lighthouse_core_web_vitals', 'google_pagespeed_api', 100, result.data.desktop.coreWebVitals),
          } : null,
        };
      }
    } catch (e) {
      this.warnings.push(`PageSpeed audit failed: ${e.message}`);
    }
    this.sources.push({ type: 'pagespeed', success: false });
    return null;
  }

  async collectCompetitorIntelligence() {
    const domain = this._extractDomain(this.websiteUrl);
    const competitors = [];
    let serpResults = [];
    let serpSource = null;

    // Try DataForSEO SERP first
    if (isDataForSEOConfigured()) {
      try {
        const seedKeywords = [this.productName, this.companyName, domain].filter(Boolean);
        if (seedKeywords.length > 0) {
          const serpResult = await getSerpCompetitors(seedKeywords);
          if (serpResult?.success && serpResult?.data?.length > 0) {
            serpResults = serpResult.data;
            serpSource = 'DataForSEO_SERP';
            const normalized = normalizeSerpCompetitors(serpResult.data, {
              industry: '',
              productName: this.productName
            });
            normalized.forEach(c => {
              if (c.competitorType === 'directBusinessCompetitor' && c.relevanceScore >= 70) {
                competitors.push(this._evidence(
                  'serp_competitor_discovery',
                  'dataforseo_serp_api',
                  c.confidence,
                  {
                    name: c.name,
                    domain: c.domain,
                    type: c.competitorType,
                    relevanceScore: c.relevanceScore,
                    overlapReason: c.overlapReason,
                    snippet: c.snippet,
                    rank: c.rank,
                  }
                ));
              }
            });
            this.sources.push({ type: 'serp', source: 'DataForSEO', success: true, count: competitors.length });
          }
        }
      } catch (e) {
        this.warnings.push(`DataForSEO SERP failed: ${e.message}`);
      }
    }

    // Try Tavily as fallback
    if (competitors.length === 0) {
      try {
        const tavilyResult = await researchCompetitors(this.productName, '', '');
        if (tavilyResult?.success && tavilyResult?.competitors?.length > 0) {
          tavilyResult.competitors.slice(0, 5).forEach(name => {
            competitors.push(this._evidence(
              'tavily_competitor_discovery',
              'tavily_search_api',
              60,
              {
                name,
                domain: '',
                type: 'serpCompetitor',
                relevanceScore: 50,
                overlapReason: 'Found via Tavily web search',
                snippet: '',
                rank: null,
              }
            ));
          });
          serpSource = 'Tavily';
          this.sources.push({ type: 'serp', source: 'Tavily', success: true, count: competitors.length });
        }
      } catch (e) {
        this.warnings.push(`Tavily competitor search failed: ${e.message}`);
      }
    }

    return {
      competitors: competitors.length > 0 ? competitors : [this._noEvidence('No competitors found from SERP or Tavily', 'serp_api')],
      serpResults: this._evidence('serp_search_results', serpSource || 'serp_api', serpResults.length > 0 ? 100 : 0, serpResults),
      source: serpSource || 'none',
    };
  }

  async collectKeywordIntelligence() {
    if (!isDataForSEOConfigured()) {
      return this._noEvidence('DataForSEO not configured', 'dataforseo_api');
    }

    const seedTerms = [this.productName, this.companyName, this._extractDomain(this.websiteUrl)].filter(Boolean);
    if (seedTerms.length === 0) {
      return this._noEvidence('No seed terms for keyword research', 'dataforseo_api');
    }

    try {
      const metricResult = await getKeywordMetrics(seedTerms);
      const metrics = metricResult?.success ? metricResult.data : [];

      const suggestionResult = await getKeywordSuggestions(seedTerms);
      const suggestions = suggestionResult?.success ? suggestionResult.data : [];

      const allKeywords = [...(metrics || []), ...(suggestions || [])];

      if (allKeywords.length > 0) {
        this.sources.push({ type: 'keywords', source: 'DataForSEO', success: true, count: allKeywords.length });
        return {
          keywords: allKeywords.map(k => this._evidence(
            'dataforseo_keyword_data',
            'dataforseo_keyword_api',
            100,
            {
              keyword: k.keyword,
              volume: k.volume,
              difficulty: k.keywordDifficulty,
              cpc: k.cpc,
              competition: k.competition,
              intent: k.intent,
            }
          )),
          source: 'DataForSEO',
        };
      }
    } catch (e) {
      this.warnings.push(`DataForSEO keyword research failed: ${e.message}`);
    }

    return this._noEvidence('No keywords found from DataForSEO', 'dataforseo_api');
  }

  collectTechnologyIntelligence(scrapedData) {
    return null; // handled by business-intelligence.service.js detectTechnologyStack
  }

  _extractDomain(url) {
    if (!url) return '';
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  }

  getSummary() {
    return {
      sourcesCollected: this.sources.length,
      warningsCount: this.warnings.length,
      warnings: this.warnings,
      collectorId: this.collectorId,
      version: EVIDENCE_VERSION,
    };
  }
}

export function createEvidenceCollector(options = {}) {
  return new EvidenceCollector(options);
}
