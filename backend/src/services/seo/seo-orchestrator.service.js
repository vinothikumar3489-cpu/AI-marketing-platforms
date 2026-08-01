import { deriveWebsiteIdentity } from "../../utils/seo-identity.util.js";
import { getLatestEvidenceSnapshot } from "../../domains/research/services/evidence.service.js";
import { getDesktopAndMobilePageSpeed } from "../../providers/pagespeed.service.js";
import { getChromeUXReport } from "./technical-seo-merged.service.js";
import { generateKeywordIntelligence } from "./keyword-intelligence.service.js";
import { generateCompetitorSeoIntelligence } from "./competitor-seo-intelligence.service.js";
import { generateContentGapIntelligence } from "./content-gap-engine.service.js";
import { generateGeoIntelligence } from "./geo-intelligence.service.js";
import { generateBlogIntelligence } from "./blog-intelligence.service.js";
import { generateSearchEnrichment } from "./search-enrichment.service.js";
import { generateAIVisibility } from "./ai-visibility.service.js";
import { getSEOProviderStatus, verifyDataForSEOAtStartup, getDataForSEOStartupStatus } from "./seo-provider-router.service.js";
import { buildSEOReport } from "./seo-report-builder.service.js";
import { getDomainData, isDataForSEOConfigured } from "../../providers/dataforseo.service.js";
import { scrapeWebsite } from "../../domains/research/services/scraper.service.js";
import { detectTechnologyStack, extractPricingFromWebsite } from "../intelligence/research-orchestrator.service.js";

export { verifyDataForSEOAtStartup, getDataForSEOStartupStatus };

