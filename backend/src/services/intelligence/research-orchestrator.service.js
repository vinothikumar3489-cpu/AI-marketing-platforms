/**
 * Research Orchestrator Service
 * Collects verified research data once for reuse by Growth Workspace and SEO Intelligence.
 * Enterprise-grade: website scraping → technical audit → cascading competitor discovery →
 * technology detection → pricing discovery → keyword research → market signals.
 * Uses available APIs in priority order, never invents data, always reports source provenance.
 */

import { scrapeWebsite } from '../../domains/research/services/scraper.service.js';
import { getDesktopAndMobilePageSpeed } from '../../providers/pagespeed.service.js';
import { discoverCompetitors, extractDomainFromUrl } from '../../providers/competitor-discovery.service.js';
import { getKeywordMetrics, isDataForSEOConfigured } from '../../providers/dataforseo.service.js';
import { researchCompetitors, researchCompany } from '../../providers/tavily.service.js';
import { callAI } from '../../ai/services/aiRouter.service.js';
import { cleanValue, scrubPlaceholders } from '../../utils/clean-value.util.js';

/**
 * Collect comprehensive research data for a website/product
 * @param {Object} params - { websiteUrl, productName, companyName, userId, chatId }
 * @returns {Promise<Object>} Normalized research data
 */
export async function collectResearchData({ websiteUrl, productName, companyName, userId, chatId }) {
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
    pricing: null,
    companySignals: [],
    newsSignals: [],
    marketSignals: [],
    sources,
    warnings
  };

  try {
    // Phase 1: Website Scraping (also persists EvidenceSnapshot when userId+chatId present)
    console.log('[Research Orchestrator] Starting website scraping for:', websiteUrl);
    const scrapedContent = await scrapeWebsiteOrchestrator(websiteUrl, { userId, chatId, companyName });
    if (scrapedContent) {
      result.websiteContent = scrapedContent;
      sources.push({ type: 'website_scrape', source: scrapedContent.source, success: true });
    } else {
      warnings.push('Website scraping failed - no content retrieved');
      sources.push({ type: 'website_scrape', success: false, error: 'No content retrieved' });
    }

    // Phase 1b: Technology detection from scraped HTML
    if (scrapedContent?.html) {
      const tech = detectTechnologyStack(scrapedContent.html);
      if (tech.length > 0) {
        result.technologyStack = tech;
        sources.push({ type: 'technology_detection', success: true, count: tech.length });
      } else {
        warnings.push('Technology detection found no signatures');
        sources.push({ type: 'technology_detection', success: false });
      }
    }

    // Phase 1c: Pricing discovery from scraped content
    const pricing = extractPricingFromWebsite(scrapedContent);
    if (pricing && pricing.tiers.length > 0) {
      result.pricing = pricing;
      sources.push({ type: 'pricing_discovery', success: true, tiers: pricing.tiers.length });
    } else {
      warnings.push('No pricing data found on website');
      sources.push({ type: 'pricing_discovery', success: false });
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

    // Phase 3: Cascading Competitor Discovery (12+ sources)
    console.log('[Research Orchestrator] Running cascading competitor discovery for:', websiteUrl);
    const discovery = await discoverCompetitors({
      websiteUrl,
      productName: productName || result.identity.domain,
      companyName,
      industry: null,
      targetDomain: result.identity.domain,
      location: 'United States',
      html: scrapedContent?.html || null,
      max: 12,
      enrich: true,
      verbose: true
    });
    if (discovery.competitors.length > 0) {
      result.competitors = discovery.competitors;
      sources.push({
        type: 'competitor_discovery',
        source: discovery.sourcesUsed.join('+'),
        success: true,
        competitorsFound: discovery.competitors.length,
        sourcesUsed: discovery.sourcesUsed
      });
      if (discovery.sourceFailures.length) {
        warnings.push(`Competitor sources unavailable: ${discovery.sourceFailures.join(', ')}`);
      }
    } else {
      warnings.push('No competitors found from any source');
      sources.push({ type: 'competitor_discovery', success: false });
    }

    // Phase 4: Keyword Research (real metrics via DataForSEO, AI-estimates as fallback)
    if (result.websiteContent || result.competitors.length > 0) {
      console.log('[Research Orchestrator] Collecting keyword data');
      const keywordData = await collectKeywords(websiteUrl, result.websiteContent, result.competitors, productName);
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
    const marketData = await collectMarketSignals(websiteUrl, companyName || productName || result.identity.domain);
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
      technologyCount: result.technologyStack.length,
      pricingTiers: result.pricing?.tiers?.length || 0,
      keywordsCount: result.keywords.length,
      newsCount: result.newsSignals.length,
      warningsCount: warnings.length
    });

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
 * Scrape website using available APIs in priority order.
 * Correctly passes the object signature required by scrapeWebsite.
 */
async function scrapeWebsiteOrchestrator(url, { userId, chatId, companyName } = {}) {
  try {
    console.log(`[Research Orchestrator] Trying unified scraper`);
    const result = await scrapeWebsite({
      websiteUrl: url,
      companyName: companyName || '',
      userId: userId || null,
      chatId: chatId || null,
    });
    if (result && result.success && result.scrapedData) {
      return {
        ...result.scrapedData,
        source: result.source || 'unified_scraper'
      };
    }
    if (result && result.error) {
      console.warn(`[Research Orchestrator] Unified scraper returned error:`, result.error);
    }
  } catch (error) {
    console.warn(`[Research Orchestrator] Unified scraper failed:`, error.message);
  }

  // Fallback: Basic fetch + minimal parsing
  try {
    console.log('[Research Orchestrator] Trying basic fetch fallback');
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descMatch = html.match(/<meta name="description" content="([^"]*)"/i);
      const ogMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
      return {
        html,
        text: extractTextFromHtml(html),
        title: titleMatch ? titleMatch[1].trim() : '',
        metaDescription: descMatch ? descMatch[1].trim() : '',
        metadata: {
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descMatch ? descMatch[1].trim() : '',
        },
        openGraph: ogMatch ? { title: ogMatch[1].trim() } : null,
        source: 'basic_fetch'
      };
    }
  } catch (error) {
    console.warn('[Research Orchestrator] Basic fetch failed:', error.message);
  }

  return null;
}

/**
 * Detect technology stack from HTML signatures.
 */
export function detectTechnologyStack(html) {
  if (!html || typeof html !== 'string') return [];
  const lower = html.toLowerCase();
  const found = [];

  const signatures = [
    { name: 'React', pattern: /data-reactroot|_reactroot|__react|react\.js|react-dom/i },
    { name: 'Next.js', pattern: /__next|_next\/static|next\/font/i },
    { name: 'Vue.js', pattern: /vue\.js|__vue__|v-cloak|nuxt/i },
    { name: 'Nuxt.js', pattern: /nuxt|__nuxt/i },
    { name: 'Angular', pattern: /ng-version|ng-app|angular\.min/i },
    { name: 'Svelte', pattern: /svelte|sveltekit/i },
    { name: 'Astro', pattern: /astro\.js|data-astro/i },
    { name: 'Remix', pattern: /remix-run|remix\.js/i },
    { name: 'Gatsby', pattern: /gatsby/i },
    { name: 'Webflow', pattern: /webflow\.js|data-wf-/i },
    { name: 'Wix', pattern: /wix\.com|wixstatic/i },
    { name: 'Shopify', pattern: /shopify\.com|cdn\.shopify|shopify\b/i },
    { name: 'WordPress', pattern: /wp-content|wp-includes|wordpress/i },
    { name: 'Squarespace', pattern: /squarespace\.com|static1\.squarespace/i },
    { name: 'Tailwind CSS', pattern: /tailwindcss|tailwind\.css/i },
    { name: 'Bootstrap', pattern: /bootstrap\.(min\.)?css|bootstrap@/i },
    { name: 'jQuery', pattern: /jquery[.-]/i },
    { name: 'TypeScript', pattern: /\.tsx|typescript/i },
    { name: 'Webpack', pattern: /webpack/i },
    { name: 'Vite', pattern: /vite\.js|@vite/i },
    { name: 'Framer', pattern: /framer/i },
    { name: 'GSAP', pattern: /gsap/i },
    { name: 'D3.js', pattern: /d3\.js|d3\.v\d/i },
    { name: 'Three.js', pattern: /three\.min|three\.js/i },
    { name: 'Chart.js', pattern: /chart\.js|chart\.min/i },
    { name: 'AOS', pattern: /aos\.css|data-aos/i },
    { name: 'Cloudflare', pattern: /cdn-cgi\/|cloudflare/i },
    { name: 'Cloudinary', pattern: /cloudinary\.com/i },
    { name: 'Algolia', pattern: /algolia/i },
    { name: 'Stripe', pattern: /js\.stripe\.com|stripe\.js/i },
    { name: 'Google Analytics', pattern: /gtag|google-analytics|googletagmanager/i },
    { name: 'Segment', pattern: /segment\.com\/analytics|cdn\.segment/i },
    { name: 'Mixpanel', pattern: /mixpanel/i },
    { name: 'HubSpot', pattern: /js\.hs-scripts|hubspot/i },
    { name: 'Intercom', pattern: /widget\.intercom|intercom/i },
    { name: 'Crisp', pattern: /crisp\.chat|crisp-client/i },
    { name: 'Zendesk', pattern: /zendesk/i },
    { name: 'Drift', pattern: /drift\.com\/js|js\.drift/i },
    { name: 'Hotjar', pattern: /hotjar/i },
    { name: 'FullStory', pattern: /fullstory\.com|fs\.js/i },
    { name: 'Auth0', pattern: /auth0\.com|auth0-js/i },
    { name: 'Clerk', pattern: /clerk\.com|clerk\.js/i },
    { name: 'Firebase', pattern: /firebase|firebasestorage/i },
    { name: 'Supabase', pattern: /supabase/i },
    { name: 'Vercel', pattern: /vercel\.com\/analytics|vercel-analytics/i },
    { name: 'Netlify', pattern: /netlify\.com|netlify-cdn/i },
    { name: 'Railway', pattern: /railway\.app/i },
    { name: 'ReCAPTCHA', pattern: /recaptcha|g-recaptcha/i },
    { name: 'SendGrid', pattern: /sendgrid\.net|sg-global/i },
    { name: 'Mailchimp', pattern: /mailchimp\.com\/|mc\.us\d/i },
    { name: 'Twilio', pattern: /twilio/i },
    { name: 'Sentry', pattern: /sentry\.io|browser\.sentry/i },
    { name: 'LaunchDarkly', pattern: /launchdarkly/i },
    { name: 'Mapbox', pattern: /mapbox/i },
    { name: 'Google Maps', pattern: /maps\.google|maps\.googleapis/i },
    { name: 'YouTube Embed', pattern: /youtube\.com\/embed|youtube-nocookie/i },
    { name: 'Vimeo Embed', pattern: /player\.vimeo/i },
    { name: 'Lottie', pattern: /lottie/i },
    { name: 'Framer Motion', pattern: /framer-motion|motion\/react/i },
    { name: 'Sanity', pattern: /sanity\.io|sanity-cdn/i },
    { name: 'Contentful', pattern: /contentful\.com|contentful\.js/i },
    { name: 'Prismic', pattern: /prismic\.io/i },
    { name: 'OpenAI', pattern: /openai\.com|chatgpt/i },
    { name: 'Anthropic', pattern: /anthropic/i },
    { name: 'Recharts', pattern: /recharts/i },
    { name: 'Radix UI', pattern: /radix-ui/i },
    { name: 'shadcn', pattern: /shadcn/i },
  ];

  for (const sig of signatures) {
    if (sig.pattern.test(lower)) {
      found.push({ name: sig.name, source: 'html_signature', confidence: 85 });
    }
  }

  const scripts = html.match(/<script[^>]*src=["']([^"']+)/gi) || [];
  const detected = new Set(found.map(f => f.name));
  for (const scriptTag of scripts) {
    const src = scriptTag.replace(/^<script[^>]*src=["']/i, '').replace(/["']$/i, '');
    const srcLower = src.toLowerCase();
    if (srcLower.includes('cdn.jsdelivr.net')) {
      const libMatch = src.match(/npm\/([^@\/]+)|gh\/([^\/]+)\/([^@\/]+)/i);
      const lib = libMatch ? (libMatch[1] || libMatch[3] || '') : '';
      if (lib && !detected.has(lib)) {
        found.push({ name: lib.charAt(0).toUpperCase() + lib.slice(1), source: 'cdn_script', confidence: 70 });
        detected.add(lib);
      }
    } else if (srcLower.includes('unpkg.com')) {
      const libMatch = src.match(/unpkg\.com\/([^@\/]+)/i);
      const lib = libMatch ? libMatch[1] : '';
      if (lib && !detected.has(lib)) {
        found.push({ name: lib.charAt(0).toUpperCase() + lib.slice(1), source: 'cdn_script', confidence: 70 });
        detected.add(lib);
      }
    }
  }

  return found.slice(0, 30);
}

/**
 * Extract pricing tiers from scraped website content.
 */
export function extractPricingFromWebsite(scrapedData) {
  const pricingText = scrapedData?.pricingText || '';
  const text = (scrapedData?.text || '') + '\n' + pricingText;

  const tiers = [];
  const tierPatterns = [
    { name: 'Free', pattern: /\bfree\b/i, price: 0 },
    { name: 'Starter', pattern: /\bstarter\b/i, price: null },
    { name: 'Basic', pattern: /\bbasic\b/i, price: null },
    { name: 'Pro', pattern: /\bpro\b/i, price: null },
    { name: 'Professional', pattern: /\bprofessional\b/i, price: null },
    { name: 'Premium', pattern: /\bpremium\b/i, price: null },
    { name: 'Business', pattern: /\bbusiness\b/i, price: null },
    { name: 'Team', pattern: /\bteam\b/i, price: null },
    { name: 'Growth', pattern: /\bgrowth\b/i, price: null },
    { name: 'Scale', pattern: /\bscale\b/i, price: null },
    { name: 'Enterprise', pattern: /\benterprise\b/i, price: null },
  ];

  const priceRegex = /\$\s?(\d+[\d,]*(?:\.\d+)?)\s*(\/)?\s*(mo|month|monthly|yr|year|yearly|annual)?/gi;
  const priceRanges = [];
  let match;
  while ((match = priceRegex.exec(text))) {
    priceRanges.push({ amount: parseFloat(match[1].replace(/,/g, '')), period: (match[3] || '').toLowerCase() });
  }

  for (const tier of tierPatterns) {
    if (tierPatterns) {
      const idx = text.search(tier.pattern);
      if (idx >= 0) {
        // Find nearest price mention after the tier name (within 80 chars)
        const nearby = text.slice(idx, idx + 120);
        const nearPrice = priceRanges.find(p => nearby.includes(`$${p.amount}`) || nearby.includes(`$${p.amount.toLocaleString()}`));
        const nearest = nearby.match(/\$\s?(\d+[\d,]*(?:\.\d+)?)/);
        tiers.push({
          name: tier.name,
          price: tier.name === 'Free' ? 0 : nearest ? parseFloat(nearest[1].replace(/,/g, '')) : tier.price,
          period: tier.name === 'Free' ? null : nearPrice?.period || (nearest ? 'mo' : null),
          source: 'website_scrape',
          confidence: nearest || tier.name === 'Free' ? 70 : 40,
        });
      }
    }
  }

  const billingPeriod = text.match(/\b(billed\s+)?(monthly|annually|yearly)\b/i);
  const currency = text.match(/(\$|€|£|₹)/);

  return {
    tiers: tiers.slice(0, 8),
    billingPeriod: billingPeriod ? billingPeriod[2].toLowerCase() : null,
    currency: currency ? currency[1] : '$',
    source: 'website_scrape',
    evidence: pricingText ? 'Extracted from website pricing section' : 'Detected from website content',
    confidence: tiers.length > 0 ? 65 : 0,
  };
}

/**
 * Collect keyword data: website content terms + competitor names, enriched with
 * DataForSEO metrics when available, AI-estimated (LOW confidence) otherwise.
 */
async function collectKeywords(url, websiteContent, competitors, productName) {
  const keywords = [];
  const candidates = [];

  if (websiteContent && websiteContent.text) {
    const text = websiteContent.text.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Bigram + unigram candidates
    Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .forEach(([word, freq]) => {
        if (!isStopWord(word)) {
          candidates.push({ keyword: word, freq, source: 'website_content' });
        }
      });
  }

  competitors.forEach(comp => {
    if (comp.name && !candidates.find(k => k.keyword === comp.name.toLowerCase())) {
      candidates.push({ keyword: comp.name.toLowerCase(), freq: 3, source: 'competitor_name' });
    }
  });

  if (productName) {
    candidates.unshift({ keyword: productName.toLowerCase(), freq: 10, source: 'product_name' });
  }

  const uniqueCandidates = [];
  const seen = new Set();
  for (const c of candidates) {
    const kw = c.keyword.trim();
    if (!kw || kw.length < 3 || seen.has(kw)) continue;
    seen.add(kw);
    uniqueCandidates.push(c);
  }

  const batch = uniqueCandidates.slice(0, 20);

  // Enrich with DataForSEO metrics
  if (isDataForSEOConfigured() && batch.length > 0) {
    try {
      const metrics = await getKeywordMetrics(batch.map(c => c.keyword));
      if (metrics.success && metrics.data) {
        const metricMap = new Map(metrics.data.map(m => [m.keyword.toLowerCase(), m]));
        batch.forEach(c => {
          const m = metricMap.get(c.keyword.toLowerCase());
          keywords.push({
            keyword: c.keyword,
            volume: m?.volume ?? null,
            difficulty: m?.keywordDifficulty ?? null,
            cpc: m?.cpc ?? null,
            competition: m?.competition ?? null,
            intent: m?.intent ?? null,
            source: 'DataForSEO',
            confidence: 90,
          });
        });
      }
    } catch (error) {
      console.warn('[Research Orchestrator] DataForSEO keyword metrics failed:', error.message);
    }
  }

  // Fill gaps with AI-estimated metrics (LOW confidence, clearly marked)
  const missing = batch.filter(c => !keywords.some(k => k.keyword === c.keyword));
  if (missing.length > 0) {
    try {
      const prompt = `Estimate realistic Google search metrics for these keywords related to "${productName || url}". Use public knowledge only.

Keywords: ${missing.map(c => `"${c.keyword}"`).join(', ')}

Return ONLY compact JSON:
{"keywords":[{"keyword":"exact keyword","volume":1234,"difficulty":45,"cpc":2.1,"intent":"informational|commercial|transactional|navigational"}]}

Rules:
- volume 0-1,000,000; difficulty 0-100; cpc 0-50.
- Be honest: if a keyword is clearly generic with tiny volume, use small numbers.
- Never return null or -1.`;
      const result = await callAI(prompt, 3000);
      if (result.success && Array.isArray(result.data?.keywords)) {
        const metricMap = new Map(result.data.keywords.map(k => [k.keyword.toLowerCase(), k]));
        missing.forEach(c => {
          const est = metricMap.get(c.keyword.toLowerCase());
          keywords.push({
            keyword: c.keyword,
            volume: est?.volume ?? null,
            difficulty: est?.difficulty ?? null,
            cpc: est?.cpc ?? null,
            competition: null,
            intent: est?.intent ?? null,
            source: 'ai_estimated',
            confidence: 30,
            evidence: 'AI-estimated from public market knowledge (LOW confidence)',
          });
        });
      }
    } catch (error) {
      console.warn('[Research Orchestrator] AI keyword estimation failed:', error.message);
    }
  }

  // Deterministic fallback for anything still missing
  batch.forEach(c => {
    if (!keywords.some(k => k.keyword === c.keyword)) {
      keywords.push({
        keyword: c.keyword,
        volume: null,
        difficulty: null,
        cpc: null,
        competition: null,
        intent: null,
        source: c.source,
        confidence: Math.min(c.freq * 5, 50),
      });
    }
  });

  return keywords.slice(0, 25);
}

/**
 * Collect market signals (news, company info)
 */
async function collectMarketSignals(url, query) {
  const news = [];
  const companies = [];
  const market = [];

  try {
    const tavilyResult = await researchCompetitors(query, 'technology', 'software');
    if (tavilyResult && tavilyResult.success) {
      if (Array.isArray(tavilyResult.marketSignals)) {
        tavilyResult.marketSignals.forEach(signal => {
          news.push({
            title: signal.title || signal.topic || '',
            url: signal.url || '',
            publishedDate: signal.date || '',
            snippet: signal.description || signal.summary || '',
            source: 'tavily_news'
          });
        });
      }
      if (Array.isArray(tavilyResult.seoOpportunities)) {
        market.push(...tavilyResult.seoOpportunities.slice(0, 10));
      }
      if (Array.isArray(tavilyResult.buyerIntent)) {
        market.push(...tavilyResult.buyerIntent.slice(0, 10));
      }
    }
  } catch (error) {
    console.warn('[Research Orchestrator] News search failed:', error.message);
  }

  // Company intelligence (mission, funding, founders, employees) with confidence scoring
  try {
    const companyResult = await researchCompany(query);
    if (companyResult && companyResult.success && Array.isArray(companyResult.facts)) {
      companies.push({
        name: query,
        mission: companyResult.mission,
        funding: companyResult.funding,
        founders: companyResult.founders,
        employees: companyResult.employees,
        facts: companyResult.facts,
        source: 'tavily_company',
      });
    }
  } catch (error) {
    console.warn('[Research Orchestrator] Company research failed:', error.message);
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
  const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'with', 'this', 'that', 'from', 'they', 'will', 'have', 'been', 'more', 'when', 'into', 'some', 'than', 'them', 'very', 'just', 'over', 'such', 'your', 'about', 'would', 'which', 'their', 'said', 'each', 'she', 'does', 'both', 'after', 'also', 'were', 'many', 'before', 'through', 'being', 'under', 'while', 'should', 'where', 'because', 'other', 'those', 'been', 'could', 'first', 'like', 'most', 'then', 'than', 'only', 'come', 'its', 'who', 'now', 'make', 'time', 'made', 'software', 'platform', 'product', 'solution', 'features', 'pricing', 'start', 'get', 'home', 'page', 'check'];
  return stopWords.includes(word.toLowerCase());
}

export { extractDomainFromUrl };