export async function generateCompleteSeoIntelligence({ chatId, userId, websiteUrl, chat }) {
  const runId = `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const warnings = [];
  const modules = {};

  console.log('[SEO ORCHESTRATOR]', { runId, chatId, userId, websiteUrl });

  const providerStatus = await getSEOProviderStatus();
  console.log('[SEO ORCHESTRATOR] Provider selection:', {
    selected: providerStatus.selection.selectedProvider,
    dataforseoConnected: providerStatus.dataforseo.connected,
    dataforseoStatus: providerStatus.dataforseo.status,
    serpapiStatus: providerStatus.serpapi?.status
  });

  let websiteData = null;
  let identity = null;
  let researchData = { keywords: [], competitors: [] };
  let websiteHtml = null;

  try {
    if (chatId) {
      const evidenceReq = await getLatestEvidenceSnapshot(chatId);
      if (evidenceReq.success && evidenceReq.snapshot) {
        const snap = evidenceReq.snapshot;
        const webEv = snap.websiteEvidence || {};
        const contentEv = snap.contentEvidence || {};
        const techEv = snap.technicalSeoEvidence || {};
        const txt = contentEv.cleanedText || snap.rawEvidence?.rawMarkdown || '';
        const schemas = contentEv.schemas && contentEv.schemas.count > 0
          ? contentEv.schemas
          : (webEv.schemas && webEv.schemas.count > 0 ? webEv.schemas : null);
        websiteHtml = snap.rawEvidence?.html || snap.rawEvidence?.rawHtml || '';
        websiteData = {
          text: txt,
          url: websiteUrl,
          content: { text: txt },
          title: webEv.title || '',
          metaDescription: webEv.metaDescription || '',
          meta: {
            title: webEv.title || '',
            description: webEv.metaDescription || '',
            robots: techEv.robots?.exists === false ? 'disallow-all' : (techEv.robots?.blockedPaths?.length ? 'blocks-partial' : null),
            sitemap: techEv.sitemap?.exists === false ? null : (techEv.sitemap?.url || null),
            ...(contentEv.openGraph || {}),
            ...(contentEv.twitterCard || {}),
            ...(schemas ? { schema: schemas } : {})
          },
          h1: webEv.headings || [],
          headings: { h1: webEv.headings || [] },
          openGraph: contentEv.openGraph || {},
          twitterCard: contentEv.twitterCard || {},
          schema: schemas || {},
          structured: schemas || {},
          robots: techEv.robots || null,
          sitemap: techEv.sitemap || null,
          pageSpeed: techEv.pageSpeed || null
        };
      }
    }

    // Resilience: scrape directly when no evidence snapshot exists
    if (!websiteData) {
      console.log('[SEO ORCHESTRATOR] No EvidenceSnapshot — attempting direct scrape');
      const scrapeResult = await scrapeWebsite({
        websiteUrl,
        companyName: chat?.title || '',
        userId,
        chatId: chatId || null,
      });
      if (scrapeResult.success && scrapeResult.scrapedData) {
        const s = scrapeResult.scrapedData;
        websiteHtml = s.html || '';
        websiteData = {
          text: s.cleanedText || s.text || '',
          url: websiteUrl,
          content: { text: s.cleanedText || s.text || '' },
          title: s.title || '',
          metaDescription: s.metaDescription || '',
          meta: {
            title: s.title || '',
            description: s.metaDescription || '',
            ...(s.openGraph || {})
          },
          h1: s.headings || [],
          headings: { h1: s.headings || [] },
          openGraph: s.openGraph || {},
          twitterCard: s.twitterCard || {},
          schema: s.schemas || s.structuredData || {},
          structured: s.schemas || s.structuredData || {}
        };
        warnings.push({ code: 'EVIDENCE_AUTO_CREATED', message: 'No evidence snapshot existed — auto-scraped website directly' });
      }
    }

    if (!websiteData) {
      throw new Error("No EvidenceSnapshot found and direct scrape failed. Please ensure scraping has completed first.");
    }
    identity = deriveWebsiteIdentity({ websiteUrl, scrapedData: websiteData, chat });
    modules.crawl = { status: 'SUCCESS', websiteData, identity };
    console.log('[SEO ORCHESTRATOR] Crawl complete, identity derived:', { productName: identity.productName });
  } catch (e) {
    warnings.push({ code: 'CRAWL_FAILED', message: `Evidence extraction failed: ${e.message}` });
    identity = { websiteUrl, productName: chat?.productName || '', companyName: chat?.title || '' };
    modules.crawl = { status: 'FAILED', error: e.message, identity };
  }

  const techAudit = await runModule('technicalSeo', runModuleTechnicalSeo.bind(null, websiteData, websiteUrl));
  modules.technicalSeo = techAudit;

  const keywordIntelligence = await runModule('keywordIntelligence', async () => {
    return await generateKeywordIntelligence({
      websiteData,
      identity,
      seoIntelligence: {},
      orchestratorKeywords: researchData.keywords || []
    });
  });
  modules.keywordIntelligence = keywordIntelligence;

  const kiData = keywordIntelligence.data || {};

  const competitorIntelligence = await runModule('competitorIntelligence', async () => {
    return await generateCompetitorSeoIntelligence({
      keywordIntelligence: kiData,
      geoIntelligence: {},
      websiteData,
      identity,
      orchestratorCompetitors: researchData.competitors || []
    });
  });
  modules.competitorIntelligence = competitorIntelligence;

  const ciData = competitorIntelligence.data || {};
  const techData = techAudit.data || {};

  const contentGapIntelligence = await runModule('contentGapIntelligence', async () => {
    return await generateContentGapIntelligence({
      websiteData,
      keywordIntelligence: kiData,
      geoIntelligence: {},
      competitorIntelligence: ciData,
      identity
    });
  });
  modules.contentGapIntelligence = contentGapIntelligence;

  const geoIntelligence = await runModule('geoIntelligence', async () => {
    return await generateGeoIntelligence({
      websiteData,
      technicalAudit: techData,
      identity
    });
  });
  modules.geoIntelligence = geoIntelligence;

  const geoData = geoIntelligence.data || {};

  const blogIntelligence = await runModule('blogIntelligence', async () => {
    return await generateBlogIntelligence({
      keywordIntelligence: kiData,
      competitorIntelligence: ciData,
      geoIntelligence: geoData,
      identity,
      orchestratorData: {}
    });
  });
  modules.blogIntelligence = blogIntelligence;

  const searchEnrichment = await runModule('searchEnrichment', async () => {
    return await generateSearchEnrichment({
      query: identity?.productName || websiteUrl || '',
      location: 'United States',
      keywords: (kiData.primaryKeywords || []).map(k => k.keyword || k).slice(0, 5),
      productName: identity?.productName || '',
      websiteUrl
    });
  });
  modules.searchEnrichment = searchEnrichment;

  const aiVisibility = await runModule('aiVisibility', async () => {
    return await generateAIVisibility({
      productName: identity?.productName || chat?.productName || '',
      companyName: identity?.companyName || chat?.title || '',
      domain: identity?.domain || websiteUrl || '',
      keywords: (kiData.primaryKeywords || []).map(k => k.keyword || k).slice(0, 5),
      websiteData
    });
  });
  modules.aiVisibility = aiVisibility;

  const backlinkHealth = await runModule('backlinkHealth', async () => {
    if (!isDataForSEOConfigured()) return { status: 'SKIPPED', reason: 'DataForSEO not configured', data: null };
    const domain = (identity?.domain || (websiteUrl || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')).replace(/^www\./, '');
    const result = await getDomainData(domain);
    return result.success ? result.data : { status: 'FAILED', error: result.error, data: null };
  });
  modules.backlinkHealth = backlinkHealth;

  const fullReport = buildSEOReport({
    identity,
    technicalAudit: techAudit.data || {},
    keywordIntelligence: keywordIntelligence.data || {},
    competitorIntelligence: competitorIntelligence.data || {},
    geoIntelligence: geoIntelligence.data || {},
    contentGapIntelligence: contentGapIntelligence.data || {},
    blogIntelligence: blogIntelligence.data || {},
    serpFeatures: searchEnrichment.data?.serpFeatures || [],
    peopleAlsoAsk: searchEnrichment.data?.peopleAlsoAsk || [],
    trendAnalysis: searchEnrichment.data?.trends || [],
    serpAnalysis: searchEnrichment.data?.serpAnalysis || null,
    aiVisibility: aiVisibility.data || null,
    providers: providerStatus,
    backlinkData: backlinkHealth.data || null,
    pageSpeed: techAudit.data?.pageSpeed || null,
    crux: techAudit.data?.crux || null
  });

  console.log('[SEO ORCHESTRATOR] Complete', { runId, warnings: warnings.length });

  return {
    success: true,
    data: fullReport,
    modules,
    warnings,
    provider: providerStatus.selection.selectedProvider,
    providers: providerStatus,
    runId
  };
}

async function runModule(name, fn) {
  try {
    console.log(`[SEO ORCHESTRATOR] Running module: ${name}`);
    const result = await fn();
    return { status: 'SUCCESS', data: result };
  } catch (e) {
    console.warn(`[SEO ORCHESTRATOR] Module ${name} failed:`, e.message);
    return { status: 'FAILED', error: e.message, data: null };
  }
}

async function runModuleTechnicalSeo(websiteData, websiteUrl) {
  const tech = {
    meta: extractMeta(websiteData),
    canonical: extractCanonical(websiteData),
    robots: extractRobots(websiteData),
    sitemap: extractSitemap(websiteData),
    headings: extractHeadings(websiteData),
    openGraph: extractOpenGraph(websiteData),
    twitterCard: extractTwitterCard(websiteData),
    structuredData: extractStructuredData(websiteData),
    schema: extractSchemaTypes(websiteData),
    images: extractImages(websiteData),
    links: extractLinks(websiteData),
    viewport: extractViewport(websiteData),
    hreflang: extractHreflang(websiteData),
    https: { status: websiteUrl?.startsWith('https') ? 'enabled' : 'unknown', value: websiteUrl?.startsWith('https') || null },
    mobile: { status: 'unavailable', value: null },
    performance: null,
    pageSpeed: null,
    crux: null,
    overallScore: null,
    issues: { critical: [], high: [], medium: [], low: [] }
  };

  const pageSpeed = await runPageSpeedWithRetry(websiteUrl, 3);
  if (pageSpeed.success) {
    tech.pageSpeed = pageSpeed.data;
    const mobilePerf = pageSpeed.data.mobile?.lighthouseScores?.performance ?? pageSpeed.data.mobile?.performance ?? null;
    const desktopPerf = pageSpeed.data.desktop?.lighthouseScores?.performance ?? pageSpeed.data.desktop?.performance ?? null;
    tech.performance = {
      mobile: mobilePerf,
      desktop: desktopPerf,
      status: 'measured'
    };
    tech.overallScore = mobilePerf ?? desktopPerf ?? null;
  } else if (websiteData?.pageSpeed && (websiteData.pageSpeed.success || websiteData.pageSpeed.mobile || websiteData.pageSpeed.desktop)) {
    // Fall back to PageSpeed evidence already collected in the Evidence Snapshot
    const cached = websiteData.pageSpeed;
    tech.pageSpeed = cached;
    const mobilePerf = cached.mobile?.lighthouseScores?.performance ?? cached.mobile?.performance ?? null;
    const desktopPerf = cached.desktop?.lighthouseScores?.performance ?? cached.desktop?.performance ?? null;
    tech.performance = {
      mobile: mobilePerf,
      desktop: desktopPerf,
      status: mobilePerf != null || desktopPerf != null ? 'measured_from_snapshot' : 'unavailable'
    };
    tech.overallScore = mobilePerf ?? desktopPerf ?? null;
    console.log('[SEO TECHNICAL] Using PageSpeed evidence from snapshot');
  } else {
    console.log('[SEO TECHNICAL] PageSpeed unavailable, trying CrUX...');
    tech.pageSpeed = { status: 'unavailable', error: pageSpeed.error || 'PageSpeed request failed', mobile: null, desktop: null };
    const crux = await getChromeUXReport(websiteUrl);
    if (crux.success) {
      tech.crux = crux.data;
      tech.performance = {
        lcp: crux.data.lcp?.p75 ?? null,
        cls: crux.data.cls?.p75 ?? null,
        inp: crux.data.inp?.p75 ?? null,
        status: 'measured_from_crux'
      };
      tech.overallScore = tech.performance.lcp ? 70 : null;
    } else {
      tech.performance = { status: 'unavailable', reason: pageSpeed.error || 'PageSpeed and CrUX both unavailable' };
    }
  }

  // On-page structural flags — these drive the crawlability/metadata/schema scores
  const meta = tech.meta || {};
  const robotsData = tech.robots || {};
  const sitemapData = tech.sitemap || {};
  tech.hasTitleTag = !!meta.title;
  tech.hasMetaDescription = !!meta.description;
  tech.hasRobotsTxt = robotsData.exists === true || !!robotsData.content;
  tech.hasSitemap = sitemapData.exists === true || !!sitemapData.url;
  tech.hasViewport = tech.viewport?.status === 'measured';
  tech.hasHreflang = (tech.hreflang?.links?.length || 0) > 0;
  tech.titleLength = meta.title ? meta.title.length : 0;
  tech.metaDescriptionLength = meta.description ? meta.description.length : 0;
  tech.internalLinks = tech.links?.internal != null ? Array.from({ length: tech.links.internal }, (_, i) => i) : [];
  tech.schemas = tech.structuredData?.types || [];
  tech.schemaTypes = tech.schema?.types || [];

  // Merge Lighthouse-verified SEO audits into the crawl evidence (measured by PageSpeed)
  const seoAudits = tech.pageSpeed?.mobile?.seoAudits || tech.pageSpeed?.desktop?.seoAudits || null;
  if (seoAudits) {
    tech.hasTitleTag = seoAudits.hasTitleTag ?? tech.hasTitleTag;
    tech.hasMetaDescription = seoAudits.hasMetaDescription ?? tech.hasMetaDescription;
    tech.hasViewport = seoAudits.hasViewport ?? tech.hasViewport;
    tech.hasCanonical = seoAudits.hasCanonical ?? !!tech.canonical?.url;
    tech.hasRobotsTxt = seoAudits.hasRobotsTxt ?? tech.hasRobotsTxt;
    tech.hasSitemap = seoAudits.hasSitemap ?? tech.hasSitemap;
    tech.hasStructuredData = seoAudits.hasStructuredData ?? ((tech.structuredData?.count || 0) > 0);
    tech.hasOpenGraph = seoAudits.hasOpenGraph ?? (tech.openGraph?.status === 'measured');
    tech.hasTwitterCard = seoAudits.hasTwitterCard ?? (tech.twitterCard?.status === 'measured');
    tech.hasCanonical = tech.hasCanonical ?? !!tech.canonical?.url;
    tech.isOnHttps = seoAudits.isOnHttps ?? (tech.https?.status === 'enabled');
    tech.seoAuditSource = 'PageSpeed Lighthouse';
  }

  // Evidence-driven issue classification — every entry traces to a real finding
  if (!tech.hasTitleTag) {
    tech.issues.critical.push({ type: 'missing_title', title: 'Missing or empty page title', severity: 'critical', evidence: 'On-page crawl of the homepage' });
  } else if (tech.titleLength > 60) {
    tech.issues.medium.push({ type: 'long_title', title: `Page title is ${tech.titleLength} characters (recommended ≤ 60)`, severity: 'medium', evidence: 'On-page crawl of the homepage' });
  }
  if (!tech.hasMetaDescription) {
    tech.issues.high.push({ type: 'missing_description', title: 'Missing meta description', severity: 'high', evidence: 'On-page crawl of the homepage' });
  } else if (tech.metaDescriptionLength > 160) {
    tech.issues.low.push({ type: 'long_description', title: `Meta description is ${tech.metaDescriptionLength} characters (recommended ≤ 160)`, severity: 'low', evidence: 'On-page crawl of the homepage' });
  }
  if (!tech.hasCanonical && !tech.canonical?.url) {
    tech.issues.medium.push({ type: 'no_canonical', title: 'No canonical URL specified', severity: 'medium', evidence: 'On-page crawl of the homepage' });
  }
  if (!tech.hasRobotsTxt) {
    tech.issues.high.push({ type: 'no_robots_txt', title: 'No robots.txt detected', severity: 'high', evidence: robotsData.status === 'measured' ? 'Crawler evidence collection' : 'Crawl of homepage' });
  }
  if (!tech.hasSitemap) {
    tech.issues.medium.push({ type: 'no_sitemap', title: 'No XML sitemap detected', severity: 'medium', evidence: sitemapData.status === 'measured' ? 'Crawler evidence collection' : 'Crawl of homepage' });
  }
  if ((tech.structuredData?.count || 0) === 0) {
    tech.issues.medium.push({ type: 'no_structured_data', title: 'No structured data (Schema.org) detected', severity: 'medium', evidence: 'On-page crawl of the homepage' });
  }
  if (tech.openGraph?.status === 'unavailable' || !tech.openGraph?.image) {
    tech.issues.medium.push({ type: 'no_opengraph', title: 'Open Graph tags missing or no image', severity: 'medium', evidence: 'On-page crawl of the homepage' });
  }
  if (tech.twitterCard?.status === 'unavailable') {
    tech.issues.low.push({ type: 'no_twitter_card', title: 'Twitter Card tags missing', severity: 'low', evidence: 'On-page crawl of the homepage' });
  }
  if (tech.viewport?.status === 'unavailable') {
    tech.issues.high.push({ type: 'no_viewport', title: 'No mobile viewport meta tag', severity: 'high', evidence: 'On-page crawl of the homepage' });
  }
  if ((tech.headings?.h1 || []).length === 0) {
    tech.issues.medium.push({ type: 'no_h1', title: 'No H1 heading found', severity: 'medium', evidence: 'On-page crawl of the homepage' });
  }
  const imagesData = tech.images || {};
  const altCoverage = imagesData.count > 0 ? (imagesData.withAlt / imagesData.count) * 100 : null;
  tech.altCoverage = altCoverage != null ? Math.round(altCoverage) : null;
  if (altCoverage != null && altCoverage < 50) {
    tech.issues.medium.push({ type: 'poor_alt_coverage', title: `Only ${Math.round(altCoverage)}% of images have alt text`, severity: 'medium', evidence: 'On-page crawl of the homepage' });
  }
  if (tech.performance?.mobile != null && tech.performance.mobile < 50) {
    tech.issues.critical.push({ type: 'poor_mobile_performance', title: `Mobile performance score is ${tech.performance.mobile}/100`, severity: 'critical', evidence: 'Lighthouse (PageSpeed Insights)' });
  } else if (tech.performance?.mobile != null && tech.performance.mobile < 70) {
    tech.issues.high.push({ type: 'low_mobile_performance', title: `Mobile performance score is ${tech.performance.mobile}/100`, severity: 'high', evidence: 'Lighthouse (PageSpeed Insights)' });
  }
  const cruxData = tech.crux || {};
  const cruxLcp = cruxData.lcp?.p75 ?? null;
  if (cruxLcp != null && cruxLcp > 4000) {
    tech.issues.high.push({ type: 'poor_field_lcp', title: `Field LCP is ${Math.round(cruxLcp)}ms (poor threshold > 4.0s)`, severity: 'high', evidence: 'Chrome UX Report (real-user field data)' });
  } else if (cruxLcp != null && cruxLcp > 2500) {
    tech.issues.medium.push({ type: 'slow_field_lcp', title: `Field LCP is ${Math.round(cruxLcp)}ms (needs improvement > 2.5s)`, severity: 'medium', evidence: 'Chrome UX Report (real-user field data)' });
  }
  if ((tech.hreflang?.links?.length || 0) === 0 && (tech.hreflang?.status === 'measured')) {
    tech.issues.low.push({ type: 'no_hreflang', title: 'No hreflang tags detected (only relevant for multilingual sites)', severity: 'low', evidence: 'On-page crawl of the homepage' });
  }
  if (tech.https?.status !== 'enabled') {
    tech.issues.high.push({ type: 'no_https', title: 'Site is not served over HTTPS', severity: 'high', evidence: websiteUrl ? `Requested URL ${websiteUrl}` : 'Unavailable' });
  }

  // Never leave the technical score null: estimate from on-page signals when lab data is missing
  if (tech.overallScore == null) {
    let onPage = 50;
    if (tech.meta?.title) onPage += 12;
    if (tech.meta?.description) onPage += 8;
    if (tech.canonical?.url) onPage += 6;
    if (tech.robots?.content && !/noindex/i.test(tech.robots.content)) onPage += 6;
    if (tech.sitemap?.url) onPage += 6;
    if ((tech.headings?.h1 || []).length) onPage += 6;
    if (Object.keys(tech.openGraph || {}).length > 1) onPage += 4;
    if ((tech.structuredData?.count || 0) > 0) onPage += 8;
    if (tech.https?.status === 'enabled') onPage += 4;
    onPage -= tech.issues.critical.length * 6;
    onPage -= tech.issues.high.length * 3;
    tech.overallScore = Math.max(0, Math.min(100, onPage));
    tech.scoreMethod = 'estimated_from_onpage_signals';
    tech.scoreNote = 'Lab performance data unavailable — score estimated from on-page technical signals';
  }
  const perfScore = (tech.performance?.mobile ?? tech.performance?.desktop ?? tech.performance?.lcp) ?? null;
  tech.performanceScore = Number.isFinite(perfScore) ? Math.round(perfScore) : null;
  tech.scores = { overall: tech.overallScore, overallScore: tech.overallScore, performance: tech.performanceScore, performanceScore: tech.performanceScore };

  return tech;
}

async function runPageSpeedWithRetry(url, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SEO TECHNICAL] PageSpeed attempt ${attempt}/${maxRetries}`);
      const result = await getDesktopAndMobilePageSpeed(url);
      if (result.success) {
        console.log(`[SEO TECHNICAL] PageSpeed succeeded on attempt ${attempt}`);
        return result;
      }
      lastError = result.error || 'PageSpeed returned unsuccessful';
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`[SEO TECHNICAL] PageSpeed retry ${attempt} failed, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (e) {
      lastError = e.message;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return { success: false, error: lastError, reason: 'Max retries exceeded' };
}

function extractMeta(data) {
  if (!data) return { title: null, description: null, status: 'unavailable' };
  const title = data.title || data.meta?.title || data.metadata?.title || null;
  const description = data.metaDescription || data.meta?.description || data.metadata?.description || null;
  return { title, description, status: title || description ? 'measured' : 'unavailable' };
}

function extractCanonical(data) {
  if (!data) return { url: null, status: 'unavailable' };
  const url = data.meta?.canonical || data.canonical || null;
  return { url, status: url ? 'measured' : 'unavailable' };
}

function extractRobots(data) {
  if (!data) return { content: null, status: 'unavailable' };
  const robotsEv = data.robots;
  if (robotsEv && typeof robotsEv === 'object' && 'exists' in robotsEv) {
    const blocked = (robotsEv.blockedPaths || []).length > 0;
    return {
      content: robotsEv.exists === false ? 'disallow-all (no robots.txt found)' : (blocked ? `blocks ${robotsEv.blockedPaths.length} path(s)` : 'allow-all'),
      exists: robotsEv.exists,
      blockedPaths: robotsEv.blockedPaths || [],
      rulesSummary: robotsEv.rulesSummary || [],
      status: robotsEv.exists !== undefined ? 'measured' : 'unavailable'
    };
  }
  const fallbackContent = data.meta?.robots || data.robots || null;
  return { content: fallbackContent, status: fallbackContent ? 'measured' : 'unavailable' };
}

function extractSitemap(data) {
  if (!data) return { url: null, status: 'unavailable' };
  const sitemapEv = data.sitemap;
  if (sitemapEv && typeof sitemapEv === 'object' && 'exists' in sitemapEv) {
    const url = sitemapEv.exists === false
      ? null
      : (sitemapEv.url || (Array.isArray(sitemapEv.sampleUrls) && sitemapEv.sampleUrls[0]) || null);
    return {
      url,
      exists: sitemapEv.exists,
      urlCount: sitemapEv.urlCount ?? null,
      sampleUrls: sitemapEv.sampleUrls || [],
      status: sitemapEv.exists !== undefined ? 'measured' : 'unavailable'
    };
  }
  return { url: data.sitemap || data.meta?.sitemap || null, status: 'unavailable' };
}

function extractHeadings(data) {
  if (!data) return { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], status: 'unavailable' };
  const h1 = asArray(data.h1 || data.headings?.h1 || []);
  const h2 = asArray(data.h2 || data.headings?.h2 || []);
  const h3 = asArray(data.h3 || data.headings?.h3 || []);
  return {
    h1: h1.map(h => typeof h === 'string' ? h : (h.text || h)),
    h2: h2.map(h => typeof h === 'string' ? h : (h.text || h)),
    h3: h3.map(h => typeof h === 'string' ? h : (h.text || h)),
    h4: [],
    h5: [],
    h6: [],
    status: h1.length > 0 || h2.length > 0 ? 'measured' : 'unavailable'
  };
}

function extractOpenGraph(data) {
  if (!data) return { title: null, description: null, image: null, status: 'unavailable' };
  const og = data.openGraph || data.meta?.openGraph || data.content?.openGraph || {};
  const keys = Object.keys(og);
  if (keys.length === 0) return { status: 'unavailable' };
  return {
    title: og.title || og['og:title'] || null,
    description: og.description || og['og:description'] || null,
    image: og.image || og['og:image'] || null,
    url: og.url || og['og:url'] || null,
    type: og.type || og['og:type'] || null,
    siteName: og.siteName || og['og:site_name'] || null,
    status: 'measured'
  };
}

function extractTwitterCard(data) {
  if (!data) return { card: null, site: null, title: null, status: 'unavailable' };
  const tc = data.twitterCard || data.meta?.twitterCard || data.content?.twitterCard || {};
  const keys = Object.keys(tc);
  if (keys.length === 0) return { status: 'unavailable' };
  return {
    card: tc.card || tc['twitter:card'] || null,
    site: tc.site || tc['twitter:site'] || null,
    title: tc.title || tc['twitter:title'] || null,
    description: tc.description || tc['twitter:description'] || null,
    image: tc.image || tc['twitter:image'] || null,
    status: 'measured'
  };
}

function extractStructuredData(data) {
  if (!data) return { types: [], count: 0, status: 'unavailable' };
  const schema = data.schema || data.structured || data.meta?.schema || {};
  const types = schema.types || schema.type ? [schema.type] : [];
  const items = schema.items || [];
  const count = types.length + (Array.isArray(items) ? items.length : 0);
  return { types, count, status: count > 0 ? 'measured' : 'unavailable' };
}

function extractSchemaTypes(data) {
  if (!data) return { types: [], count: 0, validation: 'unavailable', status: 'unavailable' };
  const schema = data.schema || data.structured || data.meta?.schema || {};
  const types = [];
  const seen = new Set();

  const addType = (t) => {
    if (!t || typeof t !== 'string' || seen.has(t)) return;
    seen.add(t);
    types.push(t);
  };

  if (Array.isArray(schema.types)) schema.types.forEach(addType);
  if (typeof schema.type === 'string') addType(schema.type);
  if (Array.isArray(schema.type)) schema.type.forEach(addType);

  for (const item of Array.isArray(schema.items) ? schema.items : []) {
    const t = item['@type'] || item.type || null;
    if (Array.isArray(t)) t.forEach(addType);
    else if (t) addType(t);
  }

  const typeDetails = types.map(t => ({
    type: t,
    validation: t.toLowerCase() === 'unknown' ? 'invalid' : 'recognized',
    source: 'On-page crawl of the homepage',
    status: 'measured'
  }));

  return {
    types,
    typeDetails,
    count: types.length,
    validation: types.length > 0 ? 'measured' : 'unavailable',
    status: types.length > 0 ? 'measured' : 'unavailable'
  };
}

function extractViewport(data) {
  if (!data) return { status: 'unavailable' };
  const meta = data.meta || {};
  const viewport = meta.viewport || data.viewport || null;
  return { value: viewport || null, status: viewport ? 'measured' : 'unavailable' };
}

function extractHreflang(data) {
  if (!data) return { links: [], status: 'unavailable' };
  const links = Array.isArray(data.hreflang)
    ? data.hreflang
    : (Array.isArray(data.hreflangs) ? data.hreflangs : []);
  return {
    links: links.map(h => (typeof h === 'string' ? { href: h } : h)),
    status: links.length > 0 ? 'measured' : 'unavailable'
  };
}

function extractImages(data) {
  if (!data) return { count: 0, withAlt: 0, withoutAlt: 0, status: 'unavailable' };
  const images = data.images || data.content?.images || [];
  const count = Array.isArray(images) ? images.length : 0;
  const withAlt = Array.isArray(images) ? images.filter(i => i.alt || i.altText).length : 0;
  return { count, withAlt, withoutAlt: count - withAlt, status: count > 0 ? 'measured' : 'unavailable' };
}

function extractLinks(data) {
  if (!data) return { internal: 0, external: 0, broken: 0, status: 'unavailable' };
  const links = data.links || data.content?.links || [];
  const internal = Array.isArray(links) ? links.filter(l => l.internal || l.type === 'internal').length : 0;
  const external = Array.isArray(links) ? links.filter(l => !l.internal && l.type !== 'internal').length : 0;
  return { internal, external, broken: 0, status: 'measured' };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}


